import type { UserDocument } from "../models/User.js";
import { WeeklyEntry } from "../models/WeeklyEntry.js";

export async function toPublicUser(user: UserDocument) {
  const weeklyEntries = await WeeklyEntry.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    balance: user.balance,
    starsBalance: user.starsBalance,
    isPremium: user.isPremium,
    tickets: user.tickets,
    freeSpins: user.freeSpins ?? 0,
    streak: user.streak,
    activityPoints: user.activityPoints,
    dailyClaimed: user.dailyClaimed,
    playsToday: user.playsToday,
    spinsToday: user.spinsToday,
    scratchesToday: user.scratchesToday,
    quickPlaysToday: user.quickPlaysToday,
    cashCapHit: user.cashCapHit,
    bonusDrawEntries: user.bonusDrawEntries,
    lossProtectionPlays: user.lossProtectionPlays,
    activeBoosts: user.activeBoosts ?? [],
    weeklyDrawResult: user.weeklyDrawResult ?? null,
    weeklyEntries: weeklyEntries.map((e) => ({
      numbers: e.numbers,
      date: e.createdAt?.toISOString() ?? "",
      round: e.round,
    })),
  };
}
