import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const appConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    spinCost: { type: Number, default: 5 },
    scratchCost: { type: Number, default: 5 },
    quickCost: { type: Number, default: 2 },
    cashCap: { type: Number, default: 8 },
    starRate: { type: Number, default: 35 },
    crownStarCost: { type: Number, default: 1500 },
    weeklyStarCost: { type: Number, default: 800 },
    crownTicketCash: { type: Number, default: 500 },

    communityStars: { type: Number, default: 8_420_000 },
    starTarget: { type: Number, default: 10_000_000 },
    crownPhase: {
      type: String,
      enum: ["collecting", "scheduled", "live", "completed"],
      default: "collecting",
    },
    crownDrawAt: { type: Date, default: null },
    countdownDurationMs: { type: Number, default: 7 * 24 * 60 * 60 * 1000 },
    crownJackpotEtb: { type: Number, default: 500_000 },
    weeklyJackpotEtb: { type: Number, default: 100_000 },
    crownDrawActive: { type: Boolean, default: true },

    starRewardDaily: { type: Number, default: 10 },
    starRewardWeekly: { type: Number, default: 20 },
    starRewardCrown: { type: Number, default: 30 },

    crownPoolEtb: { type: Number, default: 0 },
    weeklyPoolEtb: { type: Number, default: 0 },
    platformProfitEtb: { type: Number, default: 0 },
    reserveEtb: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type AppConfigDocument = HydratedDocument<InferSchemaType<typeof appConfigSchema>>;
export type CrownPhase = "collecting" | "scheduled" | "live" | "completed";

export const AppConfig = mongoose.model("AppConfig", appConfigSchema);

export async function getAppConfig(): Promise<AppConfigDocument> {
  let config = await AppConfig.findOne({ key: "default" });
  if (!config) {
    config = await AppConfig.create({ key: "default" });
  }
  return config;
}
