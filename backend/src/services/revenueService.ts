import type { Types } from "mongoose";
import { getAppConfig } from "../models/AppConfig.js";
import { RevenueLedger } from "../models/RevenueLedger.js";

const SPLITS = {
  crown: 0.35,
  weekly: 0.25,
  platform: 0.25,
  reserve: 0.15,
} as const;

export type RevenueSource =
  | "spin"
  | "scratch"
  | "quick"
  | "crown_entry"
  | "weekly_entry"
  | "deposit";

export async function distributeRevenue(
  grossEtb: number,
  source: RevenueSource,
  userId?: Types.ObjectId,
): Promise<void> {
  if (grossEtb <= 0) return;

  const crownPool = Math.round(grossEtb * SPLITS.crown * 100) / 100;
  const weeklyPool = Math.round(grossEtb * SPLITS.weekly * 100) / 100;
  const platform = Math.round(grossEtb * SPLITS.platform * 100) / 100;
  const reserve = Math.round((grossEtb - crownPool - weeklyPool - platform) * 100) / 100;

  const config = await getAppConfig();
  config.crownPoolEtb += crownPool;
  config.weeklyPoolEtb += weeklyPool;
  config.platformProfitEtb += platform;
  config.reserveEtb += reserve;
  await config.save();

  await RevenueLedger.create({
    source,
    grossEtb,
    crownPool,
    weeklyPool,
    platform,
    reserve,
    userId: userId ?? null,
  });
}

export async function getRevenueStats() {
  const config = await getAppConfig();
  const ledgers = await RevenueLedger.aggregate([
    {
      $group: {
        _id: "$source",
        totalGross: { $sum: "$grossEtb" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalGross = ledgers.reduce((s, r) => s + r.totalGross, 0);

  return {
    pools: {
      crown: config.crownPoolEtb,
      weekly: config.weeklyPoolEtb,
      platform: config.platformProfitEtb,
      reserve: config.reserveEtb,
    },
    totalGross,
    bySource: ledgers,
  };
}
