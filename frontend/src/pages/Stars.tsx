import { useEffect, useState } from "react";
import { useStore } from "../store";
import { t } from "../translations";
import { activateBoost, getActiveBoosts } from "@/lib/api";
import { toast } from "sonner";

const CROWN_STAR_COST = 1500;
const WEEKLY_STAR_COST = 800;
const CROWN_HYBRID_STAR = 750;
const CROWN_HYBRID_CASH = 250;

export default function Stars() {
	const {
		state,
		lang,
		spendStars,
		deductBalance,
		addTransaction,
		addNotification,
		addTicket,
		goPage,
		addBoost,
		addStars,
		refreshUser,
	} = useStore();
	const [localToast, setLocalToast] = useState<{
		msg: string;
		cls: string;
	} | null>(null);

	const showT = (msg: string, cls: string) => {
		setLocalToast({ msg, cls });
		setTimeout(() => setLocalToast(null), 3500);
	};

	const [activeBoosts, setActiveBoosts] = useState<
		{ type: string; label: string; icon: string; expiresAfter: number }[]
	>([]);
	const [activating, setActivating] = useState<string | null>(null);

	useEffect(() => {
		getActiveBoosts()
			.then((res) => setActiveBoosts(res.boosts))
			.catch(() => {});
	}, []);

	const BOOST_OPTIONS = [
		{
			type: "multiplier" as const,
			label: "2x Stars",
			icon: "ti-bolt",
			cost: 150,
			desc: "Multiply your Star earnings by 2 for the next 5 plays",
		},
		{
			type: "lossProtection" as const,
			label: "Loss Protection",
			icon: "ti-shield",
			cost: 80,
			desc: "Keep your Stars streak safe for 3 plays",
		},
		{
			type: "premiumDay" as const,
			label: "Premium Day",
			icon: "ti-crown",
			cost: 200,
			desc: "Unlock Premium status for 24 hours",
		},
	];

	const handleActivateBoost = async (
		type: "multiplier" | "lossProtection" | "premiumDay",
		cost: number,
	) => {
		if (activating) return;
		setActivating(type);

		const hadStars = spendStars(cost);
		if (!hadStars) {
			toast.error(`You need ${cost}★ to activate this boost`);
			setActivating(null);
			return;
		}

		try {
			const res = await activateBoost(type);
			addBoost(res.boost as any);
			refreshUser();
			setActiveBoosts((prev) => [
				...prev.filter((b) => b.type !== type),
				res.boost as any,
			]);
			toast.success(`${res.boost.label} activated!`);
		} catch (err: any) {
			addStars(cost);
			toast.error(err?.message || "Failed to activate boost");
		} finally {
			setActivating(null);
		}
	};

	const crownPct = Math.min(
		100,
		Math.round((state.starsBalance / CROWN_STAR_COST) * 100),
	);
	const weeklyPct = Math.min(
		100,
		Math.round((state.starsBalance / WEEKLY_STAR_COST) * 100),
	);

	const enterCrownStars = () => {
		if (state.starsBalance < CROWN_STAR_COST) {
			showT(
				`You need ${CROWN_STAR_COST - state.starsBalance} more Stars`,
				"tx",
			);
			return;
		}
		spendStars(CROWN_STAR_COST);
		addTransaction("Crown Draw — Stars entry", -CROWN_STAR_COST, "star");
		addTicket();
		addNotification(
			"ti-trophy",
			"ta",
			"Crown Draw entry added with Stars — June 15",
		);
		showT(t(lang, "entryConfirmed"), "tstar");
	};

	const enterCrownHybrid = () => {
		if (state.starsBalance < CROWN_HYBRID_STAR) {
			showT(`Need ${CROWN_HYBRID_STAR} Stars for hybrid entry`, "tx");
			return;
		}
		if (state.balance < CROWN_HYBRID_CASH) {
			showT(`Need ${CROWN_HYBRID_CASH} ETB for hybrid entry`, "tx");
			return;
		}
		spendStars(CROWN_HYBRID_STAR);
		deductBalance(CROWN_HYBRID_CASH);
		addTransaction(
			"Crown Draw — Hybrid entry (Stars)",
			-CROWN_HYBRID_STAR,
			"star",
		);
		addTransaction(
			"Crown Draw — Hybrid entry (ETB)",
			-CROWN_HYBRID_CASH,
			"out",
		);
		addTicket();
		addNotification(
			"ti-trophy",
			"ta",
			"Crown Draw hybrid entry confirmed — June 15",
		);
		showT(t(lang, "entryConfirmed"), "tstar");
	};

	const enterWeekly = () => {
		if (state.starsBalance < WEEKLY_STAR_COST) {
			showT(
				`You need ${WEEKLY_STAR_COST - state.starsBalance} more Stars for the weekly draw`,
				"tx",
			);
			return;
		}
		spendStars(WEEKLY_STAR_COST);
		addTransaction("Weekly 100K Draw — Stars entry", -WEEKLY_STAR_COST, "star");
		addNotification(
			"ti-trophy",
			"tp",
			"Weekly 100,000 ETB draw entry confirmed",
		);
		showT("Weekly 100K draw entry confirmed.", "tstar");
	};

	const EARN_WAYS = [
		{
			action: t(lang, "playAnyGame"),
			earn: `25–80 ${t(lang, "starsPerPlay")}`,
		},
		{ action: "Bonus Mode", earn: "Every play earns Stars only" },
		{
			action: t(lang, "dailyRewardStars"),
			earn: `20–100 ${t(lang, "starsPerDay")}`,
		},
		{ action: t(lang, "threeDayStreak"), earn: "+50 bonus Stars" },
		{ action: t(lang, "sevenDayStreak"), earn: "+150 bonus Stars" },
		{
			action: t(lang, "inviteFriend"),
			earn: `200 ${t(lang, "starsPerReferral")}`,
		},
	];

	return (
		<div className="pg on" id="p-stars">
			<div style={{ maxWidth: 680, margin: "0 auto" }}>
				{/* Balance card */}
				<div
					className="card"
					style={{
						marginBottom: 13,
						background: "var(--star-light)",
						border: "1.5px solid var(--star)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 12,
						}}
					>
						<div>
							<div
								style={{
									fontSize: 11,
									color: "var(--star-dark)",
									marginBottom: 4,
								}}
							>
								{t(lang, "starsBalanceHub")}
							</div>
							<div
								style={{
									fontSize: 32,
									fontWeight: 700,
									color: "var(--star-dark)",
								}}
							>
								{state.starsBalance.toLocaleString()}
							</div>
						</div>
						<div style={{ textAlign: "right" }}>
							<div
								style={{
									fontSize: 11,
									color: "var(--star-dark)",
									marginBottom: 4,
								}}
							>
								{t(lang, "totalTicketsHeld")}
							</div>
							<div
								style={{
									fontSize: 24,
									fontWeight: 600,
									color: "var(--star-dark)",
								}}
							>
								{state.tickets}
							</div>
						</div>
					</div>

					{/* Crown Draw progress */}
					<div style={{ marginBottom: 8 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: 11,
								color: "var(--star-dark)",
								marginBottom: 5,
							}}
						>
							<span>
								{t(lang, "crownDrawProgressLabel")} ({CROWN_STAR_COST}{" "}
								{t(lang, "stars")})
							</span>
							<span>{crownPct}%</span>
						</div>
						<div
							style={{
								height: 7,
								background: "rgba(0,0,0,.1)",
								borderRadius: 4,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									height: "100%",
									width: `${crownPct}%`,
									background: "var(--star)",
									borderRadius: 4,
									transition: "width .5s",
								}}
							/>
						</div>
						{crownPct < 100 && (
							<div
								style={{
									fontSize: 10,
									color: "var(--star-dark)",
									marginTop: 3,
									opacity: 0.7,
								}}
							>
								{CROWN_STAR_COST - state.starsBalance} more {t(lang, "stars")}{" "}
								needed
							</div>
						)}
					</div>

					{/* Weekly draw progress */}
					<div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: 11,
								color: "var(--star-dark)",
								marginBottom: 5,
							}}
						>
							<span>
								{t(lang, "weeklyProgressLabel")} ({WEEKLY_STAR_COST}{" "}
								{t(lang, "stars")})
							</span>
							<span>{weeklyPct}%</span>
						</div>
						<div
							style={{
								height: 7,
								background: "rgba(0,0,0,.1)",
								borderRadius: 4,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									height: "100%",
									width: `${weeklyPct}%`,
									background: "var(--amber)",
									borderRadius: 4,
									transition: "width .5s",
								}}
							/>
						</div>
					</div>
				</div>

				{localToast && (
					<div className={`toast ${localToast.cls}`} style={{ marginBottom: 13 }}>
						{localToast.msg}
					</div>
				)}

				{/* Crown Draw entry options */}
				<div className="card" style={{ marginBottom: 13 }}>
					<div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
						{t(lang, "crownDraw")} — June 15
					</div>
					<div
						style={{ fontSize: 12, color: "var(--text2)", marginBottom: 13 }}
					>
						500,000 ETB {t(lang, "jackpot")}. {t(lang, "starsEntry")} — you
						earned them.
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
						{/* Stars only */}
						<div
							style={{
								background: "var(--bg)",
								borderRadius: 9,
								padding: "12px 14px",
								border: "0.5px solid var(--border)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
									{t(lang, "starsOnlyLabel")}
								</div>
								<div style={{ fontSize: 11, color: "var(--text2)" }}>
									{CROWN_STAR_COST} {t(lang, "stars")} —{" "}
									{t(lang, "noCashNeeded")}. Have: {state.starsBalance}{" "}
									{t(lang, "stars")}.
								</div>
								<div
									style={{
										marginTop: 5,
										height: 4,
										background: "var(--border)",
										borderRadius: 3,
										overflow: "hidden",
									}}
								>
									<div
										style={{
											height: "100%",
											width: `${crownPct}%`,
											background: "var(--star)",
											borderRadius: 3,
										}}
									/>
								</div>
							</div>
							<button
								className={
									state.starsBalance >= CROWN_STAR_COST ? "stbtn" : "sbtn"
								}
								style={{
									marginLeft: 14,
									flexShrink: 0,
									fontSize: 11,
									padding: "7px 14px",
								}}
								onClick={enterCrownStars}
								disabled={state.starsBalance < CROWN_STAR_COST}
							>
								{state.starsBalance >= CROWN_STAR_COST
									? "Enter free"
									: `${CROWN_STAR_COST - state.starsBalance} short`}
							</button>
						</div>

						{/* Cash only */}
						<div
							style={{
								background: "var(--bg)",
								borderRadius: 9,
								padding: "12px 14px",
								border: "0.5px solid var(--border)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
									{t(lang, "cashEntryLabel")}
								</div>
								<div style={{ fontSize: 11, color: "var(--text2)" }}>
									500 ETB. {t(lang, "walletBalance")}:{" "}
									{Math.round(state.balance)} ETB.
								</div>
							</div>
							<button
								className={state.balance >= 500 ? "abtn" : "sbtn"}
								style={{
									marginLeft: 14,
									flexShrink: 0,
									fontSize: 11,
									padding: "7px 14px",
								}}
								onClick={() => {
									if (state.balance < 500) {
										showT("Insufficient balance", "tx");
										return;
									}
									deductBalance(500);
									addTransaction("Crown Draw — Cash entry", -500, "out");
									addTicket();
									addNotification(
										"ti-trophy",
										"ta",
										"Crown Draw cash entry confirmed",
									);
									showT(t(lang, "entryConfirmed"), "ts");
								}}
							>
								500 ETB
							</button>
						</div>

						{/* Hybrid */}
						<div
							style={{
								background: "var(--bg)",
								borderRadius: 9,
								padding: "12px 14px",
								border: "0.5px solid var(--border)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
									{t(lang, "starsPlusCash")}
								</div>
								<div style={{ fontSize: 11, color: "var(--text2)" }}>
									{CROWN_HYBRID_STAR} {t(lang, "stars")} + {CROWN_HYBRID_CASH}{" "}
									ETB.
								</div>
							</div>
							<button
								className={
									state.starsBalance >= CROWN_HYBRID_STAR &&
									state.balance >= CROWN_HYBRID_CASH
										? "pbtn"
										: "sbtn"
								}
								style={{
									marginLeft: 14,
									flexShrink: 0,
									fontSize: 11,
									padding: "7px 14px",
								}}
								onClick={enterCrownHybrid}
								disabled={
									state.starsBalance < CROWN_HYBRID_STAR ||
									state.balance < CROWN_HYBRID_CASH
								}
							>
								{t(lang, "hybridEntry").split("+")[0].trim()}
							</button>
						</div>
					</div>
				</div>

				{/* Weekly 100K Draw */}
				<div className="card" style={{ marginBottom: 13 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 10,
						}}
					>
						<div>
							<div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
								{t(lang, "weeklyDraw")} — 100,000 ETB
							</div>
							<div style={{ fontSize: 12, color: "var(--text2)" }}>
								{t(lang, "starsOnly")}. {t(lang, "everySaturday")}.
							</div>
						</div>
						<span className="tag tp">{t(lang, "everySaturday")}</span>
					</div>
					<div
						style={{
							background: "var(--bg)",
							borderRadius: 8,
							padding: "10px 12px",
							marginBottom: 10,
						}}
					>
						{[
							{ k: "Entry cost", v: `${WEEKLY_STAR_COST} ${t(lang, "stars")}` },
							{ k: "Prize pool", v: "100,000 ETB" },
							{ k: `Your ${t(lang, "stars")}`, v: String(state.starsBalance) },
						].map((r) => (
							<div
								key={r.k}
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: 12,
									marginBottom: 5,
								}}
							>
								<span style={{ color: "var(--text2)" }}>{r.k}</span>
								<span style={{ fontWeight: 500 }}>{r.v}</span>
							</div>
						))}
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								flex: 1,
								height: 6,
								background: "var(--border)",
								borderRadius: 3,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									height: "100%",
									width: `${weeklyPct}%`,
									background: "var(--purple)",
									borderRadius: 3,
									transition: "width .5s",
								}}
							/>
						</div>
						<button
							className={
								state.starsBalance >= WEEKLY_STAR_COST ? "pbtn" : "sbtn"
							}
							style={{ fontSize: 11, padding: "7px 14px", flexShrink: 0 }}
							onClick={() =>
								state.starsBalance >= WEEKLY_STAR_COST
									? enterWeekly()
									: goPage("weekly")
							}
						>
							{state.starsBalance >= WEEKLY_STAR_COST
								? t(lang, "enterWeeklyNow")
								: `${WEEKLY_STAR_COST - state.starsBalance} ${t(lang, "stars")} short`}
						</button>
					</div>
				</div>

				{/* Boosts */}
				<div className="card" style={{ marginBottom: 13 }}>
					<div
						style={{
							fontSize: 13,
							fontWeight: 500,
							marginBottom: 12,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<span>Boosts</span>
						{activeBoosts.length > 0 && (
							<span
								style={{
									fontSize: 11,
									color: "var(--text2)",
									fontWeight: 400,
								}}
							>
								{activeBoosts.length} active
							</span>
						)}
					</div>

					{/* Active boosts */}
					{activeBoosts.length > 0 && (
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: 7,
								marginBottom: 12,
							}}
						>
							{activeBoosts.map((b) => (
								<div
									key={b.type}
									style={{
										background: "var(--star-light)",
										borderRadius: 6,
										padding: "5px 10px",
										fontSize: 11,
										display: "flex",
										alignItems: "center",
										gap: 5,
										border: "1px solid var(--star)",
									}}
								>
									<i className={b.icon} />
									<span style={{ fontWeight: 500 }}>{b.label}</span>
									<span style={{ color: "var(--text2)" }}>
										{b.expiresAfter} left
									</span>
								</div>
							))}
						</div>
					)}

					<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
						{BOOST_OPTIONS.map((boost) => {
							const isActive = activeBoosts.some((b) => b.type === boost.type);
							const isLoading = activating === boost.type;
							return (
								<div
									key={boost.type}
									style={{
										background: "var(--bg)",
										borderRadius: 9,
										padding: "12px 14px",
										border: isActive
											? "1px solid var(--star)"
											: "0.5px solid var(--border)",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										opacity: isActive ? 0.7 : 1,
									}}
								>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontSize: 13,
												fontWeight: 500,
												marginBottom: 2,
												display: "flex",
												alignItems: "center",
												gap: 6,
											}}
										>
											<i className={boost.icon} />
											{boost.label}
										</div>
										<div style={{ fontSize: 11, color: "var(--text2)" }}>
											{boost.desc}
										</div>
									</div>
									<button
										className={isActive ? "sbtn" : "stbtn"}
										style={{
											marginLeft: 14,
											flexShrink: 0,
											fontSize: 11,
											padding: "7px 14px",
											minWidth: 65,
										}}
										disabled={isActive || isLoading}
										onClick={() => handleActivateBoost(boost.type, boost.cost)}
									>
										{isLoading
											? "..."

											: isActive
												? "Active"
												: `${boost.cost}★`}
									</button>
								</div>
							);
						})}
					</div>
				</div>

				{/* How to earn */}
				<div className="card">
					<div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
						{t(lang, "howToEarn")}
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
						{EARN_WAYS.map((w, i) => (
							<div
								key={w.action}
								style={{
									display: "flex",
									justifyContent: "space-between",
									padding: "9px 0",
									borderBottom:
										i < EARN_WAYS.length - 1
											? "0.5px solid var(--border)"
											: "none",
									fontSize: 12,
								}}
							>
								<span style={{ color: "var(--text2)" }}>{w.action}</span>
								<span style={{ fontWeight: 500, color: "var(--star-dark)" }}>
									{w.earn}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
