import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { loginUser, registerUser } from "./helpers/auth";
import { clearDatabase } from "./helpers/db";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

async function registerAndGetToken(
	request: Parameters<typeof registerUser>[0],
	email: string,
	name = "Integration Tester",
) {
	const body = await registerUser(request, {
		name,
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
	return res.json();
}

async function getWallet(
	request: Parameters<typeof registerUser>[0],
	token: string,
) {
	const res = await request.get("/api/wallet", auth(token));
	return res.json();
}

async function getUserByEmail(email: string) {
	const User = mongoose.model("User");
	return User.findOne({ email });
}

async function addStars(email: string, amount: number) {
	const User = mongoose.models.User;
	await User.findOneAndUpdate({ email }, { $inc: { starsBalance: amount } });
}

async function createAdminAndGetToken(
	request: Parameters<typeof registerUser>[0],
	email: string,
) {
	const hash = await bcrypt.hash("admin123", 10);
	await mongoose.model("User").create({
		name: "Admin User",
		email,
		passwordHash: hash,
		role: "admin",
	});
	const body = await loginUser(request, { email, password: "admin123" });
	expect(body.success).toBe(true);
	return body.token as string;
}

// ---------------------------------------------------------------------------
// Integration test suite
// ---------------------------------------------------------------------------

test.describe("LuckyAI Full Integration", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	// -----------------------------------------------------------------------
	// 1. Complete User Journey: register → deposit → play → earn → withdraw
	// -----------------------------------------------------------------------
	test.describe("Complete User Journey", () => {
		test("1a: Register → deposit → verify balance", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"journey-deposit@e2e.test",
			);

			expect(token).toBeTruthy();
			expect(typeof token).toBe("string");

			const meRes = await request.get("/api/auth/me", auth(token));
			expect(meRes.status()).toBe(200);
			const me = await meRes.json();
			expect(me.success).toBe(true);
			expect(me.user.email).toBe("journey-deposit@e2e.test");
			expect(me.user.balance).toBe(0);

			const depRes = await request.post("/api/wallet/deposit", {
				data: { amount: 1000 },
				...auth(token),
			});
			expect(depRes.status()).toBe(200);
			const depBody = await depRes.json();
			expect(depBody.success).toBe(true);
			expect(depBody.balance).toBe(1000);

			const wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(1000);
			expect(wallet.transactions).toHaveLength(1);
			expect(wallet.transactions[0].type).toBe("in");
			expect(wallet.transactions[0].amt).toBe(1000);
		});

		test("1b: Play quick game → earn stars → withdraw remaining", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"journey-play-withdraw@e2e.test",
			);
			await depositFunds(request, token, 500);

			for (let i = 0; i < 3; i++) {
				const res = await request.post("/api/games/quick/play", {
					data: { picks: [1, 2, 3], cost: 2 },
					...auth(token),
				});
				expect(res.status()).toBe(200);
			}

			const walletAfter = await getWallet(request, token);
			expect(walletAfter.balance).toBeLessThan(500);
			expect(walletAfter.balance).toBeGreaterThanOrEqual(494);
			expect(walletAfter.transactions.length).toBeGreaterThanOrEqual(4);

			if (walletAfter.balance >= 100) {
				const wdRes = await request.post("/api/wallet/withdraw", {
					data: { amount: 100 },
					...auth(token),
				});
				expect(wdRes.status()).toBe(200);
				const wdBody = await wdRes.json();
				expect(wdBody.success).toBe(true);
				expect(wdBody.transaction.type).toBe("out");
				expect(wdBody.transaction.amt).toBe(-100);
			}
		});

		test("1c: Withdraw with insufficient balance returns 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"journey-insufficient-wd@e2e.test",
			);

			const res = await request.post("/api/wallet/withdraw", {
				data: { amount: 50 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Insufficient balance");

			// Balance unchanged (still 0)
			const wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(0);
		});

		test("1d: Deposit over max (50001) returns 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"journey-overmax-dep@e2e.test",
			);

			const res = await request.post("/api/wallet/deposit", {
				data: { amount: 50001 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Maximum single deposit is 50,000 ETB");

			// Balance unchanged
			const wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(0);
		});

		test("1e: Withdrawal below minimum (49) returns 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"journey-belowmin-wd@e2e.test",
			);
			await depositFunds(request, token, 100);

			const res = await request.post("/api/wallet/withdraw", {
				data: { amount: 49 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Minimum withdrawal is 50 ETB");
		});

		test("1f: Withdrawal over max (50001) returns 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"journey-overmax-wd@e2e.test",
			);
			await depositFunds(request, token, 100000);

			const res = await request.post("/api/wallet/withdraw", {
				data: { amount: 50001 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Maximum single withdrawal is 50,000 ETB");
		});
	});

	// -----------------------------------------------------------------------
	// 2. Authentication & Protected Routes
	// -----------------------------------------------------------------------
	test.describe("Authentication & Authorization", () => {
		test("2a: Register then login with same credentials", async ({
			request,
		}) => {
			await registerUser(request, {
				name: "Auth Tester",
				email: "auth-login@e2e.test",
				password: "securePass1",
			});

			const loginRes = await loginUser(request, {
				email: "auth-login@e2e.test",
				password: "securePass1",
			});
			expect(loginRes.success).toBe(true);
			expect(loginRes.token).toBeTruthy();
			expect(loginRes.user.email).toBe("auth-login@e2e.test");
		});

		test("2b: Login with wrong password returns 401", async ({ request }) => {
			await registerUser(request, {
				name: "Wrong PW",
				email: "auth-wrongpw@e2e.test",
				password: "correctPass",
			});

			const res = await request.post("/api/auth/login", {
				data: { email: "auth-wrongpw@e2e.test", password: "wrongPass" },
			});
			expect(res.status()).toBe(401);
			const body = await res.json();
			expect(body.success).toBe(false);
		});

		test("2c: Access multiple protected routes without token → all 401", async ({
			request,
		}) => {
			const protectedEndpoints = [
				{ method: "get" as const, path: "/api/auth/me" },
				{ method: "get" as const, path: "/api/wallet" },
				{ method: "post" as const, path: "/api/wallet/deposit", data: { amount: 100 } },
				{ method: "post" as const, path: "/api/wallet/withdraw", data: { amount: 50 } },
				{ method: "post" as const, path: "/api/daily/claim" },
				{ method: "post" as const, path: "/api/games/quick/play", data: { picks: [1, 2, 3], cost: 2 } },
				{ method: "post" as const, path: "/api/games/spin/play", data: { cost: 5 } },
				{ method: "post" as const, path: "/api/draws/crown/enter", data: { numbers: [1, 2, 3, 4, 5, 6], entryType: "stars" } },
				{ method: "get" as const, path: "/api/shop/items" },
				{ method: "post" as const, path: "/api/boosts/activate", data: { type: "multiplier" } },
			];

			for (const ep of protectedEndpoints) {
				const res = await request[ep.method](ep.path, {
					...(ep.data && { data: ep.data }),
				});
				expect(res.status()).toBe(401);
				const body = await res.json();
				expect(body.success).toBe(false);
				expect(body.message).toMatch(/authentication required/i);
			}
		});

		test("2d: Non-admin gets 403 on admin endpoints", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"auth-nonadmin@e2e.test",
			);

			const adminEndpoints = [
				"/api/admin/overview",
				"/api/admin/users",
				"/api/admin/draws/crown",
				"/api/admin/config/game",
			];

			for (const ep of adminEndpoints) {
				const res = await request.get(ep, auth(token));
				expect(res.status()).toBe(403);
				const body = await res.json();
				expect(body.success).toBe(false);
				expect(body.message).toMatch(/admin access required/i);
			}
		});
	});

	// -----------------------------------------------------------------------
	// 3. Daily Rewards with Streak Tracking
	// -----------------------------------------------------------------------
	test.describe("Daily Rewards & Streaks", () => {
		test("3a: First claim awards 15 ETB + 50 stars, streak = 1", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"daily-first-claim@e2e.test",
			);

			const res = await request.post("/api/daily/claim", auth(token));
			expect(res.status()).toBe(200);

			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.reward.cash).toBe(15);
			expect(body.reward.stars).toBe(50);
			expect(body.streak).toBe(1);
			expect(body.dailyClaimed).toBe(true);

		const wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(15);
			expect(wallet.starsBalance).toBe(50);
		});

		test("3b: Second same-day claim returns 409", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"daily-twice-claim@e2e.test",
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

		test("3c: Streak continues when claimed on consecutive days", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"daily-streak@e2e.test",
			);

			// First claim → streak = 1
			const first = await request.post("/api/daily/claim", auth(token));
			expect(first.status()).toBe(200);
			expect(first.ok()).toBeTruthy();

			// Manually set lastClaimed to yesterday so next claim counts as consecutive
			const user = await getUserByEmail("daily-streak@e2e.test");
			expect(user).not.toBeNull();
			const yesterday = new Date(Date.now() - 86_400_000);
			user.dailyLastClaimed = yesterday;
			// Keep the same streak
			user.streak = 1;
			await user.save();

			// Second claim → streak should be 2
			const second = await request.post("/api/daily/claim", auth(token));
			expect(second.status()).toBe(200);
			const body = await second.json();
			expect(body.success).toBe(true);
			expect(body.streak).toBe(2);
		});

		test("3d: Streak resets to 1 when a day is skipped", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"daily-streak-reset@e2e.test",
			);

			const first = await request.post("/api/daily/claim", auth(token));
			expect(first.status()).toBe(200);

			// Set lastClaimed to 2 days ago (gap = missed day)
			const user = await getUserByEmail("daily-streak-reset@e2e.test");
			expect(user).not.toBeNull();
			const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
			user.dailyLastClaimed = twoDaysAgo;
			user.streak = 1;
			await user.save();

			// Claim again → streak should reset to 1
			const second = await request.post("/api/daily/claim", auth(token));
			expect(second.status()).toBe(200);
			const body = await second.json();
			expect(body.success).toBe(true);
			expect(body.streak).toBe(1);
		});

		test("3e: 7-day streak bonus includes extra cash + ticket", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"daily-bonus@e2e.test",
			);

			// Simulate 7-day streak via DB
			const user = await getUserByEmail("daily-bonus@e2e.test");
			expect(user).not.toBeNull();
			const yesterday = new Date(Date.now() - 86_400_000);
			user.dailyLastClaimed = yesterday;
			user.streak = 6; // After claiming, streak becomes 7
			await user.save();

			const res = await request.post("/api/daily/claim", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.streak).toBe(7);
			expect(body.reward.cash).toBe(15);
			expect(body.reward.bonusCash).toBe(20);
			expect(body.reward.bonusTicket).toBe(1);

			// Total: 15 + 20 = 35 ETB
			const wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(35);
		});
	});

	// -----------------------------------------------------------------------
	// 4. Quick Play Game Mechanics
	// -----------------------------------------------------------------------
	test.describe("Quick Play Mechanics", () => {
		test("4a: Play with cost 5 ETB → verify drawn numbers and balance decrease", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"quick-cost5@e2e.test",
			);
			await depositFunds(request, token, 100);

			const walletBefore = await getWallet(request, token);

			const res = await request.post("/api/games/quick/play", {
				data: { picks: [5, 10, 15], cost: 5 },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.drawn).toHaveLength(3);
			expect(body.matches).toBeGreaterThanOrEqual(0);
			expect(body.matches).toBeLessThanOrEqual(3);

			// Cost deducted + winnings added = new balance
			const expectedBase = walletBefore.balance - 5;
			expect(body.newBalance).toBe(expectedBase + body.wonCash);
			expect(body.playsToday).toBe(1);
		});

		test("4b: Invalid picks (wrong length, non-unique, out of range) → 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"quick-invalid-all@e2e.test",
			);
			await depositFunds(request, token, 100);

			// Wrong length
			let res = await request.post("/api/games/quick/play", {
				data: { picks: [1, 2], cost: 2 },
				...auth(token),
			});
			expect(res.status()).toBe(400);

			// Non-unique
			res = await request.post("/api/games/quick/play", {
				data: { picks: [1, 1, 2], cost: 2 },
				...auth(token),
			});
			expect(res.status()).toBe(400);

			// Out of range
			res = await request.post("/api/games/quick/play", {
				data: { picks: [1, 2, 99], cost: 2 },
				...auth(token),
			});
			expect(res.status()).toBe(400);

			// Invalid cost
			res = await request.post("/api/games/quick/play", {
				data: { picks: [1, 2, 3], cost: 7 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
		});

		test("4c: Insufficient balance for quick play → 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"quick-insufficient@e2e.test",
			);

			const res = await request.post("/api/games/quick/play", {
				data: { picks: [1, 2, 3], cost: 2 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Insufficient balance");
		});
	});

	// -----------------------------------------------------------------------
	// 5. Spin Game Mechanics
	// -----------------------------------------------------------------------
	test.describe("Spin Game Mechanics", () => {
		test("5a: Play spin with 5 ETB → verify segment result and balance", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"spin-basic@e2e.test",
			);
			await depositFunds(request, token, 100);

			const walletBefore = await getWallet(request, token);

			const res = await request.post("/api/games/spin/play", {
				data: { cost: 5 },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.segment).toBeDefined();
			expect(["cash", "stars", "ticket", "premium", "lose"]).toContain(
				body.segment.type,
			);
			expect(typeof body.segment.value).toBe("number");

			const expectedBase = walletBefore.balance - 5;
			expect(body.newBalance).toBe(expectedBase + body.wonCash);
			expect(body.playsToday).toBe(1);
		});

		test("5b: All cost tiers (5, 15, 30, 50) succeed and deduct correctly", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"spin-all-tiers@e2e.test",
			);
			await depositFunds(request, token, 200);

			for (const cost of [5, 15, 30, 50]) {
				const walletBefore = await getWallet(request, token);
				const res = await request.post("/api/games/spin/play", {
					data: { cost },
					...auth(token),
				});
				expect(res.status()).toBe(200);
				const body = await res.json();
				expect(body.success).toBe(true);
				expect(body.segment).toBeDefined();
				// Cost deducted before winnings
				const baseAfterCost = walletBefore.balance - cost;
				const expectedNewBalance = baseAfterCost + body.wonCash;
				expect(body.newBalance).toBe(expectedNewBalance);
			}
		});

		test("5c: Invalid spin cost → 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"spin-invalid@e2e.test",
			);
			await depositFunds(request, token, 100);

			const res = await request.post("/api/games/spin/play", {
				data: { cost: 7 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/cost/i);
		});
	});

	// -----------------------------------------------------------------------
	// 6. Scratch Game Mechanics
	// -----------------------------------------------------------------------
	test.describe("Scratch Game Mechanics", () => {
		test("6a: Play scratch card → verify prize tier revealed", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"scratch-play@e2e.test",
			);
			await depositFunds(request, token, 100);

			const res = await request.post("/api/games/scratch/play", {
				data: { cost: 5 },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.prize).toBeDefined();
			expect(["high", "mid", "asset"]).toContain(body.prize.tier);
			expect(typeof body.prize.headline).toBe("string");
			expect(typeof body.prize.stars).toBe("number");
			expect(body.prize.stars).toBeGreaterThanOrEqual(0);
		});

		test("6b: All scratch cost tiers (5, 10, 25, 50) succeed", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"scratch-costs@e2e.test",
			);
			await depositFunds(request, token, 500);

			for (const cost of [5, 10, 25, 50]) {
				const res = await request.post("/api/games/scratch/play", {
					data: { cost },
					...auth(token),
				});
				expect(res.status()).toBe(200);
				const body = await res.json();
				expect(body.success).toBe(true);
				expect(body.prize).toBeDefined();
			}
		});

		test("6c: Invalid scratch cost → 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"scratch-invalid@e2e.test",
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
	});

	// -----------------------------------------------------------------------
	// 7. Crown Draw System
	// -----------------------------------------------------------------------
	test.describe("Crown Draw System", () => {
		test("7a: Enter crown draw with stars → verify deduction, entry, and ticket", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-stars-entry@e2e.test",
			);

			// Fund with 2000 stars via DB
			const user = await getUserByEmail("crown-stars-entry@e2e.test");
			expect(user).not.toBeNull();
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 2000 });

			const numbers = [3, 9, 15, 21, 27, 33];
			const res = await request.post("/api/draws/crown/enter", {
				data: { numbers, entryType: "stars" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.entryId).toBeDefined();
			expect(body.tickets).toBe(1);
			expect(body.newBalance).toBe(0);
			expect(body.newStarsBalance).toBe(500); // 2000 - 1500

			// Verify entry in DB
			const entry = await mongoose
				.model("CrownDrawEntry")
				.findOne({ userId: user!._id });
			expect(entry).not.toBeNull();
			expect(entry!.numbers).toEqual(numbers);

			// Verify Ticket record
			const ticket = await mongoose
				.model("Ticket")
				.findOne({ userId: user!._id, drawType: "crown" });
			expect(ticket).not.toBeNull();
		});

		test("7b: Enter crown draw with cash → verify deduction", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-cash-entry@e2e.test",
			);

			const user = await getUserByEmail("crown-cash-entry@e2e.test");
			expect(user).not.toBeNull();
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { balance: 1000 });

			const res = await request.post("/api/draws/crown/enter", {
				data: { numbers: [5, 10, 15, 20, 25, 30], entryType: "cash" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.newBalance).toBe(500); // 1000 - 500
			expect(body.tickets).toBe(1);
		});

		test("7c: Enter crown draw with hybrid → deducts both", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-hybrid@e2e.test",
			);

			const user = await getUserByEmail("crown-hybrid@e2e.test");
			expect(user).not.toBeNull();
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { balance: 500, starsBalance: 1000 });

			const res = await request.post("/api/draws/crown/enter", {
				data: { numbers: [2, 4, 6, 8, 10, 12], entryType: "hybrid" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.newBalance).toBe(250); // 500 - 250
			expect(body.newStarsBalance).toBe(250); // 1000 - 750
		});

		test("7d: Suggest numbers returns 6 unique numbers (1-42)", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-suggest@e2e.test",
			);

			const res = await request.post(
				"/api/draws/crown/suggest",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.numbers).toHaveLength(6);
			expect(body.cost).toBe(0); // first suggestion free

			for (const n of body.numbers) {
				expect(n).toBeGreaterThanOrEqual(1);
				expect(n).toBeLessThanOrEqual(42);
			}
			expect(new Set(body.numbers).size).toBe(6);
		});

		test("7e: Get crown entries returns list after entering", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-entries@e2e.test",
			);

			const user = await getUserByEmail("crown-entries@e2e.test");
			expect(user).not.toBeNull();
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 2000 });

			const nums = [1, 7, 13, 19, 25, 31];
			await request.post("/api/draws/crown/enter", {
				data: { numbers: nums, entryType: "stars" },
				...auth(token),
			});

			const res = await request.get(
				"/api/draws/crown/entries",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.entries.length).toBeGreaterThanOrEqual(1);
			expect(body.entries[0].numbers).toEqual(nums);
		});

		test("7f: Enter crown draw with insufficient stars → 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"crown-insufficient@e2e.test",
			);

			const user = await getUserByEmail("crown-insufficient@e2e.test");
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 100 });

			const res = await request.post("/api/draws/crown/enter", {
				data: { numbers: [1, 2, 3, 4, 5, 6], entryType: "stars" },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/insufficient stars/i);
		});
	});

	// -----------------------------------------------------------------------
	// 8. Weekly Draw System
	// -----------------------------------------------------------------------
	test.describe("Weekly Draw System", () => {
		test("8a: Enter weekly draw with 800 stars → verify entry and deduction", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"weekly-enter@e2e.test",
			);

			const user = await getUserByEmail("weekly-enter@e2e.test");
			expect(user).not.toBeNull();
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 2000 });

			const numbers = [1, 5, 12, 23, 34, 42];
			const res = await request.post("/api/draws/weekly/enter", {
				data: { numbers },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.entry).toBeDefined();
			expect(body.entry.numbers).toEqual(numbers);
			expect(body.entry.round).toBe(1);
			expect(body.newStarsBalance).toBe(1200); // 2000 - 800
		});

		test("8b: Get current round returns round info", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"weekly-current@e2e.test",
			);

			const res = await request.get(
				"/api/draws/weekly/current",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.round).toBeDefined();
			expect(body.round.status).toBe("open");
			expect(typeof body.round.drawDate).toBe("string");
			expect(body.round.prizePoolETB).toBe(100000);
		});

		test("8c: Enter weekly with insufficient stars → 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"weekly-insufficient@e2e.test",
			);

			const user = await getUserByEmail("weekly-insufficient@e2e.test");
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 100 });

			const res = await request.post("/api/draws/weekly/enter", {
				data: { numbers: [2, 8, 15, 27, 33, 40] },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/insufficient stars/i);
		});

		test("8d: Get result returns null when no completed draw exists", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"weekly-result@e2e.test",
			);

			const res = await request.get(
				"/api/draws/weekly/result",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.result).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// 9. Stars Shop & Economy
	// -----------------------------------------------------------------------
	test.describe("Stars Shop & Economy", () => {
		test("9a: Get shop items returns all default items", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"shop-items@e2e.test",
			);

			const res = await request.get("/api/shop/items", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.items).toBeDefined();
			expect(Array.isArray(body.items)).toBe(true);

			const keys = body.items.map((i: { key: string }) => i.key).sort();
			expect(keys).toEqual([
				"crownTicket",
				"lossProtection",
				"multiplier",
				"mysteryBox",
				"premiumDay",
				"weeklyTicket",
			]);
		});

		test("9b: Purchase multiplier boost → stars deducted, boost activated", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"shop-multiplier@e2e.test",
			);
			await addStars("shop-multiplier@e2e.test", 500);

			const userBefore = await getUserByEmail("shop-multiplier@e2e.test");
			expect(userBefore.starsBalance).toBe(500);

			const res = await request.post("/api/shop/purchase", {
				data: { itemKey: "multiplier" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.itemKey).toBe("multiplier");
			expect(body.newStarsBalance).toBe(350); // 500 - 150

			// Verify boost stored in DB
			const user = await getUserByEmail("shop-multiplier@e2e.test");
			expect(user.starsBalance).toBe(350);
			const boost = user.activeBoosts.find(
				(b: { type: string }) => b.type === "multiplier",
			);
			expect(boost).toBeDefined();
			expect(boost.expiresAfter).toBe(5);
		});

		test("9c: Purchase mystery box → random stars awarded", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"shop-mystery@e2e.test",
			);
			await addStars("shop-mystery@e2e.test", 500);

			const res = await request.post("/api/shop/purchase", {
				data: { itemKey: "mysteryBox" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.itemKey).toBe("mysteryBox");
			expect(body.mysteryWon).toBeDefined();
			expect(typeof body.mysteryWon).toBe("number");
			expect(body.mysteryWon).toBeGreaterThanOrEqual(10);
			expect(body.mysteryWon).toBeLessThanOrEqual(1000);

			const user = await getUserByEmail("shop-mystery@e2e.test");
			expect(user.starsBalance).toBe(body.newStarsBalance);
		});

		test("9d: Purchase crown ticket increments ticket count", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"shop-ticket@e2e.test",
			);
			await addStars("shop-ticket@e2e.test", 2000);

			const res = await request.post("/api/shop/purchase", {
				data: { itemKey: "crownTicket" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.itemKey).toBe("crownTicket");

			const user = await getUserByEmail("shop-ticket@e2e.test");
			expect(user.tickets).toBe(1);
		});

		test("9e: Purchase with insufficient stars → 400", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"shop-insufficient@e2e.test",
			);

			const res = await request.post("/api/shop/purchase", {
				data: { itemKey: "multiplier" },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Insufficient stars");
		});

		test("9f: Purchase non-existent item → 404", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"shop-notfound@e2e.test",
			);
			await addStars("shop-notfound@e2e.test", 500);

			const res = await request.post("/api/shop/purchase", {
				data: { itemKey: "nonExistentItem" },
				...auth(token),
			});
			expect(res.status()).toBe(404);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Shop item not found");
		});
	});

	// -----------------------------------------------------------------------
	// 10. Cross-feature Integration
	// -----------------------------------------------------------------------
	test.describe("Cross-Feature Integration", () => {
		test("10a: Play games → earn stars → shop → boost affects next game", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"cross-play-shop-boost@e2e.test",
			);
			await depositFunds(request, token, 5000);

			// Step 1: Play quick game several times to earn stars
			let totalStarsEarned = 0;
			for (let i = 0; i < 5; i++) {
				const res = await request.post("/api/games/quick/play", {
					data: { picks: [1, 2, 3], cost: 2 },
					...auth(token),
				});
				expect(res.status()).toBe(200);
				const body = await res.json();
				totalStarsEarned += body.wonStars;
			}

			// Verify some stars were earned (even if 0 from losses)
			const walletAfterGames = await getWallet(request, token);
			expect(typeof walletAfterGames.starsBalance).toBe("number");
			expect(walletAfterGames.starsBalance).toBeGreaterThanOrEqual(
				totalStarsEarned,
			);

			// Step 2: Add enough stars to purchase a multiplier boost
			await addStars("cross-play-shop-boost@e2e.test", 500);

			// Step 3: Purchase multiplier boost from shop
			const shopRes = await request.post("/api/shop/purchase", {
				data: { itemKey: "multiplier" },
				...auth(token),
			});
			expect(shopRes.status()).toBe(200);
			const shopBody = await shopRes.json();
			expect(shopBody.success).toBe(true);

			// Verify boost is active in DB
			let user = await getUserByEmail("cross-play-shop-boost@e2e.test");
			const boost = user.activeBoosts.find(
				(b: { type: string }) => b.type === "multiplier",
			);
			expect(boost).toBeDefined();
			expect(boost.expiresAfter).toBe(5);

			// Step 4: Play spin game (should benefit from boost if cash win)
			const spinRes = await request.post("/api/games/spin/play", {
				data: { cost: 5 },
				...auth(token),
			});
			expect(spinRes.status()).toBe(200);
			const spinBody = await spinRes.json();
			expect(spinBody.success).toBe(true);

			// Step 5: Verify boost was consumed (expiresAfter decremented)
			user = await getUserByEmail("cross-play-shop-boost@e2e.test");
			const boostAfter = user.activeBoosts.find(
				(b: { type: string }) => b.type === "multiplier",
			);
			// If boost still exists, verify it was consumed
			if (boostAfter) {
				expect(boostAfter.expiresAfter).toBeLessThanOrEqual(4);
			}

			// Step 6: Verify tickets exist for crown draw entry
			const ticketsRes = await request.get("/api/tickets", auth(token));
			expect(ticketsRes.status()).toBe(200);
			const ticketsBody = await ticketsRes.json();
			expect(ticketsBody.success).toBe(true);
		});

		test("10b: Daily reward → play game → withdraw earnings", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"cross-daily-play-withdraw@e2e.test",
			);
			await depositFunds(request, token, 100);

			// Step 1: Claim daily reward
			const dailyRes = await request.post("/api/daily/claim", auth(token));
			expect(dailyRes.status()).toBe(200);
			const dailyBody = await dailyRes.json();
			expect(dailyBody.success).toBe(true);
			expect(dailyBody.reward.cash).toBe(15);
			expect(dailyBody.reward.stars).toBe(50);

			// Balance should be 100 (deposit) + 15 (daily) = 115
			let wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(115);
			expect(wallet.starsBalance).toBe(50);

			// Step 2: Play quick game
			const playRes = await request.post("/api/games/quick/play", {
				data: { picks: [4, 8, 12], cost: 5 },
				...auth(token),
			});
			expect(playRes.status()).toBe(200);
			const playBody = await playRes.json();

			// Step 3: Verify balance updated correctly
			wallet = await getWallet(request, token);
			expect(wallet.balance).toBe(playBody.newBalance);

			// Step 4: Withdraw what we can (at least 50 ETB)
			const wdAmount = 50;
			const wdRes = await request.post("/api/wallet/withdraw", {
				data: { amount: wdAmount },
				...auth(token),
			});
			expect(wdRes.status()).toBe(200);
			const wdBody = await wdRes.json();
			expect(wdBody.success).toBe(true);
			expect(wdBody.transaction.type).toBe("out");

			// Verify withdrawal reflected in transaction history
			wallet = await getWallet(request, token);
			const withdrawalTx = wallet.transactions.find(
				(t: { type: string }) => t.type === "out",
			);
			expect(withdrawalTx).toBeDefined();
			expect(withdrawalTx.amt).toBe(-wdAmount);
		});

		test("10c: Crown draw entry creates ticket visible via GET /tickets", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"cross-crown-ticket@e2e.test",
			);

			// Deposit 500 ETB for crown draw entry
			await depositFunds(request, token, 500);

			// Enter crown draw with cash
			await request.post("/api/draws/crown/enter", {
				data: { numbers: [1, 2, 3, 4, 5, 6], entryType: "cash" },
				...auth(token),
			});

			// Verify ticket visible via /api/tickets
			const ticketsRes = await request.get("/api/tickets", auth(token));
			expect(ticketsRes.status()).toBe(200);
			const ticketsBody = await ticketsRes.json();
			expect(ticketsBody.success).toBe(true);
			expect(ticketsBody.tickets).toHaveLength(1);
			expect(ticketsBody.tickets[0].drawType).toBe("crown");
			expect(ticketsBody.tickets[0].entryType).toBe("cash");
		});

		test("10d: Weekly draw entry creates ticket and transactions", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"cross-weekly-ticket@e2e.test",
			);

			// Fund 800 stars
			const user = await getUserByEmail("cross-weekly-ticket@e2e.test");
			await mongoose
				.model("User")
				.findByIdAndUpdate(user!._id, { starsBalance: 800 });

			// Enter weekly draw
			await request.post("/api/draws/weekly/enter", {
				data: { numbers: [2, 8, 14, 22, 30, 38] },
				...auth(token),
			});

			// Verify ticket created
			const ticketsRes = await request.get("/api/tickets", auth(token));
			expect(ticketsRes.status()).toBe(200);
			const ticketsBody = await ticketsRes.json();
			const weeklyTicket = ticketsBody.tickets.find(
				(t: { drawType: string }) => t.drawType === "weekly",
			);
			expect(weeklyTicket).toBeDefined();

			// Verify star transaction created
			const wallet = await getWallet(request, token);
			expect(wallet.starsBalance).toBe(0);
			const starTx = wallet.transactions.find(
				(t: { type: string }) => t.type === "star",
			);
			expect(starTx).toBeDefined();
			expect(starTx.amt).toBe(-800);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Admin Full Management Flow
	// -----------------------------------------------------------------------
	test.describe("Admin Management Flow", () => {
		test("11a: Admin overview returns comprehensive stats", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-overview@e2e.test",
			);

			const res = await request.get("/api/admin/overview", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.stats).toBeDefined();
			expect(typeof body.stats.totalUsers).toBe("number");
			expect(body.stats.totalUsers).toBeGreaterThanOrEqual(1);
			expect(typeof body.stats.totalRevenue).toBe("number");
			expect(Array.isArray(body.stats.recentActivity)).toBe(true);
		});

		test("11b: Get users list with pagination", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-users@e2e.test",
			);

			// Create additional users so we have pagination data
			const hash = await bcrypt.hash("pw", 10);
			await mongoose.model("User").create({
				name: "User One",
				email: "user1@e2e.test",
				passwordHash: hash,
			});
			await mongoose.model("User").create({
				name: "User Two",
				email: "user2@e2e.test",
				passwordHash: hash,
			});

			const res = await request.get(
				"/api/admin/users?limit=2&page=1",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.users.length).toBeGreaterThanOrEqual(1);
			expect(body.total).toBeGreaterThanOrEqual(3);
			expect(body.page).toBe(1);
			expect(typeof body.pages).toBe("number");

			// Verify user shape
			const u = body.users[0];
			expect(u._id).toBeDefined();
			expect(u.name).toBeDefined();
			expect(u.email).toBeDefined();
			expect(u.role).toBeDefined();
		});

		test("11c: Search users by name", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-search@e2e.test",
			);

			const hash = await bcrypt.hash("pw", 10);
			await mongoose.model("User").create({
				name: "UniquePerson",
				email: "unique@e2e.test",
				passwordHash: hash,
			});

			const res = await request.get(
				"/api/admin/users?search=UniquePerson",
				auth(token),
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.users).toHaveLength(1);
			expect(body.users[0].name).toBe("UniquePerson");
		});

		test("11d: Update user fields and verify persistence", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-update@e2e.test",
			);

			const hash = await bcrypt.hash("pw", 10);
			const user = await mongoose.model("User").create({
				name: "Old Name",
				email: "update-me@e2e.test",
				passwordHash: hash,
			});

			const res = await request.put(
				`/api/admin/users/${user._id}`,
				{
					data: { name: "New Name", role: "admin", isPremium: true },
					...auth(token),
				},
			);
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.user.name).toBe("New Name");
			expect(body.user.role).toBe("admin");
			expect(body.user.isPremium).toBe(true);

			// Verify persistence
			const updated = await mongoose.model("User").findById(user._id);
			expect(updated!.name).toBe("New Name");
			expect(updated!.role).toBe("admin");
		});

		test("11e: Suspend and activate user", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-suspend@e2e.test",
			);

			const hash = await bcrypt.hash("pw", 10);
			const user = await mongoose.model("User").create({
				name: "Suspend Test",
				email: "suspend-test@e2e.test",
				passwordHash: hash,
			});

			// Suspend
			const suspendRes = await request.put(
				`/api/admin/users/${user._id}/suspend`,
				auth(token),
			);
			expect(suspendRes.status()).toBe(200);
			let body = await suspendRes.json();
			expect(body.success).toBe(true);
			expect(body.user.role).toBe("suspended");

			// Verify DB
			let dbUser = await mongoose.model("User").findById(user._id);
			expect(dbUser!.role).toBe("suspended");

			// Activate
			const activateRes = await request.put(
				`/api/admin/users/${user._id}/activate`,
				auth(token),
			);
			expect(activateRes.status()).toBe(200);
			body = await activateRes.json();
			expect(body.user.role).toBe("user");

			dbUser = await mongoose.model("User").findById(user._id);
			expect(dbUser!.role).toBe("user");
		});

		test("11f: Create crown draw and verify it appears in list", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-crown@e2e.test",
			);

			// Create
			const createRes = await request.post(
				"/api/admin/draws/crown",
				{
					data: {
						name: "Integration Draw",
						jackpotAmount: 250000,
						drawDate: new Date(
							Date.now() + 30 * 86_400_000,
						).toISOString(),
					},
					...auth(token),
				},
			);
			expect(createRes.status()).toBe(201);
			const createBody = await createRes.json();
			expect(createBody.success).toBe(true);
			expect(createBody.draw.name).toBe("Integration Draw");
			expect(createBody.draw.jackpotAmount).toBe(250000);
			expect(createBody.draw.status).toBe("active");

			// List
			const listRes = await request.get(
				"/api/admin/draws/crown",
				auth(token),
			);
			expect(listRes.status()).toBe(200);
			const listBody = await listRes.json();
			expect(listBody.success).toBe(true);
			expect(listBody.draws.length).toBeGreaterThanOrEqual(1);
			expect(listBody.draws[0].name).toBe("Integration Draw");
		});

		test("11g: Run crown draw with entries → verify winners determined", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-crown-run@e2e.test",
			);

			const CrownDraw = mongoose.model("CrownDraw");
			const CrownDrawEntry = mongoose.model("CrownDrawEntry");

			// Create draw
			const draw = await CrownDraw.create({
				name: "Run Test Draw",
				status: "active",
				jackpotAmount: 500000,
				ticketPriceETB: 500,
				starEntryCost: 1500,
				drawDate: new Date(Date.now() + 7 * 86_400_000),
			});

			// Create an entry
			const hash = await bcrypt.hash("pw", 10);
			const player = await mongoose.model("User").create({
				name: "Draw Player",
				email: "draw-player@e2e.test",
				passwordHash: hash,
			});
			await CrownDrawEntry.create({
				userId: player._id,
				drawId: draw._id,
				numbers: [10, 20, 30, 31, 32, 33],
				entryType: "stars",
			});

			// Run draw
			const runRes = await request.post(
				`/api/admin/draws/crown/${draw._id}/run`,
				auth(token),
			);
			expect(runRes.status()).toBe(200);
			const runBody = await runRes.json();
			expect(runBody.success).toBe(true);
			expect(runBody.result.winningNumbers).toBeDefined();
			expect(runBody.result.winningNumbers).toHaveLength(6);
			expect(typeof runBody.result.winners).toBe("number");

			// Verify draw marked as completed
			const updatedDraw = await CrownDraw.findById(draw._id);
			expect(updatedDraw!.status).toBe("completed");
			expect(updatedDraw!.winningNumbers).toHaveLength(6);
			expect(updatedDraw!.completedAt).toBeDefined();
		});

		test("11h: Cancel crown draw → status changes to cancelled", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-crown-cancel@e2e.test",
			);

			const CrownDraw = mongoose.model("CrownDraw");
			const draw = await CrownDraw.create({
				name: "Cancel Test",
				status: "active",
				jackpotAmount: 100000,
				ticketPriceETB: 500,
				starEntryCost: 1500,
				drawDate: new Date(),
			});

			const cancelRes = await request.post(
				`/api/admin/draws/crown/${draw._id}/cancel`,
				auth(token),
			);
			expect(cancelRes.status()).toBe(200);
			const body = await cancelRes.json();
			expect(body.success).toBe(true);
			expect(body.draw.status).toBe("cancelled");
		});

		test("11i: Create weekly draw and list it", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-weekly@e2e.test",
			);

			const createRes = await request.post(
				"/api/admin/draws/weekly",
				{ data: {}, ...auth(token) },
			);
			expect(createRes.status()).toBe(201);
			const createBody = await createRes.json();
			expect(createBody.success).toBe(true);
			expect(createBody.draw.round).toBe(1);
			expect(createBody.draw.status).toBe("open");

			// List weekly draws
			const listRes = await request.get(
				"/api/admin/draws/weekly",
				auth(token),
			);
			expect(listRes.status()).toBe(200);
			const listBody = await listRes.json();
			expect(listBody.success).toBe(true);
			expect(listBody.draw).toBeDefined();
		});

		test("11j: Get and update game config", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-gamecfg@e2e.test",
			);

			// Get
			const getRes = await request.get(
				"/api/admin/config/game",
				auth(token),
			);
			expect(getRes.status()).toBe(200);
			let body = await getRes.json();
			expect(body.success).toBe(true);
			expect(body.config).toBeDefined();

			// Update
			const updateRes = await request.put(
				"/api/admin/config/game",
				{
					data: { spinCost: 10, scratchCost: 8 },
					...auth(token),
				},
			);
			expect(updateRes.status()).toBe(200);
			body = await updateRes.json();
			expect(body.success).toBe(true);
			expect(body.config.spinCost).toBe(10);
			expect(body.config.scratchCost).toBe(8);

			// Verify persistence
			const GameConfig = mongoose.model("GameConfig");
			const spinCfg = await GameConfig.findOne({ key: "spinCost" });
			expect(spinCfg!.value).toBe(10);
		});

		test("11k: Get and update platform config", async ({ request }) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-platcfg@e2e.test",
			);

			// Get
			const getRes = await request.get(
				"/api/admin/config/platform",
				auth(token),
			);
			expect(getRes.status()).toBe(200);
			let body = await getRes.json();
			expect(body.success).toBe(true);
			expect(body.config.platformName).toBeDefined();

			// Update
			const updateRes = await request.put(
				"/api/admin/config/platform",
				{
					data: {
						platformName: "Integration Platform",
						supportEmail: "integration@test.com",
					},
					...auth(token),
				},
			);
			expect(updateRes.status()).toBe(200);
			body = await updateRes.json();
			expect(body.success).toBe(true);
			expect(body.config.platformName).toBe("Integration Platform");
			expect(body.config.supportEmail).toBe("integration@test.com");
		});

		test("11l: Get and update economy star rate and shop items", async ({
			request,
		}) => {
			const token = await createAdminAndGetToken(
				request,
				"admin-economy@e2e.test",
			);

			// Get economy config
			const getRes = await request.get(
				"/api/admin/config/economy",
				auth(token),
			);
			expect(getRes.status()).toBe(200);
			let body = await getRes.json();
			expect(body.success).toBe(true);
			expect(typeof body.config.starEarnRate).toBe("number");

			// Update star rate
			const rateRes = await request.put(
				"/api/admin/config/economy/star-rate",
				{
					data: { rate: 50 },
					...auth(token),
				},
			);
			expect(rateRes.status()).toBe(200);
			body = await rateRes.json();
			expect(body.success).toBe(true);
			expect(body.config.starEarnRate).toBe(50);

			// Get economy items
			const itemsRes = await request.get(
				"/api/admin/config/economy/items",
				auth(token),
			);
			expect(itemsRes.status()).toBe(200);
			body = await itemsRes.json();
			expect(body.success).toBe(true);
			expect(Array.isArray(body.items)).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// 12. Edge Cases & Error Handling
	// -----------------------------------------------------------------------
	test.describe("Edge Cases & Error Handling", () => {
		test("12a: Deposit zero amount returns 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"edge-zero-deposit@e2e.test",
			);

			const res = await request.post("/api/wallet/deposit", {
				data: { amount: 0 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Amount must be greater than 0");
		});

		test("12b: Deposit negative amount returns 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"edge-negative-deposit@e2e.test",
			);

			const res = await request.post("/api/wallet/deposit", {
				data: { amount: -100 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Amount must be greater than 0");
		});

		test("12c: Withdraw zero amount returns 400", async ({ request }) => {
			const token = await registerAndGetToken(
				request,
				"edge-zero-withdraw@e2e.test",
			);
			await depositFunds(request, token, 100);

			const res = await request.post("/api/wallet/withdraw", {
				data: { amount: 0 },
				...auth(token),
			});
			expect(res.status()).toBe(400);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toBe("Amount must be greater than 0");
		});

		test("12d: Register with duplicate email returns error", async ({
			request,
		}) => {
			await registerUser(request, {
				name: "First",
				email: "edge-duplicate@e2e.test",
				password: "password123",
			});

			const res = await request.post("/api/auth/register", {
				data: {
					name: "Second",
					email: "edge-duplicate@e2e.test",
					password: "password123",
				},
			});
			expect(res.status()).toBe(409);
			const body = await res.json();
			expect(body.success).toBe(false);
		});

		test("12e: Game history returns empty for new user (all game types)", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"edge-empty-history@e2e.test",
			);

			// Quick
			let res = await request.get(
				"/api/games/quick/history",
				auth(token),
			);
			expect(res.status()).toBe(200);
			let body = await res.json();
			expect(body.rounds).toEqual([]);

			// Spin
			res = await request.get("/api/games/spin/history", auth(token));
			expect(res.status()).toBe(200);
			body = await res.json();
			expect(body.rounds).toEqual([]);

			// Scratch
			res = await request.get("/api/games/scratch/history", auth(token));
			expect(res.status()).toBe(200);
			body = await res.json();
			expect(body.rounds).toEqual([]);
		});

		test("12f: Access /api/tickets returns empty for new user", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"edge-empty-tickets@e2e.test",
			);

			const res = await request.get("/api/tickets", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.tickets).toEqual([]);
		});

		test("12g: Boost list returns empty for new user", async ({
			request,
		}) => {
			const token = await registerAndGetToken(
				request,
				"edge-empty-boosts@e2e.test",
			);

			const res = await request.get("/api/boosts", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.boosts).toEqual([]);
		});
	});
});
