import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { SpinRound } from "../models/SpinRound.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const VALID_COSTS: number[] = [5, 15, 30, 50];
const CASH_CAP_PLAYS = 8;
const STAR_EARN_ON_LOSS = 30;

interface Segment {
	label: string;
	type: "cash" | "stars" | "ticket" | "premium" | "lose";
	value: number;
	weight: number;
}

const SEGMENTS: Segment[] = [
	{ label: "100 ETB", type: "cash", value: 100, weight: 1.5 },
	{ label: "50 ETB", type: "cash", value: 50, weight: 3.5 },
	{ label: "25 ETB", type: "cash", value: 25, weight: 5.5 },
	{ label: "15 ETB", type: "cash", value: 15, weight: 8.0 },
	{ label: "40 ★", type: "stars", value: 40, weight: 12.0 },
	{ label: "20 ★", type: "stars", value: 20, weight: 16.0 },
	{ label: "10 ★", type: "stars", value: 10, weight: 18.0 },
	{ label: "Ticket", type: "ticket", value: 1, weight: 3.0 },
	{ label: "Premium Day", type: "premium", value: 1, weight: 1.5 },
	{ label: "Lose", type: "lose", value: 0, weight: 18.5 },
	{ label: "Lose", type: "lose", value: 0, weight: 8.0 },
	{ label: "Lose", type: "lose", value: 0, weight: 4.5 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

function pickSegment(): Segment {
	const total = Math.ceil(TOTAL_WEIGHT * 100);
	let r = randomInt(0, total) / 100;
	for (const seg of SEGMENTS) {
		r -= seg.weight;
		if (r <= 0) return seg;
	}
	return SEGMENTS[SEGMENTS.length - 1];
}

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

		const { cost } = req.body as { cost: unknown };

		if (typeof cost !== "number" || !VALID_COSTS.includes(cost)) {
			next(new ApiError(400, "Cost must be 5, 15, 30, or 50"));
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

		// Server-side weighted segment pick
		const seg = pickSegment();
		const segIndex = SEGMENTS.indexOf(seg);

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

		// Determine if this spin is a "win" (anything except lose)
		const isWin = seg.type !== "lose";

		// Streak tracking: read current consecutiveWins
		const prevStreak = user.consecutiveWins ?? 0;
		const newConsecutiveWins = isWin ? prevStreak + 1 : 0;
		const streakBonus = isWin && newConsecutiveWins >= 3;

		// Calculate base winnings
		let wonCash = 0;
		let wonStars = 0;
		let wonTicket = 0;
		let wonPremium = 0;

		if (seg.type === "cash") {
			wonCash = Math.round(seg.value * multiplier);
		} else if (seg.type === "stars") {
			wonStars = Math.round(seg.value * multiplier);
		} else if (seg.type === "ticket") {
			wonTicket = seg.value;
		} else if (seg.type === "premium") {
			wonPremium = seg.value;
		} else {
			// lose — consolation stars
			wonStars = Math.round(STAR_EARN_ON_LOSS * multiplier);
		}

		// Apply streak bonus (+20%) on cash/star winnings if streak >= 3
		if (streakBonus && (wonCash > 0 || wonStars > 0)) {
			if (wonCash > 0) {
				wonCash = Math.round(wonCash * 1.2);
			}
			if (wonStars > 0) {
				wonStars = Math.round(wonStars * 1.2);
			}
		}

		// If cash cap is hit, convert cash winnings to stars (cash * 2 → stars)
		if (cashCapHit && wonCash > 0) {
			wonStars = wonCash * 2;
			wonCash = 0;
		}

		// Atomic user update: apply winnings, streak, playsToday, cash cap state
		const $set: Record<string, unknown> = {
			cashCapHit,
			consecutiveWins: newConsecutiveWins,
			lastPlayDate: now,
		};
		const $inc: Record<string, number> = {
			balance: wonCash,
			starsBalance: wonStars,
			tickets: wonTicket,
		};

		if (wonPremium > 0) {
			$set.isPremium = true;
		}

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
			desc: `Spin Play — ${cost.toLocaleString()} ETB`,
			amt: -cost,
		});

		if (wonCash > 0) {
			transactions.push({
				userId,
				type: "in",
				desc: `Spin winnings — ${wonCash.toLocaleString()} ETB`,
				amt: wonCash,
			});
		}

		if (wonStars > 0) {
			transactions.push({
				userId,
				type: "star",
				desc: `Spin winnings — ${wonStars.toLocaleString()} ⭐`,
				amt: wonStars,
			});
		}

		if (wonTicket > 0) {
			transactions.push({
				userId,
				type: "in",
				desc: "Spin winnings — Free Ticket",
				amt: 0,
			});
		}

		await Promise.all([
			Transaction.insertMany(transactions),
			SpinRound.create({
				userId,
				cost,
				segmentIndex: segIndex,
				segmentLabel: seg.label,
				prizeType: seg.type,
				prizeValue: seg.value,
				multiplier,
				streakBonus,
				wonCash,
				wonStars,
			}),
		]);

		res.json({
			success: true,
			segment: { label: seg.label, type: seg.type, value: seg.value },
			wonCash,
			wonStars,
			wonTicket,
			wonPremium,
			newBalance: updatedUser.balance,
			newStarsBalance: updatedUser.starsBalance,
			cashCapHit: updatedUser.cashCapHit,
			playsToday: updatedUser.playsToday,
			streak: newConsecutiveWins,
			streakBonus,
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

		const rounds = await SpinRound.find({ userId: req.auth.userId })
			.sort({ createdAt: -1 })
			.limit(10);

		res.json({ success: true, rounds });
	} catch (err) {
		next(err);
	}
}
