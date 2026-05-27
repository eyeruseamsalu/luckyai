import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.put("/", requireAuth, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
