import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { t } from '../translations';

const CROWN_STAR_COST = 1500;
const WEEKLY_STAR_COST = 800;

function Countdown({ target }: { target: Date }) {
  const calc = () => {
    const d = Math.max(0, target.getTime() - Date.now());
    return {
      dd: String(Math.floor(d / 86400000)).padStart(2, '0'),
      hh: String(Math.floor((d % 86400000) / 3600000)).padStart(2, '0'),
      mm: String(Math.floor((d % 3600000) / 60000)).padStart(2, '0'),
      ss: String(Math.floor((d % 60000) / 1000)).padStart(2, '0'),
    };
  };
  const [c, setC] = useState(calc);
  useEffect(() => { const i = setInterval(() => setC(calc()), 1000); return () => clearInterval(i); }, []);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {([['dd', 'DAYS'], ['hh', 'HRS'], ['mm', 'MIN'], ['ss', 'SEC']] as [string, string][]).map(([k, l]) => (
        <div key={l} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{(c as Record<string, string>)[k]}</div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

const CROWN_DRAW_DATE = new Date('2025-06-15T20:00:00');

export default function Home() {
  const { state, goPage, lang } = useStore();
  const crownPct  = Math.min(100, Math.round((state.starsBalance / CROWN_STAR_COST) * 100));
  const weeklyPct = Math.min(100, Math.round((state.starsBalance / WEEKLY_STAR_COST) * 100));

  const GAMES = [
    { id: 'scratch', title: t(lang, 'scratchWinTitle'),  desc: t(lang, 'scratchWinDesc'),  tag: t(lang, 'instantTag'),    tagCls: 'ta', icon: 'ti-cards'    },
    { id: 'quick',   title: t(lang, 'quickPlayTitle'),   desc: t(lang, 'quickPlayDesc'),   tag: t(lang, 'fastRoundTag'), tagCls: 'tp', icon: 'ti-bolt'     },
    { id: 'daily',   title: t(lang, 'dailyRewardTitle'), desc: t(lang, 'dailyRewardDesc'), tag: t(lang, 'streakTag'),     tagCls: 'tg', icon: 'ti-calendar' },
  ];

  return (
    <div className="pg on" id="p-home">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          { label: t(lang, 'walletBalance').toUpperCase(), val: `${Math.round(state.balance).toLocaleString()} ETB`, sub: t(lang, 'availableNow'), color: '' },
          { label: t(lang, 'myTicketsLabel').toUpperCase(), val: String(state.tickets), sub: t(lang, 'activeDraws'), color: '' },
          { label: t(lang, 'nextDrawLabel').toUpperCase(), val: '0d 00h', sub: t(lang, 'juneDraw'), color: '' },
          { label: t(lang, 'starsBalanceLabel').toUpperCase(), val: String(state.starsBalance), sub: t(lang, 'useForCrownDraw'), color: 'var(--star-dark)' },
        ] as { label: string; val: string; sub: string; color: string }[]).map(s => (
          <div key={s.label} className="card" style={{ padding: '13px 15px' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color || 'var(--text)', marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Crown Draw — MAIN HERO */}
      <div className="card" style={{ marginBottom: 14, border: '1.5px solid var(--amber)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--amber-dark)', fontWeight: 600, letterSpacing: '.07em', marginBottom: 4 }}>{t(lang, 'mainDraw').toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 3 }}>{t(lang, 'crownDraw')} — June 15</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>
              {t(lang, 'pickNumbersDesc')}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="tag tg" style={{ fontSize: 10 }}>{t(lang, 'starsEntry')}</span>
              <span className="tag ta" style={{ fontSize: 10 }}>{t(lang, 'cashEntryBadge')}</span>
              <span className="tag tp" style={{ fontSize: 10 }}>{t(lang, 'hybridEntry')}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 14 }}>
            <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 2 }}>{t(lang, 'jackpot').toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-dark)' }}>500,000 ETB</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3 }}>14,820 {t(lang, 'entered')}</div>
          </div>
        </div>

        <Countdown target={CROWN_DRAW_DATE} />

        <div style={{ marginTop: 10, background: 'var(--bg)', borderRadius: 8, padding: '9px 11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
            <span>{t(lang, 'starsTowardCrown')}</span>
            <span style={{ fontWeight: 500, color: 'var(--star-dark)' }}>{state.starsBalance} / {CROWN_STAR_COST}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${crownPct}%`, background: 'var(--star)', borderRadius: 3, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>
            {crownPct >= 100
              ? t(lang, 'readyPick')
              : `${CROWN_STAR_COST - state.starsBalance} ${t(lang, 'starsPerEntry')} — ${t(lang, 'playNow').toLowerCase()}.`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="abtn" style={{ flex: 1, padding: '9px 0' }} onClick={() => goPage('draw')}>{t(lang, 'enterDraw')}</button>
          <button className="sbtn" style={{ padding: '9px 14px' }} onClick={() => goPage('stars')}>{t(lang, 'starsHub')}</button>
        </div>
      </div>

      {/* Weekly 100K Draw */}
      <div className="card" style={{ marginBottom: 14, border: '0.5px solid var(--purple)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--purple-dark)', fontWeight: 600, letterSpacing: '.07em', marginBottom: 3 }}>{t(lang, 'weeklyDraw').toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>100,000 ETB — {t(lang, 'everySaturday')}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t(lang, 'starsOnly')}. {WEEKLY_STAR_COST} {t(lang, 'starsPerEntry')}. {t(lang, 'noCashNeeded')}.</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--purple-dark)' }}>100,000 ETB</div>
            <span className="tag tp" style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>{t(lang, 'starsOnly')}</span>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            <span>{t(lang, 'progressToWeekly')} ({WEEKLY_STAR_COST} {t(lang, 'stars')})</span>
            <span>{weeklyPct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${weeklyPct}%`, background: 'var(--purple)', borderRadius: 3 }} />
          </div>
        </div>
        <button
          className={state.starsBalance >= WEEKLY_STAR_COST ? 'pbtn' : 'sbtn'}
          style={{ width: '100%', padding: '8px 0', fontSize: 13 }}
          onClick={() => goPage(state.starsBalance >= WEEKLY_STAR_COST ? 'weekly' : 'stars')}
        >
          {state.starsBalance >= WEEKLY_STAR_COST ? t(lang, 'enterWeeklyNow') : t(lang, 'viewStarsHub')}
        </button>
      </div>

      {/* Try your chance */}
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-rotate-clockwise" style={{ color: 'var(--amber)', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'tryChance')}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 7, lineHeight: 1.5 }}>
            {t(lang, 'spinForRewards')} {t(lang, 'fromPerSpin')}.
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[t(lang,'walletBonus'), t(lang,'premiumDay'), t(lang,'freeTicket'), t(lang,'cashback'), t(lang,'discountReward')].map(tag => (
              <span key={tag} className="tag tn" style={{ fontSize: 10 }}>{tag}</span>
            ))}
          </div>
        </div>
        <button className="abtn" style={{ flexShrink: 0, padding: '8px 16px' }} onClick={() => goPage('spin')}>{t(lang, 'playNow')}</button>
      </div>

      {/* Three games */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {GAMES.map(g => (
          <div key={g.id} className="card" style={{ padding: '16px 14px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
              <i className={`ti ${g.icon}`} style={{ fontSize: 18, color: 'var(--text2)' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{g.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>{g.desc}</div>
            <span className={`tag ${g.tagCls}`} style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>{g.tag}</span>
            <button className="abtn" style={{ width: '100%', padding: '7px 0', fontSize: 12 }} onClick={() => goPage(g.id as any)}>
              {g.id === 'daily' ? t(lang, 'claim') : t(lang, 'play')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
