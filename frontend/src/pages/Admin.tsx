import { useState } from 'react';
import { useStore } from '../store';
import type { WeeklyDrawResult } from '../types';

type AdminTab = 'overview' | 'users' | 'draws' | 'weekly' | 'games' | 'economy' | 'config';

const MOCK_USERS = [
  { name: 'Abebe Bekele',  email: 'abebe@example.com',   bal: 1240, plan: 'Free',    status: 'tg', stars: 420 },
  { name: 'Sara Haile',    email: 'sara@example.com',    bal: 5800, plan: 'Premium', status: 'tg', stars: 1200 },
  { name: 'Dawit Alemu',   email: 'dawit@example.com',   bal: 220,  plan: 'Free',    status: 'ta', stars: 85 },
  { name: 'Miriam Tesfaye',email: 'miriam@example.com',  bal: 12400,plan: 'VIP',     status: 'tg', stars: 3400 },
];

export default function Admin() {
  const { state, goPage, setWeeklyDrawResult } = useStore();
  const [localDraw, setLocalDraw] = useState<WeeklyDrawResult | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [spinCost, setSpinCost] = useState(5);
  const [scCost, setScCost] = useState(5);
  const [qpCost, setQpCost] = useState(2);
  const [cashCap, setCashCap] = useState(8);
  const [starRate, setStarRate] = useState(35);
  const [toast, setToast] = useState<string | null>(null);

  if (!state.isLoggedIn || state.userRole !== 'admin') {
    return (
      <div className="pg on" id="p-admin">
        <div style={{ maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
          <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--red)', display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Admin access required</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Sign in with an admin account to access the control panel.</div>
          <button className="abtn" onClick={() => goPage('auth')}>Sign in</button>
        </div>
      </div>
    );
  }

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const TABS: { id: AdminTab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'ti-chart-bar',      label: 'Overview' },
    { id: 'users',    icon: 'ti-users',          label: 'Users' },
    { id: 'draws',    icon: 'ti-trophy',         label: 'Crown Draw' },
    { id: 'weekly',   icon: 'ti-calendar-stats', label: 'Weekly Draw' },
    { id: 'games',    icon: 'ti-cards',          label: 'Games' },
    { id: 'economy',  icon: 'ti-star',           label: 'Stars Economy' },
    { id: 'config',   icon: 'ti-settings',       label: 'Config' },
  ];

  return (
    <div className="pg on" id="p-admin">
      <div className="card" style={{ marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-dark)', fontSize: 18 }}>
            <i className="ti ti-settings" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Signed in as {state.userData.name} · Admin</div>
          </div>
          <span className="tag tp" style={{ marginLeft: 'auto' }}>Full access</span>
        </div>
      </div>

      <div className="adm-wrap">
        <div className="adm-side">
          {TABS.map(t => (
            <button key={t.id} className={`asb${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />{t.label}
            </button>
          ))}
        </div>

        <div className="adm-main">
          {/* Overview */}
          {tab === 'overview' && (
            <div>
              <div className="g4" style={{ marginBottom: 14 }}>
                {[
                  { l: 'Total users', v: '14,820', s: '↑ 234 today', c: 'tg' },
                  { l: 'Active sessions', v: '1,204', s: 'Right now', c: 'tp' },
                  { l: 'Revenue today', v: '48,200 ETB', s: '↑ 12% vs yesterday', c: 'ta' },
                  { l: 'Stars issued', v: '2.4M ★', s: 'All time', c: 'ts-tag' },
                ].map(m => (
                  <div key={m.l} className="mc">
                    <div className="ml">{m.l}</div>
                    <div className="mv" style={{ fontSize: 16 }}>{m.v}</div>
                    <div className="ms">{m.s}</div>
                  </div>
                ))}
              </div>
              <div className="g2">
                <div className="card">
                  <div className="sec">Game activity today</div>
                  {[
                    { g: 'Spin', plays: 3402, rev: '17,010 ETB' },
                    { g: 'Scratch', plays: 5200, rev: '26,000 ETB' },
                    { g: 'Quick Play', plays: 8900, rev: '17,800 ETB' },
                    { g: 'Crown Draw', plays: 420, rev: '12,600 ETB' },
                  ].map(r => (
                    <div key={r.g} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                      <span>{r.g}</span>
                      <span style={{ color: 'var(--text2)' }}>{r.plays.toLocaleString()} plays</span>
                      <span style={{ color: 'var(--green-dark)', fontWeight: 500 }}>{r.rev}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="sec">Stars economy</div>
                  {[
                    { k: 'Stars earned (today)', v: '248,400 ★' },
                    { k: 'Stars redeemed (today)', v: '42,100 ★' },
                    { k: 'Bonus draw entries', v: '1,240' },
                    { k: 'Premium unlocks (Stars)', v: '87' },
                    { k: 'Loss protection used', v: '340' },
                  ].map(r => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                      <span>{r.k}</span>
                      <span style={{ fontWeight: 500, color: 'var(--star-dark)' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="text" placeholder="Search users…" style={{ flex: 1 }} />
                <button className="sbtn">Filter</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                      {['User', 'Balance', 'Stars', 'Plan', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '7px 8px', fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS.map((u, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '8px 8px' }}>{u.bal.toLocaleString()} ETB</td>
                        <td style={{ padding: '8px 8px', color: 'var(--star-dark)' }}>{u.stars} ★</td>
                        <td style={{ padding: '8px 8px' }}><span className={`tag ${u.plan === 'Free' ? 'tn' : u.plan === 'Premium' ? 'ta' : 'tp'}`}>{u.plan}</span></td>
                        <td style={{ padding: '8px 8px' }}><span className={`tag ${u.status}`}>{u.status === 'tg' ? 'Active' : 'Warned'}</span></td>
                        <td style={{ padding: '8px 8px' }}>
                          <button className="sbtn" style={{ fontSize: 10, padding: '3px 7px', marginRight: 4 }}>Edit</button>
                          <button className="dbtn" style={{ fontSize: 10 }}>Suspend</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Draws */}
          {tab === 'draws' && (
            <div>
              <div className="sec" style={{ marginBottom: 12 }}>Crown Draw management</div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 500 }}>June 15 Draw</div>
                  <span className="tag ta">Active</span>
                </div>
                {[['Jackpot', '500,000 ETB'], ['Entries', '14,820'], ['Ticket price', '30 ETB'], ['Star entry cost', '100 ★'], ['Draw date', 'June 15, 2025 · 8 PM']].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text2)' }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="abtn">Edit draw</button>
                  <button className="sbtn">Run draw now</button>
                  <button className="dbtn">Cancel draw</button>
                </div>
              </div>
              <button className="abtn">+ Schedule new draw</button>
            </div>
          )}

          {/* Weekly Draw */}
          {tab === 'weekly' && (() => {
            const MOCK_BASE = 847;
            const allEntries = state.weeklyEntries;
            const totalEntries = allEntries.length + MOCK_BASE;
            const dr = localDraw || state.weeklyDrawResult;

            const runDraw = () => {
              const nums = new Set<number>();
              while (nums.size < 6) nums.add(Math.floor(Math.random() * 42) + 1);
              const winning = [...nums].sort((a, b) => a - b);
              const winners = allEntries.filter(e => e.numbers.filter(n => winning.includes(n)).length === 6).length;
              const result: WeeklyDrawResult = {
                winningNumbers: winning,
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                round: 1,
                winners,
              };
              setLocalDraw(result);
              setWeeklyDrawResult(result);
              showT(`Draw complete — winning numbers: ${winning.map(n => String(n).padStart(2,'0')).join(', ')}`);
            };

            return (
              <div>
                {/* Stats row */}
                <div className="g4" style={{ marginBottom: 14 }}>
                  {[
                    { l: 'Total entries', v: totalEntries.toLocaleString() },
                    { l: 'Stars collected', v: `${(totalEntries * 800).toLocaleString()} ★` },
                    { l: 'Live entries', v: String(allEntries.length) },
                    { l: 'Prize pool', v: '100,000 ETB' },
                  ].map(m => (
                    <div key={m.l} className="mc">
                      <div className="ml">{m.l}</div>
                      <div className="mv" style={{ fontSize: 16 }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Draw control card */}
                <div className="card" style={{ marginBottom: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Saturday 100,000 ETB Draw</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>Stars only — 800 Stars per entry — Pick 6 of 42</div>
                    </div>
                    <span className="tag ta">Active</span>
                  </div>

                  {/* Draw result display */}
                  {dr ? (
                    <div style={{ padding: '12px 14px', background: 'var(--purple-light)', borderRadius: 9, marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple-dark)', letterSpacing: 1, marginBottom: 8 }}>
                        WINNING NUMBERS — {dr.date}
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                        {dr.winningNumbers.map(n => (
                          <span key={n} style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--purple-dark)', fontWeight: 500 }}>
                        {dr.winners === 0
                          ? 'No jackpot winners — prize rolls over'
                          : `${dr.winners} jackpot winner${dr.winners > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 9, marginBottom: 12, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                      No draw has been run yet — click Run draw to pick winning numbers
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="abtn" style={{ background: 'var(--purple)' }} onClick={runDraw}>
                      <i className="ti ti-bolt" style={{ marginRight: 5 }} />Run draw now
                    </button>
                    {dr && (
                      <button className="sbtn" onClick={() => { setLocalDraw(null); }}>
                        Reset
                      </button>
                    )}
                  </div>
                  {toast && <div className="toast ts" style={{ marginTop: 10 }}>{toast}</div>}
                </div>

                {/* Entries list */}
                <div className="sec" style={{ marginBottom: 10 }}>
                  Live entries ({allEntries.length})
                  {allEntries.length === 0 && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>— users submit entries from the Weekly Draw page</span>}
                </div>

                {allEntries.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, padding: 24 }}>
                    No entries yet — users pick 6 numbers on the Weekly Draw page and spend 800 Stars to enter
                  </div>
                ) : (
                  <div className="card">
                    {allEntries.map((entry, i) => {
                      const matchCount = dr ? entry.numbers.filter(n => dr.winningNumbers.includes(n)).length : null;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                          <span style={{ color: 'var(--text2)', fontSize: 10, minWidth: 22 }}>#{allEntries.length - i}</span>
                          <span style={{ fontWeight: 500, minWidth: 100 }}>Abebe Bekele</span>
                          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                            {entry.numbers.map(n => (
                              <span key={n} style={{
                                width: 26, height: 26, borderRadius: 5, fontSize: 10, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: dr?.winningNumbers.includes(n) ? 'var(--purple)' : 'var(--purple-light)',
                                color: dr?.winningNumbers.includes(n) ? '#fff' : 'var(--purple-dark)',
                              }}>
                                {String(n).padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                          {matchCount !== null && (
                            <span className={`tag ${matchCount === 6 ? 'tg' : matchCount >= 3 ? 'tp' : 'tn'}`} style={{ fontSize: 9 }}>
                              {matchCount === 6 ? 'Jackpot' : `${matchCount}/6`}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'var(--text3)', minWidth: 60, textAlign: 'right' }}>{entry.date}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Games */}
          {tab === 'games' && (
            <div>
              <div className="sec" style={{ marginBottom: 12 }}>Game configuration</div>
              {[
                { l: 'Spin cost (ETB)', v: spinCost, set: setSpinCost, min: 1, max: 100 },
                { l: 'Scratch cost (ETB)', v: scCost, set: setScCost, min: 1, max: 100 },
                { l: 'Quick play cost (ETB)', v: qpCost, set: setQpCost, min: 1, max: 50 },
                { l: 'Cash cap (plays/day)', v: cashCap, set: setCashCap, min: 1, max: 50 },
              ].map(r => (
                <div key={r.l}>
                  <div className="flbl" style={{ marginBottom: 6 }}>{r.l}</div>
                  <div className="sl-row">
                    <input type="range" min={r.min} max={r.max} value={r.v} onChange={e => r.set(Number(e.target.value))} />
                    <div className="sl-val">{r.v} {r.l.includes('cap') ? 'plays' : 'ETB'}</div>
                  </div>
                </div>
              ))}
              <button className="abtn" style={{ marginTop: 8 }} onClick={() => showT('Game settings saved!')}>Save settings</button>
              {toast && <div className="toast ts" style={{ marginTop: 8 }}>{toast}</div>}
            </div>
          )}

          {/* Stars Economy */}
          {tab === 'economy' && (
            <div>
              <div className="sec" style={{ marginBottom: 12 }}>Stars economy tuning</div>
              <div className="frow">
                <label className="flbl" htmlFor="star-rate">Stars earned per play (base)</label>
                <div className="sl-row">
                  <input type="range" id="star-rate" min={5} max={200} value={starRate} onChange={e => setStarRate(Number(e.target.value))} />
                  <div className="sl-val">{starRate} ★</div>
                </div>
              </div>
              <div className="sec" style={{ marginBottom: 8, marginTop: 12 }}>Store item costs</div>
              {[
                ['Bonus draw entry', 100], ['Multiplier 24h', 150], ['Premium 24h', 200], ['Loss protection 3×', 80], ['Mystery boost box', 120],
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{k}</span>
                  <input type="number" defaultValue={v as number} style={{ width: 80 }} />
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>★</span>
                </div>
              ))}
              <button className="abtn" onClick={() => showT('Economy settings saved!')}>Save economy settings</button>
              {toast && <div className="toast ts" style={{ marginTop: 8 }}>{toast}</div>}
            </div>
          )}

          {/* Config */}
          {tab === 'config' && (
            <div>
              <div className="sec" style={{ marginBottom: 12 }}>Platform configuration</div>
              {[
                { l: 'Platform name', v: 'LuckyAI' },
                { l: 'Support email', v: 'support@luckyai.et' },
                { l: 'Withdrawal min (ETB)', v: '50' },
                { l: 'Max deposit (ETB)', v: '50000' },
              ].map(r => (
                <div key={r.l} className="frow">
                  <label className="flbl">{r.l}</label>
                  <input type="text" defaultValue={r.v} />
                </div>
              ))}
              <button className="abtn" onClick={() => showT('Configuration saved!')}>Save configuration</button>
              {toast && <div className="toast ts" style={{ marginTop: 10 }}>{toast}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
