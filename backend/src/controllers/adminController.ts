import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { WeeklyEntry } from "../models/WeeklyEntry.js";
import { AppConfig, getAppConfig } from "../models/AppConfig.js";
import { ApiError } from "../middleware/errorHandler.js";
import { toPublicUser } from "../utils/toPublicUser.js";
import { recordNotification } from "../utils/notify.js";
import { getPlatformState, updatePlatformConfig } from "../services/platformService.js";
import { getRevenueStats } from "../services/revenueService.js";
import { runCrownDraw, setDrawActive } from "../services/lotteryService.js";
import { GameHistory } from "../models/GameHistory.js";

export async function overview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [userCount, users, revenue] = await Promise.all([
      User.countDocuments(),
      User.find().select("balance playsToday"),
      getRevenueStats(),
    ]);
    const totalBalance = users.reduce((s, u) => s + u.balance, 0);
    const playsToday = users.reduce((s, u) => s + (u.playsToday ?? 0), 0);
    res.json({
      success: true,
      stats: { userCount, totalBalance, playsToday },
      revenue,
    });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        balance: u.balance,
        starsBalance: u.starsBalance,
        role: u.role,
        isPremium: u.isPremium,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email");
    res.json({ success: true, transactions });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      next(new ApiError(404, "User not found"));
      return;
    }
    const { balance, role, isPremium } = req.body as {
      balance?: number;
      role?: string;
      isPremium?: boolean;
    };
    if (balance !== undefined) user.balance = balance;
    if (role !== undefined) user.role = role as "user" | "admin";
    if (isPremium !== undefined) user.isPremium = isPremium;
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        balance: user.balance,
        starsBalance: user.starsBalance,
        role: user.role,
        isPremium: user.isPremium,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await getAppConfig();
    const platform = await getPlatformState();
    res.json({
      success: true,
      config: {
        spinCost: config.spinCost,
        scratchCost: config.scratchCost,
        quickCost: config.quickCost,
        cashCap: config.cashCap,
        starRate: config.starRate,
        crownStarCost: config.crownStarCost,
        weeklyStarCost: config.weeklyStarCost,
        crownTicketCash: config.crownTicketCash,
        communityStars: config.communityStars,
        starTarget: config.starTarget,
        countdownDurationMs: config.countdownDurationMs,
        crownJackpotEtb: config.crownJackpotEtb,
        weeklyJackpotEtb: config.weeklyJackpotEtb,
        crownDrawActive: config.crownDrawActive,
        starRewardDaily: config.starRewardDaily,
        starRewardWeekly: config.starRewardWeekly,
        starRewardCrown: config.starRewardCrown,
        crownPhase: config.crownPhase,
        crownDrawAt: config.crownDrawAt,
      },
      platform: platform.crown,
      pools: platform.pools,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const config = await updatePlatformConfig(req.body, req.auth.userId);
    res.json({
      success: true,
      config: {
        spinCost: config.spinCost,
        scratchCost: config.scratchCost,
        quickCost: config.quickCost,
        cashCap: config.cashCap,
        starRate: config.starRate,
        crownStarCost: config.crownStarCost,
        weeklyStarCost: config.weeklyStarCost,
        communityStars: config.communityStars,
        starTarget: config.starTarget,
        countdownDurationMs: config.countdownDurationMs,
        crownJackpotEtb: config.crownJackpotEtb,
        crownDrawActive: config.crownDrawActive,
        starRewardDaily: config.starRewardDaily,
        starRewardWeekly: config.starRewardWeekly,
        starRewardCrown: config.starRewardCrown,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const revenue = await getRevenueStats();
    res.json({ success: true, revenue });
  } catch (err) {
    next(err);
  }
}

export async function runWeeklyDraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { winningNumbers, round } = req.body as {
      winningNumbers?: number[];
      round?: number;
    };
    if (!winningNumbers || winningNumbers.length !== 6) {
      next(new ApiError(400, "winningNumbers must be 6 numbers"));
      return;
    }

    const drawRound = round ?? 1;
    const entries = await WeeklyEntry.find({ round: drawRound });
    let winners = 0;

    for (const entry of entries) {
      const matches = entry.numbers.filter((n) => winningNumbers.includes(n)).length;
      if (matches >= 3) winners += 1;
      const user = await User.findById(entry.userId);
      if (user) {
        user.weeklyDrawResult = {
          winningNumbers,
          date: new Date().toISOString(),
          round: drawRound,
          winners,
        };
        await user.save();
        if (matches >= 4) {
          await recordNotification(
            user._id,
            "ti-trophy",
            "ta",
            `Weekly draw: ${matches} matches! Check your results.`,
          );
        }
      }
    }

    const result = {
      winningNumbers,
      date: new Date().toLocaleDateString(),
      round: drawRound,
      winners,
    };

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

export async function runCrownDrawAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { winningNumbers } = req.body as { winningNumbers?: number[] };
    if (!winningNumbers) {
      next(new ApiError(400, "winningNumbers required"));
      return;
    }
    const result = await runCrownDraw(winningNumbers, new Types.ObjectId(req.auth.userId));
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

export async function toggleDrawActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    const { active } = req.body as { active?: boolean };
    if (active === undefined) {
      next(new ApiError(400, "active is required"));
      return;
    }
    await setDrawActive(active, new Types.ObjectId(req.auth.userId));
    res.json({ success: true, active });
  } catch (err) {
    next(err);
  }
}

export async function gameAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const byGame = await GameHistory.aggregate([
      {
        $group: {
          _id: "$gameType",
          plays: { $sum: 1 },
          totalCost: { $sum: "$costEtb" },
        },
      },
    ]);
    res.json({ success: true, byGame });
  } catch (err) {
    next(err);
  }
}

export async function seedAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    const adminEmail = email ?? "admin@luckyai.com";
    const adminPassword = password ?? "admin12345";
    const adminName = name ?? "Admin User";

    let user = await User.findOne({ email: adminEmail });
    if (user) {
      user.role = "admin";
      user.passwordHash = await bcrypt.hash(adminPassword, 10);
      await user.save();
    } else {
      user = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        balance: 10000,
        starsBalance: 5000,
      });
    }

    await getAppConfig();
    res.json({
      success: true,
      message: "Admin user seeded",
      email: adminEmail,
      user: await toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}
