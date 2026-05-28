import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// ---- Schema stubs (inline to avoid importing production code) ----

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		passwordHash: { type: String, required: true },
		role: {
			type: String,
			enum: ["user", "admin", "suspended"],
			default: "user",
		},
	},
	{ timestamps: true },
);

const gameSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		description: { type: String, default: "" },
		genre: { type: String, default: "" },
		price: { type: Number, default: 0 },
		imageUrl: { type: String, default: "" },
	},
	{ timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Game = mongoose.models.Game || mongoose.model("Game", gameSchema);

// ---- Seed functions ----

export async function seedRegularUser() {
	const hash = await bcrypt.hash("password123", 10);
	return User.create({
		name: "Test User",
		email: "testuser@example.com",
		passwordHash: hash,
		role: "user",
	});
}

export async function seedAdminUser() {
	const hash = await bcrypt.hash("admin123", 10);
	return User.create({
		name: "Admin User",
		email: "admin@example.com",
		passwordHash: hash,
		role: "admin",
	});
}

export async function seedGames() {
	return Game.insertMany([
		{
			title: "Test Game 1",
			description: "A test game for e2e",
			genre: "Action",
			price: 19.99,
			imageUrl: "/images/game1.jpg",
		},
		{
			title: "Test Game 2",
			description: "Another test game",
			genre: "Puzzle",
			price: 9.99,
			imageUrl: "/images/game2.jpg",
		},
	]);
}

export async function seedAll(clearFirst = false) {
	if (clearFirst) {
		await User.deleteMany({});
		await Game.deleteMany({});
	}
	await seedRegularUser();
	await seedAdminUser();
	await seedGames();
}
