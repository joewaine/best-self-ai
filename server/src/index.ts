// Express server entry point - sets up middleware and mounts all routes

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

// Allow requests from frontend with cookies
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// Simple health check endpoint for monitoring
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Mount route modules
app.use("/api/auth", authRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/oura", ouraDebugRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/settings", settingsRouter);

// Debug endpoint to check which API keys are configured
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
