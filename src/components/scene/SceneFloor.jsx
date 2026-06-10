import { useStageStore } from '../../store/stageStore.js';
import { CUSTOM_PLATFORM_LIMITS } from '../../utils/customPlatforms.js';

export function SceneFloor() {
  const groundColor = useStageStore((s) => s.groundColor);
  const floorSize = Math.max(200, CUSTOM_PLATFORM_LIMITS.workspaceHalfExtent * 2 + 40);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[floorSize, floorSize]} />
      <meshStandardMaterial color={groundColor} roughness={1} />
    </mesh>
  );
}
