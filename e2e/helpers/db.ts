import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer;

/**
 * Start an in-memory MongoDB instance and connect mongoose to it.
 * Call in globalSetup or beforeAll.
 */
export async function startMemoryDb(): Promise<string> {
	mongod = await MongoMemoryServer.create();
	const uri = mongod.getUri();
	await mongoose.connect(uri);
	return uri;
}

/**
 * Disconnect mongoose and stop the in-memory MongoDB instance.
 * Call in globalTeardown or afterAll.
 */
export async function stopMemoryDb(): Promise<void> {
	await mongoose.disconnect();
	if (mongod) {
		await mongod.stop();
	}
}

/**
 * Drop all collections (useful between tests).
 */
export async function clearDatabase(): Promise<void> {
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
}
