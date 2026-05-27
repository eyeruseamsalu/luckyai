import { useEffect, useState } from "react";
import type { NotificationItem } from "../lib/api";
import * as api from "../lib/api";
import { useStore } from "../store";

function formatDate(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const diff = now.getTime() - d.getTime();
	if (diff < 60000) return "Just now";
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
	return d.toLocaleDateString();
}

export default function Notifications() {
	const { state } = useStore();
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!state.isLoggedIn) {
			setLoading(false);
			return;
		}
		api
			.getNotifications()
			.then((res) => setNotifications(res.notifications))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [state.isLoggedIn]);

	const unread = notifications.filter((n) => !n.read).length;

	const iconColor: Record<string, string> = {
		ta: "var(--amber-light)",
		tp: "var(--purple-light)",
		tg: "var(--green-light)",
		ts: "var(--teal-light)",
	};
	const textColor: Record<string, string> = {
		ta: "var(--amber-dark)",
		tp: "var(--purple-dark)",
		tg: "var(--green-dark)",
		ts: "var(--teal-dark)",
	};

	return (
		<div className="pg on" id="p-notif">
			<div style={{ maxWidth: 520, margin: "0 auto" }}>
				<div className="card">
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 14,
						}}
					>
						<div>
							<div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
								Notifications
							</div>
							<div style={{ fontSize: 12, color: "var(--text2)" }}>
								{unread > 0
									? `${unread} unread`
									: loading
										? "Loading..."
										: "All caught up!"}
							</div>
						</div>
					</div>

					{loading ? (
						<div
							style={{
								textAlign: "center",
								padding: "32px 0",
								fontSize: 12,
								color: "var(--text2)",
							}}
						>
							Loading notifications...
						</div>
					) : notifications.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								padding: "32px 0",
								fontSize: 12,
								color: "var(--text2)",
							}}
						>
							<i
								className="ti ti-bell-off"
								style={{
									fontSize: 32,
									display: "block",
									marginBottom: 10,
									color: "var(--text3)",
								}}
							/>
							No notifications yet — start playing to get updates!
						</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
							{notifications.map((n, i) => (
								<div
									key={n._id || i}
									style={{
										display: "flex",
										alignItems: "flex-start",
										gap: 11,
										padding: "11px 0",
										borderBottom:
											i < notifications.length - 1
												? "0.5px solid var(--border)"
												: "none",
										background: n.read ? "transparent" : "transparent",
									}}
								>
									<div
										style={{
											width: 34,
											height: 34,
											borderRadius: 9,
											flexShrink: 0,
											background: iconColor[n.color] || "var(--bg)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: 16,
											color: textColor[n.color] || "var(--text2)",
										}}
									>
										<i className={`ti ${n.icon}`} />
									</div>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontSize: 12,
												lineHeight: 1.5,
												fontWeight: n.read ? 400 : 500,
												marginBottom: 2,
											}}
										>
											{n.msg}
										</div>
										<div style={{ fontSize: 10, color: "var(--text3)" }}>
											{formatDate(n.createdAt)}
										</div>
									</div>
									{!n.read && (
										<div
											style={{
												width: 8,
												height: 8,
												borderRadius: "50%",
												background: "var(--amber)",
												flexShrink: 0,
												marginTop: 5,
											}}
										/>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{notifications.length > 0 && (
					<div
						style={{
							textAlign: "center",
							marginTop: 12,
							fontSize: 11,
							color: "var(--text2)",
						}}
					>
						Showing {notifications.length} notification
						{notifications.length !== 1 ? "s" : ""} · Notifications are cleared
						after 30 days
					</div>
				)}
			</div>
		</div>
	);
}
