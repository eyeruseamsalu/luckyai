import { randomInt } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { CrownDraw } from "../models/CrownDraw.js";
import { CrownDrawEntry } from "../models/CrownDrawEntry.js";
import { GameConfig } from "../models/GameConfig.js";
import { PlatformConfig } from "../models/PlatformConfig.js";
import { QuickRound } from "../models/QuickRound.js";
import { ScratchRound } from "../models/ScratchRound.js";
import { ShopItem } from "../models/ShopItem.js";
import { SpinRound } from "../models/SpinRound.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { WeeklyDraw } from "../models/WeeklyDraw.js";
import { WeeklyEntry } from "../models/WeeklyEntry.js";

// ---------------------------------------------------------------------------
// Overview (Task 22)
// ---------------------------------------------------------------------------

export async function getOverview(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const totalUsers = await User.countDocuments();
		const totalRevenueAgg = await Transaction.aggregate([
			{ $match: { type: "in" } },
			{ $group: { _id: null, total: { $sum: "$amt" } } },
		]);
		const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
		const totalDraws = await CrownDraw.countDocuments();
		const activeGames = await Promise.all([
			SpinRound.countDocuments(),
			ScratchRound.countDocuments(),
			QuickRound.countDocuments(),
		]);
		const totalActiveGames = activeGames.reduce((a, b) => a + b, 0);

		const recentActivity = await Transaction.find()
			.sort({ createdAt: -1 })
			.limit(10)
			.lean();

		const starsIssuedAgg = await Transaction.aggregate([
			{ $match: { type: "star", amt: { $gt: 0 } } },
			{ $group: { _id: null, total: { $sum: "$amt" } } },
		]);
		const starsIssued = starsIssuedAgg[0]?.total ?? 0;

		const starsRedeemedAgg = await Transaction.aggregate([
			{ $match: { type: "star", amt: { $lt: 0 } } },
			{ $group: { _id: null, total: { $sum: { $abs: "$amt" } } } },
		]);
		const starsRedeemed = starsRedeemedAgg[0]?.total ?? 0;

		res.json({
			success: true,
			stats: {
				totalUsers,
				totalRevenue,
				totalDraws,
				activeGames: totalActiveGames,
				recentActivity,
				starsIssued,
				starsRedeemed,
			},
		});
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Users CRUD (Task 23)
// ---------------------------------------------------------------------------

export async function getUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const page = Math.max(1, Number(req.query.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
		const search = (req.query.search as string) || "";

		const filter: Record<string, unknown> = {};
		if (search) {
			const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			filter.$or = [
				{ name: { $regex: escaped, $options: "i" } },
				{ email: { $regex: escaped, $options: "i" } },
			];
		}

		const [users, total] = await Promise.all([
			User.find(filter)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean(),
			User.countDocuments(filter),
		]);

		res.json({
			success: true,
			users,
			total,
			page,
			pages: Math.ceil(total / limit),
		});
	} catch (err) {
		next(err);
	}
}

export async function updateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const allowedFields = [
			"name",
			"email",
			"role",
			"isPremium",
			"balance",
			"starsBalance",
		];
		const updates: Record<string, unknown> = {};
		for (const key of allowedFields) {
			if (req.body[key] !== undefined) {
				updates[key] = req.body[key];
			}
		}

		if (Object.keys(updates).length === 0) {
			next(new ApiError(400, "No valid fields to update"));
			return;
		}

		const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}

		res.json({ success: true, user });
	} catch (err) {
		next(err);
	}
}

export async function suspendUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const user = await User.findByIdAndUpdate(
			id,
			{ $set: { role: "suspended" } },
			{ new: true },
		);
		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}
		res.json({ success: true, user });
	} catch (err) {
		next(err);
	}
}

export async function activateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const user = await User.findByIdAndUpdate(
			id,
			{ $set: { role: "user" } },
			{ new: true },
		);
		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}
		res.json({ success: true, user });
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Crown Draw Management (Task 24)
// ---------------------------------------------------------------------------

export async function getCrownDraws(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const draws = await CrownDraw.find().sort({ createdAt: -1 }).lean();
		res.json({ success: true, draws });
	} catch (err) {
		next(err);
	}
}

export async function createCrownDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { name, jackpotAmount, drawDate, ticketPriceETB, starEntryCost } =
			req.body as {
				name?: string;
				jackpotAmount?: number;
				drawDate?: string;
				ticketPriceETB?: number;
				starEntryCost?: number;
			};

		if (!name || !jackpotAmount || !drawDate) {
			next(
				new ApiError(400, "name, jackpotAmount, and drawDate are required"),
			);
			return;
		}

		const draw = await CrownDraw.create({
			name,
			status: "active",
			jackpotAmount,
			drawDate: new Date(drawDate),
			ticketPriceETB: ticketPriceETB ?? 500,
			starEntryCost: starEntryCost ?? 1500,
		});

		res.status(201).json({ success: true, draw });
	} catch (err) {
		next(err);
	}
}

export async function editCrownDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const allowedFields = [
			"name",
			"jackpotAmount",
			"drawDate",
			"ticketPriceETB",
			"starEntryCost",
		];
		const updates: Record<string, unknown> = {};
		for (const key of allowedFields) {
			if (req.body[key] !== undefined) {
				updates[key] = key === "drawDate" ? new Date(req.body[key]) : req.body[key];
			}
		}

		if (Object.keys(updates).length === 0) {
			next(new ApiError(400, "No valid fields to update"));
			return;
		}

		const draw = await CrownDraw.findByIdAndUpdate(
			id,
			{ $set: updates },
			{ new: true },
		);
		if (!draw) {
			next(new ApiError(404, "Crown draw not found"));
			return;
		}

		res.json({ success: true, draw });
	} catch (err) {
		next(err);
	}
}

export async function runCrownDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;

		const draw = await CrownDraw.findById(id);
		if (!draw) {
			next(new ApiError(404, "Crown draw not found"));
			return;
		}
		if (draw.status !== "active") {
			next(new ApiError(400, "Draw is not active"));
			return;
		}

		const winningNumbers: number[] = [];
		const seen = new Set<number>();
		while (winningNumbers.length < 6) {
			const n = randomInt(1, 43);
			if (!seen.has(n)) {
				seen.add(n);
				winningNumbers.push(n);
			}
		}
		winningNumbers.sort((a, b) => a - b);

		const entries = await CrownDrawEntry.find({ drawId: id });

		const PRIZE_PERCENTAGES: Record<number, number> = {
			6: 100,
			5: 10,
			4: 2,
			3: 0.5,
		};

		type WinnerInfo = {
			userId: string;
			entryId: string;
			matchCount: number;
			prize: number;
		};

		const winners: WinnerInfo[] = [];

		for (const entry of entries) {
			const matches = entry.numbers.filter((n: number) =>
				winningNumbers.includes(n),
			).length;

			if (matches >= 3) {
				let prize = 0;
				if (matches === 6) {
					winners.push({
						userId: entry.userId.toString(),
						entryId: entry._id.toString(),
						matchCount: matches,
						prize: 0,
					});
				} else {
					const pct = PRIZE_PERCENTAGES[matches] ?? 0;
					prize = Math.floor((draw.jackpotAmount * pct) / 100);
					winners.push({
						userId: entry.userId.toString(),
						entryId: entry._id.toString(),
						matchCount: matches,
						prize,
					});
				}
			}
		}

		const jackpotWinners = winners.filter((w) => w.matchCount === 6);
		if (jackpotWinners.length > 0) {
			const share = Math.floor(draw.jackpotAmount / jackpotWinners.length);
			for (const w of jackpotWinners) {
				w.prize = share;
			}
		}

		const now = new Date();
		const transactions: Array<{
			userId: string;
			type: "in";
			desc: string;
			amt: number;
		}> = [];

		for (const w of winners) {
			await User.findByIdAndUpdate(w.userId, {
				$inc: { balance: w.prize },
			});
			transactions.push({
				userId: w.userId,
				type: "in",
				desc: `Crown Draw win — ${w.matchCount}/6 match — ${w.prize.toLocaleString()} ETB`,
				amt: w.prize,
			});
		}

		if (transactions.length > 0) {
			await Transaction.insertMany(transactions);
		}

		draw.status = "completed";
		draw.winningNumbers = winningNumbers;
		draw.winners = winners.length;
		draw.completedAt = now;
		await draw.save();

		for (const entry of entries) {
			const matchCount = entry.numbers.filter((n: number) =>
				winningNumbers.includes(n),
			).length;
			if (matchCount >= 3) {
				await CrownDrawEntry.findByIdAndUpdate(entry._id, {
					$set: { matchCount },
				});
			}
		}

		res.json({
			success: true,
			result: {
				winningNumbers,
				winners: winners.length,
				totalPrizeDistributed: winners.reduce((s, w) => s + w.prize, 0),
				completedAt: now,
			},
		});
	} catch (err) {
		next(err);
	}
}

export async function cancelCrownDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params;
		const draw = await CrownDraw.findByIdAndUpdate(
			id,
			{ $set: { status: "cancelled" } },
			{ new: true },
		);
		if (!draw) {
			next(new ApiError(404, "Crown draw not found"));
			return;
		}
		res.json({ success: true, draw });
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Weekly Draw Management (Task 25)
// ---------------------------------------------------------------------------

export async function getWeeklyDraws(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const draws = await WeeklyDraw.find().sort({ round: -1 }).lean();
		res.json({ success: true, draw: draws.length > 0 ? draws[0] : null });
	} catch (err) {
		next(err);
	}
}

export async function createWeeklyDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { entryCostStars, prizePoolETB } = req.body as {
			entryCostStars?: number;
			prizePoolETB?: number;
		};

		const lastDraw = await WeeklyDraw.findOne()
			.sort({ round: -1 })
			.select("round")
			.lean();
		const round = (lastDraw?.round ?? 0) + 1;

		const draw = await WeeklyDraw.create({
			round,
			status: "open",
			entryCostStars: entryCostStars ?? 800,
			prizePoolETB: prizePoolETB ?? 100000,
		});

		res.status(201).json({ success: true, draw });
	} catch (err) {
		next(err);
	}
}

export async function runWeeklyDraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const round = Number(req.params.round);

		const draw = await WeeklyDraw.findOne({ round });
		if (!draw) {
			next(new ApiError(404, "Weekly draw not found"));
			return;
		}
		if (draw.status !== "open") {
			next(new ApiError(400, "Draw is not open"));
			return;
		}

		const winningNumbers: number[] = [];
		const seen = new Set<number>();
		while (winningNumbers.length < 6) {
			const n = randomInt(1, 43);
			if (!seen.has(n)) {
				seen.add(n);
				winningNumbers.push(n);
			}
		}
		winningNumbers.sort((a, b) => a - b);

		const entries = await WeeklyEntry.find({ round });

		const PRIZES: Record<number, number> = {
			6: draw.prizePoolETB,
			5: 5000,
			4: 1000,
			3: 200,
		};

		type WinnerInfo = {
			userId: string;
			matchCount: number;
			prize: number;
		};

		const winners: WinnerInfo[] = [];

		for (const entry of entries) {
			const matches = entry.numbers.filter((n: number) =>
				winningNumbers.includes(n),
			).length;

			if (matches >= 3) {
				const prize = PRIZES[matches] ?? 0;
				winners.push({
					userId: entry.userId.toString(),
					matchCount: matches,
					prize,
				});

				await WeeklyEntry.findByIdAndUpdate(entry._id, {
					$set: { matchCount: matches, winAmount: prize },
				});
			} else {
				await WeeklyEntry.findByIdAndUpdate(entry._id, {
					$set: { matchCount: matches, winAmount: 0 },
				});
			}
		}

		const jackpotWinners = winners.filter((w) => w.matchCount === 6);
		if (jackpotWinners.length > 0) {
			const share = Math.floor(draw.prizePoolETB / jackpotWinners.length);
			for (const w of jackpotWinners) {
				w.prize = share;
			}
		}

		const now = new Date();
		const transactions: Array<{
			userId: string;
			type: "in";
			desc: string;
			amt: number;
		}> = [];

		for (const w of winners) {
			await User.findByIdAndUpdate(w.userId, {
				$inc: { balance: w.prize },
			});
			transactions.push({
				userId: w.userId,
				type: "in",
				desc: `Weekly Draw Round ${round} — ${w.matchCount}/6 match — ${w.prize.toLocaleString()} ETB`,
				amt: w.prize,
			});
		}

		if (transactions.length > 0) {
			await Transaction.insertMany(transactions);
		}

		draw.status = "completed";
		draw.winningNumbers = winningNumbers;
		draw.winners = winners.length;
		draw.drawDate = now;
		draw.completedAt = now;
		await draw.save();

		res.json({
			success: true,
			result: {
				round,
				winningNumbers,
				winners: winners.length,
				totalPrizeDistributed: winners.reduce((s, w) => s + w.prize, 0),
				completedAt: now,
			},
		});
	} catch (err) {
		next(err);
	}
}

export async function getWeeklyEntries(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const entries = await WeeklyEntry.find()
			.sort({ createdAt: -1 })
			.populate("userId", "name email")
			.lean();
		res.json({ success: true, entries });
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Game Config (Task 26)
// ---------------------------------------------------------------------------

const GAME_CONFIG_DEFAULTS: Record<string, unknown> = {
	spinCost: 5,
	scratchCost: 5,
	quickPlayCost: 2,
	cashCapPlays: 8,
	starEarnRate: 35,
};

async function ensureGameConfigSeeded(): Promise<void> {
	const count = await GameConfig.countDocuments();
	if (count === 0) {
		const docs = Object.entries(GAME_CONFIG_DEFAULTS).map(([key, value]) => ({
			key,
			value,
		}));
		await GameConfig.insertMany(docs);
	}
}

function entriesToObject(
	entries: Array<{ key: string; value: unknown }>,
): Record<string, unknown> {
	const config: Record<string, unknown> = {};
	for (const entry of entries) {
		config[entry.key] = entry.value;
	}
	return config;
}

export async function getAdminGameConfig(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		await ensureGameConfigSeeded();
		const entries = await GameConfig.find().lean();
		res.json({ success: true, config: entriesToObject(entries) });
	} catch (err) {
		next(err);
	}
}

export async function updateAdminGameConfig(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const updates: Record<string, unknown> = req.body;
		for (const [key, value] of Object.entries(updates)) {
			await GameConfig.findOneAndUpdate(
				{ key },
				{ key, value },
				{ upsert: true, new: true },
			);
		}
		const entries = await GameConfig.find().lean();
		res.json({ success: true, config: entriesToObject(entries) });
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Platform Config (Task 28)
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG_DEFAULTS: Record<string, unknown> = {
	platformName: "LuckyAI",
	supportEmail: "support@luckyai.et",
	withdrawalMinETB: 50,
	maxDepositETB: 50000,
};

async function ensurePlatformConfigSeeded(): Promise<void> {
	const count = await PlatformConfig.countDocuments();
	if (count === 0) {
		const docs = Object.entries(PLATFORM_CONFIG_DEFAULTS).map(
			([key, value]) => ({ key, value }),
		);
		await PlatformConfig.insertMany(docs);
	}
}

export async function getAdminPlatformConfig(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		await ensurePlatformConfigSeeded();
		const entries = await PlatformConfig.find().lean();
		res.json({ success: true, config: entriesToObject(entries) });
	} catch (err) {
		next(err);
	}
}

export async function updateAdminPlatformConfig(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const updates: Record<string, unknown> = req.body;
		for (const [key, value] of Object.entries(updates)) {
			await PlatformConfig.findOneAndUpdate(
				{ key },
				{ key, value },
				{ upsert: true, new: true },
			);
		}
		const entries = await PlatformConfig.find().lean();
		res.json({ success: true, config: entriesToObject(entries) });
	} catch (err) {
		next(err);
	}
}

// ---------------------------------------------------------------------------
// Economy/Shop Config (Task 27)
// ---------------------------------------------------------------------------

export async function getEconomyConfig(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const gameConfigEntries = await GameConfig.find().lean();
		const config = entriesToObject(gameConfigEntries);
		const starRate = (config.starEarnRate as number) ?? 35;

		const items = await ShopItem.find().lean();

		res.json({
			success: true,
			config: {
				starEarnRate: starRate,
				items,
			},
		});
	} catch (err) {
		next(err);
	}
}

export async function updateStarRate(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { rate } = req.body as { rate?: number };
		if (typeof rate !== "number" || rate < 0 || rate > 1000) {
			next(new ApiError(400, "rate must be a number between 0 and 1000"));
			return;
		}

		await GameConfig.findOneAndUpdate(
			{ key: "starEarnRate" },
			{ key: "starEarnRate", value: rate },
			{ upsert: true, new: true },
		);

		res.json({ success: true, config: { starEarnRate: rate } });
	} catch (err) {
		next(err);
	}
}

export async function getAdminEconomyItems(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const items = await ShopItem.find().lean();
		res.json({ success: true, items });
	} catch (err) {
		next(err);
	}
}

export async function updateItemCost(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { key } = req.params;
		const { cost } = req.body as { cost?: number };

		if (typeof cost !== "number" || cost < 0) {
			next(new ApiError(400, "cost must be a positive number"));
			return;
		}

		const item = await ShopItem.findOneAndUpdate(
			{ key },
			{ $set: { starCost: cost } },
			{ new: true },
		);
		if (!item) {
			next(new ApiError(404, "Shop item not found"));
			return;
		}

		res.json({ success: true, item });
	} catch (err) {
		next(err);
	}
}
