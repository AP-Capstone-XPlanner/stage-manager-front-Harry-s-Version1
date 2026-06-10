import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Edges, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STAGE_SURFACE_COLORS } from '../../constants/stage.js';
import {
  applyStageDeckTextureRepeat,
  getStageDeckTexture,
} from '../../utils/proceduralTextures.js';
import { useStageStore } from '../../store/stageStore.js';
import { getStageHalfExtents } from '../../utils/stageAxes.js';
import { getPlatformArea, normalizeStageShapePoints } from '../../utils/customPlatforms.js';
import { StageMeterGrid } from './StageMeterGrid.jsx';

function createShape(points) {
  if (!Array.isArray(points) || points.length < 3 || getPlatformArea(points) <= 0) {
    return null;
  }
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    const sx = Number(x);
    const sy = -Number(z);
    if (index === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  });
  shape.closePath();
  return shape;
}

function createStageGeometry(points, height) {
  const shape = createShape(points);
  if (!shape) return null;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height),
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createStageTopGeometry(points) {
  const shape = createShape(points);
  if (!shape) return null;
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function getOutlinePoints(points, topY) {
  const outline = points.map(([x, z]) => [x, topY + 0.035, z]);
  if (outline.length > 0) outline.push(outline[0]);
  return outline;
}

function StageShapeHandle({ point, index, selected }) {
  const stage = useStageStore((s) => s.stage);
  const snapToGrid = useStageStore((s) => s.snapToGrid);
  const selectStageShapePoint = useStageStore((s) => s.selectStageShapePoint);
  const moveStageShapePoint = useStageStore((s) => s.moveStageShapePoint);
  const orbitControls = useThree((s) => s.controls);
  const target = useRef(new THREE.Vector3());
  const [dragging, setDragging] = useState(false);

  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(stage.height + 0.045)),
    [stage.height],
  );

  const setOrbitEnabled = useCallback(
    (enabled) => {
      if (orbitControls && 'enabled' in orbitControls) {
        orbitControls.enabled = enabled;
      }
    },
    [orbitControls],
  );

  const updatePointFromEvent = useCallback(
    (event) => {
      if (!event.ray?.intersectPlane(dragPlane, target.current)) return;
      moveStageShapePoint(index, target.current.x, target.current.z, {
        snap: snapToGrid && !event.nativeEvent?.altKey,
      });
    },
    [dragPlane, index, moveStageShapePoint, snapToGrid],
  );

  const endDrag = useCallback(
    (event) => {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      setOrbitEnabled(true);
    },
    [setOrbitEnabled],
  );

  useEffect(() => {
    if (!dragging) setOrbitEnabled(true);
    return () => setOrbitEnabled(true);
  }, [dragging, setOrbitEnabled]);

  return (
    <mesh
      position={[point[0], stage.height + 0.16, point[1]]}
      scale={selected || dragging ? 1.25 : 1}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectStageShapePoint(index);
        event.target?.setPointerCapture?.(event.pointerId);
        setDragging(true);
        setOrbitEnabled(false);
        updatePointFromEvent(event);
      }}
      onPointerMove={(event) => {
        if (!dragging) return;
        event.stopPropagation();
        updatePointFromEvent(event);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <boxGeometry args={[0.26, 0.18, 0.26]} />
      <meshStandardMaterial
        color={selected || dragging ? '#facc15' : '#e0f2fe'}
        emissive={selected || dragging ? '#7c2d12' : '#075985'}
        emissiveIntensity={0.18}
        roughness={0.38}
      />
    </mesh>
  );
}

export function StagePlatform() {
  const { length, width, height } = useStageStore((s) => s.stage);
  const rawStageShapePoints = useStageStore((s) => s.stageShapePoints);
  const stageShapeEditing = useStageStore((s) => s.stageShapeEditing);
  const stageShapeDrawMode = useStageStore((s) => s.stageShapeDrawMode);
  const selectedStageShapePointIndex = useStageStore(
    (s) => s.selectedStageShapePointIndex,
  );
  const texture = useStageStore((s) => s.stageTexture);
  const surface = STAGE_SURFACE_COLORS[texture];
  const topY = height;
  const stage = useMemo(() => ({ length, width, height }), [height, length, width]);
  const stageShapePoints = useMemo(
    () => normalizeStageShapePoints(rawStageShapePoints, stage),
    [rawStageShapePoints, stage],
  );

  const deckMap = useMemo(() => getStageDeckTexture(texture), [texture]);
  const baseGeometry = useMemo(
    () => createStageGeometry(stageShapePoints, height),
    [height, stageShapePoints],
  );
  const topGeometry = useMemo(
    () => createStageTopGeometry(stageShapePoints),
    [stageShapePoints],
  );
  const outlinePoints = useMemo(
    () => getOutlinePoints(stageShapePoints, topY),
    [stageShapePoints, topY],
  );

  useEffect(() => () => baseGeometry?.dispose(), [baseGeometry]);
  useEffect(() => () => topGeometry?.dispose(), [topGeometry]);

  useLayoutEffect(() => {
    applyStageDeckTextureRepeat(deckMap, width, length, {
      spanDeck: texture === 'cheer_mats',
    });
  }, [deckMap, length, texture, width]);

  return (
    <group>
      {baseGeometry && (
        <mesh geometry={baseGeometry} receiveShadow castShadow>
          <meshStandardMaterial
            color={surface.body}
            roughness={surface.roughness}
            metalness={surface.metalness}
          />
          <Edges color={surface.edge} threshold={15} />
        </mesh>
      )}
      {topGeometry && (
        <mesh
          geometry={topGeometry}
          position={[0, topY + 0.004, 0]}
          receiveShadow
          renderOrder={1}
        >
          <meshStandardMaterial
            map={deckMap}
            color="#ffffff"
            roughness={surface.roughness}
            metalness={surface.metalness}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}
      <Line
        points={outlinePoints}
        color={stageShapeEditing ? '#facc15' : surface.edge}
        lineWidth={stageShapeEditing ? 3 : 1.5}
        transparent
        opacity={stageShapeEditing || stageShapeDrawMode ? 1 : 0.65}
      />
      {stageShapeEditing && !stageShapeDrawMode &&
        stageShapePoints.map((point, index) => (
          <StageShapeHandle
            key={`stage-shape-point-${index}`}
            point={point}
            index={index}
            selected={selectedStageShapePointIndex === index}
          />
        ))}
      <StageMeterGrid />
    </group>
  );
}

export function useStageTopY() {
  return useStageStore((s) => s.stage.height);
}

export function useStageBounds() {
  const { length, width } = useStageStore((s) => s.stage);
  return getStageHalfExtents(length, width);
}
