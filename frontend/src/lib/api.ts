import { getToken, clearToken } from './auth';
import type { ActiveBoost, Notification, Transaction, WeeklyDrawResult, WeeklyEntry } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type OnUnauthorized = () => void;
let onUnauthorized: OnUnauthorized | null = null;

export function setUnauthorizedHandler(fn: OnUnauthorized): void {
  onUnauthorized = fn;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  balance: number;
  starsBalance: number;
  isPremium: boolean;
  tickets: number;
  freeSpins?: number;
  streak: number;
  activityPoints: number;
  dailyClaimed?: boolean;
  playsToday?: number;
  spinsToday?: number;
  scratchesToday?: number;
  quickPlaysToday?: number;
  cashCapHit?: boolean;
  bonusDrawEntries?: number;
  lossProtectionPlays?: number;
  activeBoosts?: ActiveBoost[];
  weeklyEntries?: WeeklyEntry[];
  weeklyDrawResult?: WeeklyDrawResult | null;
}

interface ApiTransaction {
  _id: string;
  type: 'in' | 'out' | 'star';
  desc: string;
  amt: number;
  createdAt: string;
}

interface ApiNotification {
  _id: string;
  icon: string;
  color: 'ta' | 'tp' | 'tg' | 'ts';
  msg: string;
  read: boolean;
  createdAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      onUnauthorized?.();
    }
    throw new ApiError(res.status, data.message ?? 'Request failed');
  }

  return data as T;
}

export function mapTransaction(t: ApiTransaction): Transaction & { id: string } {
  return {
    id: t._id,
    type: t.type,
    desc: t.desc,
    amt: t.amt,
    date: formatDate(t.createdAt),
  };
}

export function mapNotification(n: ApiNotification): Notification & { id: string } {
  return {
    id: n._id,
    icon: n.icon,
    color: n.color,
    msg: n.msg,
    read: n.read,
    time: formatDate(n.createdAt),
  };
}

function formatDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
}

// Auth
export const authApi = {
  register: (body: { name: string; email: string; password: string; phone?: string }) =>
    request<{ success: boolean; token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<{ success: boolean; user: ApiUser }>('/auth/me'),
  updateProfile: (body: { name?: string; email?: string; phone?: string }) =>
    request<{ success: boolean; user: ApiUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// Wallet
export const walletApi = {
  get: () =>
    request<{ success: boolean; balance: number; starsBalance: number; transactions: ApiTransaction[] }>(
      '/wallet',
    ),
  deposit: (body: { amount: number; method: string }) =>
    request<GamePlayResponse>('/wallet/deposit', { method: 'POST', body: JSON.stringify(body) }),
  withdraw: (body: { amount: number; method: string }) =>
    request<GamePlayResponse>('/wallet/withdraw', { method: 'POST', body: JSON.stringify(body) }),
};

// Notifications
export const notificationsApi = {
  list: () =>
    request<{ success: boolean; notifications: ApiNotification[] }>('/notifications'),
  markAllRead: () =>
    request<{ success: boolean; notifications: ApiNotification[] }>('/notifications/read-all', {
      method: 'PATCH',
    }),
  markRead: (id: string) =>
    request<{ success: boolean; notification: ApiNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
};

// Games
export interface GamePlayResponse {
  success: boolean;
  user: ApiUser;
  result: Record<string, unknown>;
  transactions?: ApiTransaction[];
  notifications?: ApiNotification[];
}

export const gamesApi = {
  getState: () =>
    request<{ success: boolean; user: ApiUser; transactions: ApiTransaction[]; notifications: ApiNotification[] }>(
      '/games/state',
    ),
  spin: (body: { cost: number }) =>
    request<GamePlayResponse>('/games/spin', { method: 'POST', body: JSON.stringify(body) }),
  scratch: (body: { cost: number }) =>
    request<GamePlayResponse>('/games/scratch', { method: 'POST', body: JSON.stringify(body) }),
  quick: (body: { cost: number; picks: number[] }) =>
    request<GamePlayResponse>('/games/quick', { method: 'POST', body: JSON.stringify(body) }),
  claimDaily: () =>
    request<GamePlayResponse>('/games/daily/claim', { method: 'POST', body: '{}' }),
  drawEnter: (body: { numbers: number[]; option: string; cashCost?: number; starCost?: number }) =>
    request<GamePlayResponse>('/games/draw/enter', { method: 'POST', body: JSON.stringify(body) }),
  weeklyEnter: (body: { numbers: number[] }) =>
    request<GamePlayResponse>('/games/weekly/enter', { method: 'POST', body: JSON.stringify(body) }),
  starsCrown: (body: { mode: 'stars' | 'hybrid' }) =>
    request<GamePlayResponse>('/games/stars/crown', { method: 'POST', body: JSON.stringify(body) }),
  starsWeekly: () =>
    request<GamePlayResponse>('/games/stars/weekly', { method: 'POST', body: '{}' }),
};

// Platform (public — server-computed state)
export interface PlatformState {
  serverTime: string;
  crown: {
    phase: 'collecting' | 'scheduled' | 'live' | 'completed';
    communityStars: number;
    starTarget: number;
    progressPct: number;
    countdown: { display: string; endsAt: string | null; phase: string; active: boolean };
    jackpotEtb: number;
    entryCount: number;
    drawAt: string | null;
    drawActive: boolean;
    crownStarCost: number;
    drawId: string | null;
  };
  weekly: { jackpotEtb: number; weeklyStarCost: number };
  starRewards: { daily: number; weekly: number; crown: number };
  pools: { crown: number; weekly: number; platform: number; reserve: number };
  costs: { spin: number; scratch: number; quick: number; crownTicketCash: number };
}

export const platformApi = {
  getState: () => request<PlatformState & { success: boolean }>('/platform/state'),
};
