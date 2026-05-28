import { expect, test } from "@playwright/test";
import mongoose from "mongoose";
import { clearDatabase } from "./helpers/db";
import { registerUser } from "./helpers/auth";

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

async function registerAndGetToken(
	request: Parameters<typeof registerUser>[0],
	email: string,
) {
	const body = await registerUser(request, {
		name: "Weekly Tester",
		email,
		password: "password123",
	});
	expect(body.success).toBe(true);
	return body.token as string;
}

test.describe("Weekly Draw API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("enter weekly draw with 800 stars deducts balance and creates entry", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"weekly-enter-ok@e2e.test",
		);

		// Award the user enough stars via direct DB update
		const user = await mongoose.model("User").findOne({
			email: "weekly-enter-ok@e2e.test",
		});
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

		// Verify the WeeklyEntry was created in DB
		const entry = await mongoose
			.model("WeeklyEntry")
			.findOne({ userId: user!._id });
		expect(entry).not.toBeNull();
		expect(entry!.numbers).toEqual(numbers);
		expect(entry!.round).toBe(1);

		// Verify a Transaction was created
		const tx = await mongoose
			.model("Transaction")
			.findOne({ userId: user!._id, type: "star" });
		expect(tx).not.toBeNull();
		expect(tx!.amt).toBe(-800);
	});

	test("enter weekly draw with insufficient stars returns 400", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"weekly-insufficient@e2e.test",
		);

		// Give user only 100 stars (not enough for 800 entry)
		const user = await mongoose.model("User").findOne({
			email: "weekly-insufficient@e2e.test",
		});
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { starsBalance: 100 });

		const numbers = [2, 8, 15, 27, 33, 40];
		const res = await request.post("/api/draws/weekly/enter", {
			data: { numbers },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/insufficient stars/i);

		// Verify no entry was created
		const entryCount = await mongoose
			.model("WeeklyEntry")
			.countDocuments({ userId: user!._id });
		expect(entryCount).toBe(0);
	});

	test("get current round returns an open round", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"weekly-current@e2e.test",
		);

		const res = await request.get("/api/draws/weekly/current", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.round).toBeDefined();
		expect(body.round.status).toBe("open");
		expect(body.round.round).toBe(1);
		expect(typeof body.round.drawDate).toBe("string");
		expect(typeof body.round.entryCount).toBe("number");
		expect(body.round.prizePoolETB).toBe(100000);
	});

	test("get result returns null when no completed draw exists", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"weekly-result-null@e2e.test",
		);

		const res = await request.get("/api/draws/weekly/result", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.result).toBeNull();
	});

	test("get user entries returns list of entries", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"weekly-entries@e2e.test",
		);

		// Award stars and create two entries
		const user = await mongoose.model("User").findOne({
			email: "weekly-entries@e2e.test",
		});
		await mongoose
			.model("User")
			.findByIdAndUpdate(user!._id, { starsBalance: 5000 });

		// Also create a WeeklyDraw round 1
		await mongoose.model("WeeklyDraw").create({
			round: 1,
			status: "open",
			entryCostStars: 800,
			prizePoolETB: 100000,
			drawDate: new Date(Date.now() + 7 * 86400000),
		});

		// Create two entries directly
		await mongoose.model("WeeklyEntry").insertMany([
			{
				userId: user!._id,
				round: 1,
				numbers: [1, 5, 12, 23, 34, 42],
			},
			{
				userId: user!._id,
				round: 1,
				numbers: [3, 8, 17, 25, 36, 41],
			},
		]);

		const res = await request.get("/api/draws/weekly/entries", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.entries).toBeDefined();
		expect(body.entries).toHaveLength(2);
		expect(body.entries[0].numbers).toBeDefined();
		expect(body.entries[0].round).toBe(1);
	});
});
