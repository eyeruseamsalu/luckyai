import { Router } from "express";
import {
  overview,
  listUsers,
  listTransactions,
  updateUser,
  getConfig,
  updateConfig,
  getRevenue,
  runWeeklyDraw,
  runCrownDrawAdmin,
  toggleDrawActive,
  gameAnalytics,
  seedAdmin,
} from "../controllers/adminController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/overview", overview);
router.get("/users", listUsers);
router.get("/transactions", listTransactions);
router.get("/revenue", getRevenue);
router.get("/analytics/games", gameAnalytics);
router.patch("/users/:id", updateUser);
router.get("/config", getConfig);
router.patch("/config", updateConfig);
router.post("/weekly-draw", runWeeklyDraw);
router.post("/crown-draw", runCrownDrawAdmin);
router.patch("/draw-active", toggleDrawActive);

// Dev-only seed endpoint (no admin required for initial setup)
const seedRouter = Router();
seedRouter.post("/seed-admin", seedAdmin);

export { seedRouter };
export default router;
