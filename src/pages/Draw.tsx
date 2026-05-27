import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../translations';

const PICK_COUNT = 6;
const POOL = Array.from({ length: 42 }, (_, i) => i + 1);

const ENTRY_OPTIONS = [
  { id: 'stars',  labelKey: 'starsOnlyLabel', sub: '1,500 Stars',         starsCost: 1500, cashCost: 0,   color: 'var(--star-light)',   border: 'var(--star)',   text: 'var(--star-dark)'   },
  { id: 'cash',   labelKey: 'cashEntryLabel', sub: '500 ETB',             starsCost: 0,    cashCost: 500, color: 'var(--amber-light)',  border: 'var(--amber)',  text: 'var(--amber-dark)'  },
  { id: 'hybrid', labelKey: 'starsPlusCash',  sub: '750 Stars + 250 ETB', starsCost: 750,  cashCost: 250, color: 'var(--purple-light)', border: 'var(--purple)', text: 'var(--purple-dark)' },
];

const PAYOUT_TIERS = [
  { matchKey: 'match6', prize: '500,000 ETB', noteKey: 'jackpotFixed', cls: 'ta' },
  { matchKey: 'match5', prize: '150,000 ETB', noteKey: 'poolBudget',   cls: 'tp' },
  { matchKey: 'match4', prize: '100,000 ETB', noteKey: 'poolBudget',   cls: 'tg' },
  { matchKey: 'match3', prize: '50,000 ETB',  noteKey: 'poolBudget',   cls: 'tn' },
];

export default function Draw() {
  const { state, lang, deductBalance, spendStars, addTransaction, addNotification, addTicket, recordPlay } = useStore();
  const [picks, setPicks] = useState<number[]>([]);
  const [entryType, setEntryType] = useState('stars');
  const [suggestUsed, setSuggestUsed] = useState(0);
  const [suggestedNums, setSuggestedNums] = useState<number[]>([]);
  const [entries, setEntries] = useState(0);
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3000); };

  const toggle = (n: number) => {
    setPicks(p => p.includes(n) ? p.filter(x => x !== n) : p.length < PICK_COUNT ? [...p, n] : p);
  };

  const quickPick = () => {
    const s = new Set<number>();
    while (s.size < PICK_COUNT) s.add(Math.floor(Math.random() * 42) + 1);
    setPicks([...s]);
  };

  const clearPicks = () => setPicks([]);

  const useSuggestion = () => {
    if (suggestUsed >= 3) return;
    const cost = suggestUsed === 0 ? 0 : 1;
    if (cost > 0 && state.balance < 1) { showT('Insufficient balance for suggestion', 'tx'); return; }
    if (cost > 0) deductBalance(1);
    const s = new Set<number>();
    while (s.size < PICK_COUNT) s.add(Math.floor(Math.random() * 42) + 1);
    setSuggestedNums([...s].sort((a, b) => a - b));
    setSuggestUsed(n => n + 1);
    showT(cost > 0 ? 'Suggested numbers shown below — 1 ETB charged. Click any to add.' : 'Suggested numbers shown below — free. Click any to add.', 'ts');
  };

  const confirm = () => {
    if (picks.length < PICK_COUNT) { showT(`Pick ${PICK_COUNT} numbers to confirm`, 'tx'); return; }
    const opt = ENTRY_OPTIONS.find(o => o.id === entryType)!;
    if (opt.cashCost > 0 && state.balance < opt.cashCost) { showT('Insufficient balance', 'tx'); return; }
    if (opt.starsCost > 0 && state.starsBalance < opt.starsCost) {
      showT(`You need ${opt.starsCost} Stars — earn more by playing`, 'tx'); return;
    }
    if (opt.cashCost > 0) deductBalance(opt.cashCost);
    if (opt.starsCost > 0) spendStars(opt.starsCost);
    if (opt.cashCost > 0) addTransaction(`Crown Draw — ${opt.sub}`, -opt.cashCost, 'out');
    if (opt.starsCost > 0) addTransaction(`Crown Draw — Stars used`, -opt.starsCost, 'star');
    addTicket();
    addNotification('ti-circle-check', 'tg', `Crown Draw entry confirmed — June 15`);
    recordPlay();
    setEntries(n => n + 1);
    setPicks([]);
    setSuggestUsed(0);
    showT(t(lang, 'entryConfirmed'), 'ts');
  };

  const selected = ENTRY_OPTIONS.find(o => o.id === entryType)!;

  return (
    <div className="pg on" id="p-draw">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, maxWidth: 860, margin: '0 auto' }}>

        {/* LEFT — number picker */}
        <div className="card" style={{ padding: 18 }}>
          {/* Selected bar */}
          <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border2)', borderRadius: 8, padding: '10px 13px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 500, marginBottom: 6 }}>
              {t(lang, 'selectedNumbers')}
            </div>
            {picks.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{t(lang, 'noneSelected')}</div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {picks.sort((a, b) => a - b).map(n => (
                  <div key={n} className="sel-pip" style={{ width: 30, height: 30, fontSize: 11 }}>
                    {String(n).padStart(2, '0')}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t(lang, 'numberSelection')}</div>
            <span className="tag tn" style={{ fontSize: 10 }}>{picks.length} / {PICK_COUNT} {t(lang, 'selectedNumbers').toLowerCase()}</span>
          </div>

          {/* Number grid 01-42 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 14 }}>
            {POOL.map(n => (
              <button
                key={n}
                onClick={() => toggle(n)}
                style={{
                  padding: '8px 0', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .12s',
                  border: `0.5px solid ${picks.includes(n) ? '#AFA9EC' : 'var(--border2)'}`,
                  background: picks.includes(n) ? 'var(--purple-light)' : 'none',
                  color: picks.includes(n) ? 'var(--purple-dark)' : 'var(--text)',
                }}
              >
                {String(n).padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Entry type */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 7 }}>{t(lang, 'entryMethod')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ENTRY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEntryType(opt.id)}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all .12s',
                    border: `${entryType === opt.id ? '2px' : '0.5px'} solid ${entryType === opt.id ? opt.border : 'var(--border2)'}`,
                    background: entryType === opt.id ? opt.color : 'none',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, color: entryType === opt.id ? opt.text : 'var(--text)', marginBottom: 1 }}>{t(lang, opt.labelKey)}</div>
                  <div style={{ fontSize: 9, color: entryType === opt.id ? opt.text : 'var(--text2)', opacity: .8 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {toast && <div className={`toast ${toast.cls}`} style={{ marginBottom: 10 }}>{toast.msg}</div>}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="sbtn" style={{ fontSize: 11, padding: '7px 12px' }} onClick={quickPick}>{t(lang, 'quickPick')}</button>
            <button className="sbtn" style={{ fontSize: 11, padding: '7px 12px' }} onClick={clearPicks}>{t(lang, 'clear')}</button>
            <button className="sbtn" style={{ fontSize: 11, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={useSuggestion} disabled={suggestUsed >= 3}>
              <i className="ti ti-sparkles" style={{ fontSize: 12 }} /> {t(lang, 'suggestionsBtn') || 'Suggestions'}
            </button>
            <button
              className={picks.length === PICK_COUNT ? 'abtn' : 'sbtn'}
              style={{ flex: 1, fontSize: 11, padding: '7px 12px' }}
              onClick={confirm}
              disabled={picks.length < PICK_COUNT}
            >
              {t(lang, 'confirm')} — {selected.sub}
            </button>
          </div>

          {/* Suggested numbers panel */}
          {suggestedNums.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--purple-light)', borderRadius: 9, border: '0.5px solid #C0BAF0' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple-dark)', marginBottom: 8 }}>
                {t(lang, 'suggestionsBelow')}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestedNums.map(n => {
                  const already = picks.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        if (!already && picks.length < PICK_COUNT) {
                          setPicks(p => [...p, n]);
                        } else if (already) {
                          setPicks(p => p.filter(x => x !== n));
                        }
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: 7, fontWeight: 600, fontSize: 11,
                        border: already ? '2px solid var(--purple)' : '0.5px solid #AFA9EC',
                        background: already ? 'var(--purple)' : 'rgba(255,255,255,.7)',
                        color: already ? '#fff' : 'var(--purple-dark)',
                        cursor: picks.length >= PICK_COUNT && !already ? 'not-allowed' : 'pointer',
                        opacity: picks.length >= PICK_COUNT && !already ? .45 : 1,
                        transition: 'all .12s',
                      }}
                    >
                      {String(n).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--purple-dark)', opacity: .7, marginTop: 7 }}>
                {suggestUsed < 3 ? `${3 - suggestUsed} suggestion${3 - suggestUsed !== 1 ? 's' : ''} remaining` : 'No more suggestions available'}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — draw details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Draw details */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{t(lang, 'crownDraw')}</div>
            {[
              { k: t(lang, 'jackpot'), v: '500,000 ETB', bold: true },
              { k: 'Ticket price', v: '500 ETB / 1,500 Stars' },
              { k: 'Draw date', v: 'June 15, 2025' },
              { k: 'Your entries', v: String(state.tickets + entries) },
            ].map(r => (
              <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{r.k}</span>
                <span style={{ fontWeight: r.bold ? 600 : 400, color: r.bold ? 'var(--amber-dark)' : 'var(--text)' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Suggestion system */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{t(lang, 'suggestionSystem')}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>{t(lang, 'firstSuggFree')}</div>
            {[
              { n: t(lang, 'firstSugg'), price: 'Free' },
              { n: t(lang, 'secondSugg'), price: '1 ETB' },
              { n: t(lang, 'thirdSugg'), price: '1 ETB' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 2 ? '0.5px solid var(--border)' : 'none', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{s.n}</span>
                <span className={i === 0 ? 'tag tg' : 'tag ta'} style={{ fontSize: 10 }}>{s.price}</span>
              </div>
            ))}
          </div>

          {/* Prize tiers */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{t(lang, 'prizeTiers')}</div>
            {PAYOUT_TIERS.map(r => (
              <div key={r.matchKey} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: 'var(--text2)' }}>{t(lang, r.matchKey)}</span>
                  <span className={`tag ${r.cls}`} style={{ fontSize: 10 }}>{r.prize}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t(lang, r.noteKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
