# plan.md — Shinobi Clash: Energy + Missions + Async Arena (Logic) + Cinematic RPG UI Redesign (Visual) + Phase 2A Foundation (Systems)

## 1) Objectives
- Preserve **core backend integrity** and working gameplay loops:
  - Auth (JWT cookies)
  - Energy gating + regen
  - Daily missions (server-authoritative, resets daily)
  - Async Arena logic
  - Existing battle engine + formulas
- Maintain a **fast-paced, grind-heavy, long-term RPG foundation**:
  - 60–80+ collectible heroes, extensible beyond 200 without UI rewrites
  - Meaningful roles, factions, tags, and kit identity (team building focus)
  - Long-term hero progression (beyond a simple level cap)
  - Endless-ready campaign stage architecture (chapter 100+, stage 1000+)
  - Boss framework capable of multi-phase strategic encounters
- Continue transforming the frontend from a CRUD/dashboard feel into a **premium cinematic gacha RPG** (mobile-first, artwork-first) — **but only when the plan is in the UI phases**.
- **Hard constraints (must continue to obey):**
  - Do **not** redesign Summon UI unless/until its phase (and user explicitly authorizes). Currently: **Summon UI redesign is paused**.
  - Avoid monolithic, hero-specific hardcoding in UI or battle logic.

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

> Note: These mechanics are currently **data-defined**. Full in-battle resolution of each `effect_type` is intentionally deferred until the dedicated battle extension step.

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
  - Leader portrait fills banner.
  - Elemental aura wash + rarity edge glow.
  - Bottom scrim overlay for legible text.
  - Leader name/title/rarity/element/level displayed consistently with HeroShowcase styling.
- Unboxed **HUD strip** (Energy / Ryo / Power) with glowing icon-pill readouts.
- Primary CTA **Continue Mission** redesigned as a large glowing gradient card
  - Enemy preview thumbnails.
  - Circular glowing Play button.
  - Alternate state “ALL MISSIONS CLEARED” with gold/amber treatment.
- Quick-access tiles reskinned as cinematic gradient tiles (rounded-2xl, glowing icon circles).
- Preserved testids and kept `EnergyWidget` + `MissionsPanel` untouched.

Verification:
- `esbuild` compiles clean.
- Mobile viewport verified (390px), no horizontal scroll.
- `testing_agent_v3`: **100% pass**, including **34/34 backend regression tests**.

---

### Phase E (P1) — Campaign Screen Redesign ⏭️ NEXT (Not started)
Goal: Replace list-card feel with stage progression + cinematic previews.
- Visual redesign only: keep stage data, gating, and `startBattle()` behavior unchanged.
- UI direction:
  - Chapter sections become cinematic stage nodes / mission panels.
  - Enemy previews remain portrait-first.
  - Rewards become iconic chips (Ryo/items/materials) rather than text rows.
  - Energy cost remains visible near primary action.
  - Maintain `data-testid` coverage where feasible.
- After implementation: screenshot inspection on mobile and pause for user validation.

### Phase F (P1) — Spire / Farming Content Redesign (Not started)
- Clarify repeatable loops (Gold/XP/material farms) with cinematic presentation.
- Visual-only changes.

### Phase G (P2) — Summon Screen Redesign (Not started — **PAUSED BY USER**) 
- Summon UI redesign/animations explicitly paused until foundation priorities are satisfied.
- When resumed: major event feel, rarity presentation, dramatic reveals.
- **Do not change summon odds/logic**.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Redesign Arena page UI only.
- **Do not change** opponent selection, attempts, rating logic.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish: animations, damage numbers, cinematic transitions.
- No gameplay logic changes.

---

## 3) Next Actions
1. **User validation checkpoint:** confirm Phase 2A foundation direction is correct (roster size, rarity distribution, shard/star loop, stage generator/boss framework).
2. Decide the next systems step (recommended order):
   - **Battle effect_type wiring**: incrementally support key `MECHANIC_LIBRARY.effect_type` behaviors in the battle runtime (without a giant monolith).
   - **Boss runtime support**: consume `boss_mechanic` phase data during combat (shield windows/enrage/adds).
3. After systems confirmation, resume UI roadmap with **Phase E (Campaign redesign)** (visual-only) and pause after completion.

---

## 4) Success Criteria
### Systems (Phase 2A)
- Catalog supports **60–80 heroes** (now 69) and can scale further without UI rewrites.
- 8 rarity tiers exist with meaningful distribution and support.
- Heroes have roles, factions, tags, base stats + extended stats.
- Mechanics/abilities are **data-driven** and reusable.
- Duplicate/merge value exists via shards → stars.
- Stage definitions scale (procedural generation proven) and boss framework exists.
- Existing battle engine remains intact and regression suite passes.

### Visual (Cinematic UI)
- No regressions to backend/game logic.
- Mobile-first, no horizontal scroll.
- Artwork-first layouts with scrims/vignettes and controlled glow.
- Avoid generic dashboard cards; use HUD-like strips and cinematic tiles.
- Phase D accepted: Lobby is a cinematic hub, verified by automated testing.
