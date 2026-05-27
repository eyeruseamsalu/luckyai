import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import { Notification } from "../models/Notification.js";

/** Placeholder notification handlers — wire to frontend when ready. */
export async function listNotifications(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.auth) {
			next(new ApiError(401, "Authentication required"));
			return;
		}

		const notifications = await Notification.find({ userId: req.auth.userId })
			.sort({ createdAt: -1 })
			.limit(100);

		res.json({ success: true, notifications });
	} catch (err) {
		next(err);
	}
}
