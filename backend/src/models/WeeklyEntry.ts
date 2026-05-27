import mongoose, { type InferSchemaType, Schema } from "mongoose";

const weeklyEntrySchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		round: { type: Number, required: true },
		numbers: { type: [Number], required: true },
		matchCount: { type: Number, default: -1 },
		winAmount: { type: Number, default: 0 },
	},
	{ timestamps: true },
);

export type WeeklyEntryDocument = InferSchemaType<typeof weeklyEntrySchema> & {
	_id: mongoose.Types.ObjectId;
};

export const WeeklyEntry = mongoose.model("WeeklyEntry", weeklyEntrySchema);
