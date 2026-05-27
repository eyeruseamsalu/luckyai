import { useStore } from '../store';
import { t } from '../translations';

const STREAK_MILESTONES = [
  { days: 3,  label: '3-day streak',  reward: '+20 ETB',       status: 'reached',  tag: 'tg' },
  { days: 7,  label: '7-day streak',  reward: 'Free spin',     status: 'pending',  tag: 'ta', daysLeft: 2 },
  { days: 14, label: '14-day streak', reward: 'Premium day',   status: 'locked',   tag: 'tn' },
];

const DAILY_SCHEDULE = [
  { day: 'Day 1', reward: 'Activity points (50 pts)', highlight: false },
  { day: 'Day 2', reward: 'Bonus chance unlock',       highlight: false },
  { day: 'Day 3', reward: '5 ETB wallet reward',       highlight: false },
  { day: 'Day 5', reward: '15 ETB wallet reward',      highlight: true  },
  { day: 'Day 7', reward: 'Free spin + premium trial', highlight: false },
];

export default function Daily() {
  const { state, lang, claimDaily, goPage } = useStore();

  const WEEK_DAYS = [
    { key: 'Mon', labelKey: 'mon', reward: '50 pts', sub: 'Activity points', done: true,  icon: 'ti-star'            },
    { key: 'Tue', labelKey: 'tue', reward: 'Bonus',   sub: 'Bonus chance unlock', done: true,  icon: 'ti-bolt'       },
    { key: 'Wed', labelKey: 'wed', reward: '5 ETB',   sub: 'Wallet reward', done: true,  icon: 'ti-coin'             },
    { key: 'Thu', labelKey: 'thu', reward: 'Refresh', sub: 'Draw entry refresh', done: true,  icon: 'ti-refresh'     },
    { key: 'Fri', labelKey: 'fri', reward: '15 ETB',  sub: 'Wallet reward', today: true, icon: 'ti-coin'             },
    { key: 'Sat', labelKey: 'sat', reward: '10% off', sub: 'Play discount', locked: true, icon: 'ti-discount'       },
    { key: 'Sun', labelKey: 'sun', reward: 'Free spin',sub: 'Crown Draw spin', locked: true, icon: 'ti-rotate-clockwise' },
  ];

  return (
    <div className="pg on" id="p-daily">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header card */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{t(lang, 'dailyRewardPage')} — {t(lang, 'weekLabel')}</div>
            <span className="tag tg">{t(lang, 'day')} {state.streak} {t(lang, 'dayActive')}</span>
          </div>

          {/* 7-day strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 16 }}>
            {WEEK_DAYS.map(d => (
              <div
                key={d.key}
                style={{
                  borderRadius: 10,
                  padding: '10px 6px',
                  textAlign: 'center',
                  border: (d as any).today
                    ? '2px solid var(--amber)'
                    : d.done
                      ? '0.5px solid var(--green)'
                      : '0.5px solid var(--border)',
                  background: (d as any).today
                    ? 'var(--amber-light)'
                    : d.done
                      ? 'var(--green-light)'
                      : 'var(--bg)',
                  opacity: (d as any).locked ? .45 : 1,
                  transition: 'all .15s',
                }}
              >
                <div style={{ fontSize: 10, color: (d as any).today ? 'var(--amber-dark)' : d.done ? 'var(--green-dark)' : 'var(--text2)', marginBottom: 4, fontWeight: 500 }}>
                  {t(lang, d.labelKey)}
                </div>
                <div style={{ fontSize: 13, marginBottom: 4, color: (d as any).today ? 'var(--amber-dark)' : d.done ? 'var(--green-dark)' : 'var(--text3)' }}>
                  <i className={`ti ${d.icon}`} style={{ fontSize: 16 }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: (d as any).today ? 'var(--amber-dark)' : d.done ? 'var(--green-dark)' : 'var(--text2)' }}>
                  {d.reward}
                </div>
              </div>
            ))}
          </div>

          {/* Today's reward */}
          <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t(lang, 'todayReward')} — 15 ETB wallet reward</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {state.dailyClaimed ? t(lang, 'alreadyClaimed') : `${t(lang, 'claimReward')} now`}
              </div>
            </div>
            {state.dailyClaimed ? (
              <span className="tag tg" style={{ fontSize: 11 }}>Claimed</span>
            ) : (
              <button className="abtn" style={{ padding: '8px 18px', flexShrink: 0 }} onClick={claimDaily}>
                {t(lang, 'claimNow')}
              </button>
            )}
          </div>
        </div>

        {/* Bottom two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          {/* Streak milestones */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{t(lang, 'streakMilestonesLabel')}</div>
            {STREAK_MILESTONES.map((m, i) => (
              <div
                key={m.days}
                style={{
                  padding: '10px 0',
                  borderBottom: i < STREAK_MILESTONES.length - 1 ? '0.5px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: m.status === 'locked' ? 'var(--text3)' : 'var(--text)', fontWeight: m.status === 'pending' ? 500 : 400 }}>
                  {m.label}
                </span>
                <span className={`tag ${m.tag}`} style={{ fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {m.status === 'reached'
                    ? `${t(lang, 'reachedLabel')} — ${m.reward}`
                    : m.status === 'pending'
                      ? `${(m as any).daysLeft} ${t(lang, 'daysLeft')} — ${m.reward}`
                      : `${t(lang, 'locked')} — ${m.reward}`}
                </span>
              </div>
            ))}
          </div>

          {/* Daily schedule */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{t(lang, 'loginSchedule')}</div>
            {DAILY_SCHEDULE.map((d, i) => (
              <div
                key={d.day}
                style={{
                  padding: '9px 0',
                  borderBottom: i < DAILY_SCHEDULE.length - 1 ? '0.5px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 40 }}>{d.day}</span>
                <span style={{ fontSize: 12, flex: 1, textAlign: 'right', fontWeight: d.highlight ? 500 : 400, color: d.highlight ? 'var(--amber-dark)' : 'var(--text)' }}>
                  {d.reward}{d.highlight ? ` — ${t(lang, 'todayReward').toLowerCase()}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stars reminder */}
        <div style={{ marginTop: 13, padding: '10px 14px', background: 'var(--star-light)', border: '0.5px solid var(--star)', borderRadius: 9, fontSize: 12, color: 'var(--star-dark)' }}>
          {t(lang, 'dailyRewardPage')} — {state.starsBalance} {t(lang, 'stars')}.
          <span style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => goPage('stars')}>{t(lang, 'starsHub')}</span>
        </div>
      </div>
    </div>
  );
}
