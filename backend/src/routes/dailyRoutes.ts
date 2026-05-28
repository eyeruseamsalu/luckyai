import { Router } from "express";
import { claimDaily } from "../controllers/dailyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/claim", requireAuth, claimDaily);

export default router;
