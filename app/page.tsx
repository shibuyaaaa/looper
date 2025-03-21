"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Music } from "lucide-react"
import SamplePad from "@/components/sample-pad"
import Visualizer from "@/components/visualizer"
import LoopRecorder from "@/components/loop-recorder"
import { useToast } from "@/hooks/use-toast"
import SampleSettings from "@/components/sample-settings"

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
  progress: number
  isSynth?: boolean
  chordFrequencies?: number[]
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

  const audioContext = useRef<AudioContext | null>(null)
  const analyserNode = useRef<AnalyserNode | null>(null)
  const loopInterval = useRef<NodeJS.Timeout | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
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
      // Check if this is one of the bottom four pads
      const isBottomPad = index >= 12 // z, x, c, v
      const chordType = isBottomPad ? Object.keys(CHORDS)[index - 12] : null

      return {
        id: `sample-${index}`,
        name: isBottomPad ? `Chord ${chordType}` : `Empty Pad ${index + 1}`,
        buffer: null,
        key: key,
        color: padColors[index % padColors.length],
        volume: 1.0,
        isLooping: false,
        isCuttingOff: false,
        sourceNode: null,
        gainNode: null,
        progress: 0,
        isSynth: isBottomPad,
        chordFrequencies: isBottomPad ? CHORDS[chordType as keyof typeof CHORDS] : undefined,
      }
    })

    setSamples(initialSamples)

    return () => {
      if (audioContext.current) {
        audioContext.current.close()
      }
      if (loopInterval.current) {
        clearInterval(loopInterval.current)
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [])

  // Update progress for playing samples
  useEffect(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }

    const playingSamples = samples.filter(s => s.sourceNode && s.buffer)
    if (playingSamples.length === 0) return

    progressInterval.current = setInterval(() => {
      setSamples(prev => prev.map(sample => {
        if (sample.sourceNode && sample.buffer) {
          const currentTime = audioContext.current?.currentTime || 0
          const startTime = (sample.sourceNode as any)._startTime || 0
          const duration = sample.buffer.duration
          let progress = (currentTime - startTime) / duration

          if (sample.isLooping) {
            progress = progress % 1
          } else if (progress >= 1) {
            progress = 1
          }

          return { ...sample, progress }
        }
        return sample
      }))
    }, 50) // Update every 50ms

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [samples])

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

      if (sample && sample.buffer) {
        playSample(sample.id)
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [samples])

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
        gainNode: synthNodes[0].gainNode,
        progress: 0 
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
      ;(source as any)._startTime = audioContext.current.currentTime

      updateSampleSettings(sampleId, { sourceNode: source, gainNode: gainNode, progress: 0 })
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

    toast({
      title: "Recording finished",
      description: `Recorded ${recordedSequence.length} sample triggers.`,
    })
  }

  // Play the recorded loop
  const playLoop = () => {
    if (recordedSequence.length === 0) {
      toast({
        title: "Nothing to play",
        description: "Record a sequence first.",
      })
      return
    }

    setIsPlaying(true)

    // Get the total duration of the sequence
    const lastEvent = recordedSequence[recordedSequence.length - 1]
    const loopDuration = lastEvent.time + 1000 // Add 1 second buffer

    // Schedule all sample triggers
    recordedSequence.forEach((event) => {
      setTimeout(() => {
        playSample(event.sampleId)
      }, event.time)
    })

    // Schedule the end of playback
    setTimeout(() => {
      setIsPlaying(false)
    }, loopDuration)
  }

  // Stop loop playback
  const stopLoop = () => {
    setIsPlaying(false)
  }

  // Clear the recorded sequence
  const clearRecording = () => {
    setRecordedSequence([])
    toast({
      title: "Recording cleared",
      description: "The recorded sequence has been cleared.",
    })
  }

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (visualizerTimeoutRef.current) {
        clearTimeout(visualizerTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-white">
      <header className="border-b border-zinc-800 p-4">
        <h1 className="text-2xl font-bold">Sample Pad Studio</h1>
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
                      isActive={activeVisualizers.some(v => v.id === sample.id)}
                      isSelected={selectedSample === sample.id}
                      onSelect={() => setSelectedSample(sample.id)}
                      progress={sample.progress}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sample Settings */}
            {selectedSample && (
              <SampleSettings
                sample={samples.find((s) => s.id === selectedSample)!}
                volume={samples.find((s) => s.id === selectedSample)!.volume}
                onVolumeChange={(value) => updateSampleSettings(selectedSample, { volume: value })}
                isLooping={samples.find((s) => s.id === selectedSample)!.isLooping}
                onLoopingChange={(value) => updateSampleSettings(selectedSample, { isLooping: value })}
                isCuttingOff={samples.find((s) => s.id === selectedSample)!.isCuttingOff}
                onCuttingOffChange={(value) => updateSampleSettings(selectedSample, { isCuttingOff: value })}
                onPlay={() => playSample(selectedSample)}
                onStop={() => stopSample(selectedSample)}
                progress={samples.find((s) => s.id === selectedSample)!.progress}
              />
            )}
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

        {/* Loop Recorder Section */}
        <Card className="bg-zinc-800 border-zinc-700 mt-6">
          <CardContent className="p-4">
            <LoopRecorder
              isRecording={isRecording}
              isPlaying={isPlaying}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onPlayLoop={playLoop}
              onStopLoop={stopLoop}
              onClearRecording={clearRecording}
              recordedEvents={recordedSequence.length}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

