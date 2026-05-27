import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import * as gameService from "../services/gameService.js";

export async function getState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const data = await gameService.getGameState(req.auth.userId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function spin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { cost } = req.body as { cost?: number };
    if (!cost) {
      next(new ApiError(400, "cost is required"));
      return;
    }
    const data = await gameService.playSpin(req.auth.userId, cost);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function scratch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { cost } = req.body as { cost?: number };
    if (!cost) {
      next(new ApiError(400, "cost is required"));
      return;
    }
    const data = await gameService.playScratch(req.auth.userId, cost);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function quick(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { cost, picks } = req.body as { cost?: number; picks?: number[] };
    if (!cost || !picks) {
      next(new ApiError(400, "cost and picks are required"));
      return;
    }
    const data = await gameService.playQuick(req.auth.userId, cost, picks);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function claimDaily(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const data = await gameService.claimDaily(req.auth.userId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function drawEnter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { numbers, option } = req.body as { numbers?: number[]; option?: string };
    if (!numbers || !option) {
      next(new ApiError(400, "numbers and option are required"));
      return;
    }
    const data = await gameService.enterDraw(req.auth.userId, numbers, option);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function weeklyEnter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { numbers } = req.body as { numbers?: number[] };
    if (!numbers) {
      next(new ApiError(400, "numbers are required"));
      return;
    }
    const data = await gameService.enterWeekly(req.auth.userId, numbers);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function starsCrown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { mode } = req.body as { mode?: "stars" | "hybrid" };
    if (!mode) {
      next(new ApiError(400, "mode is required"));
      return;
    }
    const data = await gameService.starsCrownEntry(req.auth.userId, mode);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function starsWeekly(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const data = await gameService.starsWeeklyEntry(req.auth.userId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}
