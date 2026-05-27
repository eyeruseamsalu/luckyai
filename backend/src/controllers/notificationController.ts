import type { Request, Response, NextFunction } from "express";
import { Notification } from "../models/Notification.js";
import { ApiError } from "../middleware/errorHandler.js";

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

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    await Notification.updateMany({ userId: req.auth.userId, read: false }, { read: true });
    const notifications = await Notification.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      next(new ApiError(404, "Notification not found"));
      return;
    }

    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}
