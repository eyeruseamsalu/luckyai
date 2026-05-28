import type { NextFunction, Request, Response } from "express";
import { randomInt } from "node:crypto";
import { ApiError } from "../middleware/errorHandler.js";
import { ShopItem } from "../models/ShopItem.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Boost } from "../models/Boost.js";
import { Ticket } from "../models/Ticket.js";

const DEFAULT_ITEMS = [
	{ key: "multiplier", name: "Multiplier", starCost: 150, type: "boost" as const, description: "2x stars on all wins for 5 plays" },
	{ key: "lossProtection", name: "Loss Protection", starCost: 80, type: "boost" as const, description: "Refund on next losing play" },
	{ key: "premiumDay", name: "Premium Day", starCost: 200, type: "premium" as const, description: "24h premium access" },
	{ key: "crownTicket", name: "Crown Ticket", starCost: 1500, type: "ticket" as const, description: "Crown Draw entry" },
	{ key: "weeklyTicket", name: "Weekly Ticket", starCost: 800, type: "ticket" as const, description: "Weekly Draw entry" },
	{ key: "mysteryBox", name: "Mystery Box", starCost: 500, type: "mystery" as const, description: "Random prize (10-1000★)" },
];

export async function listItems(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		let items = await ShopItem.find({ active: true }).lean();

		if (items.length === 0) {
			await ShopItem.insertMany(DEFAULT_ITEMS);
			items = await ShopItem.find({ active: true }).lean();
		}

		res.json({ success: true, items });
	} catch (err) {
		next(err);
	}
}

export async function purchase(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { itemKey } = req.body as { itemKey: string };

		if (!itemKey || typeof itemKey !== "string") {
			next(new ApiError(400, "itemKey is required"));
			return;
		}

		const shopItem = await ShopItem.findOne({ key: itemKey, active: true }).lean();

		if (!shopItem) {
			next(new ApiError(404, "Shop item not found"));
			return;
		}

		const userId = req.auth.userId;

		const user = await User.findOneAndUpdate(
			{ _id: userId, starsBalance: { $gte: shopItem.starCost } },
			{ $inc: { starsBalance: -shopItem.starCost } },
			{ new: true },
		);

		if (!user) {
			next(new ApiError(400, "Insufficient stars"));
			return;
		}

		let mysteryWon: number | undefined;

		switch (shopItem.type) {
			case "boost": {
				const now = new Date();
				let label: string;
				let icon: string;
				let expiresAfter: number;

				if (shopItem.key === "multiplier") {
					label = "Multiplier";
					icon = "ti-bolt";
					expiresAfter = 5;
				} else if (shopItem.key === "lossProtection") {
					label = "Loss Protection";
					icon = "ti-shield";
					expiresAfter = 1;
				} else {
					label = shopItem.name;
					icon = "ti-star";
					expiresAfter = 1;
				}

				const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

				await Promise.all([
					User.findOneAndUpdate(
						{ _id: userId },
						{
							$push: {
								activeBoosts: {
									type: shopItem.key,
									label,
									icon,
									expiresAfter,
									expiresAt,
									activatedAt: now,
								},
							},
						},
					),
					Boost.create({
						userId,
						type: shopItem.key,
						label,
						icon,
						expiresAfter,
						expiresAt,
						activatedAt: now,
					}),
				]);
				break;
			}

			case "ticket": {
				const drawType = shopItem.key === "crownTicket" ? "crown" : "weekly";

				await Promise.all([
					User.findOneAndUpdate({ _id: userId }, { $inc: { tickets: 1 } }),
					Ticket.create({
						userId,
						drawType,
						entryType: "stars",
						purchaseDate: new Date(),
					}),
				]);
				break;
			}

			case "premium": {
				const premiumExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await User.findOneAndUpdate(
					{ _id: userId },
					{ $set: { isPremium: true, premiumExpiresAt } },
				);
				break;
			}

			case "mystery": {
				const won = randomInt(10, 1001);
				mysteryWon = won;

				await User.findOneAndUpdate(
					{ _id: userId },
					{ $inc: { starsBalance: won } },
				);
				break;
			}
		}

		const transactions: Array<{
			userId: string;
			type: "in" | "out" | "star";
			desc: string;
			amt: number;
		}> = [
			{
				userId,
				type: "star",
				desc: `Shop purchase — ${shopItem.name}`,
				amt: -shopItem.starCost,
			},
		];

		if (mysteryWon !== undefined) {
			transactions.push({
				userId,
				type: "star",
				desc: "Mystery Box winnings",
				amt: mysteryWon,
			});
		}

		await Transaction.insertMany(transactions);

		const updatedUser = await User.findById(userId);
		if (!updatedUser) {
			next(new ApiError(500, "Failed to fetch updated user"));
			return;
		}

		res.json({
			success: true,
			itemKey,
			newStarsBalance: updatedUser.starsBalance,
			...(mysteryWon !== undefined && { mysteryWon }),
		});
	} catch (err) {
		next(err);
	}
}
