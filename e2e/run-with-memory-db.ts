import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { seedAll } from "./helpers/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URI_FILE = path.resolve(__dirname, "..", ".e2e-mongo-uri");

async function waitForServer(url: string, maxSeconds: number) {
	for (let i = 0; i < maxSeconds; i++) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
			if (res.ok || res.status < 500) return;
		} catch {
			// not ready yet
		}
		await new Promise((r) => setTimeout(r, 1000));
	}
	throw new Error(`Server at ${url} not ready after ${maxSeconds}s`);
}

async function main() {
	console.log("[e2e] Starting in-memory MongoDB...");
	const mongod = await MongoMemoryServer.create();
	const uri = mongod.getUri();
	fs.writeFileSync(URI_FILE, uri);

	console.log("[e2e] Seeding database at:", uri);
	await mongoose.connect(uri);
	await seedAll();
	await mongoose.disconnect();
	console.log("[e2e] Database seeded");

	console.log("[e2e] Starting dev servers...");
	const devServer = spawn("npm", ["run", "dev"], {
		stdio: "inherit",
		shell: true,
		env: { ...process.env, MONGODB_URI: uri },
	});

	await waitForServer("http://localhost:5173", 60);
	await waitForServer("http://localhost:5000/api/health", 30);
	console.log("[e2e] Servers ready, running Playwright...");

	const testArgs = process.argv.slice(2);
	const testChild = spawn(
		"npx",
		["playwright", "test", "--config=e2e/playwright.config.ts", ...testArgs],
		{
			stdio: "inherit",
			shell: true,
			env: { ...process.env, MONGODB_URI: uri, CI: process.env.CI || "" },
		},
	);

	const testExitCode = await new Promise<number | null>((resolve) => {
		testChild.on("exit", resolve);
	});

	console.log("[e2e] Cleaning up...");
	devServer.kill();
	await mongod.stop();
	try {
		fs.unlinkSync(URI_FILE);
	} catch {
		// ignore
	}
	process.exit(testExitCode ?? 0);
}

main().catch((err) => {
	console.error("[e2e] Error:", err);
	process.exit(1);
});
