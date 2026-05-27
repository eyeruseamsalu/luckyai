import mongoose, { Schema, type InferSchemaType } from "mongoose";

const adminLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const AdminLog = mongoose.model("AdminLog", adminLogSchema);
