import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { QuickRound } from "../models/QuickRound.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const VALID_COSTS: number[] = [2, 5, 10];
const CASH_CAP_PLAYS = 8;

export async function play(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { picks, cost } = req.body as {
			picks: unknown;
			cost: unknown;
		};

		// Validate picks: array of 3 unique ints 1-20
		if (
			!Array.isArray(picks) ||
			picks.length !== 3 ||
			!picks.every(
				(n): n is number =>
					typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 20,
			) ||
			new Set(picks).size !== 3
		) {
			next(
				new ApiError(
					400,
					"Picks must be 3 unique integers between 1 and 20",
				),
			);
			return;
		}

		// Validate cost: 2, 5, or 10
		if (typeof cost !== "number" || !VALID_COSTS.includes(cost)) {
			next(new ApiError(400, "Cost must be 2, 5, or 10"));
			return;
		}

		const userId = req.auth.userId;

		// Atomic balance guard — deduct cost only if balance sufficient
		const user = await User.findOneAndUpdate(
			{ _id: userId, balance: { $gte: cost } },
			{ $inc: { balance: -cost } },
			{ new: true },
		);

		if (!user) {
			next(new ApiError(400, "Insufficient balance"));
			return;
		}

		// Cash cap: reset playsToday/cashCapHit if lastPlayDate not today (UTC)
		const now = new Date();
		const startOfToday = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
		);

		const isNewDay =
			!user.lastPlayDate || user.lastPlayDate < startOfToday;
		const currentPlaysToday = isNewDay ? 0 : user.playsToday;
		const upcomingPlaysToday = currentPlaysToday + 1;
		const cashCapHit = upcomingPlaysToday >= CASH_CAP_PLAYS;

		// Server-side draw: 3 unique random numbers 1-20
		const drawn: number[] = [];
		const seen = new Set<number>();
		while (drawn.length < 3) {
			const n = randomInt(1, 21); // 1–20 inclusive
			if (!seen.has(n)) {
				seen.add(n);
				drawn.push(n);
			}
		}

		// Calculate matches
		const matches = picks.filter((p: number) => drawn.includes(p)).length;

		// Check multiplier boost
		const nowMs = now.getTime();
		const activeMultiplier = (
			user.activeBoosts ?? []
		).find(
			(b) =>
				b.type === "multiplier" &&
				b.expiresAt &&
				b.expiresAt.getTime() > nowMs,
		);
		const multiplier = activeMultiplier ? 1.2 : 1;

		// Calculate prize
		let wonCash = 0;
		let wonStars = 0;
		let result: string;

		if (matches === 3) {
			wonCash = Math.round(cost * 20 * multiplier);
			result = "Won";
		} else if (matches === 2) {
			wonCash = Math.round(cost * 3 * multiplier);
			result = "Won";
		} else if (matches === 1) {
			wonStars = 8;
			result = "Free";
		} else {
			wonStars = 2;
			result = "Loss";
		}

		// Determine tier
		const tier =
			cost === 10 ? "Max" : cost === 5 ? "Standard" : "Basic";

		// If cash cap is hit, convert cash winnings to stars
		if (cashCapHit && wonCash > 0) {
			wonStars = wonCash; // 1:1 cash → stars conversion
			wonCash = 0;
			result = "Free";
		}

		// Atomic user update: apply winnings, playsToday, cash cap state
		const $set: Record<string, unknown> = {
			cashCapHit,
			lastPlayDate: now,
		};
		const $inc: Record<string, number> = {
			balance: wonCash,
			starsBalance: wonStars,
		};

		if (isNewDay) {
			$set.playsToday = upcomingPlaysToday;
		} else {
			$inc.playsToday = 1;
		}

		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId },
			{ $set, $inc },
			{ new: true },
		);

		if (!updatedUser) {
			next(new ApiError(500, "Failed to update user"));
			return;
		}

		// Create Transaction records for cost and winnings
		const transactions: Array<{
			userId: string;
			type: "in" | "out" | "star";
			desc: string;
			amt: number;
		}> = [];

		transactions.push({
			userId,
			type: "out",
			desc: `Quick Play — ${cost.toLocaleString()} ETB`,
			amt: -cost,
		});

		if (wonCash > 0) {
			transactions.push({
				userId,
				type: "in",
				desc: `Quick Play winnings — ${wonCash.toLocaleString()} ETB`,
				amt: wonCash,
			});
		}

		if (wonStars > 0) {
			transactions.push({
				userId,
				type: "star",
				desc: `Quick Play winnings — ${wonStars.toLocaleString()} ⭐`,
				amt: wonStars,
			});
		}

		await Promise.all([
			Transaction.insertMany(transactions),
			QuickRound.create({
				userId,
				picks,
				drawn,
				cost,
				tier,
				matches,
				prizeCash: wonCash,
				prizeStars: wonStars,
				multiplier,
				result,
			}),
		]);

		res.json({
			success: true,
			drawn,
			matches,
			wonCash,
			wonStars,
			newBalance: updatedUser.balance,
			newStarsBalance: updatedUser.starsBalance,
			playsToday: updatedUser.playsToday,
			cashCapHit: updatedUser.cashCapHit,
		});
	} catch (err) {
		next(err);
	}
}

export async function history(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const rounds = await QuickRound.find({ userId: req.auth.userId })
			.sort({ createdAt: -1 })
			.limit(10);

		res.json({ success: true, rounds });
	} catch (err) {
		next(err);
	}
}
