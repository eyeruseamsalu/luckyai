import mongoose, { type InferSchemaType, Schema } from "mongoose";

const ticketSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		drawType: {
			type: String,
			enum: ["crown", "weekly"],
			required: true,
		},
		drawId: {
			type: Schema.Types.ObjectId,
			default: null,
		},
		entryType: {
			type: String,
			enum: ["stars", "cash", "hybrid"],
			required: true,
		},
		purchaseDate: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

export type TicketDocument = InferSchemaType<typeof ticketSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const Ticket = mongoose.model("Ticket", ticketSchema);
