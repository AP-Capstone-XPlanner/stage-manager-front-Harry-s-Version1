import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useStageStore } from '../../store/stageStore.js';
import { adjustColorBrightness } from '../../utils/color.js';
import { normalizeStageShapePoints } from '../../utils/customPlatforms.js';

const WALL_OFFSET = 0.004;
const RENDER_ORDER = 6;

function EnclosureWall({ position, rotation, width, height, fill, edge, opacity }) {
  return (
    <mesh position={position} rotation={rotation} renderOrder={RENDER_ORDER}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={fill}
        transparent
        opacity={opacity}
        side={THREE.FrontSide}
        depthWrite={false}
        roughness={0.9}
        metalness={0}
      />
      <Edges color={edge} threshold={12} />
    </mesh>
  );
}

export function StageEnclosure() {
  const showStageEnclosure = useStageStore((s) => s.showStageEnclosure);
  const enclosureHeight = useStageStore((s) => s.stageEnclosureHeight);
  const fill = useStageStore((s) => s.stageEnclosureColor);
  const opacity = useStageStore((s) => s.stageEnclosureOpacity);
  const stage = useStageStore((s) => s.stage);
  const rawStageShapePoints = useStageStore((s) => s.stageShapePoints);

  const stageShapePoints = useMemo(
    () => normalizeStageShapePoints(rawStageShapePoints, stage),
    [rawStageShapePoints, stage],
  );
  const walls = useMemo(
    () =>
      stageShapePoints.map(([x1, z1], index) => {
        const [x2, z2] = stageShapePoints[(index + 1) % stageShapePoints.length];
        const dx = x2 - x1;
        const dz = z2 - z1;
        return {
          key: `wall-${index}`,
          position: [(x1 + x2) / 2, stage.height + enclosureHeight / 2, (z1 + z2) / 2],
          rotation: [0, -Math.atan2(dz, dx), 0],
          width: Math.max(0.01, Math.hypot(dx, dz)),
        };
      }),
    [enclosureHeight, stage.height, stageShapePoints],
  );

  const edge = adjustColorBrightness(fill, 0.18);

  if (!showStageEnclosure) return null;

  return (
    <group>
      {walls.map((wall) => (
        <EnclosureWall
          key={wall.key}
          position={[
            wall.position[0],
            wall.position[1],
            wall.position[2] + WALL_OFFSET,
          ]}
          rotation={wall.rotation}
          width={wall.width}
          height={enclosureHeight}
          fill={fill}
          edge={edge}
          opacity={opacity}
        />
      ))}
    </group>
  );
}
