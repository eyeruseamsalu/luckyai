import mongoose, { type InferSchemaType, Schema } from "mongoose";

const notificationSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		icon: { type: String, required: true },
		color: { type: String, enum: ["ta", "tp", "tg", "ts"], default: "tg" },
		msg: { type: String, required: true },
		read: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export type NotificationDocument = InferSchemaType<
	typeof notificationSchema
> & {
	_id: mongoose.Types.ObjectId;
};

export const Notification = mongoose.model("Notification", notificationSchema);
