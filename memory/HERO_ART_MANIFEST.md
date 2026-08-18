# Shinobi Clash — Hero Art Production Manifest (Phase 3C-A)

> **Status: Manifest already generated and verified in a prior pass of this same
> phase (all 31 placeholder heroes catalogued, priorities assigned, centralized
> asset architecture confirmed working, zero gameplay changes).** This revision
> adds the requested **global art-direction brief** below so external artists
> produce work consistent with the "Goddess Era"-style reference the user
> requested, without altering any of the hero data, priorities, or asset paths
> already documented further down.

## Global Art Direction — "Goddess Era"-inspired painterly gacha aesthetic

The user asked for Shinobi Clash's visual identity to mimic popular anime-gacha
titles in the "Goddess Era" genre (e.g. *Goddess Era*, *AFK Journey*, *Epic
Seven*, *Alchemy Stars*). For **hero artwork specifically**, that means every
external artist brief should target:

- **Painterly anime/CG illustration** (not flat vector, not photoreal) — soft
  cel-shaded rendering with dramatic rim-lighting, similar to premium gacha
  splash art.
- **Dynamic, heroic poses** — three-quarter or action stance, never a static
  front-facing mugshot; weapons/elemental effects (flame, lightning, wind)
  integrated into the pose for a "summon reveal" feel.
- **Rich elemental color-grading** matching each hero's element (warm
  gold/orange rim-light for Fire, cool cyan for Water, violet-white for Light,
  deep violet/black for Dark, etc.) so the art reads instantly at a glance —
  this doubles as a readability aid on small hero-card crops.
- **Ornate, mythological costume design** — gacha titles in this genre lean
  into elaborate armor/jewelry/fabric detail proportional to rarity (N/R heroes
  read as scrappy and lightly-armored; GR/LR/MYTHIC heroes read as opulent,
  god-tier regalia). This maps naturally onto the roster's existing
  rarity-driven power fantasy.
- **Clean/simple background or soft radial glow**, never a busy scene — the
  app's card frames and gradient scrims (kept unchanged per this phase's
  instructions) already provide the "stage," so the character must read
  instantly against them.
- **This is guidance for the external artists only** — no artwork was
  generated or replaced automatically in this phase, per the directive.

**Separately, for the app's own UI chrome** (card frames, rarity gem colors,
Summon-screen ceremony, gold ornamentation, etc. — as opposed to the character
art itself): **confirmed out of scope for now.** The user wants *Goddess Era*
treated as inspiration (mood/quality bar for painterly character art), not a
literal template to copy, and does not want the existing UI chrome touched
until real hero artwork is in hand — revisit UI styling in a future phase once
actual art assets arrive.

---
Generated directly from the live hero catalog (`GET /api/game/catalog`, backed by
`/app/backend/game_data.py`). No gameplay data was changed to produce this document.

**Total placeholder heroes: 31 of 69** (all currently pointing to the single shared
temporary asset `/heroes/_placeholder.png`, a marked "art pending" silhouette image —
never presented to players as final art; the app already flags each one with
`is_placeholder_art: true`).

**Standard image spec for every entry below:**
- Orientation: **Portrait**, aspect ratio **3:4** (matches the existing hero-card frame — do not change the card design)
- Recommended source resolution: **1024×1365px** minimum (or any 3:4 multiple), delivered as PNG
- Framing: character centered, head-to-mid-torso visible in the cropped card view, full figure safe-area above/below for the Hero Showcase full-screen crop (`object-cover object-top`)
- Background: clean/simple or transparent-subject separation preferred — the UI already lays gradient scrims over the art, so busy backgrounds compete with legibility
- Delivery path convention: `/heroes/{hero_id}.png` (see per-hero "Required Path" below) — dropping a correctly-named file into `frontend/public/heroes/` is the ONLY step needed; see Section "Asset Architecture" below

---

## Priority Tiers

| Priority | Rarities Included | Hero Count | Rationale |
|---|---|---|---|
| **A** | N, R, SR, SSR, UR | **23** | Highest summon pull-rate (N/R are seen constantly from hour one) + the "big reveal" rarities players screenshot and chase (SSR/UR) — first batch target |
| **B** | GR | **5** | Obtainable and impactful in team-building, but pulled far less often than Priority A |
| **C** | LR, MYTHIC | **3** | Rarest, most prestige-driven; encountered least often so can follow last |

---

## Priority A — 23 heroes (produce first)

| ID | Name | Rarity | Element | Role | Faction | Tags | Signature Mechanic | Personality | Visual Concept |
|---|---|---|---|---|---|---|---|---|---|
| `pebble` | Pebble | N | Earth | Tank | Ironroot Dominion | SHIELD, SINGLE_TARGET | Iron Resolve (dmg reduction) | Earnest, stubborn, always the last one standing in training drills | Small, stocky recruit in oversized stone-plated armor, still growing into it |
| `spritz` | Spritz | N | Water | Attacker | Tidebound Covenant | SINGLE_TARGET, CRIT, HEAL | Combat Focus (crit boost) | Eager, clumsy, splashes first and aims later | Young academy student soaked in water droplets mid-splash, playful energy |
| `cinderling` | Cinderling | N | Fire | Mage | Emberforge Pantheon | AOE, DEBUFF, BURN | Arcane Focus (elemental bonus) | Overenthusiastic tiny flame-spirit, more sparks than control | Chibi-proportioned ember spirit wreathed in unstable campfire flame |
| `petal` | Petal | N | Wind | Healer | Gale Wardens | HEAL, BUFF, SPEED | Gentle Mending | Soft-spoken, calming presence, academy medic-in-training | Gentle young medic with wind-swept robes and floating petals/leaves |
| `glimmer` | Glimmer | N | Light | Support | Radiant Choir | HEAL, BUFF | Steady Hand (chakra gen) | Shy acolyte who finds courage in her own candlelight | Young acolyte holding a glowing candle/lantern, warm soft light |
| `shiver` | Shiver | N | Dark | Assassin | Nightveil Syndicate | EXECUTOR, CRIT, DEBUFF | First Strike | Streetwise, reckless, quick-tempered alley runner | Lean street-urchin silhouette in tattered shadow-cloak, quick dagger stance |
| `voltling` | Voltling | N | Lightning | Control | Stormcall Legion | STUN, DEBUFF | Disruption | Class dropout, sarcastic, crackles with unstable static | Scrawny academy dropout crackling with erratic electric arcs |
| `rockling` | Rockling | N | Earth | Bruiser | Ironroot Dominion | AOE, LIFESTEAL, SHIELD | Momentum | Scrappy brawler, throws rubble as often as fists | Quarry-worker brawler covered in dust, fists wrapped in cloth and stone chips |
| `pyra_emberling` | Pyra Emberling | R | Fire | Mage | Emberforge Pantheon | AOE, DEBUFF, BURN | Arcane Focus | Studious, methodical flame scholar cataloguing ember patterns | Young scholar with fire-rune scrolls, controlled flame swirling around hands |
| `nyx_wailer` | Nyx Wailer | R | Dark | Healer | Nightveil Syndicate | HEAL, BUFF, DEBUFF | Gentle Mending | Melancholic curse-singer who heals through borrowed pain | Mourning-veil figure singing with shadowy healing wisps trailing from her voice |
| `gale_binder` | Gale Binder | R | Wind | Control | Gale Wardens | STUN, DEBUFF, SPEED | Disruption | Disciplined, precise, controlled aggression | Adept weaving living wind-rope from her fingertips, mid-motion pose |
| `krag_stoneshoulder` | Krag Stoneshoulder | R | Earth | Bruiser | Ironroot Dominion | AOE, LIFESTEAL, SHIELD | Momentum | Gruff quarry champion, stoic, proud of his scars | Massive-shouldered laborer-warrior with cracked boulder-fist gauntlets |
| `vesper_flameweaver` | Vesper Flameweaver | SR | Fire | Mage | Emberforge Pantheon | AOE, DEBUFF, BURN | Arcane Focus | Elegant, theatrical, treats fire like fabric to be cut | Weaver silhouette trailing ribbon-like flame that moves like cloth |
| `coralia_tidesong` | Coralia Tidesong | SR | Water | Healer | Tidebound Covenant | HEAL, BUFF | Gentle Mending | Serene, musical, soothing reef chorister | Reef singer adorned in coral/pearl motifs, healing tide swirling at her feet |
| `zephyrine_stormbind` | Zephyrine Stormbind | SR | Wind | Control | Gale Wardens | STUN, DEBUFF, SPEED | Disruption | Sharp, tactical cyclone warden, commands the air like a weapon | Warden mid-spin binding a miniature cyclone between her palms |
| `grondar_ironfist` | Grondar Ironfist | SR | Earth | Bruiser | Ironroot Dominion | AOE, LIFESTEAL, SHIELD | Momentum | Unstoppable, gate-breaking force, few words, huge presence | Bastion-breaker with iron gauntlets mid-swing, cracked stone wall behind |
| `susanoo` | Susanoo | SSR | Wind | Control | Celestial Ascendancy | STUN, DEBUFF, SPEED | **Time Weave** (delay enemy turn) | Exiled, furious storm god wrestling with his own temper | Wild-haired storm deity wreathed in cyclone and lightning, exile's tattered cloak |
| `freyja` | Freyja | SSR | Light | Healer | Radiant Choir | HEAL, BUFF | **Eternal Vigil** (revive ward) | Regal, nurturing but battle-hardened valkyrie matron | Radiant valkyrie in ornate feathered armor, protective golden aura |
| `ares` | Ares | SSR | Fire | Bruiser | Emberforge Pantheon | AOE, LIFESTEAL, BURN | **Berserker's Rage** (hp_scaling_power — WIRED) | Bloodthirsty, thrives in chaos, grows calmer only in victory | War god mid-roar, cracked armor, flame-wreathed weapon, battlefield behind |
| `kali` | Kali | SSR | Dark | Assassin | Nightveil Syndicate | EXECUTOR, CRIT, DEBUFF | **Withering Curse** (escalating_dot) | Ancient, terrifying, calm menace — destruction incarnate | Multi-armed destroyer goddess wreathed in dark energy, skull motifs |
| `odin` | Odin | UR | Lightning | Support | Stormcall Legion | HEAL, BUFF, STUN | Rallying Warcry | Wise, weary, all-seeing — the cost of wisdom etched on his face | One-eyed all-father with a spear and raven, storm-grey robes, lightning crackling |
| `sekhmet` | Sekhmet | UR | Fire | Assassin | Emberforge Pantheon | EXECUTOR, CRIT, BURN | **Blood Mark** (stacking_mark_detonate — WIRED) | Ferocious, regal, lioness-fierce war goddess | Lioness-headed/maned war goddess, fire-lit desert armor, predatory stance |
| `inari` | Inari | UR | Light | Mage | Radiant Choir | AOE, DEBUFF, BUFF | Spirit Summon | Playful, cunning, shape-shifting trickster of fortune | Kitsune deity with fox-fire wisps and multiple ethereal tails, shrine motifs |

## Priority B — 5 heroes (GR tier)

| ID | Name | Rarity | Element | Role | Faction | Tags | Signature Mechanic | Personality | Visual Concept |
|---|---|---|---|---|---|---|---|---|---|
| `ra` | Ra | GR | Light | Mage | Celestial Ascendancy | AOE, DEBUFF, BUFF | Purifying Light | Radiant, eternal, tireless guardian against the dark | Falcon-headed sun sovereign, solar disc halo, blazing golden armor |
| `fenrir` | Fenrir | GR | Dark | Bruiser | Nightveil Syndicate | AOE, LIFESTEAL, DEBUFF | Vengeful Counter | Feral, prophetic dread, barely-contained fury | Monstrous chained wolf straining against broken shackles, glowing eyes |
| `perun` | Perun | GR | Lightning | Attacker | Stormcall Legion | SINGLE_TARGET, CRIT, STUN | Static Paralysis | Warlike, thunderous, commanding battlefield presence | Thunder warlord atop a storm-chariot motif, axe wreathed in lightning |
| `tlaloc` | Tlaloc | GR | Water | Control | Tidebound Covenant | STUN, DEBUFF, HEAL | Bulwark Stance | Dual-natured — nurturing rain, destructive storm | Rain-god with jade/turquoise ornamentation, storm clouds gathering at his hands |
| `izanami` | Izanami | GR | Dark | Healer | Abyssal Depths Cabal | HEAL, BUFF, DEBUFF | Soul Harvest | Tragic, graceful, ruler of the dead with sorrowful dignity | Underworld queen in flowing funerary robes, soft spectral light |

## Priority C — 3 heroes (LR / MYTHIC tier)

| ID | Name | Rarity | Element | Role | Faction | Tags | Signature Mechanic | Personality | Visual Concept |
|---|---|---|---|---|---|---|---|---|---|
| `ymir` | Ymir | LR | Earth | Tank | Ironroot Dominion | SHIELD, SINGLE_TARGET | **Aegis of the Pack** (team_shield — WIRED) | Ancient, immovable, the world's foundation given form | Colossal primordial giant, mountain-scale silhouette, world-shaping presence |
| `chronos` | Chronos | MYTHIC | Dark | Control | Abyssal Depths Cabal | STUN, DEBUFF | Chrono Lock | Inevitable, detached, speaks of endings as facts | Cloaked embodiment of time, hourglass/clockwork motifs woven into a void-dark form |
| `yggdrasil_spirit` | Yggdrasil | MYTHIC | Earth | Support | Celestial Ascendancy | HEAL, BUFF, SHIELD | World Tree Bloom | Serene, vast, nurtures every realm without judgment | Living world-tree spirit, bark-and-leaf humanoid form, roots/branches extending into light |

*(Heroes marked **WIRED** already have a fully functional, combat-tested signature mechanic per Phase 3B — their gameplay identity is proven and won't change when art lands.)*

---

## Asset Architecture — Confirmation

**Centralized field:** every hero's art is referenced through exactly one field —
`portrait` — on the catalog record (`game_data.py` → `CATALOG_BY_ID[id]["portrait"]`).
No frontend component contains a hardcoded per-hero image path; all of Roster, Hero
Showcase, Team Builder, Campaign, Battle, Summon results, Gallery, and Arena read the
same `template.portrait` / `ninja.portrait` value sourced from `GET /api/game/catalog`
or the per-instance profile payload. (One incidental hardcoded fallback path found in
`NinjaCard.jsx` — unreachable dead code since `portrait` is always populated — was
removed in this pass for full compliance; this was a zero-risk cleanup, not a gameplay
change.)

**Replacement is already live and safe today** — no new engineering is required for
this manifest to be actioned:
- `POST /api/admin/hero/portrait` (admin-only) uploads a new image for any `template_id`
  and stores it in `_PORTRAIT_OVERRIDES`, mutating **only** the `portrait` field of that
  hero's catalog entry.
- `DELETE /api/admin/hero/{id}/portrait` reverts to the original bundled asset.
- Overrides persist in MongoDB (`persist_catalog_config`) and survive restarts.
- Because ownership records (`user.ninjas[].template_id`), stats, rarity, role, faction,
  ability data, and summon-pool weighting are all keyed by **hero ID**, and the image
  swap touches **only** the `portrait` string, a replacement propagates automatically
  and instantly everywhere that hero appears — with zero risk to existing player
  collections, progression, or gameplay data.

**Confirmed:**
- ✅ Centralized asset field (`portrait`) — verified, one dead-code fallback cleaned up
- ✅ Replacing an image does not and cannot modify gameplay data — verified by code path (override dict touches only `portrait`)
- ✅ No gameplay changes were made in this phase
- ✅ No placeholder/replacement artwork was generated in this phase
