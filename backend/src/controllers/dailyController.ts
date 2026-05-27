import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

export async function claimDaily(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const userId = req.auth.userId;
		const user = await User.findById(userId).select(
			"dailyLastClaimed streak balance starsBalance tickets",
		);
		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}

		// Check if already claimed today (UTC calendar day)
		const now = new Date();
		const startOfToday = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
		);

		if (user.dailyLastClaimed && user.dailyLastClaimed >= startOfToday) {
			res.status(409).json({
				success: false,
				message: "Already claimed today",
				dailyClaimed: true,
			});
			return;
		}

		// Calculate streak
		const startOfYesterday = new Date(startOfToday);
		startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

		let newStreak: number;
		if (user.dailyLastClaimed && user.dailyLastClaimed >= startOfYesterday) {
			newStreak = user.streak + 1;
		} else {
			newStreak = 1;
		}

		// Build rewards
		const cashReward = 15;
		const starsReward = 50;
		let bonusCash: number | undefined;
		let bonusTicket: number | undefined;

		if (newStreak >= 7) {
			bonusCash = 20;
			bonusTicket = 1;
		} else if (newStreak >= 3) {
			bonusCash = 20;
		}

		const totalCash = cashReward + (bonusCash || 0);

		// Atomic update — filter ensures no double-claim race
		const $set: Record<string, unknown> = {
			dailyLastClaimed: now,
			streak: newStreak,
		};
		const $inc: Record<string, number> = {
			balance: totalCash,
			starsBalance: starsReward,
		};
		if (bonusTicket) {
			$inc.tickets = bonusTicket;
		}

		const updated = await User.findOneAndUpdate(
			{
				_id: userId,
				$or: [
					{ dailyLastClaimed: null },
					{ dailyLastClaimed: { $lt: startOfToday } },
				],
			},
			{ $set, $inc },
			{ new: true },
		);

		if (!updated) {
			// Another request already claimed
			res.status(409).json({
				success: false,
				message: "Already claimed today",
				dailyClaimed: true,
			});
			return;
		}

		// Create transaction records
		await Transaction.insertMany([
			{ userId, type: "in", desc: "Daily reward", amt: totalCash },
			{
				userId,
				type: "star",
				desc: "Daily reward",
				amt: starsReward,
			},
		]);

		res.json({
			success: true,
			reward: {
				cash: cashReward,
				stars: starsReward,
				...(bonusCash !== undefined && { bonusCash }),
				...(bonusTicket !== undefined && { bonusTicket }),
			},
			streak: newStreak,
			dailyClaimed: true,
		});
	} catch (err) {
		next(err);
	}
}
