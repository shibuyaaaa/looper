"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

interface KnobProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  size?: number
  color?: string
  label?: string
}

export function Knob({ value, min, max, onChange, size = 60, color = "#ffffff", label }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startValueRef = useRef<number>(value)

  // Convert value to angle (0 to 270 degrees)
  const getAngle = () => {
    const range = max - min
    const valuePercent = (value - min) / range
    return valuePercent * 270 - 135 // -135 to 135 degrees
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startYRef.current = e.clientY
    startValueRef.current = value
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    // Calculate value change based on vertical mouse movement
    // Moving up increases value, moving down decreases
    const deltaY = startYRef.current - e.clientY
    const range = max - min
    const valueChange = (deltaY / 100) * range

    // Calculate new value and clamp it to min/max
    let newValue = startValueRef.current + valueChange
    newValue = Math.max(min, Math.min(max, newValue))

    onChange(Math.round(newValue))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const angle = getAngle()
  const knobSize = size
  const indicatorSize = size * 0.1
  const indicatorDistance = size * 0.4

  // Calculate indicator position
  const indicatorX = Math.sin((angle * Math.PI) / 180) * indicatorDistance
  const indicatorY = -Math.cos((angle * Math.PI) / 180) * indicatorDistance

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-xs mb-1 text-zinc-400">{label}</div>}
      <div
        ref={knobRef}
        className="relative rounded-full cursor-pointer"
        style={{
          width: knobSize,
          height: knobSize,
          backgroundColor: "#2a2a2a",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Knob indicator */}
        <div
          className="absolute rounded-full"
          style={{
            width: indicatorSize,
            height: indicatorSize,
            backgroundColor: color,
            left: "50%",
            top: "50%",
            transform: `translate(${indicatorX}px, ${indicatorY}px)`,
            marginLeft: -indicatorSize / 2,
            marginTop: -indicatorSize / 2,
          }}
        />

        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: knobSize * 0.15,
            height: knobSize * 0.15,
            backgroundColor: "#1a1a1a",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  )
}

