import type { Types } from "mongoose";
import { User, type UserDocument } from "../models/User.js";
import { WeeklyEntry } from "../models/WeeklyEntry.js";
import { DrawEntry } from "../models/DrawEntry.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { getAppConfig } from "../models/AppConfig.js";
import { ApiError } from "../middleware/errorHandler.js";
import { resetDailyCountersIfNeeded, recordPlay } from "../utils/dailyReset.js";
import { recordNotification, recordTransaction } from "../utils/notify.js";
import { toPublicUser } from "../utils/toPublicUser.js";
import { addCommunityStars } from "./platformService.js";
import { distributeRevenue } from "./revenueService.js";
import { createCrownTicket } from "./lotteryService.js";
import { recordGameHistory } from "../utils/gameHistory.js";

const STAR_EARN_ON_LOSS = 30;
const CROWN_HYBRID_STAR = 750;
const CROWN_HYBRID_CASH = 250;

const SPIN_SEGMENTS = [
  { label: "Try again", color: "#F0F0EB", text: "#6B6B64", val: 0, type: "lose", prob: 22 },
  { label: "10 ETB", color: "#FEF3C7", text: "#92400E", val: 10, type: "cash", prob: 14 },
  { label: "Free spin", color: "#EAF3DE", text: "#27500A", val: 0, type: "freeSpin", prob: 7 },
  { label: "5 ETB", color: "#E1F5EE", text: "#085041", val: 5, type: "cash", prob: 16 },
  { label: "50 Stars", color: "#FEF3C7", text: "#92400E", val: 50, type: "stars", prob: 13 },
  { label: "25 ETB", color: "#EEEDFE", text: "#3C3489", val: 25, type: "cash", prob: 9 },
  { label: "Try again", color: "#F0F0EB", text: "#6B6B64", val: 0, type: "lose", prob: 8 },
  { label: "80 Stars", color: "#FEF3C7", text: "#92400E", val: 80, type: "stars", prob: 5 },
  { label: "50 ETB", color: "#EEEDFE", text: "#3C3489", val: 50, type: "cash", prob: 3 },
  { label: "Premium day", color: "#FDE68A", text: "#92400E", val: 0, type: "premium", prob: 2 },
  { label: "150 Stars", color: "#FEF3C7", text: "#92400E", val: 150, type: "stars", prob: 1 },
  { label: "100 ETB", color: "#EAF3DE", text: "#27500A", val: 100, type: "cash", prob: 0.5 },
];

const SCRATCH_PRIZES = [
  { tier: "high", headline: "You won 200 ETB", cash: 200, stars: 100, weight: 2, boostLabel: "" },
  { tier: "high", headline: "You won 80 ETB", cash: 80, stars: 60, weight: 5, boostLabel: "" },
  { tier: "mid", headline: "You won 30 ETB + 50 Stars", cash: 30, stars: 50, weight: 10, boostLabel: "" },
  { tier: "mid", headline: "You won 10 ETB + 30 Stars", cash: 10, stars: 30, weight: 16, boostLabel: "" },
  {
    tier: "asset",
    headline: "You unlocked 2x Stars Boost",
    stars: 25,
    weight: 22,
    boostLabel: "2x Stars next 5 plays",
    boostType: "multiplier" as const,
  },
  {
    tier: "asset",
    headline: "You unlocked Loss Protection",
    stars: 20,
    weight: 22,
    boostLabel: "Loss protection x3",
    boostType: "lossProtection" as const,
  },
  {
    tier: "asset",
    headline: "You unlocked a Bonus Entry",
    stars: 35,
    weight: 23,
    boostLabel: "Crown Draw entry",
    bonusEntry: true,
  },
];

async function loadUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  resetDailyCountersIfNeeded(user);
  return user;
}

async function saveUser(user: UserDocument) {
  await user.save();
  return toPublicUser(user);
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((a, p) => a + p.weight, 0);
  let r = Math.random() * total;
  for (const p of items) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return items[items.length - 1];
}

function pickSpinSegment() {
  const total = SPIN_SEGMENTS.reduce((a, s) => a + s.prob, 0);
  let r = Math.random() * total;
  for (const s of SPIN_SEGMENTS) {
    r -= s.prob;
    if (r <= 0) return s;
  }
  return SPIN_SEGMENTS[0];
}

function getMultiplier(user: UserDocument): number {
  return user.activeBoosts?.some((b) => b.type === "multiplier") ? 1.2 : 1;
}

async function addStars(user: UserDocument, amt: number, source: string) {
  user.starsBalance += amt;
  user.activityPoints += Math.floor(amt / 2);
  await addCommunityStars(amt, source, user._id);
}

async function buildResponse(user: UserDocument, result: Record<string, unknown>) {
  const [transactions, notifications] = await Promise.all([
    Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100),
  ]);
  return {
    user: await toPublicUser(user),
    result,
    transactions,
    notifications,
  };
}

function ensureBalance(user: UserDocument, cost: number) {
  if (user.balance < cost) throw new ApiError(400, "Insufficient balance");
}

function ensureStars(user: UserDocument, cost: number) {
  if (user.starsBalance < cost) throw new ApiError(400, "Insufficient Stars");
}

export async function getGameState(userId: string) {
  const user = await loadUser(userId);
  const [transactions, notifications] = await Promise.all([
    Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100),
  ]);
  return { user: await toPublicUser(user), transactions, notifications };
}

export async function playSpin(userId: string, cost: number) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  const allowed = [config.spinCost, config.spinCost * 3, config.spinCost * 6, config.spinCost * 10];
  if (!allowed.includes(cost)) throw new ApiError(400, "Invalid spin cost");
  const usingFreeSpin = user.freeSpins > 0;
  if (!usingFreeSpin) ensureBalance(user, cost);

  if (usingFreeSpin) {
    user.freeSpins -= 1;
  } else {
    user.balance -= cost;
    await recordTransaction(user._id, "out", `Spin (${cost} ETB)`, -cost);
    await distributeRevenue(cost, "spin", user._id);
  }
  recordPlay(user);
  user.spinsToday += 1;

  const seg = pickSpinSegment();
  const segIdx = SPIN_SEGMENTS.indexOf(seg);
  const mult = getMultiplier(user);
  let message = "";

  if (seg.type === "cash" && !user.cashCapHit) {
    const won = Math.round(seg.val * mult);
    user.balance += won;
    await recordTransaction(user._id, "in", `Spin win — ${won} ETB`, won);
    await recordNotification(user._id, "ti-coin", "tg", `You won ${won} ETB from the spin`);
    message = `${won} ETB added to your balance`;
  } else if (seg.type === "stars" || user.cashCapHit) {
    const stars = seg.type === "stars" ? seg.val : STAR_EARN_ON_LOSS;
    await addStars(user, stars, "spin");
    await recordTransaction(user._id, "star", "Spin — Stars earned", stars);
    message = `${stars} Stars earned`;
  } else if (seg.type === "freeSpin") {
    user.freeSpins += 1;
    await recordNotification(user._id, "ti-rotate-clockwise", "tg", "Free spin unlocked from the wheel");
    message = "Free spin unlocked — spin again at no cost";
  } else if (seg.type === "premium") {
    user.isPremium = true;
    await recordNotification(user._id, "ti-star", "ta", "Premium day unlocked from spin");
    message = "Premium access for 24 hours";
  } else {
    const stars = Math.round(STAR_EARN_ON_LOSS * mult);
    await addStars(user, stars, "spin");
    await recordTransaction(user._id, "star", "Spin — Stars", stars);
    message = `${stars} Stars earned`;
  }

  await recordGameHistory(user._id, "spin", {
    costEtb: cost,
    summary: message,
    meta: { segmentIndex: segIdx },
  });
  await saveUser(user);
  return buildResponse(user, { segmentIndex: segIdx, segment: seg, message });
}

export async function playScratch(userId: string, cost: number) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  const allowed = [config.scratchCost, config.scratchCost * 2, config.scratchCost * 5, config.scratchCost * 10];
  if (!allowed.includes(cost)) throw new ApiError(400, "Invalid scratch cost");
  ensureBalance(user, cost);

  user.balance -= cost;
  recordPlay(user);
  user.scratchesToday += 1;
  await recordTransaction(user._id, "out", `Scratch card (${cost} ETB)`, -cost);
  await distributeRevenue(cost, "scratch", user._id);

  const prize = pickWeighted(SCRATCH_PRIZES);
  if (prize.cash && !user.cashCapHit) {
    user.balance += prize.cash;
    await recordTransaction(user._id, "in", "Scratch Win", prize.cash);
  }
  await addStars(user, prize.stars, "scratch");
  await recordTransaction(user._id, "star", "Scratch Win Stars", prize.stars);

  if ("boostType" in prize && prize.boostType) {
    user.set("activeBoosts", [
      ...user.activeBoosts.filter((b) => b.type !== prize.boostType),
      {
        type: prize.boostType,
        label: prize.boostLabel ?? "",
        icon: prize.boostType === "multiplier" ? "ti-bolt" : "ti-shield",
        expiresAfter: prize.boostType === "multiplier" ? 5 : 3,
      },
    ]);
  }
  if ("bonusEntry" in prize && prize.bonusEntry) {
    user.bonusDrawEntries += 1;
    user.tickets += 1;
  }

  await recordGameHistory(user._id, "scratch", { costEtb: cost, starsEarned: prize.stars, summary: prize.headline });
  await saveUser(user);
  return buildResponse(user, { prize });
}

export async function playQuick(userId: string, cost: number, picks: number[]) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  const allowed = [config.quickCost, config.quickCost * 2.5, config.quickCost * 5].map(Math.round);
  if (!allowed.includes(cost)) throw new ApiError(400, "Invalid quick play cost");
  if (picks.length !== 3) throw new ApiError(400, "Pick exactly 3 numbers");
  if (picks.some((n) => n < 1 || n > 20)) throw new ApiError(400, "Numbers must be 1-20");
  ensureBalance(user, cost);

  user.balance -= cost;
  recordPlay(user);
  user.quickPlaysToday += 1;
  await recordTransaction(user._id, "out", `Quick play (${cost} ETB)`, -cost);
  await distributeRevenue(cost, "quick", user._id);

  const drawn: number[] = [];
  while (drawn.length < 3) {
    const n = Math.floor(Math.random() * 20) + 1;
    if (!drawn.includes(n)) drawn.push(n);
  }

  const matches = picks.filter((p) => drawn.includes(p)).length;
  const mult = getMultiplier(user);
  let label = "";
  let earned = "";

  if (matches === 3) {
    const wonCash = Math.round(cost * 20 * mult);
    user.balance += wonCash;
    await recordTransaction(user._id, "in", "Quick play 3-match", wonCash);
    await recordNotification(user._id, "ti-bolt", "tg", `Quick play: 3 matches — ${wonCash} ETB!`);
    label = `3 of 3 matched — ${wonCash} ETB won!`;
    earned = `+${wonCash} ETB`;
  } else if (matches === 2) {
    const wonCash = Math.round(cost * 3 * mult);
    user.balance += wonCash;
    await recordTransaction(user._id, "in", "Quick play 2-match", wonCash);
    label = `2 of 3 matched — ${wonCash} ETB won!`;
    earned = `+${wonCash} ETB`;
  } else if (matches === 1) {
    await addStars(user, 8, "quick");
    await recordTransaction(user._id, "star", "Quick play 1-match Stars", 8);
    label = "1 matched — 8 Stars earned";
    earned = "+8 Stars";
  } else {
    await addStars(user, 2, "quick");
    await recordTransaction(user._id, "star", "Quick play Stars", 2);
    label = "No match — 2 Stars earned";
    earned = "+2 Stars";
  }

  await recordGameHistory(user._id, "quick", { costEtb: cost, summary: label, meta: { drawn, matches } });
  await saveUser(user);
  return buildResponse(user, { drawn, matches, label, earned });
}

export async function claimDaily(userId: string) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  if (user.dailyClaimed) throw new ApiError(400, "Daily reward already claimed");

  const starReward = config.starRewardDaily + 40;
  user.balance += 15;
  await addStars(user, starReward, "daily");
  user.dailyClaimed = true;
  user.lastDailyClaimAt = new Date();
  user.streak += 1;

  await recordTransaction(user._id, "in", `Daily reward — day ${user.streak}`, 15);
  await recordNotification(
    user._id,
    "ti-circle-check",
    "tg",
    `Daily reward claimed — 15 ETB + ${starReward} ★ added`,
  );

  await recordGameHistory(user._id, "daily", { starsEarned: starReward, summary: "Daily claim" });
  await saveUser(user);
  return buildResponse(user, { claimed: true, balance: 15, stars: starReward });
}

export async function enterDraw(
  userId: string,
  numbers: number[],
  option: string,
) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  if (!config.crownDrawActive) throw new ApiError(400, "Crown draw is not active");
  if (numbers.length !== 6) throw new ApiError(400, "Pick exactly 6 numbers");
  if (numbers.some((n) => n < 1 || n > 42)) throw new ApiError(400, "Numbers must be 1-42");

  const costs: Record<string, { stars: number; cash: number }> = {
    stars: { stars: config.crownStarCost, cash: 0 },
    cash: { stars: 0, cash: config.crownTicketCash },
    hybrid: { stars: CROWN_HYBRID_STAR, cash: CROWN_HYBRID_CASH },
  };
  const c = costs[option];
  if (!c) throw new ApiError(400, "Invalid entry option");

  if (c.cash > 0) ensureBalance(user, c.cash);
  if (c.stars > 0) ensureStars(user, c.stars);

  if (c.cash > 0) {
    user.balance -= c.cash;
    await recordTransaction(user._id, "out", `Crown Draw — ${option}`, -c.cash);
    await distributeRevenue(c.cash, "crown_entry", user._id);
  }
  if (c.stars > 0) {
    user.starsBalance -= c.stars;
    await recordTransaction(user._id, "star", "Crown Draw — Stars used", -c.stars);
  }

  user.tickets += 1;
  recordPlay(user);
  const ticket = await createCrownTicket(
    user._id,
    numbers,
    option as "stars" | "cash" | "hybrid",
    c.cash,
    c.stars,
  );
  await DrawEntry.create({
    userId: user._id,
    numbers,
    entryType: option as "stars" | "cash" | "hybrid",
    cashCost: c.cash,
    starCost: c.stars,
  });
  await addCommunityStars(config.starRewardCrown, "crown_ticket", user._id);
  await recordNotification(
    user._id,
    "ti-circle-check",
    "tg",
    `Crown Draw entry confirmed — ticket ${ticket.ticketNumber}`,
  );

  await recordGameHistory(user._id, "crown_entry", {
    costEtb: c.cash,
    summary: ticket.ticketNumber,
    meta: { numbers, option },
  });
  await saveUser(user);
  return buildResponse(user, {
    entryConfirmed: true,
    numbers,
    ticketNumber: ticket.ticketNumber,
  });
}

export async function enterWeekly(userId: string, numbers: number[]) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  if (numbers.length !== 6) throw new ApiError(400, "Pick exactly 6 numbers");
  if (numbers.some((n) => n < 1 || n > 42)) throw new ApiError(400, "Numbers must be 1-42");
  ensureStars(user, config.weeklyStarCost);

  user.starsBalance -= config.weeklyStarCost;
  user.tickets += 1;
  await recordTransaction(
    user._id,
    "star",
    `Weekly draw entry — ${numbers.map((n) => String(n).padStart(2, "0")).join(", ")}`,
    -config.weeklyStarCost,
  );
  await addCommunityStars(config.starRewardWeekly, "weekly_ticket", user._id);
  await WeeklyEntry.create({ userId: user._id, numbers, round: 1 });
  await recordNotification(
    user._id,
    "ti-calendar-stats",
    "tp",
    `Weekly draw entry confirmed: ${numbers.map((n) => String(n).padStart(2, "0")).join(", ")}`,
  );

  await recordGameHistory(user._id, "weekly_entry", { summary: numbers.join(",") });
  await saveUser(user);
  return buildResponse(user, { entryConfirmed: true, numbers });
}

export async function starsCrownEntry(userId: string, mode: "stars" | "hybrid") {
  const user = await loadUser(userId);
  const config = await getAppConfig();

  if (mode === "stars") {
    ensureStars(user, config.crownStarCost);
    user.starsBalance -= config.crownStarCost;
    await recordTransaction(user._id, "star", "Crown Draw — Stars entry", -config.crownStarCost);
  } else {
    ensureStars(user, CROWN_HYBRID_STAR);
    ensureBalance(user, CROWN_HYBRID_CASH);
    user.starsBalance -= CROWN_HYBRID_STAR;
    user.balance -= CROWN_HYBRID_CASH;
    await distributeRevenue(CROWN_HYBRID_CASH, "crown_entry", user._id);
    await recordTransaction(user._id, "star", "Crown Draw — Hybrid entry (Stars)", -CROWN_HYBRID_STAR);
    await recordTransaction(user._id, "out", "Crown Draw — Hybrid entry (ETB)", -CROWN_HYBRID_CASH);
  }

  user.tickets += 1;
  await addCommunityStars(config.starRewardCrown, "crown_ticket", user._id);
  await recordNotification(user._id, "ti-trophy", "ta", "Crown Draw entry confirmed");
  await saveUser(user);
  return buildResponse(user, { entryConfirmed: true, mode });
}

export async function starsWeeklyEntry(userId: string) {
  const user = await loadUser(userId);
  const config = await getAppConfig();
  ensureStars(user, config.weeklyStarCost);
  user.starsBalance -= config.weeklyStarCost;
  await recordTransaction(user._id, "star", "Weekly 100K Draw — Stars entry", -config.weeklyStarCost);
  await addCommunityStars(config.starRewardWeekly, "weekly_ticket", user._id);
  await recordNotification(user._id, "ti-trophy", "tp", "Weekly 100,000 ETB draw entry confirmed");
  await saveUser(user);
  return buildResponse(user, { entryConfirmed: true });
}

export async function deposit(userId: string, amount: number, method: string) {
  const user = await loadUser(userId);
  if (amount < 10) throw new ApiError(400, "Minimum deposit is 10 ETB");
  if (amount > 50000) throw new ApiError(400, "Maximum single deposit is 50,000 ETB");

  user.balance += amount;
  await recordTransaction(user._id, "in", `${method} deposit`, amount);
  await recordNotification(user._id, "ti-coin", "tg", `${amount.toLocaleString()} ETB deposited via ${method}`);

  await saveUser(user);
  return buildResponse(user, { deposited: amount });
}

export async function withdraw(userId: string, amount: number, method: string) {
  const user = await loadUser(userId);
  if (amount < 50) throw new ApiError(400, "Minimum withdrawal is 50 ETB");
  ensureBalance(user, amount);

  user.balance -= amount;
  await recordTransaction(user._id, "out", `Withdrawal to ${method}`, -amount);

  await saveUser(user);
  return buildResponse(user, { withdrawn: amount });
}
