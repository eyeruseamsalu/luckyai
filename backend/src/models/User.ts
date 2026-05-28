import mongoose, { type InferSchemaType, Schema } from "mongoose";

const userSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		phone: { type: String, default: "" },
		passwordHash: { type: String, required: true },
		role: {
			type: String,
			enum: ["user", "admin", "suspended"],
			default: "user",
		},
		balance: { type: Number, default: 0 },
		starsBalance: { type: Number, default: 0 },
		isPremium: { type: Boolean, default: false },
		tickets: { type: Number, default: 0 },
		streak: { type: Number, default: 0 },
		activityPoints: { type: Number, default: 0 },
		consecutiveWins: { type: Number, default: 0 },
		playsToday: { type: Number, default: 0 },
		cashCapHit: { type: Boolean, default: false },
		lastPlayDate: { type: Date, default: null },
		activeBoosts: [
			{
				type: {
					type: String,
					enum: ["multiplier", "lossProtection", "premiumDay"],
				},
				label: { type: String },
				icon: { type: String },
				expiresAfter: { type: Number },
				expiresAt: { type: Date },
				activatedAt: { type: Date, default: Date.now },
			},
		],
		suggestionsUsed: { type: Number, default: 0 },
		premiumExpiresAt: { type: Date, default: null },
		dailyLastClaimed: { type: Date, default: null },
		bonusDrawEntries: { type: Number, default: 0 },
	},
	{ timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const User = mongoose.model("User", userSchema);
