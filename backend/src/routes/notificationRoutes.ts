import { Router } from "express";
import { listNotifications, markAllRead, markRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.patch("/read-all", requireAuth, markAllRead);
router.patch("/:id/read", requireAuth, markRead);

export default router;
