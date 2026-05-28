import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { CrownDraw } from "../models/CrownDraw.js";
import { CrownDrawEntry } from "../models/CrownDrawEntry.js";
import { Ticket } from "../models/Ticket.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const ENTRY_COST_MAP: Record<string, { starsCost: number; cashCost: number }> = {
	stars: { starsCost: 1500, cashCost: 0 },
	cash: { starsCost: 0, cashCost: 500 },
	hybrid: { starsCost: 750, cashCost: 250 },
};

const PICK_COUNT = 6;
const MAX_NUM = 42;
const MAX_SUGGESTIONS = 3;

export async function enter(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { numbers, entryType } = req.body as {
			numbers: unknown;
			entryType: unknown;
		};

		// Validate numbers: array of 6 unique ints 1-42
		if (
			!Array.isArray(numbers) ||
			numbers.length !== PICK_COUNT ||
			!numbers.every(
				(n): n is number =>
					typeof n === "number" &&
					Number.isInteger(n) &&
					n >= 1 &&
					n <= MAX_NUM,
			) ||
			new Set(numbers).size !== PICK_COUNT
		) {
			next(
				new ApiError(
					400,
					"Numbers must be 6 unique integers between 1 and 42",
				),
			);
			return;
		}

		// Validate entryType
		if (typeof entryType !== "string" || !(entryType in ENTRY_COST_MAP)) {
			next(new ApiError(400, "Entry type must be 'stars', 'cash', or 'hybrid'"));
			return;
		}

		const { starsCost, cashCost } = ENTRY_COST_MAP[entryType];
		const userId = req.auth.userId;

		// Atomic deduction for both cash and stars on the same user document
		const updatedUser = await User.findOneAndUpdate(
			{
				_id: userId,
				balance: { $gte: cashCost },
				starsBalance: { $gte: starsCost },
			},
			{
				$inc: {
					balance: -cashCost,
					starsBalance: -starsCost,
					tickets: 1,
				},
			},
			{ new: true },
		);

		if (!updatedUser) {
			// Determine which balance was insufficient for a helpful error
			const user = await User.findById(userId);
			if (!user) {
				next(new ApiError(404, "User not found"));
				return;
			}
			if (cashCost > 0 && user.balance < cashCost) {
				next(new ApiError(400, "Insufficient balance"));
				return;
			}
			if (starsCost > 0 && user.starsBalance < starsCost) {
				next(new ApiError(400, "Insufficient stars balance"));
				return;
			}
			next(new ApiError(400, "Insufficient funds"));
			return;
		}

		// Find or create active CrownDraw
		let draw = await CrownDraw.findOne({ status: "active" });
		if (!draw) {
			draw = await CrownDraw.create({
				name: "Crown Draw",
				status: "active",
				jackpotAmount: 500000,
				entryCount: 0,
				ticketPriceETB: 500,
				starEntryCost: 1500,
				drawDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			});
		}

		// Create entry
		const entry = await CrownDrawEntry.create({
			userId,
			drawId: draw._id,
			numbers,
			entryType,
			starsCost,
			cashCost,
		});

		// Increment draw entryCount
		await CrownDraw.findByIdAndUpdate(draw._id, { $inc: { entryCount: 1 } });

		// Create Ticket record
		await Ticket.create({
			userId,
			drawType: "crown",
			drawId: draw._id,
			entryType,
		});

		// Create Transaction records for deductions
		const transactions: Array<{
			userId: string;
			type: "in" | "out" | "star";
			desc: string;
			amt: number;
		}> = [];

		if (cashCost > 0) {
			transactions.push({
				userId,
				type: "out",
				desc: `Crown Draw entry — ${cashCost.toLocaleString()} ETB`,
				amt: -cashCost,
			});
		}

		if (starsCost > 0) {
			transactions.push({
				userId,
				type: "star",
				desc: `Crown Draw entry — ${starsCost.toLocaleString()} ⭐`,
				amt: -starsCost,
			});
		}

		if (transactions.length > 0) {
			await Transaction.insertMany(transactions);
		}

		res.json({
			success: true,
			entryId: entry._id,
			tickets: updatedUser.tickets,
			newBalance: updatedUser.balance,
			newStarsBalance: updatedUser.starsBalance,
		});
	} catch (err) {
		next(err);
	}
}

export async function suggest(
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
		const user = await User.findById(userId);

		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}

		const suggestionsUsed = user.suggestionsUsed ?? 0;

		if (suggestionsUsed >= MAX_SUGGESTIONS) {
			next(new ApiError(400, "No suggestions remaining"));
			return;
		}

		let cost = 0;

		if (suggestionsUsed >= 2) {
			// 3rd suggestion costs 1 ETB — atomic guard
			cost = 1;
			const updatedUser = await User.findOneAndUpdate(
				{ _id: userId, balance: { $gte: cost } },
				{ $inc: { balance: -cost } },
				{ new: true },
			);
			if (!updatedUser) {
				next(new ApiError(400, "Insufficient balance for suggestion"));
				return;
			}
		}

		await User.findByIdAndUpdate(userId, { $inc: { suggestionsUsed: 1 } });

		// Generate 6 random unique numbers 1-42 via crypto.randomInt
		const numbers: number[] = [];
		const seen = new Set<number>();
		while (numbers.length < PICK_COUNT) {
			const n = randomInt(1, MAX_NUM + 1);
			if (!seen.has(n)) {
				seen.add(n);
				numbers.push(n);
			}
		}
		numbers.sort((a, b) => a - b);

		res.json({
			success: true,
			numbers,
			cost,
		});
	} catch (err) {
		next(err);
	}
}

export async function entries(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const userEntries = await CrownDrawEntry.find({
			userId: req.auth.userId,
		})
			.sort({ createdAt: -1 })
			.limit(20);

		res.json({ success: true, entries: userEntries });
	} catch (err) {
		next(err);
	}
}

export async function activeDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const draw = await CrownDraw.findOne({ status: "active" }).sort({
			createdAt: -1,
		});

		if (!draw) {
			res.json({ success: true, draw: null });
			return;
		}

		res.json({
			success: true,
			draw: {
				name: draw.name,
				jackpotAmount: draw.jackpotAmount,
				entryCount: draw.entryCount,
				drawDate: draw.drawDate,
				ticketPriceETB: draw.ticketPriceETB,
				starEntryCost: draw.starEntryCost,
			},
		});
	} catch (err) {
		next(err);
	}
}
