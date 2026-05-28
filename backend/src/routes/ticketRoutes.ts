import { Router } from "express";
import { list } from "../controllers/ticketController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, list);

export default router;
