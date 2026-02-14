// Speech-to-text using OpenAI's Whisper API

import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Convert audio buffer to text using OpenAI Whisper API
export async function transcribeWithWhisperCpp(audioBuffer: Buffer) {
  // Use OpenAI's toFile helper for proper buffer handling
  const file = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" });

  const response = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
  });

  const transcript = response.text.trim();

  if (!transcript) {
    throw new Error("Empty transcript (whisper produced no text)");
  }

  return transcript;
}
