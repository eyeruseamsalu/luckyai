import { Router } from "express";
import {
	activate,
	consume,
	deactivate,
	list,
} from "../controllers/boostController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/activate", requireAuth, activate);
router.post("/deactivate", requireAuth, deactivate);
router.get("/", requireAuth, list);
router.post("/consume", requireAuth, consume);

export default router;
