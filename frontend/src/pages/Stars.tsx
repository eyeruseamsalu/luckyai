import { useState } from 'react';
import { useStore } from '../store';
import { t } from '../translations';
import { gamesApi, ApiError } from '../lib/api';

const CROWN_STAR_COST = 1500;
const WEEKLY_STAR_COST = 800;
const CROWN_HYBRID_STAR = 750;
const CROWN_HYBRID_CASH = 250;

function quickPickNumbers(count: number, max: number): number[] {
  const s = new Set<number>();
  while (s.size < count) s.add(Math.floor(Math.random() * max) + 1);
  return [...s].sort((a, b) => a - b);
}

export default function Stars() {
  const { state, lang, syncGameResponse, goPage } = useStore();
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3500); };

  const crownPct = Math.min(100, Math.round((state.starsBalance / CROWN_STAR_COST) * 100));
  const weeklyPct = Math.min(100, Math.round((state.starsBalance / WEEKLY_STAR_COST) * 100));

  const enterCrownStars = async () => {
    if (state.starsBalance < CROWN_STAR_COST) {
      showT(`You need ${CROWN_STAR_COST - state.starsBalance} more Stars`, 'tx'); return;
    }
    setSubmitting(true);
    try {
      const res = await gamesApi.starsCrown({ mode: 'stars' });
      syncGameResponse(res);
      showT(t(lang, 'entryConfirmed'), 'tstar');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Entry failed', 'tx');
    } finally {
      setSubmitting(false);
    }
  };

  const enterCrownHybrid = async () => {
    if (state.starsBalance < CROWN_HYBRID_STAR) {
      showT(`Need ${CROWN_HYBRID_STAR} Stars for hybrid entry`, 'tx'); return;
    }
    if (state.balance < CROWN_HYBRID_CASH) {
      showT(`Need ${CROWN_HYBRID_CASH} ETB for hybrid entry`, 'tx'); return;
    }
    setSubmitting(true);
    try {
      const res = await gamesApi.starsCrown({ mode: 'hybrid' });
      syncGameResponse(res);
      showT(t(lang, 'entryConfirmed'), 'tstar');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Entry failed', 'tx');
    } finally {
      setSubmitting(false);
    }
  };

  const enterCrownCash = async () => {
    if (state.balance < 500) { showT('Insufficient balance', 'tx'); return; }
    setSubmitting(true);
    try {
      const res = await gamesApi.drawEnter({ numbers: quickPickNumbers(6, 42), option: 'cash' });
      syncGameResponse(res);
      showT(t(lang, 'entryConfirmed'), 'ts');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Entry failed', 'tx');
    } finally {
      setSubmitting(false);
    }
  };

  const enterWeekly = async () => {
    if (state.starsBalance < WEEKLY_STAR_COST) {
      showT(`You need ${WEEKLY_STAR_COST - state.starsBalance} more Stars for the weekly draw`, 'tx'); return;
    }
    setSubmitting(true);
    try {
      const res = await gamesApi.starsWeekly();
      syncGameResponse(res);
      showT('Weekly 100K draw entry confirmed.', 'tstar');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Entry failed', 'tx');
    } finally {
      setSubmitting(false);
    }
  };

  const EARN_WAYS = [
    { action: t(lang, 'playAnyGame'),    earn: '25–80 ' + t(lang, 'starsPerPlay')   },
    { action: 'Bonus Mode',             earn: 'Every play earns Stars only'          },
    { action: t(lang, 'dailyRewardStars'), earn: '20–100 ' + t(lang, 'starsPerDay') },
    { action: t(lang, 'threeDayStreak'), earn: '+50 bonus Stars'                     },
  ];

  return (
    <div className="pg on" id="p-stars">
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: 13, background: 'var(--star-light)', border: '0.5px solid var(--star)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--star-dark)', marginBottom: 3 }}>{t(lang, 'starsHub')}</div>
              <div style={{ fontSize: 12, color: 'var(--star-dark)', opacity: .8 }}>{t(lang, 'starsHubSub')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--star-dark)' }}>{state.starsBalance.toLocaleString()} ★</div>
              <div style={{ fontSize: 11, color: 'var(--star-dark)', opacity: .7 }}>{t(lang, 'starsBalance')}</div>
            </div>
          </div>
        </div>

        {toast && <div className={`toast ${toast.cls}`} style={{ marginBottom: 13 }}>{toast.msg}</div>}

        {/* Crown Draw */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{t(lang, 'crownDraw')} — 500,000 ETB</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
              <span>{t(lang, 'crownDrawProgressLabel')} ({CROWN_STAR_COST} {t(lang, 'stars')})</span>
              <span style={{ fontWeight: 500, color: 'var(--star-dark)' }}>{state.starsBalance} / {CROWN_STAR_COST}</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${crownPct}%`, background: 'var(--star)', borderRadius: 3, transition: 'width .5s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'starsOnlyLabel')}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {CROWN_STAR_COST} {t(lang, 'stars')} — {t(lang, 'noCashNeeded')}. Have: {state.starsBalance} {t(lang, 'stars')}.
                </div>
              </div>
              <button
                className={state.starsBalance >= CROWN_STAR_COST ? 'stbtn' : 'sbtn'}
                style={{ marginLeft: 14, flexShrink: 0, fontSize: 11, padding: '7px 14px' }}
                onClick={enterCrownStars}
                disabled={state.starsBalance < CROWN_STAR_COST || submitting}
              >
                {state.starsBalance >= CROWN_STAR_COST ? 'Enter free' : `${CROWN_STAR_COST - state.starsBalance} short`}
              </button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'cashEntryLabel')}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>500 ETB. {t(lang, 'walletBalance')}: {Math.round(state.balance)} ETB.</div>
              </div>
              <button
                className={state.balance >= 500 ? 'abtn' : 'sbtn'}
                style={{ marginLeft: 14, flexShrink: 0, fontSize: 11, padding: '7px 14px' }}
                onClick={enterCrownCash}
                disabled={state.balance < 500 || submitting}
              >
                500 ETB
              </button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'starsPlusCash')}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {CROWN_HYBRID_STAR} {t(lang, 'stars')} + {CROWN_HYBRID_CASH} ETB.
                </div>
              </div>
              <button
                className={state.starsBalance >= CROWN_HYBRID_STAR && state.balance >= CROWN_HYBRID_CASH ? 'pbtn' : 'sbtn'}
                style={{ marginLeft: 14, flexShrink: 0, fontSize: 11, padding: '7px 14px' }}
                onClick={enterCrownHybrid}
                disabled={state.starsBalance < CROWN_HYBRID_STAR || state.balance < CROWN_HYBRID_CASH || submitting}
              >
                {t(lang, 'hybridEntry').split('+')[0].trim()}
              </button>
            </div>
          </div>
        </div>

        {/* Weekly 100K Draw */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'weeklyDraw')} — 100,000 ETB</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t(lang, 'starsOnly')}. {t(lang, 'everySaturday')}.</div>
            </div>
            <span className="tag tp">{t(lang, 'everySaturday')}</span>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
            {[
              { k: 'Entry cost', v: `${WEEKLY_STAR_COST} ${t(lang, 'stars')}` },
              { k: 'Prize pool', v: '100,000 ETB' },
              { k: `Your ${t(lang, 'stars')}`, v: String(state.starsBalance) },
            ].map(r => (
              <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'var(--text2)' }}>{r.k}</span>
                <span style={{ fontWeight: 500 }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${weeklyPct}%`, background: 'var(--purple)', borderRadius: 3, transition: 'width .5s' }} />
            </div>
            <button
              className={state.starsBalance >= WEEKLY_STAR_COST ? 'pbtn' : 'sbtn'}
              style={{ fontSize: 11, padding: '7px 14px', flexShrink: 0 }}
              onClick={() => state.starsBalance >= WEEKLY_STAR_COST ? enterWeekly() : goPage('weekly')}
              disabled={submitting}
            >
              {state.starsBalance >= WEEKLY_STAR_COST ? t(lang, 'enterWeeklyNow') : `${WEEKLY_STAR_COST - state.starsBalance} ${t(lang, 'stars')} short`}
            </button>
          </div>
        </div>

        {/* How to earn */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{t(lang, 'howToEarn')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {EARN_WAYS.map((w, i) => (
              <div key={w.action} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < EARN_WAYS.length - 1 ? '0.5px solid var(--border)' : 'none', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{w.action}</span>
                <span style={{ fontWeight: 500, color: 'var(--star-dark)' }}>{w.earn}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
