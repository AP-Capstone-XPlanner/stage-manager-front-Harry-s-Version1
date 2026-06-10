import { create } from 'zustand';
import {
  DEFAULT_GROUND_COLOR,
  DEFAULT_SHOW_STAGE_BASELINE,
  DEFAULT_SKY_COLOR,
  DEFAULT_STAGE_TEXTURE,
  DEFAULT_STAGE_ENCLOSURE_COLOR,
  STAGE_ENCLOSURE_HEIGHT_LIMITS,
  STAGE_ENCLOSURE_OPACITY_LIMITS,
} from '../constants/stage.js';
import { propSupportsToggleInteraction } from '../constants/propCatalogSpecs.js';
import { getDefaultPropColor } from '../constants/propColors.js';
import { normalizeHexColor } from '../utils/color.js';
import { createNewProp, clampPropScale, propToPlacementDraft } from '../utils/propDefaults.js';
import { PROP_TAG_MAX_LENGTH } from '../constants/props.js';
import {
  clampStageCurtainHeight,
  clampStageDimension,
} from '../utils/stageDimensions.js';
import { shiftGroundedPropsForStageHeight } from '../utils/propBounds.js';
import {
  normalizePropPosition,
  normalizeRotation,
  POSITION_PANEL_SNAP,
} from '../utils/propPosition.js';
import { getDownstageLineZ, getStageHalfExtents } from '../utils/stageAxes.js';
import {
  clampStageEnclosureHeight,
  clampStageEnclosureOpacity,
} from '../utils/stageEnclosure.js';
import {
  CUSTOM_PLATFORM_LIMITS,
  createCustomPlatform,
  createStageShapePoints,
  createStageShapePresetPoints,
  getPlatformArea,
  insertCustomPlatformPoint,
  insertStageShapePoint,
  normalizeCustomPlatform,
  normalizeCustomPlatforms,
  normalizeStageDrawPoint,
  normalizeStageShapePoints,
  removeCustomPlatformPoint,
  removeStageShapePoint,
  resizeStageShapePoints,
  translateCustomPlatform,
  updateCustomPlatformPoint,
  updateStageShapePoint,
} from '../utils/customPlatforms.js';

const defaultStage = {
  length: 10,
  width: 20,
  height: 0.6,
};

function cloneArchiveData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getArchivePropsPayload(archive) {
  if (Array.isArray(archive)) return archive;
  if (Array.isArray(archive?.propsData)) return archive.propsData;
  if (Array.isArray(archive?.props)) return archive.props;
  return null;
}

function normalizeArchiveProps(props, stage) {
  return props.map((prop) => {
    const normalized = {
      ...prop,
      id: prop.id ?? crypto.randomUUID(),
      position: Array.isArray(prop.position)
        ? prop.position
        : [0, stage.height, 0],
      rotation: Number.isFinite(prop.rotation) ? prop.rotation : 0,
      scale: Number.isFinite(prop.scale) ? prop.scale : 1,
      visible: prop.visible ?? true,
      tag: prop.tag ?? '',
      color: prop.color ?? getDefaultPropColor(prop.type),
    };
    return alignStageCurtainToStage(normalized, stage);
  });
}

function getDefaultDancerTravelTimes(props, loadedTravelTimes) {
  return Object.fromEntries(
    props
      .filter((prop) => prop.type === 'dancer')
      .map((dancer) => [dancer.id, loadedTravelTimes?.[dancer.id] ?? 5]),
  );
}

function getStageCurtainPosition(stage) {
  return [0, stage.height, getDownstageLineZ(stage.length)];
}

function alignStageCurtainToStage(prop, stage) {
  if (prop.type !== 'stage_curtain') return prop;
  return {
    ...prop,
    position: getStageCurtainPosition(stage),
    rotation: 0,
    scale: 1,
  };
}

function alignStageCurtainsToStage(props, stage) {
  return props.map((prop) => alignStageCurtainToStage(prop, stage));
}

function getStageShapePointsForState(state) {
  return normalizeStageShapePoints(state.stageShapePoints, state.stage);
}

function getSnapTargets(state, options = {}) {
  const targets = [];
  if (!options.skipStageShape) {
    getStageShapePointsForState(state).forEach((point, index) => {
      if (options.stagePointIndex !== index) targets.push(point);
    });
  }
  state.customPlatforms.forEach((platform) => {
    platform.points.forEach((point, index) => {
      const samePlatform = platform.id === options.platformId;
      if (samePlatform && options.platformPointIndex === index) return;
      if (samePlatform && options.skipCurrentPlatform) return;
      targets.push(point);
    });
  });
  return targets;
}

export const useStageStore = create((set, get) => ({
  stage: defaultStage,
  skyColor: DEFAULT_SKY_COLOR,
  groundColor: DEFAULT_GROUND_COLOR,
  stageTexture: DEFAULT_STAGE_TEXTURE,
  curtainDuration: 3,
  dancerTravelTimes: {},
  dancerCount: 0,
  playTriggeredIds: [],
  isPaused: false,
  playbackTime: 0,
  props: [],
  selectedPropId: null,
  positioningMode: false,
  placementType: null,
  placementDraft: null,
  clipboardDraft: null,
  mode: 'select',
  snapToGrid: true,
  showStageBaseline: DEFAULT_SHOW_STAGE_BASELINE,
  showStageAreaGrid: false,
  showStageZones: false,
  showStageEnclosure: false,
  stageEnclosureHeight: STAGE_ENCLOSURE_HEIGHT_LIMITS.default,
  stageEnclosureColor: DEFAULT_STAGE_ENCLOSURE_COLOR,
  stageEnclosureOpacity: STAGE_ENCLOSURE_OPACITY_LIMITS.default,
  stageShapePoints: createStageShapePoints(defaultStage),
  stageShapeEditing: false,
  stageShapeDrawMode: false,
  stageShapeDraftPoints: [],
  stageShapeDrawBackup: null,
  selectedStageShapePointIndex: null,
  customPlatforms: [],
  selectedPlatformId: null,
  selectedPlatformPointIndex: null,

  setStageDimension: (key, value) =>
    set((s) => {
      const clamped = clampStageDimension(key, value);
      if (key !== 'height') {
        const stage = { ...s.stage, [key]: clamped };
        return {
          stage,
          props: alignStageCurtainsToStage(s.props, stage),
          customPlatforms: normalizeCustomPlatforms(s.customPlatforms, stage),
          stageShapePoints: resizeStageShapePoints(
            s.stageShapePoints,
            s.stage,
            stage,
          ),
        };
      }
      const oldTop = s.stage.height;
      const newTop = clamped;
      const stage = { ...s.stage, height: newTop };
      return {
        stage,
        props: alignStageCurtainsToStage(
          shiftGroundedPropsForStageHeight(s.props, oldTop, newTop),
          stage,
        ),
      };
    }),

  setStage: (stagePatch) =>
    set((s) => {
      const stage = { ...s.stage, ...stagePatch };
      const stageFootprintChanged =
        stage.length !== s.stage.length || stage.width !== s.stage.width;
      return {
        stage,
        props: alignStageCurtainsToStage(s.props, stage),
        customPlatforms: normalizeCustomPlatforms(s.customPlatforms, stage),
        stageShapePoints: stageFootprintChanged
          ? resizeStageShapePoints(s.stageShapePoints, s.stage, stage)
          : normalizeStageShapePoints(s.stageShapePoints, stage),
      };
    }),

  setSkyColor: (color) =>
    set({ skyColor: normalizeHexColor(color, DEFAULT_SKY_COLOR) }),

  setGroundColor: (color) =>
    set({ groundColor: normalizeHexColor(color, DEFAULT_GROUND_COLOR) }),

  setStageTexture: (texture) => set({ stageTexture: texture }),

  setCurtainDuration: (duration) => set({ curtainDuration: duration }),

  setDancerTravelTime: (id, duration) =>
    set((s) => ({
      dancerTravelTimes: { ...s.dancerTravelTimes, [id]: duration },
    })),

  getDancerTravelTime: (id) => get().dancerTravelTimes[id] ?? 5,

  triggerDancerPlay: (ids) => set({ playTriggeredIds: ids }),

  clearPlayTriggerFor: (id) =>
    set((s) => ({
      playTriggeredIds: s.playTriggeredIds.filter((tid) => tid !== id),
    })),

  pausePlayback: () => set({ isPaused: true }),

  resumePlayback: () => set({ isPaused: false }),

  setPlaybackTime: (time) => set({ playbackTime: time }),

  setShowStageBaseline: (show) => set({ showStageBaseline: show }),

  setShowStageAreaGrid: (show) => set({ showStageAreaGrid: show }),

  setShowStageZones: (show) => set({ showStageZones: show }),

  setShowStageEnclosure: (show) => set({ showStageEnclosure: show }),

  setStageEnclosureHeight: (height) =>
    set({ stageEnclosureHeight: clampStageEnclosureHeight(height) }),

  setStageEnclosureColor: (color) =>
    set({
      stageEnclosureColor: normalizeHexColor(
        color,
        DEFAULT_STAGE_ENCLOSURE_COLOR,
      ),
    }),

  setStageEnclosureOpacity: (opacity) =>
    set({ stageEnclosureOpacity: clampStageEnclosureOpacity(opacity) }),

  startPlacement: (type, draft) =>
    set({
      placementType: type,
      placementDraft: draft ?? null,
      mode: 'place',
      selectedPropId: null,
      stageShapeEditing: false,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: null,
      selectedPlatformId: null,
      selectedPlatformPointIndex: null,
      positioningMode: false,
    }),

  cancelPlacement: () =>
    set({ placementType: null, placementDraft: null, mode: 'select' }),

  copySelectedProp: () => {
    const { selectedPropId, props } = get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    const draft = propToPlacementDraft(prop);
    set({
      clipboardDraft: draft,
      placementType: prop.type,
      placementDraft: draft,
      mode: 'place',
      selectedPropId: null,
      stageShapeEditing: false,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: null,
      selectedPlatformId: null,
      selectedPlatformPointIndex: null,
      positioningMode: false,
    });
  },

  pasteProp: () => {
    const { clipboardDraft } = get();
    if (!clipboardDraft) return;
    const draft = structuredClone(clipboardDraft);
    set({
      placementType: draft.type,
      placementDraft: draft,
      mode: 'place',
      selectedPropId: null,
      stageShapeEditing: false,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: null,
      selectedPlatformId: null,
      selectedPlatformPointIndex: null,
      positioningMode: false,
    });
  },

  setMode: (mode) =>
    set((s) => ({
      mode,
      placementType: mode === 'select' ? null : s.placementType,
      placementDraft: mode === 'select' ? null : s.placementDraft,
    })),

  addProp: (prop) =>
    set((s) => {
      const id = crypto.randomUUID();
      const created = createNewProp(prop);

      if (prop.type === 'stage_curtain') {
        const existing = s.props.find((p) => p.type === 'stage_curtain');
        const interactionState = {
          ...(created.interactionState ?? {}),
          ...(existing?.interactionState ?? {}),
          ...(prop.interactionState ?? {}),
        };
        const curtain = alignStageCurtainToStage(
          existing
            ? {
                ...existing,
                interactionState,
                visible: prop.visible ?? existing.visible,
              }
            : { ...created, id, interactionState },
          s.stage,
        );

        return {
          props: existing
            ? s.props.map((p) => (p.id === existing.id ? curtain : p))
            : [...s.props, curtain],
          mode: 'select',
          placementType: null,
          placementDraft: null,
          selectedPropId: curtain.id,
          selectedPlatformId: null,
          selectedPlatformPointIndex: null,
          positioningMode: false,
        };
      }

      if (prop.type === 'dancer') {
        const newCount = s.dancerCount + 1;
        return {
          props: [
            ...s.props,
            { ...created, id, tag: created.tag || `Dancer ${newCount}` },
          ],
          dancerCount: newCount,
          dancerTravelTimes: { ...s.dancerTravelTimes, [id]: 5 },
          mode: 'select',
          placementType: null,
          placementDraft: null,
          selectedPropId: id,
          selectedPlatformId: null,
          selectedPlatformPointIndex: null,
          positioningMode: false,
        };
      }

      return {
        props: [...s.props, { ...created, id }],
        mode: 'select',
        placementType: null,
        placementDraft: null,
        selectedPropId: id,
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
        positioningMode: false,
      };
    }),

  updateProp: (id, patch) =>
    set((s) => ({
      props: s.props.map((p) =>
        p.id === id
          ? alignStageCurtainToStage({ ...p, ...patch }, s.stage)
          : p,
      ),
    })),

  setStageCurtainHeight: (id, height) =>
    set((s) => ({
      props: s.props.map((p) =>
        p.id === id && p.type === 'stage_curtain'
          ? {
              ...p,
              interactionState: {
                ...p.interactionState,
                curtainHeight: clampStageCurtainHeight(height),
              },
            }
          : p,
      ),
    })),

  removeProp: (id) =>
    set((s) => {
      const dancerTravelTimes = { ...s.dancerTravelTimes };
      delete dancerTravelTimes[id];
      const props = s.props.filter((p) => p.id !== id);
      const hasDancers = props.some((p) => p.type === 'dancer');
      return {
        props,
        dancerTravelTimes,
        dancerCount: hasDancers ? s.dancerCount : 0,
        selectedPropId: s.selectedPropId === id ? null : s.selectedPropId,
        positioningMode:
          s.selectedPropId === id ? false : s.positioningMode,
      };
    }),

  setStageShapeEditing: (enabled) =>
    set((s) => ({
      stageShapeEditing: enabled,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: enabled
        ? s.selectedStageShapePointIndex ?? 0
        : null,
      selectedPlatformId: enabled ? null : s.selectedPlatformId,
      selectedPlatformPointIndex: enabled ? null : s.selectedPlatformPointIndex,
      selectedPropId: enabled ? null : s.selectedPropId,
      positioningMode: enabled ? false : s.positioningMode,
      mode: enabled ? 'select' : s.mode,
      placementType: enabled ? null : s.placementType,
      placementDraft: enabled ? null : s.placementDraft,
    })),

  toggleStageShapeEditing: () =>
    set((s) => ({
      stageShapeEditing: !s.stageShapeEditing,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: !s.stageShapeEditing
        ? s.selectedStageShapePointIndex ?? 0
        : null,
      selectedPlatformId: !s.stageShapeEditing ? null : s.selectedPlatformId,
      selectedPlatformPointIndex: !s.stageShapeEditing
        ? null
        : s.selectedPlatformPointIndex,
      selectedPropId: !s.stageShapeEditing ? null : s.selectedPropId,
      positioningMode: !s.stageShapeEditing ? false : s.positioningMode,
      mode: !s.stageShapeEditing ? 'select' : s.mode,
      placementType: !s.stageShapeEditing ? null : s.placementType,
      placementDraft: !s.stageShapeEditing ? null : s.placementDraft,
    })),

  selectStageShapePoint: (pointIndex) =>
    set((s) => {
      const points = getStageShapePointsForState(s);
      if (
        !Number.isInteger(pointIndex) ||
        pointIndex < 0 ||
        pointIndex >= points.length
      ) {
        return { selectedStageShapePointIndex: null };
      }
      return {
        stageShapeEditing: true,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: pointIndex,
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
        selectedPropId: null,
        positioningMode: false,
        mode: 'select',
        placementType: null,
        placementDraft: null,
      };
    }),

  moveStageShapePoint: (pointIndex, x, z, options = {}) =>
    set((s) => {
      const snapTargets = options.snap
        ? getSnapTargets(s, { stagePointIndex: pointIndex })
        : [];
      return {
        stageShapePoints: updateStageShapePoint(
          s.stageShapePoints,
          pointIndex,
          x,
          z,
          s.stage,
          { ...options, snapTargets },
        ),
        stageShapeEditing: true,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: pointIndex,
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
        selectedPropId: null,
        positioningMode: false,
      };
    }),

  addStageShapePoint: () =>
    set((s) => {
      const stageShapePoints = insertStageShapePoint(s.stageShapePoints, s.stage);
      return {
        stageShapePoints,
        stageShapeEditing: true,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: Math.min(
          stageShapePoints.length - 1,
          (s.selectedStageShapePointIndex ?? 0) + 1,
        ),
      };
    }),

  removeSelectedStageShapePoint: () =>
    set((s) => {
      if (s.selectedStageShapePointIndex === null) return {};
      const stageShapePoints = removeStageShapePoint(
        s.stageShapePoints,
        s.selectedStageShapePointIndex,
        s.stage,
      );
      return {
        stageShapePoints,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: Math.min(
          s.selectedStageShapePointIndex,
          stageShapePoints.length - 1,
        ),
      };
    }),

  resetStageShapePoints: () =>
    set((s) => ({
      stageShapePoints: createStageShapePoints(s.stage),
      stageShapeEditing: true,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: 0,
    })),

  applyStageShapePreset: (preset) =>
    set((s) => ({
      stageShapePoints: createStageShapePresetPoints(s.stage, preset),
      stageShapeEditing: true,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: 0,
      selectedPlatformId: null,
      selectedPlatformPointIndex: null,
      selectedPropId: null,
      positioningMode: false,
      mode: 'select',
      placementType: null,
      placementDraft: null,
    })),

  startStageShapeDrawing: () =>
    set((s) => ({
      stageShapeEditing: true,
      stageShapeDrawMode: true,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: getStageShapePointsForState(s),
      selectedStageShapePointIndex: null,
      selectedPlatformId: null,
      selectedPlatformPointIndex: null,
      selectedPropId: null,
      positioningMode: false,
      mode: 'select',
      placementType: null,
      placementDraft: null,
    })),

  appendStageShapeDrawPoint: (x, z, options = {}) =>
    set((s) => {
      if (!s.stageShapeDrawMode) return {};
      const draft = Array.isArray(s.stageShapeDraftPoints)
        ? s.stageShapeDraftPoints
        : [];
      if (draft.length >= CUSTOM_PLATFORM_LIMITS.maxPoints) return {};
      const snapTargets = options.snap
        ? [...getSnapTargets(s), ...draft]
        : [];
      const point = normalizeStageDrawPoint([x, z], s.stage, {
        ...options,
        snapTargets,
      });
      const lastPoint = draft[draft.length - 1];
      if (
        lastPoint &&
        Math.hypot(point[0] - lastPoint[0], point[1] - lastPoint[1]) <
          CUSTOM_PLATFORM_LIMITS.drawPointSpacing
      ) {
        return {};
      }
      const stageShapeDraftPoints = [...draft, point];
      const patch = {
        stageShapeDraftPoints,
        selectedStageShapePointIndex: null,
        stageShapeEditing: true,
        stageShapeDrawMode: true,
      };
      if (
        stageShapeDraftPoints.length >= CUSTOM_PLATFORM_LIMITS.minPoints &&
        getPlatformArea(stageShapeDraftPoints) >= CUSTOM_PLATFORM_LIMITS.minArea
      ) {
        patch.stageShapePoints = normalizeStageShapePoints(
          stageShapeDraftPoints,
          s.stage,
        );
      }
      return patch;
    }),

  undoStageShapeDrawPoint: () =>
    set((s) => {
      if (!s.stageShapeDrawMode) return {};
      const stageShapeDraftPoints = s.stageShapeDraftPoints.slice(0, -1);
      const patch = {
        stageShapeDraftPoints,
        selectedStageShapePointIndex: null,
      };
      if (
        stageShapeDraftPoints.length >= CUSTOM_PLATFORM_LIMITS.minPoints &&
        getPlatformArea(stageShapeDraftPoints) >= CUSTOM_PLATFORM_LIMITS.minArea
      ) {
        patch.stageShapePoints = normalizeStageShapePoints(
          stageShapeDraftPoints,
          s.stage,
        );
      } else if (s.stageShapeDrawBackup) {
        patch.stageShapePoints = s.stageShapeDrawBackup;
      }
      return patch;
    }),

  finishStageShapeDrawing: () =>
    set((s) => {
      const draft = s.stageShapeDraftPoints;
      const hasValidDraft =
        draft.length >= CUSTOM_PLATFORM_LIMITS.minPoints &&
        getPlatformArea(draft) >= CUSTOM_PLATFORM_LIMITS.minArea;
      return {
        stageShapePoints: hasValidDraft
          ? normalizeStageShapePoints(draft, s.stage)
          : s.stageShapeDrawBackup ?? s.stageShapePoints,
        stageShapeEditing: true,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: hasValidDraft ? 0 : s.selectedStageShapePointIndex,
      };
    }),

  cancelStageShapeDrawing: () =>
    set((s) => ({
      stageShapePoints: s.stageShapeDrawBackup ?? s.stageShapePoints,
      stageShapeEditing: true,
      stageShapeDrawMode: false,
      stageShapeDraftPoints: [],
      stageShapeDrawBackup: null,
      selectedStageShapePointIndex: 0,
    })),

  addCustomPlatform: (kind = 'platform') =>
    set((s) => {
      const platform = createCustomPlatform(s.stage, kind, s.customPlatforms.length);
      return {
        customPlatforms: [...s.customPlatforms, platform],
        selectedPlatformId: platform.id,
        selectedPlatformPointIndex: 0,
        stageShapeEditing: false,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: null,
        selectedPropId: null,
        positioningMode: false,
        mode: 'select',
        placementType: null,
        placementDraft: null,
      };
    }),

  updateCustomPlatform: (id, patch) =>
    set((s) => ({
      customPlatforms: s.customPlatforms.map((platform, index) => {
        if (platform.id !== id) return platform;
        const normalized = normalizeCustomPlatform(
          { ...platform, ...patch },
          s.stage,
          index,
        );
        return normalized ?? platform;
      }),
    })),

  removeCustomPlatform: (id) =>
    set((s) => ({
      customPlatforms: s.customPlatforms.filter((platform) => platform.id !== id),
      selectedPlatformId:
        s.selectedPlatformId === id ? null : s.selectedPlatformId,
      selectedPlatformPointIndex:
        s.selectedPlatformId === id ? null : s.selectedPlatformPointIndex,
    })),

  selectCustomPlatform: (id, pointIndex = null) =>
    set((s) => {
      if (!id) {
        return {
          selectedPlatformId: null,
          selectedPlatformPointIndex: null,
        };
      }
      const platform = s.customPlatforms.find((item) => item.id === id);
      if (!platform) return {};
      const safePointIndex =
        Number.isInteger(pointIndex) &&
        pointIndex >= 0 &&
        pointIndex < platform.points.length
          ? pointIndex
          : null;
      return {
        selectedPlatformId: id,
        selectedPlatformPointIndex: safePointIndex,
        stageShapeEditing: false,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: null,
        selectedPropId: null,
        positioningMode: false,
        mode: 'select',
        placementType: null,
        placementDraft: null,
      };
    }),

  moveCustomPlatformPoint: (id, pointIndex, x, z, options = {}) =>
    set((s) => {
      const snapTargets = options.snap
        ? getSnapTargets(s, { platformId: id, platformPointIndex: pointIndex })
        : [];
      return {
        customPlatforms: s.customPlatforms.map((platform) =>
          platform.id === id
            ? updateCustomPlatformPoint(
                platform,
                pointIndex,
                x,
                z,
                s.stage,
                { ...options, snapTargets },
              )
            : platform,
        ),
        selectedPlatformId: id,
        selectedPlatformPointIndex: pointIndex,
        stageShapeEditing: false,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: null,
        selectedPropId: null,
        positioningMode: false,
      };
    }),

  moveCustomPlatform: (id, dx, dz, options = {}) =>
    set((s) => {
      const snapTargets = options.snap
        ? getSnapTargets(s, { platformId: id, skipCurrentPlatform: true })
        : [];
      return {
        customPlatforms: s.customPlatforms.map((platform) =>
          platform.id === id
            ? translateCustomPlatform(platform, dx, dz, s.stage, {
                ...options,
                snapTargets,
              })
            : platform,
        ),
        selectedPlatformId: id,
        selectedPlatformPointIndex: null,
        stageShapeEditing: false,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: null,
        selectedPropId: null,
        positioningMode: false,
      };
    }),

  addCustomPlatformPoint: (id) =>
    set((s) => ({
      customPlatforms: s.customPlatforms.map((platform) =>
        platform.id === id
          ? insertCustomPlatformPoint(platform, s.stage)
          : platform,
      ),
    })),

  removeSelectedCustomPlatformPoint: () =>
    set((s) => {
      const { selectedPlatformId, selectedPlatformPointIndex } = s;
      if (!selectedPlatformId || selectedPlatformPointIndex === null) return {};
      let nextPointIndex = selectedPlatformPointIndex;
      const customPlatforms = s.customPlatforms.map((platform) => {
        if (platform.id !== selectedPlatformId) return platform;
        const updated = removeCustomPlatformPoint(
          platform,
          selectedPlatformPointIndex,
        );
        nextPointIndex = Math.min(nextPointIndex, updated.points.length - 1);
        return updated;
      });
      return {
        customPlatforms,
        selectedPlatformPointIndex: nextPointIndex,
      };
    }),

  selectProp: (id) =>
    set((s) => {
      if (id === null) {
        return {
          selectedPropId: null,
          positioningMode: false,
          mode: 'select',
          placementType: null,
          placementDraft: null,
        };
      }
      if (s.selectedPropId === id) {
        return {};
      }
      if (
        s.positioningMode &&
        s.selectedPropId !== null &&
        id !== s.selectedPropId
      ) {
        return {};
      }
      return {
        selectedPropId: id,
        stageShapeEditing: false,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: null,
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
        positioningMode: false,
        mode: 'select',
        placementType: null,
        placementDraft: null,
      };
    }),

  setPositioningMode: (enabled) => {
    const { selectedPropId } = get();
    if (!selectedPropId) {
      set({ positioningMode: false });
      return;
    }
    set({ positioningMode: enabled });
  },

  togglePositioningMode: () => {
    const { selectedPropId, positioningMode } = get();
    if (!selectedPropId) return;
    set({ positioningMode: !positioningMode });
  },

  handleEscapeKey: (options) => {
    const s = get();
    const fromTextInput = options?.fromTextInput ?? false;

    if (s.mode === 'place') {
      get().cancelPlacement();
      return true;
    }
    if (s.positioningMode) {
      set({ positioningMode: false });
      return true;
    }
    if (s.stageShapeDrawMode) {
      if (fromTextInput) return false;
      set({
        stageShapePoints: s.stageShapeDrawBackup ?? s.stageShapePoints,
        stageShapeEditing: true,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        selectedStageShapePointIndex: 0,
      });
      return true;
    }
    if (s.stageShapeEditing) {
      if (fromTextInput) return false;
      set({
        stageShapeEditing: false,
        selectedStageShapePointIndex: null,
      });
      return true;
    }
    if (s.selectedPlatformId) {
      if (fromTextInput) return false;
      set({
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
      });
      return true;
    }
    if (s.selectedPropId) {
      if (fromTextInput) return false;
      set({
        selectedPropId: null,
        positioningMode: false,
        mode: 'select',
        placementType: null,
        placementDraft: null,
      });
      return true;
    }
    return false;
  },

  togglePropInteraction: (id) => {
    const prop = get().props.find((p) => p.id === id);
    if (!prop || !propSupportsToggleInteraction(prop.type)) return;
    const open = !(prop.interactionState?.open ?? false);
    get().updateProp(id, {
      interactionState: { ...prop.interactionState, open },
    });
  },

  toggleLamp: (id) => {
    const prop = get().props.find((p) => p.id === id);
    if (!prop) return;
    const lampOn = !(prop.interactionState?.lampOn ?? false);
    get().updateProp(id, {
      interactionState: { ...prop.interactionState, lampOn },
    });
  },

  toggleCurtain: (id) => {
    const prop = get().props.find((p) => p.id === id);
    if (!prop) return;
    const open = !(prop.interactionState?.open ?? false);
    get().updateProp(id, {
      interactionState: { ...prop.interactionState, open },
    });
  },

  toggleDiningChair: (id, chairIndex) => {
    const prop = get().props.find((p) => p.id === id);
    if (!prop || prop.type !== 'dining_set') return;
    const pulled = [...(prop.interactionState?.chairsPulled ?? Array(6).fill(false))];
    if (chairIndex < 0 || chairIndex >= pulled.length) return;
    pulled[chairIndex] = !pulled[chairIndex];
    get().updateProp(id, {
      interactionState: { ...prop.interactionState, chairsPulled: pulled },
    });
  },

  togglePropTableChair: (id, chairIndex) => {
    const prop = get().props.find((p) => p.id === id);
    if (!prop || prop.type !== 'prop_table') return;
    const spawned = [...(prop.interactionState?.chairsSpawned ?? [])];
    const idx = spawned.indexOf(chairIndex);
    if (idx >= 0) {
      spawned.splice(idx, 1);
    } else {
      spawned.push(chairIndex);
    }
    get().updateProp(id, {
      interactionState: { ...prop.interactionState, chairsSpawned: spawned },
    });
  },

  rotateSelected: (deltaRadians) => {
    const { selectedPropId, props, updateProp } = get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    updateProp(selectedPropId, {
      rotation: normalizeRotation(prop.rotation + deltaRadians),
    });
  },

  setSelectedPropRotation: (rotation) => {
    const { selectedPropId, updateProp } = get();
    if (!selectedPropId) return;
    updateProp(selectedPropId, { rotation: normalizeRotation(rotation) });
  },

  moveSelectedProp: (dx, dz) => {
    const { selectedPropId, props, stage, snapToGrid, positioningMode, updateProp } =
      get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    const { halfX, halfZ } = getStageHalfExtents(stage.length, stage.width);
    const position = normalizePropPosition(
      prop.position[0] + dx,
      prop.position[1],
      prop.position[2] + dz,
      halfX,
      halfZ,
      snapToGrid && !positioningMode,
      stage.height,
      prop,
    );
    updateProp(selectedPropId, { position });
  },

  moveSelectedPropVertical: (dy) => {
    const { selectedPropId, props, stage, snapToGrid, positioningMode, updateProp } =
      get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    const position = normalizePropPosition(
      prop.position[0],
      prop.position[1] + dy,
      prop.position[2],
      stage.width / 2,
      stage.length / 2,
      snapToGrid && !positioningMode,
      stage.height,
      prop,
    );
    updateProp(selectedPropId, { position });
  },

  setSelectedPropPosition: (x, z, y, options) => {
    const { selectedPropId, props, stage, snapToGrid, positioningMode, updateProp } =
      get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    const fine = options?.finePosition ?? false;
    const position = normalizePropPosition(
      x,
      y ?? prop.position[1],
      z,
      stage.width / 2,
      stage.length / 2,
      fine || (snapToGrid && !positioningMode),
      stage.height,
      prop,
      fine ? POSITION_PANEL_SNAP : undefined,
    );
    updateProp(selectedPropId, { position });
  },

  deleteSelectedProp: () => {
    const { selectedPropId, removeProp } = get();
    if (selectedPropId) removeProp(selectedPropId);
  },

  setSelectedPropScale: (scale) => {
    const { selectedPropId, props, stage, snapToGrid, positioningMode, updateProp } =
      get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    const nextScale = clampPropScale(scale);
    const position = normalizePropPosition(
      prop.position[0],
      prop.position[1],
      prop.position[2],
      stage.width / 2,
      stage.length / 2,
      snapToGrid && !positioningMode,
      stage.height,
      { ...prop, scale: nextScale },
    );
    updateProp(selectedPropId, { scale: nextScale, position });
  },

  togglePropVisibility: (id) => {
    const propId = id ?? get().selectedPropId;
    if (!propId) return;
    const prop = get().props.find((p) => p.id === propId);
    if (!prop) return;
    get().updateProp(propId, { visible: !prop.visible });
  },

  setSelectedPropTag: (tag) => {
    const { selectedPropId, updateProp } = get();
    if (!selectedPropId) return;
    updateProp(selectedPropId, {
      tag: tag.slice(0, PROP_TAG_MAX_LENGTH),
    });
  },

  setSelectedPropColor: (color) => {
    const { selectedPropId, props, updateProp } = get();
    if (!selectedPropId) return;
    const prop = props.find((p) => p.id === selectedPropId);
    if (!prop) return;
    updateProp(selectedPropId, {
      color: normalizeHexColor(color, getDefaultPropColor(prop.type)),
    });
  },

  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  getStageArchiveSnapshot: () => {
    const s = get();
    return cloneArchiveData({
      propsData: s.props,
      platformData: {
        platforms: s.customPlatforms,
      },
      stageData: {
        stage: s.stage,
        stageShapePoints: getStageShapePointsForState(s),
        skyColor: s.skyColor,
        groundColor: s.groundColor,
        stageTexture: s.stageTexture,
        curtainDuration: s.curtainDuration,
        showStageBaseline: s.showStageBaseline,
        showStageAreaGrid: s.showStageAreaGrid,
        showStageZones: s.showStageZones,
        showStageEnclosure: s.showStageEnclosure,
        stageEnclosureHeight: s.stageEnclosureHeight,
        stageEnclosureColor: s.stageEnclosureColor,
        stageEnclosureOpacity: s.stageEnclosureOpacity,
      },
      choreographyData: {
        choreographyOpen: s.choreographyOpen,
        dancerTravelTimes: s.dancerTravelTimes,
        dancerCount: s.dancerCount,
        formations: s.formations,
        formationCounter: s.formationCounter,
        savedPaths: s.savedPaths,
        pathCounter: s.pathCounter,
        stationaryMarkers: s.stationaryMarkers,
        stationaryCounter: s.stationaryCounter,
        selectedFormationId: s.selectedFormationId,
        hiddenPathIds: s.hiddenPathIds,
        timelineEndTime: s.timelineEndTime,
        musicDuration: s.musicDuration,
      },
    });
  },

  loadStageArchiveSnapshot: (archive) => {
    const propsPayload = getArchivePropsPayload(archive);
    if (!propsPayload) return false;

    set((s) => {
      const stageData = archive?.stageData ?? {};
      const choreographyData = archive?.choreographyData ?? {};
      const platformData = archive?.platformData ?? {};
      const stage = stageData.stage
        ? { ...s.stage, ...stageData.stage }
        : s.stage;
      const props = normalizeArchiveProps(propsPayload, stage);
      const customPlatforms = normalizeCustomPlatforms(
        platformData.platforms ?? archive?.customPlatforms,
        stage,
      );
      const stageShapePoints = normalizeStageShapePoints(
        stageData.stageShapePoints ?? archive?.stageShapePoints,
        stage,
      );
      const dancerTravelTimes = getDefaultDancerTravelTimes(
        props,
        choreographyData.dancerTravelTimes,
      );
      const dancerCount =
        choreographyData.dancerCount ??
        props.filter((prop) => prop.type === 'dancer').length;

      return {
        stage,
        skyColor: stageData.skyColor ?? s.skyColor,
        groundColor: stageData.groundColor ?? s.groundColor,
        stageTexture: stageData.stageTexture ?? s.stageTexture,
        curtainDuration: stageData.curtainDuration ?? s.curtainDuration,
        showStageBaseline: stageData.showStageBaseline ?? s.showStageBaseline,
        showStageAreaGrid: stageData.showStageAreaGrid ?? s.showStageAreaGrid,
        showStageZones: stageData.showStageZones ?? s.showStageZones,
        showStageEnclosure: stageData.showStageEnclosure ?? s.showStageEnclosure,
        stageEnclosureHeight:
          stageData.stageEnclosureHeight ?? s.stageEnclosureHeight,
        stageEnclosureColor:
          stageData.stageEnclosureColor ?? s.stageEnclosureColor,
        stageEnclosureOpacity:
          stageData.stageEnclosureOpacity ?? s.stageEnclosureOpacity,
        stageShapePoints,
        stageShapeDrawMode: false,
        stageShapeDraftPoints: [],
        stageShapeDrawBackup: null,
        stageShapeEditing: false,
        selectedStageShapePointIndex: null,
        customPlatforms,
        selectedPlatformId: null,
        selectedPlatformPointIndex: null,
        props,
        selectedPropId: null,
        positioningMode: false,
        placementType: null,
        placementDraft: null,
        mode: 'select',
        choreographyOpen:
          choreographyData.choreographyOpen ?? s.choreographyOpen,
        dancerTravelTimes,
        dancerCount,
        playTriggeredIds: [],
        isPaused: false,
        playbackTime: 0,
        formations: Array.isArray(choreographyData.formations)
          ? choreographyData.formations
          : [],
        formationCounter: choreographyData.formationCounter ?? 0,
        savedPaths: Array.isArray(choreographyData.savedPaths)
          ? choreographyData.savedPaths
          : [],
        pathCounter: choreographyData.pathCounter ?? 0,
        stationaryMarkers: Array.isArray(choreographyData.stationaryMarkers)
          ? choreographyData.stationaryMarkers
          : [],
        stationaryCounter: choreographyData.stationaryCounter ?? 0,
        selectedFormationId: choreographyData.selectedFormationId ?? null,
        hiddenPathIds: Array.isArray(choreographyData.hiddenPathIds)
          ? choreographyData.hiddenPathIds
          : [],
        timelineEndTime: choreographyData.timelineEndTime ?? 120,
        musicDuration: choreographyData.musicDuration ?? null,
      };
    });

    return true;
  },

  clearAllProps: () =>
    set({
      props: [],
      selectedPropId: null,
      positioningMode: false,
      dancerCount: 0,
      dancerTravelTimes: {},
    }),

  choreographyOpen: false,
  formations: [],
  formationCounter: 0,
  savedPaths: [],
  pathCounter: 0,
  stationaryMarkers: [],
  stationaryCounter: 0,
  selectedFormationId: null,
  hiddenPathIds: [],
  timelineEndTime: 120,
  musicDuration: null,

  toggleChoreography: () =>
    set((s) => ({ choreographyOpen: !s.choreographyOpen })),

  savePath: (dancerId, points, startTime, duration) =>
    set((s) => {
      const newCount = s.pathCounter + 1;
      const safeDuration = Math.max(0.5, duration ?? 5);
      const safeStartTime = Math.max(0, startTime ?? 0);
      const path = {
        id: crypto.randomUUID(),
        dancerId,
        name: `Path ${newCount}`,
        points: points.map((p) => [...p]),
        startTime: safeStartTime,
        duration: safeDuration,
        endTime: safeStartTime + safeDuration,
      };
      const savedPaths = [...s.savedPaths, path].sort(
        (a, b) => a.startTime - b.startTime,
      );
      return { savedPaths, pathCounter: newCount };
    }),

  updatePathTime: (pathId, startTime) =>
    set((s) => ({
      savedPaths: s.savedPaths
        .map((p) => {
          if (p.id !== pathId) return p;
          const safeStartTime = Math.max(0, startTime);
          return {
            ...p,
            startTime: safeStartTime,
            endTime: safeStartTime + p.duration,
          };
        })
        .sort((a, b) => a.startTime - b.startTime),
    })),

  updatePathDuration: (pathId, duration) =>
    set((s) => ({
      savedPaths: s.savedPaths.map((p) => {
        if (p.id !== pathId) return p;
        const safeDuration = Math.max(0.5, duration);
        return {
          ...p,
          duration: safeDuration,
          endTime: p.startTime + safeDuration,
        };
      }),
    })),

  updatePathName: (pathId, name) =>
    set((s) => ({
      savedPaths: s.savedPaths.map((p) =>
        p.id === pathId ? { ...p, name } : p,
      ),
    })),

  removePath: (id) =>
    set((s) => ({
      savedPaths: s.savedPaths.filter((p) => p.id !== id),
      hiddenPathIds: s.hiddenPathIds.filter((pathId) => pathId !== id),
    })),

  addStationary: (time, duration) =>
    set((s) => {
      const newCount = s.stationaryCounter + 1;
      const marker = {
        id: crypto.randomUUID(),
        name: `Hold ${newCount}`,
        time: Math.max(0, time ?? 0),
        duration: Math.max(0.5, duration ?? 5),
      };
      const markers = [...s.stationaryMarkers, marker].sort(
        (a, b) => a.time - b.time,
      );
      return { stationaryMarkers: markers, stationaryCounter: newCount };
    }),

  updateStationaryTime: (id, time) =>
    set((s) => ({
      stationaryMarkers: s.stationaryMarkers
        .map((m) => (m.id === id ? { ...m, time: Math.max(0, time) } : m))
        .sort((a, b) => a.time - b.time),
    })),

  updateStationaryDuration: (id, duration) =>
    set((s) => ({
      stationaryMarkers: s.stationaryMarkers.map((m) =>
        m.id === id ? { ...m, duration: Math.max(0.5, duration) } : m,
      ),
    })),

  updateStationaryName: (id, name) =>
    set((s) => ({
      stationaryMarkers: s.stationaryMarkers.map((m) =>
        m.id === id ? { ...m, name } : m,
      ),
    })),

  removeStationary: (id) =>
    set((s) => ({
      stationaryMarkers: s.stationaryMarkers.filter((m) => m.id !== id),
    })),

  setSelectedFormationId: (id) => set({ selectedFormationId: id }),

  togglePathVisibility: (pathId) =>
    set((s) => ({
      hiddenPathIds: s.hiddenPathIds.includes(pathId)
        ? s.hiddenPathIds.filter((id) => id !== pathId)
        : [...s.hiddenPathIds, pathId],
    })),

  toggleAllPathsVisibility: () =>
    set((s) => {
      if (
        s.hiddenPathIds.length === s.savedPaths.length &&
        s.savedPaths.length > 0
      ) {
        return { hiddenPathIds: [] };
      }
      return { hiddenPathIds: s.savedPaths.map((p) => p.id) };
    }),

  saveFormation: (startTime, endTime) =>
    set((s) => {
      const dancers = s.props.filter((p) => p.type === 'dancer');
      if (dancers.length === 0) return s;
      const newCount = s.formationCounter + 1;
      const positions = {};
      dancers.forEach((dancer) => {
        positions[dancer.id] = [...dancer.position];
      });
      const safeStartTime = Math.max(0, startTime ?? 0);
      const formation = {
        id: crypto.randomUUID(),
        name: `Formation ${newCount}`,
        time: safeStartTime,
        endTime: Math.max(safeStartTime + 0.5, endTime ?? safeStartTime + 5),
        positions,
      };
      const formations = [...s.formations, formation].sort(
        (a, b) => a.time - b.time,
      );
      return { formations, formationCounter: newCount };
    }),

  removeFormation: (id) =>
    set((s) => ({
      formations: s.formations.filter((f) => f.id !== id),
    })),

  updateFormationTime: (id, time) =>
    set((s) => ({
      formations: s.formations
        .map((f) => (f.id === id ? { ...f, time: Math.max(0, time) } : f))
        .sort((a, b) => a.time - b.time),
    })),

  updateFormationName: (id, name) =>
    set((s) => ({
      formations: s.formations.map((f) =>
        f.id === id ? { ...f, name } : f,
      ),
    })),

  updateFormationEndTime: (id, endTime) =>
    set((s) => ({
      formations: s.formations.map((f) =>
        f.id === id ? { ...f, endTime: Math.max(f.time + 0.5, endTime) } : f,
      ),
    })),

  setTimelineEndTime: (time) => set({ timelineEndTime: Math.max(1, time) }),

  setMusicDuration: (duration) =>
    set({
      musicDuration: duration,
      timelineEndTime: duration ? Math.max(1, Math.ceil(duration)) : 120,
    }),

  applyFormation: (formationId) => {
    const { formations, props, updateProp } = get();
    const formation = formations.find((f) => f.id === formationId);
    if (!formation) return;
    Object.entries(formation.positions).forEach(([dancerId, position]) => {
      const dancer = props.find((p) => p.id === dancerId);
      if (dancer) {
        updateProp(dancerId, { position });
      }
    });
  },

  setTravelTimeBetweenFormations: (fromTime, toTime) => {
    const duration = Math.max(0.5, toTime - fromTime);
    const { props, setDancerTravelTime } = get();
    props
      .filter((p) => p.type === 'dancer')
      .forEach((dancer) => setDancerTravelTime(dancer.id, duration));
  },
}));
