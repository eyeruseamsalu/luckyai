import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import walletRoutes from "./walletRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import gameRoutes from "./gameRoutes.js";
import platformRoutes from "./platformRoutes.js";
import adminRoutes, { seedRouter } from "./adminRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/platform", platformRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRoutes);
router.use("/notifications", notificationRoutes);
router.use("/games", gameRoutes);
router.use("/admin", adminRoutes);
router.use("/admin", seedRouter);

export default router;
