import { Router } from "express";
import { listItems, purchase } from "../controllers/shopController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/items", requireAuth, listItems);
router.post("/purchase", requireAuth, purchase);

export default router;
