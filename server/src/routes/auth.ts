import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth";

const router = Router();

// Mount better-auth handler on all /api/auth/* routes
router.all("/*splat", toNodeHandler(auth));

export default router;
