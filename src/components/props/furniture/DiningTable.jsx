import CoffeeTableWoodMaterial from '../../materials/CoffeeTableWoodMaterial.jsx'
import AnimatedChair from './AnimatedChair.jsx'

export default function DiningTable({ chairsPulled = [], onToggleChair }) {
  const renderChair = (index, posX, posZ, rotY) => (
    <AnimatedChair
      posX={posX}
      posZ={posZ}
      rotY={rotY}
      isPulled={chairsPulled[index] ?? false}
      onTogglePull={onToggleChair ? () => onToggleChair(index) : undefined}
    />
  )

  return (
    <group>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow><boxGeometry args={[1.83, 0.04, 0.91]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" roughness={0.35} /></mesh>
      <group position={[0, 0.69, 0]}>
        <mesh position={[0, 0, 0.425]} castShadow><boxGeometry args={[1.73, 0.06, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[0, 0, -0.425]} castShadow><boxGeometry args={[1.73, 0.06, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[0.885, 0, 0]} castShadow><boxGeometry args={[0.02, 0.06, 0.85]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[-0.885, 0, 0]} castShadow><boxGeometry args={[0.02, 0.06, 0.85]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
      </group>
      {[[0.865, 0.405], [0.865, -0.405], [-0.865, 0.405], [-0.865, -0.405]].map(([x, z], idx) => (
        <mesh key={`tl-${idx}`} position={[x, 0.36, z]} castShadow><boxGeometry args={[0.07, 0.72, 0.07]} /><meshStandardMaterial color="#d2b48c" roughness={0.4} /></mesh>
      ))}
      {renderChair(0, -0.55, 0.635, Math.PI)}
      {renderChair(1, 0.0, 0.635, Math.PI)}
      {renderChair(2, 0.55, 0.635, Math.PI)}
      {renderChair(3, -0.55, -0.635, 0)}
      {renderChair(4, 0.0, -0.635, 0)}
      {renderChair(5, 0.55, -0.635, 0)}
    </group>
  )
}
