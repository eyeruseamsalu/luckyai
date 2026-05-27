import mongoose, { type InferSchemaType, Schema } from "mongoose";

const scratchCardSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		cost: { type: Number, required: true },
		prize: { type: Number, required: true },
		isWin: { type: Boolean, required: true },
		revealed: { type: Boolean, default: false },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

export type ScratchCardDocument = InferSchemaType<typeof scratchCardSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const ScratchCard = mongoose.model("ScratchCard", scratchCardSchema);
