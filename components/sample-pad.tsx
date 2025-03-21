"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface SamplePadProps {
  sample: {
    id: string
    name: string
    buffer: AudioBuffer | null
    key: string
    color: string
  }
  onPlay: () => void
  onLoad: (file: File) => void
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
  progress?: number // 0 to 1
}

export default function SamplePad({ sample, onPlay, onLoad, isActive, isSelected, onSelect, progress = 0 }: SamplePadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onLoad(files[0])
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onSelect()
    } else if (sample.buffer) {
      onPlay()
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-200 transform",
        sample.color,
        isActive ? "scale-95 brightness-150" : "hover:brightness-110",
        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-zinc-800"
      )}
    >
      {/* Progress Border */}
      {sample.buffer && (
        <div
          className="absolute inset-0 border-4 border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          style={{
            clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${100 - progress * 100}%)`,
            transition: "clip-path 0.05s linear",
          }}
        />
      )}
      <div
        className="aspect-square flex flex-col items-center justify-center p-2 cursor-pointer"
        onClick={handleClick}
      >
        <div className="absolute top-2 right-2 bg-black/30 rounded-full px-2 py-1 text-xs font-mono">
          {sample.key.toUpperCase()}
        </div>

        {sample.buffer ? (
          <>
            <Play className="h-8 w-8 mb-2" />
            <div className="text-xs text-center truncate w-full">{sample.name}</div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 mb-2" />
            <div className="text-xs text-center">Load Sample</div>
          </>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
    </div>
  )
}

