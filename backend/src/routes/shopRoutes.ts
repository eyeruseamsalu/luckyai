import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listItems, purchase } from "../controllers/shopController.js";

const router = Router();

router.get("/items", requireAuth, listItems);
router.post("/purchase", requireAuth, purchase);

export default router;
