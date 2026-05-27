import { useStore } from '../store';
import type { Lang } from '../types';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'am', label: 'አማ' },
  { code: 'om', label: 'OMO' },
  { code: 'af', label: 'AFR' },
  { code: 'ti', label: 'ትግ' },
];

const PAGE_TITLES: Record<string, string> = {
  home: 'Home', auth: 'Sign in', spin: 'Try your chance',
  scratch: 'Scratch & Win', quick: 'Quick Play', daily: 'Daily Reward',
  draw: 'Crown Draw', wallet: 'Wallet', tickets: 'My Tickets',
  account: 'Account', notifications: 'Notifications', admin: 'Admin Panel',
  stars: 'Stars Hub', weekly: 'Weekly Draw',
};

export default function Topbar() {
  const { state, page, goPage, toggleSidebar, darkMode, setDarkMode, lang, setLang } = useStore();
  const unread = state.notifications.filter(n => !n.read).length;

  return (
    <div className="topbar">
      <button className="hamburger" onClick={toggleSidebar} aria-label="Open menu">
        <i className="ti ti-menu-2" />
      </button>
      <div className="tb-brand" onClick={() => goPage('home')}>
        <div className="tb-orb"><i className="ti ti-star" /></div>
        <div>
          <div className="tb-name">LuckyAI</div>
          <div className="tb-sub">Rewards Platform</div>
        </div>
      </div>
      <div className="tb-title">{PAGE_TITLES[page] || ''}</div>
      <div className="tb-right">
        <span className="pill p-green" style={{ fontSize: 10 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 10 }} /> System live
        </span>
        <span className="pill p-amber" onClick={() => goPage('wallet')}>
          Balance: {Math.round(state.balance).toLocaleString()} ETB
        </span>
        <span className="pill p-star" onClick={() => goPage('stars')}>
          {state.starsBalance.toLocaleString()} Stars
        </span>
        <span className="pill p-purple">{state.isPremium ? 'Premium' : 'Free plan'}</span>

        {/* Language selector */}
        <select
          value={lang}
          onChange={e => setLang(e.target.value as Lang)}
          style={{
            fontSize: 10, fontWeight: 500, padding: '3px 5px', borderRadius: 7,
            border: '0.5px solid var(--border2)', background: 'var(--surface)',
            color: 'var(--text)', cursor: 'pointer', outline: 'none', height: 26,
          }}
          aria-label="Language"
        >
          {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>

        {/* Dark mode toggle */}
        <button
          className="ib"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          <i className={`ti ${darkMode ? 'ti-sun' : 'ti-moon'}`} />
        </button>

        <button className="ib" onClick={() => goPage('notifications')} aria-label="Notifications">
          <i className="ti ti-bell" />
          {unread > 0 && <span className="rdot" />}
        </button>
        <button className="ib" onClick={() => goPage('account')} aria-label="My account">
          <i className="ti ti-user" />
        </button>
      </div>
    </div>
  );
}
