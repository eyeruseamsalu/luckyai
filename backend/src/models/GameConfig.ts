import mongoose, { type InferSchemaType, Schema } from "mongoose";

const gameConfigSchema = new Schema(
	{
		key: { type: String, required: true, unique: true },
		value: { type: Schema.Types.Mixed, required: true },
	},
	{ timestamps: true },
);

export type GameConfigDocument = InferSchemaType<typeof gameConfigSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const GameConfig = mongoose.model("GameConfig", gameConfigSchema);
