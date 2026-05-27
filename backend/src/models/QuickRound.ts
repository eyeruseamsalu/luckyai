import mongoose, { type InferSchemaType, Schema } from "mongoose";

const quickRoundSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		picks: { type: [Number], required: true },
		drawn: { type: [Number], required: true },
		cost: { type: Number, required: true },
		tier: {
			type: String,
			enum: ["Basic", "Standard", "Max"],
			required: true,
		},
		matches: { type: Number, min: 0, max: 3, required: true },
		prizeCash: { type: Number, required: true },
		prizeStars: { type: Number, required: true },
		multiplier: { type: Number, enum: [1, 1.2], required: true },
		result: {
			type: String,
			enum: ["Won", "Free", "Loss"],
			required: true,
		},
	},
	{ timestamps: true },
);

export type QuickRoundDocument = InferSchemaType<typeof quickRoundSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const QuickRound = mongoose.model("QuickRound", quickRoundSchema);
