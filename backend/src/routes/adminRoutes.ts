import { Router } from "express";
import {
	activateUser,
	cancelCrownDraw,
	createCrownDraw,
	createWeeklyDraw,
	editCrownDraw,
	getAdminEconomyItems,
	getAdminGameConfig,
	getAdminPlatformConfig,
	getCrownDraws,
	getEconomyConfig,
	getOverview,
	getUsers,
	getWeeklyDraws,
	getWeeklyEntries,
	runCrownDraw,
	runWeeklyDraw,
	suspendUser,
	updateAdminGameConfig,
	updateAdminPlatformConfig,
	updateItemCost,
	updateStarRate,
	updateUser,
} from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

// Overview
router.get("/overview", requireAuth, requireAdmin, getOverview);

// Users CRUD
router.get("/users", requireAuth, requireAdmin, getUsers);
router.put("/users/:id", requireAuth, requireAdmin, updateUser);
router.put("/users/:id/suspend", requireAuth, requireAdmin, suspendUser);
router.put("/users/:id/activate", requireAuth, requireAdmin, activateUser);

// Crown Draw management
router.get("/draws/crown", requireAuth, requireAdmin, getCrownDraws);
router.post("/draws/crown", requireAuth, requireAdmin, createCrownDraw);
router.put("/draws/crown/:id", requireAuth, requireAdmin, editCrownDraw);
router.post("/draws/crown/:id/run", requireAuth, requireAdmin, runCrownDraw);
router.post(
	"/draws/crown/:id/cancel",
	requireAuth,
	requireAdmin,
	cancelCrownDraw,
);

// Weekly Draw management
router.get("/draws/weekly", requireAuth, requireAdmin, getWeeklyDraws);
router.post("/draws/weekly", requireAuth, requireAdmin, createWeeklyDraw);
router.post(
	"/draws/weekly/:round/run",
	requireAuth,
	requireAdmin,
	runWeeklyDraw,
);
router.get(
	"/draws/weekly/entries",
	requireAuth,
	requireAdmin,
	getWeeklyEntries,
);

router.get("/config/game", requireAuth, requireAdmin, getAdminGameConfig);
router.put("/config/game", requireAuth, requireAdmin, updateAdminGameConfig);

// Platform Config
router.get(
	"/config/platform",
	requireAuth,
	requireAdmin,
	getAdminPlatformConfig,
);
router.put(
	"/config/platform",
	requireAuth,
	requireAdmin,
	updateAdminPlatformConfig,
);

// Economy / Shop Config (api.ts sends to /admin/config/economy/*)
router.get("/config/economy", requireAuth, requireAdmin, getEconomyConfig);
router.get(
	"/config/economy/star-rate",
	requireAuth,
	requireAdmin,
	getEconomyConfig,
);
router.put(
	"/config/economy/star-rate",
	requireAuth,
	requireAdmin,
	updateStarRate,
);
router.get(
	"/config/economy/items",
	requireAuth,
	requireAdmin,
	getAdminEconomyItems,
);
router.put(
	"/config/economy/items/:key",
	requireAuth,
	requireAdmin,
	updateItemCost,
);

export default router;
