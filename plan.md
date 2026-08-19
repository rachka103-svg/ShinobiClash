# plan.md — Shinobi Clash: Energy + Missions + Async Arena (Logic) + Cinematic RPG UI (Visual) + Phase 2A Foundation + Phase 3B Combat Integration + Phase 3C-A Art Manifest

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
- Continue transforming the frontend from a CRUD/dashboard feel into a **premium cinematic gacha RPG** (mobile-first, artwork-first) — **only when in visual/UI phases**.

### Updated design-direction objective (Goddess Era inspiration)
- Use **Goddess Era** as an **inspiration/quality bar** for **character artwork production** (painterly anime/CG splash art, dynamic elemental posing, rarity-scaled ornate costuming), **without copying** its specific characters or UI.
- Do not over-style UI chrome (ornate frames, gold filigree, summon ceremony) until real art assets arrive; revisit later.

### Updated UI stability + layout objective
- Ensure cinematic layouts remain **readable and premium**:
  - Cards are **fully visible** (art + overlay text), never clipped or crowded.
  - Rarity glow/aura enhances cards **without bleeding into neighbors**.
  - Dense hero grids maintain adequate **breathing room** across breakpoints.
- Eliminate unintended **page-level horizontal scrolling** across the app:
  - Intentional internal horizontal scrollers (e.g., chapter strip) are allowed, but the viewport must remain contained.
  - Prefer true root-cause fixes (flex shrink/`min-w-0`) over masking.

### Updated combat & pacing objectives
- Make combat **fast-paced by default** (not only tolerable at 3×):
  - Short baseline delays
  - **Auto-battle** for grind loops
  - 1×/2×/3× **speed control**
  - Input safety: prevent multi-tap/double-submit exploits

### Updated economy objectives
- Add a premium currency (**Gems**) with immediate, meaningful sinks:
  - Premium summons
  - Instant energy refill
- Ensure Gems feel valuable (primary sources are dailies/first-clears/milestones), not a repeat-farm drip.

### Campaign map world-building objective
- Campaign should read as **World → Chapter → Stage → Battle**, not a flat list.
- UI must support chapter-level presentation assets **without future rewrites**:
  - `chapter.background_image` (optional)
  - `chapter.accent` (token-driven tinting)

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
- **Constraint:** Arena will receive **visual redesign only** in Phase H.

---

### Phase 4 — Full regression + polish ✅ COMPLETE
- Full backend regression suite passes.
- Core loops remain stable.

---

## 2A) Hero/Progression Foundation Rebuild (Systems-First) ✅ COMPLETE
> Prioritized data architecture and progression systems over UI polish.

### 2A.1 — Hero data architecture ✅
- 8 rarities: **N, R, SR, SSR, UR, GR, LR, MYTHIC**
- Expanded stats: crit_rate, crit_damage, accuracy, resistance
- Roles: 8 roles with ROLE_MOD coverage
- Identity: factions + tags + passives

### 2A.2 — Catalog expansion ✅
- Catalog expanded **38 → 69** heroes.
- Placeholder art system for new heroes.

### 2A.3 — Ability/passive identity architecture ✅
- Mechanic library + role generic passives.
- UR+ heroes have 4th ultimate ability.

### 2A.4 — Long-term progression foundation ✅
- Stars + shards + duplicate conversion.
- `POST /api/game/hero/star-up`.

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
- Goddess Era-inspired art brief captured.

---

## 3D) Pace + Input Safety + Auto-Battle ✅ COMPLETE (Verified)
### 3D.1 — Multi-tap exploit fix ✅
- `actionLockRef` + synchronous `targeting` clear.

### 3D.2 — Auto-Battle ✅
- AUTO toggle; AI plays player turns using shared decision logic.

### 3D.3 — Speed control (1×/2×/3×) ✅
- Speed toggle; timing routed through `ms(base)`.

### 3D.4 — Faster manual baseline ✅
- Reduced delays to keep 1× responsive.

Verification: ✅ `/app/test_reports/iteration_12.json`

---

## 3E) Gems Premium Currency + Daily Login ✅ COMPLETE (Verified)
### 3E.1 — Backend currency + sinks ✅
- `gems` field on user.
- Premium summon via `currency="gems"`.
- Instant energy refill `POST /api/game/energy/refill`.

### 3E.2 — Earn sources ✅
- Daily missions (some Gem rewards)
- Campaign first-clear (chapter-scaled)
- Arena milestone (every 5th win)
- Spire milestone (every 5th floor advanced)
- Daily login 7-day cycle `POST /api/game/login/claim`

### 3E.3 — Frontend UI integration ✅
- Gems displayed in TopBar + Lobby HUD.
- DailyLoginCard on Lobby.
- Energy refill CTA uses Gems.
- Premium summon button.

Verification: ✅ `/app/test_reports/iteration_12.json`

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
- Roster uses it as showcase + progression hub.

Verification: ✅ `/app/test_reports/iteration_12.json`

### Nav Cleanup (mobile) ✅ COMPLETE
- 4 primary tabs + More sheet.

### Phase D (P0) — Home/Lobby Screen Redesign ✅ COMPLETE
- Full rewrite of `Lobby.jsx`.

### Phase D.1 (P0) — Hero Card Grid Spacing + Glow Containment ✅ COMPLETE
- Increased grid gaps.
- Reduced aura glow spread.
- Reduced compact-mode card glow.

Verification: ✅ `/app/test_reports/iteration_11.json`

---

### Phase E (P1) — Campaign World Map Redesign ✅ COMPLETE (Verified)
Goal: replace the flat stage list with a cinematic **World → Chapter → Stage → Battle** map while preserving all campaign logic.

#### Phase E.1 — Preserve existing campaign logic ✅
- No changes to:
  - Stage data (36 stages)
  - Completion state (`cleared_stages`)
  - Unlock logic (previous-stage gating)
  - Energy validation/deduction
  - Battle start/completion flow
  - Rewards/first-clear rewards
  - Boss mechanics

#### Phase E.2 — World map experience ✅
- Replaced list presentation with:
  - Chapter navigation strip
  - Connected stage-node path
  - Stage preview drawer
  - Boss stage emphasis
  - Chapter completion indication

#### Phase E.3 — Chapter navigation ✅
- Scalable chapter strip (supports future chapters without UI rewrite)
- Each chapter shows:
  - chapter number
  - name + short lore
  - completion progress
  - boss indicator

#### Phase E.4 — Stage path + node states ✅
- Zigzag connected nodes with:
  - completed / current-next / locked / boss states

#### Phase E.5 — Stage preview ✅
- Bottom drawer with:
  - enemy roster (portraits, role, element)
  - recommended power vs squad power
  - energy cost (display only; server authoritative)
  - reward preview (normal + first-clear)
  - boss mechanics summary when applicable

#### Phase E.6 — Backend (additive only) ✅
- Reused existing APIs; enriched `GET /api/game/stages` response with:
  - `recommended_power` per stage (computed from existing `ninja_power`)
  - `chapters` metadata list `{chapter, name, lore}`
- No new campaign endpoints added.

#### Phase E.7 — Mobile + performance ✅
- Touch-friendly nodes.
- Lightweight: one SVG connector, no heavy animations.

Verification:
- ✅ `/app/test_reports/iteration_13.json` (backend 50/50, frontend 33/33, regression 100%)

---

### Phase E.8 (P1) — Campaign Map Visual Refinement Pass ✅ COMPLETE (Verified)
> Refinement-only; no campaign logic or battle integration changes.

#### E.8.1 — Horizontal overflow elimination ✅
- Removed negative-margin “full-bleed” risks in chapter strip.
- **Root cause fix:** `TopBar.jsx` desktop nav was a flex child without `min-w-0`, refusing to shrink and forcing the document wider at ~1280px.
  - Fixed with `min-w-0`, `overflow-x-auto` on desktop nav, and `shrink-0/whitespace-nowrap` on links.
- Added defensive safety net: `html, body { overflow-x: hidden; }`.

Verification:
- ✅ `/app/test_reports/iteration_14.json` (refinement pass, 100% across backend/frontend/regression)
- ✅ `/app/test_reports/iteration_15.json` (confirmed **true** root-cause fix: `scrollWidth === innerWidth` at 1920/1280/1024/768/390/375)

#### E.8.2 — Background asset architecture ✅
- Backend chapter metadata now includes:
  - `accent` (token-driven tint)
  - `background_image` (currently null)
- Frontend now supports per-chapter backdrops automatically:
  - If `background_image` is present, it is used.
  - Otherwise, a restrained, accent-tinted atmospheric fallback is used.
- No AI-generated artwork used.

#### E.8.3 — World feeling + depth ✅
- Reduced empty black space via:
  - per-chapter accent-tinted atmospheric layer
  - “terrain panel” behind stage path
  - restrained node glow
  - subtle ground-shadow depth cue
  - improved stage label legibility

#### E.8.4 — Chapter navigation polish ✅
- Active chapter clarity improved (accent border/glow/top bar).
- Auto-scroll active chapter chip into view.
- Chapter strip remains an intentional contained horizontal scroller only.

#### E.8.5 — Stage preview polish ✅
- Visual-only refinements:
  - enemy roster: flex-wrap → consistent grid
  - spacing/hierarchy improvements
  - clearer “First-Time Bonus” label
  - mobile padding refinements

---

### Phase F (P1) — Spire / Farming Content UI Redesign (Not started)
- Visual-only changes.
- Clear repeatable loops and rewards visibility.

### Phase G (P2) — Summon Screen Redesign (Not started)
- Visual ceremony/presentation only (no summon logic changes).

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Visual-only.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish only (damage numbers, cinematic transitions, targeted VFX).

---

## 3) Next Actions
1. **Art production kickoff:** use `/app/memory/HERO_ART_MANIFEST.md` to brief external artists.
2. **Campaign art readiness:** begin populating `CHAPTER_BACKGROUNDS` (backend) with real chapter art paths as assets arrive; UI already supports it.
3. **Phase F — Spire UI redesign** (repeatable farming clarity, reward previews, lightweight).
4. **Phase G — Summon ceremony redesign** (visual-only; preserve gem/ryo/ticket logic).
5. **Optional refinements** (small, safe improvements):
   - Persist last battle speed (remember 1×/2×/3×)
   - Add a small reward recap feed on Lobby (recent claims)

---

## 4) Success Criteria

### Systems
- Catalog supports 60–80 heroes (now 69) and can scale further.
- 8 rarity tiers exist with meaningful distribution.
- Mechanics are data-driven; battle engine remains single-source-of-truth.
- Boss phase mechanics function in real combat.
- Full regression suite passes after each feature.

### Economy
- Gems exist with two real sinks (premium summon + energy refill).
- Gems come primarily from valuable actions (login/first-clears/milestones/missions), not repeat grinding.

### Combat feel
- Multi-tap exploit prevented.
- Auto-battle functional for grind loops.
- Speed control (1×/2×/3×) functional.
- Manual at 1× feels fast and responsive.

### Art Production Readiness
- Placeholder heroes identified (31).
- Manifest provides production fields + priorities.
- Centralized asset replacement works (portrait-only swap).

### Visual (Cinematic UI)
- Mobile-first, no unintended horizontal page scroll.
- Intentional internal horizontal scrollers are contained and do not widen the viewport.
- Artwork-first layouts with scrims/vignettes and controlled glow.
- Hero card grids have adequate breathing room and glow containment.
- Hero selection modal is unified and fuller across Roster + Gallery.
- Campaign uses a cinematic world-map presentation (World→Chapter→Stage→Battle) while reusing existing campaign logic.
- Campaign map supports future per-chapter real artwork via `chapter.background_image` without UI rewrites.
