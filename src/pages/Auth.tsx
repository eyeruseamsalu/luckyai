import { useState, useRef } from 'react';
import { useStore } from '../store';

type Tab = 'signin' | 'register' | 'otp' | 'forgot' | 'reset';

function pwStrength(pw: string) {
  if (!pw) return { pct: 0, color: '#E5E5DF', hint: 'Enter a password' };
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return { pct: 25, color: 'var(--red)', hint: 'Too weak' };
  if (score === 2) return { pct: 50, color: 'var(--amber)', hint: 'Fair' };
  if (score === 3) return { pct: 75, color: 'var(--teal)', hint: 'Good' };
  return { pct: 100, color: 'var(--green)', hint: 'Strong ✓' };
}

export default function Auth() {
  const { login, guest, goPage } = useStore();
  const [tab, setTab] = useState<Tab>('signin');
  const [pw, setPw] = useState('');
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingData, setPendingData] = useState({ name: '', email: '' });
  const [countdown, setCountdown] = useState(0);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3500); };

  const startCountdown = () => {
    setCountdown(30);
    if (cdRef.current) clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      setCountdown(v => {
        if (v <= 1) { clearInterval(cdRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const doSignIn = () => {
    const email = (document.getElementById('li-email') as HTMLInputElement)?.value;
    const pw = (document.getElementById('li-pw') as HTMLInputElement)?.value;
    if (!email?.includes('@')) { showT('Enter a valid email address', 'tx'); return; }
    if (!pw || pw.length < 4) { showT('Enter your password', 'tx'); return; }
    const role = email.includes('admin') ? 'admin' : 'user';
    const name = email.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    login(name, email, role);
    showT('Signed in successfully', 'ts');
  };

  const doRegister = () => {
    const fn = (document.getElementById('r-fname') as HTMLInputElement)?.value?.trim();
    const ln = (document.getElementById('r-lname') as HTMLInputElement)?.value?.trim();
    const email = (document.getElementById('r-email') as HTMLInputElement)?.value?.trim();
    const phone = (document.getElementById('r-phone') as HTMLInputElement)?.value?.trim();
    const p1 = (document.getElementById('r-pw') as HTMLInputElement)?.value;
    const p2 = (document.getElementById('r-pw2') as HTMLInputElement)?.value;
    if (!fn || !ln) { showT('Enter your full name', 'tx'); return; }
    if (!email?.includes('@')) { showT('Enter a valid email', 'tx'); return; }
    if (!phone) { showT('Enter your phone number', 'tx'); return; }
    if (p1.length < 8) { showT('Password must be at least 8 characters', 'tx'); return; }
    if (p1 !== p2) { showT('Passwords do not match', 'tx'); return; }
    setPendingData({ name: fn + ' ' + ln, email });
    setPendingPhone(phone);
    setTab('otp');
    startCountdown();
  };

  const verifyOTP = () => {
    if (otp.some(d => !d)) { showT('Enter all 6 digits', 'tx'); return; }
    login(pendingData.name, pendingData.email, 'user');
  };

  const doForgot = () => {
    const email = (document.getElementById('forgot-email') as HTMLInputElement)?.value;
    if (!email?.includes('@')) { showT('Enter a valid email address', 'tx'); return; }
    showT('Reset link sent — valid for 15 minutes', 'ts');
  };

  const doReset = () => {
    const p1 = (document.getElementById('reset-pw') as HTMLInputElement)?.value;
    const p2 = (document.getElementById('reset-pw2') as HTMLInputElement)?.value;
    if (p1.length < 8) { showT('Password must be at least 8 characters', 'tx'); return; }
    if (p1 !== p2) { showT('Passwords do not match', 'tx'); return; }
    showT('Password updated successfully', 'ts');
  };

  const str = pwStrength(pw);

  return (
    <div className="pg on" id="p-auth">
      <div style={{ maxWidth: 420, margin: '16px auto' }}>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, color: 'var(--amber-dark)' }}>
              <i className="ti ti-star" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 3 }}>LuckyAI</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Premium rewards ecosystem</div>
          </div>

          {tab === 'otp' || tab === 'forgot' || tab === 'reset' ? null : (
            <div className="auth-tab-row">
              <button className={`auth-tab${tab === 'signin' ? ' on' : ''}`} onClick={() => setTab('signin')}>Sign in</button>
              <button className={`auth-tab${tab === 'register' ? ' on' : ''}`} onClick={() => setTab('register')}>Register</button>
            </div>
          )}

          {/* SIGN IN */}
          {tab === 'signin' && (
            <div>
              <div className="frow">
                <label className="flbl" htmlFor="li-email">Email address</label>
                <input type="email" id="li-email" placeholder="abebe@example.com" autoComplete="username" />
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="li-pw">Password</label>
                <input type="password" id="li-pw" placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 13 }}>
                <button onClick={() => setTab('forgot')} style={{ fontSize: 11, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer' }}>Forgot password?</button>
              </div>
              <button className="abtn" style={{ width: '100%', marginBottom: 11, padding: 10 }} onClick={doSignIn}>Sign in</button>
              <button onClick={() => { guest(); }} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                Continue as guest (limited access)
              </button>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}

          {/* REGISTER */}
          {tab === 'register' && (
            <div>
              <div className="g2" style={{ gap: 10, marginBottom: 0 }}>
                <div className="frow" style={{ marginBottom: 10 }}>
                  <label className="flbl" htmlFor="r-fname">First name</label>
                  <input type="text" id="r-fname" placeholder="Abebe" autoComplete="given-name" />
                </div>
                <div className="frow" style={{ marginBottom: 10 }}>
                  <label className="flbl" htmlFor="r-lname">Last name</label>
                  <input type="text" id="r-lname" placeholder="Bekele" autoComplete="family-name" />
                </div>
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="r-email">Email address</label>
                <input type="email" id="r-email" placeholder="abebe@example.com" autoComplete="email" />
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="r-phone">Phone number</label>
                <input type="tel" id="r-phone" placeholder="+251 9XX XXX XXXX" autoComplete="tel" />
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="r-pw">Password <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(min 8 chars)</span></label>
                <input type="password" id="r-pw" placeholder="Create a strong password" autoComplete="new-password" onChange={e => setPw(e.target.value)} />
                <div className="pw-strength-bar"><div className="pw-fill" style={{ width: `${str.pct}%`, background: str.color }} /></div>
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{str.hint}</div>
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="r-pw2">Confirm password</label>
                <input type="password" id="r-pw2" placeholder="Repeat password" autoComplete="new-password" />
              </div>
              <button className="abtn" style={{ width: '100%', padding: 10, marginBottom: 8 }} onClick={doRegister}>Create account</button>
              <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.5 }}>
                By registering you agree to our <span style={{ color: 'var(--purple-dark)', cursor: 'pointer' }}>Terms of Service</span> and <span style={{ color: 'var(--purple-dark)', cursor: 'pointer' }}>Privacy Policy</span>
              </div>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}

          {/* OTP */}
          {tab === 'otp' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, background: 'var(--purple-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <i className="ti ti-device-mobile-message" style={{ fontSize: 24, color: 'var(--purple-dark)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 5 }}>Verify your phone</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>We sent a 6-digit code to <strong>{pendingPhone}</strong></div>
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    className="otp-input"
                    maxLength={1}
                    value={d}
                    aria-label={`OTP digit ${i + 1}`}
                    onChange={e => {
                      const v = e.target.value.slice(-1);
                      const next = [...otp]; next[i] = v; setOtp(next);
                      if (v && i < 5) otpRefs.current[i + 1]?.focus();
                    }}
                  />
                ))}
              </div>
              <button className="abtn" style={{ width: '100%', padding: 10, marginBottom: 10 }} onClick={verifyOTP}>Verify &amp; continue</button>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                Didn't receive code? <button onClick={startCountdown} style={{ fontSize: 11, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer' }}>Resend</button>
                <span style={{ color: 'var(--text3)' }}>{countdown > 0 ? ` in ${countdown}s` : ' — resend now'}</span>
              </div>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}

          {/* FORGOT */}
          {tab === 'forgot' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>Reset your password</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Enter your email — we will send a reset link valid for 15 minutes.</div>
              <div className="frow">
                <label className="flbl" htmlFor="forgot-email">Email address</label>
                <input type="email" id="forgot-email" placeholder="abebe@example.com" />
              </div>
              <button className="abtn" style={{ width: '100%', padding: 10, marginBottom: 9 }} onClick={doForgot}>Send reset link</button>
              <button onClick={() => setTab('signin')} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer' }}>Back to sign in</button>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}

          {/* RESET */}
          {tab === 'reset' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>Set a new password</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Your reset link is valid. Choose a strong new password.</div>
              <div className="frow">
                <label className="flbl" htmlFor="reset-pw">New password</label>
                <input type="password" id="reset-pw" placeholder="••••••••" autoComplete="new-password" />
              </div>
              <div className="frow">
                <label className="flbl" htmlFor="reset-pw2">Confirm password</label>
                <input type="password" id="reset-pw2" placeholder="••••••••" autoComplete="new-password" />
              </div>
              <button className="abtn" style={{ width: '100%', padding: 10 }} onClick={doReset}>Update password</button>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text2)' }}>
          {tab === 'signin' ? (
            <>Don't have an account? <button onClick={() => setTab('register')} style={{ fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Register here</button></>
          ) : tab === 'register' ? (
            <>Already have an account? <button onClick={() => setTab('signin')} style={{ fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Sign in</button></>
          ) : null}
        </div>
      </div>
    </div>
  );
}
