import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import walletRoutes from "./walletRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRoutes);
router.use("/notifications", notificationRoutes);

export default router;
