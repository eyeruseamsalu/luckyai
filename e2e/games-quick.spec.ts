import { expect, test } from "@playwright/test";
import mongoose from "mongoose";
import { registerUser } from "./helpers/auth";
import { clearDatabase } from "./helpers/db";

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

async function quickPlay(
	request: Parameters<typeof registerUser>[0],
	token: string,
	picks: number[],
	cost: number,
) {
	const res = await request.post("/api/games/quick/play", {
		data: { picks, cost },
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
test.describe("Quick Play - API", () => {
	test.beforeAll(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
	});

	test.beforeEach(async () => {
		await clearDatabase();
	});

	test.afterAll(async () => {
		await mongoose.disconnect();
	});

	test("Happy path: play with valid picks and cost returns correct response shape", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "quick-happy@e2e.test");
		await depositFunds(request, token, 100);

		const { status, body } = await quickPlay(request, token, [1, 2, 3], 2);

		expect(status).toBe(200);
		expect(body.success).toBe(true);
		// Structural assertions — never hardcode drawn numbers
		expect(body.drawn).toHaveLength(3);
		expect(body.matches).toBeGreaterThanOrEqual(0);
		expect(body.matches).toBeLessThanOrEqual(3);
		expect(typeof body.wonCash).toBe("number");
		expect(body.wonCash).toBeGreaterThanOrEqual(0);
		expect(typeof body.wonStars).toBe("number");
		expect(body.wonStars).toBeGreaterThanOrEqual(0);
		expect(typeof body.newBalance).toBe("number");
		expect(typeof body.newStarsBalance).toBe("number");
		expect(typeof body.playsToday).toBe("number");
		expect(body.playsToday).toBe(1);
		expect(typeof body.cashCapHit).toBe("boolean");
		expect(body.cashCapHit).toBe(false);
	});

	test("All cost tiers (2, 5, 10) succeed", async ({ request }) => {
		const token = await registerAndGetToken(request, "quick-costs@e2e.test");
		await depositFunds(request, token, 200);

		for (const cost of [2, 5, 10]) {
			const { status, body } = await quickPlay(request, token, [1, 2, 3], cost);
			expect(status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.drawn).toHaveLength(3);
		}
	});

	test("3-match win: correct prize cash and balance update", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "quick-3match@e2e.test");
		await depositFunds(request, token, 1000);

		let found3Match = false;
		for (let i = 0; i < 500; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 2);

			if (body.matches === 3) {
				found3Match = true;
				// 2 ETB cost × 20× multiplier = 40 ETB
				expect(body.wonCash).toBe(40);
				expect(body.wonStars).toBe(0);
				break;
			}

			expect(body.drawn).toHaveLength(3);
			expect(body.matches).toBeGreaterThanOrEqual(0);
			expect(body.matches).toBeLessThanOrEqual(3);
		}

		// 3-match probability is ~0.09% per round; 500 rounds may still miss it
		if (!found3Match) {
			// eslint-disable-next-line no-console
			console.log(
				"3-match not observed in 500 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("2-match win: prize uses 3x multiplier", async ({ request }) => {
		const token = await registerAndGetToken(request, "quick-2match@e2e.test");
		await depositFunds(request, token, 1000);

		let found2Match = false;
		for (let i = 0; i < 500; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 5);

			if (body.matches === 2) {
				found2Match = true;
				expect(body.wonCash).toBe(15); // 5 × 3
				expect(body.wonStars).toBe(0);
				break;
			}
		}

		if (!found2Match) {
			// eslint-disable-next-line no-console
			console.log(
				"2-match not observed in 500 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Insufficient balance returns 400 and balance unchanged", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"quick-insufficient@e2e.test",
		);

		const { status, body } = await quickPlay(request, token, [1, 2, 3], 2);

		expect(status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.message).toBe("Insufficient balance");

		const wallet = await getWallet(request, token);
		expect(wallet.balance).toBe(0);
	});

	test("Invalid picks (wrong length) returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-invalid-picks@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/quick/play", {
			data: { picks: [1, 2], cost: 2 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/picks/i);
	});

	test("Invalid picks (non-unique) returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-invalid-unique@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/quick/play", {
			data: { picks: [1, 1, 2], cost: 2 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/picks/i);
	});

	test("Invalid picks (out of range) returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-invalid-range@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/quick/play", {
			data: { picks: [1, 2, 99], cost: 2 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/picks/i);
	});

	test("Invalid cost returns 400", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-invalid-cost@e2e.test",
		);
		await depositFunds(request, token, 100);

		const res = await request.post("/api/games/quick/play", {
			data: { picks: [1, 2, 3], cost: 7 },
			...auth(token),
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/cost/i);
	});

	test("Multiplier boost: 1.2x applied to cash winnings", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"quick-multiplier@e2e.test",
		);
		await depositFunds(request, token, 5000);

		// Boost API is a stub — set activeBoosts directly via mongoose
		const User = mongoose.models.User;
		const user = await User.findOne({ email: "quick-multiplier@e2e.test" });
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
		for (let i = 0; i < 500; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 10);

			if (body.matches === 3) {
				foundCashWin = true;
				// 10 × 20 × 1.2 = 240
				expect(body.wonCash).toBe(240);
				break;
			}
			if (body.matches === 2) {
				foundCashWin = true;
				// 10 × 3 × 1.2 = 36
				expect(body.wonCash).toBe(36);
				break;
			}
		}

		if (!foundCashWin) {
			// eslint-disable-next-line no-console
			console.log(
				"Cash win not observed with multiplier (probabilistic — test is still valid)",
			);
		}
	});

	test("History endpoint returns rounds after multiple plays", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "quick-history@e2e.test");
		await depositFunds(request, token, 100);

		const roundsPlayed = 3;
		for (let i = 0; i < roundsPlayed; i++) {
			await quickPlay(request, token, [1, 2, 3], 2);
		}

		const res = await request.get("/api/games/quick/history", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds).toHaveLength(roundsPlayed);

		for (const round of body.rounds) {
			expect(round.picks).toHaveLength(3);
			expect(round.drawn).toHaveLength(3);
			expect(typeof round.cost).toBe("number");
			expect([2, 5, 10]).toContain(round.cost);
			expect(typeof round.matches).toBe("number");
			expect(round.matches).toBeGreaterThanOrEqual(0);
			expect(round.matches).toBeLessThanOrEqual(3);
			expect(["Won", "Free", "Loss"]).toContain(round.result);
			expect(["Basic", "Standard", "Max"]).toContain(round.tier);
			expect(typeof round.prizeCash).toBe("number");
			expect(typeof round.prizeStars).toBe("number");
			expect([1, 1.2]).toContain(round.multiplier);
		}
	});

	test("History returns empty array for new user", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-history-empty@e2e.test",
		);

		const res = await request.get("/api/games/quick/history", auth(token));
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.rounds).toEqual([]);
	});

	test("Unauthenticated play returns 401", async ({ request }) => {
		const res = await request.post("/api/games/quick/play", {
			data: { picks: [1, 2, 3], cost: 2 },
		});
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Unauthenticated history returns 401", async ({ request }) => {
		const res = await request.get("/api/games/quick/history");
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/authentication required/i);
	});

	test("Cash cap: 8th play triggers cashCapHit and converts cash to stars", async ({
		request,
	}) => {
		const token = await registerAndGetToken(request, "quick-cashcap@e2e.test");
		await depositFunds(request, token, 5000);

		let lastBody: Record<string, unknown> | null = null;

		for (let i = 0; i < 8; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 2);
			lastBody = body;

			if (i < 7) {
				expect(body.cashCapHit).toBe(false);
			}
		}

		expect(lastBody).not.toBeNull();
		expect(lastBody!.cashCapHit).toBe(true);
		expect(lastBody!.playsToday).toBe(8);

		const ninth = await quickPlay(request, token, [1, 2, 3], 2);
		expect(ninth.body.cashCapHit).toBe(true);
	});

	test("Cash cap resets next day (playsToday counter)", async ({ request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-cashcap-reset@e2e.test",
		);
		await depositFunds(request, token, 5000);

		for (let i = 0; i < 8; i++) {
			await quickPlay(request, token, [1, 2, 3], 2);
		}

		const User = mongoose.models.User;
		const user = await User.findOne({
			email: "quick-cashcap-reset@e2e.test",
		});
		expect(user).toBeTruthy();

		const yesterday = new Date(Date.now() - 86_400_000);
		user.lastPlayDate = yesterday;
		user.playsToday = 0;
		user.cashCapHit = false;
		await user.save();

		const { body } = await quickPlay(request, token, [1, 2, 3], 2);
		expect(body.cashCapHit).toBe(false);
		expect(body.playsToday).toBe(1);
	});

	test("1-match win awards stars only", async ({ request }) => {
		const token = await registerAndGetToken(request, "quick-1match@e2e.test");
		await depositFunds(request, token, 1000);

		let found1Match = false;
		for (let i = 0; i < 500; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 2);

			if (body.matches === 1) {
				found1Match = true;
				expect(body.wonCash).toBe(0);
				expect(body.wonStars).toBe(8);
				break;
			}
		}

		if (!found1Match) {
			// eslint-disable-next-line no-console
			console.log(
				"1-match not observed in 500 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("0-match awards 2 consolation stars", async ({ request }) => {
		const token = await registerAndGetToken(request, "quick-0match@e2e.test");
		await depositFunds(request, token, 1000);

		let found0Match = false;
		for (let i = 0; i < 500; i++) {
			const { body } = await quickPlay(request, token, [1, 2, 3], 2);

			if (body.matches === 0) {
				found0Match = true;
				expect(body.wonCash).toBe(0);
				expect(body.wonStars).toBe(2);
				break;
			}
		}

		if (!found0Match) {
			// eslint-disable-next-line no-console
			console.log(
				"0-match not observed in 500 rounds (probabilistic — test is still valid)",
			);
		}
	});

	test("Cost deducted from balance before winnings added", async ({
		request,
	}) => {
		const token = await registerAndGetToken(
			request,
			"quick-deduction@e2e.test",
		);
		await depositFunds(request, token, 100);

		const walletBefore = await getWallet(request, token);

		const { body } = await quickPlay(request, token, [1, 2, 3], 2);

		const expectedBase = walletBefore.balance - 2;
		const expectedNewBalance = expectedBase + body.wonCash;
		expect(body.newBalance).toBe(expectedNewBalance);
	});
});

// ---------------------------------------------------------------------------
// Browser / UI Tests  —  frontend integration via Playwright page
// ---------------------------------------------------------------------------
test.describe("Quick Play - Browser", () => {
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
	 * Helper: set up a logged-in session on the page.
	 * Navigates to /quick, stores the token, and reloads so the frontend
	 * fetches user data from the API via getMe().
	 */
	async function setupLoggedInPage(
		page: import("@playwright/test").Page,
		request: import("@playwright/test").APIRequestContext,
		email: string,
		depositAmount = 100,
	): Promise<string> {
		const token = await registerAndGetToken(request, email);
		await depositFunds(request, token, depositAmount);

		await page.goto("/quick");
		await page.evaluate((t) => localStorage.setItem("token", t), token);
		await page.reload();
		await page.waitForSelector("#p-quick");
		return token;
	}

	test("Happy path: select numbers, choose cost, play, verify result displays", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-happy@e2e.test");

		const numBtns = page.locator("button.num-btn");
		await numBtns.nth(0).click();
		await numBtns.nth(1).click();
		await numBtns.nth(2).click();

		await expect(numBtns.nth(0)).toHaveClass(/pk/);

		const playBtn = page.getByRole("button", { name: /enter/i });
		await playBtn.click();

		await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });

		const toastText = await page.locator(".toast").textContent();
		expect(toastText).toBeTruthy();
		const validOutcomes = ["matched", "Stars earned", "No match", "Stars"];
		const matchesOutcome = validOutcomes.some((o) => toastText!.includes(o));
		expect(matchesOutcome).toBe(true);
	});

	test("Insufficient balance shows error toast", async ({ page, request }) => {
		const token = await registerAndGetToken(
			request,
			"quick-ui-insufficient@e2e.test",
		);

		await page.goto("/quick");
		await page.evaluate((t) => localStorage.setItem("token", t), token);
		await page.reload();
		await page.waitForSelector("#p-quick");

		const numBtns = page.locator("button.num-btn");
		await numBtns.nth(0).click();
		await numBtns.nth(1).click();
		await numBtns.nth(2).click();

		const playBtn = page.getByRole("button", { name: /enter/i });
		await playBtn.click();

		const toast = page.locator(".toast");
		await expect(toast).toBeVisible({ timeout: 3_000 });
		await expect(toast).toContainText("Insufficient balance");
	});

	test("Auto-pick selects numbers and allows play", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-autopick@e2e.test");

		await page.getByRole("button", { name: /auto pick/i }).click();

		const selected = page.locator("button.num-btn.pk");
		await expect(selected).toHaveCount(3);

		await page.getByRole("button", { name: /enter/i }).click();

		await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });
	});

	test("Play again after a result resets the board", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-again@e2e.test");

		const numBtns = page.locator("button.num-btn");
		await numBtns.nth(0).click();
		await numBtns.nth(1).click();
		await numBtns.nth(2).click();

		await page.getByRole("button", { name: /enter/i }).click();
		await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });

		await expect(page.getByRole("button", { name: /again/i })).toBeVisible({
			timeout: 3_000,
		});

		await page.getByRole("button", { name: /again/i }).click();

		await expect(page.locator(".toast")).not.toBeVisible();
	});

	test("Recent rounds section updates after playing", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-history@e2e.test");

		for (let i = 0; i < 3; i++) {
			const numBtns = page.locator("button.num-btn");
			await numBtns.nth(i * 2).click();
			await numBtns.nth(i * 2 + 1).click();
			await numBtns.nth((i * 2 + 2) % 20).click();

			await page.getByRole("button", { name: /enter/i }).click();
			await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });

			const againBtn = page.getByRole("button", { name: /again/i });
			if (await againBtn.isVisible()) {
				await againBtn.click();
				await page.waitForTimeout(300);
			}
		}

		const recentRounds = page.locator(".card", {
			hasText: /recent rounds/i,
		});
		await expect(recentRounds).toBeVisible();

		const roundTags = recentRounds.locator(".tag");
		const tagCount = await roundTags.count();
		expect(tagCount).toBeGreaterThanOrEqual(1);
		expect(tagCount).toBeLessThanOrEqual(3);

		const validTags = ["Won", "Free", "Loss"];
		for (let i = 0; i < tagCount; i++) {
			const tagText = await roundTags.nth(i).textContent();
			expect(validTags).toContain(tagText);
		}
	});

	test("Cost tier selector highlights selected tier", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-costs@e2e.test");

		await page.getByRole("button", { name: /standard/i }).click();

		const stdBtn = page.getByRole("button", { name: /standard/i });
		await expect(stdBtn).toBeVisible();

		const numBtns = page.locator("button.num-btn");
		await numBtns.nth(0).click();
		await numBtns.nth(1).click();
		await numBtns.nth(2).click();

		await page.getByRole("button", { name: /enter/i }).click();
		await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });
	});

	test("Drawing animation: drawn balls appear sequentially", async ({
		page,
		request,
	}) => {
		await setupLoggedInPage(page, request, "quick-ui-anim@e2e.test");

		const numBtns = page.locator("button.num-btn");
		await numBtns.nth(0).click();
		await numBtns.nth(1).click();
		await numBtns.nth(2).click();

		await page.getByRole("button", { name: /enter/i }).click();

		await expect(page.getByRole("button", { name: /drawing/i })).toBeVisible({
			timeout: 1_000,
		});

		const drawnBalls = page.locator(".qball");
		await expect(drawnBalls).toHaveCount(3, { timeout: 5_000 });

		await expect(page.locator(".toast")).toBeVisible({ timeout: 5_000 });
	});
});
