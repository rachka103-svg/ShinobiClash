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
- 8 rarities: **N, R, SR, SSR, UR, GR, LR, MYTHIC**
- Expanded stats + roles + factions/tags/passives

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
- Rebuilt `Roster.jsx` cinematic grid.

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
- Root-cause horizontal overflow fix (`TopBar.jsx` shrink/min-w-0)
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
  - Summon Ceremony: carousel + rates panel + pity module + skippable reveal overlay
  - HeroDetailModal tabs: Train / Evolve / Gear
  - Gear/Forge page patterns
  - Resource Dungeons hub patterns
  - Motion rules (transform/opacity only) + data-testid standards

---

### Phase J1 (P1) — Backend: Evolution + Gear + Dungeons + Crafting + Summon Multi/Pity ✅ COMPLETE (Verified)

#### J1.1 — Evolution system (stars only via evolution)
- Replace/augment star-up into an **Evolution** model:
  - Early stars: shards
  - High stars (4–6): gated by rare materials (`evo_essence`, `celestial_core`)
- Keep stars strictly tied to evolution; no star gain from leveling.
- Add evolution costs helper: `evolution_cost()`.

#### J1.2 — Leveling costs (EXP tomes + gold)
- Add `EXP_TOME_GOLD_COST` (per tome type) and enforce in `POST /game/hero/use-exp`.
- Ensure dedicated gold + tome farming loops exist (Resource Dungeons).

#### J1.3 — Gear system (full depth)
- Data/config in `game_data.py`:
  - 4 slots: Weapon/Armor/Accessory/Relic
  - 5 gear rarities
  - Main stat + substats (flat + %)
  - Gear score formula
  - Enhancement +1..+15 (cost tables)
  - Sets with 2pc/4pc bonuses
- Add gear generator: `roll_gear()` and core gear structs.

#### J1.4 — Crafting + Fusion
- Materials + blueprints:
  - `scrap_iron`, `forge_steel`, `forge_hammer`, plus blueprint items
- `FUSION_RECIPES` to merge low-tier materials into higher.
- Crafting config: blueprint + forge materials + ryo → gear.

#### J1.5 — Resource Dungeons (Trials-based)
- Implement as **trial-mode entries** to reuse existing energy/battle flow:
  - Gold Vault (Ryo)
  - EXP Temple (EXP tomes)
  - Gear Foundry (gear + crafting mats)
- 5 difficulty tiers each.
- Register into `TRIALS` / `TRIALS_BY_ID` (and extend trial completion rewards for gear/material drops).

#### J1.6 — Summon system expansion
- Support:
  - x1/x10 pulls (`count` 1|10)
  - banner selection (`banner_id`)
  - rates disclosure returned via `/game/catalog`
  - pity state persisted per user
- MYTHIC pity rules:
  - Soft pity begins at pull 100, ramps to 149
  - Hard pity guarantees at 150
  - Natural MYTHIC resets MYTHIC pity
  - Featured banner 50/50 with guarantee after a loss
- Add SR+ guarantee for x10 (does not interfere with MYTHIC pity unless MYTHIC obtained).

#### J1.7 — New endpoints
- Hero evolution:
  - Keep legacy route for compatibility, but introduce `POST /api/game/hero/evolve` (or rewire `/hero/star-up` to call evolve internally).
- Gear:
  - `/api/game/gear/list`
  - `/api/game/gear/equip` + `/unequip`
  - `/api/game/gear/enhance`
  - `/api/game/gear/craft`
  - `/api/game/material/fuse`
- Summon:
  - Extend `/api/game/summon` to accept `count`, `banner_id`, return multi results + pity state.

#### J1.8 — Profile integration
- Update `public_user()` to include:
  - equipped gear per hero
  - computed stats/power include gear + set bonuses + evolution star multiplier
- Increase `_star_bonus_mult` to 0.07/star (per expansion spec).

Testing:
- Backend regression + new endpoint tests.

---

### Phase J2 (P1–P2) — Frontend: Summon Ceremony + Hero Modal Tabs + Forge + Dungeons ✅ COMPLETE (Verified)

#### J2.1 — Summon Ceremony redesign (Goddess Era-like)
- `Summon.jsx` full redesign:
  - Banner carousel, featured preview
  - Rates Dialog + Table
  - Pity module with visible MYTHIC counter + 50/50 status
  - x1 / x10 CTAs
  - RevealOverlay (staggered card flips, tiered glow, MYTHIC burst, tap-to-skip)

#### J2.2 — HeroDetailModal enhancements
- Add Tabs: Train / Evolve / Gear
  - Train:
    - bulk tome spending UI
    - gold cost shown + confirm spend
  - Evolve:
    - star breakthrough panel
    - required shards + rare materials
    - stat preview delta
  - Gear:
    - 2x2 equip slots
    - equip Sheet filtered by slot
    - enhance shortcut

#### J2.3 — Forge / Gear page (new)
- New `Forge.jsx` routed at `/forge`
  - Gear inventory list/grid with filters
  - Gear detail Sheet
  - Enhance flow (+1..+15)
  - Crafting (blueprints + mats)
  - Material fusion UI

#### J2.4 — Resource Dungeons hub (new)
- New `Dungeons.jsx` routed at `/dungeons`
  - 3 dungeon cards
  - difficulty ToggleGroup (5 tiers)
  - drop preview
  - Start battle via existing trial flow (`/battle/trial/:id`)

#### J2.5 — Combat stat plumbing
- Ensure gear/evolution stats affect combat:
  - `buildCombatant` support stats override or build from `inst.stats`
  - `Battle.jsx` passes computed `inst.stats` and power so combat matches profile.

#### J2.6 — Nav + routing
- Add TopBar items (bounded, no overflow):
  - Dungeons
  - Forge
- Update `App.js` routes.

Testing:
- Frontend testing agent + manual multi-breakpoint verification.

---

### Phase J3 (P1–P2) — Verification + Polish ✅ COMPLETE (testing agent iteration_16: backend 36/37 pass — 1 false positive, frontend all pass, 0 bugs; no horizontal overflow at 390/1920; unit tests pass)
- Run `testing_agent_v3` (backend + frontend + regression).
- Verify:
  - No horizontal overflow returns
  - Summon x10 flows, rates dialog, pity counter correctness
  - Gear equip/enhance/craft/fuse works
  - Evolution costs + star-only evolution constraint holds
  - Dungeons reward loops function and are grind-friendly
  - Combat reflects gear/evolution stats accurately
- Add cinematic glow animations where appropriate (no continuous expensive effects).
- Capture screenshots at 390px + desktop.

---

### Phase F (P1) — Spire / Farming Content UI Redesign (Not started)
- Visual-only changes.
- Clear repeatable loops and rewards visibility.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Visual-only.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish only (damage numbers, cinematic transitions, targeted VFX).

---

## 3) Next Actions
1. **Phase J1**: implement backend evolution + gear + dungeons + crafting + summon pity/multi.
2. **Phase J2**: implement Summon Ceremony redesign + HeroDetailModal tabs + Forge + Dungeons.
3. **Phase J3**: full testing + polish.
4. Resume existing roadmap items:
   - Spire UI redesign
   - Arena visual redesign
   - Combat VFX polish

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

### Summon integrity
- Rates transparent.
- x1/x10 supported.
- MYTHIC pity correctly implemented (soft 100–149, hard 150, resets on MYTHIC).
- Featured 50/50 with guarantee implemented and displayed.

### Combat feel
- Auto-battle + speed controls remain stable.
- No multi-tap exploits.
- Combat stats reflect evolution + gear.

### Visual (Cinematic UI)
- Mobile-first, no unintended horizontal scroll.
- Summon ceremony feels premium and skippable.
- Gear/Forge and Dungeons match the cinematic theme without heavy effects.
- Campaign continues supporting per-chapter artwork via `background_image` with no UI rewrites.
