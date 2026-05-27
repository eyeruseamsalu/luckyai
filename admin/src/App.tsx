import { useState, useEffect, useCallback } from "react";
import { authApi, adminApi, platformApi, type AdminUser } from "./lib/api";
import { getToken, setToken, clearToken } from "./lib/auth";

type Tab = "overview" | "users" | "transactions" | "draws" | "revenue" | "config";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "overview", icon: "ti-chart-bar", label: "Overview" },
  { id: "users", icon: "ti-users", label: "Users" },
  { id: "transactions", icon: "ti-receipt", label: "Transactions" },
  { id: "draws", icon: "ti-trophy", label: "Draws" },
  { id: "revenue", icon: "ti-coin", label: "Revenue" },
  { id: "config", icon: "ti-settings", label: "Platform" },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ userCount: 0, totalBalance: 0, playsToday: 0 });
  const [pools, setPools] = useState({ crown: 0, weekly: 0, platform: 0, reserve: 0 });
  const [byGame, setByGame] = useState<{ _id: string; plays: number; totalCost: number }[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [platform, setPlatform] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [crownNums, setCrownNums] = useState("1,5,12,23,34,40");

  const showT = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadData = useCallback(async () => {
    const [ov, u, tx, cfg, plat, ga] = await Promise.all([
      adminApi.overview(),
      adminApi.users(),
      adminApi.transactions(),
      adminApi.getConfig(),
      platformApi.getState(),
      adminApi.gameAnalytics(),
    ]);
    setStats(ov.stats);
    setPools(ov.revenue.pools);
    setUsers(u.users);
    setTransactions(tx.transactions);
    setConfig(cfg.config as Record<string, number>);
    setPlatform(plat as Record<string, unknown>);
    setByGame(ga.byGame);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((r) => {
        if (r.user.role !== "admin") {
          clearToken();
          setLoginErr("Not an admin account");
          return;
        }
        setAuthed(true);
        setAdminName(r.user.name);
        loadData().catch(() => {});
      })
      .catch(() => clearToken());
  }, [loadData]);

  const login = async () => {
    setLoginErr("");
    try {
      const res = await authApi.login({ email, password });
      if (res.user.role !== "admin") {
        setLoginErr("This account is not an admin");
        return;
      }
      setToken(res.token);
      setAuthed(true);
      setAdminName(res.user.name);
      await loadData();
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : "Login failed");
    }
  };

  const saveConfig = async () => {
    try {
      await adminApi.updateConfig(config);
      showT("Config saved");
      await loadData();
    } catch {
      showT("Failed to save config");
    }
  };

  const runCrown = async () => {
    const winningNumbers = crownNums.split(",").map((n) => parseInt(n.trim(), 10));
    if (winningNumbers.length !== 6 || winningNumbers.some((n) => isNaN(n))) {
      showT("Enter 6 comma-separated numbers");
      return;
    }
    try {
      const res = await adminApi.crownDraw({ winningNumbers });
      showT(`Crown draw: ${res.result.winners} winners, ${res.result.paid} ETB paid`);
      await loadData();
    } catch {
      showT("Crown draw failed");
    }
  };

  const runWeekly = async () => {
    const nums = new Set<number>();
    while (nums.size < 6) nums.add(Math.floor(Math.random() * 42) + 1);
    const winningNumbers = [...nums].sort((a, b) => a - b);
    try {
      await adminApi.weeklyDraw({ winningNumbers, round: 1 });
      showT(`Weekly draw: ${winningNumbers.join(", ")}`);
    } catch {
      showT("Weekly draw failed");
    }
  };

  if (!authed) {
    return (
      <div className="login-wrap card">
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>LuckyAI Admin</h1>
        <p style={{ color: "var(--text2)", marginBottom: 16, fontSize: 12 }}>Sign in with an admin account</p>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "var(--text2)" }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "var(--text2)" }}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
        {loginErr && <p style={{ color: "var(--red-dark)", fontSize: 12, marginBottom: 10 }}>{loginErr}</p>}
        <button className="abtn" style={{ width: "100%" }} onClick={login}>
          Sign in
        </button>
      </div>
    );
  }

  const crown = platform?.crown as Record<string, unknown> | undefined;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18 }}>LuckyAI Admin</h1>
          <p style={{ fontSize: 11, color: "var(--text2)" }}>{adminName}</p>
        </div>
        <button
          className="sbtn"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </div>

      {toast && (
        <div style={{ background: "#eaf3de", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          {toast}
        </div>
      )}

      <div className="adm-wrap">
        <div className="adm-side">
          {TABS.map((t) => (
            <button key={t.id} className={`asb${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
              <i className={`ti ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="adm-main">
          {tab === "overview" && (
            <>
              <div className="g4" style={{ marginBottom: 14 }}>
                {[
                  { l: "Users", v: stats.userCount.toLocaleString() },
                  { l: "Total balance", v: `${stats.totalBalance.toLocaleString()} ETB` },
                  { l: "Plays today", v: String(stats.playsToday) },
                  {
                    l: "Community Stars",
                    v: `${Number(crown?.communityStars ?? 0).toLocaleString()} / ${Number(crown?.starTarget ?? 0).toLocaleString()}`,
                  },
                ].map((m) => (
                  <div key={m.l} className="mc">
                    <div className="ml">{m.l}</div>
                    <div className="mv">{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="sec">Game activity (real)</div>
                {byGame.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text2)" }}>No plays recorded yet</p>
                ) : (
                  byGame.map((g) => (
                    <div
                      key={g._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom: "0.5px solid var(--border)",
                        fontSize: 12,
                      }}
                    >
                      <span>{g._id}</span>
                      <span>{g.plays} plays</span>
                      <span style={{ fontWeight: 500 }}>{g.totalCost.toLocaleString()} ETB</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === "users" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
                    {["User", "Balance", "Stars", "Role"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: 8, color: "var(--text2)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "0.5px solid var(--border)" }}>
                      <td style={{ padding: 8 }}>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: 8 }}>{u.balance.toLocaleString()} ETB</td>
                      <td style={{ padding: 8, color: "var(--star-dark)" }}>{u.starsBalance} ★</td>
                      <td style={{ padding: 8 }}>
                        <span className={`tag ${u.role === "admin" ? "tp" : "tg"}`}>{u.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "transactions" && (
            <div style={{ overflowX: "auto", maxHeight: 500 }}>
              {transactions.slice(0, 50).map((tx, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "0.5px solid var(--border)",
                    fontSize: 12,
                  }}
                >
                  <span>{String(tx.desc ?? "")}</span>
                  <span>{String(tx.amt ?? "")}</span>
                  <span style={{ color: "var(--text3)" }}>{String(tx.type ?? "")}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "draws" && (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="sec">Crown Draw — platform state</div>
                <p style={{ fontSize: 12, marginBottom: 8 }}>
                  Phase: <strong>{String(crown?.phase ?? "—")}</strong> · Countdown:{" "}
                  <strong>{String((crown?.countdown as { display?: string })?.display ?? "00:00:00")}</strong>
                </p>
                <p style={{ fontSize: 12, marginBottom: 8 }}>
                  Entries: {Number(crown?.entryCount ?? 0).toLocaleString()} · Jackpot:{" "}
                  {Number(crown?.jackpotEtb ?? 0).toLocaleString()} ETB
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <input
                    value={crownNums}
                    onChange={(e) => setCrownNums(e.target.value)}
                    placeholder="1,5,12,23,34,40"
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <button className="abtn" onClick={runCrown}>
                    Run crown draw
                  </button>
                  <button
                    className="sbtn"
                    onClick={async () => {
                      await adminApi.setDrawActive(!(crown?.drawActive as boolean));
                      showT("Draw active toggled");
                      loadData();
                    }}
                  >
                    Toggle active
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="sec">Weekly draw</div>
                <button className="abtn" onClick={runWeekly}>
                  Run weekly draw (random numbers)
                </button>
              </div>
            </>
          )}

          {tab === "revenue" && (
            <div className="g4">
              {[
                { l: "Crown pool (35%)", v: pools.crown, c: "ta" },
                { l: "Weekly pool (25%)", v: pools.weekly, c: "tp" },
                { l: "Platform (25%)", v: pools.platform, c: "tg" },
                { l: "Reserve (15%)", v: pools.reserve, c: "tn" },
              ].map((m) => (
                <div key={m.l} className="mc">
                  <div className="ml">{m.l}</div>
                  <div className="mv">{m.v.toLocaleString()} ETB</div>
                </div>
              ))}
            </div>
          )}

          {tab === "config" && (
            <>
              {[
                { key: "communityStars", label: "Community Stars" },
                { key: "starTarget", label: "Star target" },
                { key: "countdownDurationMs", label: "Countdown (ms)" },
                { key: "crownJackpotEtb", label: "Crown jackpot ETB" },
                { key: "crownStarCost", label: "Crown star cost" },
                { key: "weeklyStarCost", label: "Weekly star cost" },
                { key: "spinCost", label: "Spin cost" },
                { key: "starRewardDaily", label: "Daily star reward" },
                { key: "starRewardWeekly", label: "Weekly star reward" },
                { key: "starRewardCrown", label: "Crown star reward" },
              ].map((row) => (
                <div key={row.key} className="sl-row">
                  <span style={{ flex: 1, fontSize: 12 }}>{row.label}</span>
                  <input
                    type="number"
                    style={{ width: 120 }}
                    value={config[row.key] ?? 0}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, [row.key]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
              <button className="abtn" onClick={saveConfig}>
                Save platform config
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
