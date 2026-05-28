import mongoose from "mongoose";
import { startMemoryDb } from "./helpers/db";
import { seedAll } from "./helpers/seed";

async function globalSetup() {
	// If the runner already set MONGODB_URI, just seed and use it
	if (process.env.MONGODB_URI) {
		await mongoose.connect(process.env.MONGODB_URI);
		// Clear existing data and re-seed (idempotent — avoids duplicate key errors)
		await seedAll(true);
		console.log(
			"[globalSetup] Using existing MONGODB_URI, seeded:",
			process.env.MONGODB_URI,
		);
		await mongoose.disconnect();
		return;
	}

	const uri = await startMemoryDb();
	process.env.MONGODB_URI = uri;
	await seedAll();
	await mongoose.disconnect();
	console.log("[globalSetup] Memory DB started and seeded, URI:", uri);
}

export default globalSetup;
