import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import type { AuthPayload } from "../middleware/auth.js";
import { toPublicUser } from "../utils/toPublicUser.js";

function signToken(userId: string, role: "user" | "admin"): string {
  const payload: AuthPayload = { userId, role };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const user = await User.create({ name, email, passwordHash, phone: phone ?? "" });
    const token = signToken(user._id.toString(), user.role as "user" | "admin");

    res.status(201).json({ success: true, token, user: await toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

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
    res.json({ success: true, token, user: await toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    res.json({ success: true, user: await toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    const { name, email, phone } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
    };

    const user = await User.findById(req.auth.userId);
    if (!user) {
      next(new ApiError(404, "User not found"));
      return;
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        next(new ApiError(409, "Email already in use"));
        return;
      }
      user.email = email.trim().toLowerCase();
    }

    await user.save();
    res.json({ success: true, user: await toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      next(new ApiError(400, "currentPassword and newPassword are required"));
      return;
    }
    if (newPassword.length < 8) {
      next(new ApiError(400, "New password must be at least 8 characters"));
      return;
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      next(new ApiError(404, "User not found"));
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      next(new ApiError(401, "Current password is incorrect"));
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}
