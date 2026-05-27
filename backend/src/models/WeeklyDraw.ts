import mongoose, { type InferSchemaType, Schema } from "mongoose";

const weeklyDrawSchema = new Schema(
	{
		round: { type: Number, required: true },
		status: {
			type: String,
			enum: ["open", "closed", "completed"],
			required: true,
		},
		entryCostStars: { type: Number, default: 800 },
		prizePoolETB: { type: Number, default: 100000 },
		winningNumbers: { type: [Number], default: [] },
		winners: { type: Number, default: 0 },
		drawDate: { type: Date, default: null },
		completedAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

export type WeeklyDrawDocument = InferSchemaType<typeof weeklyDrawSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const WeeklyDraw = mongoose.model("WeeklyDraw", weeklyDrawSchema);
