import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Ticket } from "../models/Ticket.js";

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

		const tickets = await Ticket.find({ userId: req.auth.userId })
			.sort({ createdAt: -1 })
			.limit(50)
			.lean();

		res.json({ success: true, tickets });
	} catch (err) {
		next(err);
	}
}
