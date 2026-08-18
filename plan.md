# plan.md — Shinobi Clash: Energy + Missions + Async Arena (Logic) + Cinematic RPG UI Redesign (Visual)

## 1) Objectives
- Keep **backend and game logic** intact (auth, battle, summon). Visual changes must not alter formulas, schemas, or core logic.
- Maintain the already-implemented **server-authoritative Energy** system that gates battle starts (consume on attempt; no refunds).
- Maintain the already-implemented **Daily Missions** system that progresses from server-side events, is claimable once, and resets daily.
- Preserve and avoid changes to **Async Arena** and **Summon** logic (visual redesign only when their phases arrive).
- Transform the frontend from a CRUD/dashboard feel into a **FAST-PACED, GRINDY, CINEMATIC ACTION RPG**:
  - **Mobile-first**, no horizontal scrolling.
  - **Artwork-first** (60–80% of screen weight where applicable), layered gradients/scrims.
  - Avoid generic SaaS cards/borders; use glows, rarity/element color language, HUD-like strips.

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

## 2B) Cinematic RPG UI Redesign Roadmap (Visual-Only)
> **Critical rule:** Do NOT touch battle/arena/summon logic. Visual presentation only.
> Build strictly in order, inspecting on a **mobile viewport after each phase**, then pause for user validation.

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
- **Preserved existing testids** and kept `EnergyWidget` + `MissionsPanel` untouched.

**Verification:** ✅ COMPLETE
- `esbuild` compiles clean; no lint issues.
- Mobile viewport verified (390px) — **no horizontal scroll**.
- `testing_agent_v3` report: **100% pass**, including **34/34 backend regression tests** and full frontend UX checks.

---

### Phase E (P1) — Campaign Screen Redesign ⏭️ NEXT (Not started)
Goal: Replace list-card feel with stage progression + cinematic previews.
- Visual redesign only: keep stage data, gating, and `startBattle()` behavior unchanged.
- Proposed UI direction:
  - Chapter sections become **cinematic stage nodes** or compact “mission panels” with strong artwork emphasis.
  - Enemy previews remain portrait-first; rewards (Ryo/items) become iconic chips, not text rows.
  - Energy cost remains visible near primary action.
  - Maintain `data-testid` coverage for existing tests where feasible.
- After implementation: run screenshot inspection on mobile and stop for user validation.

### Phase F (P1) — Spire / Farming Content Redesign (Not started)
- Clarify repeatable loops (Gold farm, XP farm, etc.) with cinematic, action-forward presentation.
- Visual-only changes.

### Phase G (P2) — Summon Screen Redesign (Not started)
- Make summon feel like a major event: rarity presentation, dramatic reveals.
- **Do not change summon odds/logic**.

### Phase H (P2) — Battle Arena (Visual redesign ONLY) (Not started)
- Redesign Arena page UI only.
- **Do not change** opponent selection, attempts, rating logic.

### Phase I (P3) — Combat Effects / Polish (Not started)
- Visual polish: animations, damage numbers, cinematic transitions.
- No gameplay logic changes.

## 3) Next Actions
1. **Pause for user verification of Phase D (Lobby).**
2. Begin **Phase E (Campaign redesign)** (visual-only) and inspect on mobile viewport.
3. Stop after Phase E for user validation before moving to Phase F.

## 4) Success Criteria
- No regressions to backend/game logic; auth/battle/summon/arena remain untouched.
- Cinematic RPG UI standards met:
  - Mobile-first, no horizontal scrolling.
  - Artwork-first layouts with scrims/vignettes and controlled glow.
  - No generic dashboard cards; HUD-like strips and cinematic tiles.
- Phase D accepted:
  - Lobby is a cinematic hub with leader banner, clear CTA, and quick access navigation.
  - Verified by automated testing: **100% pass** and stable across previously redesigned screens (Roster/HeroShowcase/EliteBurst/TopBar).