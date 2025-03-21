"use client"

import { Button } from "@/components/ui/button"
import { RepeatIcon as Record, Play, Square, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoopRecorderProps {
  isRecording: boolean
  isPlaying: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onPlayLoop: () => void
  onStopLoop: () => void
  onClearRecording: () => void
  recordedEvents: number
}

export default function LoopRecorder({
  isRecording,
  isPlaying,
  onStartRecording,
  onStopRecording,
  onPlayLoop,
  onStopLoop,
  onClearRecording,
  recordedEvents,
}: LoopRecorderProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold mb-4">Loop Recorder</h2>

      <div className="flex items-center gap-4">
        {/* Record button */}
        {!isRecording ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onStartRecording}
            disabled={isPlaying}
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 border-0"
          >
            <Record className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={onStopRecording}
            className={cn("h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 border-0", "animate-pulse")}
          >
            <Square className="h-6 w-6" />
          </Button>
        )}

        {/* Play/Stop button */}
        {!isPlaying ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onPlayLoop}
            disabled={isRecording || recordedEvents === 0}
            className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 border-0"
          >
            <Play className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={onStopLoop}
            className="h-12 w-12 rounded-full bg-yellow-600 hover:bg-yellow-700 border-0"
          >
            <Square className="h-6 w-6" />
          </Button>
        )}

        {/* Clear button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onClearRecording}
          disabled={isRecording || isPlaying || recordedEvents === 0}
          className="h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 border-0"
        >
          <Trash2 className="h-6 w-6" />
        </Button>

        <div className="ml-4 flex flex-col">
          <div className="text-sm text-zinc-400">
            {isRecording ? (
              <span className="text-red-500 font-bold">Recording...</span>
            ) : isPlaying ? (
              <span className="text-green-500 font-bold">Playing loop...</span>
            ) : recordedEvents > 0 ? (
              <span>Ready to play</span>
            ) : (
              <span>No recorded loop</span>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {recordedEvents > 0 ? `${recordedEvents} events recorded` : "Press record and play samples"}
          </div>
        </div>
      </div>
    </div>
  )
}

