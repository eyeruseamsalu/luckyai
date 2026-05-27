import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { play, history } from "../controllers/quickController.js";

const router = Router();

router.post("/quick/play", requireAuth, play);

router.post("/spin/play", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/scratch/play", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/quick/history", requireAuth, history);

router.get("/spin/history", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/scratch/history", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
