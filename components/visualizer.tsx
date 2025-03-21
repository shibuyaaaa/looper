"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

interface VisualizerProps {
  analyserNode: AnalyserNode | null
  activeVisualizers: {
    id: string
    color: string
    intensity: number
  }[]
}

// Convert CSS color class to THREE.js color
const getColorFromClass = (colorClass?: string) => {
  if (!colorClass) return new THREE.Color(0x3b82f6) // Default blue

  const colorMap: Record<string, number> = {
    "bg-red-500": 0xef4444,
    "bg-blue-500": 0x3b82f6,
    "bg-green-500": 0x22c55e,
    "bg-yellow-500": 0xeab308,
    "bg-purple-500": 0xa855f7,
    "bg-pink-500": 0xec4899,
    "bg-indigo-500": 0x6366f1,
    "bg-cyan-500": 0x06b6d4,
    "bg-orange-500": 0xf97316,
    "bg-lime-500": 0x84cc16,
    "bg-emerald-500": 0x10b981,
    "bg-teal-500": 0x14b8a6,
    "bg-violet-500": 0x8b5cf6,
    "bg-fuchsia-500": 0xd946ef,
    "bg-rose-500": 0xf43f5e,
    "bg-amber-500": 0xf59e0b,
  }

  return new THREE.Color(colorMap[colorClass] || 0x3b82f6)
}

// Add a function to blend colors
const blendColors = (visualizers: VisualizerProps["activeVisualizers"]) => {
  if (visualizers.length === 0) return new THREE.Color(0x3b82f6)

  if (visualizers.length === 1) {
    return getColorFromClass(visualizers[0].color)
  }

  // Blend multiple colors
  let r = 0,
    g = 0,
    b = 0
  let totalIntensity = 0

  visualizers.forEach((v) => {
    const color = getColorFromClass(v.color)
    const weight = v.intensity

    r += color.r * weight
    g += color.g * weight
    b += color.b * weight
    totalIntensity += weight
  })

  if (totalIntensity > 0) {
    r /= totalIntensity
    g /= totalIntensity
    b /= totalIntensity
  }

  return new THREE.Color(r, g, b)
}

function AudioVisualizer({ analyserNode, activeVisualizers }: VisualizerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const dataArray = useRef<Uint8Array | null>(null)
  const bufferLength = useRef<number>(0)
  const blendedColor = blendColors(activeVisualizers)

  // Initialize data array for frequency analysis
  useEffect(() => {
    if (analyserNode) {
      bufferLength.current = analyserNode.frequencyBinCount
      dataArray.current = new Uint8Array(bufferLength.current)
    }
  }, [analyserNode])

  // Animation frame update
  useFrame((state) => {
    if (!analyserNode || !dataArray.current) return

    // Get frequency data
    analyserNode.getByteFrequencyData(dataArray.current)

    // Calculate average frequency values for different bands
    const bands = [
      { start: 0, end: 3 }, // Sub bass
      { start: 4, end: 7 }, // Bass
      { start: 8, end: 15 }, // Low mids
      { start: 16, end: 31 }, // Mids
      { start: 32, end: 63 }, // High mids
      { start: 64, end: 127 }, // Highs
    ]

    const bandValues = bands.map((band) => {
      let sum = 0
      for (let i = band.start; i <= band.end; i++) {
        sum += dataArray.current![i]
      }
      return sum / (band.end - band.start + 1)
    })

    // Calculate overall average
    let sum = 0
    for (let i = 0; i < bufferLength.current; i++) {
      sum += dataArray.current[i]
    }
    const average = sum / bufferLength.current

    // Update main sphere based on overall intensity and active visualizers
    if (meshRef.current) {
      // Base scale on audio intensity
      const baseScale = 1 + average / 256

      // Add extra scale for each active visualizer
      const extraScale = activeVisualizers.length * 0.05

      const scale = baseScale + extraScale
      meshRef.current.scale.set(scale, scale, scale)

      // Update material color
      if (meshRef.current.material instanceof THREE.Material) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial
        material.color = blendedColor
        material.emissive = blendedColor
        material.emissiveIntensity = 0.5 + activeVisualizers.length * 0.1
      }

      // Rotate based on active visualizers
      const rotationSpeed = 0.01 + activeVisualizers.length * 0.002
      meshRef.current.rotation.y += rotationSpeed
      meshRef.current.rotation.x += rotationSpeed / 2
    }

    // Update particles
    if (particlesRef.current && particlesRef.current.geometry instanceof THREE.BufferGeometry) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array

      // Update particle positions based on frequency data and active visualizers
      for (let i = 0; i < positions.length; i += 3) {
        const index = Math.floor(i / 3) % bufferLength.current

        // Get the frequency band for this particle
        const bandIndex = Math.floor((index / bufferLength.current) * bands.length)
        const bandValue = bandValues[bandIndex] || 0

        // Base value from audio data
        const value = bandValue / 50

        // Add extra value for each active visualizer
        const extraValue = activeVisualizers.length * 0.2

        // Original position
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]

        // Distance from center
        const distance = Math.sqrt(x * x + y * y + z * z)

        // Normalize direction vector
        const nx = x / distance
        const ny = y / distance
        const nz = z / distance

        // New position based on audio data and active visualizers
        positions[i] = nx * (2 + value + extraValue)
        positions[i + 1] = ny * (2 + value + extraValue)
        positions[i + 2] = nz * (2 + value + extraValue)
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true

      // Update particle material color
      if (particlesRef.current.material instanceof THREE.Material) {
        const material = particlesRef.current.material as THREE.PointsMaterial
        material.color = blendedColor
      }
    }

    // Update ring
    if (ringRef.current) {
      // Scale based on bass frequencies
      const bassValue = bandValues[0] / 128
      const ringScale = 2.5 + bassValue + activeVisualizers.length * 0.2
      ringRef.current.scale.set(ringScale, ringScale, ringScale)

      // Rotate in opposite direction
      ringRef.current.rotation.z += 0.01

      // Update material
      if (ringRef.current.material instanceof THREE.Material) {
        const material = ringRef.current.material as THREE.MeshBasicMaterial
        material.color = blendedColor
        material.opacity = 0.3 + bassValue * 0.3 + activeVisualizers.length * 0.05
      }
    }

    // Update point light color
    state.scene.children.forEach((child) => {
      if (child instanceof THREE.PointLight) {
        child.color = blendedColor
        child.intensity = 1 + activeVisualizers.length * 0.2
      }
    })
  })

  return (
    <>
      {/* Main sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={blendedColor}
          wireframe={true}
          emissive={blendedColor}
          emissiveIntensity={0.5 + activeVisualizers.length * 0.1}
        />
      </mesh>

      {/* Particles */}
      <points ref={particlesRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <pointsMaterial size={0.05} color={blendedColor} sizeAttenuation={true} />
      </points>

      {/* Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 32]} />
        <meshBasicMaterial color={blendedColor} transparent={true} opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Add visual elements for each active visualizer */}
      {activeVisualizers.map((vis, index) => (
        <mesh
          key={vis.id + index}
          position={[Math.sin(index * Math.PI * 0.5) * 3, Math.cos(index * Math.PI * 0.5) * 3, 0]}
          scale={0.3 + vis.intensity * 0.2}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={getColorFromClass(vis.color)}
            emissive={getColorFromClass(vis.color)}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

      {/* Ambient light */}
      <ambientLight intensity={0.2} />

      {/* Point light */}
      <pointLight position={[10, 10, 10]} intensity={1 + activeVisualizers.length * 0.2} color={blendedColor} />
    </>
  )
}

export default function Visualizer({ analyserNode, activeVisualizers }: VisualizerProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <AudioVisualizer analyserNode={analyserNode} activeVisualizers={activeVisualizers} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  )
}