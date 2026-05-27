import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { t } from '../translations';

const POOL = Array.from({ length: 20 }, (_, i) => i + 1);
const PICK_COUNT = 3;

const COSTS = [
  { label: '2 ETB', value: 2, tier: 'Basic' },
  { label: '5 ETB', value: 5, tier: 'Standard' },
  { label: '10 ETB', value: 10, tier: 'Max' },
];

function roundCloseTime() {
  const now = new Date();
  const close = new Date(now);
  close.setHours(now.getHours() + 1, 15, 0, 0);
  return close;
}

function formatCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface RecentRound {
  draw: number[];
  matches: number;
  result: string;
}

export default function Quick() {
  const { state, lang, deductBalance, addBalance, addStars, addTransaction, addNotification, recordPlay } = useStore();
  const [picks, setPicks] = useState<number[]>([]);
  const [costIdx, setCostIdx] = useState(0);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [result, setResult] = useState<{ matches: number; label: string; cls: string; earned: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [closeTime] = useState(() => roundCloseTime());
  const [countdown, setCountdown] = useState(() => formatCountdown(closeTime));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(closeTime)), 1000);
    return () => clearInterval(id);
  }, [closeTime]);

  const cost = COSTS[costIdx].value;

  const toggle = (n: number) => {
    if (result || playing) return;
    setPicks(p => p.includes(n) ? p.filter(x => x !== n) : p.length < PICK_COUNT ? [...p, n] : p);
  };

  const autoPick = () => {
    const s = new Set<number>();
    while (s.size < PICK_COUNT) s.add(Math.floor(Math.random() * 20) + 1);
    setPicks([...s]);
    setResult(null);
    setDrawn([]);
  };

  const play = () => {
    if (picks.length < PICK_COUNT) { setToast(`Pick ${PICK_COUNT} numbers`); setTimeout(() => setToast(null), 2000); return; }
    if (state.balance < cost) { setToast('Insufficient balance'); setTimeout(() => setToast(null), 2000); return; }
    if (!deductBalance(cost)) return;
    addTransaction(`Quick play (${cost} ETB)`, -cost, 'out');
    recordPlay();
    setPlaying(true);
    setResult(null);

    const drawnNums: number[] = [];
    while (drawnNums.length < PICK_COUNT) {
      const n = Math.floor(Math.random() * 20) + 1;
      if (!drawnNums.includes(n)) drawnNums.push(n);
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i >= drawnNums.length) {
        clearInterval(interval);
        const matches = picks.filter(p => drawnNums.includes(p)).length;
        const mult = state.activeBoosts.find(b => b.type === 'multiplier') ? 1.2 : 1;

        let label = '';
        let cls = '';
        let earned = '';
        let wonCash = 0;

        if (matches === 3) {
          wonCash = Math.round(cost * 20 * mult);
          label = `3 of 3 matched — ${wonCash} ETB won!`;
          cls = 'ts';
          earned = `+${wonCash} ETB`;
          addBalance(wonCash);
          addTransaction('Quick play 3-match', wonCash, 'in');
          addNotification('ti-bolt', 'tg', `Quick play: 3 matches — ${wonCash} ETB!`);
        } else if (matches === 2) {
          wonCash = Math.round(cost * 3 * mult);
          label = `2 of 3 matched — ${wonCash} ETB won!`;
          cls = 'ts';
          earned = `+${wonCash} ETB`;
          addBalance(wonCash);
          addTransaction('Quick play 2-match', wonCash, 'in');
        } else if (matches === 1) {
          label = '1 matched — 8 Stars earned';
          cls = 'tn-t';
          earned = '+8 Stars';
          addStars(8);
          addTransaction('Quick play 1-match Stars', 8, 'star');
        } else {
          label = 'No match — 2 Stars earned';
          cls = 'tn-t';
          earned = '+2 Stars';
          addStars(2);
          addTransaction('Quick play Stars', 2, 'star');
        }

        setResult({ matches, label, cls, earned });
        setDrawn(drawnNums);
        setRecentRounds(prev => [
          { draw: drawnNums, matches, result: matches >= 2 ? 'Won' : matches === 1 ? 'Free' : 'Loss' },
          ...prev.slice(0, 4),
        ]);
        setPlaying(false);
        return;
      }
      setDrawn(drawnNums.slice(0, i + 1));
      i++;
    }, 280);
  };

  const reset = () => { setPicks([]); setDrawn([]); setResult(null); };

  return (
    <div className="pg on" id="p-quick">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, maxWidth: 840, margin: '0 auto' }}>
        {/* LEFT */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{t(lang, 'quickPlayGame')}</div>
            <span className="pill p-green" style={{ fontSize: 10 }}>
              <i className="ti ti-clock" style={{ fontSize: 10 }} /> {t(lang, 'roundCloses')} {countdown}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>
            {t(lang, 'pick3Numbers')} (1-20). {t(lang, 'matchAll3')}. {t(lang, 'match2')}.
          </div>

          {/* Number grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7, marginBottom: 16 }}>
            {POOL.map(n => (
              <button
                key={n}
                className={`num-btn${picks.includes(n) ? ' pk' : ''}`}
                style={{
                  padding: '10px 0', fontSize: 13, borderRadius: 8,
                  border: `0.5px solid ${picks.includes(n) ? '#AFA9EC' : 'var(--border2)'}`,
                  background: picks.includes(n) ? 'var(--purple-light)' : 'none',
                  color: picks.includes(n) ? 'var(--purple-dark)' : 'var(--text)',
                  fontWeight: 500, cursor: 'pointer', transition: 'all .12s',
                }}
                onClick={() => toggle(n)}
              >
                {String(n).padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Drawn balls */}
          {drawn.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, justifyContent: 'center' }}>
              {drawn.map(n => (
                <div key={n} className="qball" style={{
                  background: picks.includes(n) ? 'var(--green)' : 'var(--bg)',
                  borderColor: picks.includes(n) ? 'var(--green)' : 'var(--border2)',
                  color: picks.includes(n) ? '#fff' : 'var(--text)',
                  width: 44, height: 44, fontSize: 14, fontWeight: 600,
                }}>
                  {String(n).padStart(2, '0')}
                </div>
              ))}
            </div>
          )}

          {/* Cost selector */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
            {COSTS.map((c, i) => (
              <button
                key={c.value}
                onClick={() => setCostIdx(i)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                  border: `${costIdx === i ? '2px' : '0.5px'} solid ${costIdx === i ? 'var(--amber)' : 'var(--border2)'}`,
                  background: costIdx === i ? 'var(--amber-light)' : 'none',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: costIdx === i ? 'var(--amber-dark)' : 'var(--text)' }}>{c.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text2)' }}>{c.tier}</div>
              </button>
            ))}
          </div>

          {/* Result */}
          {result && (
            <div className={`toast ${result.cls}`} style={{ marginBottom: 10, fontSize: 12 }}>
              {result.label}
            </div>
          )}
          {toast && <div className="toast tn-t" style={{ marginBottom: 10, fontSize: 12 }}>{toast}</div>}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="abtn"
              style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
              onClick={result ? reset : play}
              disabled={playing}
            >
              {playing ? 'Drawing...' : result ? t(lang, 'play') + ' again' : `Enter — ${cost} ETB`}
            </button>
            <button className="sbtn" style={{ padding: '10px 18px' }} onClick={autoPick}>{t(lang, 'autoPick')}</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Prize table */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Prize table</div>
            {[
              { label: '3 of 3 match', tag: '20x entry', cls: 'ta' },
              { label: '2 of 3 match', tag: '3x entry', cls: 'tp' },
              { label: '1 of 3 match', tag: 'Free entry', cls: 'tg' },
              { label: '0 matches', tag: '—', cls: 'tn' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{r.label}</span>
                <span className={`tag ${r.cls}`}>{r.tag}</span>
              </div>
            ))}
          </div>

          {/* Recent rounds */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{t(lang, 'recentRounds')}</div>
            {recentRounds.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>No rounds yet</div>
            ) : recentRounds.map((r, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < recentRounds.length - 1 ? '0.5px solid var(--border)' : 'none', fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text2)' }}>
                    Draw: {r.draw.map(n => String(n).padStart(2, '0')).join(', ')} — {r.matches} {t(lang, 'matchResult')}
                  </span>
                  <span className={`tag ${r.result === 'Won' ? 'tg' : r.result === 'Free' ? 'ta' : 'tn'}`}>
                    {r.result}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stars info */}
          <div className="card" style={{ padding: 14, background: 'var(--star-light)', border: '0.5px solid var(--star)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--star-dark)', marginBottom: 4 }}>Every play earns {t(lang, 'stars')}</div>
            <div style={{ fontSize: 10, color: 'var(--star-dark)', opacity: .8, lineHeight: 1.5 }}>
              {t(lang, 'stars')} accumulate and unlock Crown Draw entries. Your balance: {state.starsBalance} {t(lang, 'stars')}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
