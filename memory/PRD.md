# SHINOBI CLASH — Product Requirements Document

## Original Problem Statement
"I would like to create a ninja game similar to Naruto Online."

User choices: Turn-based battle game · Single-player vs AI enemies · Login + save team & progress · Anime/Naruto-inspired art with character images · Fictional (non-copyright) ninja characters.

## Architecture
- **Frontend**: React 19 (CRA/craco), TailwindCSS, shadcn/ui, framer-motion, lucide-react. Contexts: AuthContext (JWT cookie session), GameContext (catalog/stages). Client-side turn-based battle engine; rewards validated server-side.
- **Backend**: FastAPI + MongoDB (motor). JWT auth (httpOnly cookies, bcrypt). Static game catalog & campaign in `game_data.py`.
- **Art**: 12 fictional anime ninja portraits + login/battle scene art generated via Gemini Nano Banana, served statically from `/frontend/public/ninjas` and `/art`.

## User Persona
Casual mobile/web gamer who enjoys anime gacha RPGs (collect heroes, build a team, clear stages).

## Core Requirements (static)
- Account login + persistent progress (team, roster, Ryo, level, cleared stages, W/L).
- Roster of fictional ninja with rarity (R/SR/SSR/UR), elements, stats, jutsu.
- Turn-based battles (speed-ordered turns, chakra costs, element advantage, AoE/heal/shield) vs AI.
- Campaign progression with unlock gating + first-clear rewards/recruits.
- Summon (gacha) and per-ninja level-up economy. Leaderboard.

## Implemented (2026-06-09 — MVP)
- JWT auth: register/login/logout/me/refresh; admin seed (admin@shinobi.com/admin123).
- 12 ninja catalog + 12-stage campaign (4 chapters). Starter team of 3.
- Endpoints: catalog, stages, profile, set team, battle/complete, summon, levelup, leaderboard.
- Screens: Login, Lobby (bento), Roster + detail/level-up, Team Builder, Campaign map, Battle (full combat HUD + result overlay), Summon altar, Leaderboard.
- Tested: 23/23 backend pytest pass; all frontend flows incl. a full battle to VICTORY with rewards.

## Implemented (2026-06-10 — Admin Panel & AI Hero Generator)
- **Dynamic catalog**: `game_data.py` static heroes + admin-added custom heroes / portrait overrides, merged at runtime and persisted in Mongo (`db.game_config`, `_id="catalog"`), reloaded on startup.
- **Admin API** (role=admin only): `GET /api/admin/heroes`, `POST /api/admin/hero/generate` (AI: gpt-4o-mini for stats/lore/element + Gemini Nano Banana `gemini-3.1-flash-image-preview` for portrait, via EMERGENT_LLM_KEY), `POST /api/admin/hero/save`, `POST /api/admin/hero/portrait` (upload/replace, PNG/JPEG ≤6MB), `DELETE /api/admin/hero/{id}` (custom only).
- **Live sync**: new/edited heroes & portraits flow into Summon, Gallery, Roster, Battle via `GameContext.refreshCatalog()` — no reboot.
- Generated/uploaded portraits saved to `/app/frontend/public/custom/<id>.png`, served at `/custom/<id>.png?v=…`.
- **Frontend** `/admin` (AdminOnly route, gated nav link): AI Generator tab (form → draft preview → edit → save) + Manage Heroes tab (grid, portrait replace, edit/delete custom heroes).
- Tested: 16/16 admin pytest pass (incl. 1 real AI gen), persistence-after-restart, auth gating (401/403), frontend gating confirmed.

## Implemented (2026-06-10 — Admin Art Studio)
- New `/admin` **Art Studio** tab: generate **4 high-quality 3:4 portrait variations** per run from name + AI/manual description + element + art style + pose, with a **selectable quality model** (Pro `gemini-3-pro-image-preview` / Fast `gemini-3.1-flash-image-preview`).
- **Auto-describe**: `POST /api/admin/art/describe` (gpt-4o-mini) writes a vivid visual description from name/element/style/notes.
- `POST /api/admin/art/generate` returns 4 base64 variations (parallel via asyncio.gather, partial-failure tolerant). Each is **downloadable client-side**, and any one can be applied as a hero's portrait in one click (reuses `/admin/hero/portrait`, live-synced via `refreshCatalog`).
- Tested: 9/9 art pytest + full frontend e2e (tab, auto-describe, generate, select, download, apply, live-sync) — 100%.

## Implemented (2026-06-10 — Team fixes & expansion)
- **Fixed squad-save bug**: `TeamBuilder` initialized `team` state only once → empty squad + disabled SAVE on hard page load. Now synced from profile via `useEffect`.
- **Level-gated 5-slot squad**: `max_team_size(level) = min(5, 3 + level//10)` → 3 base, **4th slot at Lv.10**, **5th at Lv.20**. Profile exposes `team_cap` + `next_slot_level`; `set_team` enforces the cap; UI shows dynamic counter + "unlock at Lv.X" hint. Battle uses `user.team` directly (any size).
- **AI generator improvement**: Art Studio "Surprise Me" randomizer (random name/element/style/pose) for instant varied concepts.
- Tested: e2e 5-cap (sent 6 → saved 5 at Lv.20), hard-reload save now 200, 17/17 fast pytest pass.

## Implemented (2026-06-11 — Rarity art detail + animated auras)
- **Rarity-tiered AI art**: `RARITY_ART` detail map scales prompt ornamentation/effects (R clean → LR god-tier splash art). Wired into Art Studio (new Rarity dropdown) and Hero Generator (uses hero's rarity).
- **Rarity card auras (frontend-only, no credits)**: `RarityFx.jsx` + CSS aura tiers — SSR/UR/LR cards get an animated pulsing glow, UR/LR add a shine sweep, and UR/LR float sparkle particles. Applied in `NinjaCard` and the Summon reveal so high-rarity heroes pop. Base R/SR stay clean.

## Implemented (2026-06-11 — Rate-up Summon banner)
- **Featured banner**: admin features an **SSR+** hero (HeroManager "Feature on Summon" button; Manage tab shows status + Clear). Endpoints: `GET/POST/DELETE /api/admin/banner` (POST rejects sub-SSR with 400). Persisted in `db.game_config` `_id="banner"`, loaded at startup, auto-cleared if the featured hero is deleted.
- **Rate-up odds**: while active, each summon has a flat `FEATURED_CHANCE` (0.35) to yield the featured hero (verified ~47% incl. base pool).
- **Summon altar UI**: `FeaturedBanner` card with rarity aura, "RATE-UP" badge, name/rarity/element/role and "% chance per pull". Exposed via `/api/game/catalog.banner` → GameContext.
- Tested: self-cleaning `test_banner.py` (set/reject/clear + admin-gate) + e2e curl + UI screenshot; full suite 54/54 + 2 banner tests pass.

## Backlog
- **P1**: Arena/PvP (async), equipment/skill upgrades, more chapters & bosses, awakening/evolution. Admin: custom jutsu editor, summon-rate tuning, grant Ryo/items to players, campaign-stage editor.
- **P2**: Sound/music + jutsu VFX, entrance/turn animations, friends/guild, multi-pull summon + pity, auto/speed battle toggle.
- **Tech debt**: split `server.py` into routers (admin/game/auth); migrate FastAPI startup→lifespan; uniform API response wrappers; leaderboard caching/index; production cookie hardening.

## Implemented (2026-08-17 — Daily Energy + Missions)
- **Fixed broken auth on restore**: `.env` was missing `JWT_SECRET`/`EMERGENT_LLM_KEY`/`FRONTEND_URL`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` after project restore — login/register were 500ing. Restored all required vars; auth now works end-to-end again.
- **Server-authoritative Energy**: `energy: {current,max,last_regen_at}` on the user doc. `game_data.compute_energy()`/`spend_energy()` are pure functions (regen 1/3min, cap 100, cost 10 Campaign/10 Spire/8 Trial). Lazily recomputed + persisted on every authenticated request via `get_current_user` (no cron needed). New `GET /api/game/energy`, `POST /api/game/battle/start` (validates mode/stage/trial/floor, deducts energy, 400 if insufficient) — frontend calls this before navigating into `/battle/:mode/:id`; blocks with a toast if short.
- **Daily Missions**: `daily: {cycle, missions:{id:{progress,claimed}}}` on the user doc, auto-resets on UTC day rollover (checked in `get_current_user`). 5 starter missions (clear 3 stages, win 5 battles, summon once, level up a hero, climb the spire) with Ryo/item rewards. Progress driven server-side from existing endpoints (`battle/complete`, `spire/complete`, `trial/complete`, `summon`, `hero/use-exp`) — cannot be gamed client-side. New `GET /api/game/missions`, `POST /api/game/missions/claim/{id}` (validates completion, blocks double-claim).
- **Frontend**: `EnergyWidget` (Lobby panel + compact TopBar chip with live countdown) and `MissionsPanel` (Lobby, progress bars + claim buttons) — both driven by `user.energy`/`user.missions` from the profile payload. Campaign/Spire/Trial "battle" buttons now show the ⚡ energy cost and call `/game/battle/start` before navigating (see `lib/energy.js`).
- Tested: 27/27 new pytest (`test_energy_missions.py`, unit + live API) + full existing suite re-verified (83 passed / 2 pre-existing stateful-flake failures unrelated to this change, unchanged from baseline) + UI walkthrough (energy chip, mission claim, battle-start gating) via screenshots.

## Next Tasks
1. Jutsu cast VFX + battle SFX for "juice".
2. Equipment/skill upgrades, more chapters & bosses.

## Implemented (2026-08-17 — Arena/PvP async)
- **Snapshot-based matchmaking**: `db.arena_snapshots` stores a frozen `{template_id,level,ascension}` team + power per player, upserted on registration and on every `PUT /game/team` save (`upsert_arena_snapshot()`). Matchmaking (`POST /api/arena/opponent`) uses `$sample` aggregation to draw a random opponent excluding self — free to re-roll, doesn't consume an attempt.
- **Daily Arena attempts**: `arena_daily: {cycle, attempts_used}` on the user doc, capped at `ARENA_ATTEMPTS_MAX=5`, resets on the same UTC-day pattern as Daily Missions (checked lazily in `get_current_user` via `ensure_arena_state`). `POST /api/arena/battle/start` deducts 1 attempt and locks in the opponent's frozen team for the fight.
- **Reuses the existing battle engine end-to-end, no second combat system**: `Battle.jsx` now supports `mode="arena"` — the opponent's frozen team (passed via `sessionStorage` from the Arena page, since async PvP has no server-side "session") is fed straight into the same `buildCombatant`/`buildOrder`/jutsu-resolution code used by Campaign/Spire/Trials.
- **Rating + rewards**: `POST /api/arena/battle/complete` — win: `+20` rating, `+220` Ryo, hero EXP via existing `distribute_hero_exp`; lose: `-12` rating (floored at 0), no rewards (matches PvE lose convention). Fields: `arena_rating`, `arena_wins`, `arena_losses`.
- **Leaderboard tie-in**: `GET /game/leaderboard` now also returns `arena_leaderboard` (sorted by rating/wins); `Leaderboard.jsx` has a Power/Arena tab toggle.
- **Frontend**: new `/arena` page (challenger card, portraits, stat strip, Find Another / Fight), nav entry in `TopBar` + Lobby tile.
- Tested: 16/16 new pytest (`test_arena.py`) + full suite re-verified (99 passed / same 2 pre-existing unrelated baseline failures) + UI walkthrough (matchmaking, fight → arena battle screen with correct opponent roster, combat) via screenshots.

## Next Tasks
1. Jutsu cast VFX + battle SFX for "juice".
2. Friends/guild list to make Arena opponents feel less anonymous.
