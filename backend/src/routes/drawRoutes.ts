import { Router } from "express";
import {
	activeDraw,
	enter,
	entries,
	suggest,
} from "../controllers/crownController.js";
import {
	currentRound,
	enter as weeklyEnter,
	entries as weeklyEntries,
	result as weeklyResult,
} from "../controllers/weeklyController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/crown/enter", requireAuth, enter);
router.post("/crown/suggest", requireAuth, suggest);
router.get("/crown/entries", requireAuth, entries);
router.get("/crown/active", requireAuth, activeDraw);

router.post("/weekly/enter", requireAuth, weeklyEnter);
router.get("/weekly/current", requireAuth, currentRound);
router.get("/weekly/result", requireAuth, weeklyResult);
router.get("/weekly/entries", requireAuth, weeklyEntries);

export default router;
