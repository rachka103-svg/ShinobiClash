"""Centralized Hero Progression configuration — Evolution (stars) & Ascension (rarity).

This is the SINGLE source of truth for the redesigned Evolution / Ascension
system. All star caps, evolution costs and ascension costs live here so the
game can be rebalanced by editing one file. No other module hardcodes these
values.

Design:
  - Rarity represents a hero's CURRENT ascension level, not a permanent limit.
  - Every rarity has its own star cap. Stars carry forward on ascension.
  - Evolution raises stars (up to the current rarity's cap).
  - Ascension raises rarity (R -> SR -> SSR -> UR -> LR -> GR) and is unlocked
    only once the hero has reached the star cap for its current rarity.
  - Ascension costs shards + gold (+ elemental essence, prepared but disabled
    initially so the game stays playable without an essence source).
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Ascension ladder — GR is the pinnacle. This is the ORDERED progression path
# a hero climbs via Ascension. (The global RARITY_ORDER in game_data still
# ranks every rarity for summoning/stats; this ladder defines the climb.)
# ---------------------------------------------------------------------------
ASCENSION_LADDER = ["R", "SR", "SSR", "UR", "LR", "GR"]
ASCENSION_MAX = "GR"  # cannot ascend beyond GR

_LADDER_INDEX = {r: i for i, r in enumerate(ASCENSION_LADDER)}

# ---------------------------------------------------------------------------
# Per-rarity star caps. A hero can evolve stars up to this cap; reaching it
# unlocks Ascension to the next rarity. Stars are NOT reset on ascension.
# ---------------------------------------------------------------------------
MAX_STARS = {
    "R": 3, "SR": 4, "SSR": 5, "UR": 6, "LR": 7, "GR": 8,
}
# Absolute ceiling (used as a safe fallback for rarities outside the ladder,
# e.g. N / MYTHIC which are not part of the ascension climb).
STAR_ABSOLUTE_MAX = 8


def get_max_stars_for_rarity(rarity: str) -> int:
    """Maximum stars a hero can reach at its current rarity tier."""
    return MAX_STARS.get(rarity, STAR_ABSOLUTE_MAX)


def get_next_rarity(rarity: str) -> Optional[str]:
    """Next rarity tier up the ascension ladder, or None at the GR cap."""
    i = _LADDER_INDEX.get(rarity)
    if i is None or i + 1 >= len(ASCENSION_LADDER):
        return None
    return ASCENSION_LADDER[i + 1]


def is_ascension_rarity(rarity: str) -> bool:
    """True if this rarity is on the ascension ladder (can be ascended from)."""
    return rarity in _LADDER_INDEX


# ---------------------------------------------------------------------------
# EVOLUTION COSTS (star breakthrough) — RARITY-AWARE
# Higher rarity heroes need FEWER shards per star (duplicates feel valuable)
# but MORE Ryo and RARER materials. The shard cost is base × rarity multiplier;
# Ryo scales up with rarity. Materials escalate by star level:
#   Stars 1-2: evo_essence (Campaign)
#   Stars 3-4: + elemental essence (Endless Spire)
#   Stars 5-6: + nightmare materials (Tsukuyomi)
#   Star  7:   + celestial core (ultimate evolution)
# ---------------------------------------------------------------------------
# Shard route: deliberately starts low again and rises gradually. The 6->7
# step starts a new chapter after a rarity transformation instead of continuing
# the old 500-600+ shard staircase.
EVOLUTION_SHARD_BASE = {
    1: 80, 2: 100, 3: 120, 4: 160, 5: 220, 6: 80, 7: 120,
}
EVOLUTION_RYO_BASE = {
    1: 1000, 2: 2000, 3: 3500, 4: 5500, 5: 8000, 6: 12000, 7: 18000,
}
# Higher rarity = fewer shards needed (a single +100 duplicate is more impactful)
RARITY_SHARD_MULT = {
    "R": 1.0, "SR": 0.85, "SSR": 0.72, "UR": 0.60, "LR": 0.50, "GR": 0.42,
}
# Higher rarity = higher Ryo investment
RARITY_RYO_MULT = {
    "R": 0.8, "SR": 1.0, "SSR": 1.3, "UR": 1.7, "LR": 2.2, "GR": 3.0,
}
# Kept for backward compatibility (catalog endpoint exposes them)
EVOLUTION_SHARD_COST_BY_STAR = EVOLUTION_SHARD_BASE
EVOLUTION_RYO_COST_BY_STAR = EVOLUTION_RYO_BASE


def get_evolution_cost(rarity: str, current_star: int, element: Optional[str] = None) -> Optional[dict]:
    """Full cost to evolve from `current_star` -> `current_star + 1`.
    Returns None if the hero is already at its rarity's star cap.
    Shard cost is rarity-scaled (higher rarity = fewer shards).
    Materials escalate by star level (Campaign → Spire → Tsukuyomi → Boss)."""
    cap = get_max_stars_for_rarity(rarity)
    if current_star >= cap:
        return None
    ryo_mult = RARITY_RYO_MULT.get(rarity, 1.0)
    shards = EVOLUTION_SHARD_BASE.get(current_star, 120)
    ryo = round(EVOLUTION_RYO_BASE.get(current_star, 18000) * ryo_mult)

    items = {}
    # Stars 1-2: common evolution material (Campaign source)
    if current_star <= 2:
        items["evo_essence"] = 5 + current_star * 5
    # Stars 3-4: add elemental essence (Endless Spire source)
    if current_star >= 3:
        eid = essence_id_for_element(element or "Fire")
        items[eid] = 5 + (current_star - 2) * 5
    # Stars 5-6: add nightmare materials (Tsukuyomi source)
    if current_star >= 5:
        items["nightmare_dust"] = 10 + (current_star - 4) * 5
        items["dream_fragment"] = 3 + (current_star - 4) * 2
    # Star 7: add lunar essence + celestial core (ultimate evolution)
    if current_star >= 7:
        items["lunar_essence"] = 5
        items["celestial_core"] = 2

    return {"shards": shards, "ryo": ryo, "items": items}


# ---------------------------------------------------------------------------
# ASCENSION COSTS (rarity tier raise)
# Shards + Gold (+ Elemental Essence, prepared but gated behind
# ELEMENTAL_ESSENCE_ENABLED so the game is playable before essences drop).
# ---------------------------------------------------------------------------
# Nightmare materials (from Tsukuyomi) and boss cores (from Boss Hunt) are
# added to higher-tier ascensions. The LR -> GR (ultimate) transformation
# requires a boss_core — obtainable only from Boss Hunt.
ASCENSION_COSTS = {
    # current_rarity: {shards, ryo, essence_qty, nightmare_dust, dream_fragment, lunar_essence, boss_core}
    "R":   {"shards": 250, "ryo": 20000,  "essence": 10, "nightmare_dust": 0,  "dream_fragment": 0,  "lunar_essence": 0, "boss_core": 0},
    "SR":  {"shards": 300, "ryo": 35000,  "essence": 15, "nightmare_dust": 0,  "dream_fragment": 0,  "lunar_essence": 0, "boss_core": 0},
    "SSR": {"shards": 350, "ryo": 55000,  "essence": 20, "nightmare_dust": 10, "dream_fragment": 0,  "lunar_essence": 0, "boss_core": 0},
    "UR":  {"shards": 400, "ryo": 80000,  "essence": 25, "nightmare_dust": 15, "dream_fragment": 8,  "lunar_essence": 0, "boss_core": 0},
    "LR":  {"shards": 450, "ryo": 120000, "essence": 30, "nightmare_dust": 20, "dream_fragment": 12, "lunar_essence": 8, "boss_core": 3},
}

# Elemental Ascension Materials — each element maps to its essence item id.
# The architecture is in place; essences are only REQUIRED when
# ELEMENTAL_ESSENCE_ENABLED is turned on (after a drop source exists).
ELEMENT_ESSENCE = {
    "Fire":      "fire_essence",
    "Water":     "water_essence",
    "Earth":     "earth_essence",
    "Wind":      "wind_essence",
    "Lightning": "lightning_essence",
    "Light":     "light_essence",
    "Dark":      "dark_essence",
}
ELEMENTAL_ESSENCE_ENABLED = True   # Essences now drop from Endless Spire


def essence_id_for_element(element: str) -> str:
    return ELEMENT_ESSENCE.get(element, "fire_essence")


def get_ascension_cost(current_rarity: str, element: Optional[str] = None) -> Optional[dict]:
    """Cost to ascend from `current_rarity` -> the next tier. Returns None at
    the GR cap. Includes elemental essence, nightmare materials, and boss
    cores in `items` as the tier escalates."""
    target = get_next_rarity(current_rarity)
    if not target:
        return None
    base = ASCENSION_COSTS.get(current_rarity)
    if not base:
        return None
    items = {}
    if ELEMENTAL_ESSENCE_ENABLED and element:
        eid = essence_id_for_element(element)
        items[eid] = base["essence"]
    # Nightmare materials (Tsukuyomi) — introduced at SSR+
    if base.get("nightmare_dust", 0) > 0:
        items["nightmare_dust"] = base["nightmare_dust"]
    if base.get("dream_fragment", 0) > 0:
        items["dream_fragment"] = base["dream_fragment"]
    if base.get("lunar_essence", 0) > 0:
        items["lunar_essence"] = base["lunar_essence"]
    # Boss core (Boss Hunt) — required only for the ultimate LR -> GR transformation
    if base.get("boss_core", 0) > 0:
        items["boss_core"] = base["boss_core"]
    return {
        "shards": base["shards"],
        "ryo": base["ryo"],
        "items": items,
        "target": target,
        "essence_qty": base["essence"],
        "essence_id": essence_id_for_element(element) if element else None,
        "essence_enabled": ELEMENTAL_ESSENCE_ENABLED,
    }


# ---------------------------------------------------------------------------
# ASCENSION BENEFITS — what each rarity tier unlocks, for UI display. These
# describe the MEANINGFUL mechanical improvements (stat growth, skill scaling,
# passive enhancement) that make ascending feel impactful.
# ---------------------------------------------------------------------------
ASCENSION_BENEFITS = {
    "SR":  ["Improved stat scaling", "Improved skill scaling", "New star slot unlocked"],
    "SSR": ["Stronger stat growth", "Enhanced signature skill scaling", "New star slot unlocked"],
    "UR":  ["Significant stat growth", "Enhanced passive effectiveness", "Improved ultimate scaling", "New star slot unlocked"],
    "LR":  ["Elite stat scaling", "Major passive enhancement", "Additional combat bonus", "New star slot unlocked"],
    "GR":  ["Pinnacle rarity", "Maximum stat scaling", "Ascendant-level abilities", "Final star slot unlocked"],
}


def get_ascension_benefits(target_rarity: str) -> list:
    return ASCENSION_BENEFITS.get(target_rarity, ["Increased power", "New star slot unlocked"])


# ---------------------------------------------------------------------------
# Skill scaling from ascension. Each rarity tier a hero has climbed ABOVE its
# native rarity boosts its active jutsu power and status-effect values, so an
# invested low-rarity hero becomes competitive without erasing the head-start
# of a naturally-summoned high-rarity hero (whose native kit is already far
# stronger). Applied in battle on top of the skill-rank multiplier.
# ---------------------------------------------------------------------------
ASCENSION_SKILL_POWER_PER_TIER = 0.12   # +12% jutsu power per ascended tier
ASCENSION_SKILL_EFFECT_PER_TIER = 0.06  # +6% effect value/duration per tier


def ascension_skill_multipliers(native_rarity_order: int, effective_rarity_order: int) -> dict:
    """Returns {power_mult, effect_mult} for the number of tiers ascended."""
    tiers = max(0, effective_rarity_order - native_rarity_order)
    return {
        "power_mult": 1 + tiers * ASCENSION_SKILL_POWER_PER_TIER,
        "effect_mult": 1 + tiers * ASCENSION_SKILL_EFFECT_PER_TIER,
    }


# ---------------------------------------------------------------------------
# Validation helpers (used by the server endpoints).
# ---------------------------------------------------------------------------
def can_evolve(rarity: str, stars: int, shards: int, ryo: int, inventory: dict) -> bool:
    cost = get_evolution_cost(rarity, stars)
    if not cost:
        return False
    if shards < cost["shards"]:
        return False
    if ryo < cost["ryo"]:
        return False
    for iid, qty in cost["items"].items():
        if inventory.get(iid, 0) < qty:
            return False
    return True


def can_ascend(rarity: str, stars: int, shards: int, ryo: int, inventory: dict) -> bool:
    """Ascension requires being at the current rarity's star cap."""
    if stars < get_max_stars_for_rarity(rarity):
        return False
    target = get_next_rarity(rarity)
    if not target:
        return False
    cost = get_ascension_cost(rarity)
    if not cost:
        return False
    if shards < cost["shards"]:
        return False
    if ryo < cost["ryo"]:
        return False
    for iid, qty in cost["items"].items():
        if inventory.get(iid, 0) < qty:
            return False
    return True


# ---------------------------------------------------------------------------
# Migration helper — resolve the effective rarity for a hero whose stored
# `stars` may exceed the NEW per-rarity caps (legacy heroes that evolved under
# the old flat 6-star system). Walks the hero up the ascension ladder until
# its stars fit within the cap, preserving all star investment. For heroes
# progressed under the new system this is a no-op (stars never exceed the cap).
# ---------------------------------------------------------------------------
def resolve_effective_rarity(evolved_rarity: str, native_rarity: str, stars: int) -> str:
    rarity = evolved_rarity or native_rarity
    # Only walk up for rarities on the ascension ladder.
    while stars > get_max_stars_for_rarity(rarity):
        nxt = get_next_rarity(rarity)
        if not nxt:
            break  # GR cap reached; clamp stars at GR's cap downstream
        rarity = nxt
    return rarity
