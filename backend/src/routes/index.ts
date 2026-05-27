import { Router } from "express";
import authRoutes from "./authRoutes.js";
import healthRoutes from "./healthRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import walletRoutes from "./walletRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRoutes);
router.use("/notifications", notificationRoutes);

export default router;
