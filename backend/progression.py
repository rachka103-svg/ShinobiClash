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
# EVOLUTION COSTS (star breakthrough)
# The shard cost depends on the CURRENT STAR being evolved FROM (the
# transition index), so it is consistent whether the hero is a natural
# high-rarity hero climbing from 1 star or an ascended hero continuing from
# its carried-forward stars. The rarity only gates the cap.
#
#   star 1 -> 2  = 80 shards
#   star 2 -> 3  = 120
#   star 3 -> 4  = 150
#   star 4 -> 5  = 200
#   star 5 -> 6  = 300
#   star 6 -> 7  = 400
#   star 7 -> 8  = 500
# ---------------------------------------------------------------------------
EVOLUTION_SHARD_COST_BY_STAR = {
    1: 80, 2: 120, 3: 150, 4: 200, 5: 300, 6: 400, 7: 500,
}
# Gold (Ryo) co-cost for evolution — a modest gold sink alongside shards.
EVOLUTION_RYO_COST_BY_STAR = {
    1: 800, 2: 1400, 3: 2200, 4: 3200, 5: 4500, 6: 6000, 7: 8000,
}


def get_evolution_cost(rarity: str, current_star: int) -> Optional[dict]:
    """Full cost to evolve from `current_star` -> `current_star + 1`.
    Returns None if the hero is already at its rarity's star cap."""
    cap = get_max_stars_for_rarity(rarity)
    if current_star >= cap:
        return None
    shards = EVOLUTION_SHARD_COST_BY_STAR.get(current_star, 500)
    ryo = EVOLUTION_RYO_COST_BY_STAR.get(current_star, 8000)
    return {"shards": shards, "ryo": ryo, "items": {}}


# ---------------------------------------------------------------------------
# ASCENSION COSTS (rarity tier raise)
# Shards + Gold (+ Elemental Essence, prepared but gated behind
# ELEMENTAL_ESSENCE_ENABLED so the game is playable before essences drop).
# ---------------------------------------------------------------------------
ASCENSION_COSTS = {
    # current_rarity: {shards, ryo, essence_qty}
    "R":   {"shards": 200, "ryo": 25000,  "essence": 10},
    "SR":  {"shards": 300, "ryo": 40000,  "essence": 15},
    "SSR": {"shards": 450, "ryo": 60000,  "essence": 20},
    "UR":  {"shards": 650, "ryo": 90000,  "essence": 30},
    "LR":  {"shards": 900, "ryo": 130000, "essence": 45},
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
ELEMENTAL_ESSENCE_ENABLED = False  # flip to True once essences drop in-game


def essence_id_for_element(element: str) -> str:
    return ELEMENT_ESSENCE.get(element, "fire_essence")


def get_ascension_cost(current_rarity: str, element: Optional[str] = None) -> Optional[dict]:
    """Cost to ascend from `current_rarity` -> the next tier. Returns None at
    the GR cap. Includes elemental essence in `items` only when enabled."""
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
    return {
        "shards": base["shards"],
        "ryo": base["ryo"],
        "items": items,
        "target": target,
        "essence_qty": base["essence"],  # always exposed for UI "coming soon" display
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
