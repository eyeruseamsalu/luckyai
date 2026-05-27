import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { loginAndVisit } from "./auth";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Track balance snapshots per Page so assertBalanceChanged can compute the
 * difference since the last playGameAsUser call.
 */
const _balanceBeforePlay = new WeakMap<Page, number>();

/**
 * Extract the current ETB balance from the topbar balance pill.
 *
 * The pill renders as:  <span class="pill p-amber">Balance: 1,234 ETB</span>
 */
async function extractBalance(page: Page): Promise<number> {
	const pill = page.locator(".pill.p-amber").first();
	await pill.waitFor({ state: "visible", timeout: 5_000 });
	const text = await pill.textContent();
	if (!text) throw new Error("Balance pill not found on the page");
	const m = text.match(/Balance:\s*([\d,]+)\s*ETB/);
	if (!m) throw new Error(`Could not parse balance from "${text}"`);
	return parseInt(m[1].replace(/,/g, ""), 10);
}

/**
 * Read the auth token from localStorage (set by loginAndVisit).
 */
async function getAuthToken(page: Page): Promise<string | null> {
	return page.evaluate(() => localStorage.getItem("token"));
}

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Log in as a user, navigate to a game page, and play a round via the API.
 *
 * Stores a balance snapshot internally so that a subsequent call to
 * `assertBalanceChanged` on the same Page can verify the balance diff.
 *
 * @param type  - Game type: `"quick"`, `"spin"`, or `"scratch"`
 * @param credentials - Login credentials `{ email, password }`
 * @param page  - Playwright Page instance
 * @param playBody - Optional request body sent to the play endpoint (e.g.,
 *                   `{ picks: [1,2,3], cost: 5 }` for Quick)
 * @returns The JSON response from `POST /api/games/${type}/play`
 */
export async function playGameAsUser(
	type: string,
	credentials: { email: string; password: string },
	page: Page,
	playBody?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	await loginAndVisit(page, credentials);

	// Navigate to the game page and wait for its root element
	await page.goto(`/${type}`);
	await page.waitForSelector(`#p-${type}`);

	// Snapshot the balance displayed in the topbar *before* the play request
	const prev = await extractBalance(page);
	_balanceBeforePlay.set(page, prev);

	// Issue the play request with the stored auth token
	const token = await getAuthToken(page);
	const headers: Record<string, string> = {};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await page.request.post(`/api/games/${type}/play`, {
		headers,
		data: playBody,
	});
	return res.json();
}

/**
 * Assert that the balance shown in the topbar has changed by the expected
 * amount since `playGameAsUser` was last called on the same Page.
 *
 * Must be called **after** `playGameAsUser` on the same page instance.
 *
 * @param page         - Playwright Page instance
 * @param expectedDiff - Expected balance difference (positive = gain, negative
 *                       = loss).  For example `-5` means the balance dropped
 *                       by 5 ETB after a play.
 */
export async function assertBalanceChanged(
	page: Page,
	expectedDiff: number,
): Promise<void> {
	const prev = _balanceBeforePlay.get(page);
	if (prev === undefined) {
		throw new Error(
			"assertBalanceChanged() requires playGameAsUser() to be called " +
				"first on the same Page instance",
		);
	}

	// Small grace period for the UI to re-render after the API response
	await page.waitForTimeout(300);
	const current = await extractBalance(page);
	expect(current - prev).toBe(expectedDiff);
}

/**
 * Assert that a prize result is visible on the game page.
 *
 * Each game type renders results differently:
 * - **quick** / **spin**: a `.toast` element with the result text
 * - **scratch**: a prize headline in the revealed card or the latest prize
 *   banner at the top of the page
 *
 * The assertion checks that the page body contains the expected `amount`
 * somewhere in its text.  This is intentionally generic so it works across
 * all three game types without knowing their internal DOM structure.
 *
 * @param page   - Playwright Page instance
 * @param _type  - Game type (`"quick"`, `"spin"`, `"scratch"`) — reserved for
 *                 future type-specific selectors
 * @param amount - Expected prize amount (e.g. `10` for "10 ETB")
 */
export async function assertPrizeDisplayed(
	page: Page,
	_type: string,
	amount: number,
): Promise<void> {
	const body = page.locator("body");
	await expect(body).toContainText(`${amount}`, { timeout: 5_000 });
}

/**
 * Play the same game repeatedly until the daily cash cap is reached.
 *
 * The cash-cap limit is **8 paid plays** per day.  When hit the page switches
 * to "Bonus Mode" where all cash wins are converted to Stars.
 *
 * **Note:** The current backend play endpoints are stubs that do not
 * automatically advance the play counter.  Once the real game API is wired
 * this helper will work as designed.  A safety limit prevents infinite loops.
 *
 * @param page - Playwright Page instance (user must already be logged in —
 *               token present in localStorage)
 * @param type - Game type (`"quick"`, `"spin"`, `"scratch"`)
 * @returns The number of plays that were executed before the cash cap was
 *          reached or the safety limit was exceeded.
 */
export async function playUntilCashCap(
	page: Page,
	type: string,
): Promise<number> {
	const MAX_PLAYS = 20;
	const token = await getAuthToken(page);
	if (!token) {
		throw new Error(
			"playUntilCashCap() requires the user to be logged in " +
				"(token in localStorage). Call playGameAsUser or loginAndVisit first.",
		);
	}

	await page.goto(`/${type}`);
	await page.waitForSelector(`#p-${type}`);

	let count = 0;
	for (let i = 0; i < MAX_PLAYS; i++) {
		// --- Check whether the cash cap has already been hit ---
		const bodyText = await page.locator("body").textContent();
		if (!bodyText) break;

		// The UI shows "Bonus Mode" when cashCapHit === true
		if (bodyText.includes("Bonus Mode")) break;

		// Also check the explicit plays counter
		const playsMatch = bodyText.match(/Cash plays today:\s*(\d+)\/8/);
		if (playsMatch && parseInt(playsMatch[1], 10) >= 8) break;

		// --- Play one round via the API ---
		const res = await page.request.post(`/api/games/${type}/play`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		const body = await res.json();
		count++;

		// If the API response itself signals the cap, stop early
		if (body.cashCapHit) break;

		// Reload the page so the UI picks up any state change
		await page.reload();
		await page.waitForSelector(`#p-${type}`);
	}

	return count;
}
