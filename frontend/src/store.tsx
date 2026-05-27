import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { GameState, Transaction, Notification, Page, ActiveBoost, Lang, WeeklyEntry, WeeklyDrawResult } from './types';
import {
  authApi,
  walletApi,
  notificationsApi,
  gamesApi,
  mapTransaction,
  mapNotification,
  setUnauthorizedHandler,
  type ApiUser,
} from './lib/api';
import { setToken, clearToken, getToken } from './lib/auth';
import { initialsFromName } from './lib/formatters';

const emptyUserData = { name: '', email: '', phone: '', initials: '' };

const loggedOutState: GameState = {
  balance: 0,
  starsBalance: 0,
  isPremium: false,
  isLoggedIn: false,
  isGuest: false,
  userRole: 'user',
  userData: emptyUserData,
  transactions: [],
  notifications: [],
  tickets: 0,
  freeSpins: 0,
  streak: 0,
  dailyClaimed: false,
  activityPoints: 0,
  cashCapHit: false,
  playsToday: 0,
  bonusDrawEntries: 0,
  activeBoosts: [],
  lossProtectionPlays: 0,
  spinsToday: 0,
  scratchesToday: 0,
  quickPlaysToday: 0,
  weeklyEntries: [],
  weeklyDrawResult: null,
};

function userToState(user: ApiUser, prev?: GameState): GameState {
  const base = prev ?? loggedOutState;
  return {
    ...base,
    balance: user.balance,
    starsBalance: user.starsBalance,
    isPremium: user.isPremium,
    isLoggedIn: true,
    isGuest: false,
    userRole: user.role,
    userData: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      initials: initialsFromName(user.name),
    },
    tickets: user.tickets,
    freeSpins: user.freeSpins ?? 0,
    streak: user.streak,
    activityPoints: user.activityPoints,
    dailyClaimed: user.dailyClaimed ?? false,
    playsToday: user.playsToday ?? 0,
    spinsToday: user.spinsToday ?? 0,
    scratchesToday: user.scratchesToday ?? 0,
    quickPlaysToday: user.quickPlaysToday ?? 0,
    cashCapHit: user.cashCapHit ?? false,
    bonusDrawEntries: user.bonusDrawEntries ?? 0,
    lossProtectionPlays: user.lossProtectionPlays ?? 0,
    activeBoosts: (user.activeBoosts ?? []) as ActiveBoost[],
    weeklyEntries: (user.weeklyEntries ?? []) as WeeklyEntry[],
    weeklyDrawResult: (user.weeklyDrawResult ?? null) as WeeklyDrawResult | null,
  };
}

interface Ctx {
  state: GameState;
  page: Page;
  sidebarOpen: boolean;
  darkMode: boolean;
  lang: Lang;
  loading: boolean;
  setDarkMode: (v: boolean) => void;
  setLang: (v: Lang) => void;
  goPage: (p: Page) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  syncFromServer: (user: ApiUser, transactions?: Transaction[], notifications?: Notification[]) => void;
  syncGameResponse: (data: { user: ApiUser; transactions?: Parameters<typeof mapTransaction>[0][]; notifications?: Parameters<typeof mapNotification>[0][] }) => void;
  markAllRead: () => Promise<void>;
  claimDaily: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerAccount: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
  guest: () => void;
  bootstrapSession: () => Promise<void>;
  hasBoost: (type: ActiveBoost['type']) => boolean;
  getMultiplier: () => number;
}

const StoreCtx = createContext<Ctx>(null!);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(loggedOutState);
  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkModeRaw] = useState(false);
  const [lang, setLangRaw] = useState<Lang>('en');
  const [loading, setLoading] = useState(true);

  const setDarkMode = useCallback((v: boolean) => {
    setDarkModeRaw(v);
    document.documentElement.setAttribute('data-theme', v ? 'dark' : '');
  }, []);

  const setLang = useCallback((v: Lang) => setLangRaw(v), []);

  const goPage = useCallback((p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const syncFromServer = useCallback((
    user: ApiUser,
    transactions?: Transaction[],
    notifications?: Notification[],
  ) => {
    setState(s => ({
      ...userToState(user, s),
      transactions: transactions ?? s.transactions,
      notifications: notifications ?? s.notifications,
    }));
  }, []);

  const syncGameResponse = useCallback((data: {
    user: ApiUser;
    transactions?: Parameters<typeof mapTransaction>[0][];
    notifications?: Parameters<typeof mapNotification>[0][];
  }) => {
    const txs = data.transactions?.map(mapTransaction) ?? undefined;
    const notifs = data.notifications?.map(mapNotification) ?? undefined;
    syncFromServer(data.user, txs, notifs);
  }, [syncFromServer]);

  const hydrateWalletAndNotifications = useCallback(async () => {
    const [wallet, notifs] = await Promise.all([
      walletApi.get(),
      notificationsApi.list(),
    ]);
    setState(s => ({
      ...s,
      balance: wallet.balance,
      starsBalance: wallet.starsBalance,
      transactions: wallet.transactions.map(mapTransaction),
      notifications: notifs.notifications.map(mapNotification),
    }));
  }, []);

  const bootstrapSession = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await authApi.me();
      syncFromServer(user);
      await hydrateWalletAndNotifications();
    } catch {
      clearToken();
      setState(loggedOutState);
    } finally {
      setLoading(false);
    }
  }, [syncFromServer, hydrateWalletAndNotifications]);

  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setToken(res.token);
    syncFromServer(res.user);
    await hydrateWalletAndNotifications();
    setPage('home');
  }, [syncFromServer, hydrateWalletAndNotifications]);

  const registerAccount = useCallback(async (data: { name: string; email: string; password: string; phone?: string }) => {
    const res = await authApi.register(data);
    setToken(res.token);
    syncFromServer(res.user);
    await hydrateWalletAndNotifications();
    setPage('home');
  }, [syncFromServer, hydrateWalletAndNotifications]);

  const logout = useCallback(() => {
    clearToken();
    setState(loggedOutState);
    setPage('auth');
  }, []);

  const guest = useCallback(() => {
    setState(s => ({ ...loggedOutState, isGuest: true }));
    setPage('home');
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await notificationsApi.markAllRead();
    setState(s => ({
      ...s,
      notifications: res.notifications.map(mapNotification),
    }));
  }, []);

  const claimDaily = useCallback(async () => {
    const res = await gamesApi.claimDaily();
    syncGameResponse(res);
  }, [syncGameResponse]);

  const hasBoost = useCallback((type: ActiveBoost['type']) => {
    return state.activeBoosts.some(b => b.type === type);
  }, [state.activeBoosts]);

  const getMultiplier = useCallback(() => {
    const m = state.activeBoosts.find(b => b.type === 'multiplier');
    return m ? 1.2 : 1;
  }, [state.activeBoosts]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setState(loggedOutState);
      setPage('auth');
    });
    bootstrapSession();
  }, [bootstrapSession]);

  return (
    <StoreCtx.Provider value={{
      state, page, sidebarOpen, darkMode, lang, loading,
      setDarkMode, setLang, goPage, toggleSidebar, closeSidebar,
      syncFromServer, syncGameResponse, markAllRead, claimDaily,
      loginWithCredentials, registerAccount, logout, guest,
      bootstrapSession, hasBoost, getMultiplier,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}
