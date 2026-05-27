import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Register a new user via the API.
 * Returns the JSON response body.
 */
export async function registerUser(
	request: APIRequestContext,
	user: { name: string; email: string; password: string },
) {
	const res = await request.post("/api/auth/register", {
		data: user,
	});
	return res.json();
}

/**
 * Login a user via the API.
 * Returns the JSON response body (should contain token).
 */
export async function loginUser(
	request: APIRequestContext,
	credentials: { email: string; password: string },
) {
	const res = await request.post("/api/auth/login", {
		data: credentials,
	});
	return res.json();
}

/**
 * Login and navigate – stores token in localStorage for subsequent page requests.
 */
export async function loginAndVisit(
	page: Page,
	credentials: { email: string; password: string },
): Promise<void> {
	const res = await page.request.post("/api/auth/login", {
		data: credentials,
	});
	const body = await res.json();
	if (body.token) {
		await page.evaluate((token) => {
			localStorage.setItem("token", token);
		}, body.token);
	}
}
