import mongoose, { Schema, type InferSchemaType } from "mongoose";

const gameHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameType: {
      type: String,
      enum: ["spin", "scratch", "quick", "daily", "crown_entry", "weekly_entry"],
      required: true,
    },
    costEtb: { type: Number, default: 0 },
    starsEarned: { type: Number, default: 0 },
    summary: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const GameHistory = mongoose.model("GameHistory", gameHistorySchema);
