import { useStore } from '../store';

export default function BonusMode() {
  const { state, goPage } = useStore();
  if (!state.cashCapHit) return null;

  return (
    <div className="bonus-banner">
      <div className="bonus-orb">★</div>
      <div style={{ flex: 1 }}>
        <div className="bonus-title">You've unlocked Bonus Mode</div>
        <div className="bonus-sub">
          You're now earning <strong>Stars</strong> instead of direct cash — Stars unlock real advantages below.
          This is progress, not a pause.
        </div>
        <div className="bonus-pills">
          <span className="bonus-pill">🎟 Bonus draw entries</span>
          <span className="bonus-pill">⚡ +20% multiplier</span>
          <span className="bonus-pill">🔓 Premium 24h</span>
          <span className="bonus-pill">🛡 Loss protection</span>
          <span className="bonus-pill">🎁 Mystery boost</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="stbtn" onClick={() => goPage('stars')}>
            Visit Stars Store — {state.starsBalance.toLocaleString()} ★ available
          </button>
        </div>
      </div>
    </div>
  );
}
