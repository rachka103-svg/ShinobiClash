"""Admin game-configuration system — hybrid DB-backed + in-memory overrides.

Every field maps to a module-level attribute on `game_data`. Setting the
attribute via `setattr(gd, ...)` takes effect instantly for all call sites
that read the global at call time (which is all of them). Values are also
persisted to MongoDB so they survive restarts (re-applied on startup).
"""
import game_data as gd

# ── Field registry ──────────────────────────────────────────────────────
# key → (game_data attr name, type)
# type: "int" | "float" | "json"  (json = dict/list stored as-is)
CONFIG_FIELDS = {
    # ── Balance & Rates ──────────────────────────────────────────────
    "summon_weights":            ("SUMMON_WEIGHTS", "json"),
    "gold_summon_weights":       ("GOLD_SUMMON_WEIGHTS", "json"),
    "energy_max_default":        ("ENERGY_MAX_DEFAULT", "int"),
    "energy_regen_seconds":      ("ENERGY_REGEN_SECONDS", "int"),
    "energy_cost":               ("ENERGY_COST", "json"),
    "arena_attempts_max":       ("ARENA_ATTEMPTS_MAX", "int"),
    "arena_rating_default":     ("ARENA_RATING_DEFAULT", "int"),
    "arena_rating_win":          ("ARENA_RATING_WIN", "int"),
    "arena_rating_loss":         ("ARENA_RATING_LOSS", "int"),
    "arena_win_rewards":        ("ARENA_WIN_REWARDS", "json"),
    "arena_win_milestone_every": ("ARENA_WIN_MILESTONE_EVERY", "int"),
    "arena_win_milestone_gems":  ("ARENA_WIN_MILESTONE_GEMS", "int"),
    "star_bonus_per_star":       ("STAR_BONUS_PER_STAR", "float"),
    "skill_power_per_rank":      ("SKILL_POWER_PER_RANK", "float"),
    "skill_rank_max":            ("SKILL_RANK_MAX", "int"),
    "passive_unlock_rank":       ("PASSIVE_UNLOCK_RANK", "int"),
    "gear_summon_rates":         ("GEAR_SUMMON_RATES", "json"),
    "gear_enhance_max":          ("GEAR_ENHANCE_MAX", "int"),
    "gear_main_growth_per_plus": ("GEAR_MAIN_GROWTH_PER_PLUS", "float"),
    "craft_rarity_weights":      ("CRAFT_RARITY_WEIGHTS", "json"),
    "drop_table":                ("DROP_TABLE", "json"),
    # ── Heroes & Stats ────────────────────────────────────────────────
    "rarity_base":               ("RARITY_BASE", "json"),
    "role_mod":                  ("ROLE_MOD", "json"),
    "ascension_max":             ("ASCENSION_MAX", "json"),
    "star_level_max":            ("STAR_LEVEL_MAX", "int"),
    "hero_max_level":            ("HERO_MAX_LEVEL", "int"),
    "boss_max_level":            ("BOSS_MAX_LEVEL", "int"),
    "ascension_step":            ("ASCENSION_STEP", "int"),
    "shard_yield_per_duplicate": ("SHARD_YIELD_PER_DUPLICATE", "json"),
    "exp_tome_gold_cost":        ("EXP_TOME_GOLD_COST", "json"),
}

CATEGORIES = {
    "balance": [
        "summon_weights", "gold_summon_weights", "energy_max_default", "energy_regen_seconds",
        "energy_cost", "arena_attempts_max", "arena_rating_default", "arena_rating_win",
        "arena_rating_loss", "arena_win_rewards", "arena_win_milestone_every",
        "arena_win_milestone_gems", "star_bonus_per_star", "skill_power_per_rank",
        "skill_rank_max", "passive_unlock_rank", "gear_summon_rates", "gear_enhance_max",
        "gear_main_growth_per_plus", "craft_rarity_weights", "drop_table",
    ],
    "heroes": [
        "rarity_base", "role_mod", "ascension_max", "star_level_max", "hero_max_level",
        "boss_max_level", "ascension_step", "shard_yield_per_duplicate", "exp_tome_gold_cost",
    ],
}

# Editable fields on each stage dict (hand-authored s1-s12 + procedural).
STAGE_EDITABLE = ["enemies", "rewards", "first_clear", "boss_mechanic", "name", "region"]


def _json_safe(val):
    """Convert tuples inside lists to plain lists for JSON serialisation."""
    if isinstance(val, list):
        return [_json_safe(v) for v in val]
    if isinstance(val, dict):
        return {k: _json_safe(v) for k, v in val.items()}
    if isinstance(val, tuple):
        return [_json_safe(v) for v in val]
    return val


def config_snapshot():
    """Read current live values of every config field."""
    snap = {}
    for key, (attr, _typ) in CONFIG_FIELDS.items():
        snap[key] = _json_safe(getattr(gd, attr))
    return snap


def config_by_category():
    """Return config grouped by category for the frontend."""
    out = {}
    for cat, keys in CATEGORIES.items():
        out[cat] = {k: _json_safe(getattr(gd, CONFIG_FIELDS[k][0])) for k in keys}
    return out


async def load_game_config(db):
    """Load persisted overrides from Mongo into live game_data attributes."""
    doc = await db.game_config.find_one({"_id": "game_config"}) or {}
    for key, (attr, typ) in CONFIG_FIELDS.items():
        if key not in doc:
            continue
        try:
            _apply_field(attr, typ, doc[key])
        except Exception:
            pass


def _apply_field(attr, typ, raw):
    if typ == "int":
        setattr(gd, attr, int(raw))
    elif typ == "float":
        setattr(gd, attr, float(raw))
    else:
        setattr(gd, attr, raw)


async def save_game_config(db, body):
    """Apply submitted values to live game_data + persist to Mongo."""
    updates = {}
    for key, (attr, typ) in CONFIG_FIELDS.items():
        if key not in body or body[key] is None:
            continue
        try:
            _apply_field(attr, typ, body[key])
            updates[key] = _json_safe(getattr(gd, attr))
        except Exception:
            raise ValueError(f"Invalid value for {key}")
    if updates:
        await db.game_config.update_one({"_id": "game_config"}, {"$set": updates}, upsert=True)
    return config_snapshot()


# ── Stage overrides ─────────────────────────────────────────────────────
async def load_stage_overrides(db):
    doc = await db.game_config.find_one({"_id": "stages"}) or {}
    overrides = doc.get("overrides", {})
    for sid, ov in overrides.items():
        if sid in gd.STAGES_BY_ID:
            gd.STAGES_BY_ID[sid].update(ov)
            for s in gd.STAGES:
                if s["id"] == sid:
                    s.update(ov)
                    break


async def save_stage_override(db, stage_id, updates):
    allowed = {k: v for k, v in updates.items() if k in STAGE_EDITABLE}
    if stage_id not in gd.STAGES_BY_ID:
        raise KeyError(stage_id)
    gd.STAGES_BY_ID[stage_id].update(allowed)
    for s in gd.STAGES:
        if s["id"] == stage_id:
            s.update(allowed)
            break
    await db.game_config.update_one(
        {"_id": "stages"},
        {"$set": {f"overrides.{stage_id}": allowed}},
        upsert=True,
    )
    return _json_safe(gd.STAGES_BY_ID[stage_id])


# ── Boss-mechanic overrides ──────────────────────────────────────────────
async def load_boss_overrides(db):
    doc = await db.game_config.find_one({"_id": "boss_mechanics"}) or {}
    for mid, ov in doc.get("overrides", {}).items():
        if mid in gd.BOSS_MECHANICS:
            gd.BOSS_MECHANICS[mid].update(ov)


async def save_boss_override(db, mech_id, updates):
    if mech_id not in gd.BOSS_MECHANICS:
        raise KeyError(mech_id)
    gd.BOSS_MECHANICS[mech_id].update(updates)
    await db.game_config.update_one(
        {"_id": "boss_mechanics"},
        {"$set": {f"overrides.{mech_id}": updates}},
        upsert=True,
    )
    return _json_safe(gd.BOSS_MECHANICS[mech_id])
