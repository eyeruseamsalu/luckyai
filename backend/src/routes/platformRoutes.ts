import { Router } from "express";
import { getState } from "../controllers/platformController.js";

const router = Router();

router.get("/state", getState);

export default router;
