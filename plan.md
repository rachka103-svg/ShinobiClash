# plan.md — Shinobi Clash: Energy + Missions + Async Arena (Logic) + Cinematic RPG UI Redesign (Visual) + Phase 2A Foundation (Systems) + Phase 3B Combat Integration + Phase 3C-A Art Manifest

## 1) Objectives
- Preserve **core backend integrity** and working gameplay loops:
  - Auth (JWT cookies)
  - Energy gating + regen
  - Daily missions (server-authoritative, resets daily)
  - Async Arena logic
  - Battle engine + formulas (`Battle.jsx` + `lib/battle.js`)
- Maintain a **fast-paced, grind-heavy, long-term RPG foundation**:
  - 60–80+ collectible heroes, extensible beyond 200 without UI rewrites
  - Meaningful roles, factions, tags, and kit identity (team building focus)
  - Long-term hero progression (beyond a simple level cap)
  - Endless-ready campaign stage architecture (chapter 100+, stage 1000+)
  - Boss framework capable of multi-phase strategic encounters
- Continue transforming the frontend from a CRUD/dashboard feel into a **premium cinematic gacha RPG** (mobile-first, artwork-first) — **but only when the plan is in the UI phases**.

### Updated design-direction objective (new)
- Use **Goddess Era** as an **inspiration/quality bar** for **character artwork production** (painterly anime/CG splash art, dynamic elemental posing, rarity-scaled ornate costuming), **without copying** its specific characters or UI.
- **Do not restyle UI chrome yet** (frames, gold ornamentation, summon ceremony) until real art assets arrive; revisit UI styling in a later phase once final character art is in-hand.

### Updated UI stability objective (new)
- Ensure cinematic hero-card presentation remains **readable and premium**:
  - Cards are **fully visible** (art + overlay text), never clipped or crowded.
  - Rarity glow/aura effects enhance cards **without bleeding into neighbors**.
  - Dense hero grids maintain adequate **breathing room** across mobile/tablet/desktop.

### Updated combat & pacing objectives (new)
- Make combat **fast-paced by default** (not only tolerable at 3×):
  - Short baseline delays
  - **Auto-battle** for grind loops
  - 1×/2×/3× **speed control**
  - Input safety: prevent multi-tap/double-submit exploits

### Updated economy objectives (new)
- Add a premium currency (**Gems**) with immediate, meaningful sinks:
  - Premium summons
  - Instant energy refill
- Ensure Gems feel valuable (primary sources are dailies/first-clears/milestones), not a repeat-farm drip.

### Hard constraints (must continue to obey)
- Avoid monolithic, hero-specific hardcoding in UI or battle logic.
- `Battle.jsx` / `lib/battle.js` remains the **single authoritative combat engine** for:
  - Campaign
  - Spire
  - Arena
  - Future PvE modes

---

## 2) Implementation Steps

### Phase 1 — Core flow validation (Energy + Missions) ✅ COMPLETE
**Energy + missions are pure Mongo counters/timers; implemented with tight backend tests and UI integration.**

User stories (fulfilled):
1. Battles blocked when out of Energy.
2. Energy regenerates over time with countdown.
3. Daily missions track actions automatically.
4. Missions are claimable once.
5. Missions reset daily.

Backend (FastAPI/Mongo): ✅ implemented + tested
- Data model additions on user doc for energy + missions.
- Endpoints for energy state, mission list/claim.
- Battle start gating consumes energy.
- Mission progress is driven by server-side gameplay events.

Frontend (React): ✅ implemented
- Energy gating before navigating to Battle.
- Energy widget + daily missions panel integrated into Lobby.

Tests: ✅ implemented
- Backend tests added; full suite passing.

---

### Phase 2 — V1 App Development completion + E2E verification (Priority 1) ✅ COMPLETE
- Tightened UI states, toasts, retries, and profile refresh behavior.
- Manual + automated verification completed.

---

### Phase 3 — Arena (async PvP) core ✅ COMPLETE (Logic)
- Async Arena gameplay system implemented earlier and remains stable.
- **Important constraint going forward:** Arena will receive **visual redesign only** in its designated phase (Phase H).

---

### Phase 4 — Full regression + polish ✅ COMPLETE (Logic baseline)
- Full backend regression suite passes.
- UI navigation and core loops remain stable.

---

## 2A) Hero/Progression Foundation Rebuild (Systems-First) ✅ COMPLETE (Steps 1–3 + partial 5–6)
> This phase explicitly prioritized **game foundation** over UI polish.

### What is complete in Phase 2A

#### 2A.1 — Hero data architecture ✅ COMPLETE
- Expanded rarity system from 5 tiers to 8 tiers:
  - **N, R, SR, SSR, UR, GR, LR, MYTHIC**
- Expanded base stat model to support future growth without schema churn:
  - Added **crit_rate, crit_damage, accuracy, resistance** to `RARITY_BASE` and hero stat derivation.
- Roles expanded from 4 to 8:
  - **Attacker, Assassin, Tank, Mage, Support, Healer, Control, Bruiser**
  - Added `ROLE_MOD` coverage for all 8.
- Added identity systems:
  - **FACTIONS (10)**
  - **TAGS (19)** secondary tags (AOE, DOT, STUN, etc.)
  - Each hero now has `faction`, `tags`, and `passive`.

Files:
- `backend/game_data.py`
- `backend/server.py` (catalog metadata returned)

#### 2A.2 — Catalog expansion (60–80 roster target) ✅ COMPLETE
- Expanded catalog from **38 → 69 heroes**.
- Added **31 new heroes** spanning all rarities and roles with real names/lore.
- Introduced placeholder art system for new heroes:
  - Heroes without final art are flagged with `is_placeholder_art: true` and use `portrait: /heroes/_placeholder.png`.

#### 2A.3 — Ability/Passive identity architecture ✅ COMPLETE (data-driven)
- Added `MECHANIC_LIBRARY` (24 named mechanics) and a generic passive per role via `ROLE_GENERIC_PASSIVE`.
- Implemented a “complexity curve”:
  - ~**35%** of heroes have a **signature** passive (24/69) via `SIGNATURE_MECHANIC_MAP`.
  - The remainder use simpler role-based passives.
- UR+ heroes now have a **4th ultimate ability**.

#### 2A.4 — Long-term progression foundation ✅ COMPLETE (stars + shards + duplicates have value)
- Hero instances now include:
  - `stars` (1–6)
- User doc now includes:
  - `hero_shards` dictionary keyed by hero template id
- Duplicate summon behavior:
  - If hero already owned → **convert to shards**
- New endpoint:
  - `POST /api/game/hero/star-up`

#### 2A.5 — Endless-ready stage architecture ✅ COMPLETE (architecture + proof)
- Added procedural stage generation.
- Added reusable boss framework (data layer):
  - `BOSS_MECHANICS` phases, enrage, shields, elemental shifts, adds

#### 2A.6 — Frontend “glue” only (no redesign) ✅ COMPLETE
- Updated rarity token maps and screen compatibility for 8 tiers.

#### 2A.7 — Testing ✅ COMPLETE
- Regression suites pass.

---

## 3B) Combat Ability & Boss Mechanics Integration ✅ COMPLETE (Verified)
> Objective: integrate Phase 2A mechanics + boss framework into the **existing** combat engine.

- Added reusable combat resolvers (`resolveDamage`, `resolveOnHitEffects`, `resolveDeath`).
- Added status effect framework (`tickStatuses`).
- Wired 6 representative mechanics.
- Implemented boss runtime shield/enrage/element shift.
- Added structured combat event architecture (`makeEvent`).

Testing: ✅ Verified.

---

## 3C-A) Hero Art Production Manifest ✅ COMPLETE (Verified)
- Manifest created at `/app/memory/HERO_ART_MANIFEST.md`.
- Placeholder heroes identified (31).
- Goddess Era-inspired art brief captured (inspiration only, no cloning).

---

## 3D) Pace + Input Safety + Auto-Battle ✅ COMPLETE (Verified)
> Objective: make battles grind-friendly and fast-paced, fix multi-tap exploit.

### 3D.1 — Multi-tap multi-damage exploit fix ✅ COMPLETE
- Fixed bug where rapid tapping after selecting a skill could apply damage multiple times.
- Implementation:
  - `actionLockRef` guard (re-armed only at start of new turn)
  - synchronous clearing of `targeting` on target selection

### 3D.2 — Auto-Battle ✅ COMPLETE
- Added AUTO toggle:
  - AI plays **player turns** using the same decision function as enemy AI

### 3D.3 — Battle speed control (1×/2×/3×) ✅ COMPLETE
- Added speed toggle and routed all battle timing through `ms(base)` which divides delays by speed.

### 3D.4 — Faster manual baseline ✅ COMPLETE
- Tightened baseline delays so manual at 1× feels responsive.

Files:
- `frontend/src/pages/Battle.jsx`

Verification:
- Verified by `testing_agent_v3`: `/app/test_reports/iteration_12.json`

---

## 3E) Gems Premium Currency + Daily Login ✅ COMPLETE (Verified)
> Objective: add a valuable premium currency with real sinks and controlled earn sources.

### 3E.1 — Backend currency + sinks ✅ COMPLETE
- Added `gems` field on user.
- Premium summon:
  - `POST /api/game/summon` supports `currency="gems"` and deducts `GEM_SUMMON_COST`.
- Instant energy refill:
  - `POST /api/game/energy/refill` tops energy to max using Gems.

### 3E.2 — Earn sources ✅ COMPLETE
- Daily missions: some missions now grant small Gems.
- Campaign first-clear: grants chapter-scaled Gems.
- Arena milestone: every 5th win grants Gems.
- Spire milestone: every 5th floor advanced grants Gems.
- Daily Login:
  - new 7-day cycle `POST /api/game/login/claim`

### 3E.3 — Frontend UI integration ✅ COMPLETE
- Gems displayed in:
  - `TopBar.jsx`
  - `Lobby.jsx` HUD
- Lobby added:
  - `DailyLoginCard.jsx` with CLAIM action
  - Energy widget refill CTA using Gems
- Summon added:
  - Premium summon Gems button

Files:
- Backend: `backend/server.py`, `backend/game_data.py`
- Frontend: `frontend/src/components/DailyLoginCard.jsx`, `frontend/src/components/EnergyWidget.jsx`, `frontend/src/pages/Lobby.jsx`, `frontend/src/components/TopBar.jsx`, `frontend/src/pages/Summon.jsx`, `frontend/src/context/GameContext.jsx`

Verification:
- Verified by `testing_agent_v3`: `/app/test_reports/iteration_12.json`

---

## 2B) Cinematic RPG UI Redesign Roadmap (Visual-Only)
> **Critical rule:** visual-only where stated.

### Phase A (P0) — Global Visual System ✅ COMPLETE
- Added global design tokens in `src/lib/theme.js`.

### Phase B (P0) — Hero Portrait + Roster Redesign ✅ COMPLETE
- Created `HeroPortrait.jsx`.
- Rebuilt `Roster.jsx` cinematic grid.

### Phase C (P0) — Unified, fuller Hero Detail Modal ✅ COMPLETE (Verified)
**User request:** Roster detail view should match Gallery-style selection display, but fuller.

- Created shared component: `HeroDetailModal.jsx` (larger, portrait-first, gallery-style).
- Gallery uses it in read-only mode (shows How to Obtain).
- Roster uses it as a **showcase + progression hub**:
  - EXP tome training
  - Ascend
- Deleted obsolete `HeroShowcase.jsx`.

Files:
- `frontend/src/components/HeroDetailModal.jsx`
- `frontend/src/pages/Roster.jsx`
- `frontend/src/pages/Gallery.jsx`

Verification:
- Verified by `testing_agent_v3`: `/app/test_reports/iteration_12.json`

### Nav Cleanup (mobile) ✅ COMPLETE
- 4 primary tabs + More sheet.

### Phase D (P0) — Home/Lobby Screen Redesign ✅ COMPLETE (Verified)
- Full rewrite of `Lobby.jsx` cinematic home.

### Phase D.1 (P0) — Hero Card Grid Spacing + Glow Containment ✅ COMPLETE (Verified)
- Increased grid gaps in Roster/Gallery/TeamBuilder.
- Reduced aura keyframe glow spread.
- Reduced compact-mode card glow.

Verification:
- `/app/test_reports/iteration_11.json`

---

### Phase E (P1) — Campaign Screen Redesign ⏭️ NEXT (Not started)
Goal: Replace list-card feel with stage progression + cinematic previews.
- Visual redesign only: keep stage data, gating, and `startBattle()` behavior unchanged.

### Phase F (P1) — Spire / Farming Content Redesign (Not started)
- Visual-only changes.

### Phase G (P2) — Summon Screen Redesign (Not started)
- **UI redesign/ceremony can proceed later**, but do not change summon logic.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Visual-only.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish only (animations, damage numbers, cinematic transitions).

---

## 3) Next Actions
1. **Art production kickoff:** use `/app/memory/HERO_ART_MANIFEST.md` to brief external artists.
2. **Campaign visual redesign (Phase E)** once user approves direction.
3. **Refinement backlog (optional):**
   - Add a small Gems earn/claim feed in UI (recent rewards recap)
   - Add speed memory (persist player’s last chosen 1×/2×/3×)

---

## 4) Success Criteria

### Systems
- Catalog supports 60–80 heroes (now 69) and can scale further.
- 8 rarity tiers exist with meaningful distribution and support.
- Mechanics are data-driven; battle engine remains single-source-of-truth.
- Six representative mechanics are fully functional in real combat.
- Boss phase mechanics (shield/enrage/element shift) function in real combat.
- Full regression suite passes.

### Economy
- Gems exist with two real sinks (premium summon + energy refill).
- Gems come primarily from valuable actions (login/first-clears/milestones/missions), not repeat grinding.

### Combat feel
- Multi-tap exploit prevented.
- Auto-battle functional for grind loops.
- Speed control (1×/2×/3×) functional.
- Manual at 1× feels fast and responsive.

### Art Production Readiness (Phase 3C-A)
- Placeholder heroes identified (31).
- Manifest provides complete production fields + priorities.
- Centralized asset replacement works and is safe (portrait-only swap).
- Goddess Era-inspired art brief captured (inspiration only, no cloning).

### Visual (Cinematic UI)
- Mobile-first, no horizontal scroll.
- Artwork-first layouts with scrims/vignettes and controlled glow.
- Hero card grids have adequate breathing room and glow containment.
- Hero selection modal is unified and “fuller” across Roster and Gallery.
- Avoid generic dashboard cards; use HUD-like strips and cinematic tiles.
