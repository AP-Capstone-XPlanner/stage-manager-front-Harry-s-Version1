import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, TransformControls, Grid, Html } from '@react-three/drei'

// --- SHADERS ---
function CouchFabricMaterial({ color, roughness = 0.85 }) {
  const compileShader = useCallback((shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>\n float weaveU = step(0.5, fract(vViewPosition.x * 280.0)); float weaveV = step(0.5, fract(vViewPosition.y * 280.0)); float edgeNoise = (weaveU == weaveV ? 1.0 : 0.0) * 0.15; normal = normalize(normal + vec3(edgeNoise * 0.1, edgeNoise * 0.1, 0.0));`
    );
  }, []);
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} bumpScale={0.012} onBeforeCompile={compileShader} customProgramCacheKey={() => 'couch_fabric'} />
}

function CoffeeTableWoodMaterial({ baseColor, roughness = 0.45 }) {
  const compileShader = useCallback((shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n float grainLines = sin((vViewPosition.x + vViewPosition.z * 0.3) * 95.0) * 0.5 + 0.5; grainLines += cos(vViewPosition.y * 140.0) * 0.15; grainLines = clamp(grainLines, 0.0, 1.0); vec3 darkStreakColor = diffuseColor.rgb * 0.72; diffuseColor.rgb = mix(diffuseColor.rgb, darkStreakColor, grainLines * 0.28);`
    );
  }, []);
  return <meshStandardMaterial color={baseColor} roughness={roughness} metalness={0.05} onBeforeCompile={compileShader} customProgramCacheKey={() => 'wood_grain'} />
}

// --- CURTAIN & WINDOW ANIMATIONS ---
function AnimatedCurtain({ isOpen, bounds, duration = 3 }) {
  const leftRef = useRef(); const rightRef = useRef(); const valanceRef = useRef(); const { width, height } = bounds;
  const uniforms = useRef({ uTime: { value: 0 }, uProgress: { value: 0 }, uHeight: { value: bounds.height }, uWidth: { value: bounds.width } })

  useEffect(() => { uniforms.current.uHeight.value = bounds.height; uniforms.current.uWidth.value = bounds.width; }, [bounds.height, bounds.width])

  useFrame((state, delta) => {
    uniforms.current.uTime.value = state.clock.elapsedTime
    const speed = 1.0 / duration
    uniforms.current.uProgress.value = isOpen ? Math.min(1.0, uniforms.current.uProgress.value + speed * delta) : Math.max(0.0, uniforms.current.uProgress.value - speed * delta)
    const p = uniforms.current.uProgress.value; const easedP = p * p * (3.0 - 2.0 * p) 
    const targetScaleX = 1.0 - (0.85 * easedP); const targetPosX = (width / 4) + ((width / 4) - ((width / 2 * 0.15) / 2)) * easedP

    if (leftRef.current && rightRef.current) {
      leftRef.current.position.x = -targetPosX; leftRef.current.scale.x = targetScaleX
      rightRef.current.position.x = targetPosX; rightRef.current.scale.x = targetScaleX
    }
  })

  const compileLeft = useCallback((shader) => {
    shader.uniforms.uTime = uniforms.current.uTime; shader.uniforms.uProgress = uniforms.current.uProgress; shader.uniforms.uHeight = uniforms.current.uHeight;
    shader.vertexShader = `uniform float uTime; uniform float uProgress; uniform float uHeight; varying vec2 vCustomUv; varying float vShadow; \n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n float pleatFreqN = 18.0; float pleatDepthN = mix(0.04, 0.35, uProgress); float clampSwingN = clamp((0.5 - (position.y / uHeight)) + 0.05, 0.0, 1.0); float dzdx = cos(position.x * pleatFreqN) * pleatFreqN * pleatDepthN * clampSwingN * 3.0; float dwdx = cos(position.y * 3.0 + position.x * 2.0 + uTime * 2.5) * 2.0 * 0.03 * clampSwingN; objectNormal = normalize(vec3(-(dzdx + dwdx), 0.0, 1.0));`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n vCustomUv = uv; float structuralFolds = sin(position.x * 18.0); vShadow = structuralFolds; float wind = sin(position.y * 3.0 + position.x * 2.0 + uTime * 2.5) * 0.03; transformed.z += (structuralFolds * mix(0.04, 0.35, uProgress) + wind) * clamp((0.5 - (position.y / uHeight)) + 0.05, 0.0, 1.0);`);
    shader.fragmentShader = `varying vec2 vCustomUv; varying float vShadow;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n float innerEdgeDist = (1.0 - vCustomUv.x); float isTrim = clamp(step(innerEdgeDist, 0.04) + (step(innerEdgeDist, 0.06) * (1.0 - step(innerEdgeDist, 0.05))) + step(vCustomUv.y, 0.03) + (step(vCustomUv.y, 0.05) * (1.0 - step(vCustomUv.y, 0.04))), 0.0, 1.0); diffuseColor.rgb *= mix(0.1, 1.4, (vShadow + 1.0) * 0.5); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.75, 0.25) * mix(0.7, 1.3, (vShadow + 1.0) * 0.5), isTrim);`);
  }, []);

  const compileRight = useCallback((shader) => {
    shader.uniforms.uTime = uniforms.current.uTime; shader.uniforms.uProgress = uniforms.current.uProgress; shader.uniforms.uHeight = uniforms.current.uHeight;
    shader.vertexShader = `uniform float uTime; uniform float uProgress; uniform float uHeight; varying vec2 vCustomUv; varying float vShadow; \n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n float pleatFreqN = 18.0; float pleatDepthN = mix(0.04, 0.35, uProgress); float clampSwingN = clamp((0.5 - (position.y / uHeight)) + 0.05, 0.0, 1.0); float dzdx = cos(position.x * pleatFreqN) * pleatFreqN * pleatDepthN * clampSwingN * 3.0; float dwdx = cos(position.y * 3.0 + position.x * 2.0 + uTime * 2.5) * 2.0 * 0.03 * clampSwingN; objectNormal = normalize(vec3(-(dzdx + dwdx), 0.0, 1.0));`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n vCustomUv = uv; float structuralFolds = sin(position.x * 18.0); vShadow = structuralFolds; float wind = sin(position.y * 3.0 + position.x * 2.0 + uTime * 2.5) * 0.03; transformed.z += (structuralFolds * mix(0.04, 0.35, uProgress) + wind) * clamp((0.5 - (position.y / uHeight)) + 0.05, 0.0, 1.0);`);
    shader.fragmentShader = `varying vec2 vCustomUv; varying float vShadow;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n float innerEdgeDist = vCustomUv.x; float isTrim = clamp(step(innerEdgeDist, 0.04) + (step(innerEdgeDist, 0.06) * (1.0 - step(innerEdgeDist, 0.05))) + step(vCustomUv.y, 0.03) + (step(vCustomUv.y, 0.05) * (1.0 - step(vCustomUv.y, 0.04))), 0.0, 1.0); diffuseColor.rgb *= mix(0.1, 1.4, (vShadow + 1.0) * 0.5); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.75, 0.25) * mix(0.7, 1.3, (vShadow + 1.0) * 0.5), isTrim);`);
  }, []);

  const injectValancePhysics = useCallback((shader) => {
    shader.uniforms.uWidth = uniforms.current.uWidth;
    shader.vertexShader = `uniform float uWidth; varying vec2 vCustomUv; varying float vShadow; varying float vSag;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n float swagCountN = max(3.0, floor(uWidth / 3.0)); float swagXN = fract(uv.x * swagCountN); float dropFactorN = (1.0 - uv.y); float dZdx = cos(swagXN * 3.14159) * 3.14159 * swagCountN / uWidth * 0.4 * dropFactorN * 2.0; float pleatDeriv = cos(swagXN * 3.14159 * 12.0) * 3.14159 * 12.0 * swagCountN / uWidth * 0.05 * dropFactorN * 2.0; objectNormal = normalize(vec3(-(dZdx + pleatDeriv), 0.0, 1.0));`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n vCustomUv = uv; float swagCount = max(3.0, floor(uWidth / 3.0)); float swagX = fract(uv.x * swagCount); float sag = sin(swagX * 3.14159265); float pleat = sin(swagX * 3.14159265 * 12.0); vShadow = pleat; vSag = sag; float dropFactor = (1.0 - uv.y); transformed.z += (sag * 0.4 + pleat * 0.05) * dropFactor;`);
    shader.fragmentShader = `uniform float uWidth; varying vec2 vCustomUv; varying float vShadow; varying float vSag;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n float swagCount = max(3.0, floor(uWidth / 3.0)); float swagX = fract(vCustomUv.x * swagCount); float sag = sin(swagX * 3.14159265); float cutoff = 0.40 - (sag * 0.35); if (vCustomUv.y < cutoff) discard; float isTrim = clamp(step(vCustomUv.y, cutoff + 0.03) + (step(vCustomUv.y, cutoff + 0.05) * (1.0 - step(vCustomUv.y, cutoff + 0.04))) + step(0.94, vCustomUv.y) + (step(0.90, vCustomUv.y) * (1.0 - step(0.92, vCustomUv.y))), 0.0, 1.0); float ao = mix(0.1, 1.4, (vShadow + 1.0) * 0.5) * mix(0.2, 1.0, 1.0 - vSag * 0.6); diffuseColor.rgb *= ao; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.75, 0.25) * mix(0.7, 1.3, (vShadow + 1.0) * 0.5), isTrim);`);
  }, []);

  return (
    <group position={[0, height / 2, 0]}>
      <spotLight position={[-width/3, height/2 + 4, 6]} angle={0.9} penumbra={0.5} intensity={3.5} color="#ffe5cc" />
      <spotLight position={[width/3, height/2 + 4, 6]} angle={0.9} penumbra={0.5} intensity={3.5} color="#ffccdd" />
      <pointLight position={[0, -height/2 + 1, 4]} intensity={2.0} color="#ff1a40" distance={15} />
      <mesh ref={valanceRef} position={[0, height / 2 - 1.0, 0.15]} castShadow side={THREE.DoubleSide}>
        <planeGeometry args={[width + 1.0, 2.5, 128, 32]} />
        <meshStandardMaterial color="#8a0000" roughness={0.6} metalness={0.25} side={THREE.DoubleSide} onBeforeCompile={injectValancePhysics} customProgramCacheKey={() => 'curtain_valance'} />
      </mesh>
      <mesh ref={leftRef} position={[-width / 4, 0, -0.05]} castShadow side={THREE.DoubleSide}>
        <planeGeometry args={[width / 2, height, 64, 32]} />
        <meshStandardMaterial color="#8a0000" roughness={0.6} metalness={0.25} side={THREE.DoubleSide} onBeforeCompile={compileLeft} customProgramCacheKey={() => 'curtain_left'} />
      </mesh>
      <mesh ref={rightRef} position={[width / 4, 0, -0.05]} castShadow side={THREE.DoubleSide}>
        <planeGeometry args={[width / 2, height, 64, 32]} />
        <meshStandardMaterial color="#8a0001" roughness={0.6} metalness={0.25} side={THREE.DoubleSide} onBeforeCompile={compileRight} customProgramCacheKey={() => 'curtain_right'} />
      </mesh>
    </group>
  )
}

function AnimatedWindowCurtain({ isOpen, duration = 2 }) {
  const leftRef = useRef(); const rightRef = useRef(); const cWidth = 2.44; const cHeight = 2.74;
  const uniforms = useRef({ uTime: { value: 0 }, uProgress: { value: 0 }, uHeight: { value: cHeight }, uWidth: { value: cWidth } })

  useFrame((state, delta) => {
    uniforms.current.uTime.value = state.clock.elapsedTime
    const speed = 1.0 / duration
    uniforms.current.uProgress.value = isOpen ? Math.min(1.0, uniforms.current.uProgress.value + speed * delta) : Math.max(0.0, uniforms.current.uProgress.value - speed * delta)
    const p = uniforms.current.uProgress.value; const easedP = p * p * (3.0 - 2.0 * p) 
    const targetScaleX = 1.0 - (0.80 * easedP); const targetPosX = (cWidth / 4) + ((cWidth / 4) - ((cWidth / 2 * 0.20) / 2)) * easedP
    if (leftRef.current && rightRef.current) {
      leftRef.current.position.x = -targetPosX; leftRef.current.scale.x = targetScaleX;
      rightRef.current.position.x = targetPosX; rightRef.current.scale.x = targetScaleX;
    }
  })

  const compileWindowDrape = useCallback((shader) => {
    shader.uniforms.uTime = uniforms.current.uTime; shader.uniforms.uProgress = uniforms.current.uProgress; shader.uniforms.uHeight = uniforms.current.uHeight;
    shader.vertexShader = `uniform float uTime; uniform float uProgress; uniform float uHeight; varying vec2 vCustomUv; varying float vShadow;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n float clampSwingN = clamp((0.5 - (position.y / uHeight)) + 0.1, 0.0, 1.0); float dzdx = cos(position.x * 18.0) * 18.0 * mix(0.02, 0.2, uProgress) * clampSwingN * 2.0; float dwdx = cos(position.y * 3.0 + position.x * 2.0 + uTime * 1.5) * 2.0 * 0.02 * clampSwingN; objectNormal = normalize(vec3(-(dzdx + dwdx), 0.0, 1.0));`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n vCustomUv = uv; float structuralFolds = sin(position.x * 18.0); vShadow = structuralFolds; transformed.z += (structuralFolds * mix(0.02, 0.2, uProgress) + sin(position.y * 3.0 + position.x * 2.0 + uTime * 1.5) * 0.02) * clamp((0.5 - (position.y / uHeight)) + 0.1, 0.0, 1.0);`);
    shader.fragmentShader = `varying vec2 vCustomUv; varying float vShadow;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n diffuseColor.rgb *= mix(0.4, 1.2, (vShadow + 1.0) * 0.5);`);
  }, []);

  return (
    <group position={[0, cHeight / 2, 0]}>
      <mesh position={[0, 0, -0.1]}><boxGeometry args={[1.6, 1.8, 0.02]} /><meshStandardMaterial color="#f0f0f0" /></mesh>
      <mesh position={[0, 0, -0.09]}><boxGeometry args={[1.5, 1.7, 0.02]} /><meshStandardMaterial color="#88ccff" roughness={0.1} metalness={0.9} transparent opacity={0.6} /></mesh>
      <mesh position={[0, cHeight / 2 - 0.05, 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.015, 0.015, cWidth + 0.2, 16]} /><meshStandardMaterial color="#333" metalness={0.8} /></mesh>
      <mesh ref={leftRef} position={[-cWidth / 4, 0, 0]} castShadow side={THREE.DoubleSide}><planeGeometry args={[cWidth / 2, cHeight, 64, 32]} /><meshStandardMaterial color="#e6ddc5" roughness={0.9} side={THREE.DoubleSide} onBeforeCompile={compileWindowDrape} customProgramCacheKey={() => 'window_curtain'} /></mesh>
      <mesh ref={rightRef} position={[cWidth / 4, 0, 0]} castShadow side={THREE.DoubleSide}><planeGeometry args={[cWidth / 2, cHeight, 64, 32]} /><meshStandardMaterial color="#e6ddc5" roughness={0.9} side={THREE.DoubleSide} onBeforeCompile={compileWindowDrape} customProgramCacheKey={() => 'window_curtain'} /></mesh>
    </group>
  )
}

// --- ANIMATED DOOR FLAT ---
function AnimatedDoorFlat({ isOpen }) {
  const doorRef = useRef()
  useFrame(() => {
    if (doorRef.current) doorRef.current.rotation.y += ((isOpen ? -Math.PI / 2.2 : 0) - doorRef.current.rotation.y) * 0.1
  })
  const triShape = new THREE.Shape(); triShape.moveTo(0, 0); triShape.lineTo(0, 1.0); triShape.lineTo(-0.8, 0); triShape.lineTo(0, 0);
  const triExtrude = { depth: 0.04, bevelEnabled: false };

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.02, -0.61]} castShadow receiveShadow><boxGeometry args={[1.22, 0.04, 1.22]} /><meshStandardMaterial color="#d2b48c" roughness={0.8} /></mesh>
      <mesh position={[-0.5, 1.065, 0]} castShadow><boxGeometry args={[0.1, 2.13, 0.1]} /><meshStandardMaterial color="#e0e0e0" roughness={0.9} /></mesh>
      <mesh position={[0.5, 1.065, 0]} castShadow><boxGeometry args={[0.1, 2.13, 0.1]} /><meshStandardMaterial color="#e0e0e0" roughness={0.9} /></mesh>
      <mesh position={[0, 2.08, 0]} castShadow><boxGeometry args={[1.1, 0.1, 0.1]} /><meshStandardMaterial color="#e0e0e0" roughness={0.9} /></mesh>
      <group position={[-0.45, 1.03, -0.02]} ref={doorRef}>
        <mesh position={[0.45, 0, 0]} castShadow><boxGeometry args={[0.9, 2.0, 0.04]} /><meshStandardMaterial color="#ffffff" roughness={0.7} /></mesh>
        <mesh position={[0.83, -0.03, 0.03]} castShadow><sphereGeometry args={[0.03]} /><meshStandardMaterial color="#111" metalness={0.8} /></mesh>
      </group>
      <mesh position={[-0.45, 0.04, -0.05]} rotation={[0, -Math.PI/2, 0]} castShadow><extrudeGeometry args={[triShape, triExtrude]} /><meshStandardMaterial color="#d2b48c" roughness={0.8} /></mesh>
      <mesh position={[0.49, 0.04, -0.05]} rotation={[0, -Math.PI/2, 0]} castShadow><extrudeGeometry args={[triShape, triExtrude]} /><meshStandardMaterial color="#d2b48c" roughness={0.8} /></mesh>
    </group>
  )
}

// --- INTERACTIVE LAMPS ---
function InteractiveLamp({ type }) {
  const [isOn, setIsOn] = useState(true)
  return (
    <group>
      {type === 1 && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.015, 0]} castShadow receiveShadow><boxGeometry args={[0.23, 0.03, 0.23]} /><meshStandardMaterial color="#d2b48c" roughness={0.6} /></mesh>
          <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, 1.3]} /><meshStandardMaterial color="#d2b48c" roughness={0.6} /></mesh>
          <mesh position={[0, 1.35, 0]} castShadow onClick={(e) => { e.stopPropagation(); setIsOn(!isOn) }}><cylinderGeometry args={[0.2, 0.2, 0.25, 32, 1, true]} /><meshStandardMaterial color={isOn ? "#ffffff" : "#f8f9fa"} roughness={0.9} side={THREE.DoubleSide} emissive={isOn ? "#fff1e0" : "#000"} emissiveIntensity={0.5} /></mesh>
          {isOn && <pointLight position={[0, 1.35, 0]} intensity={4.0} distance={8} color="#fff1e0" />}
          <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.04]} /><meshBasicMaterial color={isOn ? "#ffffff" : "#cccccc"} /></mesh>
        </group>
      )}
      {type === 2 && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.015, 0]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 0.03, 32]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, 0.035, 0]} castShadow receiveShadow><cylinderGeometry args={[0.1, 0.1, 0.01, 32]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.01, 0.01, 1.3]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, 1.35, 0]} castShadow onClick={(e) => { e.stopPropagation(); setIsOn(!isOn) }}><cylinderGeometry args={[0.12, 0.18, 0.25, 32, 1, true]} /><meshStandardMaterial color={isOn ? "#ffffff" : "#f8f9fa"} roughness={0.9} side={THREE.DoubleSide} emissive={isOn ? "#fff1e0" : "#000"} emissiveIntensity={0.5} /></mesh>
          <mesh position={[0.08, 1.15, 0]} castShadow><cylinderGeometry args={[0.002, 0.002, 0.15]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0.08, 1.07, 0]} castShadow><sphereGeometry args={[0.008]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          {isOn && <pointLight position={[0, 1.35, 0]} intensity={4.0} distance={8} color="#fff1e0" />}
          <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.04]} /><meshBasicMaterial color={isOn ? "#ffffff" : "#cccccc"} /></mesh>
        </group>
      )}
    </group>
  )
}

// --- INTERACTIVE PROP TABLE (CHOOSE CHAIR POSITIONS) ---
function InteractivePropTable() {
  const ptL = 1.83; const ptW = 0.91; const ptH = 0.76; const ptApron = 0.06; 
  const ptChairSeatH = 0.48; const ptChairW = 0.42; const ptChairD = 0.42; const ptChairBackH = 0.95; 
  const chairPositions = [
    { x: -(ptL / 2) - 0.25, z: 0, rot: Math.PI / 2 }, { x: (ptL / 2) + 0.25, z: 0, rot: -Math.PI / 2 }, 
    { x: -0.55, z: (ptW / 2) + 0.18, rot: Math.PI },  { x: 0.0,   z: (ptW / 2) + 0.18, rot: Math.PI },  { x: 0.55,  z: (ptW / 2) + 0.18, rot: Math.PI },  
    { x: -0.55, z: -(ptW / 2) - 0.18, rot: 0 },       { x: 0.0,   z: -(ptW / 2) - 0.18, rot: 0 },       { x: 0.55,  z: -(ptW / 2) - 0.18, rot: 0 }        
  ];
  const [chairs, setChairs] = useState([true, true, true, true, true, true, true, true])

  const toggleChair = (idx, e) => {
    e.stopPropagation(); 
    const newChairs = [...chairs]; newChairs[idx] = !newChairs[idx]; setChairs(newChairs);
  }

  return (
    <group>
      <mesh position={[0, ptH - 0.02, 0]} castShadow receiveShadow><boxGeometry args={[ptL, 0.04, ptW]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" roughness={0.35} /></mesh>
      <group position={[0, ptH - 0.04 - (ptApron / 2), 0]}>
        <mesh position={[0, 0, (ptW / 2) - 0.03]} castShadow><boxGeometry args={[ptL - 0.1, ptApron, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[0, 0, -(ptW / 2) + 0.03]} castShadow><boxGeometry args={[ptL - 0.1, ptApron, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[(ptL / 2) - 0.03, 0, 0]} castShadow><boxGeometry args={[0.02, ptApron, ptW - 0.06]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
        <mesh position={[-(ptL / 2) + 0.03, 0, 0]} castShadow><boxGeometry args={[0.02, ptApron, ptW - 0.06]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
      </group>
      {[
        [ (ptL / 2) - 0.05,  (ptW / 2) - 0.05], [ (ptL / 2) - 0.05, -(ptW / 2) + 0.05],
        [-(ptL / 2) + 0.05,  (ptW / 2) - 0.05], [-(ptL / 2) + 0.05, -(ptW / 2) + 0.05]
      ].map(([x, z], idx) => (
        <mesh key={`pt-table-leg-${idx}`} position={[x, (ptH - 0.04) / 2, z]} castShadow><boxGeometry args={[0.07, ptH - 0.04, 0.07]} /><meshStandardMaterial color="#d2b48c" roughness={0.4} /></mesh>
      ))}
      
      {chairPositions.map((pos, i) => (
        <group key={`pt-chair-slot-${i}`} position={[pos.x, 0, pos.z]} rotation={[0, pos.rot, 0]} onClick={(e) => toggleChair(i, e)}>
          {chairs[i] ? (
            <group>
              <mesh position={[-(ptChairW / 2) + 0.015, ptChairSeatH / 2, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[(ptChairW / 2) - 0.015, ptChairSeatH / 2, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[-(ptChairW / 2) + 0.015, ptChairSeatH / 2, (ptChairD / 2) - 0.015]} castShadow><boxGeometry args={[0.02, ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[(ptChairW / 2) - 0.015, ptChairSeatH / 2, (ptChairD / 2) - 0.015]} castShadow><boxGeometry args={[0.02, ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[-(ptChairW / 2) + 0.015, ptChairSeatH + (ptChairBackH - ptChairSeatH) / 2, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, ptChairBackH - ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[(ptChairW / 2) - 0.015, ptChairSeatH + (ptChairBackH - ptChairSeatH) / 2, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[0.02, ptChairBackH - ptChairSeatH, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[0, ptChairBackH - 0.04, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[ptChairW, 0.08, 0.018]} /><meshStandardMaterial color="#b59975" roughness={0.4} /></mesh>
              <mesh position={[0, ptChairSeatH + (ptChairBackH - ptChairSeatH) * 0.4, -(ptChairD / 2) + 0.015]} castShadow><boxGeometry args={[ptChairW - 0.03, 0.03, 0.015]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
              <mesh position={[0, ptChairSeatH, 0]} castShadow receiveShadow><boxGeometry args={[ptChairW, 0.03, ptChairD]} /><meshStandardMaterial color="#eae2d5" roughness={0.75} /></mesh>
            </group>
          ) : (
            <mesh position={[0, ptChairSeatH/2, 0]}>
              <boxGeometry args={[ptChairW, ptChairSeatH, ptChairD]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.1} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

// --- HELPER DRUM COMPONENTS ---
const Drum = ({ pos, rot, radius, depth, color }) => (
  <group position={pos} rotation={rot || [0,0,0]}>
    <mesh castShadow receiveShadow><cylinderGeometry args={[radius, radius, depth, 32, 1, true]} /><meshPhysicalMaterial color={color} metalness={0.2} roughness={0.1} clearcoat={1.0} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, depth/2, 0]} rotation={[-Math.PI/2, 0, 0]} castShadow receiveShadow><circleGeometry args={[radius, 32]} /><meshStandardMaterial color="#f4f4f4" roughness={0.8} /></mesh>
    <mesh position={[0, -depth/2, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow><circleGeometry args={[radius, 32]} /><meshStandardMaterial color="#f4f4f4" roughness={0.8} /></mesh>
    <mesh position={[0, depth/2, 0]} rotation={[Math.PI/2, 0, 0]} castShadow><torusGeometry args={[radius, 0.008, 8, 32]} /><meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, -depth/2, 0]} rotation={[Math.PI/2, 0, 0]} castShadow><torusGeometry args={[radius, 0.008, 8, 32]} /><meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} /></mesh>
  </group>
);
const Cymbal = ({ posX, posZ, height, tiltRot, radius }) => (
  <group position={[posX, 0, posZ]}>
    <mesh position={[0, 0.01, 0]} castShadow><cylinderGeometry args={[0.2, 0.01, 0.02, 3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.01, 0.01, height, 16]} /><meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} /></mesh>
    <group position={[0, height, 0]} rotation={tiltRot || [0,0,0]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[0.015, radius, 0.005, 32]} /><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.008, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, 0.015, 16]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
    </group>
  </group>
);

// --- WARDROBE ---
function AnimatedWardrobe({ isOpen }) {
  const lRef = useRef(); const cRef = useRef(); const rRef = useRef(); const wW = 1.2; const wH = 1.82; const wD = 0.55; 
  useFrame(() => {
    const angle = Math.PI * 0.75;
    if (lRef.current) lRef.current.rotation.y += ((isOpen ? -angle : 0) - lRef.current.rotation.y) * 0.05
    if (cRef.current) cRef.current.rotation.y += ((isOpen ? angle : 0) - cRef.current.rotation.y) * 0.05
    if (rRef.current) rRef.current.rotation.y += ((isOpen ? angle : 0) - rRef.current.rotation.y) * 0.05
  })
  return (
    <group position={[0, wH / 2, 0]}>
      <mesh position={[0, wH * 0.005, -(wD / 2) + 0.01]} castShadow receiveShadow><boxGeometry args={[wW, wH - 0.06, 0.02]} /><meshStandardMaterial color="#8d6e63" roughness={0.5} /></mesh>
      <mesh position={[-(wW / 2) + 0.015, wH * 0.005, 0]} castShadow receiveShadow><boxGeometry args={[0.03, wH - 0.06, wD - 0.02]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.45} /></mesh>
      <mesh position={[(wW / 2) - 0.015, wH * 0.005, 0]} castShadow receiveShadow><boxGeometry args={[0.03, wH - 0.06, wD - 0.02]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.45} /></mesh>
      <mesh position={[0, (wH / 2) - 0.015, 0]} castShadow><boxGeometry args={[wW + 0.04, 0.04, wD + 0.03]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.4} /></mesh>
      <mesh position={[0, -(wH / 2) + 0.03, 0]} castShadow receiveShadow><boxGeometry args={[wW, 0.06, wD]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.6} /></mesh>
      <mesh position={[0.15, wH * 0.005, 0.01]} castShadow receiveShadow><boxGeometry args={[0.02, wH - 0.10, wD - 0.04]} /><meshStandardMaterial color="#8d6e63" roughness={0.5} /></mesh>
      {[-0.50, -0.15, 0.15, 0.45].map((shY, sIdx) => (<mesh key={`ws-${sIdx}`} position={[0.365, shY, 0.01]} castShadow receiveShadow><boxGeometry args={[0.39, 0.02, wD - 0.04]} /><meshStandardMaterial color="#8d6e63" roughness={0.55} /></mesh>))}
      
      <group ref={lRef} position={[-(wW / 2) + 0.03, 0, (wD / 2)]}>
        <mesh position={[0.19, wH * 0.005, -0.0075]} castShadow><boxGeometry args={[0.38, wH - 0.08, 0.015]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.35} /></mesh>
        <mesh position={[0.35, 0.05, 0.01]} castShadow><boxGeometry args={[0.015, wH * 0.08, 0.015]} /><meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.1} /></mesh>
      </group>
      <group ref={cRef} position={[0.15, 0, (wD / 2)]}>
        <mesh position={[-0.19, wH * 0.005, -0.0075]} castShadow><boxGeometry args={[0.38, wH - 0.08, 0.015]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.35} /></mesh>
        <mesh position={[-0.35, 0.05, 0.01]} castShadow><boxGeometry args={[0.015, wH * 0.08, 0.015]} /><meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.1} /></mesh>
      </group>
      <group ref={rRef} position={[(wW / 2) - 0.03, 0, (wD / 2)]}>
        <mesh position={[-0.19, wH * 0.005, -0.0075]} castShadow><boxGeometry args={[0.38, wH - 0.08, 0.015]} /><CoffeeTableWoodMaterial baseColor="#8d6e63" roughness={0.35} /></mesh>
        <mesh position={[-0.35, 0.05, 0.01]} castShadow><boxGeometry args={[0.015, wH * 0.08, 0.015]} /><meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.1} /></mesh>
      </group>
    </group>
  )
}

function AnimatedChair({ posX, posZ, rotY }) {
  const [isOpen, setIsOpen] = useState(false); const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.position.z += ((isOpen ? (posZ > 0 ? posZ + 0.25 : posZ - 0.25) : posZ) - ref.current.position.z) * 0.08 })
  return (
    <group ref={ref} position={[posX, 0, posZ]} rotation={[0, rotY, 0]} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}>
      <mesh position={[-0.195, 0.24, -0.195]} castShadow><boxGeometry args={[0.02, 0.48, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[0.195, 0.24, -0.195]} castShadow><boxGeometry args={[0.02, 0.48, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[-0.195, 0.24, 0.195]} castShadow><boxGeometry args={[0.02, 0.48, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[0.195, 0.24, 0.195]} castShadow><boxGeometry args={[0.02, 0.48, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[-0.195, 0.715, -0.195]} castShadow><boxGeometry args={[0.02, 0.47, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[0.195, 0.715, -0.195]} castShadow><boxGeometry args={[0.02, 0.47, 0.02]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[0, 0.91, -0.195]} castShadow><boxGeometry args={[0.42, 0.08, 0.018]} /><meshStandardMaterial color="#b59975" roughness={0.4} /></mesh>
      <mesh position={[0, 0.668, -0.195]} castShadow><boxGeometry args={[0.39, 0.03, 0.015]} /><meshStandardMaterial color="#b59975" roughness={0.5} /></mesh>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow><boxGeometry args={[0.42, 0.03, 0.42]} /><meshStandardMaterial color="#eae2d5" roughness={0.75} /></mesh>
    </group>
  )
}

function AnimatedNightstand({ isDrawerOpen }) {
  const drawerRef = useRef(); const nW = 0.47; const nH = 0.51; const nD = 0.40; const nLegH = 0.17; 
  useFrame(() => { if (drawerRef.current) drawerRef.current.position.z += ((isDrawerOpen ? 0.30 : 0) - drawerRef.current.position.z) * 0.05 })
  return (
    <group position={[0, (nH + nLegH) / 2, 0]}>
      <mesh position={[-(nW / 2) + 0.01, nLegH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.02, nH, nD]} /><meshStandardMaterial color="#fcfdfd" roughness={0.4} /></mesh>
      <mesh position={[(nW / 2) - 0.01, nLegH / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.02, nH, nD]} /><meshStandardMaterial color="#fcfdfd" roughness={0.4} /></mesh>
      <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.01, 0]} castShadow><boxGeometry args={[nW + 0.01, 0.02, nD + 0.01]} /><meshStandardMaterial color="#fcfdfd" roughness={0.35} /></mesh>
      <mesh position={[0, (nH / 2) + (nLegH / 2) - 0.24, 0]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, 0.015, nD - 0.02]} /><meshStandardMaterial color="#fcfdfd" roughness={0.45} /></mesh>
      <mesh position={[0, -(nH / 2) + (nLegH / 2) + 0.01, 0]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, 0.02, nD - 0.02]} /><meshStandardMaterial color="#fcfdfd" roughness={0.4} /></mesh>
      <mesh position={[0, nLegH / 2, -(nD / 2) + 0.01]} castShadow receiveShadow><boxGeometry args={[nW - 0.04, nH - 0.02, 0.01]} /><meshStandardMaterial color="#fcfdfd" roughness={0.5} /></mesh>
      <group ref={drawerRef} position={[0, (nH / 2) + (nLegH / 2) - 0.12, 0]}>
        <mesh position={[0, 0, (nD / 2) - 0.01]} castShadow><boxGeometry args={[nW - 0.04, 0.22, 0.02]} /><meshStandardMaterial color="#fcfdfd" roughness={0.3} /></mesh>
        <mesh position={[0, 0, (nD / 2) + 0.005]} castShadow><boxGeometry args={[0.05, 0.02, 0.015]} /><meshStandardMaterial color="#151515" roughness={0.6} metalness={0.1} /></mesh>
        <mesh position={[-(nW / 2) + 0.03, -0.01, 0]} castShadow><boxGeometry args={[0.02, 0.20, nD - 0.04]} /><meshStandardMaterial color="#fcfdfd" roughness={0.3} /></mesh>
        <mesh position={[(nW / 2) - 0.03, -0.01, 0]} castShadow><boxGeometry args={[0.02, 0.20, nD - 0.04]} /><meshStandardMaterial color="#fcfdfd" roughness={0.3} /></mesh>
        <mesh position={[0, -0.10, 0]} castShadow><boxGeometry args={[nW - 0.08, 0.02, nD - 0.04]} /><meshStandardMaterial color="#fcfdfd" roughness={0.3} /></mesh>
        <mesh position={[0, -0.01, -(nD / 2) + 0.03]} castShadow><boxGeometry args={[nW - 0.08, 0.20, 0.02]} /><meshStandardMaterial color="#fcfdfd" roughness={0.3} /></mesh>
      </group>
      {[ [-(nW / 2) + 0.02, -(nD / 2) + 0.03], [ (nW / 2) - 0.02, -(nD / 2) + 0.03], [-(nW / 2) + 0.02,  (nD / 2) - 0.03], [ (nW / 2) - 0.02,  (nD / 2) - 0.03] ].map(([lx, lz], idx) => (
        <mesh key={`nl-${idx}`} position={[lx, -(nH / 2) + (nLegH / 2) - (nLegH / 2), lz]} castShadow><boxGeometry args={[0.035, nLegH, 0.035]} /><meshStandardMaterial color="#fcfdfd" roughness={0.45} /></mesh>
      ))}
      <group position={[0, (nH / 2) + (nLegH / 2), 0]}>
        <mesh position={[0, 0.04, 0]} castShadow><sphereGeometry args={[0.045, 24, 24]} /><meshStandardMaterial color="#cca471" roughness={0.2} metalness={0.1} /></mesh>
        <mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.005, 0.005, 0.04, 8]} /><meshStandardMaterial color="#cca43b" metalness={0.7} roughness={0.2} /></mesh>
        <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.035, 0.075, 0.13, 24, 1, true]} /><meshStandardMaterial color="#f4ebd9" roughness={0.85} side={2} /></mesh>
      </group>
    </group>
  )
}


// --- PROP GENERATOR ENGINE ---
export function getPropSpecs(type, state = {}, bounds = { width: 15, height: 6, length: 10 }) {
  switch (type) {
    case 'Sofa / Couch':
    case 'Stage couches or armchairs':
      return {
        dims: [1.83, 0.79, 1.52],
        model: (
          <group>
            <mesh position={[0, 0.20, -0.325]} castShadow receiveShadow><boxGeometry args={[1.83, 0.10, 0.87]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh>
            <mesh position={[-0.435, 0.20, 0.385]} castShadow receiveShadow><boxGeometry args={[0.85, 0.10, 0.55]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh>
            <group position={[0, 0.525, -0.71]}><mesh castShadow><boxGeometry args={[1.83, 0.43, 0.1]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh><mesh position={[0, 0.215, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 1.83, 16]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh></group>
            <group position={[-0.885, 0.39, -0.325]}><mesh castShadow><boxGeometry args={[0.06, 0.38, 0.87]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh><mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.87, 16]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh></group>
            <group position={[0.885, 0.39, -0.325]}><mesh castShadow><boxGeometry args={[0.06, 0.38, 0.87]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh><mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.87, 16]} /><CouchFabricMaterial color="rgb(143, 111, 51)" /></mesh></group>
            <group position={[0.41, 0.35, -0.275]}><mesh castShadow><boxGeometry args={[0.82, 0.18, 0.73]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh><mesh position={[0, 0, 0.365]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.82, 16]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh></group>
            <group position={[-0.435, 0.35, 0.1]}><mesh castShadow><boxGeometry args={[0.85, 0.18, 1.48]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh><mesh position={[0, 0, 0.74]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.85, 16]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh></group>
            <mesh position={[0, 0.52, -0.64]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 1.2, 24]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh>
            <mesh position={[-0.82, 0.44, -0.25]} rotation={[0, 0, 0.15]} castShadow><boxGeometry args={[0.05, 0.20, 0.50]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh>
            <mesh position={[0.82, 0.44, -0.25]} rotation={[0, 0, -0.15]} castShadow><boxGeometry args={[0.05, 0.20, 0.50]} /><CouchFabricMaterial color="rgb(201, 173, 119)" /></mesh>
            {[[-0.84, -0.7], [0.84, -0.7], [-0.84, 0.05], [0.84, 0.05], [-0.84, 0.75], [-0.03, 0.75]].map((p, i) => (
              <mesh key={`leg${i}`} position={[p[0], 0.075, p[1]]} castShadow><cylinderGeometry args={[0.03, 0.015, 0.15]} /><meshStandardMaterial color="#2d1f18" roughness={0.5} /></mesh>
            ))}
          </group>
        )
      }

    case 'Coffee table':
      return {
        dims: [0.965, 0.47, 0.965],
        model: (
          <group>
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[0.965, 0.03, 0.965]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[0, 0.466, 0]}><boxGeometry args={[0.97, 0.002, 0.97]} /><meshStandardMaterial color="#fff" roughness={0.2} /></mesh>
            <mesh position={[-0.445, 0.22, -0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[0.445, 0.22, -0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[-0.445, 0.22, 0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[0.445, 0.22, 0.445]} castShadow><boxGeometry args={[0.075, 0.44, 0.075]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[0, 0.08, 0]} castShadow receiveShadow><boxGeometry args={[0.885, 0.03, 0.885]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
            <mesh position={[0, 0.096, 0]}><boxGeometry args={[0.89, 0.002, 0.89]} /><meshStandardMaterial color="#fff" roughness={0.3} /></mesh>
            <group position={[0, 0.33, 0.415]}>
              <mesh castShadow><boxGeometry args={[0.81, 0.15, 0.03]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" /></mesh>
              <mesh position={[0, 0, 0.016]}><boxGeometry args={[0.79, 0.13, 0.002]} /><meshStandardMaterial color="#fff" roughness={0.2} wireframe={true} /></mesh>
              <mesh position={[0, -0.01, 0.02]}><boxGeometry args={[0.10, 0.04, 0.01]} /><meshStandardMaterial color="#2d2d2d" metalness={0.9} roughness={0.1} /></mesh>
            </group>
          </group>
        )
      }

    case 'Dining table and chairs':
      return {
        dims: [2.5, 0.76, 1.6], 
        model: (
          <group>
            <mesh position={[0, 0.74, 0]} castShadow receiveShadow><boxGeometry args={[1.83, 0.04, 0.91]} /><CoffeeTableWoodMaterial baseColor="#d2b48c" roughness={0.35} /></mesh>
            <group position={[0, 0.69, 0]}>
              <mesh position={[0, 0, 0.425]} castShadow><boxGeometry args={[1.73, 0.06, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
              <mesh position={[0, 0, -0.425]} castShadow><boxGeometry args={[1.73, 0.06, 0.02]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
              <mesh position={[0.885, 0, 0]} castShadow><boxGeometry args={[0.02, 0.06, 0.85]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
              <mesh position={[-0.885, 0, 0]} castShadow><boxGeometry args={[0.02, 0.06, 0.85]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
            </group>
            {[ [0.865, 0.405], [0.865, -0.405], [-0.865, 0.405], [-0.865, -0.405] ].map(([x, z], idx) => (
              <mesh key={`tl-${idx}`} position={[x, 0.36, z]} castShadow><boxGeometry args={[0.07, 0.72, 0.07]} /><meshStandardMaterial color="#d2b48c" roughness={0.4} /></mesh>
            ))}
            <AnimatedChair posX={-0.55} posZ={0.635} rotY={Math.PI} />
            <AnimatedChair posX={0.0}   posZ={0.635} rotY={Math.PI} />
            <AnimatedChair posX={0.55}  posZ={0.635} rotY={Math.PI} />
            <AnimatedChair posX={-0.55} posZ={-0.635} rotY={0} />
            <AnimatedChair posX={0.0}   posZ={-0.635} rotY={0} />
            <AnimatedChair posX={0.55}  posZ={-0.635} rotY={0} />
          </group>
        )
      }

    case 'Prop tables and chairs':
      return { dims: [2.8, 0.76, 1.6], model: <InteractivePropTable /> }

    case 'Bed frame and mattress':
      return {
        dims: [1.65, 1.12, 2.15],
        model: (
          <group>
            <mesh position={[-0.785, 0.14, 0]} castShadow receiveShadow><boxGeometry args={[0.08, 0.28, 2.15]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.5} /></mesh>
            <mesh position={[0.785, 0.14, 0]} castShadow receiveShadow><boxGeometry args={[0.08, 0.28, 2.15]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.5} /></mesh>
            <mesh position={[0, 0.14, 1.035]} castShadow receiveShadow><boxGeometry args={[1.57, 0.28, 0.08]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.5} /></mesh>
            {[ [-0.725, -0.875], [-0.925, -0.875], [-0.725, 0.675], [-0.925, 0.675] ].map(([bx, bz], bIdx) => (
              <mesh key={`bl-${bIdx}`} position={[bx, 0.06, bz]} castShadow><boxGeometry args={[0.12, 0.12, 0.12]} /><meshStandardMaterial color="#3a2a1a" roughness={0.7} /></mesh>
            ))}
            <mesh position={[-0.785, 0.56, -1.035]} castShadow><boxGeometry args={[0.08, 1.12, 0.08]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.4} /></mesh>
            <mesh position={[0.785, 0.56, -1.035]} castShadow><boxGeometry args={[0.08, 1.12, 0.08]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.4} /></mesh>
            <mesh position={[0, 1.09, -1.035]} castShadow><boxGeometry args={[1.65, 0.06, 0.10]} /><CoffeeTableWoodMaterial baseColor="#c6a072" roughness={0.35} /></mesh>
            <mesh position={[0, 0.32, -1.035]} castShadow><boxGeometry args={[1.57, 0.06, 0.05]} /><meshStandardMaterial color="#c6a072" roughness={0.5} /></mesh>
            {[-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((sX, sIdx) => (
              <mesh key={`hs-${sIdx}`} position={[sX, 0.74, -1.035]} castShadow><boxGeometry args={[0.04, 0.72, 0.02]} /><meshStandardMaterial color="#c6a072" roughness={0.45} /></mesh>
            ))}
            <group position={[0, 0.42, 0.04]}>
              <mesh castShadow receiveShadow><boxGeometry args={[1.51, 0.26, 1.99]} /><CouchFabricMaterial color="#f5f5f0" roughness={0.9} /></mesh>
              <mesh position={[0, 0.12, 0]}><boxGeometry args={[1.47, 0.03, 1.95]} /><CouchFabricMaterial color="#f5f5f0" roughness={0.85} /></mesh>
            </group>
            <group position={[-0.35, 0.60, -0.755]} rotation={[0.18, 0, 0]}>
              <mesh castShadow><boxGeometry args={[0.56, 0.015, 0.42]} /><CouchFabricMaterial color="#eaeaea" roughness={0.85} /></mesh>
              <mesh castShadow scale={[1, 0.32, 1]}><cylinderGeometry args={[0.16, 0.16, 0.50, 24, 1, false, 0, Math.PI * 2]} rotation={[0, 0, Math.PI / 2]} /><CouchFabricMaterial color="#eaeaea" roughness={0.7} /></mesh>
            </group>
            <group position={[0.35, 0.60, -0.755]} rotation={[0.18, 0, 0]}>
              <mesh castShadow><boxGeometry args={[0.56, 0.015, 0.42]} /><CouchFabricMaterial color="#eaeaea" roughness={0.85} /></mesh>
              <mesh castShadow scale={[1, 0.32, 1]}><cylinderGeometry args={[0.16, 0.16, 0.50, 24, 1, false, 0, Math.PI * 2]} rotation={[0, 0, Math.PI / 2]} /><CouchFabricMaterial color="#eaeaea" roughness={0.7} /></mesh>
            </group>
          </group>
        )
      }

    case 'Wardrobe / Dresser':
      return { dims: [1.20, 1.82, 0.55], model: <AnimatedWardrobe isOpen={state.wardrobeIsOpen} /> }

    case 'Bookshelf':
      const Book = ({ width = 0.03, height = 0.16, depth = 0.18, color = "#a63a3a", lean = 0 }) => (<mesh castShadow receiveShadow rotation={[0, 0, lean]}><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>);
      return {
        dims: [0.77, 1.22, 0.30], 
        model: (
          <group position={[0, 0.61, 0]}>
            <mesh position={[-0.375, 0.075, 0]} castShadow receiveShadow><boxGeometry args={[0.02, 1.07, 0.3]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[0.375, 0.075, 0]} castShadow receiveShadow><boxGeometry args={[0.02, 1.07, 0.3]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[0, 0.60, 0]} castShadow><boxGeometry args={[0.77, 0.02, 0.3]} /><CoffeeTableWoodMaterial baseColor="#6d4c41" roughness={0.4} /></mesh>
            <mesh position={[0, -0.45, 0]} castShadow receiveShadow><boxGeometry args={[0.73, 0.02, 0.3]} /><meshStandardMaterial color="#6d4c41" roughness={0.55} /></mesh>
            <mesh position={[-0.09, 0.19, 0]} castShadow receiveShadow><boxGeometry args={[0.55, 0.02, 0.29]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[0, 0.053, 0]} castShadow receiveShadow><boxGeometry args={[0.73, 0.02, 0.29]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[-0.10, -0.19, 0]} castShadow receiveShadow><boxGeometry args={[0.5, 0.02, 0.29]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[0.10, 0.34, 0]} castShadow><boxGeometry args={[0.02, 0.3, 0.28]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[-0.16, 0.12, 0]} castShadow><boxGeometry args={[0.02, 0.12, 0.28]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[-0.14, -0.23, 0]} castShadow><boxGeometry args={[0.02, 0.53, 0.28]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <mesh position={[0.10, -0.07, 0]} castShadow><boxGeometry args={[0.02, 0.25, 0.28]} /><meshStandardMaterial color="#6d4c41" roughness={0.5} /></mesh>
            <group position={[-0.30, 0.28, 0]}>
              <group position={[0.00, 0, 0]}><Book color="#2c3e50" height={0.17} /></group>
              <group position={[0.035, 0, 0]}><Book color="#c0392b" height={0.15} /></group>
              <group position={[0.07, 0, 0]}><Book color="#d35400" height={0.16} /></group>
              <group position={[0.105, 0, 0]}><Book color="#7f8c8d" height={0.14} /></group>
              <group position={[0.145, 0, 0]} rotation={[0, 0, -0.22]}><Book color="#16a085" height={0.16} /></group>
            </group>
            {[[-0.325, -0.1], [0.325, -0.1], [-0.325, 0.1], [0.325, 0.1]].map(([lx, lz], lIdx) => (
              <mesh key={`sh-${lIdx}`} position={[lx, -0.535, lz]} rotation={[0.08, 0, lx > 0 ? -0.05 : 0.05]} castShadow><cylinderGeometry args={[0.02, 0.012, 0.15, 16]} /><meshStandardMaterial color="#3e2723" roughness={0.6} /></mesh>
            ))}
          </group>
        )
      }

    case 'Nightstand':
      return { dims: [0.47, 0.68, 0.40], model: <AnimatedNightstand isDrawerOpen={state.nightstandDrawerIsOpen} /> }

    case 'Musician chairs':
      return {
        dims: [0.43, 0.97, 0.43],
        model: (
          <group>
            <mesh position={[-0.19, 0.23, -0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.46]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0.19, 0.23, -0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.46]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[-0.19, 0.23, 0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.46]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0.19, 0.23, 0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.46]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0.46, 0]} castShadow receiveShadow><boxGeometry args={[0.43, 0.05, 0.43]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
            <mesh position={[-0.19, 0.70, -0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.5]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0.19, 0.70, -0.19]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.5]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0.85, -0.19]} castShadow><boxGeometry args={[0.40, 0.20, 0.04]} /><meshStandardMaterial color="#222" roughness={0.8} /></mesh>
          </group>
        )
      }

    case 'Conductor’s podium':
      return {
        dims: [1.0, 1.2, 1.0],
        model: (
          <group>
            <mesh position={[0, 0.10, 0]} castShadow receiveShadow><boxGeometry args={[1.0, 0.20, 1.0]} /><meshStandardMaterial color="#1a1a1a" roughness={0.7} /></mesh>
            <mesh position={[0, 0.205, 0]} castShadow receiveShadow><boxGeometry args={[0.98, 0.01, 0.98]} /><meshStandardMaterial color="#7f8c8d" roughness={0.9} /></mesh>
            <group position={[0, 0.20, -0.45]}>
              <mesh position={[-0.36, 0.5, 0]} castShadow><cylinderGeometry args={[0.0175, 0.0175, 1.0]} /><meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} /></mesh>
              <mesh position={[0.36, 0.5, 0]} castShadow><cylinderGeometry args={[0.0175, 0.0175, 1.0]} /><meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} /></mesh>
              <mesh position={[0, 1.0, 0]} rotation={[0, 0, Math.PI/2]} castShadow><cylinderGeometry args={[0.0175, 0.0175, 0.72]} /><meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} /></mesh>
              <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI/2]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.72]} /><meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} /></mesh>
            </group>
          </group>
        )
      }

    case 'Music stands':
      return {
        dims: [0.51, 1.22, 0.40],
        model: (
          <group>
            <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.01, 0.015, 1.0]} /><meshStandardMaterial color="#111" metalness={0.6} /></mesh>
            <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]} castShadow><boxGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color="#111" metalness={0.6} /></mesh>
            <mesh position={[0, 0.05, 0]} rotation={[0, Math.PI/3, 0]} castShadow><boxGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color="#111" metalness={0.6} /></mesh>
            <mesh position={[0, 0.05, 0]} rotation={[0, -Math.PI/3, 0]} castShadow><boxGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color="#111" metalness={0.6} /></mesh>
            <group position={[0, 1.0, 0]} rotation={[-0.3, 0, 0]}>
              <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[0.51, 0.305, 0.005]} /><meshStandardMaterial color="#222" roughness={0.7} /></mesh>
              <mesh position={[0, 0, 0.02]} castShadow><boxGeometry args={[0.51, 0.02, 0.04]} /><meshStandardMaterial color="#222" roughness={0.7} /></mesh>
            </group>
          </group>
        )
      }

    case 'Piano':
      const pGold = "#cca43b";
      const pRed = "#8a0000";

      const pianoGloss = {
        color: "#020202",
        roughness: 0.05,
        metalness: 0.4,
        clearcoat: 1.0, 
        clearcoatRoughness: 0.05
      };

      // Advanced Grand Piano Shape mapping based on provided blueprints
      const pianoShape = new THREE.Shape();
      pianoShape.moveTo(-0.735, -0.45); // Front-left
      pianoShape.lineTo(0.735, -0.45);  // Front-right
      pianoShape.lineTo(0.735, -0.2);   // Straight right side
      // Bentside (swoops left/inwards)
      pianoShape.bezierCurveTo(0.735, 0.1, 0.3, 0.3, 0.3, 0.7);
      // Swoop back outwards to tail
      pianoShape.bezierCurveTo(0.3, 1.2, 0.6, 1.55, 0.0, 1.55);
      // Tail curve around to left side
      pianoShape.bezierCurveTo(-0.735, 1.55, -0.735, 1.0, -0.735, 0.7);
      // Straight line to front-left
      pianoShape.lineTo(-0.735, -0.45);

      const extrudeBody = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 };
      const extrudeLid = { depth: 0.025, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 3 };

      return {
        dims: [1.47, 1.5, 1.55], 
        model: (
          <group>
            {/* DEDICATED PIANO LIGHTING FOR HIGH-GLOSS REFLECTIONS */}
            <spotLight position={[0, 3.5, 1.5]} angle={0.8} penumbra={0.3} intensity={4.5} color="#ffffff" castShadow />
            <pointLight position={[1.5, 1.5, -1]} intensity={2.0} color="#ffebc2" distance={6} />

            {/* Keybed Base extended forward */}
            <mesh position={[0, 0.68, 0.65]} castShadow><boxGeometry args={[1.47, 0.10, 0.45]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
            
            {/* Cheek Blocks framing the keys */}
            <mesh position={[-0.673, 0.76, 0.80]} castShadow><boxGeometry args={[0.124, 0.06, 0.15]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
            <mesh position={[0.673, 0.76, 0.80]} castShadow><boxGeometry args={[0.124, 0.06, 0.15]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
            
            {/* Key Slip (front lip) */}
            <mesh position={[0, 0.73, 0.885]} castShadow><boxGeometry args={[1.47, 0.02, 0.02]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>

            {/* Sculpted Mid Body */}
            <mesh position={[0, 0.68, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
               <extrudeGeometry args={[pianoShape, extrudeBody]} />
               <meshPhysicalMaterial {...pianoGloss} />
            </mesh>
            
            {/* Red Felt Strip behind keys */}
            <mesh position={[0, 0.74, 0.715]}><boxGeometry args={[1.22, 0.02, 0.02]} /><meshStandardMaterial color={pRed} roughness={0.9} /></mesh>
            
            {/* 3D Modeled Keys */}
            {/* White Keys - Exactly 15cm (0.15m) deep */}
            {Array.from({ length: 52 }).map((_, i) => (
              <mesh key={`wk-${i}`} position={[-0.60 + (i * 0.0235), 0.74, 0.80]} receiveShadow>
                <boxGeometry args={[0.021, 0.02, 0.15]} />
                <meshStandardMaterial color="#f8f9fa" roughness={0.1} />
              </mesh>
            ))}
            
            {/* Black Keys - Exactly 9cm (0.09m) deep, raised, with standard musical gaps */}
            {Array.from({ length: 51 }).map((_, i) => {
              const noteInOctave = (i + 5) % 7; 
              if (noteInOctave === 2 || noteInOctave === 6) return null; 
              return (
                <mesh key={`bk-${i}`} position={[-0.60 + (i * 0.0235) + 0.01175, 0.755, 0.77]} castShadow>
                  <boxGeometry args={[0.012, 0.025, 0.09]} />
                  <meshStandardMaterial color="#0a0a0a" roughness={0.2} />
                </mesh>
              )
            })}

            {/* Music Desk */}
            <group position={[0, 0.95, 0.55]} rotation={[-0.25, 0, 0]}>
              <mesh castShadow><boxGeometry args={[0.8, 0.3, 0.02]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
              <mesh position={[0, -0.14, 0.05]} castShadow><boxGeometry args={[0.8, 0.02, 0.08]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
            </group>

            {/* Lid (Open) - Hinged precisely along the straight left side */}
            <group position={[-0.735, 0.93, 0]} rotation={[0, 0, 0.55]}>
               <mesh position={[0.735, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                 <extrudeGeometry args={[pianoShape, extrudeLid]} />
                 <meshPhysicalMaterial {...pianoGloss} />
               </mesh>
            </group>
            
            {/* Prop Stick - Adjusted height and angle to perfectly meet the open lid */}
            <mesh position={[0.6, 1.25, 0.1]} rotation={[0, 0, 0.1]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.65]} /><meshStandardMaterial color="#050505" /></mesh>

            {/* Legs & Casters - Adjusted to structurally balance the curve */}
            {[
              [-0.6, 0.35], 
              [0.6, 0.35],  
              [-0.1, -1.3]  
            ].map(([lx, lz], idx) => (
              <group key={`piano-leg-${idx}`} position={[lx, 0.35, lz]}>
                <mesh castShadow><boxGeometry args={[0.08, 0.6, 0.08]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
                <mesh position={[0, -0.32, 0]} castShadow rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.04, 16]} /><meshStandardMaterial color={pGold} roughness={0.3} metalness={0.8} /></mesh>
              </group>
            ))}

            {/* Pedal Lyre */}
            <group position={[0, 0.35, 0.2]}>
               <mesh castShadow><boxGeometry args={[0.15, 0.45, 0.04]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
               <mesh position={[0, -0.22, 0.02]} castShadow><boxGeometry args={[0.2, 0.04, 0.08]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
               {/* 3 Pedals */}
               {[-0.05, 0, 0.05].map((px, pIdx) => (
                 <mesh key={`pedal-${pIdx}`} position={[px, -0.25, 0.05]} castShadow><boxGeometry args={[0.015, 0.015, 0.08]} /><meshStandardMaterial color={pGold} roughness={0.3} metalness={0.8} /></mesh>
               ))}
            </group>
            
            {/* Piano Bench */}
            <group position={[0, 0.25, 1.25]}>
               <mesh castShadow><boxGeometry args={[0.6, 0.08, 0.35]} /><meshStandardMaterial color="#111" roughness={0.8} /></mesh>
               {[[-0.26, -0.13], [0.26, -0.13], [-0.26, 0.13], [0.26, 0.13]].map(([bx, bz], bIdx) => (
                 <mesh key={`bench-leg-${bIdx}`} position={[bx, -0.2, bz]} castShadow><boxGeometry args={[0.04, 0.4, 0.04]} /><meshPhysicalMaterial {...pianoGloss} /></mesh>
               ))}
            </group>
          </group>
        )
      }

    case 'Drum set':
      return {
        dims: [1.5, 1.2, 1.2],
        model: (
          <group position={[0, 0, 0]}>
            <Drum pos={[0, 0.28, 0]} rot={[Math.PI / 2, 0, 0]} radius={0.28} depth={0.43} color="#b30000" />
            <Drum pos={[0.4, 0.35, 0.25]} rot={[0.1, 0, 0]} radius={0.2} depth={0.38} color="#b30000" />
            <mesh position={[0.3, 0.15, 0.35]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
            <mesh position={[0.5, 0.15, 0.35]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
            <mesh position={[0.4, 0.15, 0.15]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
            <group position={[-0.35, 0, 0.2]}>
              <mesh position={[0, 0.225, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, 0.45]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
              <mesh position={[0, 0.01, 0]} castShadow><cylinderGeometry args={[0.15, 0.01, 0.02, 3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
              <group position={[0, 0.48, 0]} rotation={[0.1, 0, -0.1]}><Drum pos={[0, 0, 0]} rot={[0, 0, 0]} radius={0.175} depth={0.14} color="#cccccc" /></group>
            </group>
            <Drum pos={[-0.15, 0.7, -0.1]} rot={[0.2, 0.1, 0.1]} radius={0.125} depth={0.18} color="#b30000" />
            <Drum pos={[0.15, 0.72, -0.1]} rot={[0.2, -0.1, -0.1]} radius={0.15} depth={0.20} color="#b30000" />
            <mesh position={[-0.1, 0.6, -0.05]} rotation={[0, 0, 0.2]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.2]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
            <mesh position={[0.1, 0.6, -0.05]} rotation={[0, 0, -0.2]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.2]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
            <Cymbal posX={-0.6} posZ={0.1} height={0.8} tiltRot={[0, 0, -0.05]} radius={0.175} />
            <group position={[-0.6, 0.78, 0.1]} rotation={[0, 0, -0.05]}><mesh position={[0, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[0.175, 0.015, 0.005, 32]} /><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} /></mesh></group>
            <Cymbal posX={-0.45} posZ={-0.2} height={1.05} tiltRot={[0.2, 0, 0.1]} radius={0.2} />
            <Cymbal posX={0.45} posZ={-0.1} height={0.9} tiltRot={[0.15, 0, -0.1]} radius={0.25} />
            <group position={[0, 0, 0.6]}>
              <mesh position={[0, 0.01, 0]} castShadow><cylinderGeometry args={[0.15, 0.01, 0.02, 3]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
              <mesh position={[0, 0.225, 0]} castShadow><cylinderGeometry args={[0.015, 0.015, 0.45]} /><meshStandardMaterial color="#cccccc" metalness={0.8} /></mesh>
              <mesh position={[0, 0.49, 0]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 0.08, 32]} /><meshStandardMaterial color="#111111" roughness={0.8} /></mesh>
            </group>
          </group>
        )
      }

    case 'Harp':
      return {
        dims: [0.42, 1.52, 0.72],
        model: (
          <group position={[0, 0, 0]}>
             <mesh position={[0, 0.05, 0]} castShadow><boxGeometry args={[0.42, 0.1, 0.31]} /><meshStandardMaterial color="#d2b48c" roughness={0.6} /></mesh>
             <mesh position={[-0.15, 0.02, 0.10]}><cylinderGeometry args={[0.03,0.03,0.04]} /><meshStandardMaterial color="#111" /></mesh>
             <mesh position={[0.15, 0.02, 0.10]}><cylinderGeometry args={[0.03,0.03,0.04]} /><meshStandardMaterial color="#111" /></mesh>
             <mesh position={[-0.15, 0.02, -0.10]}><cylinderGeometry args={[0.03,0.03,0.04]} /><meshStandardMaterial color="#111" /></mesh>
             <mesh position={[0.15, 0.02, -0.10]}><cylinderGeometry args={[0.03,0.03,0.04]} /><meshStandardMaterial color="#111" /></mesh>
             <mesh position={[0, 0.8, 0.18]} rotation={[0.05, 0, 0]} castShadow><cylinderGeometry args={[0.025, 0.035, 1.45, 16]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
             <mesh position={[0, 0.65, -0.15]} rotation={[-0.35, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.15, 1.3, 4]} /><meshStandardMaterial color="#b59975" roughness={0.6} /></mesh>
             <mesh position={[0, 1.35, -0.05]} rotation={[-0.3, 0, 0]} castShadow><boxGeometry args={[0.06, 0.1, 0.6]} /><meshStandardMaterial color="#d2b48c" roughness={0.5} /></mesh>
             {Array.from({length: 15}).map((_, i) => {
               const p = i / 14; 
               const topZ = 0.15 - (p * 0.4); const topY = 1.45 - (p * 0.2);
               // The strings must connect directly to the inner face of the soundbox
               const botZ = -0.10 - (p * 0.2); const botY = 0.10 + (p * 0.1); 
               const height = Math.hypot(topY-botY, topZ-botZ);
               const angle = Math.atan2(botZ-topZ, botY-topY);
               return <mesh key={`hs-${i}`} position={[0, (topY + botY)/2, (topZ + botZ)/2]} rotation={[angle, 0, 0]}><cylinderGeometry args={[0.001, 0.001, height, 4]} /><meshStandardMaterial color="#e0e0e0" metalness={0.8} /></mesh>
             })}
          </group>
        )
      }

    case 'Cube (Grey)':
      return { dims: [0.5, 0.5, 0.5], model: <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Cylinder (Grey)':
      return { dims: [0.5, 0.5, 0.5], model: <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.25, 0.25, 0.5, 32]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Sphere (Grey)':
      return { dims: [0.56, 0.56, 0.56], model: <mesh position={[0, 0.28, 0]} castShadow><sphereGeometry args={[0.28, 32, 32]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Cone (Grey)':
      return { dims: [0.56, 0.5, 0.56], model: <mesh position={[0, 0.25, 0]} castShadow><coneGeometry args={[0.28, 0.5, 32]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Pyramid (Grey)':
      return { dims: [0.7, 0.5, 0.7], model: <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0, 0.35, 0.5, 4]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Rectangular Prism (Grey)':
      return { dims: [0.8, 0.3, 0.4], model: <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[0.8, 0.3, 0.4]} /><meshStandardMaterial color="#888888" /></mesh> }

    case 'Drama Chair 1 (Red)':
      return {
        dims: [0.55, 0.75, 0.53],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[-0.24, 0.21, -0.23]} castShadow><cylinderGeometry args={[0.015, 0.01, 0.42]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0.24, 0.21, -0.23]} castShadow><cylinderGeometry args={[0.015, 0.01, 0.42]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[-0.24, 0.21, 0.23]} castShadow><cylinderGeometry args={[0.015, 0.01, 0.42]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0.24, 0.21, 0.23]} castShadow><cylinderGeometry args={[0.015, 0.01, 0.42]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0, 0.43, 0]} castShadow><boxGeometry args={[0.55, 0.04, 0.53]} /><meshStandardMaterial color="#c0392b" roughness={0.7}/></mesh>
            <mesh position={[0, 0.65, -0.24]} castShadow><boxGeometry args={[0.55, 0.20, 0.04]} /><meshStandardMaterial color="#c0392b" roughness={0.7}/></mesh>
            <mesh position={[-0.24, 0.54, -0.24]} castShadow><boxGeometry args={[0.03, 0.20, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0.24, 0.54, -0.24]} castShadow><boxGeometry args={[0.03, 0.20, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
          </group>
        )
      }

    case 'Drama Chair 2 (Blue)':
      return {
        dims: [0.50, 0.83, 0.52],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[-0.22, 0.24, -0.23]} castShadow><boxGeometry args={[0.03, 0.48, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[0.22, 0.24, -0.23]} castShadow><boxGeometry args={[0.03, 0.48, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[-0.22, 0.24, 0.23]} castShadow><boxGeometry args={[0.03, 0.48, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[0.22, 0.24, 0.23]} castShadow><boxGeometry args={[0.03, 0.48, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[0, 0.48, 0]} castShadow><boxGeometry args={[0.50, 0.05, 0.52]} /><meshStandardMaterial color="#2980b9" roughness={0.8}/></mesh>
            <mesh position={[-0.22, 0.65, -0.23]} castShadow><boxGeometry args={[0.03, 0.35, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[0.22, 0.65, -0.23]} castShadow><boxGeometry args={[0.03, 0.35, 0.03]} /><meshStandardMaterial color="#d2b48c" /></mesh>
            <mesh position={[0, 0.70, -0.22]} castShadow><boxGeometry args={[0.41, 0.25, 0.04]} /><meshStandardMaterial color="#2980b9" roughness={0.8}/></mesh>
          </group>
        )
      }

    case 'Drama Chair 3 (Green)':
      return {
        dims: [0.42, 0.92, 0.49],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[-0.18, 0.22, -0.21]} castShadow><boxGeometry args={[0.025, 0.44, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0.18, 0.22, -0.21]} castShadow><boxGeometry args={[0.025, 0.44, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[-0.18, 0.22, 0.21]} castShadow><boxGeometry args={[0.025, 0.44, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0.18, 0.22, 0.21]} castShadow><boxGeometry args={[0.025, 0.44, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.15, 0.21]} castShadow><boxGeometry args={[0.335, 0.02, 0.02]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.15, -0.21]} castShadow><boxGeometry args={[0.335, 0.02, 0.02]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[-0.18, 0.15, 0]} castShadow><boxGeometry args={[0.02, 0.02, 0.395]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0.18, 0.15, 0]} castShadow><boxGeometry args={[0.02, 0.02, 0.395]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.42, 0.03, 0.49]} /><meshStandardMaterial color="#27ae60" roughness={0.9}/></mesh>
            <mesh position={[-0.18, 0.68, -0.21]} castShadow><boxGeometry args={[0.025, 0.48, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0.18, 0.68, -0.21]} castShadow><boxGeometry args={[0.025, 0.48, 0.025]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.90, -0.21]} castShadow><boxGeometry args={[0.38, 0.04, 0.02]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.55, -0.21]} castShadow><boxGeometry args={[0.38, 0.04, 0.02]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[-0.10, 0.72, -0.21]} castShadow><boxGeometry args={[0.02, 0.34, 0.015]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0, 0.72, -0.21]} castShadow><boxGeometry args={[0.02, 0.34, 0.015]} /><meshStandardMaterial color="#8d6e63" /></mesh>
            <mesh position={[0.10, 0.72, -0.21]} castShadow><boxGeometry args={[0.02, 0.34, 0.015]} /><meshStandardMaterial color="#8d6e63" /></mesh>
          </group>
        )
      }

    case 'Kitchen Cabinets':
      return {
        dims: [2.3, 2.3, 0.6],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[2.3, 0.9, 0.6]} /><meshStandardMaterial color="#4a4f54" roughness={0.8} /></mesh>
            <mesh position={[0, 0.915, 0]} castShadow receiveShadow><boxGeometry args={[2.32, 0.03, 0.62]} /><CoffeeTableWoodMaterial baseColor="#cfae68" roughness={0.4} /></mesh>
            <mesh position={[-0.5, 1.9, -0.15]} castShadow receiveShadow><boxGeometry args={[1.3, 0.8, 0.3]} /><meshStandardMaterial color="#4a4f54" roughness={0.8} /></mesh>
            <mesh position={[0.85, 1.15, 0]} castShadow receiveShadow><boxGeometry args={[0.6, 2.3, 0.6]} /><meshStandardMaterial color="#4a4f54" roughness={0.8} /></mesh>
            <mesh position={[-0.2, 0.93, 0]} castShadow><boxGeometry args={[0.4, 0.01, 0.3]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
            <mesh position={[-0.2, 1.1, -0.1]} castShadow><cylinderGeometry args={[0.01, 0.01, 0.3]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.2} /></mesh>
          </group>
        )
      }

    case 'Refrigerator':
      return {
        dims: [0.912, 1.825, 0.72],
        model: (
          <group position={[0, 1.825 / 2, 0]}>
            <mesh castShadow receiveShadow><boxGeometry args={[0.912, 1.825, 0.72]} /><meshStandardMaterial color="#7f8c8d" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[-0.23, 0.4, 0.37]} castShadow><boxGeometry args={[0.44, 1.0, 0.04]} /><meshStandardMaterial color="#bdc3c7" metalness={0.7} roughness={0.2} /></mesh>
            <mesh position={[0.23, 0.4, 0.37]} castShadow><boxGeometry args={[0.44, 1.0, 0.04]} /><meshStandardMaterial color="#bdc3c7" metalness={0.7} roughness={0.2} /></mesh>
            <mesh position={[0, -0.5, 0.37]} castShadow><boxGeometry args={[0.90, 0.75, 0.04]} /><meshStandardMaterial color="#bdc3c7" metalness={0.7} roughness={0.2} /></mesh>
            <mesh position={[-0.23, 0.3, 0.39]} castShadow><boxGeometry args={[0.15, 0.25, 0.02]} /><meshStandardMaterial color="#2c3e50" /></mesh>
          </group>
        )
      }

    case 'Television':
      return {
        dims: [1.8, 1.14, 0.5],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 0.5, 0.5]} /><meshStandardMaterial color="#e0e0e0" roughness={0.1} /></mesh>
            <mesh position={[0, 0.525, 0]} castShadow><boxGeometry args={[0.4, 0.05, 0.2]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0.575, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0.975, 0]} castShadow><boxGeometry args={[1.11, 0.697, 0.05]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
            <mesh position={[0, 0.975, 0.026]}><boxGeometry args={[1.08, 0.66, 0.001]} /><meshStandardMaterial color="#000" /></mesh>
          </group>
        )
      }

    case 'Microphones':
      return {
        dims: [0.4, 1.7, 0.4],
        model: (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.04, 32]} /><meshStandardMaterial color="#1a1a1a" roughness={0.8} /></mesh>
            <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.012, 0.015, 1.4, 16]} /><meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} /></mesh>
            <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.06]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0, 1.46, 0]} castShadow><sphereGeometry args={[0.015, 16, 16]} /><meshStandardMaterial color="#111" /></mesh>
            <group position={[0, 1.46, 0]} rotation={[0, 0, Math.PI / 4]}>
              <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.015, 0.01, 0.06]} /><meshStandardMaterial color="#111" /></mesh>
              <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.022, 0.018, 0.14]} /><meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} /></mesh>
              <mesh position={[0, 0.22, 0]} castShadow><sphereGeometry args={[0.038, 16, 16]} /><meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} wireframe /></mesh>
              <mesh position={[0, 0.22, 0]} castShadow><sphereGeometry args={[0.036, 16, 16]} /><meshStandardMaterial color="#888" metalness={0.5} roughness={0.5} /></mesh>
            </group>
          </group>
        )
      }

    case 'Stage Curtain':
      return { dims: [bounds.width, bounds.height, 0.5], model: <AnimatedCurtain isOpen={state.curtainIsOpen} bounds={bounds} duration={state.curtainDuration} /> }

    case 'Curtains / Blinds':
      return { dims: [2.44, 2.74, 0.2], model: <AnimatedWindowCurtain isOpen={state.windowCurtainIsOpen} duration={state.curtainDuration} /> }

    case 'Fake doors or window frames (flats)':
      return { dims: [1.22, 2.13, 1.22], model: <AnimatedDoorFlat isOpen={state.doorIsOpen} /> }

    case 'Floor Lamp 1 (Wood)':
      return { dims: [0.4, 1.48, 0.4], model: <InteractiveLamp type={1} /> }
      
    case 'Floor Lamp 2 (Metal)':
      return { dims: [0.4, 1.48, 0.4], model: <InteractiveLamp type={2} /> }

    default:
      return { dims: [0.8, 0.8, 0.8], model: <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#7f8c8d" roughness={0.6} /></mesh> }
  }
}

// --- ACTIVE RE-SELECTABLE CONTROLLER COMPONENT WITH BOUNDS AND TELEMETRY ---
function StageProp({ id, type, position, isSelected, onSelect, onUpdatePosition, bounds, curtainDuration }) {
  const transformRef = useRef()
  const groupRef = useRef()

  const [wardrobeIsOpen, setWardrobeIsOpen] = useState(false)
  const [nightstandDrawerIsOpen, setNightstandDrawerIsOpen] = useState(false)
  const [curtainIsOpen, setCurtainIsOpen] = useState(false)
  const [windowCurtainIsOpen, setWindowCurtainIsOpen] = useState(false)
  const [doorIsOpen, setDoorIsOpen] = useState(false)

  const { dims } = getPropSpecs(type, { wardrobeIsOpen, nightstandDrawerIsOpen, curtainIsOpen, windowCurtainIsOpen, doorIsOpen, curtainDuration }, bounds)
  const halfW = dims[0] / 2
  const halfL = dims[2] / 2

  useEffect(() => {
    const transformControls = transformRef.current
    if (transformControls) {
      const handleObjectChange = () => {
        if (groupRef.current) {
          let currentX = groupRef.current.position.x; let currentZ = groupRef.current.position.z
          const limitX = (bounds.width / 2) - halfW; const limitZ = (bounds.length / 2) - halfL
          if (currentX > limitX) currentX = limitX; if (currentX < -limitX) currentX = -limitX
          if (currentZ > limitZ) currentZ = limitZ; if (currentZ < -limitZ) currentZ = -limitZ
          groupRef.current.position.set(currentX, 0, currentZ)
          onUpdatePosition(id, [currentX, 0, currentZ])
        }
      }
      transformControls.addEventListener('objectChange', handleObjectChange)
      return () => transformControls.removeEventListener('objectChange', handleObjectChange)
    }
  }, [isSelected, id, onUpdatePosition, bounds, halfW, halfL])

  const { model } = getPropSpecs(type, { wardrobeIsOpen, nightstandDrawerIsOpen, curtainIsOpen, windowCurtainIsOpen, doorIsOpen, curtainDuration }, bounds)

  return (
    <>
      <group 
        ref={groupRef} position={position}
        onClick={(e) => {
          e.stopPropagation() 
          onSelect()
          if (type === 'Wardrobe / Dresser') setWardrobeIsOpen(!wardrobeIsOpen)
          if (type === 'Nightstand') setNightstandDrawerIsOpen(!nightstandDrawerIsOpen)
          if (type === 'Stage Curtain') setCurtainIsOpen(!curtainIsOpen)
          if (type === 'Curtains / Blinds') setWindowCurtainIsOpen(!windowCurtainIsOpen)
          if (type === 'Fake doors or window frames (flats)') setDoorIsOpen(!doorIsOpen)
        }}
      >
        {model}
        {isSelected && (
          <Html distanceFactor={7} position={[0, dims[1] + 0.3, 0]} center pointerEvents="none">
            <div style={{
              background: 'rgba(18, 18, 18, 0.95)', border: '1px solid #5c6bc0', padding: '6px 10px',
              borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#fff',
              whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(0,0,0,0.4)', display: 'flex',
              flexDirection: 'column', gap: '1px'
            }}>
              <div style={{ color: '#8c9eff', fontWeight: 'bold' }}>📡 LIVE AXIS READOUT</div>
              <div>X (Center Offset): <span style={{ color: '#00e676' }}>{position[0].toFixed(2)}m</span></div>
              <div>Z (Center Offset): <span style={{ color: '#00e676' }}>{position[2].toFixed(2)}m</span></div>
              {type === 'Wardrobe / Dresser' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to open/close doors</div>}
              {type === 'Nightstand' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to slide drawer smoothly</div>}
              {type === 'Stage Curtain' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to slide open/close stage curtain</div>}
              {type === 'Curtains / Blinds' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to slide open/close window curtain</div>}
              {type === 'Fake doors or window frames (flats)' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click to swing door open/closed</div>}
              {type === 'Floor Lamp 1 (Wood)' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click lampshade to toggle light bulb</div>}
              {type === 'Floor Lamp 2 (Metal)' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click lampshade to toggle light bulb</div>}
              {type === 'Prop tables and chairs' && <div style={{ color: '#ffeb3b', fontSize: '10px', marginTop: '2px' }}>💡 Click table ghost hitboxes to spawn chairs</div>}
              <div style={{ borderTop: '1px solid #333', marginTop: '3px', paddingTop: '3px', fontSize: '9px', color: '#999' }}>Scale: {dims[0].toFixed(2)}m × {dims[1].toFixed(2)}m × {dims[2].toFixed(2)}m</div>
            </div>
          </Html>
        )}
      </group>
      {isSelected && <TransformControls ref={transformRef} object={groupRef} mode="translate" showY={false} size={0.8} />}
    </>
  )
}

// --- STAGE PRODUCTION WORKBENCH CORE ENGINE ---
export default function App() {
  const [stageWidth, setStageWidth] = useState(15)
  const [stageHeight, setStageHeight] = useState(6)
  const [stageLength, setStageLength] = useState(10)
  const [curtainDuration, setCurtainDuration] = useState(3)
  
  const [propsList, setPropsList] = useState([])
  const [selectedPropId, setSelectedPropId] = useState(null)

  const propCategories = {
    "Living Room & Bedroom": ["Sofa / Couch", "Coffee table", "Dining table and chairs", "Bed frame and mattress", "Wardrobe / Dresser", "Bookshelf", "Nightstand"],
    "Appliances & Decor": ["Refrigerator", "Television", "Kitchen Cabinets", "Area rugs", "Curtains / Blinds", "Floor Lamp 1 (Wood)", "Floor Lamp 2 (Metal)"],
    "Backstage & Set Flats": ["Stage Curtain", "Stage couches or armchairs", "Prop tables and chairs", "Fake doors or window frames (flats)", "Cube (Grey)", "Cylinder (Grey)", "Sphere (Grey)", "Cone (Grey)", "Pyramid (Grey)", "Rectangular Prism (Grey)", "Drama Chair 1 (Red)", "Drama Chair 2 (Blue)", "Drama Chair 3 (Green)"],
    "Orchestra & Concert": ["Musician chairs", "Conductor’s podium", "Music stands", "Drum set", "Microphones", "Harp", "Piano"]
  }

  const addProp = (type) => {
    const specs = getPropSpecs(type, { curtainDuration }, { width: stageWidth, height: stageHeight, length: stageLength })
    const halfW = specs.dims[0] / 2; const halfL = specs.dims[2] / 2
    const maxSafeX = Math.max(0, (stageWidth / 2) - halfW); const maxSafeZ = Math.max(0, (stageLength / 2) - halfL)
    const targetX = (Math.random() - 0.5) * (maxSafeX * 1.2); const targetZ = (Math.random() - 0.5) * (maxSafeZ * 1.2)

    const newProp = {
      id: Date.now(), type: type,
      position: [ Math.max(-maxSafeX, Math.min(maxSafeX, targetX)), 0, Math.max(-maxSafeZ, Math.min(maxSafeZ, targetZ)) ]
    }
    setPropsList([...propsList, newProp])
    setSelectedPropId(newProp.id)
  }

  const updatePropPosition = (id, newPos) => {
    setPropsList(prev => prev.map(p => p.id === id ? { ...p, position: newPos } : p))
  }

  const selectedPropData = propsList.find(p => p.id === selectedPropId)
  const selectedSpecs = selectedPropData ? getPropSpecs(selectedPropData.type, { curtainDuration }, { width: stageWidth, height: stageHeight, length: stageLength }) : null 

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#121212', fontFamily: 'system-ui, sans-serif', color: '#e0e0e0', overflow: 'hidden' }}>
      
      {/* SIDEBAR PROPERTIES PANEL */}
      <div style={{ width: '360px', padding: '24px', background: '#1e1e1e', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '4px 0 15px rgba(0,0,0,0.5)', zIndex: 10, overflowY: 'auto' }}>
        <h2 style={{ margin: '0', fontSize: '22px', fontWeight: '700', color: '#fff' }}>🎭 Stage Studio Pro</h2>
        <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>Engineered deck layout workbench with bound constraints.</p>
        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '5px 0' }} />

        <div>
          <h3 style={{ fontSize: '14px', color: '#bbb', marginBottom: '12px' }}>Stage Scale & Config</h3>
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
            <div style={{ marginTop: '8px', padding: '10px', background: '#222', borderRadius: '6px', border: '1px solid #444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#ffeb3b' }}><span>Curtain Transition Time</span><strong>{curtainDuration}s</strong></div>
              <input type="range" min="1" max="15" step="0.5" value={curtainDuration} onChange={(e) => setCurtainDuration(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {selectedPropData && selectedSpecs && (
          <div style={{ padding: '16px', background: '#2c3e50', borderRadius: '8px', border: '1px solid #34495e', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', textTransform: 'uppercase' }}>📏 Blueprint Dimensions</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#ecf0f1', fontFamily: 'monospace' }}>
              <div><strong>Class:</strong> {selectedPropData.type}</div>
              <div><strong>Dim X (W):</strong> {selectedSpecs.dims[0].toFixed(2)} m</div>
              <div><strong>Dim Y (H):</strong> {selectedSpecs.dims[1].toFixed(2)} m</div>
              <div><strong>Dim Z (L):</strong> {selectedSpecs.dims[2].toFixed(2)} m</div>
            </div>
            <button onClick={() => setPropsList(propsList.filter(p => p.id !== selectedPropId))} style={{ ...propBtnStyle, background: '#c0392b', color: '#fff', marginTop: '6px', textAlign: 'center' }}>Delete Selected Object</button>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '5px 0' }} />

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
          <ambientLight intensity={0.3} />
          <directionalLight position={[0, stageHeight, stageLength]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} />
          <directionalLight position={[10, 5, -5]} intensity={0.15} />

          <mesh position={[0, stageHeight / 2, -stageLength / 2]}><planeGeometry args={[stageWidth, stageHeight]} /><meshStandardMaterial color="#222" roughness={0.9} /></mesh>
          <mesh position={[-stageWidth / 2, stageHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[stageLength, stageHeight]} /><meshStandardMaterial color="#1e1e1e" roughness={0.9} /></mesh>
          <mesh position={[stageWidth / 2, stageHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[stageLength, stageHeight]} /><meshStandardMaterial color="#1e1e1e" roughness={0.9} /></mesh>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} onClick={() => setSelectedPropId(null)} receiveShadow>
            <planeGeometry args={[stageWidth, stageLength]} />
            <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
          </mesh>

          <Grid args={[stageWidth, stageLength]} sectionColor="#7f8c8d" cellColor="#3a3a3a" sectionSize={1} cellSize={0.5} position={[0, 0, 0]} infiniteGrid={false} />

          {propsList.map((prop) => (
            <StageProp
              key={prop.id} id={prop.id} type={prop.type} position={prop.position}
              isSelected={selectedPropId === prop.id} onSelect={() => setSelectedPropId(prop.id)}
              onUpdatePosition={updatePropPosition} bounds={{ width: stageWidth, height: stageHeight, length: stageLength }} curtainDuration={curtainDuration}
            />
          ))}
          <OrbitControls makeDefault minDistance={4} maxDistance={45} maxPolarAngle={Math.PI / 2 - 0.05} />
        </Canvas>
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'rgba(20,20,20,0.85)', padding: '12px 18px', borderRadius: '30px', fontSize: '12px', color: '#bbb', pointerEvents: 'none', border: '1px solid #333' }}>
          💡 <strong>Left-Click + Drag</strong> backdrops to rotate camera | <strong>Click object</strong> to activate movement handles.
        </div>
      </div>
    </div>
  )
}

const propBtnStyle = { width: '100%', padding: '8px 12px', background: '#2c2c2c', color: '#ccc', border: '1px solid #3a3a3a', borderRadius: '4px', textAlign: 'left', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s ease' }