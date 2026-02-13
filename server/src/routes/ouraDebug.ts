import { Router } from "express";
import { getOuraSummaryForYesterday } from "../services/ouraSummary";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { getStorage } from "../services/storage";

export const ouraDebugRouter = Router();

ouraDebugRouter.get("/yesterday", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const storage = getStorage();
  const ouraToken = await storage.getOuraToken(userId);

  if (!ouraToken) {
    return res.status(400).json({ error: "No Oura token configured" });
  }

  const data = await getOuraSummaryForYesterday(ouraToken);
  res.json(data);
});
