"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Square, Play, Pause, Trash2, Pencil } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SavedLoop {
  id: string
  name: string
  events: { sampleId: string; time: number }[]
  duration: number
  createdAt: Date
}

interface LoopRecorderProps {
  isRecording: boolean
  isPlaying: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onPlayLoop: (loopId: string) => void
  onStopLoop: () => void
  onClearLoop: (loopId: string) => void
  onRenameLoop: (loopId: string, newName: string) => void
  savedLoops: SavedLoop[]
  currentlyPlayingLoop: string | null
}

export default function LoopRecorder({
  isRecording,
  isPlaying,
  onStartRecording,
  onStopRecording,
  onPlayLoop,
  onStopLoop,
  onClearLoop,
  onRenameLoop,
  savedLoops,
  currentlyPlayingLoop,
}: LoopRecorderProps) {
  const [editingLoopId, setEditingLoopId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // Update progress bar during playback
  useEffect(() => {
    if (isPlaying && currentlyPlayingLoop) {
      const loop = savedLoops.find(l => l.id === currentlyPlayingLoop)
      if (!loop) return

      const startTime = Date.now()
      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = (elapsed % loop.duration) / loop.duration
        setProgress(newProgress)
      }, 50)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }
      if (!isPlaying) {
        setProgress(0)
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, currentlyPlayingLoop, savedLoops])

  const handleRenameStart = (loop: SavedLoop) => {
    setEditingLoopId(loop.id)
    setEditingName(loop.name)
  }

  const handleRenameSubmit = (loopId: string) => {
    if (editingName.trim()) {
      onRenameLoop(loopId, editingName.trim())
      setEditingLoopId(null)
    }
  }

  const handlePlayPause = () => {
    if (!selectedLoop) return
    if (isPlaying && currentlyPlayingLoop === selectedLoop) {
      onStopLoop()
    } else {
      onPlayLoop(selectedLoop)
    }
  }

  const handleStop = () => {
    onStopLoop()
    setProgress(0)
  }

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Loop Recorder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls and Progress Bar */}
        <div className="flex items-center gap-4">
          <Button
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`h-12 w-12 ${isRecording ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-zinc-700'}`}
          >
            <Mic className={`h-6 w-6 ${isRecording ? 'text-red-500' : 'text-zinc-400'}`} />
          </Button>
          <div className="flex-1">
            <Slider
              value={[progress * 100]}
              max={100}
              step={0.1}
              className="w-full [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:border-zinc-600 [&_[role=slider]]:hover:bg-zinc-300 [&_[role=slider]]:focus:ring-zinc-400 [&_[role=slider]]:focus:ring-offset-zinc-800 [&_[role=slider]]:focus:ring-offset-2 [&_[role=slider]]:focus:ring-2"
              disabled
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            disabled={!selectedLoop}
            className="h-12 w-12"
          >
            {isPlaying && currentlyPlayingLoop === selectedLoop ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            disabled={!isPlaying}
            className="h-12 w-12"
          >
            <Square className="h-6 w-6" />
          </Button>
        </div>

        {/* Saved Loops List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">Saved Loops</h3>
          <div className="space-y-1">
            {savedLoops.map((loop) => (
              <div
                key={loop.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  loop.id === currentlyPlayingLoop 
                    ? 'bg-red-950/50 border border-red-900/50' 
                    : loop.id === selectedLoop 
                      ? 'bg-zinc-700 border border-zinc-600' 
                      : 'bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/30 hover:border-zinc-700/50'
                }`}
                onClick={() => setSelectedLoop(loop.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {editingLoopId === loop.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(loop.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(loop.id)}
                      className="bg-zinc-800 text-white px-2 py-1 rounded text-sm flex-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`text-sm ${loop.id === currentlyPlayingLoop ? 'text-red-200' : 'text-zinc-400'}`}>
                      {loop.name}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRenameStart(loop)
                    }}
                    className="p-1 hover:bg-zinc-700/50 rounded"
                  >
                    <Pencil className="h-3 w-3 text-zinc-500" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearLoop(loop.id)
                  }}
                  className="h-8 w-8 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {savedLoops.length === 0 && (
              <div className="text-sm text-zinc-500 text-center py-4">
                No saved loops yet. Record a sequence to get started.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

