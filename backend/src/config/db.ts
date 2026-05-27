import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<boolean> {
	if (!env.mongodbUri) {
		console.warn("[db] MONGODB_URI not set — API running without database");
		return false;
	}

	try {
		await mongoose.connect(env.mongodbUri);
		console.log("[db] Connected to MongoDB");
		return true;
	} catch (err) {
		console.warn(
			"[db] MongoDB connection failed — API running without database",
		);
		console.warn(err);
		return false;
	}
}
