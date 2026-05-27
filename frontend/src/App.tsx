import { StoreProvider, useStore } from './store';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Spin from './pages/Spin';
import Scratch from './pages/Scratch';
import Quick from './pages/Quick';
import Daily from './pages/Daily';
import Draw from './pages/Draw';
import Wallet from './pages/Wallet';
import Tickets from './pages/Tickets';
import Account from './pages/Account';
import Notifications from './pages/Notifications';
import GuestBanner from './components/GuestBanner';
import Stars from './pages/Stars';
import Weekly from './pages/Weekly';

function AppShell() {
  const { page, loading } = useStore();

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="content">
          <GuestBanner />
          {page === 'home'          && <Home />}
          {page === 'auth'          && <Auth />}
          {page === 'spin'          && <Spin />}
          {page === 'scratch'       && <Scratch />}
          {page === 'quick'         && <Quick />}
          {page === 'daily'         && <Daily />}
          {page === 'draw'          && <Draw />}
          {page === 'wallet'        && <Wallet />}
          {page === 'tickets'       && <Tickets />}
          {page === 'account'       && <Account />}
          {page === 'notifications' && <Notifications />}
          {page === 'stars'         && <Stars />}
          {page === 'weekly'        && <Weekly />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
