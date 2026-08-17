# plan.md — Shinobi Clash: Daily Energy + Missions, then Async Arena

## 1) Objectives
- Add **server-authoritative Energy** that gates **Campaign/Spire/Trial** battle *starts* (consume on attempt; no refunds).
- Add **Daily Missions** that progress from **server-side gameplay events**, can be **claimed once**, and **reset daily at UTC 00:00**.
- After Priority 1 is stable + tested, add **Async Arena** (snapshot opponent teams) reusing the **existing Battle.jsx + lib/battle.js** flow.
- Keep existing working systems intact; only minimal touch points to expose new profile fields and gate battle entry.

## 2) Implementation Steps

### Phase 1 — Core flow validation (no separate POC needed)
**Energy + missions are pure Mongo counters/timers; implement directly with tight backend tests first.**

User stories:
1. As a player, I want battles to be blocked when I’m out of Energy so I understand I must wait.
2. As a player, I want Energy to regenerate over time with a countdown so I know when I can play again.
3. As a player, I want daily missions that track my actions automatically so I don’t have to “activate” them.
4. As a player, I want to claim mission rewards once so progression feels meaningful.
5. As a player, I want missions to reset at UTC daily reset so there’s a clear daily loop.

Backend (FastAPI/Mongo):
- **Data model (user doc)**
  - `energy: { current, max, last_regen_at }` (ISO string UTC)
  - `daily: { cycle: "YYYY-MM-DD", missions: { [id]: { progress, claimed } } }`
- **game_data.py helpers/constants**
  - `ENERGY_MAX_DEFAULT`, `ENERGY_REGEN_SECONDS`, `ENERGY_COST = {campaign, spire, trial}` (simple constants)
  - `energy_now(user)-> {current,max,next_in,full_in}` (computes regen from `last_regen_at`)
  - `daily_cycle_utc()->YYYY-MM-DD`
  - `DAILY_MISSIONS` templates: e.g.
    - `m_clear_campaign_3` (event: campaign_win, target 3)
    - `m_win_any_2` (event: any_win, target 2)
    - `m_summon_1` (event: summon, target 1)
    - `m_use_exp_1` (event: use_exp_item, target 1)
    - `m_spire_1` (event: spire_win, target 1)
  - Rewards per mission: `{ryo, items{...}}` using existing ITEMS ids.
- **New endpoints** (keep server.py single-file style)
  - `GET /api/game/energy` → computed state `{current,max,next_tick_in_s,full_in_s}`
  - `POST /api/game/battle/start` body `{mode, id}`
    - validates mode in {campaign, spire, trial}
    - recompute energy; if insufficient → 400
    - decrement energy; persist; return `{ok:true, energy:{...}}`
  - `GET /api/game/missions` → resolves/reset daily state and returns templates + per-user progress
  - `POST /api/game/missions/claim/{mission_id}` → validate complete + unclaimed, grant rewards, mark claimed
- **Hook mission progress into existing endpoints (minimal edits):**
  - On `battle_complete` (win): increment `campaign_win` + `any_win`
  - On `spire_complete` (win): increment `spire_win` + `any_win`
  - On `trial_complete` (win): increment `trial_win` + `any_win`
  - On `summon`: increment `summon`
  - On `use_exp_item`: increment `use_exp_item`
  - (Optionally) on `ascend_hero`: increment `ascend`
  - Ensure progress updates happen **before** saving user doc, in the same `update_one`.
- **Expose fields in `public_user()`**
  - include computed `energy` + `daily_missions` summary (or keep missions via dedicated endpoint; but energy should be in profile for UI convenience).

Frontend (React):
- **Energy gating before entering Battle**
  - Campaign/Spire/Trial “Start” button calls `POST /game/battle/start` then navigates to `/battle/:mode/:id`.
  - On 400 insufficient energy → toast + stay put.
- **Lobby UI**
  - Add `EnergyWidget` (current/max + countdown) in Lobby stats strip or as a panel.
  - Add `DailyMissionsPanel` (list, progress bar, claim button) on Lobby (or a new `/missions` page + TopBar entry if Lobby overcrowds).
  - Claim action calls `/game/missions/claim/{id}` and refreshes profile + missions.

Tests (pytest, requests-session style):
- Add `backend/tests/test_energy_missions.py`
  - Energy:
    - spend succeeds when enough
    - spend fails when 0
    - regen calculation increases after simulated elapsed time (set `energy.last_regen_at` directly in Mongo within test)
  - Missions:
    - on actions (summon/use-exp/battle win) progress increments
    - claim grants rewards and marks claimed; double-claim rejected
    - daily reset: force stored `daily.cycle` to yesterday, call missions endpoint, verify reset
- Run full suite ensuring no regressions.

### Phase 2 — V1 App Development completion + E2E verification (Priority 1)
User stories:
1. As a player, I want “Start Battle” to clearly show Energy cost and block me if I’m short.
2. As a player, I want Energy to update immediately after starting a battle.
3. As a player, I want mission rewards to instantly reflect in my Ryo/inventory.
4. As a player, I want mission completion to be obvious (e.g., “Complete” state).
5. As a player, I want daily reset to refresh the list without needing to relog.

- Tighten UI states: loading/disabled buttons, error toasts.
- Ensure Profile refresh and missions refresh are consistent (use existing `refreshProfile()` + new missions fetch).
- Update `memory/PRD.md` with Energy + Missions implemented notes.
- Testing: full backend pytest + manual UI walkthrough (login → see energy → start battle consumes → mission progresses → claim reward).

### Phase 3 — Arena (async PvP) core (only after Phase 1 green)
Decision: **Arena uses separate daily attempts** (e.g., `arena: { attempts_used, attempts_max, cycle }`), not shared Energy.

User stories:
1. As a player, I want to find a random opponent quickly so Arena feels instant.
2. As a player, I want opponents to reflect a saved snapshot so fights feel fair and consistent.
3. As a player, I want Arena attempts to be limited daily so it’s a retention loop.
4. As a player, I want Arena results to update my Arena stats/standing.
5. As a player, I want to see Arena stats on the leaderboard.

Backend:
- New collection `arena_snapshots`:
  - `{ user_id, name, updated_at, team: [{template_id, level, ascension}], power }`
- On `PUT /game/team` success: upsert snapshot for that user.
- Endpoints:
  - `GET /api/arena/status` (attempts remaining + reset)
  - `POST /api/arena/opponent` → returns random snapshot excluding self (404 if none)
  - `POST /api/arena/battle/complete` body `{opponent_user_id, result}` updates `arena_wins/losses/rating` + consumes attempt
- Extend `/api/game/leaderboard` rows with arena fields (do not break existing consumers; add optional keys).

Frontend:
- Add `/arena` page + Lobby tile + TopBar entry.
- Opponent card preview (name, power, portraits of team) + “Fight” button.
- Extend `Battle.jsx` with mode=`arena`:
  - enemiesDef comes from snapshot payload stored in navigation state or fetched on battle load.
  - build enemy combatants using catalog templates + snapshot level/ascension.
  - report results to `/arena/battle/complete`.

Tests:
- `backend/tests/test_arena.py`
  - saving team creates snapshot
  - opponent selection excludes self / handles empty pool
  - attempt cap enforced + daily reset
  - battle complete updates stats and leaderboard includes arena keys

### Phase 4 — Full regression + polish
User stories:
1. As a player, I want Energy/Missions/Arena to never block core navigation unexpectedly.
2. As a player, I want all counters to persist across refresh/relogin.
3. As a player, I want leaderboards to remain readable with the extra arena column.
4. As a player, I want consistent toasts/messages for gating (energy/attempts).
5. As an admin, I want the Admin panel and Summon banner to keep working unchanged.

- Run full backend suite.
- One full UI path test for: Campaign, Spire, Trial, Missions claim, Arena fight.
- Update `memory/PRD.md` with Arena notes once implemented.

## 3) Next Actions
1. Implement backend Energy model + helpers + `/game/battle/start`, `/game/energy`.
2. Implement Daily Missions templates + persistence + `/game/missions` + claim endpoint.
3. Wire mission progress updates into existing gameplay endpoints.
4. Add Lobby Energy + Missions UI and battle-start gating call.
5. Add pytest `test_energy_missions.py` and run full suite.
6. Only then start Arena: snapshot on team save → opponent endpoint → Battle.jsx arena mode → arena tests.

## 4) Success Criteria
- Energy is **consumed on battle start** for Campaign/Spire/Trial and blocks when insufficient.
- Energy **regenerates over time** correctly (cap respected) and UI countdown matches server computation.
- Daily missions **progress automatically**, are **claimable once**, rewards granted, and **reset at UTC**.
- Backend pytest suite passes including new tests (no regressions to auth/battle/summon/admin/art).
- Arena (after Phase 1): opponent snapshots stable, Battle.jsx reused, daily attempts enforced, leaderboard shows arena stats.
