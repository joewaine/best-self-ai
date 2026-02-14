// CRUD routes for conversations

import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { getStorage } from "../services/storage";

const router = Router();

// All conversation routes require login
router.use(requireAuth);

// List all conversations for the logged-in user
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const storage = getStorage();
  const conversations = await storage.getConversations(req.user!.id);
  res.json(conversations);
});

// Create a new conversation
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;
  const storage = getStorage();
  const conversation = await storage.createConversation({
    userId: req.user!.id,
    title,
  });
  res.status(201).json(conversation);
});

// Get a single conversation with all its messages
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const storage = getStorage();
  const conversation = await storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Verify ownership
  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(conversation);
});

// Delete a conversation
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const storage = getStorage();
  const conversation = await storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Verify ownership
  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await storage.deleteConversation(id);
  res.status(204).send();
});

// Update conversation title
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { title } = req.body;
  const storage = getStorage();
  const conversation = await storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (title) {
    await storage.updateConversationTitle(id, title);
  }

  res.json({ ...conversation, title });
});

export default router;
