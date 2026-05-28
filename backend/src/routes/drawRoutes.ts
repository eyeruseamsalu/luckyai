import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { enter, suggest, entries, activeDraw } from "../controllers/crownController.js";
import {
	enter as weeklyEnter,
	currentRound,
	result as weeklyResult,
	entries as weeklyEntries,
} from "../controllers/weeklyController.js";

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
