import mongoose, { Schema, type InferSchemaType } from "mongoose";

const weeklyEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    numbers: [{ type: Number, required: true }],
    round: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export type WeeklyEntryDocument = InferSchemaType<typeof weeklyEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeeklyEntry = mongoose.model("WeeklyEntry", weeklyEntrySchema);
