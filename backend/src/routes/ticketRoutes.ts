import { list } from "../controllers/ticketController.js";
import { requireAuth } from "../middleware/auth.js";
import { Router } from "express";

const router = Router();

router.get("/", requireAuth, list);

export default router;
