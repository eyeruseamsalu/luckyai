import type { Types } from "mongoose";
import { GameHistory } from "../models/GameHistory.js";

export async function recordGameHistory(
  userId: Types.ObjectId,
  gameType: "spin" | "scratch" | "quick" | "daily" | "crown_entry" | "weekly_entry",
  opts: { costEtb?: number; starsEarned?: number; summary?: string; meta?: Record<string, unknown> },
): Promise<void> {
  await GameHistory.create({
    userId,
    gameType,
    costEtb: opts.costEtb ?? 0,
    starsEarned: opts.starsEarned ?? 0,
    summary: opts.summary ?? "",
    meta: opts.meta ?? {},
  });
}
