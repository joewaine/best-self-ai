import "dotenv/config";
import express from "express";
import cors from "cors";
import { voiceRouter } from "./routes/voice";
import { ouraDebugRouter } from "./routes/ouraDebug";
import dashboardRouter from "./routes/dashboard";
import ttsRouter from "./routes/tts";
import authRouter from "./routes/auth";
import conversationsRouter from "./routes/conversations";
import settingsRouter from "./routes/settings";

const app = express();

// CORS for credentials (cookies)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth routes (mounted on /api/auth/*)
app.use("/api/auth", authRouter);

// Voice routes
app.use("/api/voice", voiceRouter);

// Conversation routes
app.use("/api/conversations", conversationsRouter);

// Oura debug routes
app.use("/api/oura", ouraDebugRouter);

// Dashboard routes
app.use("/api/dashboard", dashboardRouter);

// TTS routes
app.use("/api/tts", ttsRouter);

// Settings routes
app.use("/api/settings", settingsRouter);

// Environment check
app.get("/api/env-check", (_req, res) => {
  res.json({
    hasOura: !!process.env.OURA_API_KEY,
    hasClaude: !!process.env.ANTHROPIC_API_KEY,
    hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
