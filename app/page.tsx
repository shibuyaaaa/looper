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
import EffectsPanel from "@/components/effects-panel"

// Define default samples
const DEFAULT_SAMPLES = [
  { name: "Kick", file: "kick.wav" },
  { name: "Snare", file: "snare.wav" },
  { name: "HiHat", file: "hihat.wav" },
  { name: "Clap", file: "clap.wav" },
  { name: "Bdim", file: "Bdim_chord.wav" },
  { name: "C", file: "C_chord.wav" },
  { name: "Em", file: "Em_chord.wav" },
  { name: "G", file: "G_chord.wav" },
]

// Define chord frequencies (in Hz) for A minor scale
const ARPEGGIOS = {
  Bdim: [246.94, 293.66, 369.99, 493.88, 587.33, 739.99],    // B, D, F, B, D, F (2 octaves)
  C: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99],       // C, E, G, C, E, G (2 octaves)
  Em: [329.63, 392.00, 493.88, 659.25, 783.99, 987.77],      // E, G, B, E, G, B (2 octaves)
  G: [392.00, 493.88, 587.33, 783.99, 987.77, 1174.66],      // G, B, D, G, B, D (2 octaves)
}

// Base interface for any sound source
interface SoundSource {
  id: string
  name: string
  key: string
  color: string
  volume: number
  isPolyphonic: boolean
  sourceNode: AudioBufferSourceNode | OscillatorNode | null
  gainNode: GainNode | null
  isLooping: boolean
}

interface AudioSample extends SoundSource {
  type: 'sample'
  buffer: AudioBuffer | null
  defaultSampleFile?: string
}

interface SynthPad extends SoundSource {
  type: 'synth'
  frequencies: number[]
  waveform: OscillatorType
  arpeggioPattern?: number[]
}

type Pad = AudioSample | SynthPad

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

// Update the SamplePad component props interface
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
}

// Update the SampleSettings component props interface
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

export default function SamplePadApp() {
  const [samples, setSamples] = useState<Pad[]>([])
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [activePads, setActivePads] = useState<Set<string>>(new Set())
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [recordedSequence, setRecordedSequence] = useState<{ sampleId: string; time: number }[]>([])
  const [recordStartTime, setRecordStartTime] = useState(0)
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [currentlyPlayingLoop, setCurrentlyPlayingLoop] = useState<string | null>(null)
  const [editingLoopId, setEditingLoopId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const audioContext = useRef<AudioContext | null>(null)
  const analyserNode = useRef<AnalyserNode | null>(null)
  const loopInterval = useRef<NodeJS.Timeout | null>(null)
  const visualizerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Effects state and nodes
  const effectsState = useRef({
    reverbAmount: 20,
    delayAmount: 0,
    pitchShift: 0,
    speed: 100,
  })
  const effectsGainNode = useRef<GainNode | null>(null)
  // Initialize audio context
  useEffect(() => {
    try {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserNode.current = audioContext.current.createAnalyser()
      analyserNode.current.fftSize = 256 // Power of 2, affects frequency data resolution
      analyserNode.current.smoothingTimeConstant = 0.8 // Smooth transitions
      
      effectsGainNode.current = audioContext.current.createGain()
      effectsGainNode.current.gain.value = 1
      
      // Improved audio routing
      effectsGainNode.current.connect(analyserNode.current)
      analyserNode.current.connect(audioContext.current.destination)
    } catch (error) {
      console.error("Failed to initialize audio context:", error)
      toast({
        title: "Audio Error",
        description: "Failed to initialize audio system. Please refresh the page.",
        variant: "destructive",
      })
    }
    
    // Initialize with empty sample pads
    const initialSamples: Pad[] = defaultKeys.map((key, index) => {
      // Map drums to the second row (indices 4-7)
      const isDrumRow = index >= 4 && index < 8
      const drumIndex = isDrumRow ? index - 4 : null
      const drumSample = isDrumRow && drumIndex !== null && drumIndex < 4 ? DEFAULT_SAMPLES[drumIndex] : null

      // Map chord samples to the third row (indices 8-11)
      const isChordRow = index >= 8 && index < 12
      const chordIndex = isChordRow ? index - 8 : null
      const chordSample = isChordRow && chordIndex !== null && chordIndex < 4 ? DEFAULT_SAMPLES[chordIndex + 4] : null

      // Map arpeggios to the last row (indices 12-15)
      const isArpeggioRow = index >= 12
      const arpeggioType = isArpeggioRow ? Object.keys(ARPEGGIOS)[index - 12] : null

      if (isArpeggioRow) {
        return {
          id: `sample-${index}`,
          name: arpeggioType || `Pad ${index + 1}`,
          key: key,
          color: padColors[index % padColors.length],
          volume: 1.0,
          isLooping: true,
          isPolyphonic: false,
          sourceNode: null,
          gainNode: null,
          type: 'synth' as const,
          frequencies: ARPEGGIOS[arpeggioType as keyof typeof ARPEGGIOS] || [],
          waveform: 'sine',
          arpeggioPattern: ARPEGGIOS[arpeggioType as keyof typeof ARPEGGIOS]
        }
      } else {
        return {
          id: `sample-${index}`,
          name: isChordRow 
            ? chordSample?.name || `Pad ${index + 1}`
            : isDrumRow
              ? drumSample?.name || `Pad ${index + 1}`
              : `Pad ${index + 1}`,
          key: key,
          color: padColors[index % padColors.length],
          volume: 1.0,
          isLooping: false,
          isPolyphonic: !isArpeggioRow,
          sourceNode: null,
          gainNode: null,
          type: 'sample' as const,
          buffer: null,
          defaultSampleFile: (isDrumRow && drumSample) || (isChordRow && chordSample) 
            ? (isDrumRow ? drumSample : chordSample)?.file 
            : undefined
        }
      }
    })

    setSamples(initialSamples)

    // Load default samples
    const loadDefaultSamples = async () => {
      for (let i = 0; i < initialSamples.length; i++) {
        const sample = initialSamples[i]
        if (sample.type === 'sample' && (sample as AudioSample).defaultSampleFile) {
          try {
            const response = await fetch(`/samples/${(sample as AudioSample).defaultSampleFile}`)
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
            console.error(`Error loading default sample ${(sample as AudioSample).defaultSampleFile}:`, error)
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
      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Decode the audio data
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer)
      
      // Update the sample with the decoded buffer
      setSamples(prevSamples => {
        return prevSamples.map(sample => {
          if (sample.id === sampleId) {
            if (sample.type === 'sample') {
              return {
                ...sample,
                buffer: audioBuffer,
                name: file.name.replace(/\.[^/.]+$/, "") // Remove file extension
              } as AudioSample
            }
          }
          return sample
        })
      })

      // Show success toast
      toast({
        title: "Sample loaded",
        description: `${file.name} has been loaded successfully.`,
        duration: 2000,
      })
    } catch (error) {
      console.error("Error loading audio file:", error)
      toast({
        title: "Error",
        description: "Failed to load audio sample. Please try another file.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }
  
  // Generate sound from text using ElevenLabs API
  const generateSound = async (text: string, duration: number, sampleId: string) => {
    if (!audioContext.current) return

    try {
      toast({
        title: "Generating sound",
        description: "Please wait while we generate your sound...",
        duration: 5000,
      })
      
      const response = await fetch('/api/generate-sound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, duration }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate sound')
      }
      
      const data = await response.json()
      
      // Convert base64 audio URL to ArrayBuffer
      const audioUrl = data.audioUrl
      const base64Data = audioUrl.split(',')[1]
      const binaryString = window.atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Decode the audio data
      const audioBuffer = await audioContext.current.decodeAudioData(bytes.buffer)
      
      // Update the sample with the generated audio
      setSamples(prevSamples => {
        return prevSamples.map(sample => {
          if (sample.id === sampleId) {
            if (sample.type === 'sample') {
              return {
                ...sample,
                buffer: audioBuffer,
                name: text.length > 20 ? `${text.substring(0, 20)}...` : text
              } as AudioSample
            }
          }
          return sample
        })
      })

      // Show success toast
      toast({
        title: "Sound generated",
        description: `Sound effect has been generated successfully.`,
        duration: 2000,
      })
    } catch (error) {
      console.error("Error generating sound:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate sound effect.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Update sample settings
  const updateSampleSettings = (sampleId: string, settings: Partial<AudioSample | SynthPad>) => {
    setSamples((prev) =>
      prev.map((sample) => {
        if (sample.id === sampleId) {
          // If we're updating volume and the sample is playing, update the gain node
          if (settings.volume !== undefined && sample.gainNode) {
            sample.gainNode.gain.value = settings.volume
          }

          // If we're updating loop state and the sample is playing, update the source node
          if (settings.isLooping !== undefined && sample.sourceNode && 'loop' in sample.sourceNode) {
            sample.sourceNode.loop = settings.isLooping
          }

          // If we're updating polyphonic state
          if (settings.isPolyphonic !== undefined) {
            // If turning off polyphonic mode while playing, stop all instances
            if (!settings.isPolyphonic && sample.sourceNode) {
              stopSample(sampleId)
            }
            // Update the setting
            if (sample.type === 'synth') {
              return { ...sample, ...settings } as SynthPad
            } else {
              return { ...sample, ...settings } as AudioSample
            }
          }

          // Preserve the type when updating settings
          if (sample.type === 'synth') {
            return { ...sample, ...settings } as SynthPad
          } else {
            return { ...sample, ...settings } as AudioSample
          }
        }
        return sample
      })
    )
  }

  // Stop a sample
  const stopSample = (sampleId: string) => {
    const sample = samples.find((s) => s.id === sampleId)
    if (!sample) return

    // Stop all instances of the sample
    if (sample.sourceNode) {
      if (sample.type === 'synth') {
        // For synth pads, stop the oscillator
        const oscillator = sample.sourceNode as OscillatorNode
        oscillator.stop()
        oscillator.disconnect()
      } else {
        // For audio samples, stop the buffer source
        const bufferSource = sample.sourceNode as AudioBufferSourceNode
        bufferSource.stop()
        bufferSource.disconnect()
      }
      sample.sourceNode = null
    }

    if (sample.gainNode) {
      sample.gainNode.disconnect()
      sample.gainNode = null
    }

    // Update the sample settings to reflect stopped state
    updateSampleSettings(sampleId, {
      sourceNode: null,
      gainNode: null,
      isLooping: false // Turn off looping when stopping
    })
  }

  // Stop all playing samples
  const stopAllSamples = () => {
    // Clear active pads visual state
    setActivePads(new Set())
    
    // Stop each sample that might be playing
    samples.forEach(sample => {
      if (sample.sourceNode || sample.gainNode) {
        stopSample(sample.id)
      }
    })
    
    // Also stop any loop playback if it's running
    if (isPlaying) {
      stopLoop()
    }
    
    toast({
      title: "All Audio Stopped",
      description: "All playing sounds have been stopped.",
    })
  }

  // Remove a sample
  const removeSample = (sampleId: string) => {
    stopSample(sampleId)
    const sample = samples.find((s) => s.id === sampleId)
    if (!sample) return

    // Reset the sample to its initial state
    const index = parseInt(sample.id.split('-')[1])
    const isDrumRow = index >= 4 && index < 8
    const drumIndex = isDrumRow ? index - 4 : null
    const drumSample = isDrumRow && drumIndex !== null && drumIndex < 4 ? DEFAULT_SAMPLES[drumIndex] : null

    const isChordRow = index >= 8 && index < 12
    const chordIndex = isChordRow ? index - 8 : null
    const chordSample = isChordRow && chordIndex !== null && chordIndex < 4 ? DEFAULT_SAMPLES[chordIndex + 4] : null

    const isArpeggioRow = index >= 12
    const arpeggioType = isArpeggioRow ? Object.keys(ARPEGGIOS)[index - 12] : null

    updateSampleSettings(sampleId, {
      buffer: null,
      name: isArpeggioRow 
        ? arpeggioType || `Pad ${index + 1}`
        : isChordRow 
          ? chordSample?.name || `Pad ${index + 1}`
          : isDrumRow
            ? drumSample?.name || `Pad ${index + 1}`
            : `Pad ${index + 1}`,
      key: sample.key,
      color: sample.color,
      volume: 1,
      isLooping: isArpeggioRow,
      isPolyphonic: !isArpeggioRow,
      sourceNode: null,
      gainNode: null,
      type: isArpeggioRow ? 'synth' : isChordRow ? 'sample' : isDrumRow ? 'sample' : 'sample',
      frequencies: isArpeggioRow ? ARPEGGIOS[arpeggioType as keyof typeof ARPEGGIOS] : undefined,
      waveform: isArpeggioRow ? 'sine' : undefined,
      defaultSampleFile: (isDrumRow && drumSample) || (isChordRow && chordSample) 
        ? (isDrumRow ? drumSample : chordSample)?.file 
        : undefined,
      arpeggioPattern: isArpeggioRow ? ARPEGGIOS[arpeggioType as keyof typeof ARPEGGIOS] : undefined,
    })

    // Clear selection if this was the selected sample
    if (selectedSample === sampleId) {
      setSelectedSample(null)
    }

    toast({
      title: "Sample removed",
      description: "The sample has been removed and the pad is ready for a new sample.",
    })
  }

  // Update effects settings
  const updateEffects = (type: 'reverb' | 'delay' | 'pitch' | 'speed', value: number) => {
    if (!audioContext.current || !effectsGainNode.current) return

    switch (type) {
      case 'reverb':
        effectsState.current.reverbAmount = value
        effectsGainNode.current.gain.value = 1 + (value / 100)
        break
      case 'delay':
        effectsState.current.delayAmount = value
        effectsGainNode.current.gain.value = 1 + (value / 200)
        break
      case 'pitch':
        effectsState.current.pitchShift = value
        effectsGainNode.current.gain.value = 1 + (Math.abs(value) / 100)
        break
      case 'speed':
        effectsState.current.speed = value
        break
    }
  }

  // Improved play function with better audio handling
  const playSoundSource = (pad: Pad) => {
    try {
      // Add visual feedback by setting the pad as active temporarily
      setActivePads(prev => {
        const newActivePads = new Set(prev)
        newActivePads.add(pad.id)
        return newActivePads
      })
      
      // Remove active state after a short delay
      setTimeout(() => {
        setActivePads(prev => {
          const newActivePads = new Set(prev)
          newActivePads.delete(pad.id)
          return newActivePads
        })
      }, 150) // Match this with the CSS animation duration

      // Record the sequence if recording is active
      if (isRecording) {
        const timeSinceStart = Date.now() - recordStartTime
        setRecordedSequence(prev => [...prev, { sampleId: pad.id, time: timeSinceStart }])
      }

      // Stop any existing playback if not polyphonic
      if (!pad.isPolyphonic) {
        stopSample(pad.id)
      }

      // Resume audio context if suspended
      if (audioContext.current?.state === "suspended") {
        audioContext.current?.resume().catch(console.error)
      }

      let nodes
      if (pad.type === 'synth') {
        nodes = playSynth(pad as SynthPad)
        if (nodes) {
          updateSampleSettings(pad.id, {
            sourceNode: nodes.oscillator,
            gainNode: nodes.gainNode
          })
        }
      } else {
        nodes = playSample(pad as AudioSample)
        if (nodes) {
          updateSampleSettings(pad.id, {
            sourceNode: nodes.sourceNode,
            gainNode: nodes.gainNode
          })
        }
      }
    } catch (error) {
      console.error("Error playing sound:", error)
      toast({
        title: "Playback Error",
        description: "Failed to play the sound. Please try again.",
        variant: "destructive",
      })
    }
  }

  const playSynth = (pad: SynthPad) => {
    if (!audioContext.current || !effectsGainNode.current) return

    const synthNodes = pad.frequencies.map((frequency, index) => {
      const oscillator = audioContext.current!.createOscillator()
      const gainNode = audioContext.current!.createGain()
      
      oscillator.type = pad.waveform
      oscillator.frequency.value = frequency * (effectsState.current.speed / 100)
      
      // Attack and release configuration
      gainNode.gain.setValueAtTime(0, audioContext.current!.currentTime + (index * 0.1))
      gainNode.gain.linearRampToValueAtTime(pad.volume, audioContext.current!.currentTime + (index * 0.1) + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.current!.currentTime + (index * 0.1) + 0.4)
      
      oscillator.connect(gainNode)
      gainNode.connect(effectsGainNode.current!)
      
      return { oscillator, gainNode }
    })

    // Start and schedule cleanup
    synthNodes.forEach(({ oscillator }, index) => {
      oscillator.start(audioContext.current!.currentTime + (index * 0.1))
      oscillator.stop(audioContext.current!.currentTime + (index * 0.1) + 0.4)
    })

    return synthNodes[0]
  }

  const playSample = (pad: AudioSample) => {
    if (!audioContext.current || !effectsGainNode.current || !pad.buffer) return

    const source = audioContext.current.createBufferSource()
    source.buffer = pad.buffer
    source.loop = pad.isLooping
    source.playbackRate.value = effectsState.current.speed / 100

    const gainNode = audioContext.current.createGain()
    gainNode.gain.value = pad.volume

    source.connect(gainNode)
    gainNode.connect(effectsGainNode.current)

    // Add an onended handler to clean up when the sample finishes playing
    source.onended = () => {
      if (!pad.isLooping) {
        updateSampleSettings(pad.id, {
          sourceNode: null,
          gainNode: null
        })
      }
    }

    source.start(0)

    return { sourceNode: source, gainNode }
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

    const playLoopEvents = () => {
      // Schedule all sample triggers
      loop.events.forEach((event) => {
        setTimeout(() => {
          playSoundSource(samples.find((s) => s.id === event.sampleId) as Pad)
        }, event.time)
      })

      // If looping is enabled, schedule the next iteration
      if (isLooping) {
        setTimeout(playLoopEvents, loop.duration)
      } else {
        // If not looping, schedule the end of playback
        setTimeout(() => {
          setIsPlaying(false)
          setCurrentlyPlayingLoop(null)
        }, loop.duration)
      }
    }

    playLoopEvents()
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
      setIsLooping(false) // Stop looping when stopping playback
    }
  }

  // Toggle loop state
  const toggleLoop = () => {
    setIsLooping(!isLooping)
    if (isPlaying && currentlyPlayingLoop) {
      const loop = savedLoops.find(l => l.id === currentlyPlayingLoop)
      if (!loop) return

      // Stop current playback
      stopLoop()

      // If we're enabling looping, start playback again
      if (!isLooping) {
        playLoop(currentlyPlayingLoop)
      }
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
        const sample = samples.find((s: Pad) => s.key.toLowerCase() === key)
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
      const sample = samples.find((s: Pad) => s.key.toLowerCase() === key)

      if (sample && ((sample.type === 'sample' && sample.buffer) || sample.type === 'synth')) {
        playSoundSource(sample)
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [samples])

  // Update the SampleSettings component usage
  const selectedSampleData = samples.find((s: Pad) => s.id === selectedSample)

  const handleVolumeChange = (value: number) => {
    if (selectedSample) {
      updateSampleSettings(selectedSample, { volume: value })
    }
  }

  const handleLoopingChange = (value: boolean) => {
    if (selectedSample) {
      const sample = samples.find(s => s.id === selectedSample)
      if (!sample) return

      // If turning off looping while playing, stop the sample
      if (!value && sample.sourceNode) {
        stopSample(selectedSample)
      } else {
        updateSampleSettings(selectedSample, { isLooping: value })
      }
    }
  }

  const handlePolyphonicChange = (value: boolean) => {
    if (selectedSample) {
      const sample = samples.find(s => s.id === selectedSample)
      if (!sample) return

      // If turning off polyphonic mode while playing, stop all instances
      if (!value && sample.sourceNode) {
        stopSample(selectedSample)
      }
      updateSampleSettings(selectedSample, { isPolyphonic: value })
    }
  }

  const handlePlay = () => {
    if (selectedSample) {
      const sample = samples.find((s: Pad) => s.id === selectedSample)
      if (sample) {
        playSoundSource(sample)
      }
    }
  }

  const handleStop = () => {
    if (selectedSample) {
      stopSample(selectedSample)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-white">
      <header className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-900">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">Looper</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={stopAllSamples}
            className="animate-pulse-subtle hover:animate-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stop All
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Help
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

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {/* Sample Pads Section - Centered on all screen sizes */}
        <div className="flex justify-center w-full mb-4">
          <Card className="bg-zinc-800 border-zinc-700 w-full max-w-md">
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-4 gap-1 sm:gap-2 mx-auto">
                  {samples.map((sample) => (
                    <SamplePad
                      key={sample.id}
                      sample={{
                        id: sample.id,
                        name: sample.name,
                        buffer: sample.type === 'sample' ? sample.buffer : null,
                        key: sample.key,
                        color: sample.color,
                        isSynth: sample.type === 'synth'
                      }}
                      onPlay={() => playSoundSource(sample)}
                      onLoad={(file) => loadSample(file, sample.id)}
                      onRemove={() => removeSample(sample.id)}
                      isActive={activePads.has(sample.id)}
                      isSelected={selectedSample === sample.id}
                      onSelect={() => setSelectedSample(sample.id)}
                      onGenerateSound={(text, duration) => generateSound(text, duration, sample.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Settings and Loop Recorder Section */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {/* Sample Settings */}
          <Card className="bg-zinc-800 border-zinc-700 w-full max-w-md">
            <CardContent className="p-3">
              <h2 className="text-lg font-semibold mb-2">Sample Settings</h2>
              <div className="origin-top-left">
                <SampleSettings
                  sample={{
                    id: selectedSampleData?.id || 'default',
                    name: selectedSampleData?.name || 'No Sample Selected',
                    buffer: selectedSampleData?.type === 'sample' 
                      ? (selectedSampleData as AudioSample).buffer 
                      : null,
                    key: selectedSampleData?.key || '',
                    color: selectedSampleData?.color || 'bg-zinc-600'
                  }}
                  volume={selectedSampleData?.volume ?? 1.0}
                  onVolumeChange={handleVolumeChange}
                  isLooping={selectedSampleData?.isLooping ?? false}
                  onLoopingChange={handleLoopingChange}
                  isPolyphonic={selectedSampleData?.isPolyphonic ?? false}
                  onPolyphonicChange={handlePolyphonicChange}
                  onPlay={handlePlay}
                  onStop={handleStop}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loop Recorder */}
          <Card className="bg-zinc-800 border-zinc-700 w-full max-w-md">
            <CardContent className="p-2 sm:p-4">
              <LoopRecorder
                isRecording={isRecording}
                isPlaying={isPlaying}
                isLooping={isLooping}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onPlayLoop={playLoop}
                onStopLoop={stopLoop}
                onClearLoop={clearLoop}
                onRenameLoop={renameLoop}
                onToggleLoop={toggleLoop}
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

