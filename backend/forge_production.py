"""
Forge Production System — a crafting progression inspired by Iruna's
"Production" mechanic.

The forge has a level (1-200) that rises as you craft items.  Production
recipes are organised in tiers 1-200; higher tiers require rarer materials
that only drop from later campaign chapters or specific bosses.

This module owns:
  • FORGE_MATERIALS         — material definitions + chapter-gating
  • PRODUCTION_CATEGORIES   — the five craftable item lines
  • production_recipe()      — generates a recipe for any category+tier
  • forge recipes for ITEMS — generated output item metadata
  • roll_forge_drops()       — chapter-aware material drop logic
  • forge_xp_for_level()     — XP curve for levels 1-200
  • forge_level_from_xp()    — inverse: cumulative XP → level
"""

import random

# ---------------------------------------------------------------------------
# Forge materials — drop from campaign stages & bosses, gated by chapter.
# Each entry: (id, name, icon, color, desc, min_chapter, drop_weight, boss_only)
# ---------------------------------------------------------------------------
FORGE_MATERIALS = [
    # Band 0 — recipe tiers 1-40
    ("copper_ore",        "Copper Ore",        "box",      "#B87333", "Common forge material from early chapters.",          1,  30, False),
    ("tin_shard",         "Tin Shard",        "box",      "#A0A0A0", "Uncommon forge material from chapter 3 onward.",      3,  20, False),
    # Band 1 — recipe tiers 41-80
    ("iron_ingot",        "Iron Ingot",        "box",      "#71797E", "Sturdy metal for mid-tier recipes. Chapter 6+.",      6,  16, False),
    ("mithril_shard",     "Mithril Shard",    "gem",      "#42A5F5", "Rare forge material from chapter 10+.",               10, 13, False),
    # Band 2 — recipe tiers 81-120
    ("adamantite_chunk",  "Adamantite Chunk",  "gem",      "#26C6DA", "Hardened alloy for high-tier recipes. Chapter 15+.",  15, 11, False),
    ("runic_crystal",     "Runic Crystal",     "gem",      "#AB47BC", "Crystallised magic. Chapter 20+.",                    20,  9, False),
    # Band 3 — recipe tiers 121-160
    ("orichalcum_ingot",  "Orichalcum Ingot",  "gem",      "#FFD700", "Legendary metal from chapter 30+.",                   30,  7, False),
    ("dragon_scale",      "Dragon Scale",      "gem",      "#E74C3C", "Scale of a fallen wyrm. Chapter 40+.",               40,  6, False),
    # Band 4 — recipe tiers 161-200
    ("void_essence",     "Void Essence",      "sparkles", "#9B59B6", "Condensed nothingness. Chapter 50+.",                 50,  5, False),
    ("primordial_core",  "Primordial Core",   "star",     "#FFC857", "The forge's ultimate fuel. Chapter 70+.",              70,  3, False),
    # Boss-specific (uncommon drops from boss stages only)
    ("titan_core",       "Titan Core",        "gem",      "#FF6B35", "Rare drop from Sealed Titan bosses.",                   5, 15, True),
    ("warden_scale",     "Warden Scale",      "gem",      "#29B6F6", "Rare drop from Abyssal Warden bosses.",                 10, 15, True),
]

FORGE_MATERIAL_BY_ID = {m[0]: m for m in FORGE_MATERIALS}

# Quick lookup: which materials are available at a given chapter (non-boss)
def _available_mats(chapter, boss_only=False):
    return [m for m in FORGE_MATERIALS
            if m[7] == boss_only and m[5] <= chapter]

# Material bands — which two materials a recipe tier requires
MATERIAL_BANDS = [
    ("copper_ore", "tin_shard"),          # tiers 1-40
    ("iron_ingot", "mithril_shard"),      # tiers 41-80
    ("adamantite_chunk", "runic_crystal"),# tiers 81-120
    ("orichalcum_ingot", "dragon_scale"), # tiers 121-160
    ("void_essence", "primordial_core"),  # tiers 161-200
]

# ---------------------------------------------------------------------------
# Production categories — five craftable item lines, each with 200 tiers.
# ---------------------------------------------------------------------------
PRODUCTION_CATEGORIES = [
    {"id": "hp_potion",     "name": "Healing Salve",    "icon": "heart",   "color": "#FF1744", "desc": "Restores HP to a hero in battle.",     "stat": "hp"},
    {"id": "chakra_potion", "name": "Chakra Draught",   "icon": "zap",     "color": "#00E5FF", "desc": "Restores chakra to a hero in battle.", "stat": "chakra"},
    {"id": "atk_elixir",    "name": "Warrior's Flask",  "icon": "sword",   "color": "#FF5722", "desc": "Boosts ATK in battle.",                "stat": "atk"},
    {"id": "def_elixir",    "name": "Guardian's Flask",  "icon": "shield", "color": "#29B6F6", "desc": "Boosts DEF in battle.",                "stat": "def"},
    {"id": "revive_scroll", "name": "Soul Talisman",    "icon": "sparkles","color": "#00E676", "desc": "Revives a fallen ally in battle.",      "stat": "revive"},
]

PRODUCTION_CAT_BY_ID = {c["id"]: c for c in PRODUCTION_CATEGORIES}

FORGE_MAX_LEVEL = 200


def forge_xp_for_level(level):
    """XP required to advance FROM `level` TO `level + 1`."""
    return 80 + level * 40          # L1→2: 120, L50→51: 2080, L199→200: 8040


def forge_level_from_xp(xp):
    """Convert cumulative XP to a (level, xp_in_level, xp_for_next) tuple."""
    level = 1
    remaining = xp
    while level < FORGE_MAX_LEVEL:
        need = forge_xp_for_level(level)
        if remaining < need:
            return level, remaining, need
        remaining -= need
        level += 1
    return FORGE_MAX_LEVEL, 0, 0


def production_recipe(category_id, tier):
    """Generate the recipe data for a given category and tier (1-200)."""
    cat = PRODUCTION_CAT_BY_ID[category_id]
    band = min((tier - 1) // 40, 4)
    mat1, mat2 = MATERIAL_BANDS[band]
    tier_in_band = (tier - 1) % 40 + 1          # 1-40 within the band
    qty1 = 2 + tier_in_band // 5                # 2-10
    qty2 = 1 + tier_in_band // 10               # 1-5

    materials = {mat1: qty1, mat2: qty2}

    # Boss-specific materials gate the highest tiers
    if tier >= 150:
        materials["titan_core"] = 1 + (tier - 150) // 25
    if tier >= 170:
        materials["warden_scale"] = 1 + (tier - 170) // 15

    ryo = 50 * tier
    forge_xp = 15 * tier

    # Output potency scales linearly per category
    if cat["stat"] == "hp":
        potency = 500 + tier * 50               # 550 – 10,500
    elif cat["stat"] == "chakra":
        potency = 20 + tier * 2                  # 22 – 420
    elif cat["stat"] in ("atk", "def"):
        potency = 10 + tier * 3                  # 13 – 610
    else:  # revive
        potency = 30 + tier * 2                  # 32 – 430 (% HP restored)

    out_id = f"forge_{category_id}_t{tier}"
    return {
        "id": out_id,
        "category": category_id,
        "tier": tier,
        "name": f"{cat['name']} Lv.{tier}",
        "materials": materials,
        "ryo": ryo,
        "forge_xp": forge_xp,
        "forge_level_req": tier,
        "output": {"id": out_id, "name": f"{cat['name']} Lv.{tier}", "qty": 1, "potency": potency},
    }


def all_production_recipes():
    """Return a flat list of every recipe (5 categories × 200 tiers = 1000)."""
    out = []
    for cat in PRODUCTION_CATEGORIES:
        for t in range(1, FORGE_MAX_LEVEL + 1):
            out.append(production_recipe(cat["id"], t))
    return out


def production_recipes_for_category(category_id, max_tier=FORGE_MAX_LEVEL):
    """Return recipes for one category up to `max_tier`."""
    return [production_recipe(category_id, t) for t in range(1, max_tier + 1)]


# ---------------------------------------------------------------------------
# Generated ITEMS entries for forge-produced consumables.
# Added to gd.ITEMS at import time by game_data.py.
# ---------------------------------------------------------------------------
def forge_item_entries():
    """Generate ITEMS-style metadata for every forge-produced consumable."""
    entries = {}
    for cat in PRODUCTION_CATEGORIES:
        for t in range(1, FORGE_MAX_LEVEL + 1):
            iid = f"forge_{cat['id']}_t{t}"
            entries[iid] = {
                "id": iid,
                "name": f"{cat['name']} Lv.{t}",
                "type": "consumable",
                "value": 0,
                "icon": cat["icon"],
                "color": cat["color"],
                "desc": f"{cat['desc']} (Tier {t})",
            }
    return entries


# ---------------------------------------------------------------------------
# Drop logic — chapter-gated forge material drops.
# ---------------------------------------------------------------------------
def roll_forge_drops(chapter, is_boss, boss_mechanic, first_clear):
    """Roll forge material drops for a battle win.

    Returns a dict {item_id: qty}.
    Materials are gated by chapter — higher-tier mats only appear in later
    chapters.  Boss stages have a chance at boss-specific materials.
    """
    drops = {}

    # --- Regular materials (non-boss) ---
    pool = _available_mats(chapter, boss_only=False)
    if pool:
        weighted = []
        for m in pool:
            weighted.extend([m[0]] * m[6])  # m[6] = drop_weight
        rolls = 1 + (1 if chapter >= 5 else 0) + (1 if first_clear else 0)
        for _ in range(rolls):
            mat_id = random.choice(weighted)
            drops[mat_id] = drops.get(mat_id, 0) + random.randint(1, 2)

    # --- Boss-specific materials ---
    if is_boss and boss_mechanic:
        boss_mats = _available_mats(chapter, boss_only=True)
        for m in boss_mats:
            # Boss mats only drop from their matching mechanic
            if m[0] == "titan_core" and boss_mechanic == "sealed_titan":
                if random.random() < 0.15:
                    drops["titan_core"] = drops.get("titan_core", 0) + 1
            elif m[0] == "warden_scale" and boss_mechanic == "abyssal_warden":
                if random.random() < 0.15:
                    drops["warden_scale"] = drops.get("warden_scale", 0) + 1

    return drops
