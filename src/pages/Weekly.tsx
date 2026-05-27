import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../translations';

const PICK_COUNT = 6;
const ENTRY_STARS = 800;
const TOTAL_NUMS = 42;
const CURRENT_ROUND = 1;

const NEXT_SAT = (() => {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + diff);
  sat.setHours(20, 0, 0, 0);
  return sat;
})();

function countdown() {
  const diff = NEXT_SAT.getTime() - Date.now();
  if (diff <= 0) return '00d 00h 00m';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export default function Weekly() {
  const { state, lang, spendStars, addTransaction, addNotification, addTicket, addWeeklyEntry } = useStore();
  const [picks, setPicks] = useState<number[]>([]);
  const [toast, setToast] = useState('');
  const [toastCls, setToastCls] = useState('ts');

  const showT = (msg: string, cls = 'ts') => {
    setToast(msg); setToastCls(cls);
    setTimeout(() => setToast(''), 3000);
  };

  const togglePick = (n: number) => {
    setPicks(p => {
      if (p.includes(n)) return p.filter(x => x !== n);
      if (p.length >= PICK_COUNT) return p;
      return [...p, n];
    });
  };

  const quickPick = () => {
    const s = new Set<number>();
    while (s.size < PICK_COUNT) s.add(Math.floor(Math.random() * TOTAL_NUMS) + 1);
    setPicks([...s].sort((a, b) => a - b));
  };

  const confirm = () => {
    if (picks.length < PICK_COUNT) { showT(`Pick all ${PICK_COUNT} numbers first`, 'tx'); return; }
    if (state.starsBalance < ENTRY_STARS) {
      showT(`Need ${ENTRY_STARS} Stars — earn more by playing`, 'tx'); return;
    }
    const ok = spendStars(ENTRY_STARS);
    if (!ok) { showT('Could not deduct Stars', 'tx'); return; }
    addWeeklyEntry(picks.slice().sort((a, b) => a - b));
    addTransaction(`Weekly draw entry — ${picks.slice().sort((a,b)=>a-b).map(n => String(n).padStart(2,'0')).join(', ')}`, -ENTRY_STARS, 'star');
    addNotification('ti-calendar-stats', 'tp', `Weekly draw entry confirmed: ${picks.slice().sort((a,b)=>a-b).map(n => String(n).padStart(2,'0')).join(', ')}`);
    addTicket();
    setPicks([]);
    showT(t(lang, 'entryConfirmed'), 'ts');
  };

  const dr = state.weeklyDrawResult;

  return (
    <div className="pg on" id="p-weekly">
      {/* Purple hero header */}
      <div className="card" style={{ marginBottom: 13, background: 'linear-gradient(135deg, var(--purple) 0%, #7B68EE 100%)', border: 'none', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, opacity: .8, marginBottom: 4 }}>{t(lang, 'weeklyDraw').toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>{t(lang, 'weeklyPrize')}</div>
            <div style={{ fontSize: 12, opacity: .8 }}>{t(lang, 'weeklySchedule')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: .7, marginBottom: 4 }}>{t(lang, 'nextDraw').toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{countdown()}</div>
            <div style={{ fontSize: 10, opacity: .7, marginTop: 3 }}>{t(lang, 'enterEvery')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            `Entry: ${ENTRY_STARS} ${t(lang, 'stars')}`,
            t(lang, 'pick6Numbers'),
            `${t(lang, 'stars')}: ${state.starsBalance.toLocaleString()}`,
            `Entries: ${state.weeklyEntries.length}`,
          ].map(lbl => (
            <span key={lbl} style={{ background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Last draw result banner */}
      {dr && (
        <div className="card" style={{ marginBottom: 13, border: '1.5px solid var(--purple)', background: 'var(--purple-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-dark)' }}>{t(lang, 'lastDrawResultLabel')} — Round {dr.round}</div>
              <div style={{ fontSize: 11, color: 'var(--purple-dark)', opacity: .7 }}>{dr.date} · {dr.winners} winner{dr.winners !== 1 ? 's' : ''}</div>
            </div>
            <span className="tag tp">Round {dr.round}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dr.winningNumbers.map(n => (
              <span key={n} style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                {String(n).padStart(2, '0')}
              </span>
            ))}
          </div>
          {state.weeklyEntries.filter(e => e.round === dr.round).map((entry, i) => {
            const matched = entry.numbers.filter(n => dr.winningNumbers.includes(n));
            return (
              <div key={i} style={{ marginTop: 10, padding: '8px 10px', background: matched.length === 6 ? 'var(--green-light)' : 'rgba(255,255,255,.5)', borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: 'var(--purple-dark)', marginBottom: 5 }}>
                  Your entry #{i + 1} — {matched.length === 6 ? 'JACKPOT!' : `${matched.length} of 6 ${t(lang, 'matchResult')}`}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {entry.numbers.map(n => (
                    <span key={n} style={{ width: 28, height: 28, borderRadius: 5, background: dr.winningNumbers.includes(n) ? 'var(--purple)' : 'rgba(0,0,0,.07)', color: dr.winningNumbers.includes(n) ? '#fff' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10 }}>
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="g2" style={{ alignItems: 'flex-start', gap: 14 }}>
        {/* LEFT — number picker + my entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {/* Stars progress */}
          <div className="card" style={{ background: 'var(--star-light)', border: '0.5px solid var(--star)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--star-dark)' }}>{t(lang, 'starsTowardWeekly')}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--star-dark)' }}>
                {Math.min(state.starsBalance, ENTRY_STARS).toLocaleString()} / {ENTRY_STARS}
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ width: `${Math.min(100, state.starsBalance / ENTRY_STARS * 100)}%`, height: '100%', background: 'var(--star)', borderRadius: 3, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--star-dark)' }}>
              {state.starsBalance >= ENTRY_STARS
                ? t(lang, 'readyPick')
                : `${(ENTRY_STARS - state.starsBalance).toLocaleString()} more ${t(lang, 'stars')} needed — play any game to earn`}
            </div>
          </div>

          {/* Number picker */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="sec" style={{ margin: 0 }}>{t(lang, 'pick6Numbers')}</div>
              <span style={{ fontSize: 11, color: picks.length === PICK_COUNT ? 'var(--green)' : 'var(--text2)' }}>
                {picks.length} / {PICK_COUNT}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 12 }}>
              {Array.from({ length: TOTAL_NUMS }, (_, i) => i + 1).map(n => {
                const sel = picks.includes(n);
                const isWinner = dr?.winningNumbers.includes(n) ?? false;
                return (
                  <button
                    key={n}
                    onClick={() => togglePick(n)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 7, fontSize: 11,
                      border: sel ? '2px solid var(--purple)' : isWinner ? '1.5px solid var(--purple)' : '0.5px solid var(--border2)',
                      background: sel ? 'var(--purple)' : isWinner ? 'var(--purple-light)' : 'var(--surface)',
                      color: sel ? '#fff' : isWinner ? 'var(--purple-dark)' : 'var(--text)',
                      fontWeight: sel || isWinner ? 700 : 400, cursor: 'pointer', transition: 'all .12s',
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {picks.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, padding: '7px 8px', background: 'var(--purple-light)', borderRadius: 7 }}>
                <span style={{ fontSize: 10, color: 'var(--purple-dark)', fontWeight: 600, width: '100%', marginBottom: 3 }}>{t(lang, 'yourPicks')}</span>
                {picks.slice().sort((a, b) => a - b).map(n => (
                  <span key={n} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 7 }}>
              <button className="sbtn" style={{ flex: 1, padding: '8px 0', fontSize: 12 }} onClick={quickPick}>
                <i className="ti ti-wand" style={{ marginRight: 4 }} />{t(lang, 'quickPick')}
              </button>
              <button className="sbtn" style={{ flex: 1, padding: '8px 0', fontSize: 12 }} onClick={() => setPicks([])}>
                <i className="ti ti-x" style={{ marginRight: 4 }} />{t(lang, 'clear')}
              </button>
            </div>

            {toast && <div className={`toast ${toastCls}`} style={{ marginTop: 10 }}>{toast}</div>}

            <button
              className="abtn"
              style={{ width: '100%', padding: 11, marginTop: 10, background: 'var(--purple)', opacity: picks.length < PICK_COUNT || state.starsBalance < ENTRY_STARS ? .45 : 1 }}
              onClick={confirm}
              disabled={picks.length < PICK_COUNT || state.starsBalance < ENTRY_STARS}
            >
              {t(lang, 'confirmEntry')} — {ENTRY_STARS} {t(lang, 'stars')}
            </button>
          </div>

          {/* My submitted entries */}
          {state.weeklyEntries.length > 0 && (
            <div className="card">
              <div className="sec" style={{ marginBottom: 10 }}>{t(lang, 'myEntriesWeek')} ({state.weeklyEntries.length})</div>
              {state.weeklyEntries.map((entry, i) => {
                const matchCount = dr ? entry.numbers.filter(n => dr.winningNumbers.includes(n)).length : null;
                return (
                  <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--purple-light)', borderRadius: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--purple-dark)', fontWeight: 600 }}>
                        Entry #{state.weeklyEntries.length - i} · Round {entry.round}
                      </span>
                      {matchCount !== null && (
                        <span className={`tag ${matchCount === 6 ? 'tg' : matchCount >= 3 ? 'tp' : 'tn'}`} style={{ fontSize: 9 }}>
                          {matchCount === 6 ? 'Jackpot!' : `${matchCount} ${t(lang, 'matchResult')}`}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{entry.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {entry.numbers.map(n => (
                        <span key={n} style={{ width: 30, height: 30, borderRadius: 6, background: dr?.winningNumbers.includes(n) ? 'var(--purple)' : 'rgba(124,100,230,.15)', color: dr?.winningNumbers.includes(n) ? '#fff' : 'var(--purple-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div className="card">
            <div className="sec" style={{ marginBottom: 10 }}>Prize</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--purple)', marginBottom: 3 }}>{t(lang, 'weeklyPrize')}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>{t(lang, 'jackpot')} — match all 6 drawn numbers</div>
            <span className="tag tp" style={{ fontSize: 10 }}>{t(lang, 'starsOnly')} — {t(lang, 'noCashNeeded')}</span>
          </div>

          <div className="card">
            <div className="sec" style={{ marginBottom: 10 }}>{t(lang, 'howItWorks')}</div>
            {[
              { n: '01', text: `Earn ${ENTRY_STARS} ${t(lang, 'stars')} from playing games` },
              { n: '02', text: t(lang, 'pick6Numbers') + ' from 1 to 42' },
              { n: '03', text: t(lang, 'confirmEntry') + ' — your entry is saved' },
              { n: '04', text: 'Watch the live draw every Saturday' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--purple)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</span>
                <div style={{ fontSize: 12, color: 'var(--text2)', paddingTop: 3 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="sec" style={{ marginBottom: 8 }}>{t(lang, 'waysToEarn')}</div>
            {[
              { icon: 'ti-rotate-clockwise', lbl: 'Spin wheel',             val: `2 ${t(lang, 'stars')} / spin`         },
              { icon: 'ti-cards',            lbl: t(lang, 'scratchWin'),    val: `20+ ${t(lang, 'stars')} / card`        },
              { icon: 'ti-bolt',             lbl: t(lang, 'quickPlay'),     val: `2-8 ${t(lang, 'stars')} / round`       },
              { icon: 'ti-calendar-check',   lbl: t(lang, 'dailyReward'),   val: `10-50 ${t(lang, 'stars')} / ${t(lang, 'day')}` },
            ].map(r => (
              <div key={r.lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <i className={`ti ${r.icon}`} style={{ fontSize: 14, color: 'var(--purple)', width: 18 }} />
                  <span style={{ fontSize: 12 }}>{r.lbl}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--star-dark)', fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'var(--purple-light)', border: '0.5px solid #C0BAF0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-dark)', marginBottom: 5 }}>{t(lang, 'drawScheduleLabel')}</div>
            <div style={{ fontSize: 11, color: 'var(--purple-dark)', opacity: .8, lineHeight: 1.7 }}>
              {t(lang, 'enterEvery')}<br />
              {t(lang, 'drawFrom')}<br />
              {t(lang, 'resultsPosted')}<br />
              {t(lang, 'paidWithin')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
