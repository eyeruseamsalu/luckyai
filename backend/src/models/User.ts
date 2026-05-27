import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const boostSchema = new Schema(
  {
    type: { type: String, enum: ["multiplier", "lossProtection", "premiumDay"], required: true },
    label: { type: String, required: true },
    icon: { type: String, default: "" },
    expiresAfter: { type: Number, required: true },
  },
  { _id: false },
);

const weeklyDrawResultSchema = new Schema(
  {
    winningNumbers: [{ type: Number }],
    date: { type: String },
    round: { type: Number },
    winners: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    balance: { type: Number, default: 0 },
    starsBalance: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    tickets: { type: Number, default: 0 },
    freeSpins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    activityPoints: { type: Number, default: 0 },
    dailyClaimed: { type: Boolean, default: false },
    lastDailyClaimAt: { type: Date, default: null },
    playsToday: { type: Number, default: 0 },
    spinsToday: { type: Number, default: 0 },
    scratchesToday: { type: Number, default: 0 },
    quickPlaysToday: { type: Number, default: 0 },
    lastPlayDate: { type: String, default: "" },
    cashCapHit: { type: Boolean, default: false },
    bonusDrawEntries: { type: Number, default: 0 },
    lossProtectionPlays: { type: Number, default: 0 },
    activeBoosts: { type: [boostSchema], default: [] },
    weeklyDrawResult: { type: weeklyDrawResultSchema, default: null },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = mongoose.model("User", userSchema);
