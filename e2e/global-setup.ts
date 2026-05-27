import { startMemoryDb } from "./helpers/db";
import { seedAll } from "./helpers/seed";

/**
 * Global setup runs once before all test files.
 * Starts an in-memory MongoDB, sets MONGODB_URI for the Express server and
 * test workers, and seeds base data.
 */
async function globalSetup() {
	const uri = await startMemoryDb();
	// Make the memory db URI available to the Express server (started by
	// Playwright's webServer) and to test workers — both inherit process.env.
	process.env.MONGODB_URI = uri;
	await seedAll();
}

export default globalSetup;
