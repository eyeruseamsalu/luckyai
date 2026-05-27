import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/activate", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/deactivate", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/consume", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
