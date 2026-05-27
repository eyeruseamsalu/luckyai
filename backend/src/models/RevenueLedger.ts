import mongoose, { Schema, type InferSchemaType } from "mongoose";

const revenueLedgerSchema = new Schema(
  {
    source: {
      type: String,
      enum: ["spin", "scratch", "quick", "crown_entry", "weekly_entry", "deposit"],
      required: true,
    },
    grossEtb: { type: Number, required: true },
    crownPool: { type: Number, required: true },
    weeklyPool: { type: Number, required: true },
    platform: { type: Number, required: true },
    reserve: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type RevenueLedgerDocument = InferSchemaType<typeof revenueLedgerSchema>;

export const RevenueLedger = mongoose.model("RevenueLedger", revenueLedgerSchema);
