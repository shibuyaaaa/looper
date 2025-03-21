"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Knob } from "@/components/ui/knob"

export default function EffectsPanel() {
  const [reverbAmount, setReverbAmount] = useState(20)
  const [delayAmount, setDelayAmount] = useState(0)
  const [pitchShift, setPitchShift] = useState(0)
  const [speed, setSpeed] = useState(100)

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-4">
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Effects</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reverb">
            <TabsList className="bg-zinc-900">
              <TabsTrigger value="reverb">Reverb</TabsTrigger>
              <TabsTrigger value="delay">Delay</TabsTrigger>
              <TabsTrigger value="pitch">Pitch</TabsTrigger>
              <TabsTrigger value="speed">Speed</TabsTrigger>
            </TabsList>

            <TabsContent value="reverb" className="pt-4">
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center">
                  <Knob
                    value={reverbAmount}
                    min={0}
                    max={100}
                    onChange={setReverbAmount}
                    size={80}
                    color="#4ade80"
                    label="Amount"
                  />
                  <span className="mt-2 text-sm">{reverbAmount}%</span>
                </div>

                <div className="flex flex-col items-center">
                  <Knob value={50} min={0} max={100} onChange={() => {}} size={80} color="#4ade80" label="Decay" />
                  <span className="mt-2 text-sm">50%</span>
                </div>

                <div className="flex flex-col items-center">
                  <Knob value={30} min={0} max={100} onChange={() => {}} size={80} color="#4ade80" label="Damping" />
                  <span className="mt-2 text-sm">30%</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="delay" className="pt-4">
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center">
                  <Knob
                    value={delayAmount}
                    min={0}
                    max={100}
                    onChange={setDelayAmount}
                    size={80}
                    color="#60a5fa"
                    label="Amount"
                  />
                  <span className="mt-2 text-sm">{delayAmount}%</span>
                </div>

                <div className="flex flex-col items-center">
                  <Knob value={40} min={0} max={100} onChange={() => {}} size={80} color="#60a5fa" label="Time" />
                  <span className="mt-2 text-sm">40%</span>
                </div>

                <div className="flex flex-col items-center">
                  <Knob value={50} min={0} max={100} onChange={() => {}} size={80} color="#60a5fa" label="Feedback" />
                  <span className="mt-2 text-sm">50%</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pitch" className="pt-4">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">-12</span>
                    <span className="text-sm">0</span>
                    <span className="text-sm">+12</span>
                  </div>
                  <Slider
                    value={[pitchShift]}
                    min={-12}
                    max={12}
                    step={1}
                    onValueChange={(value) => setPitchShift(value[0])}
                  />
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{pitchShift > 0 ? `+${pitchShift}` : pitchShift}</div>
                  <div className="text-sm text-zinc-400">semitones</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="speed" className="pt-4">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">50%</span>
                    <span className="text-sm">100%</span>
                    <span className="text-sm">200%</span>
                  </div>
                  <Slider value={[speed]} min={50} max={200} step={1} onValueChange={(value) => setSpeed(value[0])} />
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{speed}%</div>
                  <div className="text-sm text-zinc-400">playback speed</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

