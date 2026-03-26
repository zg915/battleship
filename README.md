# Battleship

A real-time multiplayer Battleship game with AI opponent, game replay, and a strategy assist heatmap.

## Architecture

```
Browser (Next.js on Vercel)
  |
  |--- REST API / WebSocket --->  FastAPI on Render (Docker)
                                      |
                                      |--- PostgreSQL (Render)
```

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: FastAPI, SQLAlchemy (async), WebSockets
- **Database**: PostgreSQL 16

## Project Structure

```
battleship/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, lifespan
│   │   ├── config.py               # Settings from environment
│   │   ├── database.py             # Async SQLAlchemy engine
│   │   ├── models.py               # Game, Player, Move tables
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── engine/
│   │   │   ├── types.py            # Core data types (Ship, GameState)
│   │   │   ├── game_engine.py      # Game logic (placement, moves, win)
│   │   │   └── ai.py               # AI opponent (hunt/target strategy)
│   │   ├── services/
│   │   │   ├── game_service.py     # Business logic layer
│   │   │   └── ws_manager.py       # WebSocket connection manager
│   │   └── routers/
│   │       ├── games.py            # REST endpoints
│   │       └── websocket.py        # WebSocket endpoint
│   ├── tests/
│   │   └── test_engine.py          # 35+ unit tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Home (new game / game list)
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── globals.css         # Theme variables
│   │   │   ├── game/[id]/page.tsx  # Game play page
│   │   │   └── replay/[id]/page.tsx# Replay viewer
│   │   ├── components/
│   │   │   ├── Board.tsx           # 10x10 grid with heatmap support
│   │   │   ├── ShipPlacer.tsx      # Drag-and-drop ship placement
│   │   │   ├── GameStatus.tsx      # Turn/phase display
│   │   │   ├── ShipTracker.tsx     # Enemy fleet tracker
│   │   │   ├── ReplayControls.tsx  # Replay playback controls
│   │   │   └── RulesButton.tsx     # Game rules modal
│   │   ├── hooks/
│   │   │   ├── useGameState.ts     # Game state management
│   │   │   ├── useWebSocket.ts     # WebSocket with auto-reconnect
│   │   │   └── useStrategyAssist.ts# Strategy heatmap toggle
│   │   └── lib/
│   │       ├── types.ts            # TypeScript interfaces
│   │       ├── constants.ts        # Board size, ship definitions
│   │       ├── api.ts              # REST API client
│   │       └── strategyAssist.ts   # Probability heatmap algorithm
│   ├── package.json
│   └── .env.example
├── docker-compose.yml              # Local dev: Postgres + backend
└── .gitignore
```

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (for PostgreSQL)

### 1. Start the database and backend

```bash
# From the project root
docker compose up -d

# This starts:
#   - PostgreSQL on localhost:5432
#   - Backend API on localhost:8000
```

Or run the backend manually (if you have your own Postgres):

```bash
cd backend
cp .env.example .env    # edit DATABASE_URL if needed
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env.local    # defaults point to localhost:8000
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Run tests

```bash
cd backend
pytest tests/ -v
```

## Deploying to Production

### Backend (Render)

1. Create a **PostgreSQL** database on Render
2. Create a **Web Service** from the `backend/` directory
3. Set **Docker** as the build type
4. Set environment variables:
   - `DATABASE_URL` — the Render Postgres internal URL (change `postgresql://` to `postgresql+asyncpg://`)
   - `CORS_ORIGINS` — `["https://your-app.vercel.app"]`

### Frontend (Vercel)

1. Connect the repo to Vercel, set the root directory to `frontend/`
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_WS_URL` — `wss://your-backend.onrender.com`

## API Reference

All endpoints are prefixed with the backend URL (default `http://localhost:8000`).

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/games` | Create a game. Body: `{ mode: "ai" \| "human", display_name }` |
| `POST` | `/games/{id}/join` | Join a human game. Body: `{ display_name }` |
| `GET` | `/games/{id}/state?token=` | Get current game state for a player |
| `POST` | `/games/{id}/placement` | Submit ship placement. Body: `{ token, ships: [{ type, cells }] }` |
| `POST` | `/games/{id}/fire` | Fire a shot. Body: `{ token, row, col }` |
| `GET` | `/games/{id}/replay` | Get full replay data for a finished game |
| `GET` | `/games` | List recent finished games |
| `GET` | `/games/waiting` | List games waiting for a second player |
| `GET` | `/health` | Health check |

### WebSocket

Connect to `ws://localhost:8000/ws/games/{id}?token=` for real-time multiplayer.

**Client messages:**
```json
{ "type": "placement", "ships": [{ "type": "carrier", "cells": [[0,0],[0,1],[0,2],[0,3],[0,4]] }] }
{ "type": "fire", "row": 3, "col": 5 }
```

**Server messages:**
```json
{ "type": "game_update", "state": { ... } }
{ "type": "error", "message": "..." }
```

## Game Rules

- Each player places 5 ships on a 10x10 grid: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Players take turns firing at the opponent's board
- Hit = turn passes to opponent. Miss = turn passes to opponent. Sunk = all cells of a ship hit
- First player to sink all 5 enemy ships wins

## Features

### AI Opponent
Hunt/target strategy with checkerboard parity optimization. In hunt mode, the AI only targets cells where `(row + col) % 2 == 0`, since the smallest ship is 2 cells long. In target mode, it extends along detected ship direction.

### Strategy Assist
A client-side probability heatmap toggled during gameplay. For each remaining unsunk ship, it enumerates all legal placements consistent with current evidence (hits, misses, sunk cells) and scores each unknown cell by how many placements cover it. Operates in two modes:

- **Hunt mode** (no unresolved hits): global placement coverage search
- **Target mode** (unresolved hits): placements must be compatible with hit clusters

The highest-scoring cell is marked with a clover. Impossible cells (no valid placement can reach them) are dimmed.

### Game Replay
Every move is stored in the database. Finished games can be replayed step-by-step with play/pause controls.

### Multiplayer
Real-time gameplay via WebSocket. Share the game URL with an opponent to play.

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://localhost:5432/battleship` | PostgreSQL connection string |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins (JSON array) |
| `PORT` | `8000` | Server port (used by Render) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Backend WebSocket base URL |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js (App Router) | 16.2 |
| UI library | React | 19.2 |
| Styling | Tailwind CSS | 4.x |
| Language | TypeScript | 5.x |
| Backend framework | FastAPI | 0.115+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Database | PostgreSQL | 16 |
| WebSocket | FastAPI + websockets | 12.0 |
| Container | Docker | - |
