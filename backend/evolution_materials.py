"""Alternative Evolution material route using owned elemental hero fodder.

Hero shards remain a first-class Evolution method; fodder is an alternative,
not an additional mandatory cost. Server validation is authoritative.
"""
from typing import Iterable, Optional

FODDER_VALUE_BY_RARITY = {
    "R": 1,
    "SR": 2,
    "SSR": 4,
    "UR": 8,
    "LR": 16,
    "GR": 32,
    "MYTHIC": 64,
}

# Material value required for each star breakthrough. The 6->7 step deliberately
# becomes a fresh chapter after the rarity transformation, matching the shard
# curve that also restarts at a low requirement.
FODDER_VALUE_BY_STAR = {
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
    6: 12,
    7: 16,
}

ALLOWED_FODDER_RARITIES = {"R", "SR", "SSR"}


def fodder_value(hero: dict) -> int:
    rarity = hero.get("evolved_rarity") or hero.get("rarity") or "R"
    stars = max(1, int(hero.get("stars", 1) or 1))
    return FODDER_VALUE_BY_RARITY.get(rarity, 0) * stars


def get_fodder_requirement(current_star: int) -> Optional[dict]:
    value = FODDER_VALUE_BY_STAR.get(current_star)
    if value is None:
        return None
    return {
        "value": value,
        "allowed_rarities": sorted(ALLOWED_FODDER_RARITIES, key=lambda r: FODDER_VALUE_BY_RARITY[r]),
        "same_element": True,
    }


def validate_fodder_selection(
    ninjas: Iterable[dict],
    target_instance_id: str,
    target_element: str,
    fodder_ids: Iterable[str],
    team_ids: Iterable[str] = (),
    protected_gear_ids: Iterable[str] = (),
) -> tuple[bool, str, list[dict], int]:
    selected_ids = list(fodder_ids or [])
    if not selected_ids:
        return False, "Select elemental hero materials or switch to Hero Shards", [], 0
    if len(selected_ids) != len(set(selected_ids)):
        return False, "A fodder hero can only be selected once", [], 0
    team = set(team_ids or [])
    protected_gear = set(protected_gear_ids or [])
    by_id = {n.get("instance_id"): n for n in ninjas}
    selected = []
    total = 0
    for iid in selected_ids:
        hero = by_id.get(iid)
        if not hero:
            return False, "One or more selected material heroes no longer exist", [], 0
        if iid == target_instance_id:
            return False, "A hero cannot consume itself", [], 0
        if hero.get("element") != target_element:
            return False, "Evolution materials must match the hero's element", [], 0
        rarity = hero.get("evolved_rarity") or hero.get("rarity") or "R"
        if rarity not in ALLOWED_FODDER_RARITIES:
            return False, "Only R, SR, or explicitly allowed SSR heroes can be used as Evolution material", [], 0
        if hero.get("locked") or hero.get("favorite") or hero.get("is_favorite"):
            return False, "Locked or favorited heroes cannot be used as Evolution material", [], 0
        if iid in team:
            return False, "Heroes currently assigned to your squad cannot be consumed", [], 0
        if iid in protected_gear:
            return False, "A hero with equipped gear cannot be consumed", [], 0
        value = fodder_value(hero)
        selected.append(hero)
        total += value
    return True, "", selected, total
