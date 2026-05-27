import mongoose, { Schema, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["in", "out", "star"], required: true },
    desc: { type: String, required: true },
    amt: { type: Number, required: true },
  },
  { timestamps: true },
);

export type TransactionDocument = InferSchemaType<typeof transactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Transaction = mongoose.model("Transaction", transactionSchema);
