import { Router } from "express";
import {
	history as quickHistory,
	play as quickPlay,
} from "../controllers/quickController.js";
import {
	history as scratchHistory,
	play as scratchPlay,
} from "../controllers/scratchController.js";
import {
	history as spinHistory,
	play as spinPlay,
} from "../controllers/spinController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/quick/play", requireAuth, quickPlay);
router.get("/quick/history", requireAuth, quickHistory);

router.post("/spin/play", requireAuth, spinPlay);
router.get("/spin/history", requireAuth, spinHistory);

router.post("/scratch/play", requireAuth, scratchPlay);
router.get("/scratch/history", requireAuth, scratchHistory);

export default router;
