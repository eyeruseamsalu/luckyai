import { expect, test } from "@playwright/test";
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

test.describe("Tickets API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("GET /api/tickets returns empty array for new user", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"tickets-empty@e2e.test",
		);

		const res = await request.get("/api/tickets", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.tickets).toEqual([]);
	});

	test("enter Crown Draw creates a ticket visible via GET /api/tickets", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"tickets-crown@e2e.test",
		);

		// Deposit 500 ETB for crown draw entry (cash type)
		const depositRes = await request.post("/api/wallet/deposit", {
			data: { amount: 500 },
			...auth(token),
		});
		expect(depositRes.status()).toBe(200);

		// Enter Crown Draw
		const enterRes = await request.post("/api/draws/crown/enter", {
			data: { numbers: [1, 2, 3, 4, 5, 6], entryType: "cash" },
			...auth(token),
		});
		expect(enterRes.status()).toBe(200);

		// Verify ticket appears in GET /api/tickets
		const res = await request.get("/api/tickets", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.tickets).toHaveLength(1);
		expect(body.tickets[0].drawType).toBe("crown");
		expect(body.tickets[0].entryType).toBe("cash");
	});

	test("enter Weekly Draw creates a ticket visible via GET /api/tickets", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"tickets-weekly@e2e.test",
		);

		// Credit the user 800 stars directly so weekly entry succeeds
		await mongoose.connection.db
			.collection("users")
			.updateOne(
				{ email: "tickets-weekly@e2e.test" },
				{ $set: { starsBalance: 800 } },
			);

		// Enter Weekly Draw
		const enterRes = await request.post("/api/draws/weekly/enter", {
			data: { numbers: [1, 2, 3, 4, 5, 6] },
			...auth(token),
		});
		expect(enterRes.status()).toBe(200);

		// Verify ticket appears in GET /api/tickets
		const res = await request.get("/api/tickets", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.tickets).toHaveLength(1);
		expect(body.tickets[0].drawType).toBe("weekly");
		expect(body.tickets[0].entryType).toBe("stars");
	});
});
