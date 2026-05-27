import mongoose, { type InferSchemaType, Schema } from "mongoose";

const shopItemSchema = new Schema(
	{
		key: { type: String, unique: true, required: true },
		name: { type: String, required: true },
		starCost: { type: Number, required: true },
		type: {
			type: String,
			enum: ["boost", "ticket", "premium", "mystery"],
			required: true,
		},
		active: { type: Boolean, default: true },
		description: { type: String, default: "" },
	},
	{ timestamps: true },
);

export type ShopItemDocument = InferSchemaType<typeof shopItemSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const ShopItem = mongoose.model("ShopItem", shopItemSchema);
