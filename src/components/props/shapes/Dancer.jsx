const WOOD = '#d8b98a';
const WOOD_LIGHT = '#ead4ae';
const WOOD_DARK = '#9f7445';
const JOINT = '#c49a66';

function WoodMaterial({ color = WOOD }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.7}
      metalness={0.04}
    />
  );
}

function CapsuleSegment({ position, radius, length, rotation, color }) {
  const cylinderLength = Math.max(0.001, length - radius * 2);
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <capsuleGeometry args={[radius, cylinderLength, 10, 22]} />
      <WoodMaterial color={color} />
    </mesh>
  );
}

function Joint({ position, radius }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 18, 12]} />
      <WoodMaterial color={JOINT} />
    </mesh>
  );
}

function Foot({ x }) {
  return (
    <mesh position={[x, 0.035, 0.05]} scale={[0.075, 0.035, 0.155]} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 12]} />
      <WoodMaterial color={WOOD_LIGHT} />
    </mesh>
  );
}

function Hand({ x }) {
  return (
    <mesh position={[x, 0.64, 0.015]} scale={[0.04, 0.105, 0.032]} castShadow receiveShadow>
      <sphereGeometry args={[1, 18, 12]} />
      <WoodMaterial color={WOOD_LIGHT} />
    </mesh>
  );
}

export default function Dancer() {
  return (
    <group>
      <mesh position={[0, 1.21, 0]} scale={[1, 1, 0.58]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.13, 0.38, 28]} />
        <WoodMaterial />
      </mesh>

      <mesh position={[0, 0.94, 0]} scale={[0.18, 0.13, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[1, 28, 16]} />
        <WoodMaterial color={WOOD} />
      </mesh>

      <CapsuleSegment position={[0, 1.435, 0]} radius={0.035} length={0.075} color={WOOD_DARK} />
      <mesh position={[0, 1.58, 0]} scale={[0.085, 0.12, 0.075]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 18]} />
        <WoodMaterial color={WOOD_LIGHT} />
      </mesh>

      <Joint position={[0, 1.41, 0]} radius={0.04} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Joint position={[side * 0.215, 1.38, 0]} radius={0.045} />
          <CapsuleSegment position={[side * 0.27, 1.19, 0]} radius={0.045} length={0.34} color={WOOD_LIGHT} />
          <Joint position={[side * 0.27, 1.0, 0]} radius={0.034} />
          <CapsuleSegment position={[side * 0.27, 0.84, 0]} radius={0.04} length={0.3} color={WOOD_LIGHT} />
          <Joint position={[side * 0.27, 0.69, 0]} radius={0.028} />
          <Hand x={side * 0.27} />

          <Joint position={[side * 0.095, 0.84, 0]} radius={0.045} />
          <CapsuleSegment position={[side * 0.105, 0.65, 0]} radius={0.055} length={0.38} color={WOOD_LIGHT} />
          <Joint position={[side * 0.105, 0.46, 0]} radius={0.038} />
          <CapsuleSegment position={[side * 0.105, 0.27, 0]} radius={0.048} length={0.36} color={WOOD_LIGHT} />
          <Joint position={[side * 0.105, 0.09, 0]} radius={0.03} />
          <Foot x={side * 0.105} />
        </group>
      ))}
    </group>
  );
}
