"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import SamplePad from "@/components/sample-pad"
import Visualizer from "@/components/visualizer"
import LoopRecorder from "@/components/loop-recorder"
import { useToast } from "@/hooks/use-toast"
import SampleSettings from "@/components/sample-settings"

// Define default samples
const DEFAULT_SAMPLES = [
  { name: "Kick", file: "kick.wav" },
  { name: "Snare", file: "snare.wav" },
  { name: "HiHat", file: "hihat.wav" },
  { name: "Clap", file: "clap.wav" },
  { name: "Bdim_chord", file: "Bdim_chord.wav" },
  { name: "C_chord", file: "C_chord.wav" },
  { name: "Em_chord", file: "Em_chord.wav" },
  { name: "G_chord", file: "G_chord.wav" },
]

// Define chord frequencies (in Hz) for A minor scale
const CHORDS = {
  I: [220.00, 261.63, 329.63],    // A minor (A, C, E)
  II: [246.94, 293.66, 369.99],   // B diminished (B, D, F)
  IV: [293.66, 349.23, 440.00],   // D minor (D, F, A)
  V: [329.63, 392.00, 493.88],    // E minor (E, G, B)
}

// Define the sample interface
interface Sample {
  id: string
  name: string
  buffer: AudioBuffer | null
  key: string
  color: string
  volume: number
  isLooping: boolean
  isCuttingOff: boolean
  sourceNode: AudioBufferSourceNode | null
  gainNode: GainNode | null
  isSynth?: boolean
  chordFrequencies?: number[]
  defaultSampleFile?: string
}

// Define the loop interface
interface SavedLoop {
  id: string
  name: string
  events: { sampleId: string; time: number }[]
  duration: number
  createdAt: Date
}

// Available colors for sample pads
const padColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-amber-500",
]

// Default key mapping (4x4 grid)
const defaultKeys = ["1", "2", "3", "4", "q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"]

export default function SamplePadApp() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedSequence, setRecordedSequence] = useState<{ sampleId: string; time: number }[]>([])
  const [recordStartTime, setRecordStartTime] = useState(0)
  const [activeVisualizers, setActiveVisualizers] = useState<{ id: string; color: string; intensity: number }[]>([])
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [currentlyPlayingLoop, setCurrentlyPlayingLoop] = useState<string | null>(null)

  const audioContext = useRef<AudioContext | null>(null)
  const analyserNode = useRef<AnalyserNode | null>(null)
  const loopInterval = useRef<NodeJS.Timeout | null>(null)
  const visualizerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Create analyzer node for visualizations
    if (audioContext.current) {
      analyserNode.current = audioContext.current.createAnalyser()
      analyserNode.current.fftSize = 256
      analyserNode.current.connect(audioContext.current.destination)
    }

    // Initialize with empty sample pads
    const initialSamples: Sample[] = defaultKeys.map((key, index) => {
      // Check if this is one of the bottom eight pads (for default samples)
      const isDefaultSample = index >= 8
      const defaultSampleIndex = index - 8
      const defaultSample = isDefaultSample ? DEFAULT_SAMPLES[defaultSampleIndex] : null

      // Check if this is one of the bottom four pads (for chords)
      const isBottomPad = index >= 12
      const chordType = isBottomPad ? Object.keys(CHORDS)[index - 12] : null

      return {
        id: `sample-${index}`,
        name: isBottomPad 
          ? `Chord ${chordType}` 
          : isDefaultSample 
            ? defaultSample!.name 
            : `Empty Pad ${index + 1}`,
        buffer: null,
        key: key,
        color: padColors[index % padColors.length],
        volume: 1.0,
        isLooping: false,
        isCuttingOff: false,
        sourceNode: null,
        gainNode: null,
        isSynth: isBottomPad,
        chordFrequencies: isBottomPad ? CHORDS[chordType as keyof typeof CHORDS] : undefined,
        defaultSampleFile: isDefaultSample ? defaultSample!.file : undefined,
      }
    })

    setSamples(initialSamples)

    // Load default samples
    const loadDefaultSamples = async () => {
      for (let i = 0; i < initialSamples.length; i++) {
        const sample = initialSamples[i]
        if (sample.defaultSampleFile) {
          try {
            const response = await fetch(`/samples/${sample.defaultSampleFile}`)
            const arrayBuffer = await response.arrayBuffer()
            if (audioContext.current) {
              const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer)
              setSamples(prev => prev.map(s => 
                s.id === sample.id 
                  ? { ...s, buffer: audioBuffer } 
                  : s
              ))
            }
          } catch (error) {
            console.error(`Error loading default sample ${sample.defaultSampleFile}:`, error)
          }
        }
      }
    }

    loadDefaultSamples()

    return () => {
      if (audioContext.current) {
        audioContext.current.close()
      }
      if (loopInterval.current) {
        clearInterval(loopInterval.current)
      }
    }
  }, [])

  // Load a sample file
  const loadSample = async (file: File, sampleId: string) => {
    if (!audioContext.current) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer)

      setSamples((prev) =>
        prev.map((sample) =>
          sample.id === sampleId ? { ...sample, buffer: audioBuffer, name: file.name.substring(0, 20) } : sample,
        ),
      )

      toast({
        title: "Sample loaded",
        description: `${file.name} has been loaded successfully.`,
      })
    } catch (error) {
      console.error("Error loading audio file:", error)
      toast({
        title: "Error loading sample",
        description: "Could not load the audio file. Please try another file.",
        variant: "destructive",
      })
    }
  }

  // Update sample settings
  const updateSampleSettings = (sampleId: string, settings: Partial<Sample>) => {
    setSamples((prev) =>
      prev.map((sample) => {
        if (sample.id === sampleId) {
          // If we're updating volume and the sample is playing, update the gain node
          if (settings.volume !== undefined && sample.gainNode) {
            sample.gainNode.gain.value = settings.volume
          }

          // If we're updating loop state and the sample is playing, update the source node
          if (settings.isLooping !== undefined && sample.sourceNode) {
            sample.sourceNode.loop = settings.isLooping
          }

          // If we're updating cut off state and the sample is playing
          if (settings.isCuttingOff !== undefined && sample.sourceNode) {
            if (settings.isCuttingOff) {
              // If cutting off is enabled, stop any existing playback
              sample.sourceNode.stop()
              return { ...sample, ...settings, sourceNode: null, gainNode: null }
            }
          }

          return { ...sample, ...settings }
        }
        return sample
      })
    )
  }

  // Stop a sample's playback
  const stopSample = (sampleId: string) => {
    setSamples((prev) =>
      prev.map((sample) => {
        if (sample.id === sampleId && sample.sourceNode) {
          sample.sourceNode.stop()
          return { ...sample, sourceNode: null, gainNode: null }
        }
        return sample
      })
    )
  }

  // Remove a sample
  const removeSample = (sampleId: string) => {
    // Stop the sample if it's playing
    stopSample(sampleId)
    
    // Reset the sample to its initial state
    setSamples((prev) =>
      prev.map((sample) => {
        if (sample.id === sampleId) {
          return {
            ...sample,
            buffer: null,
            name: `Empty Pad ${sample.id.split('-')[1]}`,
            volume: 1.0,
            isLooping: false,
            isCuttingOff: false,
            sourceNode: null,
            gainNode: null,
          }
        }
        return sample
      })
    )

    // If the removed sample was selected, clear the selection
    if (selectedSample === sampleId) {
      setSelectedSample(null)
    }

    toast({
      title: "Sample removed",
      description: "The sample has been removed and the pad is ready for a new sample.",
    })
  }

  // Play a sample by its ID
  const playSample = (sampleId: string) => {
    if (!audioContext.current) return

    // Resume audio context if suspended (autoplay policy)
    if (audioContext.current.state === "suspended") {
      audioContext.current.resume()
    }

    const sample = samples.find((s) => s.id === sampleId)
    if (!sample) return

    // Stop existing playback if cutting off
    if (sample.isCuttingOff && sample.sourceNode) {
      sample.sourceNode.stop()
    }

    if (sample.isSynth && sample.chordFrequencies) {
      // Create synth nodes for each frequency in the chord
      const synthNodes = sample.chordFrequencies.map(frequency => {
        const oscillator = audioContext.current!.createOscillator()
        const gainNode = audioContext.current!.createGain()
        
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        
        // Add some attack and release
        gainNode.gain.setValueAtTime(0, audioContext.current!.currentTime)
        gainNode.gain.linearRampToValueAtTime(sample.volume, audioContext.current!.currentTime + 0.1)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.current!.currentTime + 1.0)
        
        oscillator.connect(gainNode)
        gainNode.connect(analyserNode.current!)
        
        oscillator.start()
        oscillator.stop(audioContext.current!.currentTime + 1.0)
        
        return { oscillator, gainNode }
      })

      // Update sample with synth nodes
      updateSampleSettings(sampleId, { 
        sourceNode: synthNodes[0].oscillator as any, 
        gainNode: synthNodes[0].gainNode
      })

      // Clean up nodes after they finish
      setTimeout(() => {
        synthNodes.forEach(({ oscillator, gainNode }) => {
          oscillator.disconnect()
          gainNode.disconnect()
        })
        updateSampleSettings(sampleId, { sourceNode: null, gainNode: null })
      }, 1000)
    } else if (sample.buffer) {
      // Regular sample playback
      const source = audioContext.current.createBufferSource()
      source.buffer = sample.buffer
      source.loop = sample.isLooping

      const gainNode = audioContext.current.createGain()
      gainNode.gain.value = sample.volume

      source.connect(gainNode)
      gainNode.connect(analyserNode.current!)

      source.start(0)

      updateSampleSettings(sampleId, { sourceNode: source, gainNode: gainNode })
    }

    // Record the sample trigger if recording
    if (isRecording) {
      const now = Date.now()
      const timeSinceStart = now - recordStartTime
      setRecordedSequence((prev) => [...prev, { sampleId, time: timeSinceStart }])
    }

    // Update active visualizers
    setActiveVisualizers(prev => {
      if (visualizerTimeoutRef.current) {
        clearTimeout(visualizerTimeoutRef.current)
      }

      const newVisualizers = [
        ...prev.filter(v => v.id !== sampleId),
        { id: sampleId, color: sample.color, intensity: 1 }
      ]

      visualizerTimeoutRef.current = setTimeout(() => {
        setActiveVisualizers(current => 
          current.map(v => 
            v.id === sampleId 
              ? { ...v, intensity: Math.max(0, v.intensity - 0.1) }
              : v
          ).filter(v => v.intensity > 0)
        )
      }, 50)

      return newVisualizers
    })
  }

  // Start recording a loop
  const startRecording = () => {
    setIsRecording(true)
    setRecordStartTime(Date.now())
    setRecordedSequence([])

    toast({
      title: "Recording started",
      description: "Play your samples to record a sequence.",
    })
  }

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false)

    if (recordedSequence.length === 0) {
      toast({
        title: "Recording empty",
        description: "No samples were played during recording.",
      })
      return
    }

    // Save the recorded sequence as a new loop
    const lastEvent = recordedSequence[recordedSequence.length - 1]
    const loopDuration = lastEvent.time + 1000 // Add 1 second buffer

    const newLoop: SavedLoop = {
      id: `loop-${Date.now()}`,
      name: `Loop ${savedLoops.length + 1}`,
      events: recordedSequence,
      duration: loopDuration,
      createdAt: new Date()
    }

    setSavedLoops(prev => [...prev, newLoop])

    toast({
      title: "Recording finished",
      description: `Recorded ${recordedSequence.length} sample triggers.`,
    })
  }

  // Play a specific loop
  const playLoop = (loopId: string) => {
    const loop = savedLoops.find(l => l.id === loopId)
    if (!loop) return

    setIsPlaying(true)
    setCurrentlyPlayingLoop(loopId)

    // Schedule all sample triggers
    loop.events.forEach((event) => {
      setTimeout(() => {
        playSample(event.sampleId)
      }, event.time)
    })

    // Schedule the end of playback
    setTimeout(() => {
      setIsPlaying(false)
      setCurrentlyPlayingLoop(null)
    }, loop.duration)
  }

  // Stop loop playback
  const stopLoop = () => {
    if (currentlyPlayingLoop) {
      const loop = savedLoops.find((l) => l.id === currentlyPlayingLoop)
      if (loop) {
        // Stop all samples that were triggered by this loop
        loop.events.forEach((event) => {
          const sample = samples.find((s) => s.id === event.sampleId)
          if (sample?.sourceNode) {
            sample.sourceNode.stop()
            sample.sourceNode = null
          }
        })
      }
      setCurrentlyPlayingLoop(null)
      setIsPlaying(false)
    }
  }

  // Clear a specific loop
  const clearLoop = (loopId: string) => {
    setSavedLoops(prev => prev.filter(loop => loop.id !== loopId))
    toast({
      title: "Loop deleted",
      description: "The loop has been deleted.",
    })
  }

  // Rename a loop
  const renameLoop = (loopId: string, newName: string) => {
    setSavedLoops(prev => prev.map(loop => 
      loop.id === loopId ? { ...loop, name: newName } : loop
    ))
  }

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (visualizerTimeoutRef.current) {
        clearTimeout(visualizerTimeoutRef.current)
      }
    }
  }, [])

  // Handle keyboard events to trigger samples
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed or if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle Ctrl/Cmd + key for selection
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase()
        const sample = samples.find((s) => s.key.toLowerCase() === key)
        if (sample) {
          setSelectedSample(sample.id)
          return
        }
      }

      // Handle regular key presses for sample triggering
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return
      }

      const key = e.key.toLowerCase()
      const sample = samples.find((s) => s.key.toLowerCase() === key)

      if (sample && (sample.buffer || sample.isSynth)) {
        playSample(sample.id)
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [samples])

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-white">
      <header className="border-b border-zinc-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Looper</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:text-white/80">
                <Info className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
              <DialogHeader>
                <DialogTitle>How to Use Looper</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Sample Pads</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Click on any pad to play the sample</li>
                    <li>Use keyboard shortcuts (1-4, q-r, a-f, z-v) to trigger samples</li>
                    <li>Drag and drop audio files to load custom samples</li>
                    <li>Bottom row contains chord pads (A minor scale)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Sample Settings</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Adjust volume using the slider</li>
                    <li>Toggle looping for continuous playback</li>
                    <li>Enable cut-off to stop previous playback</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Loop Recording</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Click "Start Recording" to begin capturing your sequence</li>
                    <li>Play samples to create your loop</li>
                    <li>Click "Stop Recording" to save your loop</li>
                    <li>Use the loop controls to play, stop, or delete saved loops</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Visualizer</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Watch real-time audio visualization</li>
                    <li>Each pad has its own color in the visualizer</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Sample Pads Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2 max-w-xl mx-auto">
                  {samples.map((sample) => (
                    <SamplePad
                      key={sample.id}
                      sample={sample}
                      onPlay={() => playSample(sample.id)}
                      onLoad={(file) => loadSample(file, sample.id)}
                      onRemove={() => removeSample(sample.id)}
                      isActive={activeVisualizers.some(v => v.id === sample.id)}
                      isSelected={selectedSample === sample.id}
                      onSelect={() => setSelectedSample(sample.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualizer Section */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-800 border-zinc-700 h-full">
              <CardContent className="p-4 flex flex-col h-full">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Music className="mr-2 h-5 w-5" />
                  Visualizer
                </h2>
                <div className="flex-1 bg-zinc-900 rounded-lg overflow-hidden">
                  <Visualizer
                    analyserNode={analyserNode.current}
                    activeVisualizers={activeVisualizers}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Settings and Loop Recorder Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Sample Settings */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-3">
              <h2 className="text-lg font-semibold mb-2">Sample Settings</h2>
              <div className="scale-90 origin-top-left">
                <SampleSettings
                  sample={samples.find((s) => s.id === selectedSample) || samples[0] || {
                    id: 'default',
                    name: 'No Sample Selected',
                    buffer: null,
                    key: '',
                    color: 'bg-zinc-600',
                    volume: 1.0,
                    isLooping: false,
                    isCuttingOff: false,
                    sourceNode: null,
                    gainNode: null
                  }}
                  volume={samples.find((s) => s.id === selectedSample)?.volume ?? 1.0}
                  onVolumeChange={(value) => selectedSample && updateSampleSettings(selectedSample, { volume: value })}
                  isLooping={samples.find((s) => s.id === selectedSample)?.isLooping ?? false}
                  onLoopingChange={(value) => selectedSample && updateSampleSettings(selectedSample, { isLooping: value })}
                  isCuttingOff={samples.find((s) => s.id === selectedSample)?.isCuttingOff ?? false}
                  onCuttingOffChange={(value) => selectedSample && updateSampleSettings(selectedSample, { isCuttingOff: value })}
                  onPlay={() => selectedSample && playSample(selectedSample)}
                  onStop={() => selectedSample && stopSample(selectedSample)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loop Recorder */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4">
              <LoopRecorder
                isRecording={isRecording}
                isPlaying={isPlaying}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onPlayLoop={playLoop}
                onStopLoop={stopLoop}
                onClearLoop={clearLoop}
                onRenameLoop={renameLoop}
                savedLoops={savedLoops}
                currentlyPlayingLoop={currentlyPlayingLoop}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

