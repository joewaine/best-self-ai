import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import { getStorage } from "../services/storage";
import { fetchPersonalInfo } from "../services/oura";

const router = Router();

router.post("/oura-token", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { ouraToken } = req.body;

    if (!ouraToken || typeof ouraToken !== "string") {
      return res.status(400).json({ error: "ouraToken is required" });
    }

    const userId = req.user!.id;
    const storage = getStorage();
    storage.setOuraToken(userId, ouraToken);

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to save Oura token:", error);
    res.status(500).json({ error: "Failed to save Oura token" });
  }
});

router.get("/oura-token", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const storage = getStorage();
    const ouraToken = storage.getOuraToken(userId);

    res.json({ hasToken: !!ouraToken });
  } catch (error) {
    console.error("Failed to check Oura token:", error);
    res.status(500).json({ error: "Failed to check Oura token" });
  }
});

router.get("/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const storage = getStorage();
    const ouraToken = storage.getOuraToken(userId);

    if (!ouraToken) {
      return res.json({ biologicalSex: null });
    }

    const personalInfo = await fetchPersonalInfo(ouraToken);
    res.json({ biologicalSex: personalInfo.biological_sex || null });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    res.json({ biologicalSex: null });
  }
});

export default router;
