import { useStore } from '../store';
import { t } from '../translations';

export default function Sidebar() {
  const { state, page, goPage, sidebarOpen, closeSidebar, lang } = useStore();
  const unread = state.notifications.filter(n => !n.read).length;

  const nb = (id: Parameters<typeof goPage>[0], icon: string, label: string, pip?: React.ReactNode) => (
    <button className={`nb${page === id ? ' on' : ''}`} onClick={() => goPage(id)}>
      <i className={`ti ${icon}`} />
      {label}
      {pip}
    </button>
  );

  const authAction = () => {
    if (state.isLoggedIn) goPage('account');
    else goPage('auth');
  };

  return (
    <>
      <div className={`overlay${sidebarOpen ? ' on' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="s-lbl" style={{ marginTop: 2 }}>Main</div>
        {nb('home',    'ti-home',            t(lang, 'home'))}
        {nb('spin',    'ti-rotate-clockwise', t(lang, 'tryChance'))}
        {nb('draw',    'ti-trophy',           t(lang, 'crownDraw'))}
        {nb('weekly',  'ti-calendar-stats',   t(lang, 'weeklyDraw'),
          <span className="nb-pip" style={{ background: 'var(--purple-light)', color: 'var(--purple-dark)' }}>
            100K
          </span>
        )}
        {nb('wallet',  'ti-wallet',           t(lang, 'wallet'))}
        {nb('tickets', 'ti-ticket',           t(lang, 'myTickets'))}
        <div className="s-div" />
        <div className="s-lbl">Games</div>
        {nb('scratch', 'ti-cards',          t(lang, 'scratchWin'))}
        {nb('quick',   'ti-bolt',           t(lang, 'quickPlay'))}
        {nb('daily',   'ti-calendar-check', t(lang, 'dailyReward'),
          <span className="nb-pip" style={{ background: 'var(--amber-light)', color: 'var(--amber-text)' }}>
            {t(lang, 'day')} {state.streak}
          </span>
        )}
        <div className="s-div" />
        <div className="s-lbl">Economy</div>
        {nb('stars', 'ti-star', t(lang, 'starsHub'),
          <span className="nb-pip" style={{ background: 'var(--star-light)', color: 'var(--star-dark)' }}>
            {state.starsBalance}
          </span>
        )}
        <div className="s-div" />
        {nb('account', 'ti-user',
          state.isLoggedIn ? state.userData.name : t(lang, 'myAccount')
        )}
        {nb('notifications', 'ti-bell', t(lang, 'notifications'),
          unread > 0 && (
            <span className="nb-pip" style={{ background: 'var(--red-light)', color: 'var(--red-dark)' }}>
              {unread}
            </span>
          )
        )}
        <div className="s-div" />
        {state.isLoggedIn && state.userRole === 'admin' && (
          <button className={`nb${page === 'admin' ? ' on' : ''}`}
            style={{ color: 'var(--purple-dark)' }}
            onClick={() => goPage('admin')}>
            <i className="ti ti-settings" />Admin panel
          </button>
        )}
        <button className="nb" onClick={authAction}>
          <i className={`ti ${state.isLoggedIn ? 'ti-logout' : 'ti-login'}`} />
          {state.isLoggedIn ? t(lang, 'signOut') : t(lang, 'signIn')}
        </button>
      </aside>
    </>
  );
}
