export type Page =
  | 'home' | 'auth' | 'spin' | 'scratch' | 'quick' | 'daily'
  | 'draw' | 'wallet' | 'tickets' | 'account' | 'notifications'
  | 'admin' | 'stars' | 'weekly';

export type Lang = 'en' | 'am' | 'om' | 'af' | 'ti';

export type ToastCls = 'ts' | 'tn-t' | 'tx' | 'tstar' | '';

export interface WeeklyEntry {
  numbers: number[];
  date: string;
  round: number;
}

export interface WeeklyDrawResult {
  winningNumbers: number[];
  date: string;
  round: number;
  winners: number;
}

export interface Toast {
  id: string;
  title: string;
  sub?: string;
  cls: ToastCls;
}

export interface Transaction {
  type: 'in' | 'out' | 'star';
  desc: string;
  date: string;
  amt: number;
}

export interface Notification {
  icon: string;
  color: 'ta' | 'tp' | 'tg' | 'ts';
  msg: string;
  time: string;
  read: boolean;
}

export interface UserData {
  name: string;
  email: string;
  phone: string;
  initials: string;
}

export interface ActiveBoost {
  type: 'multiplier' | 'lossProtection' | 'premiumDay';
  label: string;
  icon: string;
  expiresAfter: number; // plays remaining or hours
}

export interface GameState {
  balance: number;
  starsBalance: number;
  isPremium: boolean;
  isLoggedIn: boolean;
  isGuest: boolean;
  userRole: 'user' | 'admin';
  userData: UserData;
  transactions: Transaction[];
  notifications: Notification[];
  tickets: number;
  streak: number;
  dailyClaimed: boolean;
  activityPoints: number;
  cashCapHit: boolean;
  playsToday: number;
  bonusDrawEntries: number;
  activeBoosts: ActiveBoost[];
  lossProtectionPlays: number;
  spinsToday: number;
  scratchesToday: number;
  quickPlaysToday: number;
  weeklyEntries: WeeklyEntry[];
  weeklyDrawResult: WeeklyDrawResult | null;
}
