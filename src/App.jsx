import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, TransformControls, Grid, Html } from '@react-three/drei'

// --- ADVANCED SHADER FOR THE SOFA CANVAS WEAVE ---
function CouchFabricMaterial({ color, roughness = 0.85 }) {
  return (
    <meshStandardMaterial 
      color={color} 
      roughness={roughness}
      metalness={0.05}
      bumpScale={0.012}
      onBeforeCompile={(shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          `
          #include <normal_fragment_maps>
          float weaveU = step(0.5, fract(vViewPosition.x * 280.0));
          float weaveV = step(0.5, fract(vViewPosition.y * 280.0));
          float edgeNoise = (weaveU == weaveV ? 1.0 : 0.0) * 0.15;
          normal = normalize(normal + vec3(edgeNoise * 0.1, edgeNoise * 0.1, 0.0));
          `
        );
      }}
    />
  )
}

// --- ADVANCED SHADER FOR THE COFFEE TABLE WOOD ---
function CoffeeTableWoodMaterial({ baseColor, roughness = 0.45 }) {
  return (
    <meshStandardMaterial 
      color={baseColor} 
      roughness={roughness}
      metalness={0.05}
      onBeforeCompile={(shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float grainLines = sin((vViewPosition.x + vViewPosition.z * 0.3) * 95.0) * 0.5 + 0.5;
          grainLines += cos(vViewPosition.y * 140.0) * 0.15;
          grainLines = clamp(grainLines, 0.0, 1.0);
          vec3 darkStreakColor = diffuseColor.rgb * 0.72;
          diffuseColor.rgb = mix(diffuseColor.rgb, darkStreakColor, grainLines * 0.28);
          `
        );
      }}
    />
  )
}

// --- ANIMATED INTERACTIVE WARDROBE MODEL COMPONENT ---
function AnimatedWardrobe({ isOpen }) {
  const leftDoorRef = useRef()
  const centerDoorRef = useRef()
  const rightDoorRef = useRef()

  const wWidth = 1.20;       
  const wHeight = 1.82;      
  const wDepth = 0.55;       
  const wWoodTone = "#8d6e63"; 
  const wMetalTone = "#b0bec5"; 

  useFrame(() => {
    const openAngle = Math.PI * 0.75
    const targetCenterAngle = isOpen ? openAngle : 0      
    const targetLeftAngle = isOpen ? -openAngle : 0       
    const targetRightAngle = isOpen ? openAngle : 0       
    
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y += (targetLeftAngle - leftDoorRef.current.rotation.y) * 0.05
    }
    if (centerDoorRef.current) {
      centerDoorRef.current.rotation.y += (targetCenterAngle - centerDoorRef.current.rotation.y) * 0.05
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y += (targetRightAngle - rightDoorRef.current.rotation.y) * 0.05
    }
  })

  return (
    <group position={[0, wHeight / 2, 0]}>
      <mesh position={[0, wHeight * 0.005, -(wDepth / 2) + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[wWidth, wHeight - 0.06, 0.02]} />
        <meshStandardMaterial color={wWoodTone} roughness={0.5} />
      </mesh>
      <mesh position={[-(wWidth / 2) + 0.015, wHeight * 0.005, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.03, wHeight - 0.06, wDepth - 0.02]} />
        <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.45} />
      </mesh>
      <mesh position={[(wWidth / 2) - 0.015, wHeight * 0.005, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.03, wHeight - 0.06, wDepth - 0.02]} />
        <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.45} />
      </mesh>
      <mesh position={[0, (wHeight / 2) - 0.015, 0]} castShadow>
        <boxGeometry args={[wWidth + 0.04, 0.04, wDepth + 0.03]} />
        <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.4} />
      </mesh>
      <mesh position={[0, -(wHeight / 2) + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[wWidth, 0.06, wDepth]} />
        <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.6} />
      </mesh>

      <mesh position={[0.15, wHeight * 0.005, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[0.02, wHeight - 0.10, wDepth - 0.04]} />
        <meshStandardMaterial color={wWoodTone} roughness={0.5} />
      </mesh>
      <mesh position={[-0.20, (wHeight / 2) - 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.73, 16]} />
        <meshStandardMaterial color={wMetalTone} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.20, (wHeight / 2) - 0.35, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[0.73, 0.02, wDepth - 0.04]} />
        <meshStandardMaterial color={wWoodTone} roughness={0.5} />
      </mesh>
      {[-0.50, -0.15, 0.15, 0.45].map((shY, sIdx) => (
        <mesh key={`wardrobe-shelf-${sIdx}`} position={[0.365, shY, 0.01]} castShadow receiveShadow>
          <boxGeometry args={[0.39, 0.02, wDepth - 0.04]} />
          <meshStandardMaterial color={wWoodTone} roughness={0.55} />
        </mesh>
      ))}

      <group ref={leftDoorRef} position={[-(wWidth / 2) + 0.03, 0, (wDepth / 2)]}>
        <mesh position={[0.19, wHeight * 0.005, -0.0075]} castShadow>
          <boxGeometry args={[0.38, wHeight - 0.08, 0.015]} />
          <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.35} />
        </mesh>
        <mesh position={[0.35, 0.05, 0.01]} castShadow>
          <boxGeometry args={[0.015, wHeight * 0.08, 0.015]} />
          <meshStandardMaterial color={wMetalTone} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      <group ref={centerDoorRef} position={[0.15, 0, (wDepth / 2)]}>
        <mesh position={[-0.19, wHeight * 0.005, -0.0075]} castShadow>
          <boxGeometry args={[0.38, wHeight - 0.08, 0.015]} />
          <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.35} />
        </mesh>
        <mesh position={[-0.35, 0.05, 0.01]} castShadow>
          <boxGeometry args={[0.015, wHeight * 0.08, 0.015]} />
          <meshStandardMaterial color={wMetalTone} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      <group ref={rightDoorRef} position={[(wWidth / 2) - 0.03, 0, (wDepth / 2)]}>
        <mesh position={[-0.19, wHeight * 0.005, -0.0075]} castShadow>
          <boxGeometry args={[0.38, wHeight - 0.08, 0.015]} />
          <CoffeeTableWoodMaterial baseColor={wWoodTone} roughness={0.35} />
        </mesh>
        <mesh position={[-0.35, 0.05, 0.01]} castShadow>
          <boxGeometry args={[0.015, wHeight * 0.08, 0.015]} />
          <meshStandardMaterial color={wMetalTone} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

// --- ANIMATED DINING TABLE CHAIR COMPONENT ---
function AnimatedChair({ posX, posZ, rotY, chairW, chairH, chairD, chairSeatH, chairBackH, chairColor, cushionTone }) {
  const [isOpen, setIsOpen] = useState(false)
  const chairGroupRef = useRef()

  useFrame(() => {
    if (!chairGroupRef.current) return
    const targetZ = isOpen ? (posZ > 0 ? posZ + 0.25 : posZ - 0.25) : posZ
    chairGroupRef.current.position.z += (targetZ - chairGroupRef.current.position.z) * 0.08
  })

  return (
    <group 
      ref={chairGroupRef} 
      position={[posX, 0, posZ]} 
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
      }}
    >
      <mesh position={[-(chairW / 2) + 0.015, chairSeatH / 2, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[(chairW / 2) - 0.015, chairSeatH / 2, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[-(chairW / 2) + 0.015, chairSeatH / 2, (chairD / 2) - 0.015]} castShadow><boxGeometry args={[0.02, chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[(chairW / 2) - 0.015, chairSeatH / 2, (chairD / 2) - 0.015]} castShadow><boxGeometry args={[0.02, chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[-(chairW / 2) + 0.015, chairSeatH + (chairBackH - chairSeatH) / 2, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, chairBackH - chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[(chairW / 2) - 0.015, chairSeatH + (chairBackH - chairSeatH) / 2, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, chairBackH - chairSeatH, 0.02]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[0, chairBackH - 0.04, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[chairW, 0.08, 0.018]} /><meshStandardMaterial color={chairColor} roughness={0.4} /></mesh>
      <mesh position={[0, chairSeatH + (chairBackH - chairSeatH) * 0.4, -(chairD / 2) + 0.015]} castShadow><boxGeometry args={[chairW - 0.03, 0.03, 0.015]} /><meshStandardMaterial color={chairColor} roughness={0.5} /></mesh>
      <mesh position={[0, chairSeatH, 0]} castShadow receiveShadow><boxGeometry args={[chairW, 0.03, chairD]} /><meshStandardMaterial color={cushionTone} roughness={0.75} /></mesh>
    </group>
  )
}

// --- ANIMATED NIGHTSTAND MODEL COMPONENT ---
function AnimatedNightstand({ isDrawerOpen }) {
  const drawerGroupRef = useRef()

  const nW = 0.47;  
  const nH = 0.51;  
  const nD = 0.40;  
  const nLegH = 0.17; 
  
  const finishWhite = "#fcfdfd"; 
  const buttonBlack = "#151515"; 
  const lampshadeBeige = "#f4ebd9"; 

  useFrame(() => {
    if (!drawerGroupRef.current) return
    const targetZ = isDrawerOpen ? 0.38 : 0
    drawerGroupRef.current.position.z += (targetZ - drawerGroupRef.current.position.z) * 0.05
  })

  return (
    <group position={[0, (nH + nLegH) / 2, 0]}>
      <mesh position={[-(nW / 2) + 0.01, nLegH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.02, nH, nD]} /><meshStandardMaterial color={finishWhite} roughness={0.4} /></mesh>
      <mesh position={[(nW / 2) - 0.01, nLegH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.02, nH, nD]} /><meshStandardMaterial color={finishWhite} roughness={0.4} /></mesh>
      <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.01, 0]} castShadow><boxGeometry args={[nW + 0.01, 0.02, nD + 0.01]} /><meshStandardMaterial color={finishWhite} roughness={0.35} /></mesh>
      <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.24, 0]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, 0.015, nD - 0.02]} /><meshStandardMaterial color={finishWhite} roughness={0.45} /></mesh>
      <mesh position={[0, -(nH / 2) + (nLegH / 2) + 0.01, 0]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, 0.02, nD - 0.02]} /><meshStandardMaterial color={finishWhite} roughness={0.4} /></mesh>
      <mesh position={[0, nLegH / 2, -(nD / 2) + 0.01]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, nH - 0.02, 0.01]} /><meshStandardMaterial color={finishWhite} roughness={0.5} /></mesh>

      <group ref={drawerGroupRef} position={[0, 0, 0]}>
        <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.12, 0]} castShadow>
          <boxGeometry args={[nW - 0.06, 0.18, nD - 0.04]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.6} />
        </mesh>
        <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.12, (nD / 2) - 0.01]} castShadow>
          <boxGeometry args={[nW - 0.04, 0.22, 0.02]} />
          <meshStandardMaterial color={finishWhite} roughness={0.3} />
        </mesh>
        <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.12, (nD / 2) + 0.005]} castShadow>
          <boxGeometry args={[0.09, 0.025, 0.015]} />
          <meshStandardMaterial color={buttonBlack} roughness={0.6} metalness={0.1} />
        </mesh>
      </group>

      {[
        [-(nW / 2) + 0.02, -(nD / 2) + 0.03],
        [ (nW / 2) - 0.02, -(nD / 2) + 0.03],
        [-(nW / 2) + 0.02,  (nD / 2) - 0.03],
        [ (nW / 2) - 0.02,  (nD / 2) - 0.03]
      ].map(([lx, lz], idx) => (
        <mesh key={`nightstand-leg-${idx}`} position={[lx, -(nH / 2) + (nLegH / 2) - (nLegH / 2), lz]} castShadow>
          <boxGeometry args={[0.035, nLegH, 0.035]} />
          <meshStandardMaterial color={finishWhite} roughness={0.45} />
        </mesh>
      ))}

      <group position={[0, (nH / 2) + (nLegH / 2), 0]}>
        <mesh position={[0, 0.04, 0]} castShadow><sphereGeometry args={[0.045, 24, 24]} /><meshStandardMaterial color="#cca471" roughness={0.2} metalness={0.1} /></mesh>
        <mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, 0.04, 8]} /><meshStandardMaterial color="#cca43b" metalness={0.7} roughness={0.2} /></mesh>
        <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.035, 0.075, 0.13, 24, 1, true]} /><meshStandardMaterial color={lampshadeBeige} roughness={0.85} side={2} /></mesh>
      </group>
    </group>
  )
}

// --- COMPLETE DETAILED 3D PROP GENERATOR ---
export function getPropSpecs(type, state = {}) {
  const bodyColor = "rgb(143, 111, 51)"      
  const cushionColor = "rgb(201, 173, 119)"  
  const tableTan = "#d2b48c"     
  const outlineWhite = "#ffffff"  

  switch (type) {
    case 'Sofa / Couch':
    case 'Stage couches or armchairs':
      return {
        dims: [1.83, 0.79, 1.52],
        model: (
          <group>
            <mesh position={[0, 0.20, -0.325]} castShadow receiveShadow><boxGeometry args={[1.83, 0.10, 0.87]} /><CouchFabricMaterial color={bodyColor} /></mesh>
            <mesh position={[-0.435, 0.20, 0.385]} castShadow receiveShadow><boxGeometry args={[0.85, 0.10, 0.55]} /><CouchFabricMaterial color={bodyColor} /></mesh>
            <group position={[0, 0.525, -0.71]}>
              <mesh castShadow><boxGeometry args={[1.83, 0.43, 0.1]} /><CouchFabricMaterial color={bodyColor} /></mesh>
              <mesh position={[0, 0.215, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 1.83, 16]} /><CouchFabricMaterial color={bodyColor} /></mesh>
            </group>
            <group position={[-0.885, 0.39, -0.325]}>
              <mesh castShadow><boxGeometry args={[0.06, 0.38, 0.87]} /><CouchFabricMaterial color={bodyColor} /></mesh>
              <mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.87, 16]} /><CouchFabricMaterial color={bodyColor} /></mesh>
            </group>
            <group position={[0.885, 0.39, -0.325]}>
              <mesh castShadow><boxGeometry args={[0.06, 0.38, 0.87]} /><CouchFabricMaterial color={bodyColor} /></mesh>
              <mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.87, 16]} /><CouchFabricMaterial color={bodyColor} /></mesh>
            </group>
            <group position={[0.41, 0.35, -0.275]}>
              <mesh castShadow><boxGeometry args={[0.82, 0.18, 0.73]} /><CouchFabricMaterial color={cushionColor} /></mesh>
              <mesh position={[0, 0, 0.365]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.82, 16]} /><CouchFabricMaterial color={cushionColor} /></mesh>
            </group>
            <group position={[-0.435, 0.35, 0.1]}>
              <mesh castShadow><boxGeometry args={[0.85, 0.18, 1.48]} /><CouchFabricMaterial color={cushionColor} /></mesh>
              <mesh position={[0, 0, 0.74]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.85, 16]} /><CouchFabricMaterial color={cushionColor} /></mesh>
            </group>
            <mesh position={[0, 0.52, -0.64]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 1.2, 24]} /><CouchFabricMaterial color={cushionColor} /></mesh>
            <mesh position={[-0.82, 0.44, -0.25]} rotation={[0, 0, 0.15]} castShadow><boxGeometry args={[0.05, 0.20, 0.50]} /><CouchFabricMaterial color={cushionColor} /></mesh>
            <mesh position={[0.82, 0.44, -0.25]} rotation={[0, 0, -0.15]} castShadow><boxGeometry args={[0.05, 0.20, 0.50]} /><CouchFabricMaterial color={cushionColor} /></mesh>
            <mesh position={[-0.84, 0.075, -0.7]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            <mesh position={[0.84, 0.075, -0.7]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            <mesh position={[-0.84, 0.075, 0.05]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            <mesh position={[0.84, 0.075, 0.05]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            <mesh position={[-0.84, 0.075, 0.75]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            <mesh position={[-0.03, 0.075, 0.75]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
          </group>
        )
      }

    case 'Coffee table':
      return {
        dims: [0.965, 0.47, 0.965],
        model: (
          <group>
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[0.965, 0.03, 0.965]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[0, 0.466, 0]}><boxGeometry args={[0.97, 0.002, 0.97]} /><meshStandardMaterial color={outlineWhite} roughness={0.2} /></mesh>
            <mesh position={[-0.445, 0.22, -0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[0.445, 0.22, -0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[-0.445, 0.22, 0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[0.445, 0.22, 0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[0, 0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.885, 0.03, 0.885]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
            <mesh position={[0, 0.096, 0]}><boxGeometry args={[0.89, 0.002, 0.89]} /><meshStandardMaterial color={outlineWhite} roughness={0.3} /></mesh>
            <group position={[0, 0.33, 0.415]}>
              <mesh castShadow><boxGeometry args={[0.81, 0.15, 0.03]} /><CoffeeTableWoodMaterial baseColor={tableTan} /></mesh>
              <mesh position={[0, 0, 0.016]}><boxGeometry args={[0.79, 0.13, 0.002]} /><meshStandardMaterial color={outlineWhite} roughness={0.2} wireframe={true} /></mesh>
              <mesh position={[0, -0.01, 0.02]}><boxGeometry args={[0.10, 0.04, 0.01]} /><meshStandardMaterial color="#2d2d2d" metalness={0.9} roughness={0.1} /></mesh>
            </group>
          </group>
        )
      }

    case 'Dining table and chairs':
      const diningL = 1.83; const diningW = 0.91; const diningH = 0.76; const apronThickness = 0.06; 
      const chairSeatH = 0.48; const chairW = 0.42; const chairD = 0.42; const chairBackH = 0.95; 
      const tableColor = "#d2b48c"; const chairColor = "#b59975"; const cushionTone = "#eae2d5"; 

      return {
        dims: [2.5, diningH, 1.6], 
        model: (
          <group>
            <mesh position={[0, diningH - 0.02, 0]} castShadow receiveShadow><boxGeometry args={[diningL, 0.04, diningW]} /><CoffeeTableWoodMaterial baseColor={tableColor} roughness={0.35} /></mesh>
            <group position={[0, diningH - 0.04 - (apronThickness / 2), 0]}>
              <mesh position={[0, 0, (diningW / 2) - 0.03]} castShadow><boxGeometry args={[diningL - 0.1, apronThickness, 0.02]} /><meshStandardMaterial color={tableColor} roughness={0.5} /></mesh>
              <mesh position={[0, 0, -(diningW / 2) + 0.03]} castShadow><boxGeometry args={[diningL - 0.1, apronThickness, 0.02]} /><meshStandardMaterial color={tableColor} roughness={0.5} /></mesh>
              <mesh position={[(diningL / 2) - 0.03, 0, 0]} castShadow><boxGeometry args={[0.02, apronThickness, diningW - 0.06]} /><meshStandardMaterial color={tableColor} roughness={0.5} /></mesh>
              <mesh position={[-(diningL / 2) + 0.03, 0, 0]} castShadow><boxGeometry args={[0.02, apronThickness, diningW - 0.06]} /><meshStandardMaterial color={tableColor} roughness={0.5} /></mesh>
            </group>
            {[
              [ (diningL / 2) - 0.05,  (diningW / 2) - 0.05],
              [ (diningL / 2) - 0.05, -(diningW / 2) + 0.05],
              [-(diningL / 2) + 0.05,  (diningW / 2) - 0.05],
              [-(diningL / 2) + 0.05, -(diningW / 2) + 0.05]
            ].map(([x, z], idx) => (
              <mesh key={`table-leg-${idx}`} position={[x, (diningH - 0.04) / 2, z]} castShadow><boxGeometry args={[0.07, diningH - 0.04, 0.07]} /><meshStandardMaterial color={tableColor} roughness={0.4} /></mesh>
            ))}
            <AnimatedChair posX={-0.55} posZ={(diningW / 2) + 0.18} rotY={Math.PI} chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
            <AnimatedChair posX={0.0}   posZ={(diningW / 2) + 0.18} rotY={Math.PI} chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
            <AnimatedChair posX={0.55}  posZ={(diningW / 2) + 0.18} rotY={Math.PI} chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
            <AnimatedChair posX={-0.55} posZ={-(diningW / 2) - 0.18} rotY={0}       chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
            <AnimatedChair posX={0.0}   posZ={-(diningW / 2) - 0.18} rotY={0}       chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
            <AnimatedChair posX={0.55}  posZ={-(diningW / 2) - 0.18} rotY={0}       chairW={chairW} chairH={chairBackH} chairD={chairD} chairSeatH={chairSeatH} chairBackH={chairBackH} chairColor={chairColor} cushionTone={cushionTone} />
          </group>
        )
      }

    case 'Bed frame and mattress':
      const bedWidth = 1.65; const bedLength = 2.15; const baseFrameH = 0.28; const headHeight = 1.12; 
      const naturalTimberColor = "#c6a072"; const mattressWhite = "#f5f5f0"; const pillowGrey = "#eaeaea";    

      return {
        dims: [bedWidth, headHeight, bedLength],
        model: (
          <group>
            <mesh position={[-(bedWidth / 2) + 0.04, baseFrameH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.08, baseFrameH, bedLength]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.5} /></mesh>
            <mesh position={[(bedWidth / 2) - 0.04, baseFrameH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.08, baseFrameH, bedLength]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.5} /></mesh>
            <mesh position={[0, baseFrameH / 2, (bedLength / 2) - 0.04]} castShadow receiveShadow><boxGeometry args={[bedWidth - 0.08, baseFrameH, 0.08]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.5} /></mesh>
            {[
              [-(bedWidth / 2) + 0.1, -(bedLength / 2) + 0.2], [-(bedWidth / 2) - 0.1, -(bedLength / 2) + 0.2],
              [-(bedWidth / 2) + 0.1, (bedLength / 2) - 0.4], [-(bedWidth / 2) - 0.1, (bedLength / 2) - 0.4]
            ].map(([bx, bz], bIdx) => (
              <mesh key={`bed-leg-${bIdx}`} position={[bx, 0.06, bz]} castShadow><boxGeometry args={[0.12, 0.12, 0.12]} /><meshStandardMaterial color="#3a2a1a" roughness={0.7} /></mesh>
            ))}
            <mesh position={[-(bedWidth / 2) + 0.04, headHeight / 2, -(bedLength / 2) + 0.04]} castShadow><boxGeometry args={[0.08, headHeight, 0.08]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.4} /></mesh>
            <mesh position={[(bedWidth / 2) - 0.04, headHeight / 2, -(bedLength / 2) + 0.04]} castShadow><boxGeometry args={[0.08, headHeight, 0.08]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.4} /></mesh>
            <mesh position={[0, headHeight - 0.03, -(bedLength / 2) + 0.04]} castShadow><boxGeometry args={[bedWidth, 0.06, 0.10]} /><CoffeeTableWoodMaterial baseColor={naturalTimberColor} roughness={0.35} /></mesh>
            <mesh position={[0, baseFrameH + 0.04, -(bedLength / 2) + 0.04]} castShadow><boxGeometry args={[bedWidth - 0.08, 0.06, 0.05]} /><meshStandardMaterial color={naturalTimberColor} roughness={0.5} /></mesh>
            {[-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((sX, sIdx) => (
              <mesh key={`headboard-slat-${sIdx}`} position={[sX, (headHeight + baseFrameH) / 2 + 0.04, -(bedLength / 2) + 0.04]} castShadow><boxGeometry args={[0.04, headHeight - baseFrameH - 0.12, 0.02]} /><meshStandardMaterial color={naturalTimberColor} roughness={0.45} /></mesh>
            ))}
            <group position={[0, baseFrameH + 0.14, 0.04]}>
              <mesh castShadow receiveShadow><boxGeometry args={[bedWidth - 0.14, 0.26, bedLength - 0.16]} /><CouchFabricMaterial color={mattressWhite} roughness={0.9} /></mesh>
              <mesh position={[0, 0.12, 0]}><boxGeometry args={[bedWidth - 0.18, 0.03, bedLength - 0.20]} /><CouchFabricMaterial color={mattressWhite} roughness={0.85} /></mesh>
              <mesh position={[0, -0.01, (bedLength - 0.16) / 2 - 0.02]} rotation={[0.45, 0, 0]}><boxGeometry args={[bedWidth - 0.16, 0.24, 0.06]} /><CouchFabricMaterial color={mattressWhite} roughness={0.9} /></mesh>
              <mesh position={[0, -0.01, -(bedLength - 0.16) / 2 + 0.02]} rotation={[-0.45, 0, 0]}><boxGeometry args={[bedWidth - 0.16, 0.24, 0.06]} /><CouchFabricMaterial color={mattressWhite} roughness={0.9} /></mesh>
              <mesh position={[-(bedWidth - 0.14) / 2 + 0.02, -0.01, 0]} rotation={[0, 0, 0.45]}><boxGeometry args={[0.06, 0.24, bedLength - 0.18]} /><CouchFabricMaterial color={mattressWhite} roughness={0.9} /></mesh>
              <mesh position={[(bedWidth - 0.14) / 2 - 0.02, -0.01, 0]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.06, 0.24, bedLength - 0.18]} /><CouchFabricMaterial color={mattressWhite} roughness={0.9} /></mesh>
            </group>
            {(() => {
              const renderPillow = (pX) => (
                <group position={[pX, baseFrameH + 0.32, -(bedLength / 2) + 0.32]} rotation={[0.18, 0, 0]}>
                  <mesh castShadow><boxGeometry args={[0.56, 0.015, 0.42]} /><CouchFabricMaterial color={pillowGrey} roughness={0.85} /></mesh>
                  <mesh castShadow position={[0, 0, 0]} scale={[1, 0.32, 1]}><cylinderGeometry args={[0.16, 0.16, 0.50, 24, 1, false, 0, Math.PI * 2]} rotation={[0, 0, Math.PI / 2]} /><CouchFabricMaterial color={pillowGrey} roughness={0.7} /></mesh>
                  <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.48, 0.07, 0.34]} /><CouchFabricMaterial color={pillowGrey} roughness={0.8} /></mesh>
                </group>
              );
              return <group>{renderPillow(-0.35)}{renderPillow(0.35)}</group>;
            })()}
          </group>
        )
      }

    case 'Wardrobe / Dresser':
      return {
        dims: [1.20, 1.82, 0.55],
        model: <AnimatedWardrobe isOpen={state.wardrobeIsOpen} />
      }

    case 'Bookshelf':
      const bW = 0.77; const bH = 1.07; const bD = 0.30; const bTone = "#6d4c41"; const wallT = 0.02; 
      const Book = ({ width = 0.03, height = 0.16, depth = 0.18, color = "#a63a3a", lean = 0 }) => (
        <mesh castShadow receiveShadow rotation={[0, 0, lean]}><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
      );
      return {
        dims: [bW, bH + 0.15, bD], 
        model: (
          <group position={[0, (bH + 0.15) / 2, 0]}>
            <mesh position={[-(bW / 2) + wallT / 2, 0.075, 0]} castShadow receiveShadow><boxGeometry args={[wallT, bH, bD]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[(bW / 2) - wallT / 2, 0.075, 0]} castShadow receiveShadow><boxGeometry args={[wallT, bH, bD]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[0, (bH / 2) + 0.075 - wallT / 2, 0]} castShadow><boxGeometry args={[bW, wallT, bD]} /><CoffeeTableWoodMaterial baseColor={bTone} roughness={0.4} /></mesh>
            <mesh position={[0, -(bH / 2) + 0.075 + wallT / 2, 0]} castShadow receiveShadow><boxGeometry args={[bW - wallT * 2, wallT, bD]} /><meshStandardMaterial color={bTone} roughness={0.55} /></mesh>
            <mesh position={[-0.09, bH * 0.18, 0]} castShadow receiveShadow><boxGeometry args={[bW - wallT * 2 - 0.18, wallT, bD - 0.01]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[0, bH * 0.05, 0]} castShadow receiveShadow><boxGeometry args={[bW - wallT * 2, wallT, bD - 0.01]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[-0.10, -bH * 0.18, 0]} castShadow receiveShadow><boxGeometry args={[bW * 0.65, wallT, bD - 0.01]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[0.10, bH * 0.32, 0]} castShadow><boxGeometry args={[wallT, bH * 0.28, bD - 0.02]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[-0.16, bH * 0.115, 0]} castShadow><boxGeometry args={[wallT, bH * 0.12, bD - 0.02]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[-(bW / 2) + bW * 0.24, -bH * 0.22, 0]} castShadow><boxGeometry args={[wallT, bH * 0.50, bD - 0.02]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <mesh position={[0.10, -bH * 0.07, 0]} castShadow><boxGeometry args={[wallT, bH * 0.24, bD - 0.02]} /><meshStandardMaterial color={bTone} roughness={0.5} /></mesh>
            <group position={[-0.30, bH * 0.27, 0]}>
              <group position={[0.00, 0, 0]}><Book color="#2c3e50" height={0.17} /></group>
              <group position={[0.035, 0, 0]}><Book color="#c0392b" height={0.15} /></group>
              <group position={[0.07, 0, 0]}><Book color="#d35400" height={0.16} /></group>
              <group position={[0.105, 0, 0]}><Book color="#7f8c8d" height={0.14} /></group>
              <group position={[0.145, 0, 0]} rotation={[0, 0, -0.22]}><Book color="#16a085" height={0.16} /></group>
            </group>
            <group position={[0.22, bH * 0.15, 0]}>
              <mesh castShadow position={[0, -0.08, 0]}><cylinderGeometry args={[0.045, 0.05, 0.01, 16]} /><meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} /></mesh>
              <mesh castShadow position={[0, -0.05, 0]}><cylinderGeometry args={[0.006, 0.006, 0.05, 8]} /><meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} /></mesh>
              <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.052, 0.005, 8, 24, Math.PI]} /><meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} /></mesh>
              <mesh castShadow rotation={[0.4, 0.5, 0]}><sphereGeometry args={[0.046, 12, 12]} /><meshStandardMaterial color="#2e7d32" roughness={0.6} flatShading={true} /></mesh>
            </group>
            <group position={[-0.10, bH * 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <group position={[0.00, 0, 0]}><Book color="#7b1fa2" height={0.15} /></group>
              <group position={[0.02, 0, 0]}><Book color="#303f9f" height={0.15} /></group>
            </group>
            {[[-0.325, -(bD / 2) + 0.05],[ 0.325, -(bD / 2) + 0.05],[-0.325,  (bD / 2) - 0.05],[ 0.325,  (bD / 2) - 0.05]].map(([lx, lz], lIdx) => (
              <mesh key={`shelf-leg-${lIdx}`} position={[lx, -(bH / 2), lz]} rotation={[0.08, 0, lx > 0 ? -0.05 : 0.05]} castShadow><cylinderGeometry args={[0.02, 0.012, 0.15, 16]} /><meshStandardMaterial color="#3e2723" roughness={0.6} /></mesh>
            ))}
          </group>
        )
      }

    case 'Nightstand':
      return {
        dims: [0.47, 0.68, 0.40],
        model: <AnimatedNightstand isDrawerOpen={state.nightstandDrawerIsOpen} />
      }

    case 'Musician chairs':
      const mC_width = 0.51;
      const mC_depth = 0.58;
      const mC_frameH = 0.47;
      const mC_totalH = 0.88;
      return {
        dims: [mC_width, mC_totalH, mC_depth],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[-(mC_width / 2) + 0.015, mC_frameH / 2, (mC_depth / 2) - 0.02]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, mC_frameH, 16]} />
              <meshStandardMaterial color="#1f1f2e" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[(mC_width / 2) - 0.015, mC_frameH / 2, (mC_depth / 2) - 0.02]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, mC_frameH, 16]} />
              <meshStandardMaterial color="#1f1f2e" metalness={0.7} roughness={0.3} />
            </mesh>
            <group position={[0, 0, -(mC_depth / 2) + 0.02]}>
              <mesh position={[-(mC_width / 2) + 0.015, mC_totalH / 2, 0]} rotation={[-0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, mC_totalH, 16]} />
                <meshStandardMaterial color="#1f1f2e" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[(mC_width / 2) - 0.015, mC_totalH / 2, 0]} rotation={[-0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, mC_totalH, 16]} />
                <meshStandardMaterial color="#1f1f2e" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
            <mesh position={[0, mC_frameH, 0]} castShadow receiveShadow>
              <boxGeometry args={[mC_width - 0.02, 0.035, mC_depth - 0.04]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            <mesh position={[0, mC_totalH - 0.14, -(mC_depth / 2) + 0.05]} rotation={[-0.08, 0, 0]} castShadow>
              <boxGeometry args={[mC_width - 0.04, 0.24, 0.025]} />
              <meshStandardMaterial color="#181818" roughness={0.7} />
            </mesh>
          </group>
        )
      }

    case 'Conductor’s podium':
      return {
        dims: [1.0, 1.2, 1.0],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.0, 0.2, 1.0]} />
              <meshStandardMaterial color="#333333" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.201, 0]} receiveShadow>
              <boxGeometry args={[0.96, 0.005, 0.96]} />
              <meshStandardMaterial color="#7f8c8d" roughness={0.9} />
            </mesh>
            {[[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].map(([px, pz], idx) => (
              <mesh key={`podium-foot-${idx}`} position={[px, 0.025, pz]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
                <meshStandardMaterial color="#111" roughness={0.5} />
              </mesh>
            ))}
            <group position={[0, 0.2, -0.47]}>
              <mesh position={[-0.36, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.0175, 0.0175, 1.0, 16]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0.36, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.0175, 0.0175, 1.0, 16]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.0175, 0.0175, 0.72, 16]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.72, 16]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.4} />
              </mesh>
            </group>
          </group>
        )
      }

    case 'Music stands':
      const mS_height = 0.95; 
      return {
        dims: [0.51, 1.25, 0.45],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.01, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 0.02, 6]} />
              <meshStandardMaterial color="#151515" roughness={0.5} />
            </mesh>
            {[0, Math.PI * 0.66, Math.PI * 1.33].map((ang, bIdx) => (
              <mesh key={`stand-prong-${bIdx}`} position={[Math.sin(ang) * 0.18, 0.01, Math.cos(ang) * 0.18]} rotation={[0, ang, 0]} castShadow>
                <boxGeometry args={[0.02, 0.015, 0.32]} />
                <meshStandardMaterial color="#151515" roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, mS_height / 2, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.014, mS_height, 16]} />
              <meshStandardMaterial color="#1c1c1c" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, mS_height + 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.3, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
            </mesh>
            <group position={[0, mS_height + 0.24, 0.02]} rotation={[-0.3, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.51, 0.30, 0.01]} />
                <meshStandardMaterial color="#202020" roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.15, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <boxGeometry args={[0.51, 0.06, 0.01]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
              </mesh>
            </group>
          </group>
        )
      }

    // =================================================================
    // REMODELED MODULAR SAXOPHONE BASED ON CAD ENGINEERING PRINCIPLES
    // =================================================================
    case 'Musical instruments':
      const brassMaterial = <meshStandardMaterial color="rgb(222, 185, 65)" metalness={0.95} roughness={0.15} />;
      const silverMaterial = <meshStandardMaterial color="rgb(220, 220, 225)" metalness={0.9} roughness={0.1} />;
      const padMaterial = <meshStandardMaterial color="#efdfbb" roughness={0.6} />;

      return {
        dims: [0.45, 0.85, 0.45],
        model: (
          <group position={[0, 0, 0]}>
            {/* Walnut Floor Stand Display base */}
            <group position={[0, 0, 0]}>
              <mesh position={[0, 0.02, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.20, 0.04, 6]} />
                <CoffeeTableWoodMaterial baseColor="#5d4037" roughness={0.3} />
              </mesh>
              <mesh position={[-0.08, 0.28, 0]} rotation={[0, 0, -0.18]} castShadow>
                <boxGeometry args={[0.04, 0.52, 0.08]} />
                <CoffeeTableWoodMaterial baseColor="#5d4037" roughness={0.3} />
              </mesh>
              <mesh position={[0.04, 0.24, 0]} rotation={[0, 0, 0.4]} castShadow>
                <torusGeometry args={[0.065, 0.012, 12, 24, Math.PI]} />
                <meshStandardMaterial color="#111" roughness={0.9} />
              </mesh>
              <mesh position={[-0.13, 0.55, 0]} rotation={[0, 0, 0.2]} castShadow>
                <torusGeometry args={[0.035, 0.01, 12, 24, Math.PI]} />
                <meshStandardMaterial color="#111" roughness={0.9} />
              </mesh>
            </group>

            {/* HIGH FIDELITY MULTI-OBJECT CAD INSTRUMENT ENGINE */}
            <group position={[0.03, 0.14, 0]} rotation={[0, 0, 0.2]}>
              
              {/* SECTION 1: MAIN BODY TUBE (Conical stack split into matching precision increments) */}
              <group name="Main_Body_Tube">
                <mesh position={[0, 0.12, 0]} castShadow>
                  <cylinderGeometry args={[0.034, 0.038, 0.12, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0, 0.24, 0]} castShadow>
                  <cylinderGeometry args={[0.029, 0.034, 0.12, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0, 0.36, 0]} castShadow>
                  <cylinderGeometry args={[0.024, 0.029, 0.12, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0, 0.48, 0]} castShadow>
                  <cylinderGeometry args={[0.018, 0.024, 0.12, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
              </group>

              {/* SECTION 2: THE BOW (Segmented sweep curves mimicking detailed polygonal topology) */}
              <group name="Lower_Bow_Braid" position={[0.024, -0.01, 0]}>
                <mesh position={[0, 0, 0]} rotation={[0, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.038, 0.0385, 0.02, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0.012, -0.018, 0]} rotation={[0, 0, -0.3]} castShadow>
                  <cylinderGeometry args={[0.0382, 0.0385, 0.025, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0.034, -0.032, 0]} rotation={[0, 0, -0.6]} castShadow>
                  <cylinderGeometry args={[0.0385, 0.039, 0.025, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0.062, -0.038, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.039, 0.039, 0.03, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0.09, -0.032, 0]} rotation={[0, 0, -2.5]} castShadow>
                  <cylinderGeometry args={[0.039, 0.041, 0.025, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
              </group>

              {/* SECTION 3: THE BELL (Progressive outward flare stack & safety rim loop lip) */}
              <group name="Flared_Acoustic_Bell" position={[0.115, -0.01, 0]} rotation={[0, 0, -0.55]}>
                <mesh position={[0, 0.05, 0]} castShadow>
                  <cylinderGeometry args={[0.046, 0.041, 0.08, 24, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0, 0.13, 0]} castShadow>
                  <cylinderGeometry args={[0.056, 0.046, 0.08, 24, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[0, 0.21, 0]} castShadow>
                  <cylinderGeometry args={[0.072, 0.056, 0.08, 24, 1, true]} />
                  {brassMaterial}
                </mesh>
                {/* Structural Torus Ring representing solid brass lip extrusion edge */}
                <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.071, 0.004, 12, 32]} />
                  {brassMaterial}
                </mesh>
              </group>

              {/* SECTION 4: THE NECK (Upper curve taper + natural tree cork lining + mouthpiece) */}
              <group name="Detachable_Neck_Assembly" position={[0, 0.54, 0]} rotation={[0, 0, -0.45]}>
                <mesh position={[0, 0.03, 0]} castShadow>
                  <cylinderGeometry args={[0.015, 0.018, 0.06, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[-0.01, 0.08, 0]} rotation={[0, 0, 0.3]} castShadow>
                  <cylinderGeometry args={[0.012, 0.015, 0.05, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                <mesh position={[-0.035, 0.12, 0]} rotation={[0, 0, 0.75]} castShadow>
                  <cylinderGeometry args={[0.01, 0.012, 0.05, 16, 1, true]} />
                  {brassMaterial}
                </mesh>
                {/* Genuine wood-cork protective sleeve ring segment */}
                <mesh position={[-0.062, 0.142, 0]} rotation={[0, 0, 1.1]} castShadow>
                  <cylinderGeometry args={[0.009, 0.01, 0.025, 16]} />
                  <meshStandardMaterial color="#c29d70" roughness={0.8} />
                </mesh>
                {/* Ebonite polymer molded mouthpiece tip box hull node */}
                <group position={[-0.088, 0.156, 0]} rotation={[0, 0, 1.1]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.016, 0.035, 0.015]} />
                    <meshStandardMaterial color="#0b0b0b" roughness={0.4} />
                  </mesh>
                  {/* Small gold metallic binding ligature bracket strip component */}
                  <mesh position={[0, -0.005, 0]}>
                    <cylinderGeometry args={[0.0095, 0.0095, 0.01, 16, 1, true]} />
                    <meshStandardMaterial color="rgb(212, 175, 55)" metalness={0.8} roughness={0.2} />
                  </mesh>
                </group>
              </group>

              {/* SECTION 5: MECHANICS (Full mechanical long-rod spine linkage network & key touch buttons) */}
              <group name="Keywork_Linkage_Matrix">
                {/* Linear pillar rod spine guide channels */}
                <mesh position={[-0.024, 0.3, 0.01]} castShadow>
                  <cylinderGeometry args={[0.003, 0.003, 0.44, 8]} />
                  {silverMaterial}
                </mesh>
                <mesh position={[0.01, 0.28, -0.024]} castShadow>
                  <cylinderGeometry args={[0.003, 0.003, 0.38, 8]} />
                  {silverMaterial}
                </mesh>

                {/* Left hand/Right hand tone-hole pad cup clusters */}
                {[
                  {y: 0.18, r: 0.016, theta: 0.4}, {y: 0.22, r: 0.016, theta: 0.35}, 
                  {y: 0.26, r: 0.015, theta: 0.3}, {y: 0.34, r: 0.013, theta: 0.2},
                  {y: 0.38, r: 0.013, theta: 0.15}, {y: 0.42, r: 0.012, theta: 0.1}
                ].map((keyItem, idx) => (
                  <group key={`tonehole-pad-${idx}`} position={[Math.sin(keyItem.theta) * 0.03, keyItem.y, Math.cos(keyItem.theta) * 0.03]} rotation={[0, keyItem.theta, 0]}>
                    {/* Metal backing cup plate */}
                    <mesh castShadow>
                      <cylinderGeometry args={[keyItem.r, keyItem.r, 0.006, 12]} />
                      {brassMaterial}
                    </mesh>
                    {/* Interior leather pad washer strip */}
                    <mesh position={[0, -0.004, 0]}>
                      <cylinderGeometry args={[keyItem.r - 0.002, keyItem.r - 0.002, 0.003, 12]} />
                      {padMaterial}
                    </mesh>
                    {/* Concentric central pearl inlay finger button accent surface */}
                    <mesh position={[0, 0.004, 0]}>
                      <cylinderGeometry args={[keyItem.r * 0.65, keyItem.r * 0.65, 0.002, 12]} />
                      <meshStandardMaterial color="#fcfaf2" roughness={0.3} />
                    </mesh>
                  </group>
                ))}

                {/* Spatial bow guard protector arm bracket shield */}
                <mesh position={[0.08, 0.04, 0.03]} rotation={[0, 0, -0.4]} castShadow>
                  <boxGeometry args={[0.005, 0.14, 0.018]} />
                  {brassMaterial}
                </mesh>
              </group>

            </group>
          </group>
        )
      }

    default:
      return {
        dims: [0.8, 0.8, 0.8],
        model: (
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#7f8c8d" roughness={0.6} /></mesh>
        )
      }
  }
}

// --- ACTIVE RE-SELECTABLE CONTROLLER COMPONENT WITH BOUNDS AND TELEMETRY ---
function StageProp({ id, type, position, isSelected, onSelect, onUpdatePosition, bounds }) {
  const transformRef = useRef()
  const groupRef = useRef()

  const [wardrobeIsOpen, setWardrobeIsOpen] = useState(false)
  const [nightstandDrawerIsOpen, setNightstandDrawerIsOpen] = useState(false)

  const { dims } = getPropSpecs(type, { wardrobeIsOpen, nightstandDrawerIsOpen })
  const halfW = dims[0] / 2
  const halfL = dims[2] / 2

  useEffect(() => {
    const transformControls = transformRef.current
    if (transformControls) {
      const handleObjectChange = () => {
        if (groupRef.current) {
          let currentX = groupRef.current.position.x
          let currentZ = groupRef.current.position.z
          
          const limitX = (bounds.width / 2) - halfW
          const limitZ = (bounds.length / 2) - halfL

          if (currentX > limitX) currentX = limitX
          if (currentX < -limitX) currentX = -limitX
          if (currentZ > limitZ) currentZ = limitZ
          if (currentZ < -limitZ) currentZ = -limitZ

          groupRef.current.position.set(currentX, 0, currentZ)
          onUpdatePosition(id, [currentX, 0, currentZ])
        }
      }
      transformControls.addEventListener('objectChange', handleObjectChange)
      return () => transformControls.removeEventListener('objectChange', handleObjectChange)
    }
  }, [isSelected, id, onUpdatePosition, bounds, halfW, halfL])

  return (
    <>
      <group 
        ref={groupRef} 
        position={position}
        onClick={(e) => {
          e.stopPropagation() 
          onSelect()
          if (type === 'Wardrobe / Dresser') {
            setWardrobeIsOpen(!wardrobeIsOpen)
          }
          if (type === 'Nightstand') {
            setNightstandDrawerIsOpen(!nightstandDrawerIsOpen)
          }
        }}
      >
        {getPropSpecs(type, { wardrobeIsOpen, nightstandDrawerIsOpen }).model}

        {isSelected && (
          <Html distanceFactor={7} position={[0, dims[1] + 0.3, 0]} center pointerEvents="none">
            <div style={{
              background: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid #5c6bc0',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#fff',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px'
            }}>
              <div style={{ color: '#8c9eff', fontWeight: 'bold' }}>📡 LIVE AXIS READOUT</div>
              <div>X (Center Offset): <span style={{ color: '#00e676' }}>{position[0].toFixed(2)}m</span></div>
              <div>Z (Center Offset): <span style={{ color: '#00e676' }}>{position[2].toFixed(2)}m</span></div>
              {type === 'Wardrobe / Dresser' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to open/close doors</div>}
              {type === 'Nightstand' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to slide drawer smoothly</div>}
              {type === 'Dining table and chairs' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click individual chairs to pull out</div>}
              <div style={{ borderTop: '1px solid #333', marginTop: '3px', paddingTop: '3px', fontSize: '9px', color: '#999' }}>Scale: {dims[0]}m × {dims[1]}m × {dims[2]}m</div>
            </div>
          </Html>
        )}
      </group>
      
      {isSelected && (
        <TransformControls 
          ref={transformRef}
          object={groupRef} 
          mode="translate" 
          showY={false} 
          size={0.8}
        />
      )}
    </>
  )
}

// --- STAGE PRODUCTION WORKBENCH CORE ENGINE ---
export default function App() {
  const [stageWidth, setStageWidth] = useState(15)
  const [stageHeight, setStageHeight] = useState(6)
  const [stageLength, setStageLength] = useState(10)
  
  const [propsList, setPropsList] = useState([])
  const [selectedPropId, setSelectedPropId] = useState(null)

  const propCategories = {
    "Living Room & Bedroom": ["Sofa / Couch", "Coffee table", "Dining table and chairs", "Bed frame and mattress", "Wardrobe / Dresser", "Bookshelf", "Nightstand"],
    "Orchestra & Concert": ["Musician chairs", "Conductor’s podium", "Music stands", "Musical instruments"]
  }

  const addProp = (type) => {
    const specs = getPropSpecs(type)
    const halfW = specs.dims[0] / 2
    const halfL = specs.dims[2] / 2

    const maxSafeX = (stageWidth / 2) - halfW
    const maxSafeZ = (stageLength / 2) - halfL

    const targetX = (Math.random() - 0.5) * (maxSafeX * 1.2)
    const targetZ = (Math.random() - 0.5) * (maxSafeZ * 1.2)

    const newProp = {
      id: Date.now(),
      type: type,
      position: [
        Math.max(-maxSafeX, Math.min(maxSafeX, targetX)),
        0,
        Math.max(-maxSafeZ, Math.min(maxSafeZ, targetZ))
      ]
    }
    setPropsList([...propsList, newProp])
    setSelectedPropId(newProp.id)
  }

  const updatePropPosition = (id, newPos) => {
    setPropsList(prev => prev.map(p => p.id === id ? { ...p, position: newPos } : p))
  }

  const selectedPropData = propsList.find(p => p.id === selectedPropId)
  const selectedSpecs = selectedPropData ? getPropSpecs(selectedPropData.type) : null 

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#121212', fontFamily: 'system-ui, sans-serif', color: '#e0e0e0', overflow: 'hidden' }}>
      
      {/* SIDEBAR PROPERTIES PANEL */}
      <div style={{ width: '360px', padding: '24px', background: '#1e1e1e', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '4px 0 15px rgba(0,0,0,0.5)', zIndex: 10, overflowY: 'auto' }}>
        <h2 style={{ margin: '0', fontSize: '22px', fontWeight: '700', color: '#fff' }}>🎭 Stage Studio Pro</h2>
        <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>Engineered deck layout workbench with bound constraints.</p>
        
        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '5px 0' }} />

        {/* Dynamic Scale Parameter Settings */}
        <div>
          <h3 style={{ fontSize: '14px', color: '#bbb', marginBottom: '12px' }}>Stage Scale (Meters)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Width (X-Axis Boundary)</span><strong>{stageWidth}m</strong></div>
              <input type="range" min="6" max="30" value={stageWidth} onChange={(e) => setStageWidth(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Height (Y-Axis Clearance)</span><strong>{stageHeight}m</strong></div>
              <input type="range" min="3" max="15" value={stageHeight} onChange={(e) => setStageHeight(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}><span>Length / Depth (Z-Axis Boundary)</span><strong>{stageLength}m</strong></div>
              <input type="range" min="6" max="25" value={stageLength} onChange={(e) => setStageLength(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {selectedPropData && selectedSpecs && (
          <div style={{ padding: '16px', background: '#2c3e50', borderRadius: '8px', border: '1px solid #34495e', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', textTransform: 'uppercase' }}>📏 Blueprint Dimensions</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#ecf0f1', fontFamily: 'monospace' }}>
              <div><strong>Class:</strong> {selectedPropData.type}</div>
              <div><strong>Dim X (W):</strong> {selectedSpecs.dims[0]} m</div>
              <div><strong>Dim Y (H):</strong> {selectedSpecs.dims[1]} m</div>
              <div><strong>Dim Z (L):</strong> {selectedSpecs.dims[2]} m</div>
              <div style={{ color: '#ffeb3b', fontSize: '11px', fontFamily: 'sans-serif', marginTop: '4px', lineHeight: '1.4' }}>🔒 Enclosure Safety On: Object boundary calculations prevent clipping past side boundaries.</div>
            </div>
            <button onClick={() => setPropsList(propsList.filter(p => p.id !== selectedPropId))} style={{ ...propBtnStyle, background: '#c0392b', color: '#fff', marginTop: '6px', textAlign: 'center' }}>Delete Selected Object</button>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '5px 0' }} />

        {/* Catalog Library Inventory Selection */}
        <div style={{ flexGrow: 1 }}>
          <h3 style={{ fontSize: '14px', color: '#bbb', marginBottom: '10px' }}>Prop Production Library</h3>
          {Object.entries(propCategories).map(([categoryName, items]) => (
            <div key={categoryName} style={{ marginBottom: '14px' }}>
              <h4 style={{ fontSize: '12px', color: '#555', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{categoryName}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map(item => (
                  <button key={item} onClick={() => addProp(item)} style={propBtnStyle}>
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THREEJS VIEWPORT VIEW */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas camera={{ position: [0, stageHeight * 1.6, stageLength * 1.5], fov: 42 }} shadows>
          <ambientLight intensity={0.4} />
          
          <directionalLight 
            position={[0, stageHeight, stageLength]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize={[2048, 2048]} 
          />
          <directionalLight position={[10, 5, -5]} intensity={0.2} />

          {/* Stage Backdrops */}
          <mesh position={[0, stageHeight / 2, -stageLength / 2]}>
            <planeGeometry args={[stageWidth, stageHeight]} />
            <meshStandardMaterial color="#222" roughness={0.9} />
          </mesh>
          <mesh position={[-stageWidth / 2, stageHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[stageLength, stageHeight]} />
            <meshStandardMaterial color="#1e1e1e" roughness={0.9} />
          </mesh>
          <mesh position={[stageWidth / 2, stageHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[stageLength, stageHeight]} />
            <meshStandardMaterial color="#1e1e1e" roughness={0.9} />
          </mesh>

          {/* DECK LEVEL SURFACE */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.005, 0]}
            onClick={() => setSelectedPropId(null)} 
            receiveShadow
          >
            <planeGeometry args={[stageWidth, stageLength]} />
            <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
          </mesh>

          <Grid 
            args={[stageWidth, stageLength]} 
            sectionColor="#7f8c8d"   
            cellColor="#3a3a3a"      
            sectionSize={1}          
            cellSize={0.5}           
            position={[0, 0, 0]} 
            infiniteGrid={false} // im maguire, i like to eat a lot, and i like to code a lot, so i made this. hope you enjoy it! :)
          />

          {propsList.map((prop) => (
            <StageProp
              key={prop.id}
              id={prop.id}
              type={prop.type}
              position={prop.position}
              isSelected={selectedPropId === prop.id}
              onSelect={() => setSelectedPropId(prop.id)}
              onUpdatePosition={updatePropPosition}
              bounds={{ width: stageWidth, length: stageLength }}
            />
          ))}

          <OrbitControls makeDefault minDistance={3} maxDistance={45} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
        
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'rgba(20,20,20,0.85)', padding: '12px 18px', borderRadius: '30px', fontSize: '12px', color: '#bbb', pointerEvents: 'none', border: '1px solid #333' }}>
          💡 <strong>Left-Click + Drag</strong> backdrops to rotate camera | <strong>Click object</strong> to activate movement handles or animation behaviors.
        </div>
      </div>

    </div>
  )
}
// Im harry, I like to eat a lot, and I like to code a lot, so I made this. Hope you enjoy it! :)
const propBtnStyle = {
  width: '100%',
  padding: '8px 12px',
  background: '#2c2c2c',
  color: '#ccc',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  textAlign: 'left',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
}
// Im maguire, I like to eat a lot, and I like to code a lot, so I made this. Hope you enjoy it! :)