# LuckyAI

MERN monorepo: React (Vite) frontend + Express/MongoDB backend.

## Structure

```
luckyai/
├── frontend/     # React UI (Vite) — unchanged look & mock store
├── backend/      # Express API — MVC (models, controllers, routes)
└── package.json  # npm workspaces
```

## Setup

```bash
npm install
```

Copy environment files:

```bash
cp .env.example backend/.env
```

## Development

Run both apps:

```bash
npm run dev
```

Frontend only (same UI as before):

```bash
npm run dev:web
```

Backend only:

```bash
npm run dev:api
```

- Frontend: http://localhost:5173
- API health: http://localhost:5001/api/health (port 5000 reserved for other apps, e.g. University Student Hub)

The frontend still uses local mock state in `frontend/src/store.tsx`. API routes are scaffolded for future wiring.

## Production build

```bash
npm run build
```
