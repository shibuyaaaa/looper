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

function AudioVisualizer({ analyserNode, activeVisualizers }: VisualizerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const dataArray = useRef<Uint8Array | null>(null)
  const bufferLength = useRef<number>(0)

  // Initialize data array for frequency analysis
  useEffect(() => {
    if (analyserNode) {
      bufferLength.current = analyserNode.frequencyBinCount
      dataArray.current = new Uint8Array(bufferLength.current)
    }
  }, [analyserNode])

  // Animation frame update
  useFrame(() => {
    if (!analyserNode || !dataArray.current || !meshRef.current || !particlesRef.current) return

    // Get frequency data
    analyserNode.getByteFrequencyData(dataArray.current)

    // Calculate average frequency value
    let sum = 0
    for (let i = 0; i < bufferLength.current; i++) {
      sum += dataArray.current[i]
    }
    const average = sum / bufferLength.current

    // Update main sphere
    if (meshRef.current) {
      // Scale based on audio intensity
      const scale = 1 + average / 256
      meshRef.current.scale.set(scale, scale, scale)

      // Rotate slowly
      meshRef.current.rotation.y += 0.01
      meshRef.current.rotation.x += 0.005
    }

    // Update particles
    if (particlesRef.current && particlesRef.current.geometry instanceof THREE.BufferGeometry) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array

      // Update particle positions based on frequency data
      for (let i = 0; i < positions.length; i += 3) {
        const index = Math.floor(i / 3) % bufferLength.current
        const value = dataArray.current[index] / 50

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

        // New position based on audio data
        positions[i] = nx * (2 + value)
        positions[i + 1] = ny * (2 + value)
        positions[i + 2] = nz * (2 + value)
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <>
      {/* Main sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color={getColorFromClass(activeVisualizers[0]?.color)} wireframe={true} emissive={getColorFromClass(activeVisualizers[0]?.color)} emissiveIntensity={0.5} />
      </mesh>

      {/* Particles */}
      <points ref={particlesRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <pointsMaterial size={0.05} color={getColorFromClass(activeVisualizers[0]?.color)} sizeAttenuation={true} />
      </points>

      {/* Ambient light */}
      <ambientLight intensity={0.2} />

      {/* Point light */}
      <pointLight position={[10, 10, 10]} intensity={1} color={getColorFromClass(activeVisualizers[0]?.color)} />
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

