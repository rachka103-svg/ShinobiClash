"""Alternative Evolution material route using owned elemental hero fodder.

Hero shards remain a first-class Evolution method; fodder is an alternative,
not an additional mandatory cost. Server validation is authoritative.

STRUCTURED FODDER REQUIREMENTS
------------------------------
Each star transition defines a set of "slots" that must each be filled by a
same-element hero meeting a minimum star threshold.  This replaces the old
point-value system with clear, specific requirements the player can see and
plan around.

Example (6★ → 7★): 2 slots, each requiring a ≥5★ same-element R/SR/SSR hero.
Example (7★ → 8★): 1 slot requiring ≥6★ + 1 slot requiring ≥4★.

Ryo and evolution materials (evo_essence, elemental essence, etc.) are shared
costs that come from progression.get_evolution_cost() — they are NOT duplicated
here.  The fodder route simply swaps the shard cost for fodder heroes.
"""
from typing import Iterable, Optional

# Rarities allowed as fodder.  UR+ is NEVER auto-selectable and requires
# explicit backend rejection.  SSR is allowed but the frontend must warn.
ALLOWED_FODDER_RARITIES = {"R", "SR", "SSR"}
AUTO_SELECT_RARITIES = {"R", "SR"}  # auto-select never picks SSR by default

# Per-star-transition fodder slot definitions.
# Each slot: {"min_stars": int, "count": int}
# The player must provide `count` heroes with stars >= min_stars, same element.
# Total heroes consumed = sum of all slot counts.
FODDER_SLOTS = {
    1: [{"min_stars": 1, "count": 1}],
    2: [{"min_stars": 1, "count": 2}],
    3: [{"min_stars": 2, "count": 2}],
    4: [{"min_stars": 3, "count": 2}],
    5: [{"min_stars": 4, "count": 2}],
    6: [{"min_stars": 5, "count": 2}],
    7: [{"min_stars": 6, "count": 1}, {"min_stars": 4, "count": 1}],
}


def get_fodder_requirement(current_star: int) -> Optional[dict]:
    """Returns the structured fodder requirement for evolving from
    ``current_star`` → ``current_star + 1``, or None if no requirement exists
    (hero at cap or star beyond the defined table)."""
    slots = FODDER_SLOTS.get(current_star)
    if slots is None:
        return None
    total_count = sum(s["count"] for s in slots)
    return {
        "slots": slots,
        "total_count": total_count,
        "allowed_rarities": sorted(ALLOWED_FODDER_RARITIES, key=lambda r: {"R": 0, "SR": 1, "SSR": 2}.get(r, 9)),
        "same_element": True,
    }


def _hero_stars(hero: dict) -> int:
    return max(1, int(hero.get("stars", 1) or 1))


def _hero_rarity(hero: dict) -> str:
    return hero.get("evolved_rarity") or hero.get("rarity") or "R"


def validate_fodder_selection(
    ninjas: Iterable[dict],
    target_instance_id: str,
    target_element: str,
    fodder_ids: Iterable[str],
    team_ids: Iterable[str] = (),
    protected_gear_ids: Iterable[str] = (),
    current_star: int = 1,
    allow_ssr: bool = False,
) -> tuple:
    """Validate a fodder selection against the structured slot requirements.

    Returns ``(ok, message, selected_heroes, slot_assignments)`` where
    ``slot_assignments`` maps slot index → list of hero instance_ids filling it.
    On failure, ``selected_heroes`` and ``slot_assignments`` are empty.
    """
    selected_ids = list(fodder_ids or [])
    if not selected_ids:
        return False, "Select elemental hero materials or switch to Hero Shards", [], {}

    if len(selected_ids) != len(set(selected_ids)):
        return False, "A fodder hero can only be selected once", [], {}

    team = set(team_ids or [])
    protected_gear = set(protected_gear_ids or [])
    by_id = {n.get("instance_id"): n for n in ninjas}

    # Look up and validate each selected hero
    selected = []
    for iid in selected_ids:
        hero = by_id.get(iid)
        if not hero:
            return False, "One or more selected material heroes no longer exist", [], {}
        if iid == target_instance_id:
            return False, "A hero cannot consume itself", [], {}
        if hero.get("element") != target_element:
            return False, "Evolution materials must match the hero's element", [], {}
        rarity = _hero_rarity(hero)
        if rarity not in ALLOWED_FODDER_RARITIES:
            return False, "Only R, SR, or SSR heroes can be used as Evolution material", [], {}
        if rarity == "SSR" and not allow_ssr:
            return False, "SSR fodder requires explicit confirmation", [], {}
        if hero.get("locked") or hero.get("favorite") or hero.get("is_favorite"):
            return False, "Locked or favorited heroes cannot be used as Evolution material", [], {}
        if iid in team:
            return False, "Heroes currently assigned to your squad cannot be consumed", [], {}
        if iid in protected_gear:
            return False, "A hero with equipped gear cannot be consumed", [], {}
        selected.append(hero)

    # Match selected heroes to fodder slots (greedy: highest-star heroes fill
    # the most demanding slots first).
    req = get_fodder_requirement(current_star)
    if not req:
        return False, "No fodder requirement for this star level", [], {}

    # Expand slots into a sorted list of min_stars thresholds (descending)
    slot_thresholds = []
    for idx, slot in enumerate(req["slots"]):
        for _ in range(slot["count"]):
            slot_thresholds.append((idx, slot["min_stars"]))
    slot_thresholds.sort(key=lambda x: -x[1])  # most demanding first

    if len(selected) < len(slot_thresholds):
        return False, f"Not enough fodder heroes — need {len(slot_thresholds)}, selected {len(selected)}", [], {}
    if len(selected) > len(slot_thresholds):
        return False, f"Too many fodder heroes — need exactly {len(slot_thresholds)}, selected {len(selected)}", [], {}

    # Sort selected heroes by stars descending
    sorted_heroes = sorted(selected, key=lambda h: -_hero_stars(h))

    assignments = {}
    for (slot_idx, min_stars), hero in zip(slot_thresholds, sorted_heroes):
        if _hero_stars(hero) < min_stars:
            return False, f"A fodder hero does not meet the minimum star requirement ({_hero_stars(hero)}★ < {min_stars}★)", [], {}
        assignments.setdefault(slot_idx, []).append(hero.get("instance_id"))

    return True, "", selected, assignments


def is_auto_selectable(hero: dict, target_instance_id: str, target_element: str,
                      team_ids: set = None, allow_ssr: bool = False) -> bool:
    """Returns True if a hero is eligible for auto-select as fodder."""
    if hero.get("instance_id") == target_instance_id:
        return False
    if hero.get("element") != target_element:
        return False
    rarity = _hero_rarity(hero)
    if rarity not in AUTO_SELECT_RARITIES and not (allow_ssr and rarity == "SSR"):
        return False
    if hero.get("locked") or hero.get("favorite") or hero.get("is_favorite"):
        return False
    if team_ids and hero.get("instance_id") in team_ids:
        return False
    return True


def auto_select_fodder(ninjas: Iterable[dict], target_instance_id: str,
                      target_element: str, current_star: int,
                      team_ids: Iterable[str] = (),
                      allow_ssr: bool = False) -> list:
    """Auto-selects the best fodder heroes for the given star transition.
    Prioritizes R heroes, then SR, then SSR (only if allow_ssr=True).
    Returns a list of instance_ids."""
    req = get_fodder_requirement(current_star)
    if not req:
        return []

    team = set(team_ids or [])
    total_needed = req["total_count"]

    # Filter eligible heroes
    eligible = [
        h for h in ninjas
        if is_auto_selectable(h, target_instance_id, target_element, team, allow_ssr)
    ]

    # Get the minimum star threshold (lowest slot requirement)
    min_stars = min(s["min_stars"] for s in req["slots"])

    # Filter by minimum stars
    eligible = [h for h in eligible if _hero_stars(h) >= min_stars]

    # Sort: R first, then SR, then SSR; within same rarity, lower stars first
    rarity_rank = {"R": 0, "SR": 1, "SSR": 2}
    eligible.sort(key=lambda h: (rarity_rank.get(_hero_rarity(h), 9), _hero_stars(h)))

    # Take the first `total_needed` heroes
    return [h["instance_id"] for h in eligible[:total_needed]]
