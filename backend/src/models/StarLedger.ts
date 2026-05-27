import mongoose, { Schema, type InferSchemaType } from "mongoose";

const starLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    amount: { type: Number, required: true },
    source: { type: String, required: true },
    community: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const StarLedger = mongoose.model("StarLedger", starLedgerSchema);
