import { Router } from "express";
import { synthesizeSpeech, VOICES, VoiceId } from "../services/tts";
import express from "express";

const router = Router();

router.use(express.json());

// POST /api/tts - Convert text to speech
router.post("/", async (req, res) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text" });
      return;
    }

    // Validate voice ID
    const voiceId: VoiceId = voice && voice in VOICES ? (voice as VoiceId) : "rachel";

    const audioBuffer = await synthesizeSpeech(text, voiceId);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length.toString(),
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "TTS failed",
    });
  }
});

// GET /api/tts/voices - List available voice presets
router.get("/voices", (_req, res) => {
  const voices = Object.entries(VOICES).map(([name, id]) => ({
    name,
    id,
    description: getVoiceDescription(name as VoiceId),
  }));
  res.json(voices);
});

function getVoiceDescription(voice: VoiceId): string {
  const descriptions: Record<VoiceId, string> = {
    rachel: "Calm, warm female",
    drew: "Confident male",
    clyde: "Middle-aged male, warm",
    paul: "News anchor style",
    domi: "Young female, energetic",
    dave: "British male, conversational",
    fin: "Irish male, friendly",
    sarah: "Soft female",
    antoni: "Young male, friendly",
    josh: "Deep male",
    arnold: "Crisp male",
    adam: "Deep male, narration",
    sam: "Young male, dynamic",
  };
  return descriptions[voice];
}

export default router;
