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

## Skin images are files, NEVER base64 in JSON (payload-size trap)
Skin images used to be stored inline as base64 data URLs on the skin records in
`db.game_config` (`_id: "catalog"`). Because `gd._SKINS` is returned whole by
`/api/auth/login`, `/api/auth/me`, `/api/game/profile` **and** `/api/game/catalog`,
and is also injected onto each equipped hero instance during hydration, every one
of those responses ballooned to 14–21 MB. Over the preview proxy that exceeded the
frontend's 15s axios timeout, so logging in / entering the game failed with the
generic "Something went wrong. Please try again." (`formatApiErrorDetail(null)`),
and `/game/catalog` surfaced "Couldn't load game data".

Rules to keep it that way:
- Skin images live on disk at `frontend/public/custom/skins/<skin_id>.png` and are
  referenced as `/custom/skins/<skin_id>.png`. Use `_save_skin_png()` in `server.py`.
- `_SKINS`, the profile payload and the catalog must never contain a `data:` URL.
  Add a sanity check after any change that touches skins:
  `curl -s -X POST .../api/auth/login -d '{...}' | wc -c` must stay well under 1 MB
  (was ~21 MB). `/api/game/catalog` must stay under ~1 MB (was ~14 MB).
- `_externalize_skin_images()` runs on startup and migrates any legacy base64 skin
  left in the config out to files, then `persist_catalog_config()` rewrites the doc.
  It is idempotent — deleting the PNGs and restarting will NOT regenerate them from
  Mongo, so the files are the source of truth and are tracked in git.
- Hero portraits follow the same pattern (`/custom/<hid>.png`); never reintroduce
  base64 for them either.
- Client-side note: `GameContext` latches `catalogError` in React state. A failure
  under the old huge payload keeps the banner visible across client-side navigation
  until a full remount, so a stale banner doesn't necessarily mean the fix failed —
  reload before judging.
