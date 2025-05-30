import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, duration } = await request.json();
    
    if (!text) {
      return NextResponse.json({
        success: false,
        message: 'Text is required'
      }, { status: 400 });
    }

    if (duration && (isNaN(duration) || duration <= 0 || duration > 30)) {
      return NextResponse.json({
        success: false,
        message: 'Duration must be a positive number between 0 and 30 seconds'
      }, { status: 400 });
    }
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'ElevenLabs API key not configured'
      }, { status: 500 });
    }
    
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text,
          output_format: 'mp3_44100_128',
          ...(duration ? { duration_seconds: duration } : {}),
          prompt_influence: 0.3
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("ElevenLabs API error:", errorData);
      return NextResponse.json({
        success: false,
        message: "Failed to generate sound effect",
        error: errorData
      }, { status: response.status });
    }
    
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);
    const audioBase64 = audioBuffer.toString("base64");
    
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    return NextResponse.json({ 
      success: true,
      audioUrl: audioUrl 
    });
    
  } catch (error: any) {
    console.error('Error generating sound:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate sound effect',
      error: error.message
    }, { status: 500 });
  }
}
