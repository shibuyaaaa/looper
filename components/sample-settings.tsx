import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2, VolumeX, Play, Square } from "lucide-react"

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
  isCuttingOff: boolean
  onCuttingOffChange: (value: boolean) => void
  onPlay: () => void
  onStop: () => void
  progress?: number // 0 to 1
}

export default function SampleSettings({
  sample,
  volume,
  onVolumeChange,
  isLooping,
  onLoopingChange,
  isCuttingOff,
  onCuttingOffChange,
  onPlay,
  onStop,
  progress = 0,
}: SampleSettingsProps) {
  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${sample.color}`} />
          {sample.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/30 rounded-full transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

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
            <Label>Cut Off Previous</Label>
            <Switch
              checked={isCuttingOff}
              onCheckedChange={onCuttingOffChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 