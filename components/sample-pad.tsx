"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Play, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface SamplePadProps {
  sample: {
    id: string
    name: string
    buffer: AudioBuffer | null
    key: string
    color: string
    isSynth: boolean
  }
  onPlay: () => void
  onLoad: (file: File) => void
  onRemove: () => void
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
  onGenerateSound?: (text: string, duration: number) => Promise<void>
}

export default function SamplePad({ sample, onPlay, onLoad, onRemove, isActive, isSelected, onSelect, onGenerateSound }: SamplePadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{id: number, x: number, y: number}>>([])  
  const [rippleCount, setRippleCount] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onLoad(files[0])
    }
  }

  // Create ripple effect at click position
  const createRipple = (e: React.MouseEvent) => {
    const button = padRef.current
    if (!button) return
    
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = {
      id: rippleCount,
      x,
      y
    }
    
    setRipples(prev => [...prev, newRipple])
    setRippleCount(prev => prev + 1)
    
    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600) // Match this with the CSS animation duration
  }

  const handleClick = (e: React.MouseEvent) => {
    // Create ripple effect
    createRipple(e)
    
    // Set pressed state
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)
    
    if (e.ctrlKey || e.metaKey) {
      onSelect()
    } else if (sample.buffer) {
      onPlay()
    } else if (onGenerateSound) {
      setPromptDialogOpen(true)
    } else {
      fileInputRef.current?.click()
    }
  }
  
  const handleGenerateSound = async () => {
    if (!prompt.trim() || !onGenerateSound || isGenerating) return
    
    try {
      setIsGenerating(true)
      await onGenerateSound(prompt, duration)
      setPromptDialogOpen(false)
      setPrompt('')
    } catch (error) {
      console.error('Error generating sound:', error)
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Handle Enter key press in the dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerateSound()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  // Clean up ripples when component unmounts
  useEffect(() => {
    return () => {
      setRipples([])
    }
  }, [])

  return (
    <div
      ref={padRef}
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-200 transform group",
        sample.color,
        isActive ? "scale-95" : "hover:brightness-110",
        isPressed && "scale-95 brightness-90",
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

        {(sample.buffer || sample.isSynth) ? (
          <>
            <Play className="h-8 w-8 mb-2" />
            <div className="text-xs text-center truncate w-full">{sample.name}</div>
            {!sample.isSynth && (
              <button
                onClick={handleRemove}
                className="absolute bottom-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <div className="absolute bottom-2 left-2 text-[10px] text-white/60 opacity-0 group-hover:opacity-100 transition-all duration-200">
              Ctrl/⌘ + Click
            </div>
          </>
        ) : onGenerateSound ? (
          <>
            <Sparkles className="h-8 w-8 mb-2" />
            <div className="text-xs text-center">Generate Sound</div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 mb-2" />
            <div className="text-xs text-center">Load Sample</div>
          </>
        )}
      </div>

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span 
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x - 50, // Center the ripple (100px width/2)
            top: ripple.y - 50,  // Center the ripple (100px height/2)
            width: '100px',
            height: '100px'
          }}
        />
      ))}
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
      
      {/* Sound Generation Dialog */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Sound Effect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe the sound you want</Label>
              <Input
                id="prompt"
                placeholder="E.g., 'A deep bass drum with reverb' or 'A spaceship taking off'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <span className="text-sm text-muted-foreground">{duration}s</span>
              </div>
              <Slider
                id="duration"
                min={1}
                max={10}
                step={1}
                value={[duration]}
                onValueChange={(value) => setDuration(value[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateSound} disabled={!prompt.trim() || isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

