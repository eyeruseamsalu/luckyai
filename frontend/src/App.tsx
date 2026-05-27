import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Daily from "./pages/Daily";
import Draw from "./pages/Draw";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
import Quick from "./pages/Quick";
import Scratch from "./pages/Scratch";
import Spin from "./pages/Spin";
import Stars from "./pages/Stars";
import Tickets from "./pages/Tickets";
import Wallet from "./pages/Wallet";
import Weekly from "./pages/Weekly";
import { StoreProvider, useStore } from "./store";

function AppShell() {
	const { page } = useStore();

	return (
		<div className="app">
			<Topbar />
			<div className="body">
				<Sidebar />
				<main className="content">
					{page === "home" && <Home />}
					{page === "auth" && <Auth />}
					{page === "spin" && <Spin />}
					{page === "scratch" && <Scratch />}
					{page === "quick" && <Quick />}
					{page === "daily" && <Daily />}
					{page === "draw" && <Draw />}
					{page === "wallet" && <Wallet />}
					{page === "tickets" && <Tickets />}
					{page === "account" && <Account />}
					{page === "notifications" && <Notifications />}
					{page === "admin" && <Admin />}
					{page === "stars" && <Stars />}
					{page === "weekly" && <Weekly />}
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
