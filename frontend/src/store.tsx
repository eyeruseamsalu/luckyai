import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import * as api from "./lib/api";
import { clearToken, setToken } from "./lib/api";
import type {
	ActiveBoost,
	GameState,
	Lang,
	Notification,
	Page,
	Transaction,
	WeeklyDrawResult,
	WeeklyEntry,
} from "./types";

const CASH_CAP_PLAYS = 8;
const _STAR_EARN_BASE = 35;

const defaultState: GameState = {
	balance: 0,
	starsBalance: 0,
	isPremium: false,
	isLoggedIn: false,
	isGuest: false,
	userRole: "user",
	userData: { name: "", email: "", phone: "", initials: "" },
	transactions: [],
	notifications: [],
	tickets: 0,
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

function buildStateFromUser(
	user: api.LoginResponse["user"],
): Partial<GameState> {
	return {
		balance: user.balance,
		starsBalance: user.starsBalance,
		isPremium: user.isPremium,
		isLoggedIn: true,
		isGuest: false,
		userRole: user.role,
		userData: {
			name: user.name,
			email: user.email,
			phone: user.phone,
			initials: user.name
				.split(" ")
				.filter(Boolean)
				.map((n) => n[0])
				.join("")
				.slice(0, 2)
				.toUpperCase(),
		},
		tickets: user.tickets,
		streak: user.streak,
		activityPoints: user.activityPoints,
		transactions: [],
		notifications: [],
	};
}

interface Ctx {
	state: GameState;
	page: Page;
	sidebarOpen: boolean;
	darkMode: boolean;
	lang: Lang;
	initializing: boolean;
	setDarkMode: (v: boolean) => void;
	setLang: (v: Lang) => void;
	goPage: (p: Page) => void;
	toggleSidebar: () => void;
	closeSidebar: () => void;
	addBalance: (amt: number) => void;
	deductBalance: (amt: number) => boolean;
	addStars: (amt: number) => void;
	spendStars: (amt: number) => boolean;
	addTransaction: (
		desc: string,
		amt: number,
		type?: "in" | "out" | "star",
	) => void;
	addNotification: (
		icon: string,
		color: "ta" | "tp" | "tg",
		msg: string,
	) => void;
	markAllRead: () => void;
	claimDaily: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	register: (data: {
		name: string;
		email: string;
		password: string;
		phone?: string;
	}) => Promise<void>;
	logout: () => void;
	guest: () => void;
	recordPlay: () => void;
	addTicket: () => void;
	setPremium: () => void;
	updateUserData: (d: Partial<GameState["userData"]>) => void;
	addBoost: (b: ActiveBoost) => void;
	removeBoost: (type: ActiveBoost["type"]) => void;
	hasBoost: (type: ActiveBoost["type"]) => boolean;
	getMultiplier: () => number;
	consumeLossProtection: () => boolean;
	addWeeklyEntry: (numbers: number[]) => void;
	setWeeklyDrawResult: (result: WeeklyDrawResult) => void;
	refreshUser: () => Promise<void>;
}

const StoreCtx = createContext<Ctx>(null!);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<GameState>(defaultState);
	const [page, setPage] = useState<Page>("home");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [darkMode, setDarkModeRaw] = useState(false);
	const [lang, setLangRaw] = useState<Lang>("en");
	const [initializing, setInitializing] = useState(true);
	const stateRef = React.useRef(state);
	stateRef.current = state;

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			setInitializing(false);
			return;
		}
		api
			.getMe()
			.then((res) =>
				setState((s) => ({ ...s, ...buildStateFromUser(res.user) })),
			)
			.catch(() => clearToken())
			.finally(() => setInitializing(false));
	}, []);

	const setDarkMode = useCallback((v: boolean) => {
		setDarkModeRaw(v);
		document.documentElement.setAttribute("data-theme", v ? "dark" : "");
	}, []);

	const setLang = useCallback((v: Lang) => setLangRaw(v), []);

	const goPage = useCallback((p: Page) => {
		setPage(p);
		setSidebarOpen(false);
	}, []);
	const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
	const closeSidebar = useCallback(() => setSidebarOpen(false), []);

	const addBalance = useCallback((amt: number) => {
		setState((s) => ({ ...s, balance: s.balance + amt }));
	}, []);

	const deductBalance = useCallback((amt: number): boolean => {
		let ok = false;
		setState((s) => {
			if (s.balance >= amt) {
				ok = true;
				return { ...s, balance: s.balance - amt };
			}
			return s;
		});
		return ok;
	}, []);

	const addStars = useCallback((amt: number) => {
		setState((s) => ({
			...s,
			starsBalance: s.starsBalance + amt,
			activityPoints: s.activityPoints + Math.floor(amt / 2),
		}));
	}, []);

	const spendStars = useCallback((amt: number): boolean => {
		let ok = false;
		setState((s) => {
			if (s.starsBalance >= amt) {
				ok = true;
				return { ...s, starsBalance: s.starsBalance - amt };
			}
			return s;
		});
		return ok;
	}, []);

	const addTransaction = useCallback(
		(desc: string, amt: number, type?: "in" | "out" | "star") => {
			const t: Transaction = {
				type: type || (amt >= 0 ? "in" : "out"),
				desc,
				date: "Just now",
				amt,
			};
			setState((s) => ({ ...s, transactions: [t, ...s.transactions] }));
		},
		[],
	);

	const addNotification = useCallback(
		(icon: string, color: "ta" | "tp" | "tg", msg: string) => {
			const n: Notification = {
				icon,
				color,
				msg,
				time: "Just now",
				read: false,
			};
			setState((s) => ({ ...s, notifications: [n, ...s.notifications] }));
		},
		[],
	);

	const markAllRead = useCallback(() => {
		setState((s) => ({
			...s,
			notifications: s.notifications.map((n) => ({ ...n, read: true })),
		}));
	}, []);

	const claimDaily = useCallback(async () => {
		try {
			const res = await api.claimDaily();
			const { reward, streak } = res;
			const totalCash = reward.cash + (reward.bonusCash || 0);
			setState((s) => ({
				...s,
				balance: s.balance + totalCash,
				starsBalance: s.starsBalance + reward.stars,
				tickets: s.tickets + (reward.bonusTicket || 0),
				dailyClaimed: true,
				streak,
				transactions: [
					{ type: "in", desc: "Daily reward", date: "Just now", amt: totalCash },
					...s.transactions,
				],
				notifications: [
					{
						icon: "ti-circle-check",
						color: "tg",
						msg: `Daily reward claimed — ${totalCash} ETB + ${reward.stars} ★ added`,
						time: "Just now",
						read: false,
					},
					...s.notifications,
				],
			}));
		} catch (e) {
			const err = e as { statusCode?: number };
			if (err.statusCode === 409) {
				setState((s) => ({ ...s, dailyClaimed: true }));
			}
		}
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const res = await api.login(email, password);
		setToken(res.token);
		setState((s) => ({ ...s, ...buildStateFromUser(res.user) }));
		setPage("home");
	}, []);

	const register = useCallback(
		async (data: {
			name: string;
			email: string;
			password: string;
			phone?: string;
		}) => {
			const res = await api.register(data);
			setToken(res.token);
			setState((s) => ({ ...s, ...buildStateFromUser(res.user) }));
			setPage("home");
		},
		[],
	);

	const logout = useCallback(() => {
		clearToken();
		setState(defaultState);
		setPage("auth");
	}, []);

	const guest = useCallback(() => {
		setState((s) => ({ ...s, isGuest: true, isLoggedIn: false }));
		setPage("home");
	}, []);

	const refreshUser = useCallback(async () => {
		try {
			const res = await api.getMe();
			setState((s) => ({ ...s, ...buildStateFromUser(res.user) }));
		} catch {
			/* token likely expired */
		}
	}, []);

	const recordPlay = useCallback(() => {
		setState((s) => {
			const next = s.playsToday + 1;
			const hit = next >= CASH_CAP_PLAYS;
			return { ...s, playsToday: next, cashCapHit: hit };
		});
	}, []);

	const addTicket = useCallback(() => {
		setState((s) => ({ ...s, tickets: s.tickets + 1 }));
	}, []);

	const setPremium = useCallback(() => {
		setState((s) => ({ ...s, isPremium: true }));
	}, []);

	const updateUserData = useCallback(
		async (d: Partial<GameState["userData"]>) => {
			try {
				const res = await api.updateProfile({
					name: d.name,
					email: d.email,
					phone: d.phone,
				});
				setState((s) => ({ ...s, ...buildStateFromUser(res.user) }));
			} catch {}
		},
		[],
	);

	const addBoost = useCallback((b: ActiveBoost) => {
		setState((s) => {
			const filtered = s.activeBoosts.filter((x) => x.type !== b.type);
			return { ...s, activeBoosts: [...filtered, b] };
		});
	}, []);

	const removeBoost = useCallback((type: ActiveBoost["type"]) => {
		setState((s) => ({
			...s,
			activeBoosts: s.activeBoosts.filter((b) => b.type !== type),
		}));
	}, []);

	const hasBoost = useCallback((type: ActiveBoost["type"]) => {
		return stateRef.current.activeBoosts.some((b) => b.type === type);
	}, []);

	const getMultiplier = useCallback(() => {
		const m = stateRef.current.activeBoosts.find(
			(b) => b.type === "multiplier",
		);
		return m ? 1.2 : 1;
	}, []);

	const consumeLossProtection = useCallback((): boolean => {
		let had = false;
		setState((s) => {
			const lp = s.activeBoosts.find((b) => b.type === "lossProtection");
			if (!lp) return s;
			had = true;
			const remaining = lp.expiresAfter - 1;
			if (remaining <= 0) {
				return {
					...s,
					activeBoosts: s.activeBoosts.filter(
						(b) => b.type !== "lossProtection",
					),
				};
			}
			return {
				...s,
				activeBoosts: s.activeBoosts.map((b) =>
					b.type === "lossProtection" ? { ...b, expiresAfter: remaining } : b,
				),
			};
		});
		return had;
	}, []);

	const addWeeklyEntry = useCallback((numbers: number[]) => {
		const entry: WeeklyEntry = { numbers, date: "Just now", round: 1 };
		setState((s) => ({ ...s, weeklyEntries: [entry, ...s.weeklyEntries] }));
	}, []);

	const setWeeklyDrawResult = useCallback((result: WeeklyDrawResult) => {
		setState((s) => ({ ...s, weeklyDrawResult: result }));
	}, []);

	return (
		<StoreCtx.Provider
			value={{
				state,
				page,
				sidebarOpen,
				darkMode,
				lang,
				initializing,
				setDarkMode,
				setLang,
				goPage,
				toggleSidebar,
				closeSidebar,
				addBalance,
				deductBalance,
				addStars,
				spendStars,
				addTransaction,
				addNotification,
				markAllRead,
				claimDaily,
				login,
				register,
				logout,
				guest,
				recordPlay,
				addTicket,
				setPremium,
				updateUserData,
				addBoost,
				removeBoost,
				hasBoost,
				getMultiplier,
				consumeLossProtection,
				addWeeklyEntry,
				setWeeklyDrawResult,
				refreshUser,
			}}
		>
			{children}
		</StoreCtx.Provider>
	);
}
