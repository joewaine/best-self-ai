// Speech-to-text using local whisper.cpp installation

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

// Run a shell command and wait for it to finish
function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} failed (${code}): ${stderr}`));
    });
  });
}

// Convert audio buffer to text using whisper.cpp
export async function transcribeWithWhisperCpp(audioBuffer: Buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-"));
  const inputWebm = path.join(dir, "input.webm");
  const inputWav = path.join(dir, "input.wav");
  const outPrefix = path.join(dir, "out"); // will create out.txt
  const outTxt = `${outPrefix}.txt`;

  await fs.writeFile(inputWebm, audioBuffer);

  // Convert webm/opus (from browser) → 16k mono PCM wav
  await run("ffmpeg", [
    "-y",
    "-i",
    inputWebm,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    inputWav,
  ]);

  // whisper.cpp paths relative to repo root:
  // assuming you run the server from /server, we go up one directory.
  const whisperBin = path.resolve(
    process.cwd(),
    "../whisper.cpp/build/bin/whisper-cli",
  );
  const modelPath = path.resolve(
    process.cwd(),
    "../whisper.cpp/models/ggml-base.en.bin",
  );

  await run(whisperBin, [
    "-m",
    modelPath,
    "-f",
    inputWav,
    "-l",
    "en",
    "-nt",
    "-otxt",
    "-of",
    outPrefix,
  ]);

  const txt = await fs.readFile(outTxt, "utf8");
  const transcript = txt.trim();

  // cleanup best-effort
  fs.rm(dir, { recursive: true, force: true }).catch(() => {});

  if (!transcript)
    throw new Error("Empty transcript (whisper produced no text)");
  return transcript;
}
