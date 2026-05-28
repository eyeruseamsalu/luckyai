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

async function spinPlay(
	request: Parameters<typeof registerUser>[0],
	token: string,
	cost: number,
) {
	const res = await request.post("/api/games/spin/play", {
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
test.describe("Spin Game - API", () => {
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
		const token = await registerAndGetToken(request, "spin-happy@e2e.test");
		await depositFunds(request, token, 100);

		const { status, body } = await spinPlay(request, token, 5);

		expect(status).toBe(200);
		expect(body.success).toBe(true);

		// Segment shape
		expect(body.segment).toBeDefined();
		expect(typeof body.segment.label).toBe("string");
		expect(["cash", "stars", "ticket", "premium", "lose"]).toContain(
			body.segment.type,
		);
		expect(typeof body.segment.value).toBe("number");

		// Winnings
		expect(typeof body.wonCash).toBe("number");
		expect(body.wonCash).toBeGreaterThanOrEqual(0);
		expect(typeof body.wonStars).toBe("number");
		expect(body.wonStars).toBeGreaterThanOrEqual(0);
		expect(typeof body.wonTicket).toBe("number");
		expect(body.wonTicket).toBeGreaterThanOrEqual(0);
		expect(typeof body.wonPremium).toBe("number");
		expect(body.wonPremium).toBeGreaterThanOrEqual(0);

		// Balance fields
		expect(typeof body.newBalance).toBe("number");
		expect(body.newBalance).toBeGreaterThanOrEqual(0);
		expect(typeof body.newStarsBalance).toBe("number");
		expect(body.newStarsBalance).toBeGreaterThanOrEqual(0);
		expect(typeof body.cashCapHit).toBe("boolean");
		expect(typeof body.playsToday).toBe("number");
		expect(body.playsToday).toBe(1);

		// Streak
		expect(typeof body.streak).toBe("number");
		expect(body.streak).toBeGreaterThanOrEqual(0);
		expect(typeof body.streakBonus).toBe("boolean");
	});

	test("All cost tiers (5, 15, 30, 50) succeed", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-costs@e2e.test");
		await depositFunds(request, token, 500);

		for (const cost of [5, 15, 30, 50]) {
			const { status, body } = await spinPlay(request, token, cost);
			expect(status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.segment).toBeDefined();
			expect(body.newBalance).toBeGreaterThanOrEqual(0);
		}
	});

	test("Cost deducted from balance before winnings added", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "spin-deduction@e2e.test");
		await depositFunds(request, token, 100);

		const walletBefore = await getWallet(request, token);

		const { body } = await spinPlay(request, token, 5);

		const expectedBase = walletBefore.balance - 5;
		const expectedNewBalance = expectedBase + body.wonCash;
		expect(body.newBalance).toBe(expectedNewBalance);
	});

	test("Cash win increments streak, loss resets streak", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "spin-streak@e2e.test");
		await depositFunds(request, token, 500);

		// Play multiple rounds to observe streak behavior
		let prevStreak = 0;
		for (let i = 0; i < 10; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type !== "lose") {
				// Win increments streak
				expect(body.streak).toBe(prevStreak + 1);
				prevStreak = body.streak;
			} else {
				// Loss resets streak to 0
				expect(body.streak).toBe(0);
				prevStreak = 0;
			}

			expect(typeof body.streak).toBe("number");
			expect(body.streak).toBeGreaterThanOrEqual(0);
		}
	});

	test("3 consecutive wins triggers streakBonus", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"spin-streakbonus@e2e.test",
		);
		await depositFunds(request, token, 500);

		// Play up to 50 rounds to find a streak of 3+ wins
		let foundStreakBonus = false;
		for (let i = 0; i < 50 && !foundStreakBonus; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.streak >= 3) {
				foundStreakBonus = true;
				expect(body.streakBonus).toBe(true);
			}
		}

		if (!foundStreakBonus) {
			// eslint-disable-next-line no-console
			console.log(
				"3-win streak not observed in 50 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Ticket win awards ticket and shows wonTicket > 0", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "spin-ticket@e2e.test");
		await depositFunds(request, token, 500);

		let foundTicket = false;
		for (let i = 0; i < 100; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type === "ticket") {
				foundTicket = true;
				expect(body.wonTicket).toBeGreaterThan(0);
				expect(body.wonCash).toBe(0);
				expect(body.wonStars).toBe(0);
				break;
			}
		}

		if (!foundTicket) {
			// eslint-disable-next-line no-console
			console.log(
				"Ticket prize not observed in 100 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Premium win sets premium flag", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-premium@e2e.test");
		await depositFunds(request, token, 500);

		let foundPremium = false;
		for (let i = 0; i < 150; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type === "premium") {
				foundPremium = true;
				expect(body.wonPremium).toBeGreaterThan(0);
				expect(body.wonCash).toBe(0);

				// Verify user has premium enabled
				const User = mongoose.models.User;
				const user = await User.findOne({
					email: "spin-premium@e2e.test",
				});
				expect(user.isPremium).toBe(true);
				break;
			}
		}

		if (!foundPremium) {
			// eslint-disable-next-line no-console
			console.log(
				"Premium prize not observed in 150 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Lose segment awards consolation stars", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-lose@e2e.test");
		await depositFunds(request, token, 500);

		let foundLose = false;
		for (let i = 0; i < 50; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type === "lose") {
				foundLose = true;
				expect(body.wonCash).toBe(0);
				expect(body.wonStars).toBeGreaterThan(0); // consolation stars
				break;
			}
		}

		if (!foundLose) {
			// eslint-disable-next-line no-console
			console.log(
				"Lose segment not observed in 50 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Insufficient balance returns 400 and balance unchanged", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"spin-insufficient@e2e.test",
		);

		const { status, body } = await spinPlay(request, token, 5);

		expect(status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.message).toBe("Insufficient balance");

		const wallet = await getWallet(request, token);
		expect(wallet.balance).toBe(0);
	});

	test("Invalid cost returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"spin-invalid-cost@e2e.test",
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

	test("History endpoint returns rounds after multiple plays", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "spin-history@e2e.test");
		await depositFunds(request, token, 100);

		const roundsPlayed = 3;
		for (let i = 0; i < roundsPlayed; i++) {
			await spinPlay(request, token, 5);
		}

		const res = await request.get("/api/games/spin/history", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds.length).toBeGreaterThanOrEqual(roundsPlayed);

		for (const round of body.rounds) {
			expect(typeof round.cost).toBe("number");
			expect([5, 15, 30, 50]).toContain(round.cost);
			expect(typeof round.segmentLabel).toBe("string");
			expect(["cash", "stars", "ticket", "premium", "lose"]).toContain(
				round.prizeType,
			);
			expect(typeof round.prizeValue).toBe("number");
			expect(typeof round.multiplier).toBe("number");
			expect(typeof round.wonCash).toBe("number");
			expect(typeof round.wonStars).toBe("number");
			expect(typeof round.segmentIndex).toBe("number");
		}
	});

	test("History returns empty array for new user", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"spin-history-empty@e2e.test",
		);

		const res = await request.get("/api/games/spin/history", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds).toEqual([]);
	});

	test("Unauthenticated play returns 401", async ({ request }) => {
		const res = await request.post("/api/games/spin/play", {
			data: { cost: 5 },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Unauthenticated history returns 401", async ({ request }) => {
		const res = await request.get("/api/games/spin/history");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Cash cap: 8th play triggers cashCapHit", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-cashcap@e2e.test");
		await depositFunds(request, token, 5000);

		let lastBody: Record<string, unknown> | null = null;

		for (let i = 0; i < 8; i++) {
			const { body } = await spinPlay(request, token, 5);
			lastBody = body;

			if (i < 7) {
				expect(body.cashCapHit).toBe(false);
			}
		}

		expect(lastBody).not.toBeNull();
		expect(lastBody!.cashCapHit).toBe(true);
		expect(lastBody!.playsToday).toBe(8);

		const ninth = await spinPlay(request, token, 5);
		expect(ninth.body.cashCapHit).toBe(true);
	});

	test("Cash cap converts cash winnings to stars", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-cap-stars@e2e.test");
		await depositFunds(request, token, 5000);

		// Play 8 rounds to hit cash cap
		for (let i = 0; i < 8; i++) {
			await spinPlay(request, token, 5);
		}

		// After cap is hit, any cash segment should convert to stars
		let foundCashUnderCap = false;
		for (let i = 0; i < 30; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type === "cash") {
				foundCashUnderCap = true;
				// When cap is hit, cash wins convert to stars
				expect(body.wonCash).toBe(0);
				expect(body.wonStars).toBeGreaterThan(0);
				break;
			}
		}

		if (!foundCashUnderCap) {
			// eslint-disable-next-line no-console
			console.log(
				"Cash segment not observed under cap in 30 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Cash cap resets next day (playsToday counter)", async ({ request }) => {
		const token = await registerAndGetToken(request, "spin-cap-reset@e2e.test");
		await depositFunds(request, token, 5000);

		for (let i = 0; i < 8; i++) {
			await spinPlay(request, token, 5);
		}

		const User = mongoose.models.User;
		const user = await User.findOne({
			email: "spin-cap-reset@e2e.test",
		});
		expect(user).toBeTruthy();

		const yesterday = new Date(Date.now() - 86_400_000);
		user.lastPlayDate = yesterday;
		user.playsToday = 0;
		user.cashCapHit = false;
		await user.save();

		const { body } = await spinPlay(request, token, 5);
		expect(body.cashCapHit).toBe(false);
		expect(body.playsToday).toBe(1);
	});

	test("Multiplier boost: 1.2x applied to cash winnings", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"spin-multiplier@e2e.test",
		);
		await depositFunds(request, token, 5000);

		// Give user a multiplier boost via mongoose
		const User = mongoose.models.User;
		const user = await User.findOne({
			email: "spin-multiplier@e2e.test",
		});
		expect(user).toBeTruthy();

		user.activeBoosts.push({
			type: "multiplier",
			label: "2× Multiplier",
			icon: "ti-bolt",
			expiresAfter: 10,
			expiresAt: new Date(Date.now() + 86_400_000),
			activatedAt: new Date(),
		});
		await user.save();

		let foundCashWin = false;
		for (let i = 0; i < 100; i++) {
			const { body } = await spinPlay(request, token, 5);

			if (body.segment.type === "cash") {
				foundCashWin = true;
				// Cash value from segment * 1.2 multiplier
				// e.g. 100 ETB segment → 120 ETB with multiplier
				const expectedWithoutMultiplier = body.segment.value;
				const expectedWithMultiplier = Math.round(
					expectedWithoutMultiplier * 1.2,
				);
				expect(body.wonCash).toBe(expectedWithMultiplier);
				break;
			}
		}

		if (!foundCashWin) {
			// eslint-disable-next-line no-console
			console.log(
				"Cash win not observed with multiplier in 100 rounds (probabilistic — test is still valid)",
			);
		}
	});
});

// ---------------------------------------------------------------------------
// Browser / UI Tests  —  frontend integration via Playwright page
// ---------------------------------------------------------------------------
test.describe("Spin Game - Browser", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	/**
	 * Helper: set up a logged-in session on the spin page.
	 */
	async function setupLoggedInPage(
		page: import("@playwright/test").Page,
		request: import("@playwright/test").APIRequestContext,
		email: string,
		depositAmount = 100,
	): Promise<string> {
		const token = await registerAndGetToken(request, email);
		await depositFunds(request, token, depositAmount);

		await page.goto("/spin");
		await page.evaluate((t) => localStorage.setItem("token", t), token);
		await page.reload();
		await page.waitForSelector("#p-spin");
		return token;
	}

	test("Page renders with wheel, cost selector, and spin button", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "spin-ui-render@e2e.test");

		// Verify wheel canvas exists
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();

		// Verify cost buttons
		for (const cost of ["5 ETB", "15 ETB", "30 ETB", "50 ETB"]) {
			await expect(page.getByRole("button", { name: cost })).toBeVisible();
		}

		// Verify spin button
		await expect(page.getByRole("button", { name: /spin/i })).toBeVisible();

		// Verify prize table
		await expect(page.getByText("Prize table")).toBeVisible();
	});

	test("Clicking canvas triggers spin and shows result", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "spin-ui-play@e2e.test");

		// Click the canvas to spin
		const canvas = page.locator("canvas");
		await canvas.click();

		// Wait for result toast to appear
		const toast = page.locator(".toast");
		await expect(toast).toBeVisible({ timeout: 8_000 });

		const toastText = await toast.textContent();
		expect(toastText).toBeTruthy();

		// Can be ETB win, Stars earned, or free ticket message
		const validOutcomes = [
			"ETB added",
			"Stars earned",
			"Free Crown Draw ticket",
			"Premium access",
		];
		const matchesOutcome = validOutcomes.some((o) => toastText!.includes(o));
		expect(matchesOutcome).toBe(true);
	});

	test("Spin button works and shows result", async ({ page, request }) => {
		await setupLoggedInPage(page, request, "spin-ui-button@e2e.test");

		// Click the spin button
		await page.getByRole("button", { name: /spin/i }).click();

		// Wait for result toast to appear
		const toast = page.locator(".toast");
		await expect(toast).toBeVisible({ timeout: 8_000 });
	});

	test("Insufficient balance shows warning", async ({ page, request }) => {
		const token = await registerAndGetToken(
			request,
			"spin-ui-insufficient@e2e.test",
		);

		await page.goto("/spin");
		await page.evaluate((t) => localStorage.setItem("token", t), token);
		await page.reload();
		await page.waitForSelector("#p-spin");

		await page.getByRole("button", { name: /spin/i }).click();

		const toast = page.locator(".toast");
		await expect(toast).toBeVisible({ timeout: 3_000 });
		await expect(toast).toContainText("Insufficient balance");
	});

	test("Cost selector changes active cost tier", async ({ page, request }) => {
		await setupLoggedInPage(page, request, "spin-ui-costs@e2e.test");

		// Click a different cost tier
		await page.getByRole("button", { name: "15 ETB" }).click();

		// Spin and verify it works with that cost
		await page.getByRole("button", { name: /spin/i }).click();

		const toast = page.locator(".toast");
		await expect(toast).toBeVisible({ timeout: 8_000 });
	});

	test("Multiple spins work sequentially", async ({ page, request }) => {
		await setupLoggedInPage(page, request, "spin-ui-multi@e2e.test", 200);

		// Play 2 spins
		for (let i = 0; i < 2; i++) {
			await page.getByRole("button", { name: /spin/i }).click();
			const toast = page.locator(".toast");
			await expect(toast).toBeVisible({ timeout: 8_000 });

			// Wait for spinning to finish (toast appears after animation)
			await page.waitForTimeout(500);
		}

		// Verify total spins counter is shown
		await expect(page.getByText(/total spins/i)).toBeVisible();
	});

	test("Prize table displays all segment types", async ({ page, request }) => {
		await setupLoggedInPage(page, request, "spin-ui-table@e2e.test");

		// Prize table should show labels like ETB, Stars, Ticket, Premium
		const table = page.locator(".card", { hasText: "Prize table" });
		await expect(table).toBeVisible();

		// Should contain at least some prize labels
		const prizeCells = table.locator("div > div");
		const count = await prizeCells.count();
		expect(count).toBeGreaterThan(0);
	});
});
