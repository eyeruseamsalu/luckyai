import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const lotteryTicketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    drawId: { type: Schema.Types.ObjectId, ref: "Draw", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    numbers: [{ type: Number, required: true }],
    entryType: { type: String, enum: ["stars", "cash", "hybrid"], required: true },
    cashCost: { type: Number, default: 0 },
    starCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

lotteryTicketSchema.index({ userId: 1, drawId: 1, numbers: 1 }, { unique: true });

export type LotteryTicketDocument = HydratedDocument<InferSchemaType<typeof lotteryTicketSchema>>;

export const LotteryTicket = mongoose.model("LotteryTicket", lotteryTicketSchema);
