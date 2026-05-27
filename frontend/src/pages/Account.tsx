import { useState } from 'react';
import { useStore } from '../store';

export default function Account() {
  const { state, logout, updateUserData, goPage } = useStore();
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const showT = (msg: string, cls: string) => { setToast({ msg, cls }); setTimeout(() => setToast(null), 3000); };

  const saveProfile = () => {
    const name = (document.getElementById('ac-name') as HTMLInputElement)?.value?.trim();
    const email = (document.getElementById('ac-email') as HTMLInputElement)?.value?.trim();
    const phone = (document.getElementById('ac-phone') as HTMLInputElement)?.value?.trim();
    if (!name) { showT('Name cannot be empty', 'tx'); return; }
    if (!email?.includes('@')) { showT('Invalid email', 'tx'); return; }
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    updateUserData({ name, email, phone, initials });
    showT('Profile updated successfully', 'ts');
  };

  const savePw = () => {
    const cur = (document.getElementById('ac-cur-pw') as HTMLInputElement)?.value;
    const nw = (document.getElementById('ac-new-pw') as HTMLInputElement)?.value;
    const cf = (document.getElementById('ac-cf-pw') as HTMLInputElement)?.value;
    if (!cur) { showT('Enter current password', 'tx'); return; }
    if (nw.length < 8) { showT('New password must be at least 8 characters', 'tx'); return; }
    if (nw !== cf) { showT('Passwords do not match', 'tx'); return; }
    showT('Password changed successfully', 'ts');
  };

  if (!state.isLoggedIn && !state.isGuest) {
    return (
      <div className="pg on" id="p-account">
        <div style={{ maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Sign in to view your account</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Create an account or sign in to manage your profile, preferences, and security settings.</div>
          <button className="abtn" style={{ marginRight: 8 }} onClick={() => goPage('auth')}>Sign in</button>
          <button className="sbtn" onClick={() => goPage('auth')}>Register</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg on" id="p-account">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Profile header */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div className="av" style={{ width: 56, height: 56, fontSize: 18 }}>{state.userData.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{state.userData.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{state.userData.email}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {state.isPremium && <span className="tag ta">Premium</span>}
                {state.userRole === 'admin' && <span className="tag tp">Admin</span>}
                <span className="tag tg">Verified</span>
                <span className="tag ts-tag">★ {state.starsBalance} Stars</span>
              </div>
            </div>
          </div>
          <div className="g4">
            <div className="mc"><div className="ml">Balance</div><div className="mv">{Math.round(state.balance).toLocaleString()} ETB</div></div>
            <div className="mc"><div className="ml">Stars</div><div className="mv" style={{ color: 'var(--star-dark)' }}>{state.starsBalance} ★</div></div>
            <div className="mc"><div className="ml">Tickets</div><div className="mv">{state.tickets}</div></div>
            <div className="mc"><div className="ml">Streak</div><div className="mv">{state.streak}🔥</div></div>
          </div>
        </div>

        {/* Plan */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="sec" style={{ marginBottom: 10 }}>Membership plan</div>
          <div className="tier-row" style={{ marginBottom: 12 }}>
            <div className={`tier${!state.isPremium ? ' on' : ''}`}>
              <div className="t-price">Free</div>
              <div className="t-lbl">Current plan</div>
            </div>
            <div className={`tier${state.isPremium ? ' on' : ''}`}>
              <div className="t-price">99 ETB<span style={{ fontSize: 10, fontWeight: 400 }}>/mo</span></div>
              <div className="t-lbl">Premium · Unlock all</div>
            </div>
            <div className="tier">
              <div className="t-price">249 ETB<span style={{ fontSize: 10, fontWeight: 400 }}>/mo</span></div>
              <div className="t-lbl">VIP · Max perks</div>
            </div>
          </div>
          {!state.isPremium && (
            <div style={{ background: 'var(--amber-light)', border: '0.5px solid var(--amber)', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, color: 'var(--amber-text)', lineHeight: 1.5 }}>
              💡 Tip: Spend <strong>200 ★ Stars</strong> in the Stars Store to unlock Premium for 24h — no ETB needed!
            </div>
          )}
          <button className={state.isPremium ? 'sbtn' : 'abtn'} style={{ width: '100%' }} onClick={() => goPage('stars')}>
            {state.isPremium ? 'You are on Premium' : 'Upgrade with ETB or Stars'}
          </button>
        </div>

        {/* Edit profile */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="sec" style={{ marginBottom: 12 }}>Edit profile</div>
          <div className="g2" style={{ gap: 10, marginBottom: 0 }}>
            <div className="frow" style={{ marginBottom: 10 }}>
              <label className="flbl" htmlFor="ac-name">Full name</label>
              <input type="text" id="ac-name" defaultValue={state.userData.name} />
            </div>
            <div className="frow" style={{ marginBottom: 10 }}>
              <label className="flbl" htmlFor="ac-phone">Phone</label>
              <input type="tel" id="ac-phone" defaultValue={state.userData.phone} />
            </div>
          </div>
          <div className="frow">
            <label className="flbl" htmlFor="ac-email">Email</label>
            <input type="email" id="ac-email" defaultValue={state.userData.email} />
          </div>
          {toast && <div className={`toast ${toast.cls}`} style={{ marginBottom: 10 }}>{toast.msg}</div>}
          <button className="abtn" onClick={saveProfile}>Save changes</button>
        </div>

        {/* Change password */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="sec" style={{ marginBottom: 12 }}>Change password</div>
          <div className="frow">
            <label className="flbl" htmlFor="ac-cur-pw">Current password</label>
            <input type="password" id="ac-cur-pw" placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="frow">
            <label className="flbl" htmlFor="ac-new-pw">New password</label>
            <input type="password" id="ac-new-pw" placeholder="Min 8 characters" autoComplete="new-password" />
          </div>
          <div className="frow">
            <label className="flbl" htmlFor="ac-cf-pw">Confirm new password</label>
            <input type="password" id="ac-cf-pw" placeholder="Repeat new password" autoComplete="new-password" />
          </div>
          <button className="sbtn" onClick={savePw}>Update password</button>
        </div>

        {/* Security */}
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="sec" style={{ marginBottom: 10 }}>Security</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'ti-lock',         label: '2-Factor Authentication',     value: 'Enabled via SMS',    badge: 'tg' },
              { icon: 'ti-shield-check', label: 'Login notifications',          value: 'Active',             badge: 'tg' },
              { icon: 'ti-eye-off',      label: 'Session timeout',              value: '30 minutes',         badge: 'tt' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                <i className={`ti ${r.icon}`} style={{ fontSize: 16, color: 'var(--text2)', width: 20, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12 }}>{r.label}</span>
                <span className={`tag ${r.badge}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Sign out</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>End your session on this device</div>
            </div>
            <button className="dbtn" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
