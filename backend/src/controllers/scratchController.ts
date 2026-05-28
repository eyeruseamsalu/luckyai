import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { ScratchRound } from "../models/ScratchRound.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const VALID_COSTS: number[] = [5, 10, 25, 50];
const CASH_CAP_PLAYS = 8;

interface ScratchPrize {
	tier: "high" | "mid" | "asset";
	headline: string;
	sub: string;
	cash?: number;
	stars: number;
	boostLabel?: string;
	weight: number;
}

const PRIZES: ScratchPrize[] = [
	// high tier (4% combined)
	{
		tier: "high",
		headline: "200 ETB + 40★",
		sub: "Top prize. Credited instantly.",
		cash: 200,
		stars: 40,
		weight: 2,
	},
	{
		tier: "high",
		headline: "100 ETB + 20★",
		sub: "High prize. Added to your balance.",
		cash: 100,
		stars: 20,
		weight: 2,
	},
	// mid tier (26% combined)
	{
		tier: "mid",
		headline: "50 ETB + 15★",
		sub: "Good card. Both rewards credited.",
		cash: 50,
		stars: 15,
		weight: 10,
	},
	{
		tier: "mid",
		headline: "25 ETB + 10★",
		sub: "Partial match. Rewards added.",
		cash: 25,
		stars: 10,
		weight: 16,
	},
	// asset tier (70% combined)
	{
		tier: "asset",
		headline: "2x Stars next 5 plays",
		sub: "Double Stars on your next 5 plays. Plus bonus Stars.",
		stars: 25,
		boostLabel: "2x Stars next 5 plays",
		weight: 22,
	},
	{
		tier: "asset",
		headline: "Loss protection x3",
		sub: "Stake refunded on next 3 losses. Plus Stars.",
		stars: 20,
		boostLabel: "Loss protection x3",
		weight: 22,
	},
	{
		tier: "asset",
		headline: "Crown Draw entry",
		sub: "One bonus entry added. Plus Stars.",
		stars: 35,
		boostLabel: "Crown Draw entry",
		weight: 26,
	},
];

function pickPrize(): ScratchPrize {
	const total = PRIZES.reduce((s, p) => s + p.weight, 0);
	const scaled = Math.ceil(total * 100);
	let r = randomInt(0, scaled) / 100;
	for (const prize of PRIZES) {
		r -= prize.weight;
		if (r <= 0) return prize;
	}
	return PRIZES[PRIZES.length - 1];
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

		// Validate cost: 5, 10, 25, or 50
		if (typeof cost !== "number" || !VALID_COSTS.includes(cost)) {
			next(new ApiError(400, "Cost must be 5, 10, 25, or 50"));
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

		const isNewDay = !user.lastPlayDate || user.lastPlayDate < startOfToday;
		const currentPlaysToday = isNewDay ? 0 : (user.playsToday ?? 0);
		const upcomingPlaysToday = currentPlaysToday + 1;
		const cashCapHit = upcomingPlaysToday >= CASH_CAP_PLAYS;

		// Server-side weighted prize pick
		const prize = pickPrize();
		const prizeIndex = PRIZES.indexOf(prize);

		// Calculate winnings
		let wonCash = prize.cash ?? 0;
		let wonStars = prize.stars;

		// If cash cap is hit, convert cash winnings to stars (cash * 2 → stars)
		if (cashCapHit && wonCash > 0) {
			wonStars += wonCash * 2;
			wonCash = 0;
		}

		// Prepare atomic user update
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

		// Apply asset-tier boosts
		if (prize.tier === "asset" && prize.boostLabel) {
			if (prize.boostLabel === "2x Stars next 5 plays") {
				$set.activeBoosts = [
					...(user.activeBoosts ?? []),
					{
						type: "multiplier",
						label: prize.boostLabel,
						icon: "ti-star",
						expiresAfter: 5,
						expiresAt: new Date(now.getTime() + 7 * 86_400_000),
						activatedAt: now,
					},
				];
			} else if (prize.boostLabel === "Loss protection x3") {
				$set.activeBoosts = [
					...(user.activeBoosts ?? []),
					{
						type: "lossProtection",
						label: prize.boostLabel,
						icon: "ti-shield",
						expiresAfter: 3,
						expiresAt: new Date(now.getTime() + 7 * 86_400_000),
						activatedAt: now,
					},
				];
			} else if (prize.boostLabel === "Crown Draw entry") {
				$inc.bonusDrawEntries = 1;
			}
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
			desc: `Scratch Play — ${cost.toLocaleString()} ETB`,
			amt: -cost,
		});

		if (wonCash > 0) {
			transactions.push({
				userId,
				type: "in",
				desc: `Scratch winnings — ${wonCash.toLocaleString()} ETB`,
				amt: wonCash,
			});
		}

		if (wonStars > 0) {
			transactions.push({
				userId,
				type: "star",
				desc: `Scratch winnings — ${wonStars.toLocaleString()} ⭐`,
				amt: wonStars,
			});
		}

		await Promise.all([
			Transaction.insertMany(transactions),
			ScratchRound.create({
				userId,
				cost,
				cardIndex: 0,
				setKey: 0,
				prizeIndex,
				prizeTier: prize.tier,
				prizeCash: prize.cash ?? 0,
				prizeStars: prize.stars,
				boostLabel: prize.boostLabel ?? null,
				wonCash,
				wonStars,
			}),
		]);

		res.json({
			success: true,
			prize: {
				tier: prize.tier,
				headline: prize.headline,
				sub: prize.sub,
				cash: prize.cash,
				stars: prize.stars,
				boostLabel: prize.boostLabel,
			},
			wonCash,
			wonStars,
			newBalance: updatedUser.balance,
			newStarsBalance: updatedUser.starsBalance,
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

		const rounds = await ScratchRound.find({ userId: req.auth.userId })
			.sort({ createdAt: -1 })
			.limit(10);

		res.json({ success: true, rounds });
	} catch (err) {
		next(err);
	}
}
