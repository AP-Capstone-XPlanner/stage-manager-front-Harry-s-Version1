import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edges, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStageStore } from '../../store/stageStore.js';
import { getPlatformArea } from '../../utils/customPlatforms.js';

const disabledRaycast = () => null;

function createPlatformGeometry(points, height) {
  if (!Array.isArray(points) || points.length < 3 || getPlatformArea(points) <= 0) {
    return null;
  }
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    const sx = Number(x);
    const sy = -Number(z);
    if (index === 0) {
      shape.moveTo(sx, sy);
    } else {
      shape.lineTo(sx, sy);
    }
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height),
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function getOutlinePoints(platform, stageHeight) {
  const topY = stageHeight + platform.height + 0.025;
  const points = platform.points.map(([x, z]) => [x, topY, z]);
  if (points.length > 0) points.push(points[0]);
  return points;
}

function PlatformVertexHandle({ platform, index, selected }) {
  const point = platform.points[index];
  const stage = useStageStore((s) => s.stage);
  const snapToGrid = useStageStore((s) => s.snapToGrid);
  const moveCustomPlatformPoint = useStageStore((s) => s.moveCustomPlatformPoint);
  const selectCustomPlatform = useStageStore((s) => s.selectCustomPlatform);
  const orbitControls = useThree((s) => s.controls);
  const target = useRef(new THREE.Vector3());
  const [dragging, setDragging] = useState(false);

  const dragPlane = useMemo(
    () =>
      new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -(stage.height + platform.height + 0.04),
      ),
    [platform.height, stage.height],
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
      moveCustomPlatformPoint(
        platform.id,
        index,
        target.current.x,
        target.current.z,
        { snap: snapToGrid && !event.nativeEvent?.altKey },
      );
    },
    [dragPlane, index, moveCustomPlatformPoint, platform.id, snapToGrid],
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
      position={[point[0], stage.height + platform.height + 0.13, point[1]]}
      scale={selected || dragging ? 1.25 : 1}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectCustomPlatform(platform.id, index);
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
      <sphereGeometry args={[0.14, 18, 14]} />
      <meshStandardMaterial
        color={selected || dragging ? '#facc15' : '#f8fafc'}
        emissive={selected || dragging ? '#7c2d12' : '#0f172a'}
        emissiveIntensity={0.18}
        roughness={0.35}
      />
    </mesh>
  );
}

function CustomPlatformItem({ platform, selected, selectedPointIndex }) {
  const stage = useStageStore((s) => s.stage);
  const mode = useStageStore((s) => s.mode);
  const snapToGrid = useStageStore((s) => s.snapToGrid);
  const selectCustomPlatform = useStageStore((s) => s.selectCustomPlatform);
  const moveCustomPlatform = useStageStore((s) => s.moveCustomPlatform);
  const orbitControls = useThree((s) => s.controls);
  const target = useRef(new THREE.Vector3());
  const lastDragPoint = useRef(null);
  const [dragging, setDragging] = useState(false);

  const geometry = useMemo(
    () => createPlatformGeometry(platform.points, platform.height),
    [platform.height, platform.points],
  );

  const dragPlane = useMemo(
    () =>
      new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -(stage.height + platform.height + 0.045),
      ),
    [platform.height, stage.height],
  );

  const setOrbitEnabled = useCallback(
    (enabled) => {
      if (orbitControls && 'enabled' in orbitControls) {
        orbitControls.enabled = enabled;
      }
    },
    [orbitControls],
  );

  const updateDragPoint = useCallback(
    (event) => {
      if (!event.ray?.intersectPlane(dragPlane, target.current)) return false;
      const current = [target.current.x, target.current.z];
      if (lastDragPoint.current) {
        moveCustomPlatform(
          platform.id,
          current[0] - lastDragPoint.current[0],
          current[1] - lastDragPoint.current[1],
          { snap: snapToGrid && !event.nativeEvent?.altKey },
        );
      }
      lastDragPoint.current = current;
      return true;
    },
    [dragPlane, moveCustomPlatform, platform.id, snapToGrid],
  );

  const endPlatformDrag = useCallback(
    (event) => {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      lastDragPoint.current = null;
      setDragging(false);
      setOrbitEnabled(true);
    },
    [setOrbitEnabled],
  );

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => {
    if (!dragging) setOrbitEnabled(true);
    return () => setOrbitEnabled(true);
  }, [dragging, setOrbitEnabled]);

  if (!platform.visible) return null;

  const outlinePoints = getOutlinePoints(platform, stage.height);
  const materialOpacity = platform.kind === 'ground' ? 0.55 : 0.82;
  const editing = selected && mode !== 'place';

  return (
    <group>
      {geometry && (
        <mesh
          geometry={geometry}
          position={[0, stage.height + 0.008, 0]}
          castShadow
          receiveShadow
          onClick={(event) => {
            if (mode === 'place') return;
            event.stopPropagation();
            selectCustomPlatform(platform.id);
          }}
          onPointerDown={(event) => {
            if (mode === 'place') return;
            event.stopPropagation();
            selectCustomPlatform(platform.id);
            event.target?.setPointerCapture?.(event.pointerId);
            lastDragPoint.current = null;
            setDragging(true);
            setOrbitEnabled(false);
            updateDragPoint(event);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            event.stopPropagation();
            updateDragPoint(event);
          }}
          onPointerUp={endPlatformDrag}
          onPointerCancel={endPlatformDrag}
          raycast={mode === 'place' ? disabledRaycast : THREE.Mesh.prototype.raycast}
        >
          <meshStandardMaterial
            color={platform.color}
            transparent
            opacity={materialOpacity}
            roughness={0.72}
            metalness={0.03}
            polygonOffset
            polygonOffsetFactor={-1}
          />
          <Edges color={selected ? '#facc15' : '#e2e8f0'} threshold={10} />
        </mesh>
      )}
      <Line
        points={outlinePoints}
        color={selected ? '#facc15' : platform.color}
        lineWidth={selected ? 3 : 1.5}
        transparent
        opacity={selected ? 1 : 0.72}
      />
      {editing &&
        platform.points.map((_, index) => (
          <PlatformVertexHandle
            key={`${platform.id}-point-${index}`}
            platform={platform}
            index={index}
            selected={selectedPointIndex === index}
          />
        ))}
    </group>
  );
}

export function CustomPlatforms() {
  const platforms = useStageStore((s) => s.customPlatforms);
  const selectedPlatformId = useStageStore((s) => s.selectedPlatformId);
  const selectedPlatformPointIndex = useStageStore((s) => s.selectedPlatformPointIndex);

  return (
    <group>
      {platforms.map((platform) => (
        <CustomPlatformItem
          key={platform.id}
          platform={platform}
          selected={platform.id === selectedPlatformId}
          selectedPointIndex={
            platform.id === selectedPlatformId ? selectedPlatformPointIndex : null
          }
        />
      ))}
    </group>
  );
}
