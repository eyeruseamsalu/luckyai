import mongoose, { type InferSchemaType, Schema } from "mongoose";

const platformConfigSchema = new Schema(
	{
		key: { type: String, required: true, unique: true },
		value: { type: Schema.Types.Mixed, required: true },
	},
	{ timestamps: true },
);

export type PlatformConfigDocument = InferSchemaType<typeof platformConfigSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const PlatformConfig = mongoose.model("PlatformConfig", platformConfigSchema);
