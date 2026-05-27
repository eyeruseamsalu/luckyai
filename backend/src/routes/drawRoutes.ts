import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/crown/enter", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/crown/suggest", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/weekly/enter", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/weekly/current", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/weekly/result", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
