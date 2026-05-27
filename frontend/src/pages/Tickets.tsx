import { useStore } from '../store';
import { t } from '../translations';

const ACTIVE_TICKETS = [
  { id: 'TK-2024-001', draw: 'Crown Draw — June 15', picks: [7, 13, 21, 28, 34, 42], bought: 'May 20, 2025', prize: '500,000 ETB jackpot', type: 'cash' },
  { id: 'TK-2024-002', draw: 'Crown Draw — June 15', picks: [3, 9, 17, 25, 38, 47],  bought: 'May 22, 2025', prize: '500,000 ETB jackpot', type: 'star' },
];

export default function Tickets() {
  const { state, lang, goPage } = useStore();
  const allTickets = state.tickets;

  return (
    <div className="pg on" id="p-tickets">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="g4" style={{ marginBottom: 13 }}>
          <div className="mc"><div className="ml">{t(lang, 'activeTickets')}</div><div className="mv">{allTickets}</div><div className="ms">{t(lang, 'currentDraws')}</div></div>
          <div className="mc"><div className="ml">{t(lang, 'drawsEntered')}</div><div className="mv">3</div><div className="ms">{t(lang, 'allTime')}</div></div>
          <div className="mc"><div className="ml">{t(lang, 'starsEntries')}</div><div className="mv">{state.bonusDrawEntries}</div><div className="ms">{t(lang, 'bonus')}</div></div>
          <div className="mc"><div className="ml">{t(lang, 'winnings')}</div><div className="mv">125 ETB</div><div className="ms">{t(lang, 'allTime')}</div></div>
        </div>

        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="sec" style={{ margin: 0 }}>{t(lang, 'activeTickets')}</div>
            <span className="tag tg">{allTickets} {t(lang, 'active')}</span>
          </div>
          {allTickets === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <i className="ti ti-ticket" style={{ fontSize: 36, color: 'var(--text3)', display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{t(lang, 'noTicketsYet')}</div>
              <button className="abtn" onClick={() => goPage('draw')}>{t(lang, 'enterDraw')}</button>
            </div>
          ) : ACTIVE_TICKETS.map((tk, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, border: '0.5px solid var(--border2)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tk.type === 'star' ? 'var(--star-light)' : 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: tk.type === 'star' ? 'var(--star-dark)' : 'var(--amber-dark)' }}>
                    {tk.type === 'star' ? '★' : <i className="ti ti-ticket" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{tk.draw}</div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{tk.id} · {tk.bought}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span className="tag tg" style={{ fontSize: 9 }}>{t(lang, 'active')}</span>
                  {tk.type === 'star' && <span className="ts-tag tag" style={{ fontSize: 9 }}>★ {t(lang, 'starsEntryTag')}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                {tk.picks.map(n => (
                  <div key={n} className="sel-pip" style={{ width: 28, height: 28, fontSize: 10 }}>{n}</div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)' }}>
                <span><i className="ti ti-trophy" style={{ fontSize: 12, verticalAlign: -2, marginRight: 3 }} />{tk.prize}</span>
                <span>{t(lang, 'drawDate')}</span>
              </div>
            </div>
          ))}
          <button className="abtn" style={{ width: '100%', marginTop: 4 }} onClick={() => goPage('draw')}>
            <i className="ti ti-plus" style={{ fontSize: 13, verticalAlign: -2, marginRight: 5 }} />{t(lang, 'enterDraw')}
          </button>
        </div>

        {/* Past draws */}
        <div className="card">
          <div className="sec" style={{ marginBottom: 10 }}>Past results</div>
          {[
            { id: 'TK-2024-000', draw: 'Crown Draw — May 1', result: 'No match', prize: '—', drawn: [4, 11, 22, 31, 39, 48] },
          ].map((tk, i) => (
            <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 9, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <div style={{ fontSize: 12 }}>{tk.draw} <span style={{ color: 'var(--text3)', fontSize: 10 }}>· {tk.id}</span></div>
                <span className="tag tr">Ended</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {tk.drawn.map(n => (
                  <div key={n} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg)', border: '0.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500 }}>{n}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{tk.result} — Prize: {tk.prize}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
