"""Expansion systems — Step-Up Summons, Rarity Transcendence and Crystals.

Three long-term progression systems added on top of the core game:

1. STEP-UP SUMMON — a free x10 pull unlocked every 10 player levels (1, 10,
   20, 30 ...) with tripled (3x) base rates for SSR and above. One claim per
   milestone, tracked on the user document.

2. RARITY TRANSCENDENCE — any hero, even an R, can be raised one rarity tier
   at a time (up to GR) by spending shards + ryo + a new transcendence
   material. The hero's base stats are recomputed for the new rarity, so a
   fully transcended R rivals a natural GR.

3. CRYSTALS — a new equippable gear category (one per hero) that carries flat
   + percent stat bonuses, dropped by bosses in Tsukuyomi (and campaign boss
   stages) at a low 0.5%-1% rate that scales with difficulty. Modeled on the
   crystal equipment system from Iruna Online.
"""

import uuid as _uuid
from typing import Optional

import game_data as gd

# ---------------------------------------------------------------------------
# Shared rarity helpers
# ---------------------------------------------------------------------------
RARITY_LADDER = ["R", "SR", "SSR", "UR", "GR"]
TRANSCENDENCE_MAX = "GR"


def _next_rarity(rarity: str) -> Optional[str]:
    """Next rarity tier up, or None if already at the cap (GR)."""
    if rarity not in RARITY_LADDER:
        # Heroes above R (e.g. native SSR/UR) can still transcend toward GR.
        idx = gd.RARITY_ORDER.get(rarity, 1)
        for r in RARITY_LADDER:
            if gd.RARITY_ORDER[r] > idx:
                return r
        return None
    i = RARITY_LADDER.index(rarity)
    if i + 1 < len(RARITY_LADDER):
        return RARITY_LADDER[i + 1]
    return None


def effective_rarity(inst: dict, tmpl: dict) -> str:
    """The rarity a hero currently fights at — its transcended rarity if it
    has one, otherwise the template's native rarity."""
    return inst.get("evolved_rarity") or tmpl["rarity"]


# ===========================================================================
# 1. STEP-UP SUMMON
# ===========================================================================
STEPUP_FIRST = 1            # the level-1 milestone
STEPUP_EVERY = 10           # then every 10 levels (10, 20, 30 ...)
STEPUP_PULL_COUNT = 10      # each claim is a free x10
STEPUP_BOOST_MULT = 3       # 3x base rates for SSR+
STEPUP_BOOST_FLOOR = "SSR"  # rarities at/above this are boosted


def stepup_milestones(level: int) -> list:
    """All milestone levels the player has reached by `level` (ascending)."""
    out = [STEPUP_FIRST]
    n = STEPUP_EVERY
    while n <= level:
        out.append(n)
        n += STEPUP_EVERY
    return out


def stepup_available(level: int, claimed: list) -> list:
    """Milestones reached but not yet claimed."""
    reached = set(stepup_milestones(level))
    return sorted(reached - set(claimed or []))


def _stepup_weights() -> dict:
    """A copy of the Gem-banner weight table with SSR+ weights tripled."""
    w = dict(gd.SUMMON_WEIGHTS)
    floor = gd.RARITY_ORDER[STEPUP_BOOST_FLOOR]
    for r, weight in w.items():
        if gd.RARITY_ORDER.get(r, 0) >= floor:
            w[r] = weight * STEPUP_BOOST_MULT
    return w


def stepup_rates() -> dict:
    """Advertised per-rarity rates (%) for the step-up banner (SSR+ tripled)."""
    weights = _stepup_weights()
    counts = {}
    for t in gd.CATALOG_BY_ID.values():
        counts[t["rarity"]] = counts.get(t["rarity"], 0) + 1
    total = sum(weights[r] * c for r, c in counts.items())
    if total <= 0:
        return {}
    return {r: round(weights[r] * c / total * 100, 3)
            for r, c in sorted(counts.items(), key=lambda kv: gd.RARITY_ORDER[kv[0]])}


def stepup_pool(featured_id: Optional[str] = None) -> list:
    """Weighted (template_id, weight) pool using the boosted weight table."""
    weights = _stepup_weights()
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
    return _next_rarity(rarity)


def transcendence_cost(current_rarity: str) -> Optional[dict]:
    """Cost to transcend from `current_rarity` -> the next tier. Returns None
    at the GR cap. Shards scale with how far the hero has already climbed;
    the astral sigil demand rises sharply near the top."""
    target = _next_rarity(current_rarity)
    if not target:
        return None
    ri = gd.RARITY_ORDER[current_rarity]
    ti = gd.RARITY_ORDER[target]
    # Shards: more the higher you go (300 -> 600 -> 1200 -> 2000)
    shards = 300 * (2 ** (ti - 1))
    ryo = 5000 + ri * 4000 + ti * 6000
    # Astral sigils: 5 -> 10 -> 20 -> 40 climbing toward GR
    sigils = 5 * (2 ** (ti - 1))
    return {"shards": shards, "ryo": ryo, "items": {TRANSCENDENCE_MATERIAL: sigils},
            "target": target}


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

# Drop chance per difficulty (campaign boss stages use the "normal" rate).
CRYSTAL_DROP_CHANCE = {
    "normal": 0.005,    # 0.5%
    "hard": 0.0075,     # 0.75%
    "nightmare": 0.01,  # 1.0%
}


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
        "equipped_by": None,
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


def crystal_public(c: dict) -> dict:
    tier = CRYSTAL_BY_ID.get(c["tier"], CRYSTAL_TIERS[0])
    return {
        **c,
        "tier_name": tier["name"],
        "tier_color": tier["color"],
        "main_value": crystal_main_value(c),
        "score": crystal_score(c),
    }


def roll_crystal_drop(difficulty: str = "normal") -> Optional[dict]:
    """Returns a new crystal if the drop roll succeeds, else None."""
    chance = CRYSTAL_DROP_CHANCE.get(difficulty, CRYSTAL_DROP_CHANCE["normal"])
    if gd.secure_rng.random() < chance:
        return roll_crystal(difficulty)
    return None
