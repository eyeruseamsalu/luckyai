import type { Request, Response, NextFunction } from "express";
import { getPlatformState } from "../services/platformService.js";

export async function getState(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = await getPlatformState();
    res.json({ success: true, ...state });
  } catch (err) {
    next(err);
  }
}
