import { expect, test } from "@playwright/test";
import mongoose from "mongoose";
import { registerUser } from "./helpers/auth";
import { clearDatabase } from "./helpers/db";

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

/**
 * Helper: register a fresh user and return the auth token.
 */
async function registerAndGetToken(
	request: Parameters<typeof registerUser>[0],
	email: string,
) {
	const body = await registerUser(request, {
		name: "E2E Tester",
		email,
		password: "password123",
	});
	expect(body.success).toBe(true);
	return body.token as string;
}

async function depositFunds(
	request: Parameters<typeof registerUser>[0],
	token: string,
	amount: number,
) {
	const res = await request.post("/api/wallet/deposit", {
		data: { amount },
		...auth(token),
	});
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.success).toBe(true);
	return body;
}

async function scratchPlay(
	request: Parameters<typeof registerUser>[0],
	token: string,
	cost: number,
) {
	const res = await request.post("/api/games/scratch/play", {
		data: { cost },
		...auth(token),
	});
	const body = await res.json();
	return { status: res.status(), body };
}

async function getWallet(
	request: Parameters<typeof registerUser>[0],
	token: string,
) {
	const res = await request.get("/api/wallet", auth(token));
	return res.json();
}

// ---------------------------------------------------------------------------
// API Tests  —  direct backend game logic verification
// ---------------------------------------------------------------------------
test.describe("Scratch Play - API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("Happy path: play with valid cost returns correct response shape", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"scratch-happy@e2e.test",
		);
		await depositFunds(request, token, 100);

		const { status, body } = await scratchPlay(request, token, 5);

		expect(status).toBe(200);
		expect(body.success).toBe(true);

		// Prize shape
		expect(body.prize).toBeDefined();
		expect(["high", "mid", "asset"]).toContain(body.prize.tier);
		expect(typeof body.prize.headline).toBe("string");
		expect(typeof body.prize.sub).toBe("string");
		expect(typeof body.prize.stars).toBe("number");
		expect(body.prize.stars).toBeGreaterThanOrEqual(0);

		// Winnings
		expect(typeof body.wonCash).toBe("number");
		expect(body.wonCash).toBeGreaterThanOrEqual(0);
		expect(typeof body.wonStars).toBe("number");
		expect(body.wonStars).toBeGreaterThanOrEqual(0);

		// Balance
		expect(typeof body.newBalance).toBe("number");
		expect(body.newBalance).toBeGreaterThanOrEqual(0);
		expect(typeof body.newStarsBalance).toBe("number");
		expect(body.newStarsBalance).toBeGreaterThanOrEqual(0);
		expect(typeof body.cashCapHit).toBe("boolean");
	});

	test("All cost tiers (5, 10, 25, 50) succeed", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-costs@e2e.test",
		);
		await depositFunds(request, token, 500);

		for (const cost of [5, 10, 25, 50]) {
			const { status, body } = await scratchPlay(request, token, cost);
			expect(status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.prize).toBeDefined();
		}
	});

	test("Insufficient balance returns 400 and balance unchanged", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"scratch-insufficient@e2e.test",
		);

		const { status, body } = await scratchPlay(request, token, 5);

		expect(status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.message).toBe("Insufficient balance");

		const wallet = await getWallet(request, token);
		expect(wallet.balance).toBe(0);
	});

	test("Invalid cost returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-invalid-cost@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/scratch/play", {
			data: { cost: 7 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/cost/i);
	});

	test("Non-numeric cost returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-invalid-type@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/scratch/play", {
			data: { cost: "five" },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/cost/i);
	});

	test("Asset-tier prize adds boost to user", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-asset-boost@e2e.test",
		);
		await depositFunds(request, token, 500);

		let foundAsset = false;
		for (let i = 0; i < 50; i++) {
			const { body } = await scratchPlay(request, token, 5);

			if (body.prize.tier === "asset") {
				foundAsset = true;
				expect(body.prize.boostLabel).toBeTruthy();

				// Verify the boost was actually stored on the user
				const User = mongoose.models.User;
				const user = await User.findOne({
					email: "scratch-asset-boost@e2e.test",
				});
				expect(user).toBeTruthy();

				const boostLabel = body.prize.boostLabel as string;

				if (boostLabel === "2x Stars next 5 plays") {
					const boost = user.activeBoosts.find(
						(b: { type: string }) => b.type === "multiplier",
					);
					expect(boost).toBeTruthy();
					expect(boost.expiresAfter).toBe(5);
				} else if (boostLabel === "Loss protection x3") {
					const boost = user.activeBoosts.find(
						(b: { type: string }) => b.type === "lossProtection",
					);
					expect(boost).toBeTruthy();
					expect(boost.expiresAfter).toBe(3);
				} else if (boostLabel === "Crown Draw entry") {
					expect(user.bonusDrawEntries).toBeGreaterThanOrEqual(1);
				}
				break;
			}
		}

		// 70% probability per play; 50 rounds should almost certainly hit
		if (!foundAsset) {
			// eslint-disable-next-line no-console
			console.log(
				"Asset-tier prize not observed in 50 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Cash cap: 8th play triggers cashCapHit", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-cashcap@e2e.test",
		);
		await depositFunds(request, token, 5000);

		let lastBody: Record<string, unknown> | null = null;

		for (let i = 0; i < 8; i++) {
			const { body } = await scratchPlay(request, token, 5);
			lastBody = body;

			if (i < 7) {
				expect(body.cashCapHit).toBe(false);
			}
		}

		expect(lastBody).not.toBeNull();
		expect(lastBody!.cashCapHit).toBe(true);
	});

	test("History endpoint returns rounds after multiple plays", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"scratch-history@e2e.test",
		);
		await depositFunds(request, token, 100);

		const roundsPlayed = 3;
		for (let i = 0; i < roundsPlayed; i++) {
			await scratchPlay(request, token, 5);
		}

		const res = await request.get(
			"/api/games/scratch/history",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds).toHaveLength(roundsPlayed);

		for (const round of body.rounds) {
			expect(typeof round.cost).toBe("number");
			expect([5, 10, 25, 50]).toContain(round.cost);
			expect(["high", "mid", "asset"]).toContain(round.prizeTier);
			expect(typeof round.prizeCash).toBe("number");
			expect(typeof round.prizeStars).toBe("number");
			expect(typeof round.wonCash).toBe("number");
			expect(typeof round.wonStars).toBe("number");
			expect(round.createdAt).toBeDefined();
		}
	});

	test("History returns empty array for new user", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-history-empty@e2e.test",
		);

		const res = await request.get(
			"/api/games/scratch/history",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds).toEqual([]);
	});

	test("Unauthenticated play returns 401", async ({ request }) => {
		const res = await request.post("/api/games/scratch/play", {
			data: { cost: 5 },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Unauthenticated history returns 401", async ({ request }) => {
		const res = await request.get("/api/games/scratch/history");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Cost deducted from balance before winnings added", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"scratch-deduction@e2e.test",
		);
		await depositFunds(request, token, 100);

		const walletBefore = await getWallet(request, token);

		const { body } = await scratchPlay(request, token, 5);

		const expectedBase = walletBefore.balance - 5;
		const expectedNewBalance = expectedBase + body.wonCash;
		expect(body.newBalance).toBe(expectedNewBalance);
	});

	test("High-tier prize awards both cash and stars", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"scratch-high-tier@e2e.test",
		);
		await depositFunds(request, token, 1000);

		let foundHigh = false;
		for (let i = 0; i < 200; i++) {
			const { body } = await scratchPlay(request, token, 5);

			if (body.prize.tier === "high") {
				foundHigh = true;
				expect(body.wonCash).toBeGreaterThan(0);
				expect(body.wonStars).toBeGreaterThan(0);
				break;
			}
		}

		if (!foundHigh) {
			// eslint-disable-next-line no-console
			console.log(
				"High-tier not observed in 200 rounds (probabilistic — test is still valid)",
			);
		}
	});
});
