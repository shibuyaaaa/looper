"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Upload, Volume2, VolumeX } from "lucide-react"

interface TrackProps {
  track: {
    id: number
    audio: File | null
    buffer: AudioBuffer | null
  }
  onFileUpload: (file: File) => void
  isPlaying: boolean
  currentTime: number
  duration: number
}

export default function TrackComponent({ track, onFileUpload, isPlaying, currentTime, duration }: TrackProps) {
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Draw waveform when track buffer changes
  useEffect(() => {
    if (track.buffer && canvasRef.current) {
      drawWaveform(track.buffer)
    }
  }, [track.buffer])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileUpload(files[0])
    }
  }

  const drawWaveform = (audioBuffer: AudioBuffer) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Get the audio data
    const channelData = audioBuffer.getChannelData(0) // Use first channel
    const step = Math.ceil(channelData.length / canvas.width)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set drawing style
    ctx.lineWidth = 1
    ctx.strokeStyle = "#4ade80" // Green color
    ctx.beginPath()

    // Draw the waveform
    const middle = canvas.height / 2
    for (let i = 0; i < canvas.width; i++) {
      const index = Math.floor(i * step)
      const value = channelData[index] * middle // Scale to half the canvas height

      // Draw a vertical line from the middle
      ctx.moveTo(i, middle - value)
      ctx.lineTo(i, middle + value)
    }

    ctx.stroke()
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (value[0] > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Calculate playhead position
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 flex flex-col items-center">
            <span className="text-sm mb-2">Track {track.id}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full bg-zinc-700 hover:bg-zinc-600 border-0"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
          </div>

          <div className="flex-1 relative">
            <div className="h-20 bg-zinc-900 rounded-md overflow-hidden relative">
              {track.buffer ? (
                <>
                  <canvas ref={canvasRef} width={800} height={80} className="w-full h-full" />
                  {isPlaying && (
                    <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${playheadPosition}%` }} />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  {track.audio ? "Processing audio..." : "No audio loaded"}
                </div>
              )}
            </div>
            <div className="mt-2 text-xs truncate">{track.audio ? track.audio.name : "No file selected"}</div>
          </div>

          <div className="w-32 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

