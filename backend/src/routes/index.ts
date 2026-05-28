import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import boostRoutes from "./boostRoutes.js";
import dailyRoutes from "./dailyRoutes.js";
import drawRoutes from "./drawRoutes.js";
import gameRoutes from "./gameRoutes.js";
import healthRoutes from "./healthRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import profileRoutes from "./profileRoutes.js";
import shopRoutes from "./shopRoutes.js";
import ticketRoutes from "./ticketRoutes.js";
import walletRoutes from "./walletRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRoutes);
router.use("/notifications", notificationRoutes);
router.use("/games", gameRoutes);
router.use("/daily", dailyRoutes);
router.use("/profile", profileRoutes);
router.use("/boosts", boostRoutes);
router.use("/shop", shopRoutes);
router.use("/tickets", ticketRoutes);
router.use("/draws", drawRoutes);
router.use("/admin", adminRoutes);

export default router;
