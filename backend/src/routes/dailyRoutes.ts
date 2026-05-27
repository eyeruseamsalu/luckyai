import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { claimDaily } from "../controllers/dailyController.js";

const router = Router();

router.post("/claim", requireAuth, claimDaily);

export default router;
