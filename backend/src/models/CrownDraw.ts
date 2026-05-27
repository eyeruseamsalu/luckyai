import mongoose, { type InferSchemaType, Schema } from "mongoose";

const crownDrawSchema = new Schema(
	{
		name: { type: String, required: true },
		status: {
			type: String,
			enum: ["active", "cancelled", "completed"],
			required: true,
		},
		jackpotAmount: { type: Number, required: true },
		entryCount: { type: Number, default: 0 },
		ticketPriceETB: { type: Number, required: true },
		starEntryCost: { type: Number, required: true },
		drawDate: { type: Date, required: true },
		winningNumbers: { type: [Number], default: [] },
		winners: { type: Number, default: 0 },
		completedAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

export type CrownDrawDocument = InferSchemaType<typeof crownDrawSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const CrownDraw = mongoose.model("CrownDraw", crownDrawSchema);
