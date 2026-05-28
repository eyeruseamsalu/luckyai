import { expect, test } from "@playwright/test";
import mongoose from "mongoose";
import { registerUser } from "./helpers/auth";
import { clearDatabase } from "./helpers/db";

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

async function addStars(email: string, amount: number) {
	const User = mongoose.models.User;
	await User.findOneAndUpdate({ email }, { $inc: { starsBalance: amount } });
}

async function getUser(email: string) {
	const User = mongoose.models.User;
	return User.findOne({ email });
}

test.describe("Shop API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("GET /api/shop/items returns default items", async ({ request }) => {
		const token = await registerAndGetToken(request, "shop-items@e2e.test");

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

		const multiplier = body.items.find(
			(i: { key: string }) => i.key === "multiplier",
		);
		expect(multiplier).toBeDefined();
		expect(multiplier.name).toBe("Multiplier");
		expect(multiplier.starCost).toBe(150);
		expect(multiplier.type).toBe("boost");
		expect(multiplier.active).toBe(true);
	});

	test("purchase a multiplier boost deducts stars and activates boost", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "shop-boost@e2e.test");
		await addStars("shop-boost@e2e.test", 500);

		let user = await getUser("shop-boost@e2e.test");
		expect(user.starsBalance).toBe(500);

		const res = await request.post("/api/shop/purchase", {
			data: { itemKey: "multiplier" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.itemKey).toBe("multiplier");
		expect(body.newStarsBalance).toBe(350);

		user = await getUser("shop-boost@e2e.test");
		expect(user.starsBalance).toBe(350);
		const boost = user.activeBoosts.find(
			(b: { type: string }) => b.type === "multiplier",
		);
		expect(boost).toBeDefined();
		expect(boost.label).toBe("Multiplier");
		expect(boost.expiresAfter).toBe(5);

		const Boost = mongoose.models.Boost;
		const boostDoc = await Boost.findOne({
			userId: user._id,
			type: "multiplier",
		});
		expect(boostDoc).toBeDefined();
		expect(boostDoc.label).toBe("Multiplier");
	});

	test("purchase crown ticket increments tickets and creates Ticket document", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "shop-ticket@e2e.test");
		await addStars("shop-ticket@e2e.test", 2000);

		let user = await getUser("shop-ticket@e2e.test");
		expect(user.tickets).toBe(0);

		const res = await request.post("/api/shop/purchase", {
			data: { itemKey: "crownTicket" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.itemKey).toBe("crownTicket");

		user = await getUser("shop-ticket@e2e.test");
		expect(user.tickets).toBe(1);
		expect(user.starsBalance).toBe(500);

		const Ticket = mongoose.models.Ticket;
		const ticketDoc = await Ticket.findOne({ userId: user._id });
		expect(ticketDoc).toBeDefined();
		expect(ticketDoc.drawType).toBe("crown");
		expect(ticketDoc.entryType).toBe("stars");
	});

	test("purchase mystery box adds random stars and returns mysteryWon", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "shop-mystery@e2e.test");
		await addStars("shop-mystery@e2e.test", 500);

		let user = await getUser("shop-mystery@e2e.test");

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

		user = await getUser("shop-mystery@e2e.test");
		expect(user.starsBalance).toBe(body.newStarsBalance);
		expect(body.newStarsBalance).toBe(body.mysteryWon);

		const Transaction = mongoose.models.Transaction;
		const txns = await Transaction.find({ userId: user._id }).sort({
			createdAt: 1,
		});
		expect(txns.length).toBeGreaterThanOrEqual(2);
		expect(txns[0].amt).toBe(-500);
		expect(txns[0].desc).toContain("Mystery Box");
		expect(txns[1].amt).toBe(body.mysteryWon);
		expect(txns[1].desc).toContain("Mystery Box");
	});

	test("purchase with insufficient stars returns 400", async ({ request }) => {
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

		const user = await getUser("shop-insufficient@e2e.test");
		expect(user.starsBalance).toBe(0);
	});

	test("purchase non-existent item returns 404", async ({ request }) => {
		const token = await registerAndGetToken(request, "shop-notfound@e2e.test");
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

	test("purchase without itemKey returns 400", async ({ request }) => {
		const token = await registerAndGetToken(request, "shop-nokey@e2e.test");

		const res = await request.post("/api/shop/purchase", {
			data: {},
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("itemKey is required");
	});

	test("shop endpoints return 401 without auth", async ({ request }) => {
		const itemsRes = await request.get("/api/shop/items");
		expect(itemsRes.status()).toBe(401);
		let body = await itemsRes.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);

		const purchaseRes = await request.post("/api/shop/purchase", {
			data: { itemKey: "multiplier" },
		});
		expect(purchaseRes.status()).toBe(401);
		body = await purchaseRes.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});
});
