import { useState } from 'react';
import { useStore } from '../store';
import { ApiError } from '../lib/api';

type Tab = 'signin' | 'register';

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
  const { loginWithCredentials, registerAccount, guest } = useStore();
  const [tab, setTab] = useState<Tab>('signin');
  const [pw, setPw] = useState('');
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3500); };

  const doSignIn = async () => {
    const email = (document.getElementById('li-email') as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById('li-pw') as HTMLInputElement)?.value;
    if (!email?.includes('@')) { showT('Enter a valid email address', 'tx'); return; }
    if (!password || password.length < 4) { showT('Enter your password', 'tx'); return; }
    setSubmitting(true);
    try {
      await loginWithCredentials(email, password);
      showT('Signed in successfully', 'ts');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Sign in failed', 'tx');
    } finally {
      setSubmitting(false);
    }
  };

  const doRegister = async () => {
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
    setSubmitting(true);
    try {
      await registerAccount({ name: `${fn} ${ln}`, email, password: p1, phone });
      showT('Account created successfully', 'ts');
    } catch (err) {
      showT(err instanceof ApiError ? err.message : 'Registration failed', 'tx');
    } finally {
      setSubmitting(false);
    }
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

          <div className="auth-tab-row">
            <button className={`auth-tab${tab === 'signin' ? ' on' : ''}`} onClick={() => setTab('signin')}>Sign in</button>
            <button className={`auth-tab${tab === 'register' ? ' on' : ''}`} onClick={() => setTab('register')}>Register</button>
          </div>

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
              <button className="abtn" style={{ width: '100%', marginBottom: 11, padding: 10 }} onClick={doSignIn} disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
              <button onClick={() => { guest(); }} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                Continue as guest (limited access)
              </button>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}

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
              <button className="abtn" style={{ width: '100%', padding: 10, marginBottom: 8 }} onClick={doRegister} disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
              <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.5 }}>
                By registering you agree to our Terms of Service and Privacy Policy
              </div>
              {toast && <div className={`toast ${toast.cls}`}><span style={{ fontWeight: 500 }}>{toast.msg}</span></div>}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text2)' }}>
          {tab === 'signin' ? (
            <>Don't have an account? <button onClick={() => setTab('register')} style={{ fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Register here</button></>
          ) : (
            <>Already have an account? <button onClick={() => setTab('signin')} style={{ fontSize: 12, color: 'var(--purple-dark)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
