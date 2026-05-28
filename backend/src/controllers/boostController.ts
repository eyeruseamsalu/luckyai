import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const BOOST_COSTS: Record<string, number> = {
	multiplier: 150,
	lossProtection: 80,
	premiumDay: 200,
};

const BOOST_CONFIGS: Record<
	string,
	{ label: string; icon: string; expiresAfter: number }
> = {
	multiplier: { label: "2x Stars", icon: "ti-bolt", expiresAfter: 5 },
	lossProtection: {
		label: "Loss Protection",
		icon: "ti-shield",
		expiresAfter: 3,
	},
	premiumDay: { label: "Premium Day", icon: "ti-crown", expiresAfter: 1 },
};

const VALID_TYPES = ["multiplier", "lossProtection", "premiumDay"];

export async function activate(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { type } = req.body as { type: string };

		if (!VALID_TYPES.includes(type)) {
			next(
				new ApiError(
					400,
					"Invalid boost type — must be multiplier, lossProtection, or premiumDay",
				),
			);
			return;
		}

		const cost = BOOST_COSTS[type];
		const config = BOOST_CONFIGS[type];

		const existing = await User.findById(req.auth.userId);
		if (!existing) {
			next(new ApiError(404, "User not found"));
			return;
		}

		if (existing.activeBoosts?.some((b) => b.type === type)) {
			next(new ApiError(400, "Boost already active"));
			return;
		}

		const boostEntry: Record<string, unknown> = {
			type,
			label: config.label,
			icon: config.icon,
			expiresAfter: config.expiresAfter,
			activatedAt: new Date(),
		};

		const update: Record<string, unknown> = {
			$inc: { starsBalance: -cost },
			$push: { activeBoosts: boostEntry },
		};

		if (type === "premiumDay") {
			update.$set = {
				isPremium: true,
				premiumExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};
		}

		const user = await User.findOneAndUpdate(
			{ _id: req.auth.userId, starsBalance: { $gte: cost } },
			update,
			{ new: true },
		);

		if (!user) {
			next(new ApiError(400, "Insufficient stars"));
			return;
		}

		await Transaction.create({
			userId: req.auth.userId,
			type: "star" as const,
			desc: `Boost activated — ${config.label} (${cost}★)`,
			amt: -cost,
		});

		res.json({
			success: true,
			boost: {
				type,
				label: config.label,
				icon: config.icon,
				expiresAfter: config.expiresAfter,
			},
			newStarsBalance: user.starsBalance,
		});
	} catch (err) {
		next(err);
	}
}

export async function deactivate(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { type } = req.body as { type: string };

		if (!VALID_TYPES.includes(type)) {
			next(
				new ApiError(
					400,
					"Invalid boost type — must be multiplier, lossProtection, or premiumDay",
				),
			);
			return;
		}

		await User.findByIdAndUpdate(req.auth.userId, {
			$pull: { activeBoosts: { type } },
		});

		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

export async function list(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
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

		res.json({ success: true, boosts: user.activeBoosts ?? [] });
	} catch (err) {
		next(err);
	}
}

export async function consume(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { type } = req.body as { type: string };

		if (!VALID_TYPES.includes(type)) {
			next(
				new ApiError(
					400,
					"Invalid boost type — must be multiplier, lossProtection, or premiumDay",
				),
			);
			return;
		}

		const user = await User.findById(req.auth.userId);
		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}

		const boost = user.activeBoosts?.find((b) => b.type === type);
		if (!boost || boost.expiresAfter == null) {
			next(new ApiError(404, "Boost not found"));
			return;
		}

		const remaining = boost.expiresAfter - 1;

		if (remaining <= 0) {
			await User.findByIdAndUpdate(req.auth.userId, {
				$pull: { activeBoosts: { type } },
			});

			res.json({ success: true, consumed: true, remaining: 0 });
		} else {
			await User.findOneAndUpdate(
				{ _id: req.auth.userId, "activeBoosts.type": type },
				{ $set: { "activeBoosts.$.expiresAfter": remaining } },
			);

			res.json({ success: true, consumed: true, remaining });
		}
	} catch (err) {
		next(err);
	}
}
