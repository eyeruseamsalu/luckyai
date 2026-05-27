import type { UserDocument } from "../models/User.js";

const CASH_CAP_PLAYS = 8;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function resetDailyCountersIfNeeded(user: UserDocument): void {
  const today = todayKey();

  if (user.lastPlayDate !== today) {
    user.playsToday = 0;
    user.spinsToday = 0;
    user.scratchesToday = 0;
    user.quickPlaysToday = 0;
    user.cashCapHit = false;
    user.lastPlayDate = today;
  }

  if (user.lastDailyClaimAt) {
    const claimDay = new Date(user.lastDailyClaimAt).toISOString().slice(0, 10);
    if (claimDay !== today) {
      user.dailyClaimed = false;
    }
  }
}

export function recordPlay(user: UserDocument): void {
  resetDailyCountersIfNeeded(user);
  user.playsToday += 1;
  if (user.playsToday >= CASH_CAP_PLAYS) {
    user.cashCapHit = true;
  }
}

export { CASH_CAP_PLAYS };
