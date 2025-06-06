import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2, Play, Square, X } from "lucide-react"

interface SampleSettingsProps {
  sample: {
    id: string
    name: string
    buffer: AudioBuffer | null
    key: string
    color: string
  }
  volume: number
  onVolumeChange: (value: number) => void
  isLooping: boolean
  onLoopingChange: (value: boolean) => void
  isPolyphonic: boolean
  onPolyphonicChange: (value: boolean) => void
  onPlay: () => void
  onStop: () => void
}

export default function SampleSettings({
  sample,
  volume,
  onVolumeChange,
  isLooping,
  onLoopingChange,
  isPolyphonic,
  onPolyphonicChange,
  onPlay,
  onStop,
}: SampleSettingsProps) {
  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${sample.color}`} />
            {sample.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Volume Control */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Volume
          </Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[volume]}
              onValueChange={([value]) => onVolumeChange(value)}
              max={1}
              step={0.01}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPlay}
            className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={onStop}
            className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>

        {/* Playback Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Loop Sample</Label>
            <Switch
              checked={isLooping}
              onCheckedChange={onLoopingChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Polyphonic Mode</Label>
            <Switch
              checked={isPolyphonic}
              onCheckedChange={onPolyphonicChange}
            />
          </div>
          <div className="text-xs text-zinc-400">
            {isPolyphonic 
              ? "Multiple notes can play simultaneously" 
              : "New notes will cut off previous ones"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 