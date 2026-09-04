"""Global Team Synergy System.

Evaluates the player's active team composition and determines applicable
synergy bonuses. Synergies are deterministic, clearly communicated, and
affect actual combat stats.

Synergy categories:
    - Elemental (Fire, Water, Wind, Earth, Lightning, Dark, Light)
    - Role (Tank, DPS, Support, Healer, Assassin, Control, DoT)
    - Faction (existing hero faction data)
    - Status (Burn, Poison, Bleed, Freeze, Shock specialists)

Bonuses flow into the same stat system as normal hero bonuses via
synergy_bonuses dict applied at battle start.

Usage:
    synergies = evaluate_team_synergy(team_templates)
    bonuses = synergies["bonuses"]  # applied to all allies at battle start
"""

from typing import Optional
import game_data as gd


# ---------------------------------------------------------------------------
# Synergy tag system — derives tags from hero metadata (element, role, tags).
# Does NOT duplicate information; uses existing hero data.
# ---------------------------------------------------------------------------

ELEMENT_TAGS = {
    "Fire": "FIRE", "Water": "WATER", "Wind": "WIND", "Earth": "EARTH",
    "Lightning": "LIGHTNING", "Dark": "DARK", "Light": "LIGHT",
}

ROLE_SYNERGY_TAGS = {
    "Attacker": "DPS",
    "Assassin": "ASSASSIN",
    "Tank": "TANK",
    "Support": "SUPPORT",
    "Healer": "HEALER",
    "Mage": "DPS",
    "Control": "CONTROL",
    "Bruiser": "DPS",
}

# Map hero tags to synergy tags
TAG_TO_SYNERGY = {
    "BURN": "BURN",
    "POISON": "POISON",
    "BLEED": "BLEED",
    "STUN": "STUN",
    "FREEZE": "FREEZE",
    "DOT": "DOT",
    "SHIELD": "SHIELD",
    "HEAL": "HEAL",
    "LIFESTEAL": "LIFESTEAL",
}


def get_synergy_tags(hero: dict) -> list:
    """Extract synergy tags from a hero template/instance.

    Combines element, role, and existing tags into a flat tag list.
    """
    tags = set()

    # Element tag
    element = hero.get("element", "")
    if element in ELEMENT_TAGS:
        tags.add(ELEMENT_TAGS[element])

    # Role tag
    role = hero.get("role", "")
    if role in ROLE_SYNERGY_TAGS:
        tags.add(ROLE_SYNERGY_TAGS[role])

    # Existing hero tags
    for tag in hero.get("tags", []):
        if tag in TAG_TO_SYNERGY:
            tags.add(TAG_TO_SYNERGY[tag])

    return list(tags)


# ---------------------------------------------------------------------------
# Synergy definitions — centralized configuration.
# Each synergy has requirements (tag counts) and bonuses (stat multipliers).
# Bonuses are controlled — no single synergy dominates.
# ---------------------------------------------------------------------------

TEAM_SYNERGIES = [
    # --- Elemental synergies ---
    {
        "id": "fire_squad",
        "name": "Flame Covenant",
        "icon": "🔥",
        "category": "elemental",
        "requirements": {"FIRE": 3},
        "bonuses": {"fire_damage_pct": 8},
        "description": "3+ Fire heroes: +8% Fire Damage",
        "tiers": [
            {"count": 3, "bonuses": {"fire_damage_pct": 8}, "label": "3/5 Fire Heroes"},
            {"count": 4, "bonuses": {"fire_damage_pct": 15}, "label": "4/5 Fire Heroes"},
            {"count": 5, "bonuses": {"fire_damage_pct": 25}, "label": "5/5 Fire Heroes"},
        ],
    },
    {
        "id": "water_squad",
        "name": "Tide Covenant",
        "icon": "💧",
        "category": "elemental",
        "requirements": {"WATER": 3},
        "bonuses": {"water_damage_pct": 8},
        "description": "3+ Water heroes: +8% Water Damage",
        "tiers": [
            {"count": 3, "bonuses": {"water_damage_pct": 8}, "label": "3/5 Water Heroes"},
            {"count": 4, "bonuses": {"water_damage_pct": 15}, "label": "4/5 Water Heroes"},
            {"count": 5, "bonuses": {"water_damage_pct": 25}, "label": "5/5 Water Heroes"},
        ],
    },
    {
        "id": "wind_squad",
        "name": "Gale Covenant",
        "icon": "🌪️",
        "category": "elemental",
        "requirements": {"WIND": 3},
        "bonuses": {"wind_damage_pct": 8},
        "description": "3+ Wind heroes: +8% Wind Damage",
        "tiers": [
            {"count": 3, "bonuses": {"wind_damage_pct": 8}, "label": "3/5 Wind Heroes"},
            {"count": 4, "bonuses": {"wind_damage_pct": 15}, "label": "4/5 Wind Heroes"},
            {"count": 5, "bonuses": {"wind_damage_pct": 25}, "label": "5/5 Wind Heroes"},
        ],
    },
    {
        "id": "earth_squad",
        "name": "Stone Covenant",
        "icon": "⛰️",
        "category": "elemental",
        "requirements": {"EARTH": 3},
        "bonuses": {"earth_damage_pct": 8},
        "description": "3+ Earth heroes: +8% Earth Damage",
        "tiers": [
            {"count": 3, "bonuses": {"earth_damage_pct": 8}, "label": "3/5 Earth Heroes"},
            {"count": 4, "bonuses": {"earth_damage_pct": 15}, "label": "4/5 Earth Heroes"},
            {"count": 5, "bonuses": {"earth_damage_pct": 25}, "label": "5/5 Earth Heroes"},
        ],
    },
    {
        "id": "lightning_squad",
        "name": "Storm Covenant",
        "icon": "⚡",
        "category": "elemental",
        "requirements": {"LIGHTNING": 3},
        "bonuses": {"lightning_damage_pct": 8},
        "description": "3+ Lightning heroes: +8% Lightning Damage",
        "tiers": [
            {"count": 3, "bonuses": {"lightning_damage_pct": 8}, "label": "3/5 Lightning Heroes"},
            {"count": 4, "bonuses": {"lightning_damage_pct": 15}, "label": "4/5 Lightning Heroes"},
            {"count": 5, "bonuses": {"lightning_damage_pct": 25}, "label": "5/5 Lightning Heroes"},
        ],
    },
    {
        "id": "dark_squad",
        "name": "Shadow Covenant",
        "icon": "🌑",
        "category": "elemental",
        "requirements": {"DARK": 3},
        "bonuses": {"dark_damage_pct": 8},
        "description": "3+ Dark heroes: +8% Dark Damage",
        "tiers": [
            {"count": 3, "bonuses": {"dark_damage_pct": 8}, "label": "3/5 Dark Heroes"},
            {"count": 4, "bonuses": {"dark_damage_pct": 15}, "label": "4/5 Dark Heroes"},
            {"count": 5, "bonuses": {"dark_damage_pct": 25}, "label": "5/5 Dark Heroes"},
        ],
    },
    {
        "id": "light_squad",
        "name": "Radiant Covenant",
        "icon": "☀️",
        "category": "elemental",
        "requirements": {"LIGHT": 3},
        "bonuses": {"light_damage_pct": 8},
        "description": "3+ Light heroes: +8% Light Damage",
        "tiers": [
            {"count": 3, "bonuses": {"light_damage_pct": 8}, "label": "3/5 Light Heroes"},
            {"count": 4, "bonuses": {"light_damage_pct": 15}, "label": "4/5 Light Heroes"},
            {"count": 5, "bonuses": {"light_damage_pct": 25}, "label": "5/5 Light Heroes"},
        ],
    },

    # --- Role synergies ---
    {
        "id": "tank_dps",
        "name": "Guardian Formation",
        "icon": "🛡️",
        "category": "role",
        "requirements": {"TANK": 1, "DPS": 2},
        "bonuses": {"damage_reduction_pct": 5, "atk_pct": 5},
        "description": "1 Tank + 2 DPS: +5% Damage Reduction, +5% ATK",
        "tiers": [
            {"count": 1, "bonuses": {"damage_reduction_pct": 5, "atk_pct": 5}, "label": "1 Tank + 2 DPS"},
        ],
    },
    {
        "id": "support_dps",
        "name": "War Support",
        "icon": "⚔️",
        "category": "role",
        "requirements": {"SUPPORT": 1, "DPS": 2},
        "bonuses": {"atk_pct": 8},
        "description": "1 Support + 2 DPS: +8% ATK",
        "tiers": [
            {"count": 1, "bonuses": {"atk_pct": 8}, "label": "1 Support + 2 DPS"},
        ],
    },
    {
        "id": "healer_tank",
        "name": "Iron Wall",
        "icon": "💚",
        "category": "role",
        "requirements": {"HEALER": 1, "TANK": 1},
        "bonuses": {"hp_pct": 10, "def_pct": 5},
        "description": "1 Healer + 1 Tank: +10% HP, +5% DEF",
        "tiers": [
            {"count": 1, "bonuses": {"hp_pct": 10, "def_pct": 5}, "label": "1 Healer + 1 Tank"},
        ],
    },
    {
        "id": "assassin_control",
        "name": "Shadow Tactics",
        "icon": "🗡️",
        "category": "role",
        "requirements": {"ASSASSIN": 1, "CONTROL": 1},
        "bonuses": {"atk_pct": 6, "crit_chance_pct": 4},
        "description": "1 Assassin + 1 Control: +6% ATK, +4% Crit Chance",
        "tiers": [
            {"count": 1, "bonuses": {"atk_pct": 6, "crit_chance_pct": 4}, "label": "1 Assassin + 1 Control"},
        ],
    },
    {
        "id": "double_healer",
        "name": "Divine Mercy",
        "icon": "✨",
        "category": "role",
        "requirements": {"HEALER": 2},
        "bonuses": {"healing_pct": 15},
        "description": "2 Healers: +15% Healing Effect",
        "tiers": [
            {"count": 2, "bonuses": {"healing_pct": 15}, "label": "2 Healers"},
        ],
    },

    # --- Status/ailment synergies ---
    {
        "id": "burn_squad",
        "name": "Inferno Legion",
        "icon": "🔥",
        "category": "status",
        "requirements": {"BURN": 2},
        "bonuses": {"burn_damage_pct": 20},
        "description": "2+ Burn specialists: +20% Burn Damage",
        "tiers": [
            {"count": 2, "bonuses": {"burn_damage_pct": 20}, "label": "2/3 Burn Specialists"},
            {"count": 3, "bonuses": {"burn_damage_pct": 35}, "label": "3/3 Burn Specialists"},
        ],
    },
    {
        "id": "poison_squad",
        "name": "Toxic Legion",
        "icon": "☠️",
        "category": "status",
        "requirements": {"POISON": 2},
        "bonuses": {"poison_damage_pct": 20},
        "description": "2+ Poison specialists: +20% Poison Damage",
        "tiers": [
            {"count": 2, "bonuses": {"poison_damage_pct": 20}, "label": "2/3 Poison Specialists"},
            {"count": 3, "bonuses": {"poison_damage_pct": 35}, "label": "3/3 Poison Specialists"},
        ],
    },
    {
        "id": "bleed_squad",
        "name": "Crimson Legion",
        "icon": "🩸",
        "category": "status",
        "requirements": {"BLEED": 2},
        "bonuses": {"bleed_damage_pct": 20},
        "description": "2+ Bleed specialists: +20% Bleed Damage",
        "tiers": [
            {"count": 2, "bonuses": {"bleed_damage_pct": 20}, "label": "2/3 Bleed Specialists"},
            {"count": 3, "bonuses": {"bleed_damage_pct": 35}, "label": "3/3 Bleed Specialists"},
        ],
    },
    {
        "id": "freeze_squad",
        "name": "Frost Legion",
        "icon": "❄️",
        "category": "status",
        "requirements": {"FREEZE": 2},
        "bonuses": {"cc_effectiveness_pct": 15},
        "description": "2+ Freeze specialists: +15% CC Effectiveness",
        "tiers": [
            {"count": 2, "bonuses": {"cc_effectiveness_pct": 15}, "label": "2/3 Freeze Specialists"},
            {"count": 3, "bonuses": {"cc_effectiveness_pct": 25}, "label": "3/3 Freeze Specialists"},
        ],
    },

    # --- Faction synergy ---
    {
        "id": "faction_unity",
        "name": "Faction Unity",
        "icon": "🏛️",
        "category": "faction",
        "requirements": {"_faction": 3},
        "bonuses": {"atk_pct": 5, "hp_pct": 5},
        "description": "3+ heroes from the same faction: +5% ATK, +5% HP",
        "tiers": [
            {"count": 3, "bonuses": {"atk_pct": 5, "hp_pct": 5}, "label": "3/5 Same Faction"},
            {"count": 4, "bonuses": {"atk_pct": 8, "hp_pct": 8}, "label": "4/5 Same Faction"},
            {"count": 5, "bonuses": {"atk_pct": 12, "hp_pct": 12}, "label": "5/5 Same Faction"},
        ],
    },
]


# ---------------------------------------------------------------------------
# Team evaluation
# ---------------------------------------------------------------------------

def evaluate_team_synergy(team_templates: list) -> dict:
    """Evaluate a team's composition and return active synergies + bonuses.

    Args:
        team_templates: list of hero template dicts (from catalog)

    Returns:
        {
            "active": [synergy_info],   # active synergies with tier info
            "bonuses": dict,            # flat bonus dict to apply in combat
            "tag_counts": dict,         # raw tag counts for debugging
        }
    """
    if not team_templates:
        return {"active": [], "bonuses": {}, "tag_counts": {}}

    # Count tags across the team
    tag_counts = {}
    faction_counts = {}

    for hero in team_templates:
        for tag in get_synergy_tags(hero):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

        faction = hero.get("faction", "")
        if faction:
            faction_counts[faction] = faction_counts.get(faction, 0) + 1

    # Find the most common faction
    top_faction = max(faction_counts.items(), key=lambda x: x[1]) if faction_counts else ("", 0)

    active_synergies = []
    total_bonuses = {}

    for synergy in TEAM_SYNERGIES:
        reqs = synergy.get("requirements", {})

        # Special handling for faction synergy
        if "_faction" in reqs:
            required = reqs["_faction"]
            actual = top_faction[1]
            if actual >= required:
                # Find the highest tier achieved
                best_tier = None
                for tier in synergy.get("tiers", []):
                    if actual >= tier["count"]:
                        best_tier = tier
                if best_tier:
                    active_synergies.append({
                        "id": synergy["id"],
                        "name": synergy["name"],
                        "icon": synergy["icon"],
                        "category": synergy["category"],
                        "label": best_tier["label"],
                        "bonuses": best_tier["bonuses"],
                        "description": synergy["description"],
                    })
                    for k, v in best_tier["bonuses"].items():
                        total_bonuses[k] = total_bonuses.get(k, 0) + v
            continue

        # Standard tag-count synergies
        # Check if all requirements are met
        all_met = True
        for tag, needed in reqs.items():
            if tag_counts.get(tag, 0) < needed:
                all_met = False
                break

        if not all_met:
            continue

        # Find the highest tier achieved
        best_tier = None
        for tier in synergy.get("tiers", []):
            # For multi-requirement synergies, check the primary tag
            primary_tag = list(reqs.keys())[0]
            if tag_counts.get(primary_tag, 0) >= tier["count"]:
                best_tier = tier

        if best_tier:
            active_synergies.append({
                "id": synergy["id"],
                "name": synergy["name"],
                "icon": synergy["icon"],
                "category": synergy["category"],
                "label": best_tier["label"],
                "bonuses": best_tier["bonuses"],
                "description": synergy["description"],
            })
            for k, v in best_tier["bonuses"].items():
                total_bonuses[k] = total_bonuses.get(k, 0) + v

    return {
        "active": active_synergies,
        "bonuses": total_bonuses,
        "tag_counts": tag_counts,
    }


# ---------------------------------------------------------------------------
# Apply synergy bonuses to combat stats
# ---------------------------------------------------------------------------

def apply_synergy_to_stats(stats: dict, bonuses: dict) -> dict:
    """Apply synergy bonuses to a combatant's stats.

    Bonuses keys:
        atk_pct, hp_pct, def_pct, spd_pct — percentage stat increases
        damage_reduction_pct — flat damage reduction
        crit_chance_pct — flat crit chance increase
        healing_pct — healing effectiveness increase
        fire_damage_pct, water_damage_pct, etc. — elemental damage bonuses
        burn_damage_pct, poison_damage_pct, bleed_damage_pct — ailment bonuses
        cc_effectiveness_pct — CC chance increase
    """
    if not bonuses:
        return stats

    result = dict(stats)

    if "atk_pct" in bonuses:
        result["atk"] = round(result["atk"] * (1 + bonuses["atk_pct"] / 100))
    if "hp_pct" in bonuses:
        result["hp"] = round(result["hp"] * (1 + bonuses["hp_pct"] / 100))
        result["maxHp"] = result["hp"]
    if "def_pct" in bonuses:
        result["def"] = round(result["def"] * (1 + bonuses["def_pct"] / 100))
    if "spd_pct" in bonuses:
        result["spd"] = round(result["spd"] * (1 + bonuses["spd_pct"] / 100))
    if "crit_chance_pct" in bonuses:
        result["critChance"] = (result.get("critChance", 0.06) + bonuses["crit_chance_pct"] / 100)

    return result


def get_synergy_bonuses_for_team(team_instance_ids: list, user: dict) -> dict:
    """Look up team templates from user ninjas and evaluate synergies.

    Returns the bonuses dict ready to apply in combat.
    """
    catalog = gd.CATALOG_BY_ID
    ninjas = user.get("ninjas", [])
    ninja_by_id = {n["instance_id"]: n for n in ninjas}

    templates = []
    for iid in team_instance_ids:
        inst = ninja_by_id.get(iid)
        if not inst:
            continue
        tmpl = catalog.get(inst["template_id"])
        if tmpl:
            templates.append(tmpl)

    result = evaluate_team_synergy(templates)
    return result
