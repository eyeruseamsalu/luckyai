import { getToken, clearToken } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new Error(data.message ?? "Request failed");
  }
  return data as T;
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: { role: string; name: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body) },
    ),
  me: () => request<{ success: boolean; user: { role: string; name: string; email: string } }>("/auth/me"),
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  balance: number;
  starsBalance: number;
  role: string;
  isPremium: boolean;
}

export const adminApi = {
  overview: () =>
    request<{
      success: boolean;
      stats: { userCount: number; totalBalance: number; playsToday: number };
      revenue: {
        pools: { crown: number; weekly: number; platform: number; reserve: number };
        totalGross: number;
        bySource: { _id: string; totalGross: number; count: number }[];
      };
    }>("/admin/overview"),
  users: () => request<{ success: boolean; users: AdminUser[] }>("/admin/users"),
  transactions: () =>
    request<{ success: boolean; transactions: Record<string, unknown>[] }>("/admin/transactions"),
  getConfig: () =>
    request<{ success: boolean; config: Record<string, unknown>; platform: Record<string, unknown>; pools: Record<string, number> }>(
      "/admin/config",
    ),
  updateConfig: (body: Record<string, unknown>) =>
    request<{ success: boolean; config: Record<string, unknown> }>("/admin/config", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getRevenue: () => request<{ success: boolean; revenue: Record<string, unknown> }>("/admin/revenue"),
  gameAnalytics: () =>
    request<{ success: boolean; byGame: { _id: string; plays: number; totalCost: number }[] }>(
      "/admin/analytics/games",
    ),
  weeklyDraw: (body: { winningNumbers: number[]; round?: number }) =>
    request<{ success: boolean; result: Record<string, unknown> }>("/admin/weekly-draw", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  crownDraw: (body: { winningNumbers: number[] }) =>
    request<{ success: boolean; result: { winners: number; paid: number } }>("/admin/crown-draw", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setDrawActive: (active: boolean) =>
    request<{ success: boolean; active: boolean }>("/admin/draw-active", {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
};

export const platformApi = {
  getState: () => request<Record<string, unknown>>("/platform/state"),
};
