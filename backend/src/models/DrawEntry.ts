import mongoose, { Schema, type InferSchemaType } from "mongoose";

const drawEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    numbers: [{ type: Number, required: true }],
    entryType: { type: String, enum: ["stars", "cash", "hybrid"], required: true },
    cashCost: { type: Number, default: 0 },
    starCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type DrawEntryDocument = InferSchemaType<typeof drawEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DrawEntry = mongoose.model("DrawEntry", drawEntrySchema);
