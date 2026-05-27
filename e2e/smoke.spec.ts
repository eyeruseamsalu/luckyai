import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle(/LuckyAI|Lucky/);

	const body = page.locator("body");
	await expect(body).not.toBeEmpty();
});
