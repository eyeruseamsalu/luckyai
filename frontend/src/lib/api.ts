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
