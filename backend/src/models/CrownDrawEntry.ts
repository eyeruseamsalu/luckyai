import mongoose, { type InferSchemaType, Schema } from "mongoose";

const crownDrawEntrySchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		drawId: {
			type: Schema.Types.ObjectId,
			ref: "CrownDraw",
			required: true,
			index: true,
		},
		numbers: { type: [Number], required: true },
		entryType: {
			type: String,
			enum: ["stars", "cash", "hybrid"],
			required: true,
		},
		starsCost: { type: Number, default: 0 },
		cashCost: { type: Number, default: 0 },
	},
	{ timestamps: true },
);

export type CrownDrawEntryDocument = InferSchemaType<
	typeof crownDrawEntrySchema
> & {
	_id: mongoose.Types.ObjectId;
};

export const CrownDrawEntry = mongoose.model(
	"CrownDrawEntry",
	crownDrawEntrySchema,
);
