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
		name: "E2E Tester",
		email,
		password: "password123",
	});
	expect(body.success).toBe(true);
	return body.token as string;
}

async function setStarsBalance(
	email: string,
	amount: number,
) {
	const User = mongoose.models.User;
	await User.findOneAndUpdate({ email }, { starsBalance: amount });
}

async function getBoost(email: string) {
	const User = mongoose.models.User;
	return User.findOne({ email });
}

// ---------------------------------------------------------------------------
// Boost API
// ---------------------------------------------------------------------------
test.describe("Boost API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("activate multiplier boost adds active boost and deducts stars", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"boost-activate@e2e.test",
		);
		await setStarsBalance("boost-activate@e2e.test", 500);

		const res = await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.boost).toBeDefined();
		expect(body.boost.type).toBe("multiplier");
		expect(body.boost.label).toBe("2x Stars");
		expect(body.boost.expiresAfter).toBe(5);
		expect(body.newStarsBalance).toBe(350);

		const user = await getBoost("boost-activate@e2e.test");
		expect(user.activeBoosts).toHaveLength(1);
		expect(user.activeBoosts[0].type).toBe("multiplier");
		expect(user.activeBoosts[0].expiresAfter).toBe(5);
	});

	test("activate lossProtection boost works correctly", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"boost-loss@e2e.test",
		);
		await setStarsBalance("boost-loss@e2e.test", 500);

		const res = await request.post("/api/boosts/activate", {
			data: { type: "lossProtection" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.boost.type).toBe("lossProtection");
		expect(body.boost.label).toBe("Loss Protection");
		expect(body.boost.expiresAfter).toBe(3);
		expect(body.newStarsBalance).toBe(420);
	});

	test("activate premiumDay boost sets isPremium and premiumExpiresAt", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"boost-premium@e2e.test",
		);
		await setStarsBalance("boost-premium@e2e.test", 500);

		const res = await request.post("/api/boosts/activate", {
			data: { type: "premiumDay" },
			...auth(token),
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.boost.type).toBe("premiumDay");
		expect(body.boost.label).toBe("Premium Day");
		expect(body.boost.expiresAfter).toBe(1);
		expect(body.newStarsBalance).toBe(300);

		const user = await getBoost("boost-premium@e2e.test");
		expect(user.isPremium).toBe(true);
		expect(user.premiumExpiresAt).toBeTruthy();
		expect(new Date(user.premiumExpiresAt).getTime()).toBeGreaterThan(
			Date.now(),
		);
	});

	test("activate with insufficient stars returns 400", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"boost-insufficient@e2e.test",
		);
		await setStarsBalance("boost-insufficient@e2e.test", 100);

		const res = await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("Insufficient stars");

		const user = await getBoost("boost-insufficient@e2e.test");
		expect(user.activeBoosts ?? []).toHaveLength(0);
	});

	test("activate duplicate boost returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-duplicate@e2e.test",
		);
		await setStarsBalance("boost-duplicate@e2e.test", 500);

		const first = await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(first.status()).toBe(200);

		const second = await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(second.status()).toBe(400);

		const body = await second.json();
		expect(body.success).toBe(false);
		expect(body.message).toBe("Boost already active");
	});

	test("activate with invalid type returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-invalid-type@e2e.test",
		);

		const res = await request.post("/api/boosts/activate", {
			data: { type: "invalidBoost" },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/invalid boost type/i);
	});

	test("deactivate boost removes it", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-deactivate@e2e.test",
		);
		await setStarsBalance("boost-deactivate@e2e.test", 500);

		await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});

		const deactRes = await request.post("/api/boosts/deactivate", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(deactRes.status()).toBe(200);

		const deactBody = await deactRes.json();
		expect(deactBody.success).toBe(true);

		const user = await getBoost("boost-deactivate@e2e.test");
		expect(
			user.activeBoosts?.filter((b: any) => b.type === "multiplier"),
		).toHaveLength(0);
	});

	test("list returns active boosts", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-list@e2e.test",
		);
		await setStarsBalance("boost-list@e2e.test", 500);

		const emptyRes = await request.get("/api/boosts", auth(token));
		expect(emptyRes.status()).toBe(200);
		let body = await emptyRes.json();
		expect(body.success).toBe(true);
		expect(body.boosts).toEqual([]);

		await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});

		const listRes = await request.get("/api/boosts", auth(token));
		expect(listRes.status()).toBe(200);
		body = await listRes.json();
		expect(body.success).toBe(true);
		expect(body.boosts).toHaveLength(1);
		expect(body.boosts[0].type).toBe("multiplier");
	});

	test("consume boost decrements expiresAfter", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-consume-dec@e2e.test",
		);
		await setStarsBalance("boost-consume-dec@e2e.test", 500);

		await request.post("/api/boosts/activate", {
			data: { type: "multiplier" },
			...auth(token),
		});

		const consRes = await request.post("/api/boosts/consume", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(consRes.status()).toBe(200);

		const body = await consRes.json();
		expect(body.success).toBe(true);
		expect(body.consumed).toBe(true);
		expect(body.remaining).toBe(4);

		const user = await getBoost("boost-consume-dec@e2e.test");
		const boost = user.activeBoosts.find((b: any) => b.type === "multiplier");
		expect(boost.expiresAfter).toBe(4);
	});

	test("consume boost until 0 removes it", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-consume-zero@e2e.test",
		);
		await setStarsBalance("boost-consume-zero@e2e.test", 500);

		await request.post("/api/boosts/activate", {
			data: { type: "lossProtection" },
			...auth(token),
		});

		for (let i = 0; i < 3; i++) {
			const res = await request.post("/api/boosts/consume", {
				data: { type: "lossProtection" },
				...auth(token),
			});
			expect(res.status()).toBe(200);
		}

		const user = await getBoost("boost-consume-zero@e2e.test");
		const boost = user.activeBoosts?.find(
			(b: any) => b.type === "lossProtection",
		);
		expect(boost).toBeUndefined();
	});

	test("consume non-existent boost returns 404", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"boost-consume-404@e2e.test",
		);

		const res = await request.post("/api/boosts/consume", {
			data: { type: "multiplier" },
			...auth(token),
		});
		expect(res.status()).toBe(404);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/boost not found/i);
	});

	test("unauthenticated requests return 401", async ({ request }) => {
		for (const endpoint of [
			{ method: "post" as const, path: "/api/boosts/activate", data: { type: "multiplier" } },
			{ method: "post" as const, path: "/api/boosts/deactivate", data: { type: "multiplier" } },
			{ method: "get" as const, path: "/api/boosts" },
			{ method: "post" as const, path: "/api/boosts/consume", data: { type: "multiplier" } },
		]) {
			const res = await request[method](endpoint.path, {
				...(endpoint.data && { data: endpoint.data }),
			});
			expect(res.status()).toBe(401);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.message).toMatch(/authentication required/i);
		}
	});
});
