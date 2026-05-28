import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Ticket } from "../models/Ticket.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { WeeklyDraw } from "../models/WeeklyDraw.js";
import { WeeklyEntry } from "../models/WeeklyEntry.js";

const PICK_COUNT = 6;
const MAX_NUM = 42;
const ENTRY_STARS = 800;

function nextMondayDate(): Date {
	const now = new Date();
	const day = now.getDay();
	const diff = (8 - day) % 7 || 7;
	const d = new Date(now);
	d.setDate(now.getDate() + diff);
	d.setHours(20, 0, 0, 0);
	return d;
}

/** POST /api/draws/weekly/enter */
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

		const { numbers } = req.body as { numbers: unknown };

		// Validate: 6 unique ints 1-42
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

		const userId = req.auth.userId;

		// Get or create current open round
		let round = await WeeklyDraw.findOne({ status: "open" }).sort({
			createdAt: -1,
		});
		if (!round) {
			const latest = await WeeklyDraw.findOne().sort({ round: -1 });
			const nextRound = latest ? latest.round + 1 : 1;
			round = await WeeklyDraw.create({
				round: nextRound,
				status: "open",
				entryCostStars: ENTRY_STARS,
				prizePoolETB: 100000,
				drawDate: nextMondayDate(),
			});
		}

		const cost = round.entryCostStars ?? ENTRY_STARS;

		// Atomic star deduction
		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId, starsBalance: { $gte: cost } },
			{ $inc: { starsBalance: -cost, tickets: 1 } },
			{ new: true },
		);

		if (!updatedUser) {
			next(new ApiError(400, "Insufficient stars balance"));
			return;
		}

		// Create entry
		const entry = await WeeklyEntry.create({
			userId,
			round: round.round,
			numbers,
		});

		// Create transaction for star deduction
		await Transaction.create({
			userId,
			type: "star",
			desc: `Weekly draw entry — Round ${round.round}`,
			amt: -cost,
		});

		// Create Ticket record
		await Ticket.create({
			userId,
			drawType: "weekly",
			drawId: round._id,
			entryType: "stars",
		});

		res.json({
			success: true,
			entry: {
				numbers: entry.numbers,
				round: entry.round,
			},
			newStarsBalance: updatedUser.starsBalance,
		});
	} catch (err) {
		next(err);
	}
}

/** GET /api/draws/weekly/current */
export async function currentRound(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		let draw = await WeeklyDraw.findOne({ status: "open" }).sort({
			createdAt: -1,
		});

		if (!draw) {
			const latest = await WeeklyDraw.findOne().sort({ round: -1 });
			const nextRound = latest ? latest.round + 1 : 1;
			draw = await WeeklyDraw.create({
				round: nextRound,
				status: "open",
				entryCostStars: ENTRY_STARS,
				prizePoolETB: 100000,
				drawDate: nextMondayDate(),
			});
		}

		const entryCount = await WeeklyEntry.countDocuments({ round: draw.round });

		res.json({
			success: true,
			round: {
				round: draw.round,
				drawDate: draw.drawDate,
				entryCount,
				prizePoolETB: draw.prizePoolETB,
				status: draw.status,
			},
		});
	} catch (err) {
		next(err);
	}
}

/** GET /api/draws/weekly/result */
export async function result(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const draw = await WeeklyDraw.findOne({ status: "completed" }).sort({
			completedAt: -1,
		});

		if (!draw) {
			res.json({ success: true, result: null });
			return;
		}

		res.json({
			success: true,
			result: {
				winningNumbers: draw.winningNumbers,
				winners: draw.winners,
				round: draw.round,
				date: draw.completedAt,
			},
		});
	} catch (err) {
		next(err);
	}
}

/** GET /api/draws/weekly/entries */
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

		const userEntries = await WeeklyEntry.find({
			userId: req.auth.userId,
		})
			.sort({ createdAt: -1 })
			.limit(50);

		res.json({ success: true, entries: userEntries });
	} catch (err) {
		next(err);
	}
}
