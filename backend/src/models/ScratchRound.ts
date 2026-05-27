import mongoose, { type InferSchemaType, Schema } from "mongoose";

const scratchRoundSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		cost: { type: Number, required: true },
		cardIndex: { type: Number, required: true },
		setKey: { type: Number, required: true },
		prizeIndex: { type: Number, required: true },
		prizeTier: {
			type: String,
			enum: ["high", "mid", "asset"],
			required: true,
		},
		prizeCash: { type: Number, required: true },
		prizeStars: { type: Number, required: true },
		boostLabel: { type: String, default: null },
		wonCash: { type: Number, required: true },
		wonStars: { type: Number, required: true },
	},
	{ timestamps: true },
);

export type ScratchRoundDocument = InferSchemaType<
	typeof scratchRoundSchema
> & {
	_id: mongoose.Types.ObjectId;
};

export const ScratchRound = mongoose.model("ScratchRound", scratchRoundSchema);
