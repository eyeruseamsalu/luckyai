import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { play as quickPlay, history as quickHistory } from "../controllers/quickController.js";
import { play as spinPlay, history as spinHistory } from "../controllers/spinController.js";
import { play as scratchPlay, history as scratchHistory } from "../controllers/scratchController.js";

const router = Router();

router.post("/quick/play", requireAuth, quickPlay);
router.get("/quick/history", requireAuth, quickHistory);

router.post("/spin/play", requireAuth, spinPlay);
router.get("/spin/history", requireAuth, spinHistory);

router.post("/scratch/play", requireAuth, scratchPlay);
router.get("/scratch/history", requireAuth, scratchHistory);

export default router;
