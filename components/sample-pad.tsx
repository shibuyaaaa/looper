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
  onRemove: () => void
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
}

export default function SamplePad({ sample, onPlay, onLoad, onRemove, isActive, isSelected, onSelect }: SamplePadProps) {
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

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-200 transform group",
        sample.color,
        isActive ? "scale-95" : "hover:brightness-110",
        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-zinc-800"
      )}
    >
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
            <button
              onClick={handleRemove}
              className="absolute bottom-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
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

