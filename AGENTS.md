# Base44 Dev Environment — Shinobi Clash

Anime ninja gacha RPG: **React (CRA + CRACO)** frontend + **FastAPI** backend + **MongoDB**.

## Run
```bash
docker compose -f docker-compose.base44.yml up -d
```
Frontend (web entry point) is on **host port 3000**. Health check: `GET /` returns the CRA HTML; `GET /api/` returns `{"message":"Shinobi Clash API online"}`.

## Architecture / wiring (important)
- **Single-origin via dev proxy.** The app uses cookie-based auth (`withCredentials`, httpOnly JWT cookies with `samesite=lax`). To keep cookies same-origin in the browser, the frontend's axios baseURL is set to the relative `/api` (`REACT_APP_BACKEND_URL=` empty) and `frontend/src/setupProxy.js` proxies `/api` → `http://backend:8000`. Do NOT point `REACT_APP_BACKEND_URL` at a cross-origin URL or auth cookies will not be sent.
- **Shared repo mount.** Both `backend` and `web` mount the whole repo at `/app`. The backend writes AI-generated portraits to `frontend/public/custom/` (served by the CRA dev server at `/custom/<id>.png`), so the shared mount is required — do not give the backend its own isolated volume.
- **External hostname.** `craco.config.js` sets `devServerConfig.allowedHosts = "all"` so the preview's changing external hostname is accepted. `HOST=0.0.0.0` binds all interfaces.

## The `emergentintegrations` package (known limitation)
`emergentintegrations==0.2.0` is a **private** Emergent package — it is NOT on public PyPI and is normally pre-installed in Emergent's base image. It cannot be installed here. It is only used for AI hero-design / portrait / art generation (`LlmChat`, `UserMessage`).
- The import in `backend/server.py` is wrapped in try/except and a `_require_llm()` guard makes those endpoints return **HTTP 503** instead of crashing the server.
- `backend/requirements.base44.txt` is `requirements.txt` **minus** `emergentintegrations` and the heavy `litellm` wheel (only a dep of emergentintegrations). The compose installs this filtered file.
- To enable AI features: provide a real `EMERGENT_LLM_KEY` (Emergent Universal Key) AND make the `emergentintegrations` package importable (e.g. install the wheel into the backend container), then remove the try/except.

## Secrets
- `EMERGENT_LLM_KEY` — optional. Placeholder lives in `.env.base44-defaults` (first env_file); a real value from the Base44 Secrets dashboard overrides it via `/run/base44/app.env` (last env_file). Not required to boot.
- `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL` are local-infra/generated values set inline in compose `environment:` — NOT secrets.

## Default admin login
`admin@shinobi.com` / `admin123` (seeded on startup, configurable via `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

## Live reload
- Frontend: CRA/webpack HMR on edit.
- Backend: `uvicorn --reload` watches `/app/backend`.

## Tests
Backend pytest suite: `docker compose -f docker-compose.base44.yml exec backend pytest` (config in `backend/pytest.ini`). Note: tests covering AI endpoints may need `emergentintegrations`.
