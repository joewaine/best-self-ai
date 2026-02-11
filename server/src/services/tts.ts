const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// ElevenLabs voice IDs - you can find more at https://api.elevenlabs.io/v1/voices
export const VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM", // Calm, warm female
  drew: "29vD33N1CtxCmqQRPOHJ", // Confident male
  clyde: "2EiwWnXFnvU5JabPnv8n", // Middle-aged male, warm
  paul: "5Q0t7uMcjvnagumLfvZi", // News anchor style
  domi: "AZnzlk1XvdvUeBnXmlld", // Young female, energetic
  dave: "CYw3kZ02Hs0563khs1Fj", // British male, conversational
  fin: "D38z5RcWu1voky8WS1ja", // Irish male, friendly
  sarah: "EXAVITQu4vr4xnSDxMaL", // Soft female
  antoni: "ErXwobaYiN019PkySvjV", // Young male, friendly
  josh: "TxGEqnHWrfWFTfGW9XjX", // Deep male
  arnold: "VR6AewLTigWG4xSOukaG", // Crisp male
  adam: "pNInz6obpgDQGcFmaJgB", // Deep male, narration
  sam: "yoZ06aMxZJJ28mfd3POQ", // Young male, dynamic
} as const;

export type VoiceId = keyof typeof VOICES;

export async function synthesizeSpeech(
  text: string,
  voiceId: VoiceId = "antoni",
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");

  const voiceIdValue = VOICES[voiceId];

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceIdValue}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getAvailableVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");

  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}`);
  }

  return res.json();
}
