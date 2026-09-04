"""Centralized Enemy Progression System.

Determines an enemy's full RPG progression (level, rarity, ascension, gear,
enhancement, reforge, crystals, skill rank, passives) based on game mode,
stage/chapter, difficulty, and boss status.

All values are DETERMINISTIC — no random assignment that could make
Stage 20 accidentally produce a stronger enemy than Stage 50.

This system REUSES the existing RPG systems (gear, crystals, skills,
reforges, ascension, rarity/evolution) rather than creating parallel
implementations. It extends the existing architecture; it does not
duplicate it.

Usage:
    prog = get_enemy_progression(mode="campaign", chapter=20, stage=6, is_boss=True)
    enemy = build_enemy(template, prog)
    power = enemy_recommended_power(template, prog)
"""

import random as _random
from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def _lerp(t, start, end):
    t = _clamp(t, 0.0, 1.0)
    return start + t * (end - start)


def _int_lerp(t, start, end):
    return int(round(_lerp(t, start, end)))


# ---------------------------------------------------------------------------
# Progression score — a normalized 0..1 value representing how far through
# the game's content an enemy is. Each mode maps its own stage/chapter/floor
# to this score, then all subsystems derive their values from it.
# ---------------------------------------------------------------------------
def _campaign_score(chapter, stage, is_boss):
    """Campaign progression score. Chapter 1 = 0.0, Chapter 50+ = 1.0."""
    base = _clamp(chapter / 50.0, 0.0, 1.0)
    if is_boss:
        base = min(1.0, base + 0.03)
    stage_frac = _clamp((stage - 1) / 11.0, 0.0, 1.0) * (1.0 / 50.0)
    return _clamp(base + stage_frac, 0.0, 1.0)


def _tsukuyomi_score(stage, difficulty, is_boss):
    """Tsukuyomi progression score. Stage 1 normal = ~0.1, Stage 25 nightmare = 1.0."""
    diff_bonus = {"normal": 0.0, "hard": 0.12, "nightmare": 0.25}.get(difficulty, 0.0)
    base = _clamp(stage / 25.0, 0.05, 1.0)
    return _clamp(base + diff_bonus, 0.0, 1.0)


def _spire_score(floor, is_boss):
    """Spire progression score. Floor 1 = 0.0, Floor 1000 = 1.0."""
    base = _clamp(floor / 1000.0, 0.0, 1.0)
    if is_boss:
        base = min(1.0, base + 0.03)
    return base


def _trial_score(tier):
    """Trial dungeon progression score. Tier 1-5."""
    return _clamp(tier / 6.0, 0.05, 0.8)


# ---------------------------------------------------------------------------
# Per-subsystem progression curves — each maps the 0..1 score to a value.
# These are the SINGLE source of truth for enemy progression balancing.
# ---------------------------------------------------------------------------

# --- Rarity / Evolution ---
_RARITY_BY_SCORE = [
    (0.00, 1),   # R
    (0.08, 2),   # SR
    (0.20, 3),   # SSR
    (0.35, 4),   # UR
    (0.55, 5),   # LR
    (0.75, 6),   # GR
    (0.92, 7),   # MYTHIC
]


def _rarity_for_score(score, is_boss=False):
    """Target rarity index for a given progression score. Bosses get +1 tier."""
    idx = 1
    for threshold, r_idx in _RARITY_BY_SCORE:
        if score >= threshold:
            idx = r_idx
    if is_boss:
        idx = min(7, idx + 1)
    return idx


def _rarity_index_to_name(idx):
    """Convert RARITY_ORDER index to rarity name."""
    from game_data import RARITY_ORDER
    for name, i in RARITY_ORDER.items():
        if i == idx:
            return name
    return "R"


# --- Ascension (0-16) ---
def _ascension_for_score(score):
    if score < 0.05:
        return 0
    if score < 0.15:
        return _int_lerp((score - 0.05) / 0.10, 0, 2)
    if score < 0.30:
        return _int_lerp((score - 0.15) / 0.15, 2, 5)
    if score < 0.50:
        return _int_lerp((score - 0.30) / 0.20, 5, 8)
    if score < 0.70:
        return _int_lerp((score - 0.50) / 0.20, 8, 12)
    if score < 0.90:
        return _int_lerp((score - 0.70) / 0.20, 12, 15)
    return _int_lerp((score - 0.90) / 0.10, 15, 16)


# --- Gear tier (0 = no gear, 1=common, 2=fine, 3=rare, 4=epic, 5=legendary) ---
def _gear_tier_for_score(score):
    if score < 0.04:
        return 0
    if score < 0.12:
        return 1
    if score < 0.25:
        return 2
    if score < 0.45:
        return 3
    if score < 0.65:
        return 4
    return 5


# --- Gear enhancement (0-15) ---
def _enhancement_for_score(score):
    if score < 0.04:
        return 0
    if score < 0.15:
        return _int_lerp((score - 0.04) / 0.11, 0, 3)
    if score < 0.35:
        return _int_lerp((score - 0.15) / 0.20, 3, 7)
    if score < 0.55:
        return _int_lerp((score - 0.35) / 0.20, 7, 11)
    if score < 0.80:
        return _int_lerp((score - 0.55) / 0.25, 11, 15)
    return 15


# --- Reforge count per jutsu (0-2) ---
def _reforge_for_score(score):
    if score < 0.30:
        return 0
    if score < 0.55:
        return 1
    return 2


# --- Crystal tier (0 = none, 1=chipped .. 5=astral) ---
def _crystal_tier_for_score(score):
    if score < 0.10:
        return 0
    if score < 0.25:
        return 1
    if score < 0.45:
        return 2
    if score < 0.65:
        return 3
    if score < 0.85:
        return 4
    return 5


# --- Skill rank (1-10) ---
def _skill_rank_for_score(score):
    if score < 0.05:
        return 1
    if score < 0.15:
        return _int_lerp((score - 0.05) / 0.10, 1, 2)
    if score < 0.30:
        return _int_lerp((score - 0.15) / 0.15, 2, 4)
    if score < 0.50:
        return _int_lerp((score - 0.30) / 0.20, 4, 6)
    if score < 0.70:
        return _int_lerp((score - 0.50) / 0.20, 6, 8)
    if score < 0.90:
        return _int_lerp((score - 0.70) / 0.20, 8, 9)
    return 10


# ---------------------------------------------------------------------------
# Main progression function
# ---------------------------------------------------------------------------
def get_enemy_progression(
    mode: str = "campaign",
    stage: int = 1,
    chapter: int = 1,
    difficulty: str = "normal",
    is_boss: bool = False,
    event_type: Optional[str] = None,
    floor: int = 0,
    trial_tier: int = 1,
    base_level: Optional[int] = None,
) -> dict:
    """Determine an enemy's full RPG progression based on game context.

    Returns a deterministic progression config dict with:
        score, level, target_rarity_idx, target_rarity, ascension,
        gear_tier, gear_enhancement, reforge_count, crystal_tier,
        skill_rank, passive_unlocked, gear_set_id

    All values are deterministic — calling this with the same inputs always
    produces the same output.
    """
    from game_data import (
        BOSS_MAX_LEVEL, ASCENSION_MAX, SKILL_RANK_MAX,
        GEAR_ENHANCE_MAX, REFORGE_MAX_PER_JUTSU,
        RARITY_PASSIVE_UNLOCK_RANK, PASSIVE_UNLOCK_RANK,
        GEAR_SETS,
    )

    # --- Compute progression score ---
    if mode == "campaign":
        score = _campaign_score(chapter, stage, is_boss)
    elif mode == "tsukuyomi":
        score = _tsukuyomi_score(stage, difficulty, is_boss)
    elif mode == "spire":
        score = _spire_score(floor or stage, is_boss)
    elif mode == "trial":
        score = _trial_score(trial_tier)
    else:
        score = _clamp(chapter / 50.0, 0.0, 1.0)

    # --- Level ---
    if base_level is not None:
        level = base_level
    elif mode == "tsukuyomi":
        from game_data import TSUKU_SCALING_CONFIG, TSUKU_DIFF_BY_ID
        cfg = TSUKU_SCALING_CONFIG
        diff = TSUKU_DIFF_BY_ID.get(difficulty, TSUKU_DIFF_BY_ID.get("normal", {}))
        diff_mult = diff.get("power_mult", 1.0)
        level = max(1, round((cfg["base_level"] + (stage - 1) * cfg["level_per_stage"]) * diff_mult))
    elif mode == "spire":
        from game_data import spire_floor_config
        cfg = spire_floor_config(floor or stage)
        level = cfg["enemy_level"]
        if is_boss:
            level = round(level * 1.5)
    elif mode == "trial":
        level = 8 + trial_tier * 4
    else:
        level = max(1, chapter * 5 + stage)

    level = min(level, BOSS_MAX_LEVEL)

    # --- Rarity ---
    target_rarity_idx = _rarity_for_score(score, is_boss)
    target_rarity = _rarity_index_to_name(target_rarity_idx)

    # --- Ascension ---
    ascension = _ascension_for_score(score)
    ascension = min(ascension, ASCENSION_MAX.get(target_rarity, 16))

    # --- Gear ---
    gear_tier = _gear_tier_for_score(score)
    gear_enhancement = _enhancement_for_score(score) if gear_tier > 0 else 0
    gear_enhancement = min(gear_enhancement, GEAR_ENHANCE_MAX)

    # --- Reforge ---
    reforge_count = _reforge_for_score(score)
    reforge_count = min(reforge_count, REFORGE_MAX_PER_JUTSU)

    # --- Crystal ---
    crystal_tier = _crystal_tier_for_score(score)

    # --- Skill rank ---
    skill_rank = _skill_rank_for_score(score)
    skill_rank = min(skill_rank, SKILL_RANK_MAX)

    # --- Passive ---
    passive_unlock_rank = RARITY_PASSIVE_UNLOCK_RANK.get(target_rarity, PASSIVE_UNLOCK_RANK)
    passive_unlocked = skill_rank >= passive_unlock_rank

    # --- Gear set (deterministic pick) ---
    set_keys = list(GEAR_SETS.keys())
    gear_set_id = set_keys[(chapter + stage + (1 if is_boss else 0)) % len(set_keys)]

    return {
        "score": round(score, 4),
        "level": level,
        "target_rarity_idx": target_rarity_idx,
        "target_rarity": target_rarity,
        "ascension": ascension,
        "gear_tier": gear_tier,
        "gear_enhancement": gear_enhancement,
        "reforge_count": reforge_count,
        "crystal_tier": crystal_tier,
        "skill_rank": skill_rank,
        "passive_unlocked": passive_unlocked,
        "gear_set_id": gear_set_id,
    }


# ---------------------------------------------------------------------------
# Evolved rarity resolution
# ---------------------------------------------------------------------------
def resolve_evolved_rarity(template: dict, progression: dict) -> str:
    """Determine the effective rarity an enemy fights at.

    If the progression target rarity is higher than the template's native
    rarity, the enemy is evolved to the target (walking up the ascension
    ladder). If the target is lower or equal, the native rarity is used.
    """
    from game_data import RARITY_ORDER
    import progression as prog_mod

    native = template.get("rarity", "R")
    target = progression["target_rarity"]

    native_idx = RARITY_ORDER.get(native, 0)
    target_idx = RARITY_ORDER.get(target, 0)

    if target_idx <= native_idx:
        return native

    ladder = prog_mod.ASCENSION_LADDER
    if native not in ladder:
        return native

    current = native
    for r in ladder[ladder.index(native) + 1:]:
        if RARITY_ORDER.get(r, 0) > target_idx:
            break
        current = r

    return current


# ---------------------------------------------------------------------------
# Real gear bonus computation — generates deterministic gear pieces and
# computes their ACTUAL stat contributions using the existing gear system.
# ---------------------------------------------------------------------------
_SUBSTAT_DATA = [
    ("atk_pct", 3, 8), ("def_pct", 3, 8), ("hp_pct", 3, 8), ("spd_pct", 2, 6),
    ("atk", 6, 18), ("def", 5, 15), ("hp", 40, 120),
]


def _deterministic_gear_pieces(progression: dict, template_id: str) -> list:
    """Generate 4 deterministic gear pieces (one per slot) based on the
    progression config. Uses a seeded RNG so the same enemy always gets
    the same gear."""
    from game_data import (
        GEAR_RARITIES, GEAR_RARITY_META, GEAR_SLOTS, GEAR_SETS,
    )

    gear_tier = progression["gear_tier"]
    if gear_tier == 0:
        return []

    enhancement = progression["gear_enhancement"]
    set_id = progression["gear_set_id"]

    seed = hash((template_id, progression["level"], gear_tier, enhancement, set_id))
    rng = _random.Random(seed)

    rarity_name = GEAR_RARITIES[min(gear_tier - 1, len(GEAR_RARITIES) - 1)]
    rarity_meta = GEAR_RARITY_META[rarity_name]
    n_subs = rarity_meta["subs"]

    pieces = []
    substat_pool = list(range(len(_SUBSTAT_DATA)))

    for slot in GEAR_SLOTS:
        rng.shuffle(substat_pool)
        subs = []
        for idx in substat_pool[:n_subs]:
            stat, lo, hi = _SUBSTAT_DATA[idx]
            subs.append({"stat": stat, "value": rng.randint(lo, hi)})

        pieces.append({
            "slot": slot,
            "set_id": set_id,
            "rarity": rarity_name,
            "plus": enhancement,
            "subs": subs,
        })

    return pieces


def _crystal_stats(crystal_tier: int, template_id: str, progression: dict) -> dict:
    """Generate a deterministic crystal and compute its stat contributions."""
    from expansion_systems import CRYSTAL_TIERS, CRYSTAL_MAIN_BASE, CRYSTAL_SUBSTAT_POOL

    if crystal_tier == 0 or crystal_tier > len(CRYSTAL_TIERS):
        return {"flat": {"hp": 0, "atk": 0, "def": 0, "spd": 0},
                "pct": {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}}

    crystal = CRYSTAL_TIERS[crystal_tier - 1]
    seed = hash((template_id, "crystal", crystal_tier, progression["level"]))
    rng = _random.Random(seed)

    main_stats = list(CRYSTAL_MAIN_BASE.keys())
    main_stat = rng.choice(main_stats)
    main_val = round(CRYSTAL_MAIN_BASE[main_stat] * crystal["mult"])

    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}

    flat[main_stat] += main_val

    n_subs = crystal["subs"]
    pool = list(range(len(CRYSTAL_SUBSTAT_POOL)))
    rng.shuffle(pool)
    for idx in pool[:n_subs]:
        stat, lo, hi = CRYSTAL_SUBSTAT_POOL[idx]
        val = rng.randint(lo, hi)
        if stat.endswith("_pct"):
            pct[stat[:-4]] += val
        else:
            flat[stat] += val

    return {"flat": flat, "pct": pct}


def compute_enemy_gear_bonus(progression: dict, template: dict) -> dict:
    """Compute the REAL gear + crystal stat bonuses for an enemy.

    Returns a dict with both flat and pct bonuses:
        {hp_flat, atk_flat, def_flat, spd_flat, hp_pct, atk_pct, def_pct, spd_pct}

    These are computed from actual gear pieces and crystals using the
    existing gear system formulas — NOT arbitrary percentages.
    """
    from game_data import gear_stats, GEAR_SETS

    gear_pieces = _deterministic_gear_pieces(progression, template["id"])

    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}

    set_counts = {}
    for g in gear_pieces:
        st = gear_stats(g)
        for k in flat:
            flat[k] += st["flat"][k]
            pct[k] += st["pct"][k]
        set_counts[g["set_id"]] = set_counts.get(g["set_id"], 0) + 1

    for sid, cnt in set_counts.items():
        s = GEAR_SETS.get(sid)
        if not s:
            continue
        for bonus_key, need in (("bonus2", 2), ("bonus4", 4)):
            if cnt >= need:
                for stat_pct, val in s[bonus_key].items():
                    pct[stat_pct[:-4]] += val

    crystal = _crystal_stats(progression["crystal_tier"], template["id"], progression)
    for k in flat:
        flat[k] += crystal["flat"][k]
        pct[k] += crystal["pct"][k]

    return {
        "hp_flat": flat["hp"],
        "atk_flat": flat["atk"],
        "def_flat": flat["def"],
        "spd_flat": flat["spd"],
        "hp_pct": round(pct["hp"], 2),
        "atk_pct": round(pct["atk"], 2),
        "def_pct": round(pct["def"], 2),
        "spd_pct": round(pct["spd"], 2),
    }


# ---------------------------------------------------------------------------
# Full enemy stat computation — flows through the SAME stat calculation
# architecture used by player heroes.
# ---------------------------------------------------------------------------
def compute_enemy_stats(template: dict, progression: dict) -> dict:
    """Compute an enemy's FULL combat stats including evolved rarity,
    ascension, level scaling, gear, and crystals.

    This reuses compute_stats_for_rarity (which handles evolved rarity)
    and adds gear/crystal bonuses on top — the same pipeline a player
    hero goes through.
    """
    from game_data import RARITY_BASE, ROLE_MOD
    from expansion_systems import compute_stats_for_rarity

    evolved_rarity = resolve_evolved_rarity(template, progression)
    level = progression["level"]
    ascension = progression["ascension"]

    stats = compute_stats_for_rarity(template["id"], level, ascension, evolved_rarity)

    gear_bonus = compute_enemy_gear_bonus(progression, template)

    result = {}
    for k in ("hp", "atk", "def", "spd"):
        flat_key = f"{k}_flat"
        pct_key = f"{k}_pct"
        result[k] = max(1, round((stats[k] + gear_bonus[flat_key]) * (1 + gear_bonus[pct_key] / 100)))

    result["chakra"] = stats.get("chakra", 100)

    rarity_base = RARITY_BASE.get(evolved_rarity, RARITY_BASE["R"])
    result["critChance"] = rarity_base.get("crit_rate", 5)
    result["critMultiplier"] = rarity_base.get("crit_damage", 150)

    return result


# ---------------------------------------------------------------------------
# Reforge generation — deterministic reforge modifiers for enemy jutsus
# ---------------------------------------------------------------------------
def compute_enemy_reforge(progression: dict, template: dict) -> dict:
    """Generate deterministic reforge modifiers for an enemy's jutsus.

    Returns a dict mapping jutsu_id -> [reforge_modifier_ids].
    Only applied when reforge_count > 0.
    """
    from game_data import REFORGE_MODIFIERS

    reforge_count = progression["reforge_count"]
    if reforge_count == 0:
        return {}

    jutsus = template.get("jutsus", [])
    if not jutsus:
        return {}

    seed = hash((template["id"], "reforge", progression["level"]))
    rng = _random.Random(seed)

    mod_keys = list(REFORGE_MODIFIERS.keys())
    result = {}

    for j in jutsus:
        if j.get("chakra_cost", 0) <= 0:
            continue
        mods = []
        available = mod_keys[:]
        for _ in range(reforge_count):
            if not available:
                break
            pick = rng.choice(available)
            available.remove(pick)
            mods.append(pick)
        if mods:
            result[j["id"]] = mods

    return result


# ---------------------------------------------------------------------------
# Build a complete enemy dict ready for the frontend
# ---------------------------------------------------------------------------
def build_enemy(template: dict, progression: dict) -> dict:
    """Build a complete enemy definition dict with full progression.

    This produces the enemy dict that the frontend Battle.jsx consumes,
    including pre-computed stats, skill rank, passive status, and reforge
    modifiers — all derived from real RPG systems.
    """
    stats = compute_enemy_stats(template, progression)
    reforge = compute_enemy_reforge(progression, template)
    evolved_rarity = resolve_evolved_rarity(template, progression)

    enemy = {
        "template_id": template["id"],
        "level": progression["level"],
        "ascension": progression["ascension"],
        "evolved_rarity": evolved_rarity,
        "stats_override": stats,
        "skill_rank": progression["skill_rank"],
        "passive_locked": not progression["passive_unlocked"],
        "reforge": reforge if reforge else None,
    }

    enemy["progression"] = {
        "level": progression["level"],
        "rarity": evolved_rarity,
        "ascension": progression["ascension"],
        "gear_tier": progression["gear_tier"],
        "gear_enhancement": progression["gear_enhancement"],
        "reforge_count": progression["reforge_count"],
        "crystal_tier": progression["crystal_tier"],
        "skill_rank": progression["skill_rank"],
        "passive_unlocked": progression["passive_unlocked"],
        "score": progression["score"],
    }

    return enemy


# ---------------------------------------------------------------------------
# Recommended power — reflects the enemy's ACTUAL resulting strength
# ---------------------------------------------------------------------------
def enemy_recommended_power(template: dict, progression: dict) -> int:
    """Compute recommended power from the enemy's FULL build.

    This accounts for evolved rarity, ascension, gear, and crystals —
    not just base level/HP. Uses the same power formula as ninja_power
    but with the enemy's actual computed stats.
    """
    from game_data import skill_power_mult

    stats = compute_enemy_stats(template, progression)

    power = (
        stats["hp"] * 0.4
        + stats["atk"] * 2.2
        + stats["def"] * 1.6
        + stats["spd"] * 1.2
        + stats.get("chakra", 100) * 1.0
    )

    skill_mult = skill_power_mult(progression["skill_rank"])
    power *= skill_mult

    if progression["reforge_count"] > 0:
        power *= 1 + 0.05 * progression["reforge_count"]

    result = round(power)

    if result != result or result == float('inf') or result < 0:
        return 0
    return result


def team_recommended_power(enemies: list, catalog_by_id: dict) -> int:
    """Sum recommended power across an enemy team."""
    from game_data import skill_power_mult, ninja_power

    total = 0
    for e in enemies:
        tmpl = catalog_by_id.get(e.get("template_id"))
        if not tmpl:
            continue
        if "progression" in e and "stats_override" in e:
            stats = e["stats_override"]
            skill_mult = skill_power_mult(e.get("skill_rank", 1))
            power = (
                stats["hp"] * 0.4
                + stats["atk"] * 2.2
                + stats["def"] * 1.6
                + stats["spd"] * 1.2
                + stats.get("chakra", 100) * 1.0
            )
            power *= skill_mult
            if e.get("reforge"):
                power *= 1 + 0.05 * len(e["reforge"])
            total += max(0, round(power))
        else:
            total += ninja_power(e["template_id"], e.get("level", 1))
    return total
