import type { NextFunction, Request, Response } from "express";
import { GameConfig } from "../models/GameConfig.js";
import { PlatformConfig } from "../models/PlatformConfig.js";

const GAME_CONFIG_DEFAULTS: Record<string, unknown> = {
	spinCost: 5,
	scratchCost: 5,
	quickPlayCost: 2,
	cashCapPlays: 8,
	starEarnRate: 35,
};

const PLATFORM_CONFIG_DEFAULTS: Record<string, unknown> = {
	platformName: "LuckyAI",
	supportEmail: "support@luckyai.et",
	withdrawalMinETB: 50,
	maxDepositETB: 50000,
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

async function ensurePlatformConfigSeeded(): Promise<void> {
	const count = await PlatformConfig.countDocuments();
	if (count === 0) {
		const docs = Object.entries(PLATFORM_CONFIG_DEFAULTS).map(([key, value]) => ({
			key,
			value,
		}));
		await PlatformConfig.insertMany(docs);
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

export async function getGameConfig(
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

export async function updateGameConfig(
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

export async function getPlatformConfig(
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

export async function updatePlatformConfig(
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
