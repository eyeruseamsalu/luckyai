import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { clearDatabase } from "./helpers/db";
import { loginUser, registerUser } from "./helpers/auth";

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

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
// Admin API Tests
// ---------------------------------------------------------------------------
test.describe("Admin API", () => {
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
	// Overview
	// -----------------------------------------------------------------------
	test("admin overview returns stats", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-overview@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		await mongoose.model("User").create({
			name: "User 1",
			email: "user1@e2e.test",
			passwordHash: hash,
		});
		await mongoose.model("User").create({
			name: "User 2",
			email: "user2@e2e.test",
			passwordHash: hash,
		});
		const adminUser = await mongoose.model("User").findOne({ email: "admin-overview@e2e.test" });
		await mongoose.model("Transaction").create({
			userId: adminUser!._id,
			type: "in",
			desc: "Deposit",
			amt: 1000,
		});
		await mongoose.model("Transaction").create({
			userId: adminUser!._id,
			type: "in",
			desc: "Deposit",
			amt: 500,
		});

		const res = await request.get("/api/admin/overview", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.stats).toBeDefined();
		expect(typeof body.stats.totalUsers).toBe("number");
		expect(body.stats.totalUsers).toBeGreaterThanOrEqual(3);
		expect(typeof body.stats.totalRevenue).toBe("number");
		expect(body.stats.totalRevenue).toBeGreaterThanOrEqual(1500);
		expect(Array.isArray(body.stats.recentActivity)).toBe(true);
	});

	test("non-admin gets 403 on overview", async ({ request }) => {
		const token = await registerAndGetToken(request, "regular-user@e2e.test");

		const res = await request.get("/api/admin/overview", auth(token));
		expect(res.status()).toBe(403);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/admin access required/i);
	});

	// -----------------------------------------------------------------------
	// Users
	// -----------------------------------------------------------------------
	test("get users returns paginated list", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-users-list@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		await mongoose.model("User").create({
			name: "Alice Wonder",
			email: "alice@e2e.test",
			passwordHash: hash,
		});
		await mongoose.model("User").create({
			name: "Bob Smith",
			email: "bob@e2e.test",
			passwordHash: hash,
		});

		const res = await request.get(
			"/api/admin/users?limit=10",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.users)).toBe(true);
		expect(body.users.length).toBeGreaterThanOrEqual(3);
		expect(typeof body.total).toBe("number");
		expect(typeof body.page).toBe("number");
		expect(typeof body.pages).toBe("number");

		const u = body.users[0];
		expect(u._id).toBeDefined();
		expect(u.name).toBeDefined();
		expect(u.email).toBeDefined();
		expect(u.role).toBeDefined();
	});

	test("get users with search returns filtered results", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-users-search@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		await mongoose.model("User").create({
			name: "UniqueName Xyz",
			email: "unique@e2e.test",
			passwordHash: hash,
		});

		const res = await request.get(
			"/api/admin/users?search=UniqueName",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.users.length).toBe(1);
		expect(body.users[0].name).toBe("UniqueName Xyz");
	});

	test("update user changes fields", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-user-update@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		const user = await mongoose.model("User").create({
			name: "Old Name",
			email: "update-me@e2e.test",
			passwordHash: hash,
		});

		const res = await request.put(
			`/api/admin/users/${user._id}`,
			{
				data: { name: "New Name", isPremium: true },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.user.name).toBe("New Name");
		expect(body.user.isPremium).toBe(true);

		const updated = await mongoose.model("User").findById(user._id);
		expect(updated!.name).toBe("New Name");
		expect(updated!.isPremium).toBe(true);
	});

	test("suspend user sets status to suspended", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-suspend@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		const user = await mongoose.model("User").create({
			name: "Suspend Me",
			email: "suspend@e2e.test",
			passwordHash: hash,
		});

		const res = await request.put(
			`/api/admin/users/${user._id}/suspend`,
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.user.status).toBe("suspended");

		const dbUser = await mongoose.model("User").findById(user._id);
		expect(dbUser!.status).toBe("suspended");
	});

	test("activate user sets status to active", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-activate@e2e.test");

		const hash = await bcrypt.hash("pw", 10);
		const user = await mongoose.model("User").create({
			name: "Activate Me",
			email: "activate@e2e.test",
			passwordHash: hash,
			status: "suspended",
		});

		await request.put(
			`/api/admin/users/${user._id}/activate`,
			auth(token),
		);

		const dbUser = await mongoose.model("User").findById(user._id);
		expect(dbUser!.status).toBe("active");
	});

	// -----------------------------------------------------------------------
	// Crown Draws
	// -----------------------------------------------------------------------
	test("create crown draw returns new draw", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-crown-create@e2e.test");

		const res = await request.post(
			"/api/admin/draws/crown",
			{
				data: {
					name: "Test Draw",
					jackpotAmount: 100000,
					drawDate: new Date(Date.now() + 30 * 86400000).toISOString(),
				},
				...auth(token),
			},
		);
		expect(res.status()).toBe(201);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.draw).toBeDefined();
		expect(body.draw.name).toBe("Test Draw");
		expect(body.draw.jackpotAmount).toBe(100000);
		expect(body.draw.status).toBe("active");
	});

	test("get crown draws returns all draws", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-crown-list@e2e.test");

		const CrownDraw = mongoose.model("CrownDraw");
		await CrownDraw.create({
			name: "Draw 1",
			status: "active",
			jackpotAmount: 100000,
			ticketPriceETB: 500,
			starEntryCost: 1500,
			drawDate: new Date(),
		});
		await CrownDraw.create({
			name: "Draw 2",
			status: "completed",
			jackpotAmount: 200000,
			ticketPriceETB: 500,
			starEntryCost: 1500,
			drawDate: new Date(),
			winningNumbers: [1, 2, 3, 4, 5, 6],
			completedAt: new Date(),
		});

		const res = await request.get("/api/admin/draws/crown", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.draws).toBeDefined();
		expect(body.draws.length).toBe(2);
	});

	test("run crown draw executes and finds winners", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-crown-run@e2e.test");

		const CrownDraw = mongoose.model("CrownDraw");
		const CrownDrawEntry = mongoose.model("CrownDrawEntry");

		const draw = await CrownDraw.create({
			name: "Live Draw",
			status: "active",
			jackpotAmount: 500000,
			ticketPriceETB: 30,
			starEntryCost: 100,
			drawDate: new Date(Date.now() + 7 * 86400000),
		});

		const hash = await bcrypt.hash("pw", 10);
		const player = await mongoose.model("User").create({
			name: "Player",
			email: "player@e2e.test",
			passwordHash: hash,
		});

		await CrownDrawEntry.create({
			userId: player._id,
			drawId: draw._id,
			numbers: [10, 20, 30, 31, 32, 33],
			entryType: "stars",
		});

		const res = await request.post(
			`/api/admin/draws/crown/${draw._id}/run`,
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.result).toBeDefined();
		expect(body.result.winningNumbers).toBeDefined();
		expect(body.result.winningNumbers).toHaveLength(6);
		expect(typeof body.result.winners).toBe("number");
		expect(typeof body.result.totalPrizeDistributed).toBe("number");

		const updatedDraw = await CrownDraw.findById(draw._id);
		expect(updatedDraw!.status).toBe("completed");
		expect(updatedDraw!.winningNumbers).toHaveLength(6);
		expect(updatedDraw!.completedAt).toBeDefined();
	});

	test("cancel crown draw sets status to cancelled", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-crown-cancel@e2e.test");

		const CrownDraw = mongoose.model("CrownDraw");
		const draw = await CrownDraw.create({
			name: "Cancel Me",
			status: "active",
			jackpotAmount: 100000,
			ticketPriceETB: 500,
			starEntryCost: 1500,
			drawDate: new Date(),
		});

		const res = await request.post(
			`/api/admin/draws/crown/${draw._id}/cancel`,
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.draw.status).toBe("cancelled");
	});

	// -----------------------------------------------------------------------
	// Weekly Draws
	// -----------------------------------------------------------------------
	test("create weekly draw creates new round", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-weekly-create@e2e.test");

		const res = await request.post(
			"/api/admin/draws/weekly",
			{ data: {}, ...auth(token) },
		);
		expect(res.status()).toBe(201);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.draw).toBeDefined();
		expect(body.draw.round).toBe(1);
		expect(body.draw.status).toBe("open");
	});

	test("run weekly draw executes and distributes prizes", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-weekly-run@e2e.test");

		const WeeklyDraw = mongoose.model("WeeklyDraw");
		const WeeklyEntry = mongoose.model("WeeklyEntry");

		const draw = await WeeklyDraw.create({
			round: 1,
			status: "open",
			prizePoolETB: 100000,
		});

		const hash = await bcrypt.hash("pw", 10);
		const player = await mongoose.model("User").create({
			name: "Weekly Player",
			email: "weekly-player@e2e.test",
			passwordHash: hash,
		});

		await WeeklyEntry.create({
			userId: player._id,
			round: 1,
			numbers: [1, 2, 3, 4, 5, 6],
		});

		const res = await request.post(
			"/api/admin/draws/weekly/1/run",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.result.winningNumbers).toHaveLength(6);
		expect(typeof body.result.winners).toBe("number");
	});

	// -----------------------------------------------------------------------
	// Game Config
	// -----------------------------------------------------------------------
	test("get game config returns values", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-gamecfg@e2e.test");

		const res = await request.get("/api/admin/config/game", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config).toBeDefined();
		expect(body.config.spinCost).toBeDefined();
	});

	test("update game config persists", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-gamecfg-upd@e2e.test");

		const res = await request.put(
			"/api/admin/config/game",
			{
				data: { spinCost: 10, scratchCost: 8 },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config.spinCost).toBe(10);
		expect(body.config.scratchCost).toBe(8);

		const GameConfig = mongoose.model("GameConfig");
		const spinCfg = await GameConfig.findOne({ key: "spinCost" });
		expect(spinCfg!.value).toBe(10);
	});

	// -----------------------------------------------------------------------
	// Platform Config
	// -----------------------------------------------------------------------
	test("get platform config returns values", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-platcfg@e2e.test");

		const res = await request.get("/api/admin/config/platform", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config).toBeDefined();
		expect(body.config.platformName).toBeDefined();
	});

	test("update platform config persists", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-platcfg-upd@e2e.test");

		const res = await request.put(
			"/api/admin/config/platform",
			{
				data: { platformName: "My Platform", supportEmail: "admin@test.com" },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config.platformName).toBe("My Platform");
		expect(body.config.supportEmail).toBe("admin@test.com");
	});

	// -----------------------------------------------------------------------
	// Economy Config
	// -----------------------------------------------------------------------
	test("get economy config returns star rate and items", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-economy@e2e.test");

		await mongoose.model("ShopItem").create({
			key: "bonus-draw",
			name: "Bonus Draw Entry",
			starCost: 100,
			type: "ticket",
		});

		const res = await request.get("/api/admin/config/economy", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config).toBeDefined();
		expect(typeof body.config.starEarnRate).toBe("number");
	});

	test("update star rate persists", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-star-rate@e2e.test");

		const res = await request.put(
			"/api/admin/config/economy/star-rate",
			{
				data: { rate: 50 },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.config.starEarnRate).toBe(50);

		const GameConfig = mongoose.model("GameConfig");
		const cfg = await GameConfig.findOne({ key: "starEarnRate" });
		expect(cfg!.value).toBe(50);
	});

	test("get economy items returns shop items", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-econ-items@e2e.test");

		await mongoose.model("ShopItem").create({
			key: "test-item",
			name: "Test Item",
			starCost: 200,
			type: "boost",
		});

		const res = await request.get(
			"/api/admin/config/economy/items",
			auth(token),
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.items)).toBe(true);
		expect(body.items.length).toBeGreaterThanOrEqual(1);
	});

	test("update item cost changes star cost", async ({ request }) => {
		const token = await createAdminAndGetToken(request, "admin-item-cost@e2e.test");

		await mongoose.model("ShopItem").create({
			key: "multiplier",
			name: "Multiplier",
			starCost: 150,
			type: "boost",
		});

		const res = await request.put(
			"/api/admin/config/economy/items/multiplier",
			{
				data: { cost: 200 },
				...auth(token),
			},
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.item.starCost).toBe(200);

		const item = await mongoose.model("ShopItem").findOne({ key: "multiplier" });
		expect(item!.starCost).toBe(200);
	});

	// -----------------------------------------------------------------------
	// Auth — non-admin gets 403
	// -----------------------------------------------------------------------
	test("non-admin gets 403 on user list", async ({ request }) => {
		const token = await registerAndGetToken(request, "regular-forbidden@e2e.test");

		const endpoints = [
			"/api/admin/users",
			"/api/admin/overview",
			"/api/admin/draws/crown",
			"/api/admin/draws/weekly",
			"/api/admin/config/game",
			"/api/admin/config/platform",
			"/api/admin/config/economy",
		];

		for (const ep of endpoints) {
			const res = await request.get(ep, auth(token));
			expect(res.status()).toBe(403);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/admin access required/i);
		}
	});

	test("unauthenticated request returns 401 on admin endpoints", async ({ request }) => {
		const endpoints = [
			"/api/admin/overview",
			"/api/admin/users",
			"/api/admin/draws/crown",
			"/api/admin/config/game",
		];

		for (const ep of endpoints) {
			const res = await request.get(ep);
			expect(res.status()).toBe(401);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/authentication required/i);
		}
	});
});
