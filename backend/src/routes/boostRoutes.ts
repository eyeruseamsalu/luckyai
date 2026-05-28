import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
	activate,
	deactivate,
	list,
	consume,
} from "../controllers/boostController.js";

const router = Router();

router.post("/activate", requireAuth, activate);
router.post("/deactivate", requireAuth, deactivate);
router.get("/", requireAuth, list);
router.post("/consume", requireAuth, consume);

export default router;
