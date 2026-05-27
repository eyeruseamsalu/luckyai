import { expect, test } from "@playwright/test";
import mongoose from "mongoose";
import { clearDatabase } from "./helpers/db";
import { loginUser, registerUser } from "./helpers/auth";

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

/**
 * Helper: register a fresh user and return the auth token.
 * The registration is done via the live API so the Express backend creates the
 * user in the same (in-memory) database the tests are hitting.
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

// ---------------------------------------------------------------------------
// Wallet API
// ---------------------------------------------------------------------------
test.describe("Wallet API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("deposit 100 ETB increases balance and creates a transaction", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"wallet-deposit@e2e.test",
		);

		const res = await request.post("/api/wallet/deposit", {
			data: { amount: 100 },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.balance).toBe(100);
		expect(body.transaction).toBeDefined();
		expect(body.transaction.type).toBe("in");
		expect(body.transaction.amt).toBe(100);

		const walletRes = await request.get("/api/wallet", auth(token));
		expect(walletRes.status()).toBe(200);

		const wallet = await walletRes.json();
		expect(wallet.success).toBe(true);
		expect(wallet.balance).toBe(100);
		expect(wallet.transactions).toHaveLength(1);
		expect(wallet.transactions[0].type).toBe("in");
		expect(wallet.transactions[0].amt).toBe(100);
	});

	test("withdraw 50 ETB decreases balance and records a transaction", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"wallet-withdraw@e2e.test",
		);

		await request.post("/api/wallet/deposit", {
			data: { amount: 100 },
			...auth(token),
		});

		const res = await request.post("/api/wallet/withdraw", {
			data: { amount: 50 },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.balance).toBe(50);
		expect(body.transaction).toBeDefined();
		expect(body.transaction.type).toBe("out");
		expect(body.transaction.amt).toBe(-50);
		const walletRes = await request.get("/api/wallet", auth(token));
		const wallet = await walletRes.json();
		expect(wallet.success).toBe(true);
		expect(wallet.balance).toBe(50);
		expect(wallet.transactions).toHaveLength(2);
	});

	test("withdraw excessive amount returns 400 error and balance is unchanged", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"wallet-insufficient@e2e.test",
		);

		await request.post("/api/wallet/deposit", {
			data: { amount: 30 },
			...auth(token),
		});

		const res = await request.post("/api/wallet/withdraw", {
			data: { amount: 100 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("Insufficient balance");

		const walletRes = await request.get("/api/wallet", auth(token));
		const wallet = await walletRes.json();
		expect(wallet.balance).toBe(30);
		expect(wallet.transactions).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Daily Rewards
// ---------------------------------------------------------------------------
test.describe("Daily Rewards", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("claim daily reward returns cash, stars, and sets streak", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"daily-first@e2e.test",
		);

		const res = await request.post("/api/daily/claim", {
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.reward).toBeDefined();
		expect(typeof body.reward.cash).toBe("number");
		expect(body.reward.cash).toBeGreaterThan(0);
		expect(typeof body.reward.stars).toBe("number");
		expect(body.reward.stars).toBeGreaterThan(0);
		expect(body.streak).toBe(1);
		expect(body.dailyClaimed).toBe(true);

		const walletRes = await request.get("/api/wallet", auth(token));
		const wallet = await walletRes.json();
		expect(wallet.balance).toBe(body.reward.cash + (body.reward.bonusCash ?? 0));
	});

	test("second daily claim on the same day returns 409", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"daily-twice@e2e.test",
		);

		const first = await request.post("/api/daily/claim", auth(token));
		expect(first.status()).toBe(200);

		const second = await request.post("/api/daily/claim", auth(token));
		expect(second.status()).toBe(409);

		const body = await second.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("Already claimed today");
		expect(body.dailyClaimed).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
test.describe("Profile", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("update profile name returns updated user via GET /me", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"profile-update@e2e.test",
		);

		const newName = "Updated Name";
		const res = await request.put(
			"/api/auth/profile",
			{
				data: { name: newName },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.user).toBeDefined();
		expect(body.user.name).toBe(newName);

		const meRes = await request.get("/api/auth/me", auth(token));
		const me = await meRes.json();
		expect(me.success).toBe(true);
		expect(me.user.name).toBe(newName);
	});

	test("update profile with empty name returns 400 error", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"profile-empty-name@e2e.test",
		);

		const res = await request.put(
			"/api/auth/profile",
			{
				data: { name: "" },
				...auth(token),
			},
		);
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("Name cannot be empty");
	});
});

// ---------------------------------------------------------------------------
// Authentication — unauthenticated access
// ---------------------------------------------------------------------------
test.describe("Authentication", () => {
	test("deposit endpoint returns 401 without auth token", async ({
		request,
	}) => {
		const res = await request.post("/api/wallet/deposit", {
			data: { amount: 100 },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("withdraw endpoint returns 401 without auth token", async ({
		request,
	}) => {
		const res = await request.post("/api/wallet/withdraw", {
			data: { amount: 50 },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("wallet history endpoint returns 401 without auth token", async ({
		request,
	}) => {
		const res = await request.get("/api/wallet");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("daily claim endpoint returns 401 without auth token", async ({
		request,
	}) => {
		const res = await request.post("/api/daily/claim");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("profile update endpoint returns 401 without auth token", async ({
		request,
	}) => {
		const res = await request.put("/api/auth/profile", {
			data: { name: "Hacker" },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("GET /me returns 401 without auth token", async ({ request }) => {
		const res = await request.get("/api/auth/me");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});
});
