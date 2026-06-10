import { getStageHalfExtents } from './stageAxes.js';
import { snapValue } from './snap.js';
import { normalizeHexColor } from './color.js';

export const CUSTOM_PLATFORM_LIMITS = Object.freeze({
  minHeight: 0.03,
  maxHeight: 2.5,
  defaultPlatformHeight: 0.3,
  defaultGroundHeight: 0.05,
  minPoints: 3,
  maxPoints: 48,
  minArea: 0.2,
  snapDistance: 0.35,
  workspaceHalfExtent: 120,
  drawPointSpacing: 0.55,
});

const DEFAULT_PLATFORM_COLOR = '#3b82f6';
const DEFAULT_GROUND_COLOR = '#22c55e';

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function platformDefaults(kind) {
  const isGround = kind === 'ground';
  return {
    kind: isGround ? 'ground' : 'platform',
    color: isGround ? DEFAULT_GROUND_COLOR : DEFAULT_PLATFORM_COLOR,
    height: isGround
      ? CUSTOM_PLATFORM_LIMITS.defaultGroundHeight
      : CUSTOM_PLATFORM_LIMITS.defaultPlatformHeight,
    namePrefix: isGround ? 'Ground' : 'Platform',
  };
}

function getSafeUuid() {
  return globalThis.crypto?.randomUUID?.() ?? `platform-${Date.now()}-${Math.random()}`;
}

function getStageBounds(stage, margin = 0.15) {
  const { halfX, halfZ } = getStageHalfExtents(stage.length, stage.width);
  return {
    minX: -halfX + margin,
    maxX: halfX - margin,
    minZ: -halfZ + margin,
    maxZ: halfZ - margin,
  };
}

function getWorkspaceBounds(margin = 0.15) {
  const half = CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent;
  return {
    minX: -half + margin,
    maxX: half - margin,
    minZ: -half + margin,
    maxZ: half - margin,
  };
}

function normalizePoint(point, bounds, options = {}) {
  const rawX = Array.isArray(point) ? point[0] : point?.x;
  const rawZ = Array.isArray(point) ? point[1] : point?.z;
  const snap = options.snap ?? false;
  const x = clamp(snapValue(finiteNumber(rawX), snap), bounds.minX, bounds.maxX);
  const z = clamp(snapValue(finiteNumber(rawZ), snap), bounds.minZ, bounds.maxZ);
  return [Number(x.toFixed(3)), Number(z.toFixed(3))];
}

function nearestSnapPoint(point, targets, threshold = CUSTOM_PLATFORM_LIMITS.snapDistance) {
  if (!Array.isArray(targets) || targets.length === 0) return null;
  let nearest = null;
  let nearestDistance = threshold;
  targets.forEach((target) => {
    const distance = Math.hypot(point[0] - target[0], point[1] - target[1]);
    if (distance <= nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  });
  return nearest;
}

export function snapPointToTargets(point, targets, threshold) {
  const nearest = nearestSnapPoint(point, targets, threshold);
  return nearest ? [nearest[0], nearest[1]] : point;
}

export function clampCustomPlatformHeight(height, kind = 'platform') {
  const defaults = platformDefaults(kind);
  return clamp(
    finiteNumber(height, defaults.height),
    CUSTOM_PLATFORM_LIMITS.minHeight,
    CUSTOM_PLATFORM_LIMITS.maxHeight,
  );
}

export function getPlatformArea(points) {
  if (!Array.isArray(points) || points.length < CUSTOM_PLATFORM_LIMITS.minPoints) {
    return 0;
  }
  let area = 0;
  points.forEach(([x1, z1], index) => {
    const [x2, z2] = points[(index + 1) % points.length];
    area += x1 * z2 - x2 * z1;
  });
  return Math.abs(area) / 2;
}

export function normalizeCustomPlatformPoint(point, stage, options = {}) {
  const margin = options.margin ?? 0.15;
  const bounds =
    options.boundsMode === 'stage'
      ? getStageBounds(stage, margin)
      : getWorkspaceBounds(margin);
  const normalized = normalizePoint(point, bounds, options);
  return options.snapTargets
    ? snapPointToTargets(normalized, options.snapTargets, options.snapDistance)
    : normalized;
}

export function normalizeCustomPlatform(platform, stage, fallbackIndex = 0) {
  const defaults = platformDefaults(platform?.kind);
  const rawPoints = Array.isArray(platform?.points) ? platform.points : [];
  const points = rawPoints
    .slice(0, CUSTOM_PLATFORM_LIMITS.maxPoints)
    .map((point) => normalizeCustomPlatformPoint(point, stage))
    .filter(([x, z]) => Number.isFinite(x) && Number.isFinite(z));

  if (
    points.length < CUSTOM_PLATFORM_LIMITS.minPoints ||
    getPlatformArea(points) < CUSTOM_PLATFORM_LIMITS.minArea
  ) {
    return null;
  }

  return {
    id: typeof platform?.id === 'string' ? platform.id : getSafeUuid(),
    name:
      typeof platform?.name === 'string' && platform.name.trim()
        ? platform.name.trim().slice(0, 36)
        : `${defaults.namePrefix} ${fallbackIndex + 1}`,
    kind: defaults.kind,
    color: normalizeHexColor(platform?.color, defaults.color),
    height: clampCustomPlatformHeight(platform?.height, defaults.kind),
    points,
    visible: platform?.visible ?? true,
  };
}

export function normalizeCustomPlatforms(platforms, stage) {
  if (!Array.isArray(platforms)) return [];
  return platforms
    .map((platform, index) => normalizeCustomPlatform(platform, stage, index))
    .filter(Boolean);
}

export function createCustomPlatform(stage, kind = 'platform', count = 0) {
  const defaults = platformDefaults(kind);
  const width = clamp(stage.width * 0.22, 2, 5);
  const depth = clamp(stage.length * 0.22, 1.5, 4);
  const offset = Math.min(1.5, count * 0.35);
  const points = [
    [-width / 2 + offset, -depth / 2 + offset],
    [width / 2 + offset, -depth / 2 + offset],
    [width / 2 + offset, depth / 2 + offset],
    [-width / 2 + offset, depth / 2 + offset],
  ].map((point) => normalizeCustomPlatformPoint(point, stage));

  return {
    id: getSafeUuid(),
    name: `${defaults.namePrefix} ${count + 1}`,
    kind: defaults.kind,
    color: defaults.color,
    height: defaults.height,
    points,
    visible: true,
  };
}

export function updateCustomPlatformPoint(platform, pointIndex, x, z, stage, options = {}) {
  if (!platform || pointIndex < 0 || pointIndex >= platform.points.length) {
    return platform;
  }
  const points = platform.points.map((point, index) =>
    index === pointIndex
      ? normalizeCustomPlatformPoint([x, z], stage, options)
      : point,
  );
  if (getPlatformArea(points) < CUSTOM_PLATFORM_LIMITS.minArea) {
    return platform;
  }
  return { ...platform, points };
}

export function translateCustomPlatform(platform, dx, dz, stage, options = {}) {
  if (!platform) return platform;
  const bounds = getWorkspaceBounds();
  const snappedDx = snapValue(finiteNumber(dx), options.snap ?? false);
  const snappedDz = snapValue(finiteNumber(dz), options.snap ?? false);
  const moved = platform.points.map(([x, z]) => [
    x + snappedDx,
    z + snappedDz,
  ]);

  let adjustX = 0;
  let adjustZ = 0;
  if (Array.isArray(options.snapTargets) && options.snapTargets.length > 0) {
    let bestDistance = CUSTOM_PLATFORM_LIMITS.snapDistance;
    moved.forEach((point) => {
      const nearest = nearestSnapPoint(point, options.snapTargets, bestDistance);
      if (!nearest) return;
      const distance = Math.hypot(point[0] - nearest[0], point[1] - nearest[1]);
      if (distance <= bestDistance) {
        bestDistance = distance;
        adjustX = nearest[0] - point[0];
        adjustZ = nearest[1] - point[1];
      }
    });
  }

  const translated = moved.map(([x, z]) =>
    normalizePoint([x + adjustX, z + adjustZ], bounds),
  );
  if (getPlatformArea(translated) < CUSTOM_PLATFORM_LIMITS.minArea) {
    return platform;
  }
  return { ...platform, points: translated };
}

export function insertCustomPlatformPoint(platform, stage) {
  if (!platform || platform.points.length >= CUSTOM_PLATFORM_LIMITS.maxPoints) {
    return platform;
  }
  let longestEdgeIndex = 0;
  let longestDistance = -1;
  platform.points.forEach(([x1, z1], index) => {
    const [x2, z2] = platform.points[(index + 1) % platform.points.length];
    const distance = Math.hypot(x2 - x1, z2 - z1);
    if (distance > longestDistance) {
      longestDistance = distance;
      longestEdgeIndex = index;
    }
  });
  const [x1, z1] = platform.points[longestEdgeIndex];
  const [x2, z2] = platform.points[(longestEdgeIndex + 1) % platform.points.length];
  const midpoint = normalizeCustomPlatformPoint([(x1 + x2) / 2, (z1 + z2) / 2], stage);
  const points = [...platform.points];
  points.splice(longestEdgeIndex + 1, 0, midpoint);
  return { ...platform, points };
}

export function removeCustomPlatformPoint(platform, pointIndex) {
  if (
    !platform ||
    platform.points.length <= CUSTOM_PLATFORM_LIMITS.minPoints ||
    pointIndex < 0 ||
    pointIndex >= platform.points.length
  ) {
    return platform;
  }
  const points = platform.points.filter((_, index) => index !== pointIndex);
  if (getPlatformArea(points) < CUSTOM_PLATFORM_LIMITS.minArea) {
    return platform;
  }
  return { ...platform, points };
}

export function createStageShapePoints(stage) {
  const { halfX, halfZ } = getStageHalfExtents(stage.length, stage.width);
  return [
    [-halfX, -halfZ],
    [halfX, -halfZ],
    [halfX, halfZ],
    [-halfX, halfZ],
  ].map((point) =>
    normalizeCustomPlatformPoint(point, stage, {
      boundsMode: 'stage',
      margin: 0,
    }),
  );
}

export function normalizeStageShapePoints(points, stage) {
  const rawPoints = Array.isArray(points) && points.length > 0
    ? points
    : createStageShapePoints(stage);
  const normalized = rawPoints
    .slice(0, CUSTOM_PLATFORM_LIMITS.maxPoints)
    .map((point) => normalizeCustomPlatformPoint(point, stage, { margin: 0 }))
    .filter(([x, z]) => Number.isFinite(x) && Number.isFinite(z));

  if (
    normalized.length < CUSTOM_PLATFORM_LIMITS.minPoints ||
    getPlatformArea(normalized) < CUSTOM_PLATFORM_LIMITS.minArea
  ) {
    return createStageShapePoints(stage);
  }
  return normalized;
}

export function resizeStageShapePoints(points, oldStage, newStage) {
  const current = normalizeStageShapePoints(points, oldStage ?? newStage);
  const oldWidth = Math.max(0.001, Math.abs(finiteNumber(oldStage?.width, newStage.width)));
  const oldLength = Math.max(0.001, Math.abs(finiteNumber(oldStage?.length, newStage.length)));
  const nextWidth = Math.max(0.001, Math.abs(finiteNumber(newStage.width, oldWidth)));
  const nextLength = Math.max(0.001, Math.abs(finiteNumber(newStage.length, oldLength)));
  const scaleX = nextWidth / oldWidth;
  const scaleZ = nextLength / oldLength;
  return normalizeStageShapePoints(
    current.map(([x, z]) => [x * scaleX, z * scaleZ]),
    newStage,
  );
}

export function updateStageShapePoint(points, pointIndex, x, z, stage, options = {}) {
  const current = normalizeStageShapePoints(points, stage);
  if (pointIndex < 0 || pointIndex >= current.length) return current;
  const next = current.map((point, index) =>
    index === pointIndex
      ? normalizeCustomPlatformPoint([x, z], stage, {
          ...options,
          margin: 0,
        })
      : point,
  );
  if (getPlatformArea(next) < CUSTOM_PLATFORM_LIMITS.minArea) {
    return current;
  }
  return next;
}

export function insertStageShapePoint(points, stage) {
  const current = normalizeStageShapePoints(points, stage);
  if (current.length >= CUSTOM_PLATFORM_LIMITS.maxPoints) return current;
  let longestEdgeIndex = 0;
  let longestDistance = -1;
  current.forEach(([x1, z1], index) => {
    const [x2, z2] = current[(index + 1) % current.length];
    const distance = Math.hypot(x2 - x1, z2 - z1);
    if (distance > longestDistance) {
      longestDistance = distance;
      longestEdgeIndex = index;
    }
  });
  const [x1, z1] = current[longestEdgeIndex];
  const [x2, z2] = current[(longestEdgeIndex + 1) % current.length];
  const midpoint = normalizeCustomPlatformPoint(
    [(x1 + x2) / 2, (z1 + z2) / 2],
    stage,
    { margin: 0 },
  );
  const next = [...current];
  next.splice(longestEdgeIndex + 1, 0, midpoint);
  return next;
}

export function removeStageShapePoint(points, pointIndex, stage) {
  return removeCustomPlatformPoint(
    { points: normalizeStageShapePoints(points, stage) },
    pointIndex,
  ).points;
}

function createEllipsePoints(stage, options = {}) {
  const segments = options.segments ?? 32;
  const radiusX = clamp(
    finiteNumber(options.radiusX, stage.width / 2),
    0.6,
    CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent - 1,
  );
  const radiusZ = clamp(
    finiteNumber(options.radiusZ, stage.length / 2),
    0.6,
    CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent - 1,
  );
  const centerX = finiteNumber(options.centerX, 0);
  const centerZ = finiteNumber(options.centerZ, 0);
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [
      centerX + Math.cos(angle) * radiusX,
      centerZ + Math.sin(angle) * radiusZ,
    ];
  });
  return normalizeStageShapePoints(points, stage);
}

function createSemiCirclePoints(stage, options = {}) {
  const segments = options.segments ?? 28;
  const radiusX = clamp(
    finiteNumber(options.radiusX, stage.width / 2),
    0.6,
    CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent - 1,
  );
  const depth = clamp(
    finiteNumber(options.depth, stage.length),
    1.2,
    CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent * 1.5,
  );
  const backZ = finiteNumber(options.backZ, -stage.length / 2);
  const centerX = finiteNumber(options.centerX, 0);
  const points = [
    [centerX - radiusX, backZ],
    [centerX + radiusX, backZ],
  ];
  for (let step = 1; step < segments; step += 1) {
    const angle = (step / segments) * Math.PI;
    points.push([
      centerX + Math.cos(angle) * radiusX,
      backZ + Math.sin(angle) * depth,
    ]);
  }
  return normalizeStageShapePoints(points, stage);
}

export function createStageShapePresetPoints(stage, preset) {
  if (preset === 'circle') {
    const radius = Math.max(0.75, Math.min(stage.width, stage.length) / 2);
    return createEllipsePoints(stage, { radiusX: radius, radiusZ: radius });
  }
  if (preset === 'ellipse') {
    return createEllipsePoints(stage);
  }
  if (preset === 'semicircle') {
    return createSemiCirclePoints(stage);
  }
  return createStageShapePoints(stage);
}

export function normalizeStageDrawPoint(point, stage, options = {}) {
  return normalizeCustomPlatformPoint(point, stage, {
    ...options,
    margin: 0,
  });
}
