import mongoose, { type InferSchemaType, Schema } from "mongoose";

const boostSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: ["multiplier", "lossProtection", "premiumDay"],
			required: true,
		},
		label: { type: String, required: true },
		icon: { type: String, required: true },
		expiresAfter: { type: Number, required: true },
		expiresAt: { type: Date, default: null },
		activatedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

export type BoostDocument = InferSchemaType<typeof boostSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const Boost = mongoose.model("Boost", boostSchema);
