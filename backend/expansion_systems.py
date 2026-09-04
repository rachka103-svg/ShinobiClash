"""Expansion systems — Step-Up Summons, Rarity Transcendence and Crystals.

Three long-term progression systems added on top of the core game:

1. STEP-UP SUMMON — a free x10 pull earned every 10 player levels (10, 20,
   30 ...) with a dedicated improved rate table. Rewards are calculated
   deterministically from floor(level / 10) and tracked via a simple used
   counter, so they accumulate safely across migrations and offline
   level-ups.

2. RARITY TRANSCENDENCE — any hero, even an R, can be raised one rarity tier
   at a time (up to GR) by spending shards + ryo + a new transcendence
   material. The hero's base stats are recomputed for the new rarity, so a
   fully transcended R rivals a natural GR.

3. CRYSTALS — a new equippable gear category (one per hero) that carries flat
   + percent stat bonuses, dropped ONLY by bosses in Tsukuyomi as a rare drop
   that scales with boss index and difficulty (like the signature gear drop,
   but at roughly half the rate so they stay super rare). Modeled on the
   crystal equipment system from Iruna Online.
"""

import uuid as _uuid
from typing import Optional

import game_data as gd
import progression as prog

# ---------------------------------------------------------------------------
# Shared rarity helpers — the ascension ladder is owned by progression.py
# (R -> SR -> SSR -> UR -> LR -> GR, with GR as the pinnacle).
# ---------------------------------------------------------------------------
RARITY_LADDER = prog.ASCENSION_LADDER
TRANSCENDENCE_MAX = prog.ASCENSION_MAX


def _next_rarity(rarity: str) -> Optional[str]:
    """Next rarity tier up the ascension ladder, or None at the GR cap."""
    return prog.get_next_rarity(rarity)


def effective_rarity(inst: dict, tmpl: dict) -> str:
    """The rarity a hero currently fights at — its ascended (evolved) rarity
    if it has one, otherwise the template's native rarity. Also resolves any
    legacy star overflow (heroes evolved under the old flat 6-star system) by
    walking them up the ladder until their stars fit the new per-rarity cap."""
    evolved = inst.get("evolved_rarity") or tmpl["rarity"]
    stars = inst.get("stars", 1)
    return prog.resolve_effective_rarity(evolved, tmpl["rarity"], stars)


# ===========================================================================
# 1. STEP-UP SUMMON
# ===========================================================================
# A free x10 summon earned every 10 player levels. Rewards are calculated
# deterministically from the player's current level (floor(level / 10)),
# so they accumulate safely across offline level-ups, migrations, and old
# accounts — no reliance on detecting the exact moment of leveling.
STEPUP_EVERY = 10           # one free x10 every 10 levels (10, 20, 30 ...)
STEPUP_PULL_COUNT = 10      # each claim is a free x10

# Dedicated Step-Up rate table — more rewarding than the standard Gem banner.
# R is reduced, SR/SSR boosted, UR has a meaningful chance, GR is extremely
# rare but possible. Tunable as a single config block.
STEPUP_WEIGHTS = {"R": 550, "SR": 480, "SSR": 220, "UR": 70, "GR": 6}


def stepup_total_earned(level: int) -> int:
    """Total Step-Up x10 summons earned by reaching this level."""
    return level // STEPUP_EVERY


def stepup_available_count(level: int, used: int) -> int:
    """Unclaimed Step-Up summons = earned minus used (never below 0)."""
    return max(0, stepup_total_earned(level) - (used or 0))


def stepup_next_milestone(level: int) -> int:
    """The next level that grants a new Step-Up summon."""
    return ((level // STEPUP_EVERY) + 1) * STEPUP_EVERY


def stepup_rates() -> dict:
    """Advertised per-rarity rates (%) for the Step-Up banner."""
    weights = STEPUP_WEIGHTS
    counts = {}
    for t in gd.CATALOG_BY_ID.values():
        counts[t["rarity"]] = counts.get(t["rarity"], 0) + 1
    total = sum(weights.get(r, 0) * c for r, c in counts.items())
    if total <= 0:
        return {}
    return {r: round(weights.get(r, 0) * c / total * 100, 3)
            for r, c in sorted(counts.items(), key=lambda kv: gd.RARITY_ORDER[kv[0]])}


def stepup_pool(featured_id: Optional[str] = None) -> list:
    """Weighted (template_id, weight) pool using the Step-Up rate table."""
    weights = STEPUP_WEIGHTS
    out = []
    for tid, t in gd.CATALOG_BY_ID.items():
        w = weights.get(t["rarity"], 0)
        if w <= 0:
            continue
        if featured_id and tid == featured_id:
            w = w * 2.0  # mirror the standard featured rate-up
        out.append((tid, w))
    return out


# ===========================================================================
# 2. RARITY TRANSCENDENCE
# ===========================================================================
# New material consumed when raising a hero's rarity tier. Lower tiers are
# cheap; the final push to GR demands a lot.
TRANSCENDENCE_MATERIAL = "astral_sigil"


def transcendence_target(rarity: str) -> Optional[str]:
    """Next rarity tier up the ascension ladder (alias for the UI field)."""
    return _next_rarity(rarity)


def transcendence_cost(current_rarity: str, element: Optional[str] = None) -> Optional[dict]:
    """Cost to ascend from `current_rarity` -> the next tier. Delegates to the
    centralized progression config (shards + gold + elemental essence). Returns
    None at the GR cap."""
    return prog.get_ascension_cost(current_rarity, element)


def hero_base_stats(template_id: str, rarity: str) -> dict:
    """Base stats for a hero at a given (possibly transcended) rarity. Falls
    back to the template's stored base_stats when the rarity is unchanged."""
    tmpl = gd.CATALOG_BY_ID[template_id]
    if rarity == tmpl["rarity"]:
        return tmpl["base_stats"]
    return gd._hero_stats(rarity, tmpl["role"])


def compute_stats_for_rarity(template_id: str, level: int, ascension: int,
                             rarity: str) -> dict:
    """Like gd.compute_stats but recomputes the base for `rarity` (used when a
    hero has transcended beyond its native tier)."""
    b = hero_base_stats(template_id, rarity)
    gl = 1 + 0.09 * (level - 1)
    ga = 1 + 0.12 * ascension
    return {
        "hp": round(b["hp"] * gl * ga),
        "atk": round(b["atk"] * gl * ga),
        "def": round(b["def"] * (1 + 0.08 * (level - 1)) * ga),
        "spd": round(b["spd"] * (1 + 0.025 * (level - 1)) * (1 + 0.05 * ascension)),
        "chakra": b["chakra"],
    }


# ===========================================================================
# 3. CRYSTALS
# ===========================================================================
# A separate equippable category from the 4-slot gear set system. Each hero
# can equip ONE crystal. Crystals carry flat + percent stat bonuses (Iruna
# Online style) and drop from bosses at a low rate that scales with
# difficulty. They do NOT count toward gear set bonuses.
CRYSTAL_TIERS = [
    {"id": "chipped",   "name": "Chipped",   "color": "#9E9E9E", "mult": 1.0, "subs": 1},
    {"id": "faceted",   "name": "Faceted",   "color": "#29B6F6", "mult": 1.6, "subs": 2},
    {"id": "prismatic", "name": "Prismatic", "color": "#AB47BC", "mult": 2.4, "subs": 3},
    {"id": "radiant",   "name": "Radiant",   "color": "#FFCA28", "mult": 3.4, "subs": 4},
    {"id": "astral",    "name": "Astral",    "color": "#64FFDA", "mult": 4.8, "subs": 5},
]
CRYSTAL_BY_ID = {c["id"]: c for c in CRYSTAL_TIERS}

# Base main-stat value per crystal tier (flat). One of four stats is chosen
# as the crystal's "essence" (main) stat; the rest come as substats.
CRYSTAL_MAIN_BASE = {"hp": 240, "atk": 60, "def": 45, "spd": 22}
CRYSTAL_SUBSTAT_POOL = [
    ("atk_pct", 2, 7), ("def_pct", 2, 7), ("hp_pct", 2, 7), ("spd_pct", 1, 5),
    ("atk", 8, 26), ("def", 6, 22), ("hp", 60, 200), ("spd", 3, 12),
]

# Crystals drop at a fraction of the Tsukuyomi boss's gear rare-drop chance
# (which already scales with boss index + difficulty), keeping them super
# rare. At the hardest content (nightmare, highest boss = 14% gear rate) the
# crystal drop caps at ~2.5%.
CRYSTAL_DROP_FRACTION = 0.18


def roll_crystal(difficulty: str = "normal") -> dict:
    """Generate a new crystal instance. Higher difficulty skews the tier
    roll toward the top of the table."""
    tiers = CRYSTAL_TIERS
    luck = {"normal": 0.15, "hard": 0.35, "nightmare": 0.55}.get(difficulty, 0.15)
    weights = []
    for i, _ in enumerate(tiers):
        weights.append(max(1.0, (len(tiers) - i) * 10 * (1 - luck) + (i + 1) * 10 * luck))
    tier = gd.secure_rng.choices(tiers, weights=weights, k=1)[0]
    main_stat = gd.secure_rng.choice(list(CRYSTAL_MAIN_BASE.keys()))
    n_subs = tier["subs"]
    pool = CRYSTAL_SUBSTAT_POOL[:]
    gd.secure_rng.shuffle(pool)
    subs = []
    for stat, lo, hi in pool[:n_subs]:
        subs.append({"stat": stat, "value": gd.secure_rng.randint(lo, hi)})
    return {
        "crystal_id": str(_uuid.uuid4()),
        "tier": tier["id"],
        "main_stat": main_stat,
        "plus": 0,
        "subs": subs,
        "socketed_in": None,
        "locked": False,
    }


def crystal_main_value(crystal: dict) -> int:
    tier = CRYSTAL_BY_ID.get(crystal["tier"], CRYSTAL_TIERS[0])
    base = CRYSTAL_MAIN_BASE[crystal["main_stat"]]
    return max(1, round(base * tier["mult"] * (1 + 0.08 * crystal.get("plus", 0))))


def crystal_stats(crystal: dict) -> dict:
    """Resolved stat contribution of one crystal: flat + percent buckets."""
    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}
    flat[crystal["main_stat"]] += crystal_main_value(crystal)
    for s in crystal.get("subs", []):
        if s["stat"].endswith("_pct"):
            pct[s["stat"][:-4]] += s["value"]
        else:
            flat[s["stat"]] += s["value"]
    return {"flat": flat, "pct": pct}


def crystal_score(crystal: dict) -> int:
    st = crystal_stats(crystal)
    f, p = st["flat"], st["pct"]
    score = f["hp"] * 0.35 + f["atk"] * 2.2 + f["def"] * 1.7 + f["spd"] * 3.0
    score += (p["hp"] + p["atk"] + p["def"] + p["spd"]) * 9
    score *= 1 + 0.05 * crystal.get("plus", 0)
    return round(score)


def apply_crystal_to_stats(base: dict, crystal: Optional[dict]) -> dict:
    """Applies a single equipped crystal (flat + %) to a hero's stats dict."""
    if not crystal:
        return base
    st = crystal_stats(crystal)
    flat, pct = st["flat"], st["pct"]
    return {
        "hp": round((base["hp"] + flat["hp"]) * (1 + pct["hp"] / 100)),
        "atk": round((base["atk"] + flat["atk"]) * (1 + pct["atk"] / 100)),
        "def": round((base["def"] + flat["def"]) * (1 + pct["def"] / 100)),
        "spd": round((base["spd"] + flat["spd"]) * (1 + pct["spd"] / 100)),
        "chakra": base["chakra"],
    }


def apply_crystals_to_stats(base: dict, crystals: list) -> dict:
    """Applies multiple socketed crystals (one per gear piece) to a hero's
    stats dict — aggregates all flat and percent bonuses, then applies once."""
    if not crystals:
        return base
    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}
    for c in crystals:
        st = crystal_stats(c)
        for k in flat:
            flat[k] += st["flat"][k]
        for k in pct:
            pct[k] += st["pct"][k]
    return {
        "hp": round((base["hp"] + flat["hp"]) * (1 + pct["hp"] / 100)),
        "atk": round((base["atk"] + flat["atk"]) * (1 + pct["atk"] / 100)),
        "def": round((base["def"] + flat["def"]) * (1 + pct["def"] / 100)),
        "spd": round((base["spd"] + flat["spd"]) * (1 + pct["spd"] / 100)),
        "chakra": base["chakra"],
    }


def crystal_public(c: dict) -> dict:
    tier = CRYSTAL_BY_ID.get(c["tier"], CRYSTAL_TIERS[0])
    return {
        **c,
        "tier_name": tier["name"],
        "tier_color": tier["color"],
        "main_value": crystal_main_value(c),
        "score": crystal_score(c),
    }


def roll_crystal_drop(gear_rare_chance: float) -> Optional[dict]:
    """Returns a new crystal if the drop roll succeeds, else None.

    `gear_rare_chance` is the boss's computed gear rare-drop rate (already
    scaled by boss index + difficulty). The crystal rolls at a fraction of
    that rate so it stays rarer than equipment."""
    chance = gear_rare_chance * CRYSTAL_DROP_FRACTION
    if gd.secure_rng.random() < chance:
        return roll_crystal("normal")
    return None
