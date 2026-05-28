# LuckyAI 🍀

**LuckyAI** is a full-stack lottery & gaming platform with multiple game modes, a virtual wallet (ETB + Stars), daily rewards, crown & weekly draws, a stars shop, boosters, and a full admin dashboard — all wrapped in a responsive bilingual (Amharic/English) UI.

---

## ✨ Features at a Glance

| Feature | Description |
|---------|------------|
| 🎮 3 Games | Quick Pick (pick 3 numbers), Spin Wheel, Scratch Cards |
| 🎯 Crown Draw | Pick 6 numbers (1–42), win from prize pool |
| 🎯 Weekly Draw | Free entry with stars, auto-closes every Monday |
| 💰 Wallet | Deposit/withdraw ETB (min 50, max 50,000) |
| ⭐ Stars Economy | Earn stars from games & daily rewards |
| 🛒 Stars Shop | Multiplier boosts, mystery boxes, crown tickets |
| 📅 Daily Rewards | Streak system with 7-day bonuses |
| 👑 Admin Dashboard | Full CRUD: users, configs, draws, economy |
| 🔔 Notifications | In-app notification system |
| 🌐 Bilingual | Full Amharic + English translations |

---

## 🏗️ Architecture

```
Frontend (React/Vite :5173) ───HTTP──→ Backend (Express :5000) ───ODM──→ MongoDB
                                              │
                                         JWT Auth Middleware
                                         (user / admin / suspended)
```

### Monorepo Layout

```
luckyai/
├── frontend/                 # React SPA — 15 pages, Context state, bilingual
├── backend/                  # Express API — 16 controllers, 16 models, 14 route files
├── e2e/                      # Playwright E2E — 13 test files, 76+ tests, in-memory MongoDB
├── .env.example              # Environment template
└── package.json              # npm workspaces root
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, CSS |
| Backend | Node.js, Express, TypeScript (ESM / NodeNext) |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT (jsonwebtoken) |
| RNG | Node.js `crypto.randomInt()` — cryptographically secure |
| E2E Tests | Playwright + mongodb-memory-server (zero external deps) |
| Dev Runner | concurrently + tsx |

---

## 🚀 Quick Start

```bash
# 1. Install
git clone <repo-url> && cd luckyai && npm install

# 2. Configure
cp .env.example backend/.env
# Edit backend/.env with your MongoDB URI and JWT secret

# 3. Start dev servers (frontend :5173 + backend :5000)
npm run dev
```

**Create an admin:** Register via UI, then in MongoDB:
```
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

---

## 🧪 Testing

**No external MongoDB or Docker required.** Everything runs in-memory:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx tsx e2e/run-with-memory-db.ts e2e/integration.spec.ts
```

Test suite: **63 integration tests** covering every endpoint, cross-feature flows, admin operations, and edge cases — all passing.

---

## 🎮 Games

| Game | How to Play | Cost Tiers | Win Condition |
|------|------------|------------|--------------|
| **Quick Pick** | Pick 3 numbers (1–20) | 2, 5, 10 ETB | Match drawn numbers |
| **Spin Wheel** | Spin the wheel | 5, 15, 30, 50 ETB | Weighted segments (free → jackpot) |
| **Scratch Card** | Reveal scratch card | 5, 10, 25, 50 ETB | Prize tiers (free → jackpot) |

### Crown Draw
- Entry: 50 stars **or** 500 ETB **or** hybrid split
- Pick 6 numbers (1–42)
- Admin draws winners from entries
- Prize pool accumulates from entry fees

### Weekly Draw
- Entry: 800 stars
- Pick 6 numbers (1–42)
- Auto-closes every Monday at 8 PM
- Winners determined by matching drawn numbers

---

## 🛒 Stars Shop

| Item | Cost | Effect |
|------|------|--------|
| Multiplier Boost | 150 stars | 2× winnings for 5 plays |
| Mystery Box | 200 stars | Random 10–200 stars |
| Crown Ticket | 100 stars | +1 crown draw entry |

---

## 👑 Admin Dashboard

- **Overview**: Platform stats (users, games, deposits, draws)
- **Users**: List, search, suspend/activate, edit any field
- **Game Config**: Costs, multipliers, segment weights
- **Platform Config**: Limits (min/max deposit/withdrawal, daily caps)
- **Economy Config**: Star-to-ETB rate, shop items
- **Crown Draws**: Create, run (determine winners), cancel
- **Weekly Draws**: Create, view entries

---

## 🔐 Auth & Security

- JWT-based auth with configurable secret
- Three roles: `user` | `admin` | `suspended`
- Middleware: `requireAuth` + `requireAdmin`
- Passwords hashed with bcrypt
- All game RNG uses `crypto.randomInt()` (not `Math.random()`)
- Input validation on every endpoint

---

## 📡 API Surface (all under `/api`)

| Domain | Endpoints |
|--------|-----------|
| Health | `GET /health` |
| Auth | `POST /register`, `POST /login`, `GET /me` |
| Wallet | `POST /deposit`, `POST /withdraw`, `GET /balance`, `GET /transactions` |
| Games | `POST /games/quick/play`, `POST /games/spin/play`, `POST /games/scratch/play`, `GET /games/history` |
| Daily | `POST /daily/claim`, `GET /daily/status` |
| Shop | `GET /shop/items`, `POST /shop/buy/:itemId` |
| Boosts | `GET /boosts`, `GET /boosts/active` |
| Tickets | `GET /tickets` |
| Draws | `POST /draws/crown/enter`, `GET /draws/crown/current`, `GET /draws/crown/entries`, `POST /draws/crown/suggest`, `POST /draws/weekly/enter`, `GET /draws/weekly/current`, `GET /draws/weekly/result` |
| Profile | `GET /profile`, `PUT /profile` |
| Notifications | `GET /notifications`, `PUT /:id/read`, `PUT /read-all`, `DELETE /:id` |
| Admin | `GET /admin/overview`, users CRUD, config CRUD, draw management |

---

## 🧩 Data Models (16 total)

`User` · `Transaction` · `QuickRound` · `SpinRound` · `ScratchCard` · `CrownDraw` · `CrownDrawEntry` · `WeeklyDraw` · `WeeklyEntry` · `Ticket` · `Boost` · `ShopItem` · `GameConfig` · `PlatformConfig` · `Notification`

---

## 🧠 Design Rationale

- **`crypto.randomInt()`** — all game outcomes use cryptographic randomness, never `Math.random()`
- **mongodb-memory-server** — E2E tests spin up a real MongoDB in-process; zero external dependencies
- **`role: "suspended"` instead of `status` field** — simplifies auth middleware; suspension = non-user role
- **React Context over Redux** — state complexity doesn't warrant Redux; Context + reducer keeps it lean
- **ESM + NodeNext** — future-proof module resolution across the Node.js ecosystem
- **Bilingual at the component level** — translation map in a single file, language toggle in localStorage

---

## 📦 Production

```bash
npm run build
# frontend/dist/ — static assets for CDN/Nginx
# backend/dist/  — compiled JS for Node.js host
```

Required env vars in production:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-secret>
PORT=5000
NODE_ENV=production
```

---

## 📄 License

MIT
