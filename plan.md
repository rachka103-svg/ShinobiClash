# plan.md — Shinobi Clash: Energy + Missions + Async Arena (Logic) + Cinematic RPG UI Redesign (Visual) + Phase 2A Foundation (Systems) + Phase 3B Combat Integration + Phase 3C-A Art Manifest

## 1) Objectives
- Preserve **core backend integrity** and working gameplay loops:
  - Auth (JWT cookies)
  - Energy gating + regen
  - Daily missions (server-authoritative, resets daily)
  - Async Arena logic
  - Existing battle engine + formulas (Battle.jsx + lib/battle.js)
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

### Hard constraints (must continue to obey)
- Do **not** redesign Summon UI unless/until its phase and the user explicitly authorizes.
  - Current status: Summon UI redesign is paused.
- Avoid monolithic, hero-specific hardcoding in UI or battle logic.
- Battle.jsx / lib/battle.js remains the **single authoritative combat engine** for:
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
> Summon UI redesign and summon animations are explicitly paused.

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
  - Placeholder is clearly marked; no fake “final” art claims.

#### 2A.3 — Ability/Passive identity architecture ✅ COMPLETE (data-driven)
- Added `MECHANIC_LIBRARY` (24 named mechanics) and a generic passive per role via `ROLE_GENERIC_PASSIVE`.
- Implemented a “complexity curve”:
  - ~**35%** of heroes have a **signature** passive (24/69) via `SIGNATURE_MECHANIC_MAP`.
  - The remainder use simpler role-based passives.
- UR+ heroes now have a **4th ultimate ability**:
  - Added via `_hero_jutsus` for generated heroes.
  - Backfilled for the original 12 heroes.

#### 2A.4 — Long-term progression foundation ✅ COMPLETE (stars + shards + duplicates have value)
- Hero instances now include:
  - `stars` (1–6)
- User doc now includes:
  - `hero_shards` dictionary keyed by hero template id
- Duplicate summon behavior:
  - If hero already owned → **convert to shards** (no duplicate hero instance added)
  - `SHARD_YIELD_PER_DUPLICATE` controls shard yield by rarity
- New endpoint:
  - `POST /api/game/hero/star-up` consumes shards and increments `stars`
- `public_user()` now exposes:
  - `stars_max`, `star_up_cost`, `hero_shards` and applies a small power/stat multiplier per star

#### 2A.5 — Endless-ready stage architecture ✅ COMPLETE (architecture + proof)
- Added procedural stage generation:
  - `generate_campaign_stages(start_chapter, end_chapter, stages_per_chapter)`
  - Proven by generating Chapters 5–8 → total stages **12 → 36**
- Added reusable boss framework (data layer):
  - `BOSS_MECHANICS` with phases, enrage, shields, elemental shifts, adds
  - Two POC bosses: `sealed_titan`, `abyssal_warden`
  - Boss stages flag `is_boss: true` + `boss_mechanic` id

#### 2A.6 — Frontend “glue” only (no redesign) ✅ COMPLETE
- Updated visual rarity token map to include 8 tiers:
  - `frontend/src/lib/theme.js` rarity map expanded
- Updated existing screens so new tiers render correctly:
  - `Roster.jsx`, `Gallery.jsx` rarity filters/sorting updated
  - `Admin.jsx` rarity + role lists updated
  - `NinjaCard.jsx`, `RarityBadge.jsx`, `RarityFx.jsx` tier logic updated to be data-driven

#### 2A.7 — Testing ✅ COMPLETE
- Existing regression suite: **34/34 pass** (`backend_test.py`)
- New Phase 2A validation suite: **19/19 pass** (`phase2a_test.py`)
- Total: **53/53 pass**, no regressions to:
  - auth, battle loop, leveling, ascension, energy, missions, arena

---

## 3B) Combat Ability & Boss Mechanics Integration ✅ COMPLETE (Verified)
> Objective: integrate Phase 2A mechanics + boss framework into the **existing** Battle.jsx/lib/battle.js combat engine.
> Scope control: implement **6 representative mechanics only** + boss shield/enrage/elemental shift.

### 3B.1 — Audit of existing combat engine ✅ COMPLETE
- Existing battle engine is client-side:
  - `frontend/src/pages/Battle.jsx` (turn loop, UI)
  - `frontend/src/lib/battle.js` (formulas, turn order helpers)
- Confirmed single-engine reuse across Campaign/Spire/Arena.

### 3B.2 — Central ability resolution layer ✅ COMPLETE
- Added reusable combat resolvers (data-driven by `passive.effect_type`):
  - `resolveDamage()` (damage computation w/ conditional modifiers)
  - `resolveOnHitEffects()` (marks + DoT attachment + detonation burst)
  - `resolveDeath()` (revival gate)
- Only 6 effect_types are actively wired; all other mechanics remain data-only.

### 3B.3 — Status effect framework ✅ COMPLETE
- Added extensible status representation on each combatant:
  - `statuses: [{id, effectType, source, stacks, duration, magnitude}]`
- Implemented turn lifecycle integration:
  - `tickStatuses()` triggers DoT at start of target’s own turn
  - Expiration handled via duration decrement/removal

### 3B.4 — Six representative mechanics wired to real combat ✅ COMPLETE
- Execute bonus (damage conditional): `execute_low_hp` (Shade)
- DoT: `escalating_dot` (Apep)
- Mark stack + detonation: `stacking_mark_detonate` (Sekhmet)
- Shield: `team_shield` (Brahma)
- Revival: `revive_once` (Osiris)
- Berserker scaling: `hp_scaling_power` (Ares)

### 3B.5 — Boss mechanics runtime ✅ COMPLETE
- Exposed boss framework to frontend:
  - `/api/game/stages` now returns `{ stages, boss_mechanics }`
  - `GameContext` now stores `bossMechanics`
- Implemented boss runtime:
  - Shield phase (real shield value; AoE hit tracking break condition)
  - Enrage phase (persistent stat boosts)
  - Elemental shift (boss element changes mid-fight)

### 3B.6 — Combat events architecture ✅ COMPLETE
- Every meaningful combat action produces structured events via `makeEvent()`:
  - ATTACK, SKILL, DAMAGE, CRITICAL, HEAL
  - SHIELD_APPLIED, SHIELD_BROKEN
  - DEBUFF_APPLIED, DOT_TRIGGERED
  - REVIVAL, DEATH
  - BOSS_PHASE_CHANGE
  - VICTORY/DEFEAT

### 3B.7 — Minimal battle UI additions ✅ COMPLETE
- Fighter chips for:
  - Active statuses (MARK / CURSE)
  - Boss-phase badges (WARDED, RAGE)
- No full battle UI redesign; no elaborate VFX.

### 3B.8 — Testing ✅ COMPLETE (Verified by testing_agent_v3)
- Backend:
  - `backend_test.py` **34/34 pass**
  - `phase2a_test.py` **19/19 pass**
  - `phase3b_test.py` **3/3 pass**
- Frontend:
  - Campaign battle end-to-end automation ✅
  - Spire battle automation ✅
  - Arena: backend verified; UI availability may depend on attempts remaining (non-blocking)
- JS unit tests:
  - `frontend/src/lib/battle.abilities.test.mjs` **10/10 pass**

---

## 3C-A) Hero Art Production Manifest ✅ COMPLETE (Verified)
> Objective: prepare for professional hero artwork production and safe asset replacement.
> **No artwork generated automatically. No gameplay changes.**

### 3C-A.1 — Identify placeholder heroes ✅ COMPLETE
- Catalog scan found **31** heroes flagged `is_placeholder_art: true`.

### 3C-A.2 — Produce authoritative art manifest ✅ COMPLETE
- Manifest created at:
  - `/app/memory/HERO_ART_MANIFEST.md`
- Includes for each placeholder hero:
  - ID, name, rarity, element, role, faction, tags
  - lore + personality + signature mechanic
  - visual concept
  - current asset path + required replacement path
  - recommended dimensions/aspect ratio
- Added global art-direction brief:
  - "Goddess Era"-inspired painterly anime/CG gacha aesthetic (inspiration only, not copying)

### 3C-A.3 — Asset architecture / replacement safety ✅ COMPLETE
- Confirmed centralized `portrait` field is the single source of truth for hero art.
- Confirmed admin portrait override endpoints mutate only the `portrait` field.
- Removed one dead-code portrait fallback in `frontend/src/components/NinjaCard.jsx` to ensure no hidden pathing.
- Verified by testing_agent_v3:
  - Roster/Gallery render without broken images
  - Placeholder heroes correctly show `/heroes/_placeholder.png`

### 3C-A.4 — Design-direction decision (logged) ✅ COMPLETE
- **Character-art brief only** for now.
- **UI chrome restyle deferred** until real art arrives.
- Goddess Era is inspiration/quality bar only.

---

## 2B) Cinematic RPG UI Redesign Roadmap (Visual-Only)
> **Critical rule:** Do NOT touch battle/arena/summon logic. Visual presentation only.
> Build strictly in order, inspect on **mobile viewport after each phase**, then pause for user validation.

### Phase A (P0) — Global Visual System ✅ COMPLETE
- Added global design tokens in `src/lib/theme.js` (rarity/element colors, glows, scrims, typography, surfaces).
- Maintained backward compatibility via `src/lib/styles.js` re-exports.

### Phase B (P0) — Hero Portrait + Roster Redesign ✅ COMPLETE
- Created `HeroPortrait.jsx` for portrait-first cards with scrims/vignettes/rarity glow.
- Rebuilt `Roster.jsx` into cinematic hero collection screen.

### Phase C (covered) — Cinematic Character Detail ✅ COMPLETE
- Added `HeroShowcase.jsx` to replace old dialog with full-screen cinematic showcase.
- Added `EliteBurst.jsx` for UR/LR dramatic reveal when tapping elite heroes.

### Nav Cleanup (mobile) ✅ COMPLETE
- Updated `TopBar.jsx` to remove sideways scrolling: 4 primary tabs + **More** sheet drawer.

### Phase D (P0) — Home/Lobby Screen Redesign ✅ COMPLETE (Verified)
**What changed (visual-only):** `src/pages/Lobby.jsx` full rewrite.
- Full-bleed cinematic **Squad Leader** banner (48vh mobile / 56vh desktop)
- Unboxed HUD strip (Energy / Ryo / Power)
- Continue Mission CTA redesign
- Cinematic quick-access tiles

### Phase D.1 (P0) — Hero Card Grid Spacing + Glow Containment ✅ COMPLETE (Verified)
**Issue:** "cards are too close; user should see entire card".

Root causes:
1. `index.css` rarity aura keyframes (`auraPulse2/3/4`) pulsed box-shadow with very large spreads (up to ~72px), bleeding into neighboring grid cells.
2. `HeroPortrait.jsx` compact-mode grid cards used the same glow intensity as featured/detail modes.
3. Dense grids in `Roster.jsx`, `Gallery.jsx`, and `TeamBuilder.jsx` used `gap-3` (12px), too tight for cinematic cards + glow.

Fixes applied (scope limited to this bug only):
- **Glow containment**
  - `frontend/src/index.css`: reduced auraPulse2/3/4 box-shadow spread values (roughly halved) to prevent bleed.
  - `frontend/src/components/HeroPortrait.jsx`: added compact-mode glow scaling (0.55×) so dense grids remain crisp; featured/detail retains full drama.
- **Layout spacing**
  - `frontend/src/pages/Roster.jsx`: increased grid spacing to `gap-x-4 gap-y-6` scaling up to `lg:gap-x-6 lg:gap-y-8`, and ensured `overflow-visible` wrapper.
  - `frontend/src/pages/Gallery.jsx`: increased grid spacing similarly and added `xl:grid-cols-6`.
  - `frontend/src/pages/TeamBuilder.jsx`: increased grid spacing similarly and added `xl:grid-cols-6`.

Verification:
- Verified by `testing_agent_v3` report: `/app/test_reports/iteration_11.json`
  - Roster/Gallery/Team Builder spacing and full card visibility ✅
  - Elite rarity aura contained (no neighbor bleed) ✅
  - Interactions unaffected (Roster showcase modal / Gallery detail dialog / Team selection toggle) ✅
  - Responsive breakpoints validated (mobile/tablet/desktop) ✅

Notes:
- Per user instruction, **only** this spacing bug was addressed.
- Code review items (hook deps, empty catch blocks, complexity) remain deferred.

---

### Phase E (P1) — Campaign Screen Redesign ⏭️ NEXT (Not started)
Goal: Replace list-card feel with stage progression + cinematic previews.
- Visual redesign only: keep stage data, gating, and `startBattle()` behavior unchanged.
- After implementation: screenshot inspection on mobile and pause for user validation.

### Phase F (P1) — Spire / Farming Content Redesign (Not started)
- Visual-only changes.

### Phase G (P2) — Summon Screen Redesign (Not started — **PAUSED BY USER**)
- Summon UI redesign/animations explicitly paused.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Visual-only.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish only (animations, damage numbers, cinematic transitions).

---

## 3) Next Actions
1. **Art production kickoff:** use `/app/memory/HERO_ART_MANIFEST.md` to brief external artists.
   - Produce Priority A batch first.
   - Deliver PNG portraits at 3:4 aspect, recommended 1024×1365+.
   - Drop final files into `frontend/public/heroes/{hero_id}.png` or use admin portrait overrides.
2. **User validation checkpoint:** confirm the art-direction brief is correct (Goddess Era-inspired, not copying).
3. Once real art assets begin landing, decide the next workstream:
   - (A) Resume UI Roadmap with **Phase E** (Campaign visual redesign) while keeping Summon UI paused
   - (B) Or wait for more art to arrive before further UI work so layouts can be tuned to real portraits

---

## 4) Success Criteria
### Systems
- Catalog supports 60–80 heroes (now 69) and can scale further.
- 8 rarity tiers exist with meaningful distribution and support.
- Mechanics are data-driven; battle engine remains single-source-of-truth.
- Six representative mechanics are fully functional in real combat.
- Boss phase mechanics (shield/enrage/element shift) function in real combat.
- Full regression suite passes.

### Art Production Readiness (Phase 3C-A)
- Placeholder heroes identified (31).
- Manifest provides complete production fields + priorities.
- Centralized asset replacement works and is safe (portrait-only swap).
- Goddess Era-inspired art brief captured (inspiration only, no cloning).

### Visual (Cinematic UI)
- No regressions to backend/game logic.
- Mobile-first, no horizontal scroll.
- Artwork-first layouts with scrims/vignettes and controlled glow.
- **Hero card grids have adequate breathing room and glow containment** (no crowding, no neighbor bleed).
- Avoid generic dashboard cards; use HUD-like strips and cinematic tiles.
