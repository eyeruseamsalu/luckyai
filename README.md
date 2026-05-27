# LuckyAI

MERN monorepo: React (Vite) player app + separate admin app + Express/MongoDB backend.

## Structure

```
luckyai/
├── frontend/     # Player app (port 5173)
├── admin/        # Admin panel (port 5174)
├── backend/      # Express API
└── package.json  # npm workspaces
```

## Setup

```bash
npm install
cp .env.example backend/.env
```

Ensure MongoDB is running (`mongodb://127.0.0.1:27017/luckyai`).

## Development

```bash
# Player + API
npm run dev

# Player + API + Admin
npm run dev:all
```

| App | URL |
|-----|-----|
| Player | http://localhost:5173 |
| Admin | http://localhost:5174 |
| API | http://localhost:5001/api/health |

## Seed admin

```bash
curl -X POST http://localhost:5001/api/admin/seed-admin -H "Content-Type: application/json" -d "{\"email\":\"admin@luckyai.com\",\"password\":\"admin12345\"}"
```

Sign in at **http://localhost:5174** with those credentials.

## Key APIs

| Route | Description |
|-------|-------------|
| `GET /api/platform/state` | Public platform state (countdown, community stars, jackpots) |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `GET /api/wallet` | Balance + transactions |
| `POST /api/games/spin` | Spin (server-side odds) |
| `GET /api/admin/overview` | Admin stats + revenue pools |
| `POST /api/admin/crown-draw` | Run crown draw + pay winners |

## Crown activation

Community Stars accumulate on the backend when users earn Stars. When `communityStars >= starTarget`, the API automatically schedules the Crown draw countdown. The homepage polls `GET /api/platform/state` every second and displays server-computed countdown text only.

## Revenue split

Paid plays distribute gross revenue: Crown 35%, Weekly 25%, Platform 25%, Reserve 15%.
