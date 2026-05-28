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
		name: "Crown Tester",
		email,
		password: "password123",
	});
	expect(body.success).toBe(true);
	return body.token as string;
}

test.describe("Crown Draw API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("enter crown draw with stars succeeds", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-enter-stars@e2e.test",
		);

		// Credit 2000 stars
		const user = await mongoose.model("User").findOne({
			email: "crown-enter-stars@e2e.test",
		});
		expect(user).not.toBeNull();
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { starsBalance: 2000 });

		const numbers = [1, 2, 3, 4, 5, 6];
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

		// Verify entry created in DB
		const entry = await mongoose
			.model("CrownDrawEntry")
			.findOne({ userId: user!._id });
		expect(entry).not.toBeNull();
		expect(entry!.numbers).toEqual(numbers);
		expect(entry!.entryType).toBe("stars");

		// Verify Ticket record created
		const ticket = await mongoose
			.model("Ticket")
			.findOne({ userId: user!._id, drawType: "crown" });
		expect(ticket).not.toBeNull();
	});

	test("enter crown draw with cash succeeds", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-enter-cash@e2e.test",
		);

		// Deposit 1000 ETB
		const user = await mongoose.model("User").findOne({
			email: "crown-enter-cash@e2e.test",
		});
		expect(user).not.toBeNull();
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { balance: 1000 });

		const numbers = [10, 20, 30, 40, 41, 42];
		const res = await request.post("/api/draws/crown/enter", {
			data: { numbers, entryType: "cash" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.tickets).toBe(1);
		expect(body.newBalance).toBe(500); // 1000 - 500
		expect(body.newStarsBalance).toBe(0);

		// Verify Transaction was created
		const tx = await mongoose
			.model("Transaction")
			.findOne({ userId: user!._id, type: "out" });
		expect(tx).not.toBeNull();
		expect(tx!.amt).toBe(-500);
	});

	test("enter crown draw with hybrid deducts both", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-enter-hybrid@e2e.test",
		);

		// Fund 500 ETB + 1000 stars
		const user = await mongoose.model("User").findOne({
			email: "crown-enter-hybrid@e2e.test",
		});
		expect(user).not.toBeNull();
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { balance: 500, starsBalance: 1000 });

		const numbers = [1, 3, 5, 7, 9, 11];
		const res = await request.post("/api/draws/crown/enter", {
			data: { numbers, entryType: "hybrid" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.newBalance).toBe(250); // 500 - 250
		expect(body.newStarsBalance).toBe(250); // 1000 - 750

		// Verify both Transactions were created
		const txCash = await mongoose
			.model("Transaction")
			.findOne({ userId: user!._id, type: "out", amt: -250 });
		expect(txCash).not.toBeNull();

		const txStar = await mongoose
			.model("Transaction")
			.findOne({ userId: user!._id, type: "star", amt: -750 });
		expect(txStar).not.toBeNull();
	});

	test("enter crown draw with insufficient stars returns 400", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"crown-insufficient-stars@e2e.test",
		);

		// User with only 100 stars (needs 1500)
		const user = await mongoose.model("User").findOne({
			email: "crown-insufficient-stars@e2e.test",
		});
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

		// Verify no entry was created
		const entryCount = await mongoose
			.model("CrownDrawEntry")
			.countDocuments({ userId: user!._id });
		expect(entryCount).toBe(0);
	});

	test("suggest numbers returns 6 unique numbers", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-suggest-ok@e2e.test",
		);

		const res = await request.post("/api/draws/crown/suggest", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.numbers).toBeDefined();
		expect(body.numbers).toHaveLength(6);
		expect(body.cost).toBe(0); // first suggestion is free

		// All numbers between 1-42 and unique
		for (const n of body.numbers) {
			expect(n).toBeGreaterThanOrEqual(1);
			expect(n).toBeLessThanOrEqual(42);
		}
		expect(new Set(body.numbers).size).toBe(6);
	});

	test("suggest numbers 4 times fails on 4th", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-suggest-limit@e2e.test",
		);

		// Fund user with 1 ETB for the third suggestion which costs 1
		const user = await mongoose.model("User").findOne({
			email: "crown-suggest-limit@e2e.test",
		});
		await mongoose.model("User").findByIdAndUpdate(user!._id, { balance: 1 });

		// Call suggest 3 times (should all succeed)
		for (let i = 0; i < 3; i++) {
			const res = await request.post("/api/draws/crown/suggest", auth(token));
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.numbers).toHaveLength(6);
		}

		// 4th call should fail
		const res = await request.post("/api/draws/crown/suggest", auth(token));
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/no suggestions remaining/i);
	});

	test("get crown entries returns list", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"crown-entries-list@e2e.test",
		);

		// Fund user and submit one entry first
		const user = await mongoose.model("User").findOne({
			email: "crown-entries-list@e2e.test",
		});
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { starsBalance: 2000 });

		await request.post("/api/draws/crown/enter", {
			data: { numbers: [2, 8, 14, 22, 33, 40], entryType: "stars" },
			...auth(token),
		});

		// Now fetch entries
		const res = await request.get("/api/draws/crown/entries", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.entries).toBeDefined();
		expect(body.entries.length).toBeGreaterThanOrEqual(1);
		expect(body.entries[0].numbers).toEqual([2, 8, 14, 22, 33, 40]);
		expect(body.entries[0].entryType).toBe("stars");
		expect(body.entries[0].drawId).toBeDefined();
	});
});
