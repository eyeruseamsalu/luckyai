import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthPayload } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { User } from "../models/User.js";

function signToken(userId: string, role: "user" | "admin"): string {
	const payload: AuthPayload = { userId, role };
	return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

function toPublicUser(user: InstanceType<typeof User>) {
	return {
		id: user._id,
		name: user.name,
		email: user.email,
		phone: user.phone,
		role: user.role,
		balance: user.balance,
		starsBalance: user.starsBalance,
		isPremium: user.isPremium,
		tickets: user.tickets,
		streak: user.streak,
		activityPoints: user.activityPoints,
	};
}

/** Placeholder auth handlers — wire to frontend when ready. */
export async function register(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { name, email, password, phone } = req.body as {
			name?: string;
			email?: string;
			password?: string;
			phone?: string;
		};

		if (!name || !email || !password) {
			next(new ApiError(400, "name, email, and password are required"));
			return;
		}

		const existing = await User.findOne({ email });
		if (existing) {
			next(new ApiError(409, "Email already registered"));
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({
			name,
			email,
			passwordHash,
			phone: phone ?? "",
		});
		const token = signToken(user._id.toString(), user.role as "user" | "admin");

		res.status(201).json({ success: true, token, user: toPublicUser(user) });
	} catch (err) {
		next(err);
	}
}

export async function login(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { email, password } = req.body as {
			email?: string;
			password?: string;
		};

		if (!email || !password) {
			next(new ApiError(400, "email and password are required"));
			return;
		}

		const user = await User.findOne({ email });
		if (!user) {
			next(new ApiError(401, "Invalid credentials"));
			return;
		}

		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) {
			next(new ApiError(401, "Invalid credentials"));
			return;
		}

		const token = signToken(user._id.toString(), user.role as "user" | "admin");
		res.json({ success: true, token, user: toPublicUser(user) });
	} catch (err) {
		next(err);
	}
}

export async function me(
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

		res.json({ success: true, user: toPublicUser(user) });
	} catch (err) {
		next(err);
	}
}
