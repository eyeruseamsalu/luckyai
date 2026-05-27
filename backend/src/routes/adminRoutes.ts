import { Router } from "express";
import {
	getGameConfig,
	getPlatformConfig,
	updateGameConfig,
	updatePlatformConfig,
} from "../controllers/configController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/users", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/users/:id", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/users/:id/suspend", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/draws/crown", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/draws/crown", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/draws/crown/:id", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/draws/crown/:id/run", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/draws/crown/:id/cancel", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/weekly", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/weekly", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.post("/weekly/:round/run", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/weekly/entries", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/config/games", requireAuth, requireAdmin, getGameConfig);
router.put("/config/games", requireAuth, requireAdmin, updateGameConfig);
router.get("/config/platform", requireAuth, requireAdmin, getPlatformConfig);
router.put("/config/platform", requireAuth, requireAdmin, updatePlatformConfig);

router.get("/economy/star-rate", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/economy/star-rate", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.get("/economy/items", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

router.put("/economy/items/:key/cost", requireAuth, requireAdmin, (_req, res) => {
	res.json({ success: true, message: "stub" });
});

export default router;
