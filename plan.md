# plan.md — Shinobi Clash: Systems Foundation + Cinematic RPG UI + Long-Term Gacha RPG Expansion

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
  - Long-term hero progression that can last for years (leveling, evolution, gear, crafting)
  - Endless-ready campaign stage architecture (chapter 100+, stage 1000+)
  - Boss framework capable of multi-phase strategic encounters
- Continue transforming the frontend from a CRUD/dashboard feel into a **premium cinematic gacha RPG** (mobile-first, artwork-first).

### Updated design-direction objective (Goddess Era / Girls X Battle inspiration)
- Use **Goddess Era / Girls X Battle** as **inspiration/quality bar** for:
  - Summon ceremony experience (banner previews, rates disclosure, pity counter, x10 grid reveals)
  - Long-term progression depth (evolution star breakthroughs, gear, crafting)
  - Premium-feeling glow, rarity-scaled reveal flourishes
- Do **not** copy specific characters/UI 1:1.

### Updated UI stability + layout objective
- Ensure cinematic layouts remain **readable and premium**:
  - Cards fully visible; no clipped/crowded layouts
  - Glow/aura enhances without bleeding into neighbors
  - Adequate spacing across breakpoints
- Eliminate unintended **page-level horizontal scrolling** across the app:
  - Internal horizontal scrollers allowed only when intentionally contained
  - Prefer root-cause fixes (`min-w-0`, shrink) over masking

### Updated combat & pacing objectives
- Combat remains **fast-paced by default** (not only tolerable at 3×):
  - Auto-battle for grind loops
  - 1×/2×/3× speed control
  - Input safety: prevent multi-tap/double-submit exploits
- **Progression must affect combat** consistently:
  - Stars/evolution and gear must be reflected in combatant stats (single source of truth)

### Updated economy objectives
- Premium currency (**Gems**) remains valuable:
  - Premium summons
  - Instant energy refill
- Add deep grind loops that feed progression:
  - Dedicated resource dungeons (gold, EXP tomes, gear materials)
  - Gear crafting + material fusion

### Campaign map world-building objective
- Campaign reads as **World → Chapter → Stage → Battle**, not a flat list.
- UI supports chapter presentation assets **without rewrites**:
  - `chapter.background_image` (optional)
  - `chapter.accent` (token-driven tinting)

### Hard constraints (must continue to obey)
- Avoid monolithic, hero-specific hardcoding in UI or battle logic.
- `Battle.jsx` / `lib/battle.js` remains the **single authoritative combat engine** for:
  - Campaign
  - Spire
  - Arena
  - Trials / Resource Dungeons
  - Future PvE modes
- Mobile-first, no page-level horizontal overflow.
- **Shell constraint:** keep the gamified shell (floating `GameHud` + `BottomNav`). Do **not** reintroduce browser-like headers.

---

## 2) Implementation Steps

### Phase 1 — Core flow validation (Energy + Missions) ✅ COMPLETE
Energy + missions implemented as server-authoritative systems with frontend UI integration.

Backend (FastAPI/Mongo): ✅
- User doc additions for energy + daily missions.
- Endpoints for energy state, missions list/claim.
- Battle-start energy gating consumes energy server-side.

Frontend (React): ✅
- Energy widget + mission panel integrated into Lobby.

Tests: ✅
- Backend regression suite passing.

---

### Phase 2 — V1 App completion + E2E verification ✅ COMPLETE
- Tightened UI states, toasts, retries, profile refresh.
- Manual + automated verification completed.

---

### Phase 3 — Arena (async PvP) core ✅ COMPLETE (Logic)
- Async Arena system stable.
- **Constraint:** Arena will receive **visual redesign only** later.

---

### Phase 4 — Full regression + polish ✅ COMPLETE
- Full backend regression suite passes.
- Core loops remain stable.

---

## 2A) Hero/Progression Foundation Rebuild (Systems-First) ✅ COMPLETE
> Prioritized data architecture and progression systems over UI polish.

### 2A.1 — Hero data architecture ✅
- (Historical) rarities previously expanded beyond 5 tiers.

### 2A.2 — Catalog expansion ✅
- Catalog expanded **38 → 69** heroes.
- Placeholder art system for new heroes.

### 2A.3 — Ability/passive identity architecture ✅
- Mechanic library + role generic passives.
- UR+ heroes have 4th ultimate ability.

### 2A.4 — Long-term progression foundation ✅
- Stars + shards + duplicate conversion.
- `POST /api/game/hero/star-up` exists (will be superseded by Evolution in Phase J1).

### 2A.5 — Endless-ready stage architecture ✅
- Procedural stage generation.
- Reusable boss framework (`BOSS_MECHANICS`).

### 2A.6 — Frontend glue ✅
- Rarity/role support wired into UI.

### 2A.7 — Testing ✅
- Regression suite passes.

---

## 3B) Combat Ability & Boss Mechanics Integration ✅ COMPLETE (Verified)
- Added damage/status/death resolvers.
- Added status effect ticking.
- Integrated boss runtime shield/enrage/element shift.
- Added structured combat event architecture.

---

## 3C-A) Hero Art Production Manifest ✅ COMPLETE (Verified)
- Manifest created at `/app/memory/HERO_ART_MANIFEST.md`.
- Placeholder heroes identified (31).

---

## 3D) Pace + Input Safety + Auto-Battle ✅ COMPLETE (Verified)
- Multi-tap exploit fix (`actionLockRef`).
- Auto-battle + 1×/2×/3× speed control.

---

## 3E) Gems Premium Currency + Daily Login ✅ COMPLETE (Verified)
- Gems currency + sinks (premium summon + instant energy refill).
- Earn sources (missions, first-clears, spire/arena milestones, daily login).

---

## 2B) Cinematic RPG UI Redesign Roadmap (Visual-Only)
> **Critical rule:** visual-only where stated.

### Phase A (P0) — Global Visual System ✅ COMPLETE
- Added design tokens in `src/lib/theme.js`.

### Phase B (P0) — Hero Portrait + Roster Redesign ✅ COMPLETE
- Created `HeroPortrait.jsx`.
- Rebuilt roster view.

### Phase C (P0) — Unified, fuller Hero Detail Modal ✅ COMPLETE (Verified)
- Created `HeroDetailModal.jsx` shared by Roster/Gallery.

### Phase D (P0) — Home/Lobby Screen Redesign ✅ COMPLETE
- Full rewrite of `Lobby.jsx`.

### Phase D.1 (P0) — Hero Card Grid Spacing + Glow Containment ✅ COMPLETE
- Increased grid gaps; reduced aura glow spread.

---

### Phase E (P1) — Campaign World Map Redesign ✅ COMPLETE (Verified)
Goal: replace flat stage list with cinematic **World → Chapter → Stage → Battle** map while preserving all logic.

- Chapter navigation strip
- Connected stage-node path
- Stage preview drawer
- Backend enrichment: `recommended_power`, `chapters` metadata

### Phase E.8 (P1) — Campaign Map Visual Refinement Pass ✅ COMPLETE (Verified)
- Root-cause horizontal overflow fix.
- Background asset architecture (`chapter.background_image`, `chapter.accent`)

### Phase E.9 (P1) — Chapter 1 Real Artwork Integration ✅ COMPLETE (Verified)
- Optimized asset: `/app/frontend/public/art/chapters/chapter-1-leaf-outskirts.webp`
- Backend mapping: `CHAPTER_BACKGROUNDS = {1: "/art/chapters/chapter-1-leaf-outskirts.webp"}`
- Frontend scrim tuned for real art

---

## Phase J (P1–P2) — Long-Term Progression Expansion (Approved)
> Major expansion phases approved by user. Systems-first (backend) then cinematic UI.
> Goal: years-long progression via Evolution + Gear + Summon ceremony + Resource Dungeons + Crafting.

### Global design reference
- Extended guidelines added in `/app/design_guidelines.md`:
  - Summon Ceremony patterns
  - HeroDetailModal tabs: Train / Evolve / Gear
  - Gear/Forge page patterns
  - Resource Dungeons hub patterns
  - Motion rules (transform/opacity only) + data-testid standards

---

### Phase J1 (P1) — Backend: Evolution + Gear + Dungeons + Crafting + Summon Multi/Pity ✅ COMPLETE (Verified)

#### J1.1 — Evolution system (stars only via evolution)
- Replace/augment star-up into an **Evolution** model.

#### J1.2 — Leveling costs (EXP tomes + gold)
- Enforce gold costs for tomes.

#### J1.3 — Gear system (full depth)
- Slots, rarities, enhancement, sets.

#### J1.4 — Crafting + Fusion
- Materials + blueprints + fusion recipes.

#### J1.5 — Resource Dungeons (Trials-based)
- Gold Vault, EXP Temple, Gear Foundry.

#### J1.6 — Summon system expansion ✅ UPDATED
- **Canonical rarity system:** collapsed to **5 tiers**: **R, SR, SSR, UR, GR** (GR = pinnacle).
- **Dual-currency logic:**
  - **Gems/Tickets**: normal rates + **GR pity** (soft start 60, hard 90).
  - **Ryo**: **no pity**, significantly lower rare rates.
- Featured chance is multiplicative (rate-up relative), not a flat override.
- Duplicates convert to **flat 100 shards**.

#### J1.7 — New endpoints ✅ UPDATED
- Summon:
  - `POST /api/game/summon/pull` supports `currency` pathing (Gems vs Ryo), pity, and multi pulls.

#### J1.8 — Profile integration
- Stats/power include gear + evolution.

Testing:
- Backend regression + new endpoint tests.

---

### Phase J2 (P1–P2) — Frontend: Summon Ceremony + Hero Modal Tabs + Forge + Dungeons ✅ COMPLETE (Verified)

#### J2.1 — Summon Ceremony redesign ✅ UPDATED + ENHANCED
- Summon page upgraded to fit the **new gamified shell** (GameHud + BottomNav).
- **Summon Blueprint (PC + Mobile) — Single-Viewport, No-Scroll** ✅ COMPLETE
  - File: `/app/frontend/src/pages/Summon.jsx`
  - Layout rules:
    - Uses `h-full` + `overflow-hidden` page frame (same pattern as `Lobby.jsx`).
    - **Hero/Gear mode toggle** at top.
    - **Cinematic banner** region (left on desktop; top on mobile).
    - **Control rail** (right on desktop; bottom stack on mobile):
      - Compact **GR pity module**
      - Gems/Ryo pay toggle + Rates link
      - x1/x10 + Ticket summon buttons
      - Desktop-only **"In This Banner"** showcase grid (fills rail space without adding mobile height)
      - 3 quick-access buttons: **Roster**, **Featured**, **History**
    - All secondary info (Available/Roster, Featured, Rates, History) moved into dialogs.
  - Verification:
    - esbuild compile ✅
    - Frontend testing agent ✅ 100% pass
    - PC + Gear screenshots captured (premium, scroll-free)

#### J2.2 — HeroDetailModal enhancements ✅ COMPLETE
- Tabs: Train / Evolve / Gear.

#### J2.3 — Forge / Gear page (new) ✅ COMPLETE
- `Forge.jsx` routed at `/forge`.

#### J2.4 — Resource Dungeons hub (new) ✅ COMPLETE
- `Dungeons.jsx` routed at `/dungeons`.

#### J2.5 — Combat stat plumbing ✅ COMPLETE
- Gear/evolution stats affect combat.

#### J2.6 — Nav + routing ✅ UPDATED
- Navigation via `BottomNav.jsx` and `GameHud.jsx` (no TopBar).

Testing:
- Frontend testing agent + manual multi-breakpoint verification.

---

### Phase J3 (P1–P2) — Verification + Polish ✅ COMPLETE
- Testing agent runs confirm stability.

---

## 2C) Tech Debt / Maintainability (Deferred)
> Not required for the Summon blueprint request, but tracked due to recurring risk.

### TD1 (P1) — Fix empty catch blocks + hook deps (Frontend) ✅ COMPLETE
- Fixed empty catch blocks:
  - `/app/frontend/src/pages/Arena.jsx` — `fetchStatus` catch now logs to console.error
  - `/app/frontend/src/context/AuthContext.jsx` — logout catch logs to console.warn, refreshProfile catch logs to console.error
- Reviewed `GameContext.jsx` — all useCallback deps are correct (applyCatalog: [], refreshCatalog: [applyCatalog], loadInitialData: [applyCatalog], useEffect: [loadInitialData]). No stale closures found.

### TD2 (P2) — Backend modularization
- Refactor `/app/backend/server.py` (approaching ~2000 lines):
  - Extract helper functions/services
  - Move large dictionaries/config helpers into separate modules

### TD3 (P3) — Dead code cleanup
- Remove unhooked legacy files:
  - `/app/frontend/src/components/TopBar.jsx`
  - `/app/frontend/src/pages/Roster.jsx`

---

### Phase F (P1) — Spire / Farming Content UI Redesign (Not started)
- Visual-only changes.
- Clear repeatable loops and rewards visibility.

### Admin Additions (P2) — Stage Editor + Mode Toggles (Not started)
- Stage editor to tune campaign/dungeon stage rewards/enemy power.
- Global mode toggles.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Visual-only.

### Quality of Life (P3) (Not started)
- Smart Equip in Hero Details
- Drag-to-slot mechanics in Squad builder
- Remember Battle Speed across fights

---

## 3) Next Actions
1. ~~**Tech Debt (P1):** fix empty catch blocks in `Arena.jsx` and `AuthContext.jsx`; verify `GameContext` hooks.~~ ✅ DONE
2. **Tech Debt (P2):** begin modularizing `server.py` into smaller service modules.
3. ~~**Cleanup (P3):** delete dead files `TopBar.jsx` and legacy `Roster.jsx`.~~ ✅ DONE
4. Resume roadmap feature work:
   - **Phase F:** Spire UI redesign
   - **Admin additions:** Stage editor + toggles
   - **Phase H:** Arena visual redesign
   - **QoL:** Smart Equip, drag-to-slot, remember battle speed

---

## 4) Success Criteria

### Systems
- Catalog scales beyond 69 heroes.
- Mechanics remain data-driven; battle engine remains single-source-of-truth.
- Evolution + gear progression are stable, grind-friendly, and extensible.

### Economy
- Gems remain valuable with meaningful sinks.
- Dedicated farming dungeons provide consistent progression materials.
- Crafting + fusion provide long-term material sinks.

### Summon integrity ✅ UPDATED
- Rates transparent.
- x1/x10 supported.
- **5-tier rarity** canonical: R, SR, SSR, UR, GR.
- **Gem/Ticket banners:** GR pity soft 60 / hard 90.
- **Ryo banners:** no pity.
- Featured 50/50 guarantee behavior displayed.
- Summon page is **single-viewport** (no scroll) on PC and mobile.

### Combat feel
- Auto-battle + speed controls remain stable.
- No multi-tap exploits.
- Combat stats reflect evolution + gear.

### Visual (Cinematic UI)
- Mobile-first, no unintended horizontal scroll.
- Summon experience feels premium and skippable.
- UI respects gamified shell (GameHud + BottomNav) without browser headers.
- Campaign continues supporting per-chapter artwork via `background_image` with no UI rewrites.
