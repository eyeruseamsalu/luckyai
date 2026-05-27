import { Router } from "express";
import { getWallet, deposit, withdraw } from "../controllers/walletController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, getWallet);
router.post("/deposit", requireAuth, deposit);
router.post("/withdraw", requireAuth, withdraw);

export default router;
