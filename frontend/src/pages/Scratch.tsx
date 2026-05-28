import { useState } from "react";
import { toast } from "sonner";
import { playGame } from "@/lib/api";
import BonusMode from "../components/BonusMode";
import { useStore } from "../store";
import { t } from "../translations";

const CARD_NAMES = [
	"Timkat",
	"Meskel",
	"Fasika",
	"Enkutatash",
	"Genna",
	"Adwa",
	"Lalibela",
	"Axum",
	"Gondar",
	"Harar",
	"Tiya",
	"Yeha",
	"Bale",
	"Simien",
	"Omo",
	"Abay",
	"Awash",
	"Debre",
	"Rift",
	"Gambela",
];

interface Prize {
	tier: "high" | "mid" | "asset";
	headline: string;
	sub: string;
	cash?: number;
	stars: number;
	boostLabel?: string;
}

const COST_OPTIONS = [5, 10, 25, 50];

function nameForIndex(setKey: number, idx: number) {
	return CARD_NAMES[(setKey * 9 + idx) % CARD_NAMES.length];
}

interface CardProps {
	index: number;
	setKey: number;
	cost: number;
	onReveal: (p: Prize) => void;
}

function ScratchCard({ index, setKey, cost, onReveal }: CardProps) {
	const store = useStore();
	const [revealed, setRevealed] = useState(false);
	const [prize, setPrize] = useState<Prize | null>(null);
	const [playing, setPlaying] = useState(false);
	const name = nameForIndex(setKey, index);
	const lang = store.lang;

	const reveal = async () => {
		if (revealed || playing) return;
		if (store.state.balance < cost) return;
		setPlaying(true);
		try {
			const res = (await playGame("scratch", { cost })) as unknown as {
				success: boolean;
				prize: Prize;
				wonCash: number;
				wonStars: number;
				newBalance: number;
				newStarsBalance: number;
				cashCapHit: boolean;
			};
			const p = res.prize;
			setPrize(p);
			store.addTransaction(
				`Scratch card — ${name} (${cost} ETB)`,
				-cost,
				"out",
			);
			if (res.wonCash > 0) {
				store.addBalance(res.wonCash);
				store.addTransaction(`Scratch Win — ${name}`, res.wonCash, "in");
			}
			if (res.wonStars > 0) {
				store.addStars(res.wonStars);
				store.addTransaction(
					`Scratch Win Stars — ${name}`,
					res.wonStars,
					"star",
				);
			}
			if (p.tier === "asset" && p.boostLabel) {
				const boostType = p.boostLabel.includes("2x")
					? "multiplier"
					: p.boostLabel.includes("Loss")
						? "lossProtection"
						: "premiumDay";
				store.addBoost({
					type: boostType,
					label: p.boostLabel,
					icon: "ti-star",
					expiresAfter: 5,
				});
			}
			store.recordPlay();
			setRevealed(true);
			onReveal(p);
		} catch {
			toast.error("Failed to play");
		} finally {
			setPlaying(false);
		}
	};

	if (!revealed || !prize) {
		if (!prize) {
			const canAfford = store.state.balance >= cost;
			return (
				<div
					onClick={reveal}
					style={{
						borderRadius: 16,
						background: canAfford ? "#EEEDFE" : "var(--bg)",
						border: `1.5px solid ${canAfford ? "#C4BEFA" : "var(--border2)"}`,
						cursor: playing ? "wait" : canAfford ? "pointer" : "not-allowed",
						padding: "18px 14px",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						minHeight: 148,
						transition: "box-shadow .15s, transform .1s",
						userSelect: "none",
					}}
					onMouseEnter={(e) => {
						if (canAfford && !playing) {
							(e.currentTarget as HTMLDivElement).style.boxShadow =
								"0 4px 18px rgba(124,100,230,.18)";
							(e.currentTarget as HTMLDivElement).style.transform =
								"translateY(-2px)";
						}
					}}
					onMouseLeave={(e) => {
						(e.currentTarget as HTMLDivElement).style.boxShadow = "none";
						(e.currentTarget as HTMLDivElement).style.transform =
							"translateY(0)";
					}}
				>
					<div
						style={{
							fontSize: 10,
							color: "#8F87CC",
							fontWeight: 500,
							marginBottom: 10,
							alignSelf: "flex-start",
						}}
					>
						{name}
					</div>
					<div
						style={{
							fontSize: 40,
							color: "#7B68EE",
							fontWeight: 700,
							lineHeight: 1,
							marginBottom: 10,
						}}
					>
						{playing ? "..." : "?"}
					</div>
					<div
						style={{
							fontSize: 11,
							color: canAfford ? "#8F87CC" : "var(--text3)",
							textAlign: "center",
						}}
					>
						{playing
							? "Revealing..."
							: canAfford
								? t(lang, "clickReveal")
								: "Insufficient balance"}
					</div>
					{canAfford && !playing && (
						<div
							style={{
								marginTop: 8,
								fontSize: 10,
								color: "#AAA4DD",
								background: "rgba(255,255,255,.5)",
								borderRadius: 5,
								padding: "2px 8px",
							}}
						>
							{cost} ETB
						</div>
					)}
				</div>
			);
		}
		return null;
	}

	const tierColor = {
		high: "var(--amber-dark)",
		mid: "var(--green-dark)",
		asset: "var(--purple-dark)",
	}[prize.tier];
	const tierBg = {
		high: "var(--amber-light)",
		mid: "var(--green-light)",
		asset: "var(--purple-light)",
	}[prize.tier];
	const tierBorder = {
		high: "var(--amber)",
		mid: "var(--green)",
		asset: "var(--purple)",
	}[prize.tier];

	return (
		<div
			style={{
				borderRadius: 16,
				background: tierBg,
				border: `1.5px solid ${tierBorder}`,
				padding: "16px 14px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: 148,
				animation: "pgIn .25s ease",
			}}
		>
			<div
				style={{
					fontSize: 10,
					color: tierColor,
					fontWeight: 500,
					marginBottom: 8,
					opacity: 0.7,
					alignSelf: "flex-start",
				}}
			>
				{name}
			</div>
			<div
				style={{
					fontSize: 12,
					fontWeight: 600,
					color: tierColor,
					textAlign: "center",
					marginBottom: 5,
				}}
			>
				{prize.headline}
			</div>
			<div
				style={{
					fontSize: 10,
					color: tierColor,
					opacity: 0.8,
					textAlign: "center",
					lineHeight: 1.4,
					marginBottom: 8,
				}}
			>
				{prize.sub}
			</div>
			<div
				style={{
					display: "flex",
					gap: 4,
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				{prize.cash && !store.state.cashCapHit && (
					<span className="tag tg" style={{ fontSize: 9 }}>
						+{prize.cash} ETB
					</span>
				)}
				<span className="ts-tag tag" style={{ fontSize: 9 }}>
					+{prize.stars} {t(lang, "stars")}
				</span>
				{prize.boostLabel && (
					<span className="tag tt" style={{ fontSize: 9 }}>
						{prize.boostLabel}
					</span>
				)}
			</div>
		</div>
	);
}

export default function Scratch() {
	const { state, lang, goPage } = useStore();
	const [cost, setCost] = useState(5);
	const [setKey, setSetKey] = useState(0);
	const [lastPrize, setLastPrize] = useState<Prize | null>(null);
	const [revealedCount, setRevealedCount] = useState(0);

	const handleReveal = (p: Prize) => {
		setLastPrize(p);
		setRevealedCount((n) => n + 1);
	};

	const newSet = () => {
		setSetKey((k) => k + 1);
		setLastPrize(null);
		setRevealedCount(0);
	};

	return (
		<div className="pg on" id="p-scratch">
			<BonusMode />
			<div style={{ maxWidth: 700, margin: "0 auto" }}>
				{/* Header */}
				<div className="card" style={{ marginBottom: 13 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 11,
						}}
					>
						<div>
							<div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
								{t(lang, "scratchAndWin")}
							</div>
							<div style={{ fontSize: 12, color: "var(--text2)" }}>
								{t(lang, "clickReveal")} — {t(lang, "pickACard").toLowerCase()}.
								Every card has a reward.
							</div>
						</div>
						<span className="pill p-amber">
							{Math.round(state.balance).toLocaleString()} ETB
						</span>
					</div>
					<div style={{ display: "flex", gap: 7 }}>
						{COST_OPTIONS.map((c) => (
							<button
								key={c}
								className={cost === c ? "abtn" : "sbtn"}
								style={{ flex: 1, padding: "6px 0", fontSize: 12 }}
								onClick={() => {
									setCost(c);
									newSet();
								}}
							>
								{c} ETB
							</button>
						))}
					</div>
				</div>

				{/* Latest prize banner */}
				{lastPrize && (
					<div
						style={{
							background: {
								high: "var(--amber-light)",
								mid: "var(--green-light)",
								asset: "var(--purple-light)",
							}[lastPrize.tier],
							border: `1px solid ${{ high: "var(--amber)", mid: "var(--green)", asset: "var(--purple)" }[lastPrize.tier]}`,
							borderRadius: 10,
							padding: "10px 14px",
							marginBottom: 13,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							animation: "pgIn .3s ease",
						}}
					>
						<div>
							<div
								style={{
									fontSize: 13,
									fontWeight: 600,
									color: {
										high: "var(--amber-dark)",
										mid: "var(--green-dark)",
										asset: "var(--purple-dark)",
									}[lastPrize.tier],
								}}
							>
								{lastPrize.headline}
							</div>
							<div
								style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}
							>
								{lastPrize.sub}
							</div>
						</div>
						<div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
							<div style={{ fontSize: 10, color: "var(--text2)" }}>
								{t(lang, "totalRevealed")}
							</div>
							<div style={{ fontSize: 18, fontWeight: 600 }}>
								{revealedCount}
							</div>
						</div>
					</div>
				)}

				{/* 3x3 card grid */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3, 1fr)",
						gap: 10,
						marginBottom: 13,
					}}
				>
					{Array.from({ length: 9 }, (_, i) => (
						<ScratchCard
							key={`${setKey}-${i}`}
							index={i}
							setKey={setKey}
							cost={cost}
							onReveal={handleReveal}
						/>
					))}
				</div>

				{/* Actions */}
				<div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
					<button
						className="abtn"
						style={{ flex: 1, padding: 9 }}
						onClick={newSet}
					>
						{t(lang, "newCards")} (9)
					</button>
					<button className="sbtn" onClick={() => goPage("wallet")}>
						Top up
					</button>
					<button className="sbtn" onClick={() => goPage("stars")}>
						{t(lang, "stars")}
					</button>
				</div>

				{/* How it works */}
				<div className="card">
					<div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
						{t(lang, "howItWorks")}
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(4,1fr)",
							gap: 8,
						}}
					>
						{[
							[
								t(lang, "pickACard"),
								"Pay the card cost to activate and reveal your prize",
							],
							[
								"Instant reveal",
								"Prize shows immediately — cash, Stars, or a boost",
							],
							[
								"Every card wins",
								"No blank cards. Every card reveals something",
							],
							[
								t(lang, "starsHub"),
								"Stars from every card count toward Crown Draw entries",
							],
						].map(([title, desc]) => (
							<div
								key={title as string}
								style={{
									background: "var(--bg)",
									borderRadius: 8,
									padding: 9,
									textAlign: "center",
								}}
							>
								<div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
									{title}
								</div>
								<div
									style={{
										fontSize: 10,
										color: "var(--text2)",
										lineHeight: 1.5,
									}}
								>
									{desc}
								</div>
							</div>
						))}
					</div>
					<div style={{ marginTop: 9, fontSize: 11, color: "var(--text2)" }}>
						{state.cashCapHit
							? "Bonus Mode active — cash wins convert to Stars automatically."
							: `Cash plays today: ${state.playsToday}/8`}
					</div>
				</div>
			</div>
		</div>
	);
}
