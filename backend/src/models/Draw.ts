import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const drawSchema = new Schema(
  {
    type: { type: String, enum: ["crown", "weekly"], required: true },
    status: {
      type: String,
      enum: ["pending", "scheduled", "live", "completed", "cancelled"],
      default: "pending",
    },
    scheduledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    winningNumbers: [{ type: Number }],
    jackpotEtb: { type: Number, default: 0 },
    entryCount: { type: Number, default: 0 },
    round: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export type DrawDocument = HydratedDocument<InferSchemaType<typeof drawSchema>>;

export const Draw = mongoose.model("Draw", drawSchema);

export async function getActiveCrownDraw(): Promise<DrawDocument | null> {
  return Draw.findOne({
    type: "crown",
    status: { $in: ["pending", "scheduled", "live"] },
  }).sort({ createdAt: -1 });
}
