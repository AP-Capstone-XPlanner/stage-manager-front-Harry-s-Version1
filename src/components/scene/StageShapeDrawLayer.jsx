import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStageStore } from '../../store/stageStore.js';
import { CUSTOM_PLATFORM_LIMITS } from '../../utils/customPlatforms.js';

function DraftPoint({ point, topY }) {
  return (
    <mesh position={[point[0], topY + 0.18, point[1]]}>
      <sphereGeometry args={[0.12, 16, 12]} />
      <meshStandardMaterial
        color="#fde68a"
        emissive="#92400e"
        emissiveIntensity={0.22}
        roughness={0.42}
      />
    </mesh>
  );
}

export function StageShapeDrawLayer() {
  const stage = useStageStore((s) => s.stage);
  const snapToGrid = useStageStore((s) => s.snapToGrid);
  const drawMode = useStageStore((s) => s.stageShapeDrawMode);
  const draftPoints = useStageStore((s) => s.stageShapeDraftPoints);
  const appendStageShapeDrawPoint = useStageStore((s) => s.appendStageShapeDrawPoint);
  const orbitControls = useThree((s) => s.controls);
  const [dragging, setDragging] = useState(false);
  const topY = stage.height + 0.07;
  const half = CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent;
  const lastAdded = useRef(null);

  const linePoints = useMemo(
    () => draftPoints.map(([x, z]) => [x, topY + 0.035, z]),
    [draftPoints, topY],
  );

  const setOrbitEnabled = useCallback(
    (enabled) => {
      if (orbitControls && 'enabled' in orbitControls) {
        orbitControls.enabled = enabled;
      }
    },
    [orbitControls],
  );

  const addPointFromEvent = useCallback(
    (event, force = false) => {
      const point = [event.point.x, event.point.z];
      if (!force && lastAdded.current) {
        const distance = Math.hypot(
          point[0] - lastAdded.current[0],
          point[1] - lastAdded.current[1],
        );
        if (distance < CUSTOM_PLATFORM_LIMITS.drawPointSpacing) return;
      }
      lastAdded.current = point;
      appendStageShapeDrawPoint(point[0], point[1], {
        snap: snapToGrid && !event.nativeEvent?.altKey,
      });
    },
    [appendStageShapeDrawPoint, snapToGrid],
  );

  const endDrawDrag = useCallback(
    (event) => {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      lastAdded.current = null;
      setOrbitEnabled(true);
    },
    [setOrbitEnabled],
  );

  useEffect(() => {
    if (!drawMode || !dragging) setOrbitEnabled(true);
    return () => setOrbitEnabled(true);
  }, [drawMode, dragging, setOrbitEnabled]);

  if (!drawMode) return null;

  return (
    <group>
      <mesh
        position={[0, topY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.target?.setPointerCapture?.(event.pointerId);
          setDragging(true);
          setOrbitEnabled(false);
          addPointFromEvent(event, true);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          event.stopPropagation();
          addPointFromEvent(event);
        }}
        onPointerUp={endDrawDrag}
        onPointerCancel={endDrawDrag}
      >
        <planeGeometry args={[half * 2, half * 2]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color="#facc15"
          lineWidth={3}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      )}
      {draftPoints.map((point, index) => (
        <DraftPoint key={`stage-draft-${index}`} point={point} topY={topY} />
      ))}
    </group>
  );
}
