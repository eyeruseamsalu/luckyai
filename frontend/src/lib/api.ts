const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
	statusCode: number;
	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
	}
}

function getToken(): string | null {
	return localStorage.getItem("token");
}

export function setToken(token: string | null): void {
	if (token) localStorage.setItem("token", token);
	else localStorage.removeItem("token");
}

export function clearToken(): void {
	localStorage.removeItem("token");
}

async function request<T = unknown>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options.headers as Record<string, string>),
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

	let data: Record<string, unknown>;
	try {
		data = await res.json();
	} catch {
		throw new ApiError(res.status, `Request failed (${res.status})`);
	}

	if (!data.success) {
		throw new ApiError(
			res.status,
			(data.message as string) || "Something went wrong",
		);
	}

	return data as T;
}

// --- Auth ---

export interface LoginResponse {
	success: true;
	token: string;
	user: {
		id: string;
		name: string;
		email: string;
		phone: string;
		role: "user" | "admin";
		balance: number;
		starsBalance: number;
		isPremium: boolean;
		tickets: number;
		streak: number;
		activityPoints: number;
	};
}

export function login(email: string, password: string) {
	return request<LoginResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export function register(data: {
	name: string;
	email: string;
	password: string;
	phone?: string;
}) {
	return request<LoginResponse>("/auth/register", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function getMe() {
	return request<{ success: true; user: LoginResponse["user"] }>("/auth/me");
}

// --- Wallet ---

export interface WalletResponse {
	success: true;
	balance: number;
	starsBalance: number;
	transactions: Array<{
		_id: string;
		type: "in" | "out" | "star";
		desc: string;
		amt: number;
		createdAt: string;
	}>;
}

export function getWallet() {
	return request<WalletResponse>("/wallet");
}

// --- Notifications ---

export interface NotificationItem {
	_id: string;
	icon: string;
	color: "ta" | "tp" | "tg" | "ts";
	msg: string;
	read: boolean;
	createdAt: string;
}

export function getNotifications() {
	return request<{ success: true; notifications: NotificationItem[] }>(
		"/notifications",
	);
}

// --- Health ---

export function getHealth() {
	return request<{
		success: true;
		service: string;
		db: string;
		timestamp: string;
	}>("/health");
}

// --- Wallet Mutations ---

export interface DepositResponse {
	success: true;
	balance: number;
	transaction: {
		_id: string;
		type: "in" | "out" | "star";
		desc: string;
		amt: number;
		createdAt: string;
	};
}

export function deposit(amount: number) {
	return request<DepositResponse>("/wallet/deposit", {
		method: "POST",
		body: JSON.stringify({ amount }),
	});
}

export function withdraw(amount: number) {
	return request<DepositResponse>("/wallet/withdraw", {
		method: "POST",
		body: JSON.stringify({ amount }),
	});
}

// --- Daily Rewards ---

export interface ClaimDailyResponse {
	success: true;
	reward: {
		cash: number;
		stars: number;
		bonusCash?: number;
		bonusTicket?: number;
	};
	streak: number;
	dailyClaimed: boolean;
}

export function claimDaily() {
	return request<ClaimDailyResponse>("/daily/claim", {
		method: "POST",
	});
}

// --- Profile ---

export function updateProfile(data: {
	name?: string;
	email?: string;
	phone?: string;
}) {
	return request<{ success: true; user: LoginResponse["user"] }>(
		"/auth/profile",
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

// --- Games ---

export interface GamePlayResponse {
	success: true;
	drawn: number[];
	matches: number;
	wonCash: number;
	wonStars: number;
	newBalance: number;
	newStarsBalance: number;
	playsToday: number;
	cashCapHit: boolean;
}

export interface GameHistoryItem {
	_id: string;
	picks: number[];
	drawn: number[];
	cost: number;
	tier: string;
	matches: number;
	prizeCash: number;
	prizeStars: number;
	multiplier: number;
	result: string;
	createdAt: string;
}

export function playGame(type: string, body: object) {
	return request<GamePlayResponse>(`/games/${type}/play`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function getGameHistory(type: string) {
	return request<{
		success: true;
		rounds: GameHistoryItem[];
	}>(`/games/${type}/history`);
}

// --- Draws ---

export interface CrownDrawEntryResponse {
	success: true;
	entry: {
		numbers: number[];
		entryType: string;
		drawId: string;
	};
}

export interface SuggestNumbersResponse {
	success: true;
	numbers: number[];
}

export function enterCrownDraw(data: { numbers: number[]; entryType: string }) {
	return request<CrownDrawEntryResponse>("/draws/crown/enter", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function suggestNumbers() {
	return request<SuggestNumbersResponse>("/draws/crown/suggest", {
		method: "POST",
	});
}

export function enterWeeklyDraw(data: { numbers: number[] }) {
	return request<CrownDrawEntryResponse>("/draws/weekly/enter", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function getWeeklyCurrent() {
	return request<{
		success: true;
		draw: Record<string, unknown> | null;
	}>("/draws/weekly/current");
}

export function getWeeklyResult() {
	return request<{
		success: true;
		result: Record<string, unknown> | null;
	}>("/draws/weekly/result");
}

// --- Shop ---

export interface ShopItem {
	key: string;
	name: string;
	desc: string;
	cost: number;
	currency: "cash" | "star";
	category: string;
}

export function getShopItems() {
	return request<{ success: true; items: ShopItem[] }>("/shop/items");
}

export function purchaseItem(itemKey: string) {
	return request<{
		success: true;
		item: ShopItem;
		balance: number;
		starsBalance: number;
	}>("/shop/purchase", {
		method: "POST",
		body: JSON.stringify({ itemKey }),
	});
}

// --- Boosts ---

export interface BoostInfo {
	type: string;
	expiresAt: string;
	multiplier: number;
}

export function activateBoost(type: string) {
	return request<{ success: true; boost: BoostInfo }>("/boosts/activate", {
		method: "POST",
		body: JSON.stringify({ type }),
	});
}

export function deactivateBoost(type: string) {
	return request<{ success: true }>("/boosts/deactivate", {
		method: "POST",
		body: JSON.stringify({ type }),
	});
}

export function getActiveBoosts() {
	return request<{ success: true; boosts: BoostInfo[] }>("/boosts");
}

export function consumeBoost(type: string) {
	return request<{ success: true }>("/boosts/consume", {
		method: "POST",
		body: JSON.stringify({ type }),
	});
}

// --- Tickets ---

export function getTickets() {
	return request<{
		success: true;
		tickets: number;
	}>("/tickets");
}

// --- Admin ---

export function getAdminOverview() {
	return request<{
		success: true;
		stats: Record<string, unknown>;
	}>("/admin/overview");
}

export interface AdminUser {
	_id: string;
	name: string;
	email: string;
	role: "user" | "admin";
	balance: number;
	starsBalance: number;
	isPremium: boolean;
	tickets: number;
	streak: number;
	activityPoints: number;
	createdAt: string;
}

export function getAdminUsers(params?: {
	search?: string;
	page?: number;
	limit?: number;
}) {
	const searchParams = new URLSearchParams();
	if (params?.search) searchParams.set("search", params.search);
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	const qs = searchParams.toString();
	return request<{
		success: true;
		users: AdminUser[];
		total: number;
		page: number;
		pages: number;
	}>(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function updateUser(userId: string, data: object) {
	return request<{ success: true; user: AdminUser }>(
		`/admin/users/${userId}`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

export function suspendUser(userId: string) {
	return request<{ success: true }>(`/admin/users/${userId}/suspend`, {
		method: "PUT",
	});
}

// Admin — Crown Draws

export function getAdminCrownDraws() {
	return request<{
		success: true;
		draws: Record<string, unknown>[];
	}>("/admin/draws/crown");
}

export function createCrownDraw(data: object) {
	return request<{ success: true; draw: Record<string, unknown> }>(
		"/admin/draws/crown",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
}

export function editCrownDraw(id: string, data: object) {
	return request<{ success: true; draw: Record<string, unknown> }>(
		`/admin/draws/crown/${id}`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

export function runCrownDraw(id: string) {
	return request<{ success: true; result: Record<string, unknown> }>(
		`/admin/draws/crown/${id}/run`,
		{
			method: "POST",
		},
	);
}

export function cancelCrownDraw(id: string) {
	return request<{ success: true }>(
		`/admin/draws/crown/${id}/cancel`,
		{
			method: "POST",
		},
	);
}

// Admin — Weekly Draws

export function getAdminWeeklyDraw() {
	return request<{
		success: true;
		draw: Record<string, unknown> | null;
	}>("/admin/draws/weekly");
}

export function createWeeklyDraw(data: object) {
	return request<{ success: true; draw: Record<string, unknown> }>(
		"/admin/draws/weekly",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
}

export function runWeeklyDraw(round: number | string) {
	return request<{ success: true; result: Record<string, unknown> }>(
		`/admin/draws/weekly/${round}/run`,
		{
			method: "POST",
		},
	);
}

export function getAdminWeeklyEntries() {
	return request<{
		success: true;
		entries: Record<string, unknown>[];
	}>("/admin/draws/weekly/entries");
}

// Admin — Game Config

export function getGameConfig() {
	return request<{
		success: true;
		config: Record<string, unknown>;
	}>("/admin/config/game");
}

export function updateGameConfig(data: object) {
	return request<{ success: true; config: Record<string, unknown> }>(
		"/admin/config/game",
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

// Admin — Platform Config

export function getPlatformConfig() {
	return request<{
		success: true;
		config: Record<string, unknown>;
	}>("/admin/config/platform");
}

export function updatePlatformConfig(data: object) {
	return request<{ success: true; config: Record<string, unknown> }>(
		"/admin/config/platform",
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

// Admin — Economy Config

export function getEconomyConfig() {
	return request<{
		success: true;
		config: Record<string, unknown>;
	}>("/admin/config/economy");
}

export function updateStarRate(rate: number) {
	return request<{ success: true; config: Record<string, unknown> }>(
		"/admin/config/economy/star-rate",
		{
			method: "PUT",
			body: JSON.stringify({ rate }),
		},
	);
}

export function getEconomyItems() {
	return request<{
		success: true;
		items: Record<string, unknown>[];
	}>("/admin/config/economy/items");
}

export function updateItemCost(key: string, cost: number) {
	return request<{ success: true; item: Record<string, unknown> }>(
		`/admin/config/economy/items/${key}`,
		{
			method: "PUT",
			body: JSON.stringify({ cost }),
		},
	);
}
