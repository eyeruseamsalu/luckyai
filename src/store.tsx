import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { GameState, Transaction, Notification, Page, ActiveBoost, Lang, WeeklyEntry, WeeklyDrawResult } from './types';

const CASH_CAP_PLAYS = 8;
const STAR_EARN_BASE = 35;

const defaultState: GameState = {
  balance: 1240,
  starsBalance: 420,
  isPremium: false,
  isLoggedIn: false,
  isGuest: false,
  userRole: 'user',
  userData: { name: 'Abebe Bekele', email: 'abebe@example.com', phone: '+251 911 234 567', initials: 'AB' },
  transactions: [
    { type: 'in',  desc: 'Telebirr deposit',         date: '2h ago',    amt:  200 },
    { type: 'out', desc: 'Quick play — 5 ETB',       date: '3h ago',    amt:  -5  },
    { type: 'in',  desc: 'Scratch 2× reward',        date: '4h ago',    amt:  10  },
    { type: 'out', desc: 'Crown Draw entry — 30 ETB',date: 'Yesterday', amt:  -30 },
  ],
  notifications: [
    { icon: 'ti-star',          color: 'ta', msg: 'Premium plan trial activated!',          time: '1h ago',  read: false },
    { icon: 'ti-circle-check',  color: 'tg', msg: 'Crown Draw entry confirmed for June 15', time: '2h ago',  read: false },
    { icon: 'ti-coin',          color: 'tg', msg: '200 ETB deposited via Telebirr',         time: '4h ago',  read: true  },
  ],
  tickets: 2,
  streak: 5,
  dailyClaimed: false,
  activityPoints: 420,
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

interface Ctx {
  state: GameState;
  page: Page;
  sidebarOpen: boolean;
  darkMode: boolean;
  lang: Lang;
  setDarkMode: (v: boolean) => void;
  setLang: (v: Lang) => void;
  goPage: (p: Page) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  addBalance: (amt: number) => void;
  deductBalance: (amt: number) => boolean;
  addStars: (amt: number) => void;
  spendStars: (amt: number) => boolean;
  addTransaction: (desc: string, amt: number, type?: 'in' | 'out' | 'star') => void;
  addNotification: (icon: string, color: 'ta' | 'tp' | 'tg', msg: string) => void;
  markAllRead: () => void;
  claimDaily: () => void;
  login: (name: string, email: string, role: 'user' | 'admin') => void;
  logout: () => void;
  guest: () => void;
  recordPlay: () => void;
  addTicket: () => void;
  setPremium: () => void;
  updateUserData: (d: Partial<GameState['userData']>) => void;
  addBoost: (b: ActiveBoost) => void;
  removeBoost: (type: ActiveBoost['type']) => void;
  hasBoost: (type: ActiveBoost['type']) => boolean;
  getMultiplier: () => number;
  consumeLossProtection: () => boolean;
  addWeeklyEntry: (numbers: number[]) => void;
  setWeeklyDrawResult: (result: WeeklyDrawResult) => void;
}

const StoreCtx = createContext<Ctx>(null!);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(defaultState);
  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkModeRaw] = useState(false);
  const [lang, setLangRaw] = useState<Lang>('en');

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

  const addBalance = useCallback((amt: number) => {
    setState(s => ({ ...s, balance: s.balance + amt }));
  }, []);

  const deductBalance = useCallback((amt: number): boolean => {
    let ok = false;
    setState(s => {
      if (s.balance >= amt) { ok = true; return { ...s, balance: s.balance - amt }; }
      return s;
    });
    return ok;
  }, []);

  const addStars = useCallback((amt: number) => {
    setState(s => ({ ...s, starsBalance: s.starsBalance + amt, activityPoints: s.activityPoints + Math.floor(amt / 2) }));
  }, []);

  const spendStars = useCallback((amt: number): boolean => {
    let ok = false;
    setState(s => {
      if (s.starsBalance >= amt) { ok = true; return { ...s, starsBalance: s.starsBalance - amt }; }
      return s;
    });
    return ok;
  }, []);

  const addTransaction = useCallback((desc: string, amt: number, type?: 'in' | 'out' | 'star') => {
    const t: Transaction = {
      type: type || (amt >= 0 ? 'in' : 'out'),
      desc,
      date: 'Just now',
      amt,
    };
    setState(s => ({ ...s, transactions: [t, ...s.transactions] }));
  }, []);

  const addNotification = useCallback((icon: string, color: 'ta' | 'tp' | 'tg', msg: string) => {
    const n: Notification = { icon, color, msg, time: 'Just now', read: false };
    setState(s => ({ ...s, notifications: [n, ...s.notifications] }));
  }, []);

  const markAllRead = useCallback(() => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) }));
  }, []);

  const claimDaily = useCallback(() => {
    setState(s => {
      if (s.dailyClaimed) return s;
      return {
        ...s,
        balance: s.balance + 15,
        starsBalance: s.starsBalance + 50,
        dailyClaimed: true,
        streak: s.streak,
        transactions: [{ type: 'in', desc: 'Daily reward — day 5', date: 'Just now', amt: 15 }, ...s.transactions],
        notifications: [{ icon: 'ti-circle-check', color: 'tg', msg: 'Daily reward claimed — 15 ETB + 50 ★ added', time: 'Just now', read: false }, ...s.notifications],
      };
    });
  }, []);

  const login = useCallback((name: string, email: string, role: 'user' | 'admin') => {
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    setState(s => ({
      ...s,
      isLoggedIn: true,
      isGuest: false,
      userRole: role,
      userData: { ...s.userData, name, email, initials },
    }));
    setPage('home');
  }, []);

  const logout = useCallback(() => {
    setState(s => ({ ...s, isLoggedIn: false, isGuest: false, userRole: 'user' }));
    setPage('auth');
  }, []);

  const guest = useCallback(() => {
    setState(s => ({ ...s, isGuest: true, isLoggedIn: false }));
    setPage('home');
  }, []);

  const recordPlay = useCallback(() => {
    setState(s => {
      const next = s.playsToday + 1;
      const hit = next >= CASH_CAP_PLAYS;
      return { ...s, playsToday: next, cashCapHit: hit };
    });
  }, []);

  const addTicket = useCallback(() => {
    setState(s => ({ ...s, tickets: s.tickets + 1 }));
  }, []);

  const setPremium = useCallback(() => {
    setState(s => ({ ...s, isPremium: true }));
  }, []);

  const updateUserData = useCallback((d: Partial<GameState['userData']>) => {
    setState(s => ({ ...s, userData: { ...s.userData, ...d } }));
  }, []);

  const addBoost = useCallback((b: ActiveBoost) => {
    setState(s => {
      const filtered = s.activeBoosts.filter(x => x.type !== b.type);
      return { ...s, activeBoosts: [...filtered, b] };
    });
  }, []);

  const removeBoost = useCallback((type: ActiveBoost['type']) => {
    setState(s => ({ ...s, activeBoosts: s.activeBoosts.filter(b => b.type !== type) }));
  }, []);

  const hasBoost = useCallback((type: ActiveBoost['type']) => {
    return state.activeBoosts.some(b => b.type === type);
  }, [state.activeBoosts]);

  const getMultiplier = useCallback(() => {
    const m = state.activeBoosts.find(b => b.type === 'multiplier');
    return m ? 1.2 : 1;
  }, [state.activeBoosts]);

  const consumeLossProtection = useCallback((): boolean => {
    let had = false;
    setState(s => {
      const lp = s.activeBoosts.find(b => b.type === 'lossProtection');
      if (!lp) return s;
      had = true;
      const remaining = lp.expiresAfter - 1;
      if (remaining <= 0) {
        return { ...s, activeBoosts: s.activeBoosts.filter(b => b.type !== 'lossProtection') };
      }
      return { ...s, activeBoosts: s.activeBoosts.map(b => b.type === 'lossProtection' ? { ...b, expiresAfter: remaining } : b) };
    });
    return had;
  }, []);

  const addWeeklyEntry = useCallback((numbers: number[]) => {
    const entry: WeeklyEntry = { numbers, date: 'Just now', round: 1 };
    setState(s => ({ ...s, weeklyEntries: [entry, ...s.weeklyEntries] }));
  }, []);

  const setWeeklyDrawResult = useCallback((result: WeeklyDrawResult) => {
    setState(s => ({ ...s, weeklyDrawResult: result }));
  }, []);

  return (
    <StoreCtx.Provider value={{
      state, page, sidebarOpen, darkMode, lang, setDarkMode, setLang,
      goPage, toggleSidebar, closeSidebar,
      addBalance, deductBalance, addStars, spendStars,
      addTransaction, addNotification, markAllRead,
      claimDaily, login, logout, guest,
      recordPlay, addTicket, setPremium, updateUserData,
      addBoost, removeBoost, hasBoost, getMultiplier, consumeLossProtection,
      addWeeklyEntry, setWeeklyDrawResult,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}
