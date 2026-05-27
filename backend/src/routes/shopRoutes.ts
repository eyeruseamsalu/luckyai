import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/items", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/purchase", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
