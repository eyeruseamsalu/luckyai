import type { Request, Response, NextFunction } from "express";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import * as gameService from "../services/gameService.js";

export async function getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      next(new ApiError(404, "User not found"));
      return;
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      balance: user.balance,
      starsBalance: user.starsBalance,
      transactions,
    });
  } catch (err) {
    next(err);
  }
}

export async function deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { amount, method } = req.body as { amount?: number; method?: string };
    if (!amount || !method) {
      next(new ApiError(400, "amount and method are required"));
      return;
    }
    const data = await gameService.deposit(req.auth.userId, amount, method);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { amount, method } = req.body as { amount?: number; method?: string };
    if (!amount || !method) {
      next(new ApiError(400, "amount and method are required"));
      return;
    }
    const data = await gameService.withdraw(req.auth.userId, amount, method);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}
