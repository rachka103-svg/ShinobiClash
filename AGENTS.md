# Base44 Dev Environment — Shinobi Clash

Fullstack gacha battle game: FastAPI + MongoDB backend, React (CRA/craco + Tailwind) frontend.

## Architecture (single-origin)
- **frontend** (port 3000, public): `craco start` dev server. `REACT_APP_BACKEND_URL` is empty so the axios client calls `/api`, which the craco dev-server proxy forwards to the backend. This keeps cookie auth (httpOnly, SameSite=Lax) same-origin.
- **backend** (internal, 8000): `uvicorn server:app --reload`. Not exposed publicly; reached only via the frontend proxy.
- **mongo** (internal): `mongo:7`, no auth, healthchecked.

## Setup quirks
- `emergentintegrations==0.2.0` (proprietary emergent.sh LLM library) is NOT installable outside the emergent.sh platform. The compose command writes a local stub package to `/opt/stubs` (kept out of the repo) and puts it on `PYTHONPATH`, so `server.py` imports and boots. The stub raises `RuntimeError` when the AI-art LLM endpoints are actually called — they return their existing 502/500 error. The rest of the game is unaffected.
- `litellm` (custom wheel) is skipped during install since it's only a dependency of the stubbed `emergentintegrations`.
- Backend writes generated portraits to `frontend/public/custom/` — both services share the repo bind-mount at `/app`, so the frontend dev server serves them.
- The craco config was extended with a `/api` proxy and `allowedHosts: "all"` so the preview's external hostname is accepted.

## Credentials
- Local infra (Mongo, JWT secret, admin user) is generated inline in compose — not secrets.
- `EMERGENT_LLM_KEY` is an external secret (emergent.sh LLM API). Not required to boot; needed only for AI-art features. Provide it via the Base44 secrets UI; it lands in `/run/base44/app.env` and overrides the placeholder in `.env.base44-defaults`.
- Default admin login: `admin@shinobi.com` / `admin123`.

## Auto-recovery (loading-stuck fix)
- **Restart policies**: `backend` and `frontend` services have `restart: unless-stopped` — if either container crashes (MongoDB connection drop, OOM, unhandled exception), Docker restarts it automatically instead of leaving it down (which would manifest as a permanent "stuck in loading" screen).
- **Backend healthcheck**: pings `GET /api/` every 30s; 3 consecutive failures mark the container unhealthy and trigger a restart.
- **Token refresh interceptor** (`frontend/src/lib/api.js`): an axios response interceptor catches 401s, silently calls `POST /api/auth/refresh` (using the 7-day refresh-token cookie), and retries the original request. This prevents the app from appearing broken when the 15-minute access token expires. A shared promise lock ensures only one refresh fires at a time.
- **ServerGate infinite retry** (`frontend/src/components/ServerGate.jsx`): the gatekeeper no longer gives up after 30 attempts — it retries indefinitely with capped backoff (max 15s), so the app auto-reconnects whenever the backend comes back online.

## Verify it works
```bash
docker compose -f docker-compose.base44.yml up -d
# frontend (external host must pass):
curl -sf -H "Host: external-preview.example.com" http://localhost:3000/ -o /dev/null   # 200
curl -sf -H "Host: external-preview.example.com" http://localhost:3000/api/            # {"message":"Shinobi Clash API online"}
```
Frontend changes hot-reload; backend changes reload via uvicorn `--reload`. If a change isn't picked up, call `reload_preview`.

## Repo fix applied during setup
- Commit `efb9c98` appended a block of placeholder stubs (`def _kit_support(): ...`, `_ROLE_KIT_BUILDERS = {...}`, `_hero_jutsus(): ...`) at the end of `backend/game_data.py`, shadowing the real implementations and crashing import with `TypeError: _hero_jutsus() takes 0 positional arguments`. The stub block was removed and `_hero_jutsus(hid, name, element, rarity, role)` restored (kit builder → ascendant skill for GR+ → `_apply_rarity_mastery`).
- `.env.base44-defaults` (placeholder `EMERGENT_LLM_KEY`) is required by compose but gitignored — recreate it if missing.
