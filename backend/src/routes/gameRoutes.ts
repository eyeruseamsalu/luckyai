import { Router } from "express";
import {
  getState,
  spin,
  scratch,
  quick,
  claimDaily,
  drawEnter,
  weeklyEnter,
  starsCrown,
  starsWeekly,
} from "../controllers/gameController.js";
import { requireAuth } from "../middleware/auth.js";
import { gameLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/state", requireAuth, getState);
router.post("/spin", requireAuth, gameLimiter, spin);
router.post("/scratch", requireAuth, gameLimiter, scratch);
router.post("/quick", requireAuth, gameLimiter, quick);
router.post("/daily/claim", requireAuth, gameLimiter, claimDaily);
router.post("/draw/enter", requireAuth, gameLimiter, drawEnter);
router.post("/weekly/enter", requireAuth, gameLimiter, weeklyEnter);
router.post("/stars/crown", requireAuth, gameLimiter, starsCrown);
router.post("/stars/weekly", requireAuth, gameLimiter, starsWeekly);

export default router;
