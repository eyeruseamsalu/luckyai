import type { Request, Response, NextFunction } from "express";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";

/** Placeholder wallet handlers — wire to frontend when ready. */
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
