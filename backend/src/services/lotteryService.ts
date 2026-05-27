import crypto from "crypto";
import type { Types } from "mongoose";
import { Draw, getActiveCrownDraw } from "../models/Draw.js";
import { LotteryTicket } from "../models/LotteryTicket.js";
import { Winner } from "../models/Winner.js";
import { User } from "../models/User.js";
import { getAppConfig } from "../models/AppConfig.js";
import { ApiError } from "../middleware/errorHandler.js";
import { recordNotification } from "../utils/notify.js";
import { recordTransaction } from "../utils/notify.js";

const PRIZE_BY_MATCH: Record<number, number> = {
  6: 500_000,
  5: 150_000,
  4: 100_000,
  3: 50_000,
};

function generateTicketNumber(): string {
  return `LK-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export async function ensureCrownDraw() {
  let draw = await getActiveCrownDraw();
  if (!draw) {
    const config = await getAppConfig();
    draw = await Draw.create({
      type: "crown",
      status: "pending",
      jackpotEtb: config.crownJackpotEtb,
    });
  }
  return draw;
}

export async function createCrownTicket(
  userId: Types.ObjectId,
  numbers: number[],
  entryType: "stars" | "cash" | "hybrid",
  cashCost: number,
  starCost: number,
) {
  const draw = await ensureCrownDraw();
  const existing = await LotteryTicket.findOne({ userId, drawId: draw._id, numbers });
  if (existing) throw new ApiError(409, "Duplicate entry for these numbers");

  const ticket = await LotteryTicket.create({
    ticketNumber: generateTicketNumber(),
    drawId: draw._id,
    userId,
    numbers,
    entryType,
    cashCost,
    starCost,
  });

  draw.entryCount = await LotteryTicket.countDocuments({ drawId: draw._id });
  await draw.save();

  return ticket;
}

export async function runCrownDraw(
  winningNumbers: number[],
  adminId: Types.ObjectId,
): Promise<{ winners: number; paid: number }> {
  if (winningNumbers.length !== 6) throw new ApiError(400, "winningNumbers must be 6 numbers");

  const draw = await getActiveCrownDraw();
  if (!draw) throw new ApiError(404, "No active crown draw");

  draw.winningNumbers = winningNumbers;
  draw.status = "completed";
  draw.completedAt = new Date();
  await draw.save();

  const config = await getAppConfig();
  config.crownPhase = "completed";
  await config.save();

  const tickets = await LotteryTicket.find({ drawId: draw._id });
  let winners = 0;
  let paid = 0;

  for (const ticket of tickets) {
    const matches = ticket.numbers.filter((n) => winningNumbers.includes(n)).length;
    const prize = PRIZE_BY_MATCH[matches];
    if (!prize) continue;

    winners += 1;
    paid += prize;

    await Winner.create({
      drawId: draw._id,
      userId: ticket.userId,
      ticketId: ticket._id,
      matchCount: matches,
      prizeEtb: prize,
      paidAt: new Date(),
    });

    const user = await User.findById(ticket.userId);
    if (user) {
      user.balance += prize;
      await user.save();
      await recordTransaction(user._id, "in", `Crown Draw — ${matches} matches`, prize);
      await recordNotification(
        user._id,
        "ti-trophy",
        "ta",
        `Crown Draw: ${matches} matches — ${prize.toLocaleString()} ETB`,
      );
    }
  }

  const { AdminLog } = await import("../models/AdminLog.js");
  await AdminLog.create({
    adminId,
    action: "run_crown_draw",
    details: { winningNumbers, winners, paid },
  });

  return { winners, paid };
}

export async function setDrawActive(active: boolean, adminId: Types.ObjectId) {
  const config = await getAppConfig();
  config.crownDrawActive = active;
  await config.save();
  const { AdminLog } = await import("../models/AdminLog.js");
  await AdminLog.create({ adminId, action: "set_draw_active", details: { active } });
}
