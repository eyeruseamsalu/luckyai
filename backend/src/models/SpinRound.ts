import mongoose, { type InferSchemaType, Schema } from "mongoose";

const spinRoundSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		cost: { type: Number, required: true },
		segmentIndex: { type: Number, required: true },
		segmentLabel: { type: String, required: true },
		prizeType: {
			type: String,
			enum: ["cash", "stars", "ticket", "premium", "lose"],
			required: true,
		},
		prizeValue: { type: Number, required: true },
		multiplier: { type: Number, enum: [1, 1.2], required: true },
		streakBonus: { type: Boolean, default: false },
		wonCash: { type: Number, required: true },
		wonStars: { type: Number, required: true },
	},
	{ timestamps: true },
);

export type SpinRoundDocument = InferSchemaType<typeof spinRoundSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const SpinRound = mongoose.model("SpinRound", spinRoundSchema);
