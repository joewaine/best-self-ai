// Voice coaching routes - handles audio upload, transcription, and AI response

import { Router, Response } from "express";
import multer from "multer";
import { transcribeWithWhisperCpp } from "../services/whisper";
import { callClaudeCoach, generateConversationTitle } from "../services/claude";
import { getOuraSummaryForYesterday } from "../services/ouraSummary";
import { getStorage } from "../services/storage";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";

export const voiceRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Main voice endpoint - transcribes audio, gets AI response, saves to conversation
voiceRouter.post(
  "/transcribe-and-reply",
  requireAuth,
  upload.single("audio"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file)
        return res.status(400).send("Missing audio file field: audio");

      let { conversationId } = req.body;
      const storage = getStorage();

      // Validate conversation exists and belongs to user (if provided)
      let conversation = null;
      let conversationHistory: any[] = [];
      let isNewConversation = false;

      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        if (conversation.userId !== req.user!.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        conversationHistory = conversation.messages;
      } else {
        // Create a new conversation automatically
        conversation = await storage.createConversation({
          userId: req.user!.id,
          title: "New conversation", // Temporary title, will be updated
        });
        conversationId = conversation.id;
        isNewConversation = true;
      }

      // Transcribe audio
      const transcript = await transcribeWithWhisperCpp(req.file.buffer);

      // Get Oura context (if user has token configured)
      const ouraToken = await storage.getOuraToken(req.user!.id);
      const ouraContext = ouraToken
        ? await getOuraSummaryForYesterday(ouraToken).catch(() => null)
        : null;

      // Call Claude with conversation history
      const reply = await callClaudeCoach({
        transcript,
        ouraContext,
        conversationHistory,
        username: req.user?.name,
      });

      // Persist messages
      await storage.addMessage(conversationId, {
        role: "user",
        content: transcript,
      });
      await storage.addMessage(conversationId, {
        role: "assistant",
        content: reply,
      });

      // Generate a title for new conversations
      let conversationTitle = conversation.title;
      if (isNewConversation) {
        try {
          conversationTitle = await generateConversationTitle(
            transcript,
            reply,
          );
          await storage.updateConversationTitle(
            conversationId,
            conversationTitle,
          );
        } catch (e) {
          console.error("Failed to generate title:", e);
          conversationTitle = "New conversation";
        }
      }

      res.json({
        transcript,
        reply,
        conversationId,
        conversationTitle,
        isNewConversation,
      });
    } catch (e: any) {
      console.error("Voice route error:", e);
      res.status(500).send(e?.message ?? "Unknown error");
    }
  },
);

// Quick test endpoint - same as above but doesn't save to a conversation
voiceRouter.post(
  "/quick",
  requireAuth,
  upload.single("audio"),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file)
        return res.status(400).send("Missing audio file field: audio");

      const storage = getStorage();
      const transcript = await transcribeWithWhisperCpp(req.file.buffer);

      // Get Oura context if user has token
      const ouraToken = await storage.getOuraToken(req.user!.id);
      const ouraContext = ouraToken
        ? await getOuraSummaryForYesterday(ouraToken).catch(() => null)
        : null;

      const reply = await callClaudeCoach({
        transcript,
        ouraContext,
        username: req.user?.name,
      });

      res.json({ transcript, reply });
    } catch (e: any) {
      console.error("Voice quick route error:", e);
      res.status(500).send(e?.message ?? "Unknown error");
    }
  },
);
