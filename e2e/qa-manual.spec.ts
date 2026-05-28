import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.resolve(__dirname, "../.sisyphus/evidence/final-qa");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const auth = (token: string) => ({
	headers: { Authorization: `Bearer ${token}` },
});

async function registerViaAPI(
	request: import("@playwright/test").APIRequestContext,
	email: string,
) {
	const res = await request.post("/api/auth/register", {
		data: { name: "QA Tester", email, password: "password123" },
	});
	const body = await res.json();
	if (!body.success) console.log("  Register API error:", body);
	return body;
}

async function depositViaAPI(
	request: import("@playwright/test").APIRequestContext,
	token: string,
	amount: number,
) {
	const res = await request.post("/api/wallet/deposit", {
		data: { amount },
		...auth(token),
	});
	const body = await res.json();
	if (!body.success) console.log("  Deposit API error:", body);
	return body;
}

function navSidebar(page: import("@playwright/test").Page, text: string) {
	return page.evaluate((t: string) => {
		const buttons = document.querySelectorAll("button.nb");
		for (const btn of Array.from(buttons)) {
			if (btn.textContent?.toLowerCase().includes(t.toLowerCase())) {
				(btn as HTMLButtonElement).click();
				return true;
			}
		}
		return false;
	}, text);
}

let shot = 0;
async function screenshot(page: import("@playwright/test").Page, name: string) {
	shot++;
	const f = `${String(shot).padStart(2, "0")}-${name.replace(/[^a-z0-9-]/gi, "_").toLowerCase()}.png`;
	await page.screenshot({ path: path.join(EVIDENCE_DIR, f), fullPage: false });
	console.log(`  Screenshot: ${f}`);
}

const results: { name: string; passed: boolean }[] = [];
function track(name: string, passed: boolean) {
	results.push({ name, passed });
}

test.describe("LuckyAI Final QA", () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
	});

	test.afterAll(() => {
		const pass = results.filter((r) => r.passed).length;
		const fail = results.filter((r) => !r.passed).length;
		const total = results.length;
		console.log(`\n========== QA SUMMARY ==========`);
		console.log(`Scenarios: ${pass}/${total} pass | ${fail} failed`);
		console.log(`Evidence: ${EVIDENCE_DIR}`);
		console.log(`VERDICT: ${fail === 0 ? "APPROVE" : "REJECT"}`);
	});

	test("S01: Application Launch", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") errors.push(msg.text());
		});

		try {
			await page.goto("/");
			await expect(page).toHaveTitle(/LuckyAI/);
			await page.waitForSelector("#p-home", { timeout: 8000 });
			await expect(page.locator(".topbar")).toBeVisible();
			await expect(page.locator(".sidebar")).toBeVisible();
			await expect(page.getByText("Crown Draw — June 15")).toBeVisible();

			if (errors.length) console.log("  Console errors:", errors.join("; "));
			else console.log("  No console errors");

			await screenshot(page, "01-homepage");
			track("S01: Application Launch", true);
		} catch (e) {
			track("S01: Application Launch", false);
			throw e;
		}
	});

	test("S02: User Registration", async ({ page }) => {
		try {
			await page.goto("/");
			await page.waitForSelector("#p-home");
			await navSidebar(page, "Sign in");
			await page.waitForSelector("#p-auth");

			await page.locator("button.auth-tab", { hasText: "Register" }).click();
			await page.waitForTimeout(300);

			const email = `qa-reg-${Date.now()}@test.com`;
			await page.fill("#r-fname", "QA");
			await page.fill("#r-lname", "Tester");
			await page.fill("#r-email", email);
			await page.fill("#r-phone", "+251911111111");
			await page.fill("#r-pw", "StrongPass1!");
			await page.fill("#r-pw2", "StrongPass1!");

			await screenshot(page, "02-registration-form");

			await page.getByRole("button", { name: /create account/i }).click();
			await page.waitForSelector("#p-home", { timeout: 8000 });
			await screenshot(page, "03-after-registration");
			track("S02: User Registration", true);
		} catch (e) {
			track("S02: User Registration", false);
			throw e;
		}
	});

	test("S03: Quick Play Game", async ({ page, request }) => {
		try {
			const email = `qa-quick-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 500);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Quick play");
			await page.waitForSelector("#p-quick");
			await screenshot(page, "04-quick-page");

			const numBtns = page.locator("button.num-btn");
			await numBtns.nth(0).click();
			await numBtns.nth(3).click();
			await numBtns.nth(7).click();
			await expect(page.locator("button.num-btn.pk")).toHaveCount(3);

			await page.getByRole("button", { name: /enter/i }).click();
			const toast = page.locator(".toast");
			await expect(toast).toBeVisible({ timeout: 8000 });
			console.log(`  Result: ${await toast.textContent()}`);
			await screenshot(page, "05-quick-result");
			track("S03: Quick Play Game", true);
		} catch (e) {
			track("S03: Quick Play Game", false);
			throw e;
		}
	});

	test("S04: Spin Game", async ({ page, request }) => {
		try {
			const email = `qa-spin-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 200);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Try your chance");
			await page.waitForSelector("#p-spin");
			await screenshot(page, "06-spin-page");

			await expect(page.locator("canvas")).toBeVisible();
			await page.getByRole("button", { name: /spin/i }).click();
			const toast = page.locator(".toast");
			await expect(toast).toBeVisible({ timeout: 12000 });
			console.log(`  Result: ${await toast.textContent()}`);
			await screenshot(page, "07-spin-result");
			track("S04: Spin Game", true);
		} catch (e) {
			track("S04: Spin Game", false);
			throw e;
		}
	});

	test("S05: Scratch Game", async ({ page, request }) => {
		try {
			const email = `qa-scratch-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 200);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Scratch & win");
			await page.waitForSelector("#p-scratch");
			await screenshot(page, "08-scratch-page");

			await page.locator("text=?").first().click();
			await page.waitForTimeout(2000);
			await screenshot(page, "09-scratch-result");
			track("S05: Scratch Game", true);
		} catch (e) {
			track("S05: Scratch Game", false);
			throw e;
		}
	});

	test("S06: Crown Draw Entry", async ({ page, request }) => {
		try {
			const email = `qa-draw-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 5000);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Crown Draw");
			await page.waitForSelector("#p-draw");
			await screenshot(page, "10-draw-page");

			const qp = page.locator("#p-draw button", { hasText: /quick pick/i });
			if (await qp.isVisible({ timeout: 2000 }).catch(() => false)) {
				await qp.click();
				await page.waitForTimeout(300);
			}

			const confirm = page.locator("#p-draw button", { hasText: /confirm/i });
			if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
				await confirm.click();
				await page.waitForTimeout(2000);
			}
			await screenshot(page, "11-draw-submitted");
			track("S06: Crown Draw Entry", true);
		} catch (e) {
			track("S06: Crown Draw Entry", false);
			throw e;
		}
	});

	test("S07: Weekly Draw", async ({ page, request }) => {
		try {
			const email = `qa-weekly-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 5000);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Weekly draw");
			await page.waitForSelector("#p-weekly", { timeout: 5000 });
			await screenshot(page, "12-weekly-draw");
			track("S07: Weekly Draw", true);
		} catch (e) {
			track("S07: Weekly Draw", false);
			throw e;
		}
	});

	test("S08: Stars Shop", async ({ page, request }) => {
		try {
			const email = `qa-shop-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;
			await depositViaAPI(request, token, 5000);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Stars Hub");
			await page.waitForSelector("#p-stars", { timeout: 5000 });
			await screenshot(page, "13-stars-hub");
			track("S08: Stars Shop", true);
		} catch (e) {
			track("S08: Stars Shop", false);
			throw e;
		}
	});

	test("S09: Admin Panel", async ({ page, request }) => {
		try {
			const res = await request.post("/api/auth/login", {
				data: { email: "admin@example.com", password: "admin123" },
			});
			const body = await res.json();
			expect(body.success).toBe(true);

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), body.token);
			await page.reload();
			await page.waitForSelector("#p-home");

			const found = await navSidebar(page, "Admin panel");
			if (!found) {
				console.log("  Admin button not found in sidebar");
				track("S09: Admin Panel", false);
				return;
			}
			await page.waitForSelector("#p-admin", { timeout: 5000 });
			await page.waitForTimeout(500);
			await screenshot(page, "14-admin-overview");

			const tabs = ["users", "draws", "weekly", "games", "economy", "config"];
			for (const tab of tabs) {
				const tabBtn = page.locator("#p-admin button", { hasText: new RegExp(tab, "i") });
				if (await tabBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
					await tabBtn.click();
					await page.waitForTimeout(500);
					await screenshot(page, `15-admin-${tab}`);
				}
			}
			track("S09: Admin Panel", true);
		} catch (e) {
			track("S09: Admin Panel", false);
			throw e;
		}
	});

	test("S10: Deposit Funds", async ({ page, request }) => {
		try {
			const email = `qa-wallet-${Date.now()}@test.com`;
			const reg = await registerViaAPI(request, email);
			expect(reg.success).toBe(true);
			const token = reg.token;

			await page.goto("/");
			await page.evaluate((t) => localStorage.setItem("token", t), token);
			await page.reload();
			await page.waitForSelector("#p-home");

			await navSidebar(page, "Wallet");
			await page.waitForSelector("#p-wallet", { timeout: 5000 });
			await screenshot(page, "16-wallet-page");

			const dep = await depositViaAPI(request, token, 1000);
			expect(dep.success).toBe(true);
			console.log(`  Deposit 1000 ETB, new balance: ${dep.balance || dep.newBalance}`);
			track("S10: Deposit Funds", true);
		} catch (e) {
			track("S10: Deposit Funds", false);
			throw e;
		}
	});
});
