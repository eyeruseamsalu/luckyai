import type { Types } from "mongoose";
import type { AppConfigDocument, CrownPhase } from "../models/AppConfig.js";
import { getAppConfig } from "../models/AppConfig.js";
import { Draw, getActiveCrownDraw } from "../models/Draw.js";
import { DrawEntry } from "../models/DrawEntry.js";
import { LotteryTicket } from "../models/LotteryTicket.js";
import { StarLedger } from "../models/StarLedger.js";

export interface CountdownPayload {
  display: string;
  endsAt: string | null;
  phase: CrownPhase;
  active: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function computeCountdown(
  phase: CrownPhase,
  drawAt: Date | null | undefined,
  now = Date.now(),
): CountdownPayload {
  if (phase === "collecting" || !drawAt) {
    return { display: "00:00:00", endsAt: null, phase, active: false };
  }

  const remaining = Math.max(0, drawAt.getTime() - now);

  if (phase === "completed") {
    return { display: "00:00:00", endsAt: drawAt.toISOString(), phase, active: false };
  }

  if (phase === "live" && remaining <= 0) {
    return { display: "00:00:00", endsAt: drawAt.toISOString(), phase: "live", active: true };
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const display =
    days > 0
      ? `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  return {
    display,
    endsAt: drawAt.toISOString(),
    phase: remaining <= 0 && phase === "scheduled" ? "live" : phase,
    active: phase === "scheduled" || phase === "live",
  };
}

async function syncDrawPhase(config: AppConfigDocument): Promise<void> {
  const now = Date.now();
  if (
    config.crownPhase === "scheduled" &&
    config.crownDrawAt &&
    config.crownDrawAt.getTime() <= now
  ) {
    config.crownPhase = "live";
    await config.save();
    const draw = await getActiveCrownDraw();
    if (draw) {
      draw.status = "live";
      await draw.save();
    }
  }
}

export async function activateCrownDrawIfReady(config: AppConfigDocument): Promise<void> {
  if (config.crownPhase !== "collecting") return;
  if (config.communityStars < config.starTarget) return;

  const drawAt = new Date(Date.now() + config.countdownDurationMs);
  config.crownPhase = "scheduled";
  config.crownDrawAt = drawAt;
  await config.save();

  let draw = await getActiveCrownDraw();
  if (!draw) {
    draw = await Draw.create({
      type: "crown",
      status: "scheduled",
      scheduledAt: drawAt,
      jackpotEtb: config.crownJackpotEtb,
    });
  } else {
    draw.status = "scheduled";
    draw.scheduledAt = drawAt;
    draw.jackpotEtb = config.crownJackpotEtb;
    await draw.save();
  }
}

export async function addCommunityStars(
  amount: number,
  source: string,
  userId?: Types.ObjectId,
): Promise<void> {
  if (amount <= 0) return;
  const config = await getAppConfig();
  config.communityStars += amount;
  await config.save();
  await StarLedger.create({
    userId: userId ?? null,
    amount,
    source,
    community: true,
  });
  await activateCrownDrawIfReady(config);
}

export async function getPlatformState() {
  const config = await getAppConfig();
  await syncDrawPhase(config);
  const refreshed = await getAppConfig();

  const crownDraw = await getActiveCrownDraw();
  const entryCount = crownDraw
    ? await LotteryTicket.countDocuments({ drawId: crownDraw._id })
    : await drawEntryCountFallback();

  const countdown = computeCountdown(
    refreshed.crownPhase as CrownPhase,
    refreshed.crownDrawAt ?? null,
  );

  return {
    serverTime: new Date().toISOString(),
    crown: {
      phase: refreshed.crownPhase,
      communityStars: refreshed.communityStars,
      starTarget: refreshed.starTarget,
      progressPct: Math.min(
        100,
        Math.round((refreshed.communityStars / refreshed.starTarget) * 100),
      ),
      countdown,
      jackpotEtb: refreshed.crownJackpotEtb,
      entryCount,
      drawAt: refreshed.crownDrawAt?.toISOString() ?? null,
      drawActive: refreshed.crownDrawActive,
      crownStarCost: refreshed.crownStarCost,
      drawId: crownDraw?._id.toString() ?? null,
    },
    weekly: {
      jackpotEtb: refreshed.weeklyJackpotEtb,
      weeklyStarCost: refreshed.weeklyStarCost,
    },
    starRewards: {
      daily: refreshed.starRewardDaily,
      weekly: refreshed.starRewardWeekly,
      crown: refreshed.starRewardCrown,
    },
    pools: {
      crown: refreshed.crownPoolEtb,
      weekly: refreshed.weeklyPoolEtb,
      platform: refreshed.platformProfitEtb,
      reserve: refreshed.reserveEtb,
    },
    costs: {
      spin: refreshed.spinCost,
      scratch: refreshed.scratchCost,
      quick: refreshed.quickCost,
      crownTicketCash: refreshed.crownTicketCash,
    },
  };
}

async function drawEntryCountFallback(): Promise<number> {
  const crownDraw = await getActiveCrownDraw();
  if (crownDraw) return LotteryTicket.countDocuments({ drawId: crownDraw._id });
  return DrawEntry.countDocuments();
}

export async function updatePlatformConfig(
  body: Record<string, number | boolean | string | undefined>,
  adminId: string,
): Promise<AppConfigDocument> {
  const config = await getAppConfig();
  const numericFields = [
    "communityStars",
    "starTarget",
    "countdownDurationMs",
    "crownJackpotEtb",
    "weeklyJackpotEtb",
    "crownStarCost",
    "weeklyStarCost",
    "starRewardDaily",
    "starRewardWeekly",
    "starRewardCrown",
    "spinCost",
    "scratchCost",
    "quickCost",
    "crownTicketCash",
  ] as const;

  for (const key of numericFields) {
    if (body[key] !== undefined) config.set(key, Number(body[key]));
  }
  if (body.crownDrawActive !== undefined) {
    config.crownDrawActive = Boolean(body.crownDrawActive);
  }
  await config.save();
  if (config.communityStars >= config.starTarget) {
    await activateCrownDrawIfReady(config);
  }

  const { AdminLog } = await import("../models/AdminLog.js");
  await AdminLog.create({ adminId, action: "update_platform_config", details: body });
  return config;
}
