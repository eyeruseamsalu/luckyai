import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const winnerSchema = new Schema(
  {
    drawId: { type: Schema.Types.ObjectId, ref: "Draw", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "LotteryTicket", default: null },
    matchCount: { type: Number, required: true },
    prizeEtb: { type: Number, required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type WinnerDocument = HydratedDocument<InferSchemaType<typeof winnerSchema>>;

export const Winner = mongoose.model("Winner", winnerSchema);
