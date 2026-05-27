import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

/** Placeholder wallet handlers — wire to frontend when ready. */
export async function getWallet(
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

		const transactions = await Transaction.find({ userId: user._id })
			.sort({ createdAt: -1 })
			.limit(50);

		res.json({
			success: true,
			balance: user.balance,
			starsBalance: user.starsBalance,
			transactions,
		});
	} catch (err) {
		next(err);
	}
}

export async function deposit(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { amount } = req.body as { amount: number };

		if (typeof amount !== "number" || amount <= 0) {
			next(new ApiError(400, "Amount must be greater than 0"));
			return;
		}

		if (amount > 50000) {
			next(new ApiError(400, "Maximum single deposit is 50,000 ETB"));
			return;
		}

		const user = await User.findByIdAndUpdate(
			req.auth.userId,
			{ $inc: { balance: amount } },
			{ new: true },
		);

		if (!user) {
			next(new ApiError(404, "User not found"));
			return;
		}

		const transaction = await Transaction.create({
			userId: user._id,
			type: "in",
			desc: `Deposit — ${amount.toLocaleString()} ETB`,
			amt: amount,
		});

		res.json({
			success: true,
			balance: user.balance,
			transaction,
		});
	} catch (err) {
		next(err);
	}
}

export async function withdraw(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const { amount } = req.body as { amount: number };

		if (typeof amount !== "number" || amount <= 0) {
			next(new ApiError(400, "Amount must be greater than 0"));
			return;
		}

		if (amount < 50) {
			next(new ApiError(400, "Minimum withdrawal is 50 ETB"));
			return;
		}

		if (amount > 50000) {
			next(new ApiError(400, "Maximum single withdrawal is 50,000 ETB"));
			return;
		}

		const user = await User.findOneAndUpdate(
			{ _id: req.auth.userId, balance: { $gte: amount } },
			{ $inc: { balance: -amount } },
			{ new: true },
		);

		if (!user) {
			next(new ApiError(400, "Insufficient balance"));
			return;
		}

		const transaction = await Transaction.create({
			userId: user._id,
			type: "out",
			desc: `Withdrawal — ${amount.toLocaleString()} ETB`,
			amt: -amount,
		});

		res.json({
			success: true,
			balance: user.balance,
			transaction,
		});
	} catch (err) {
		next(err);
	}
}
