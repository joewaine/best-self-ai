import { Router, Response } from "express";
import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleware/requireAuth";
import { getStorage } from "../services/storage";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/conversations - List user's conversations
router.get("/", (req: AuthenticatedRequest, res: Response) => {
  const storage = getStorage();
  const conversations = storage.getConversations(req.user!.id);
  res.json(conversations);
});

// POST /api/conversations - Create new conversation
router.post("/", (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;
  const storage = getStorage();
  const conversation = storage.createConversation({
    userId: req.user!.id,
    title,
  });
  res.status(201).json(conversation);
});

// GET /api/conversations/:id - Get conversation with messages
router.get("/:id", (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const storage = getStorage();
  const conversation = storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Verify ownership
  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(conversation);
});

// DELETE /api/conversations/:id - Delete conversation
router.delete("/:id", (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const storage = getStorage();
  const conversation = storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  // Verify ownership
  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  storage.deleteConversation(id);
  res.status(204).send();
});

// PATCH /api/conversations/:id - Update conversation title
router.patch("/:id", (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { title } = req.body;
  const storage = getStorage();
  const conversation = storage.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  if (conversation.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (title) {
    storage.updateConversationTitle(id, title);
  }

  res.json({ ...conversation, title });
});

export default router;
