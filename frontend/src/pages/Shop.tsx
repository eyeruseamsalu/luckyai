import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getShopItems, purchaseItem } from "../lib/api";
import { toast } from "sonner";

interface ShopItemData {
	_id: string;
	key: string;
	name: string;
	starCost: number;
	type: "boost" | "ticket" | "premium" | "mystery";
	description: string;
	active: boolean;
}

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
	boost: { label: "Boost", cls: "tag tb" },
	ticket: { label: "Ticket", cls: "tag tp" },
	premium: { label: "Premium", cls: "tag tg" },
	mystery: { label: "Mystery", cls: "tag ta" },
};

export default function Shop() {
	const { state, spendStars, addStars, addBoost, addTicket, setPremium, refreshUser } =
		useStore();
	const [items, setItems] = useState<ShopItemData[]>([]);
	const [loading, setLoading] = useState(true);
	const [purchasing, setPurchasing] = useState<string | null>(null);

	useEffect(() => {
		getShopItems()
			.then((res) => {
				const raw = res.items as unknown as ShopItemData[];
				setItems(raw);
			})
			.catch(() => {
				toast.error("Failed to load shop items");
			})
			.finally(() => setLoading(false));
	}, []);

	const handlePurchase = async (item: ShopItemData) => {
		if (state.starsBalance < item.starCost) {
			toast.error(`Need ${item.starCost - state.starsBalance} more Stars`);
			return;
		}

		setPurchasing(item.key);

		const ok = spendStars(item.starCost);
		if (!ok) {
			toast.error("Insufficient Stars");
			setPurchasing(null);
			return;
		}

		try {
			const res = await purchaseItem(item.key);
			const data = res as unknown as {
				success: boolean;
				itemKey: string;
				newStarsBalance: number;
				mysteryWon?: number;
			};

			if (item.type === "boost") {
				addBoost({
					type: item.key as "multiplier" | "lossProtection" | "premiumDay",
					label: item.name,
					icon: item.key === "multiplier" ? "ti-bolt" : "ti-shield",
					expiresAfter: item.key === "multiplier" ? 5 : 1,
				});
			} else if (item.type === "ticket") {
				addTicket();
			} else if (item.type === "premium") {
				setPremium();
			}

			if (data.mysteryWon !== undefined) {
				addStars(data.mysteryWon);
				toast.success(
					`Mystery Box revealed — ${data.mysteryWon} ★ !`,
				);
			} else {
				toast.success(`${item.name} purchased!`);
			}

			refreshUser();
		} catch (err) {
			addStars(item.starCost);
			toast.error(
				err instanceof Error ? err.message : "Purchase failed",
			);
		} finally {
			setPurchasing(null);
		}
	};

	return (
		<div className="pg on" id="p-shop">
			<div style={{ maxWidth: 680, margin: "0 auto" }}>
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
								Your Stars
							</div>
							<div
								style={{
									fontSize: 32,
									fontWeight: 700,
									color: "var(--star-dark)",
								}}
							>
								{state.starsBalance.toLocaleString()} ★
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
								Tickets
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
				</div>

				{loading ? (
					<div
						className="card"
						style={{ textAlign: "center", color: "var(--text2)", padding: 24 }}
					>
						Loading shop...
					</div>
				) : items.length === 0 ? (
					<div
						className="card"
						style={{ textAlign: "center", color: "var(--text2)", padding: 24 }}
					>
						No items available
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						{items.map((item) => {
							const badge = TYPE_BADGES[item.type] ?? {
								label: item.type,
								cls: "tag ts",
							};
							const canAfford = state.starsBalance >= item.starCost;
							const isBuying = purchasing === item.key;

							return (
								<div
									key={item._id}
									className="card"
									style={{
										display: "flex",
										alignItems: "center",
										gap: 14,
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												marginBottom: 4,
											}}
										>
											<span
												style={{
													fontSize: 14,
													fontWeight: 600,
												}}
											>
												{item.name}
											</span>
											<span className={badge.cls}>{badge.label}</span>
										</div>
										<div
											style={{
												fontSize: 12,
												color: "var(--text2)",
												lineHeight: 1.4,
											}}
										>
											{item.description}
										</div>
									</div>

									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 10,
											flexShrink: 0,
										}}
									>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: "var(--star-dark)",
												whiteSpace: "nowrap",
											}}
										>
											{item.starCost.toLocaleString()} ★
										</div>
										<button
											className={canAfford ? "stbtn" : "sbtn"}
											style={{
												fontSize: 11,
												padding: "7px 14px",
												minWidth: 70,
											}}
											disabled={!canAfford || isBuying}
											onClick={() => handlePurchase(item)}
										>
											{isBuying
												? "..."
												: canAfford
													? "Buy"
													: `${item.starCost - state.starsBalance} short`}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
