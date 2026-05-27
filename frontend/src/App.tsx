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
import Admin from './pages/Admin';
import Stars from './pages/Stars';
import Weekly from './pages/Weekly';

function AppShell() {
  const { page } = useStore();

  return (
    <div className="app">
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="content">
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
          {page === 'admin'         && <Admin />}
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
