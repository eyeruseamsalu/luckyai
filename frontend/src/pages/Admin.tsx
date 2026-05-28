import { useCallback, useEffect, useState } from "react";
import type { AdminUser } from "../lib/api";
import * as api from "../lib/api";
import { useStore } from "../store";
import type { WeeklyDrawResult } from "../types";

type AdminTab =
	| "overview"
	| "users"
	| "draws"
	| "weekly"
	| "games"
	| "economy"
	| "config";

function activateUser(userId: string) {
	return fetch(
		`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/admin/users/${userId}/activate`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		},
	).then((r) => r.json());
}

export default function Admin() {
	const { state, goPage, setWeeklyDrawResult } = useStore();
	const [tab, setTab] = useState<AdminTab>("overview");
	const [toast, setToast] = useState<string | null>(null);

	// Overview
	const [overviewStats, setOverviewStats] = useState<Record<
		string,
		unknown
	> | null>(null);

	// Users
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [usersTotal, setUsersTotal] = useState(0);
	const [usersPage, setUsersPage] = useState(1);
	const [usersPages, setUsersPages] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");

	// Crown Draw
	const [crownDraws, setCrownDraws] = useState<Record<string, unknown>[]>([]);

	// Weekly Draw
	const [weeklyDraw, setWeeklyDraw] = useState<Record<string, unknown> | null>(
		null,
	);
	const [localDrawResult, setLocalDrawResult] = useState<Record<
		string,
		unknown
	> | null>(null);

	// Game Config
	const [spinCost, setSpinCost] = useState(5);
	const [scCost, setScCost] = useState(5);
	const [qpCost, setQpCost] = useState(2);
	const [cashCap, setCashCap] = useState(8);

	// Economy
	const [starRate, setStarRate] = useState(35);
	const [economyItems, setEconomyItems] = useState<Record<string, unknown>[]>(
		[],
	);

	// Platform Config
	const [platformConfig, setPlatformConfig] = useState<Record<string, unknown>>(
		{},
	);

	const showT = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 3000);
	}, []);

	const loadTabData = useCallback(
		async (t: AdminTab) => {
			try {
				switch (t) {
					case "overview": {
						const res = await api.getAdminOverview();
						setOverviewStats(res.stats);
						break;
					}
					case "users": {
						const res = await api.getAdminUsers({
							page: usersPage,
							search: searchQuery,
						});
						setUsers(res.users as AdminUser[]);
						setUsersTotal(res.total);
						setUsersPages(res.pages);
						break;
					}
					case "draws": {
						const res = await api.getAdminCrownDraws();
						setCrownDraws(res.draws as Record<string, unknown>[]);
						break;
					}
					case "weekly": {
						const res = await api.getAdminWeeklyDraw();
						setWeeklyDraw(res.draw as Record<string, unknown> | null);
						break;
					}
					case "games": {
						const res = await api.getGameConfig();
						const cfg = res.config as Record<string, unknown>;
						if (cfg.spinCost) setSpinCost(cfg.spinCost as number);
						if (cfg.scratchCost) setScCost(cfg.scratchCost as number);
						if (cfg.quickPlayCost) setQpCost(cfg.quickPlayCost as number);
						if (cfg.cashCapPlays) setCashCap(cfg.cashCapPlays as number);
						break;
					}
					case "economy": {
						const res = await api.getEconomyConfig();
						const cfg = res.config as Record<string, unknown>;
						setStarRate((cfg.starEarnRate as number) ?? 35);
						const itemsRes = await api.getEconomyItems();
						setEconomyItems(itemsRes.items as Record<string, unknown>[]);
						break;
					}
					case "config": {
						const res = await api.getPlatformConfig();
						setPlatformConfig(res.config as Record<string, unknown>);
						break;
					}
				}
			} catch {
				showT("Failed to load data");
			}
		},
		[usersPage, searchQuery, showT],
	);

	useEffect(() => {
		loadTabData(tab);
	}, [tab, loadTabData]);

	if (!state.isLoggedIn || state.userRole !== "admin") {
		return (
			<div className="pg on" id="p-admin">
				<div
					style={{ maxWidth: 400, margin: "40px auto", textAlign: "center" }}
				>
					<i
						className="ti ti-lock"
						style={{
							fontSize: 48,
							color: "var(--red)",
							display: "block",
							marginBottom: 12,
						}}
					/>
					<div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
						Admin access required
					</div>
					<div
						style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16 }}
					>
						Sign in with an admin account to access the control panel.
					</div>
					<button className="abtn" onClick={() => goPage("auth")}>
						Sign in
					</button>
				</div>
			</div>
		);
	}

	const TABS: { id: AdminTab; icon: string; label: string }[] = [
		{ id: "overview", icon: "ti-chart-bar", label: "Overview" },
		{ id: "users", icon: "ti-users", label: "Users" },
		{ id: "draws", icon: "ti-trophy", label: "Crown Draw" },
		{ id: "weekly", icon: "ti-calendar-stats", label: "Weekly Draw" },
		{ id: "games", icon: "ti-cards", label: "Games" },
		{ id: "economy", icon: "ti-star", label: "Stars Economy" },
		{ id: "config", icon: "ti-settings", label: "Config" },
	];

	const totalUsers = (overviewStats?.totalUsers as number) ?? 0;
	const totalRevenue = (overviewStats?.totalRevenue as number) ?? 0;
	const totalDraws = (overviewStats?.totalDraws as number) ?? 0;
	const activeGames = (overviewStats?.activeGames as number) ?? 0;
	const starsIssued = (overviewStats?.starsIssued as number) ?? 0;
	const starsRedeemed = (overviewStats?.starsRedeemed as number) ?? 0;

	return (
		<div className="pg on" id="p-admin">
			<div className="card" style={{ marginBottom: 13 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 9,
							background: "var(--purple-light)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--purple-dark)",
							fontSize: 18,
						}}
					>
						<i className="ti ti-settings" />
					</div>
					<div>
						<div style={{ fontSize: 14, fontWeight: 500 }}>Admin Panel</div>
						<div style={{ fontSize: 11, color: "var(--text2)" }}>
							Signed in as {state.userData.name} · Admin
						</div>
					</div>
					<span className="tag tp" style={{ marginLeft: "auto" }}>
						Full access
					</span>
				</div>
			</div>

			<div className="adm-wrap">
				<div className="adm-side">
					{TABS.map((t) => (
						<button
							key={t.id}
							className={`asb${tab === t.id ? " on" : ""}`}
							onClick={() => setTab(t.id)}
						>
							<i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
							{t.label}
						</button>
					))}
				</div>

				<div className="adm-main">
					{/* Overview */}
					{tab === "overview" && (
						<div>
							<div className="g4" style={{ marginBottom: 14 }}>
								{[
									{
										l: "Total users",
										v: totalUsers.toLocaleString(),
										s: `${(overviewStats?.recentActivity as unknown[])?.length ?? 0} recent transactions`,
										c: "tg",
									},
									{
										l: "Active games played",
										v: activeGames.toLocaleString(),
										s: "All time",
										c: "tp",
									},
									{
										l: "Revenue total",
										v: `${totalRevenue.toLocaleString()} ETB`,
										s: "All deposits",
										c: "ta",
									},
									{
										l: "Stars economy",
										v: `${starsIssued.toLocaleString()} ★`,
										s: `${starsRedeemed.toLocaleString()} ★ redeemed`,
										c: "ts-tag",
									},
								].map((m) => (
									<div key={m.l} className="mc">
										<div className="ml">{m.l}</div>
										<div className="mv" style={{ fontSize: 16 }}>
											{m.v}
										</div>
										<div className="ms">{m.s}</div>
									</div>
								))}
							</div>
							<div className="g2">
								<div className="card">
									<div className="sec">Total draws</div>
									<div
										style={{ fontSize: 24, fontWeight: 700, padding: "8px 0" }}
									>
										{totalDraws}
									</div>
								</div>
								<div className="card">
									<div className="sec">Stars economy</div>
									{[
										{
											k: "Stars earned",
											v: `${starsIssued.toLocaleString()} ★`,
										},
										{
											k: "Stars redeemed",
											v: `${starsRedeemed.toLocaleString()} ★`,
										},
									].map((r) => (
										<div
											key={r.k}
											style={{
												display: "flex",
												justifyContent: "space-between",
												padding: "7px 0",
												borderBottom: "0.5px solid var(--border)",
												fontSize: 12,
											}}
										>
											<span>{r.k}</span>
											<span
												style={{ fontWeight: 500, color: "var(--star-dark)" }}
											>
												{r.v}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Users */}
					{tab === "users" && (
						<div>
							<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
								<input
									type="text"
									placeholder="Search users…"
									style={{ flex: 1 }}
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") loadTabData("users");
									}}
								/>
								<button className="sbtn" onClick={() => loadTabData("users")}>
									Search
								</button>
							</div>
							<div style={{ overflowX: "auto" }}>
								<table
									style={{
										width: "100%",
										borderCollapse: "collapse",
										fontSize: 12,
									}}
								>
									<thead>
										<tr style={{ borderBottom: "0.5px solid var(--border)" }}>
											{[
												"User",
												"Balance",
												"Stars",
												"Plan",
												"Status",
												"Actions",
											].map((h) => (
												<th
													key={h}
													style={{
														textAlign: "left",
														padding: "7px 8px",
														fontSize: 10,
														color: "var(--text2)",
														fontWeight: 500,
													}}
												>
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{users.map((u) => {
											const isSuspended =
												(u as unknown as Record<string, unknown>).status === "suspended";
											return (
												<tr
													key={u._id}
													style={{ borderBottom: "0.5px solid var(--border)" }}
												>
													<td style={{ padding: "8px 8px" }}>
														<div style={{ fontWeight: 500 }}>{u.name}</div>
														<div
															style={{ fontSize: 10, color: "var(--text3)" }}
														>
															{u.email}
														</div>
													</td>
													<td style={{ padding: "8px 8px" }}>
														{u.balance.toLocaleString()} ETB
													</td>
													<td
														style={{
															padding: "8px 8px",
															color: "var(--star-dark)",
														}}
													>
														{u.starsBalance} ★
													</td>
													<td style={{ padding: "8px 8px" }}>
														<span
															className={`tag ${u.isPremium ? "ta" : "tn"}`}
														>
															{u.isPremium ? "Premium" : "Free"}
														</span>
													</td>
													<td style={{ padding: "8px 8px" }}>
														<span
															className={`tag ${isSuspended ? "tr" : "tg"}`}
														>
															{isSuspended ? "Suspended" : "Active"}
														</span>
													</td>
													<td style={{ padding: "8px 8px" }}>
														{isSuspended ? (
															<button
																className="sbtn"
																style={{ fontSize: 10, padding: "3px 7px" }}
																onClick={async () => {
																	await activateUser(u._id);
																	showT(`${u.name} activated`);
																	loadTabData("users");
																}}
															>
																Activate
															</button>
														) : (
															<button
																className="dbtn"
																style={{ fontSize: 10, padding: "3px 7px" }}
																onClick={async () => {
																	await api.suspendUser(u._id);
																	showT(`${u.name} suspended`);
																	loadTabData("users");
																}}
															>
																Suspend
															</button>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
							{usersPages > 1 && (
								<div
									style={{
										display: "flex",
										justifyContent: "center",
										gap: 8,
										marginTop: 12,
									}}
								>
									<button
										className="sbtn"
										disabled={usersPage <= 1}
										onClick={() => {
											setUsersPage((p) => Math.max(1, p - 1));
										}}
									>
										Prev
									</button>
									<span style={{ fontSize: 12, alignSelf: "center" }}>
										Page {usersPage} of {usersPages}
									</span>
									<button
										className="sbtn"
										disabled={usersPage >= usersPages}
										onClick={() => {
											setUsersPage((p) => p + 1);
										}}
									>
										Next
									</button>
								</div>
							)}
						</div>
					)}

					{/* Crown Draws */}
					{tab === "draws" && (
						<div>
							<div className="sec" style={{ marginBottom: 12 }}>
								Crown Draw management
							</div>
							{crownDraws.length === 0 && (
								<div
									className="card"
									style={{
										textAlign: "center",
										color: "var(--text2)",
										fontSize: 12,
										padding: 24,
										marginBottom: 12,
									}}
								>
									No draws yet — create one to get started
								</div>
							)}
							{crownDraws.map((draw) => {
								const d = draw as Record<string, unknown>;
								const status = d.status as string;
								return (
									<div
										key={d._id as string}
										className="card"
										style={{ marginBottom: 12 }}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												marginBottom: 10,
											}}
										>
											<div style={{ fontWeight: 500 }}>{d.name as string}</div>
											<span
												className={`tag ${status === "active" ? "ta" : status === "completed" ? "tg" : "tr"}`}
											>
												{status}
											</span>
										</div>
										{[
											[
												"Jackpot",
												`${(d.jackpotAmount as number)?.toLocaleString()} ETB`,
											],
											["Entries", (d.entryCount as number)?.toLocaleString()],
											["Ticket price", `${d.ticketPriceETB as number} ETB`],
											["Star entry cost", `${d.starEntryCost as number} ★`],
											[
												"Draw date",
												new Date(d.drawDate as string).toLocaleDateString(),
											],
											...(d.winningNumbers
												? [
														[
															"Winning numbers",
															(d.winningNumbers as number[]).join(", "),
														] as [string, string],
													]
												: []),
											...(d.winners
												? [["Winners", String(d.winners)] as [string, string]]
												: []),
										].map(([k, v]) => (
											<div
												key={k}
												style={{
													display: "flex",
													justifyContent: "space-between",
													padding: "6px 0",
													borderBottom: "0.5px solid var(--border)",
													fontSize: 12,
												}}
											>
												<span style={{ color: "var(--text2)" }}>{k}</span>
												<span style={{ fontWeight: 500 }}>{v}</span>
											</div>
										))}
										{status === "active" && (
											<div style={{ display: "flex", gap: 8, marginTop: 12 }}>
												<button
													className="sbtn"
													onClick={async () => {
														const name = prompt("New name:", d.name as string);
														if (!name) return;
														await api.editCrownDraw(d._id as string, { name });
														showT("Draw updated");
														loadTabData("draws");
													}}
												>
													Edit
												</button>
												<button
													className="abtn"
													style={{ background: "var(--purple)" }}
													onClick={async () => {
														if (!confirm("Run this draw now?")) return;
														try {
															const res = await api.runCrownDraw(
																d._id as string,
															);
															showT(
																`Draw complete! Winners: ${(res.result as Record<string, unknown>)?.winners as number}`,
															);
															loadTabData("draws");
														} catch {
															showT("Failed to run draw");
														}
													}}
												>
													Run draw now
												</button>
												<button
													className="dbtn"
													onClick={async () => {
														if (!confirm("Cancel this draw?")) return;
														await api.cancelCrownDraw(d._id as string);
														showT("Draw cancelled");
														loadTabData("draws");
													}}
												>
													Cancel
												</button>
											</div>
										)}
									</div>
								);
							})}
							<button
								className="abtn"
								onClick={async () => {
									const name = prompt("Draw name:");
									if (!name) return;
									const jackpot = prompt("Jackpot amount (ETB):", "500000");
									if (!jackpot) return;
									const days = prompt("Days until draw:", "30");
									if (!days) return;
									const drawDate = new Date(
										Date.now() + Number(days) * 24 * 60 * 60 * 1000,
									).toISOString();
									try {
										await api.createCrownDraw({
											name,
											jackpotAmount: Number(jackpot),
											drawDate,
										});
										showT("New draw created!");
										loadTabData("draws");
									} catch {
										showT("Failed to create draw");
									}
								}}
							>
								+ Schedule new draw
							</button>
							{toast && (
								<div className="toast ts" style={{ marginTop: 10 }}>
									{toast}
								</div>
							)}
						</div>
					)}

					{/* Weekly Draw */}
					{tab === "weekly" && (
						<div>
							<div className="g4" style={{ marginBottom: 14 }}>
								{[
									{
										l: "Round",
										v: String((weeklyDraw?.round as number) ?? "-"),
									},
									{
										l: "Status",
										v: (weeklyDraw?.status as string) ?? "N/A",
									},
									{
										l: "Prize pool",
										v: `${((weeklyDraw?.prizePoolETB as number) ?? 0).toLocaleString()} ETB`,
									},
									{
										l: "Entry cost",
										v: `${(weeklyDraw?.entryCostStars as number) ?? 0} ★`,
									},
								].map((m) => (
									<div key={m.l} className="mc">
										<div className="ml">{m.l}</div>
										<div className="mv" style={{ fontSize: 16 }}>
											{m.v}
										</div>
									</div>
								))}
							</div>

							<div className="card" style={{ marginBottom: 13 }}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: 10,
									}}
								>
									<div>
										<div style={{ fontWeight: 500 }}>
											{weeklyDraw
												? `Round ${weeklyDraw.round as number} — ${(weeklyDraw.prizePoolETB as number).toLocaleString()} ETB Draw`
												: "No active weekly draw"}
										</div>
										<div style={{ fontSize: 11, color: "var(--text2)" }}>
											Stars only —{" "}
											{(weeklyDraw?.entryCostStars as number) ?? 800} Stars per
											entry — Pick 6 of 42
										</div>
									</div>
									<span
										className={`tag ${weeklyDraw?.status === "open" ? "ta" : "tn"}`}
									>
										{(weeklyDraw?.status as string) ?? "N/A"}
									</span>
								</div>

								{localDrawResult && (
									<div
										style={{
											padding: "12px 14px",
											background: "var(--purple-light)",
											borderRadius: 9,
											marginBottom: 12,
										}}
									>
										<div
											style={{
												fontSize: 10,
												fontWeight: 700,
												color: "var(--purple-dark)",
												letterSpacing: 1,
												marginBottom: 8,
											}}
										>
											WINNING NUMBERS
										</div>
										<div
											style={{
												display: "flex",
												gap: 7,
												flexWrap: "wrap",
												marginBottom: 8,
											}}
										>
											{(localDrawResult.winningNumbers as number[])?.map(
												(n: number) => (
													<span
														key={n}
														style={{
															width: 38,
															height: 38,
															borderRadius: 8,
															background: "var(--purple)",
															color: "#fff",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															fontWeight: 700,
															fontSize: 13,
														}}
													>
														{String(n).padStart(2, "0")}
													</span>
												),
											)}
										</div>
										<div
											style={{
												fontSize: 11,
												color: "var(--purple-dark)",
												fontWeight: 500,
											}}
										>
											{(localDrawResult.winners as number) === 0
												? "No jackpot winners — prize rolls over"
												: `${localDrawResult.winners as number} jackpot winner${(localDrawResult.winners as number) > 1 ? "s" : ""}`}
										</div>
									</div>
								)}

								<div style={{ display: "flex", gap: 8 }}>
									<button
										className="abtn"
										style={{ background: "var(--purple)" }}
										onClick={async () => {
											if (!weeklyDraw) {
												showT("No active weekly draw — create one first");
												return;
											}
											if (!confirm("Run the weekly draw now?")) return;
											try {
												const res = await api.runWeeklyDraw(
													weeklyDraw.round as number,
												);
												setLocalDrawResult(
													res.result as Record<string, unknown>,
												);
												setWeeklyDrawResult(
													res.result as unknown as WeeklyDrawResult,
												);
												showT("Draw complete!");
												loadTabData("weekly");
											} catch {
												showT("Failed to run draw");
											}
										}}
									>
										<i className="ti ti-bolt" style={{ marginRight: 5 }} />
										Run draw now
									</button>
									<button
										className="sbtn"
										onClick={async () => {
											try {
												await api.createWeeklyDraw({});
												showT("New weekly draw round created!");
												loadTabData("weekly");
											} catch {
												showT("Failed to create weekly draw");
											}
										}}
									>
										New round
									</button>
									{localDrawResult && (
										<button
											className="sbtn"
											onClick={() => setLocalDrawResult(null)}
										>
											Reset
										</button>
									)}
								</div>
							</div>
							{toast && (
								<div className="toast ts" style={{ marginTop: 10 }}>
									{toast}
								</div>
							)}
						</div>
					)}

					{/* Games */}
					{tab === "games" && (
						<div>
							<div className="sec" style={{ marginBottom: 12 }}>
								Game configuration
							</div>
							{[
								{
									l: "Spin cost (ETB)",
									v: spinCost,
									set: setSpinCost,
									min: 1,
									max: 100,
								},
								{
									l: "Scratch cost (ETB)",
									v: scCost,
									set: setScCost,
									min: 1,
									max: 100,
								},
								{
									l: "Quick play cost (ETB)",
									v: qpCost,
									set: setQpCost,
									min: 1,
									max: 50,
								},
								{
									l: "Cash cap (plays/day)",
									v: cashCap,
									set: setCashCap,
									min: 1,
									max: 50,
								},
							].map((r) => (
								<div key={r.l}>
									<div className="flbl" style={{ marginBottom: 6 }}>
										{r.l}
									</div>
									<div className="sl-row">
										<input
											type="range"
											min={r.min}
											max={r.max}
											value={r.v}
											onChange={(e) => r.set(Number(e.target.value))}
										/>
										<div className="sl-val">
											{r.v} {r.l.includes("cap") ? "plays" : "ETB"}
										</div>
									</div>
								</div>
							))}
							<button
								className="abtn"
								style={{ marginTop: 8 }}
								onClick={async () => {
									try {
										await api.updateGameConfig({
											spinCost,
											scratchCost: scCost,
											quickPlayCost: qpCost,
											cashCapPlays: cashCap,
										});
										showT("Game settings saved!");
									} catch {
										showT("Failed to save game settings");
									}
								}}
							>
								Save settings
							</button>
							{toast && (
								<div className="toast ts" style={{ marginTop: 8 }}>
									{toast}
								</div>
							)}
						</div>
					)}

					{/* Stars Economy */}
					{tab === "economy" && (
						<div>
							<div className="sec" style={{ marginBottom: 12 }}>
								Stars economy tuning
							</div>
							<div className="frow">
								<label className="flbl" htmlFor="star-rate">
									Stars earned per play (base)
								</label>
								<div className="sl-row">
									<input
										type="range"
										id="star-rate"
										min={5}
										max={200}
										value={starRate}
										onChange={(e) => setStarRate(Number(e.target.value))}
									/>
									<div className="sl-val">{starRate} ★</div>
								</div>
							</div>
							<div className="sec" style={{ marginBottom: 8, marginTop: 12 }}>
								Store item costs
							</div>
							{economyItems.map((item) => (
								<div
									key={item.key as string}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										marginBottom: 10,
									}}
								>
									<span style={{ flex: 1, fontSize: 12 }}>
										{item.name as string}
									</span>
									<input
										type="number"
										defaultValue={item.starCost as number}
										style={{ width: 80 }}
										id={`item-${item.key as string}`}
									/>
									<span style={{ fontSize: 11, color: "var(--text2)" }}>★</span>
									<button
										className="sbtn"
										style={{ fontSize: 10, padding: "3px 7px" }}
										onClick={async () => {
											const input = document.getElementById(
												`item-${item.key as string}`,
											) as HTMLInputElement;
											const cost = Number(input.value);
											if (Number.isNaN(cost) || cost < 0) {
												showT("Invalid cost");
												return;
											}
											try {
												await api.updateItemCost(item.key as string, cost);
												showT(`${item.name as string} cost updated`);
											} catch {
												showT("Failed to update cost");
											}
										}}
									>
										Update
									</button>
								</div>
							))}
							<button
								className="abtn"
								onClick={async () => {
									try {
										await api.updateStarRate(starRate);
										showT("Star rate updated!");
									} catch {
										showT("Failed to update star rate");
									}
								}}
							>
								Save star rate
							</button>
							{toast && (
								<div className="toast ts" style={{ marginTop: 8 }}>
									{toast}
								</div>
							)}
						</div>
					)}

					{/* Config */}
					{tab === "config" && (
						<div>
							<div className="sec" style={{ marginBottom: 12 }}>
								Platform configuration
							</div>
							{[
								{
									l: "Platform name",
									k: "platformName",
									v: (platformConfig.platformName as string) ?? "LuckyAI",
								},
								{
									l: "Support email",
									k: "supportEmail",
									v:
										(platformConfig.supportEmail as string) ??
										"support@luckyai.et",
								},
								{
									l: "Withdrawal min (ETB)",
									k: "withdrawalMinETB",
									v: String(platformConfig.withdrawalMinETB ?? "50"),
								},
								{
									l: "Max deposit (ETB)",
									k: "maxDepositETB",
									v: String(platformConfig.maxDepositETB ?? "50000"),
								},
							].map((r) => (
								<div key={r.l} className="frow">
									<label className="flbl">{r.l}</label>
									<input type="text" defaultValue={r.v} id={`cfg-${r.k}`} />
								</div>
							))}
							<button
								className="abtn"
								onClick={async () => {
									const getVal = (k: string) =>
										(document.getElementById(`cfg-${k}`) as HTMLInputElement)
											.value;
									const updates: Record<string, unknown> = {
										platformName: getVal("platformName"),
										supportEmail: getVal("supportEmail"),
										withdrawalMinETB: Number(getVal("withdrawalMinETB")),
										maxDepositETB: Number(getVal("maxDepositETB")),
									};
									try {
										await api.updatePlatformConfig(updates);
										showT("Configuration saved!");
										loadTabData("config");
									} catch {
										showT("Failed to save configuration");
									}
								}}
							>
								Save configuration
							</button>
							{toast && (
								<div className="toast ts" style={{ marginTop: 10 }}>
									{toast}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
