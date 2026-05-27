import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { t } from '../translations';
import { platformApi, type PlatformState } from '../lib/api';

function CountdownDisplay({ display }: { display: string }) {
  const parts = display.includes(':') ? display.split(':') : ['00', '00', '00'];
  const labels =
    parts.length === 4
      ? ['DAYS', 'HRS', 'MIN', 'SEC']
      : ['HRS', 'MIN', 'SEC'];
  const keys = parts.length === 4 ? ['dd', 'hh', 'mm', 'ss'] : ['hh', 'mm', 'ss'];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {parts.map((val, i) => (
        <div key={keys[i]} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 0', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { state, goPage, lang } = useStore();
  const [platform, setPlatform] = useState<PlatformState | null>(null);

  useEffect(() => {
    const load = () => {
      platformApi.getState().then(r => {
        const { success: _, ...rest } = r;
        setPlatform(rest);
      }).catch(() => {});
    };
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, []);

  const crown = platform?.crown;
  const weeklyCost = platform?.weekly.weeklyStarCost ?? 800;
  const crownStarCost = crown?.crownStarCost ?? 1500;
  const weeklyPct = Math.min(100, Math.round((state.starsBalance / weeklyCost) * 100));
  const communityPct = crown?.progressPct ?? 0;
  const countdownDisplay = crown?.countdown.display ?? '00:00:00';
  const drawLabel =
    crown?.phase === 'collecting'
      ? t(lang, 'collectingStars')
      : crown?.drawAt
        ? new Date(crown.drawAt).toLocaleString()
        : t(lang, 'drawScheduled');

  const GAMES = [
    { id: 'scratch', title: t(lang, 'scratchWinTitle'), desc: t(lang, 'scratchWinDesc'), tag: t(lang, 'instantTag'), tagCls: 'ta', icon: 'ti-cards' },
    { id: 'quick', title: t(lang, 'quickPlayTitle'), desc: t(lang, 'quickPlayDesc'), tag: t(lang, 'fastRoundTag'), tagCls: 'tp', icon: 'ti-bolt' },
    { id: 'daily', title: t(lang, 'dailyRewardTitle'), desc: t(lang, 'dailyRewardDesc'), tag: t(lang, 'streakTag'), tagCls: 'tg', icon: 'ti-calendar' },
  ];

  return (
    <div className="pg on" id="p-home">
      <div className="home-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          { label: t(lang, 'walletBalance').toUpperCase(), val: `${Math.round(state.balance).toLocaleString()} ETB`, sub: t(lang, 'availableNow'), color: '' },
          { label: t(lang, 'myTicketsLabel').toUpperCase(), val: String(state.tickets), sub: t(lang, 'activeDraws'), color: '' },
          { label: t(lang, 'nextDrawLabel').toUpperCase(), val: countdownDisplay, sub: crown?.phase === 'collecting' ? t(lang, 'collectingStars') : t(lang, 'crownCountdown'), color: '' },
          { label: t(lang, 'starsBalanceLabel').toUpperCase(), val: String(state.starsBalance), sub: t(lang, 'useForCrownDraw'), color: 'var(--star-dark)' },
        ] as { label: string; val: string; sub: string; color: string }[]).map(s => (
          <div key={s.label} className="card" style={{ padding: '13px 15px' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color || 'var(--text)', marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14, border: '1.5px solid var(--amber)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: 'var(--amber-dark)', fontWeight: 600, letterSpacing: '.07em', marginBottom: 4 }}>{t(lang, 'mainDraw').toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 3 }}>{t(lang, 'crownDraw')} — {drawLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>{t(lang, 'pickNumbersDesc')}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="tag tg" style={{ fontSize: 10 }}>{t(lang, 'starsEntry')}</span>
              <span className="tag ta" style={{ fontSize: 10 }}>{t(lang, 'cashEntryBadge')}</span>
              <span className="tag tp" style={{ fontSize: 10 }}>{t(lang, 'hybridEntry')}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 2 }}>{t(lang, 'jackpot').toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-dark)' }}>
              {(crown?.jackpotEtb ?? 500_000).toLocaleString()} ETB
            </div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3 }}>
              {(crown?.entryCount ?? 0).toLocaleString()} {t(lang, 'entered')}
            </div>
          </div>
        </div>

        <CountdownDisplay display={countdownDisplay} />

        <div style={{ marginTop: 10, background: 'var(--bg)', borderRadius: 8, padding: '9px 11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
            <span>{t(lang, 'communityProgress')}</span>
            <span style={{ fontWeight: 500, color: 'var(--star-dark)' }}>
              {(crown?.communityStars ?? 0).toLocaleString()} / {(crown?.starTarget ?? 10_000_000).toLocaleString()} {t(lang, 'stars')}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${communityPct}%`, background: 'var(--star)', borderRadius: 3, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>
            {crown?.phase === 'collecting'
              ? `${((crown?.starTarget ?? 0) - (crown?.communityStars ?? 0)).toLocaleString()} ${t(lang, 'stars')} ${t(lang, 'communityStars').toLowerCase()} — ${t(lang, 'playNow').toLowerCase()}.`
              : t(lang, 'drawScheduled')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="abtn" style={{ flex: 1, minWidth: 120, padding: '9px 0' }} onClick={() => goPage('draw')}>{t(lang, 'enterDraw')}</button>
          <button className="sbtn" style={{ padding: '9px 14px' }} onClick={() => goPage('stars')}>{t(lang, 'starsHub')}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, border: '0.5px solid var(--purple)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--purple-dark)', fontWeight: 600, letterSpacing: '.07em', marginBottom: 3 }}>{t(lang, 'weeklyDraw').toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
              {(platform?.weekly.jackpotEtb ?? 100_000).toLocaleString()} ETB — {t(lang, 'everySaturday')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t(lang, 'starsOnly')}. {weeklyCost} {t(lang, 'starsPerEntry')}. {t(lang, 'noCashNeeded')}.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--purple-dark)' }}>
              {(platform?.weekly.jackpotEtb ?? 100_000).toLocaleString()} ETB
            </div>
            <span className="tag tp" style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>{t(lang, 'starsOnly')}</span>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            <span>{t(lang, 'progressToWeekly')} ({weeklyCost} {t(lang, 'stars')})</span>
            <span>{weeklyPct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${weeklyPct}%`, background: 'var(--purple)', borderRadius: 3 }} />
          </div>
        </div>
        <button
          className={state.starsBalance >= weeklyCost ? 'pbtn' : 'sbtn'}
          style={{ width: '100%', padding: '8px 0', fontSize: 13 }}
          onClick={() => goPage(state.starsBalance >= weeklyCost ? 'weekly' : 'stars')}
        >
          {state.starsBalance >= weeklyCost ? t(lang, 'enterWeeklyNow') : t(lang, 'viewStarsHub')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-rotate-clockwise" style={{ color: 'var(--amber)', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'tryChance')}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 7, lineHeight: 1.5 }}>
            {t(lang, 'spinForRewards')} {t(lang, 'fromPerSpin')}.
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[t(lang, 'walletBonus'), t(lang, 'premiumDay'), t(lang, 'freeTicket'), t(lang, 'cashback'), t(lang, 'discountReward')].map(tag => (
              <span key={tag} className="tag tn" style={{ fontSize: 10 }}>{tag}</span>
            ))}
          </div>
        </div>
        <button className="abtn" style={{ flexShrink: 0, padding: '8px 16px' }} onClick={() => goPage('spin')}>{t(lang, 'playNow')}</button>
      </div>

      <div className="home-games" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {GAMES.map(g => (
          <div key={g.id} className="card" style={{ padding: '16px 14px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
              <i className={`ti ${g.icon}`} style={{ fontSize: 18, color: 'var(--text2)' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{g.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>{g.desc}</div>
            <span className={`tag ${g.tagCls}`} style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>{g.tag}</span>
            <button className="abtn" style={{ width: '100%', padding: '7px 0', fontSize: 12 }} onClick={() => goPage(g.id as 'scratch' | 'quick' | 'daily')}>
              {g.id === 'daily' ? t(lang, 'claim') : t(lang, 'play')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
