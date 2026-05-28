import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	timeout: 30000,
	retries: 0,
	use: {
		baseURL: "http://localhost:5173",
		headless: true,
	},
	// Servers are started by e2e/run-with-memory-db.mjs which also
	// sets MONGODB_URI to an in-memory MongoDB for full isolation.
	webServer: {
		command:
			'bash -c "echo Waiting for pre-started dev server on http://localhost:5173..."',
		url: "http://localhost:5173",
		reuseExistingServer: true,
		timeout: 60000,
	},
});
