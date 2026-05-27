import { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import BonusMode from '../components/BonusMode';
import { gamesApi, ApiError } from '../lib/api';

const SEGMENTS = [
  { label: 'Try again',    color: '#F0F0EB', text: '#6B6B64',  val: 0,    type: 'lose',    prob: 22 },
  { label: '10 ETB',       color: '#FEF3C7', text: '#92400E',  val: 10,   type: 'cash',    prob: 14 },
  { label: 'Free spin',    color: '#EAF3DE', text: '#27500A',  val: 0,    type: 'freeSpin', prob: 7  },
  { label: '5 ETB',        color: '#E1F5EE', text: '#085041',  val: 5,    type: 'cash',    prob: 16 },
  { label: '50 Stars',     color: '#FEF3C7', text: '#92400E',  val: 50,   type: 'stars',   prob: 13 },
  { label: '25 ETB',       color: '#EEEDFE', text: '#3C3489',  val: 25,   type: 'cash',    prob: 9  },
  { label: 'Try again',    color: '#F0F0EB', text: '#6B6B64',  val: 0,    type: 'lose',    prob: 8  },
  { label: '80 Stars',     color: '#FEF3C7', text: '#92400E',  val: 80,   type: 'stars',   prob: 5  },
  { label: '50 ETB',       color: '#EEEDFE', text: '#3C3489',  val: 50,   type: 'cash',    prob: 3  },
  { label: 'Premium day',  color: '#FDE68A', text: '#92400E',  val: 0,    type: 'premium', prob: 2  },
  { label: '150 Stars',    color: '#FEF3C7', text: '#92400E',  val: 150,  type: 'stars',   prob: 1  },
  { label: '100 ETB',      color: '#EAF3DE', text: '#27500A',  val: 100,  type: 'cash',    prob: 0.5 },
];

const COST_OPTIONS = [5, 15, 30, 50];
const STAR_EARN_ON_LOSS = 30;

export default function Spin() {
  const { state, syncGameResponse, goPage } = useStore();

  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [cost, setCost] = useState(5);
  const [result, setResult] = useState<typeof SEGMENTS[0] | null>(null);
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [totalSpins, setTotalSpins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBonus, setStreakBonus] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3500); };

  const drawWheel = useCallback((rad: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const cx = c.width / 2, cy = c.height / 2, r = cx - 4;
    const step = (Math.PI * 2) / SEGMENTS.length;
    ctx.clearRect(0, 0, c.width, c.height);
    SEGMENTS.forEach((seg, i) => {
      const s = rad + i * step, e = s + step;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, s, e); ctx.closePath();
      ctx.fillStyle = seg.color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(s + step / 2); ctx.textAlign = 'right';
      ctx.fillStyle = seg.text;
      ctx.font = `${seg.label.length > 8 ? '600 8px' : '600 9.5px'} system-ui`;
      ctx.fillText(seg.label, r - 7, 4);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 2; ctx.stroke();
  }, []);

  const initCanvas = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
      drawWheel(0);
    }
  }, [drawWheel]);

  const spin = async () => {
    if (spinning) return;
    if (!state.isLoggedIn) { showT('Sign in to play', 'tx'); return; }
    if (state.freeSpins <= 0 && state.balance < cost) { showT('Insufficient balance. Top up to continue.', 'tx'); return; }

    setSpinning(true);
    setResult(null);

    let segIdx = 0;
    let seg = SEGMENTS[0];
    let message = '';

    try {
      const res = await gamesApi.spin({ cost });
      segIdx = (res.result.segmentIndex as number) ?? 0;
      seg = SEGMENTS[segIdx] ?? SEGMENTS[0];
      message = (res.result.message as string) ?? seg.label;
      syncGameResponse(res);
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Spin failed', 'tx');
      setSpinning(false);
      return;
    }

    const step = 360 / SEGMENTS.length;
    const startAngle = angleRef.current;
    const desiredFinal = ((270 - segIdx * step - step / 2) % 360 + 360) % 360;
    const startAngleNorm = startAngle % 360;
    let delta = desiredFinal - startAngleNorm;
    if (delta <= 0) delta += 360;
    const targetDeg = 360 * 7 + delta;
    const start = Date.now();
    const dur = 4200 + Math.random() * 800;

    const animate = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const ease = 1 - Math.pow(1 - t, 4);
      const current = startAngle + targetDeg * ease;
      const rad = (current % 360) * Math.PI / 180;
      drawWheel(rad);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = current % 360;
        setAngle(current % 360);
        setSpinning(false);
        setResult(seg);
        setTotalSpins(n => n + 1);
        if (message) showT(message, seg.type === 'lose' ? 'tn-t' : 'ts');
        if (seg.type === 'cash' && !state.cashCapHit) setStreak(s => s + 1);
        else if (seg.type === 'freeSpin' || seg.type === 'premium') setStreak(s => s + 1);
        else setStreak(0);
      }
    };
    animate();
  };

  return (
    <div className="pg on" id="p-spin">
      <BonusMode />
      <div className="spin-layout">
        <div>
        {streak > 0 && (
          <div style={{ background: 'var(--amber-light)', border: '0.5px solid var(--amber)', borderRadius: 9, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--amber-dark)', fontWeight: 500 }}>Win streak: {streak}</span>
            {streakBonus && <span className="tag ta">+10% bonus active</span>}
            {!streakBonus && <span style={{ color: 'var(--amber-text)', fontSize: 11 }}>{3 - streak} more wins for streak bonus</span>}
          </div>
        )}

        <div className="card spin-wheel-col" style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>Try your chance</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Spin to win cash, Stars, free spins, and premium access.
                {totalSpins > 0 && ` Total spins: ${totalSpins}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span className="pill p-amber">{Math.round(state.balance).toLocaleString()} ETB</span>
              {state.freeSpins > 0 && (
                <span className="pill p-green">{state.freeSpins} free spin{state.freeSpins > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Cost selector */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
            {COST_OPTIONS.map(c => (
              <button
                key={c}
                className={cost === c ? 'abtn' : 'sbtn'}
                style={{ flex: 1, fontSize: 12, padding: '6px 0' }}
                onClick={() => setCost(c)}
              >
                {c} ETB
              </button>
            ))}
          </div>

          {/* Wheel */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: 16 }}>
            <div className="wheel-pointer" />
            <canvas
              ref={initCanvas}
              width={280}
              height={280}
              style={{ borderRadius: '50%', border: '2px solid var(--border2)', cursor: spinning ? 'default' : 'pointer', display: 'block', margin: '0 auto' }}
              onClick={!spinning ? spin : undefined}
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`toast ${
              result.type === 'lose' ? 'tn-t'
              : result.type === 'stars' || (result.type === 'cash' && state.cashCapHit) ? 'tstar'
              : 'ts'
            }`} style={{ marginBottom: 12 }}>
              {result.type === 'lose'
                ? `No prize — ${STAR_EARN_ON_LOSS} Stars earned. Spin again.`
                : result.type === 'freeSpin'
                  ? 'Free spin unlocked — spin again at no cost'
                : result.type === 'stars' || (result.type === 'cash' && state.cashCapHit)
                  ? `Stars earned. Visit Stars Hub to track progress.`
                  : `${result.label}`}
            </div>
          )}
          {toast && !result && <div className={`toast ${toast.cls}`} style={{ marginBottom: 12 }}>{toast.msg}</div>}

          {/* Spin button */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="abtn" style={{ flex: 2, padding: 10 }} onClick={spin} disabled={spinning}>
              {spinning ? 'Spinning...' : state.freeSpins > 0 ? 'Spin — Free' : `Spin — ${cost} ETB`}
            </button>
            <button className="sbtn" onClick={() => goPage('wallet')}>Top up</button>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
            {state.cashCapHit
              ? 'Bonus Mode — every spin earns Stars for Crown Draw entries'
              : `Cash plays today: ${state.playsToday}/8`}
          </div>
        </div>
        </div>

        <div>
        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Prize table</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {SEGMENTS.filter(s => s.type !== 'lose').map((s, i) => (
              <div key={i} style={{ background: s.color, borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: s.text }}>{s.label}</div>
                <div style={{ fontSize: 9, color: 'rgba(0,0,0,.35)', marginTop: 2 }}>
                  {s.prob <= 1 ? 'Rare' : s.prob <= 5 ? 'Uncommon' : 'Common'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stars → Crown Draw CTA */}
        <div className="card" style={{ background: 'var(--star-light)', border: '0.5px solid var(--star)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--star-dark)', marginBottom: 2 }}>Your Stars balance</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--star-dark)' }}>{state.starsBalance} Stars</div>
            <div style={{ fontSize: 11, color: 'var(--star-dark)', opacity: .7 }}>1,500 Stars = 1 Crown Draw entry</div>
          </div>
          <button className="stbtn" onClick={() => goPage('stars')}>Stars Hub</button>
        </div>
        </div>
      </div>
    </div>
  );
}
