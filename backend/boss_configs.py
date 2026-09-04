"""Boss Hunt + Global Boss Configuration System.

Defines boss-specific mechanics, identities, and combat modifier presets
for ALL PvE modes. Each boss has a deliberate design — NOT every mechanic
on every boss.

Boss Hunt bosses are the most developed, with unique identities, explicit
resistances/vulnerabilities, and strategic counterplay.

Campaign/Tsukuyomi/Spire bosses consume the same BOSS_MECHANICS framework
(defined in game_data.py) plus the combat_modifiers system for their
resistances/immunities.

Architecture:
    BOSS_HUNT_CONFIGS — Boss Hunt-specific boss definitions
    BOSS_COMBAT_MODIFIERS — combat modifier presets per boss mechanic
    get_boss_combat_modifiers(mechanic_id) — returns modifiers for a boss
"""

from typing import Optional
from combat_modifiers import ENEMY_ARCHETYPES


# ---------------------------------------------------------------------------
# Boss Hunt Configurations — each boss has a unique identity with
# progression-based stats + combat modifiers + phase mechanics.
# ---------------------------------------------------------------------------

BOSS_HUNT_CONFIGS = [
    {
        "id": "bh_iron_titan",
        "name": "Iron Titan",
        "template_id": "ymir",
        "element": "Earth",
        "difficulty": "EXTREME",
        "archetype": "tank",
        "combat_modifiers": {
            "damage_reduction": 0.30,
            "physical_resistance": 0.25,
            "shield_pct": 25,
            "shield_regen_turns": 5,
            "cc_resistance": 0.40,
        },
        "boss_mechanic": "sealed_titan",
        "traits": ["🛡 High Damage Reduction", "🛡 Shield", "🛡 Physical Resistance"],
        "strategy": "Use magic attacks and sustained DPS. Break shields before pressing damage.",
        "vulnerability_hint": "Magic Damage",
    },
    {
        "id": "bh_vampiric_lord",
        "name": "Vampiric Lord",
        "template_id": "kali",
        "element": "Dark",
        "difficulty": "HARD",
        "archetype": "vampiric",
        "combat_modifiers": {
            "lifesteal_pct": 18,
            "regen_pct": 4,
            "debuff_resistance": 0.25,
        },
        "boss_mechanic": "tsukuyomi_dreamlord",
        "traits": ["💚 Life Steal 18%", "💚 Regeneration", "☠ Debuff Resistance"],
        "strategy": "Bring anti-heal or overwhelming burst damage. Don't let it out-sustain you.",
        "vulnerability_hint": "Anti-Heal / Burst",
    },
    {
        "id": "bh_burn_sovereign",
        "name": "Burn Sovereign",
        "template_id": "ra",
        "element": "Light",
        "difficulty": "EXTREME",
        "archetype": "burn_master",
        "combat_modifiers": {
            "status_immunity": ["burn"],
            "elemental_resistance": {"Fire": 0.45, "Light": 0.30},
            "elemental_vulnerability": {"Water": 0.25, "Dark": 0.20},
            "ailment_amplification": {"burn": 0.0},
        },
        "boss_mechanic": "abyssal_warden",
        "traits": ["🔥 Burn Immunity", "🔥 Fire Resistance", "💧 Water Vulnerability"],
        "strategy": "Use Water and Dark attacks. Avoid burn-based strategies.",
        "vulnerability_hint": "Water / Dark Damage",
    },
    {
        "id": "bh_assassin_king",
        "name": "Assassin King",
        "template_id": "shade",
        "element": "Dark",
        "difficulty": "HARD",
        "archetype": "assassin",
        "combat_modifiers": {
            "damage_amplification": 0.25,
            "crit_resistance": 0.0,
        },
        "boss_mechanic": "sealed_titan",
        "traits": ["🗡 High SPD", "🗡 Critical Chance", "🗡 High Burst"],
        "strategy": "Bring shields and sustain. Outlast the burst window.",
        "vulnerability_hint": "Shields / Sustain",
    },
    {
        "id": "bh_control_master",
        "name": "Control Master",
        "template_id": "chronos",
        "element": "Dark",
        "difficulty": "EXTREME",
        "archetype": "control",
        "combat_modifiers": {
            "cc_resistance": 0.60,
            "debuff_resistance": 0.40,
            "status_immunity": ["stun", "freeze"],
        },
        "boss_mechanic": "tsukuyomi_dreamlord",
        "traits": ["⏳ CC Resistance", "⏳ Status Immunity", "⏳ Debuff Resistance"],
        "strategy": "Don't rely on stun/freeze. Use raw damage and DoT.",
        "vulnerability_hint": "Raw Damage / DoT",
    },
    {
        "id": "bh_physical_immune_colossus",
        "name": "Mirror Colossus",
        "template_id": "leviathan",
        "element": "Water",
        "difficulty": "EXTREME",
        "archetype": "physical_immune",
        "combat_modifiers": {
            "physical_immunity": True,
            "magic_resistance": 0.15,
        },
        "boss_mechanic": "abyssal_warden",
        "traits": ["🛡 Physical Immunity", "💧 Moderate Magic Resistance"],
        "strategy": "Physical attacks deal no damage. Use magic attacks or ailments.",
        "vulnerability_hint": "Magic / Ailments",
    },
    {
        "id": "bh_magic_immune_golem",
        "name": "Null-Magic Golem",
        "template_id": "gaia",
        "element": "Earth",
        "difficulty": "EXTREME",
        "archetype": "magic_immune",
        "combat_modifiers": {
            "magic_immunity": True,
            "physical_resistance": 0.15,
        },
        "boss_mechanic": "sealed_titan",
        "traits": ["🛡 Magic Immunity", "🛡 Moderate Physical Resistance"],
        "strategy": "Magic attacks deal no damage. Use physical attackers or ailments.",
        "vulnerability_hint": "Physical / Ailments",
    },
    {
        "id": "bh_ailment_bane",
        "name": "Ailment Bane",
        "template_id": "apep",
        "element": "Dark",
        "difficulty": "NIGHTMARE",
        "archetype": "dual_immune",
        "combat_modifiers": {
            "physical_immunity": True,
            "magic_immunity": True,
            "ailment_vulnerability": {"burn": 0.30, "poison": 0.30, "bleed": 0.30, "curse_dot": 0.30},
        },
        "boss_mechanic": "tsukuyomi_dreamlord",
        "traits": ["🛡 Physical + Magic Immunity", "☠ Vulnerable to Ailments"],
        "strategy": "Immune to Physical AND Magic damage. Defeat with Burn, Poison, or Bleed.",
        "vulnerability_hint": "Burn / Poison / Bleed",
    },
    {
        "id": "bh_shield_fortress",
        "name": "Shield Fortress",
        "template_id": "osiris",
        "element": "Earth",
        "difficulty": "HARD",
        "archetype": "shielded",
        "combat_modifiers": {
            "shield_pct": 35,
            "shield_regen_turns": 4,
            "damage_reduction": 0.20,
        },
        "boss_mechanic": "sealed_titan",
        "traits": ["🛡 Large Shield", "🛡 Shield Regen", "🛡 Damage Reduction"],
        "strategy": "Bring high sustained DPS to break through shields faster than they regenerate.",
        "vulnerability_hint": "Sustained DPS",
    },
    {
        "id": "bh_regeneration_horror",
        "name": "Regeneration Horror",
        "template_id": "izanami",
        "element": "Dark",
        "difficulty": "HARD",
        "archetype": "regenerator",
        "combat_modifiers": {
            "regen_pct": 6,
            "damage_reduction": 0.12,
            "debuff_resistance": 0.20,
        },
        "boss_mechanic": "tsukuyomi_dreamlord",
        "traits": ["💚 High Regeneration", "🛡 Moderate Defense", "☠ Debuff Resistance"],
        "strategy": "Bring anti-heal or overwhelming burst. Don't let it out-sustain you.",
        "vulnerability_hint": "Anti-Heal / Burst",
    },
]


# ---------------------------------------------------------------------------
# Map boss mechanic IDs to combat modifier presets for non-Boss-Hunt bosses.
# Campaign/Tsukuyomi/Spire bosses use BOSS_MECHANICS (phases) + these
# combat modifiers for their resistances/immunities.
# ---------------------------------------------------------------------------

BOSS_COMBAT_MODIFIERS = {
    "sealed_titan": {
        "damage_reduction": 0.15,
        "shield_pct": 20,
    },
    "abyssal_warden": {
        "elemental_resistance": {"Water": 0.30},
        "debuff_resistance": 0.20,
    },
    "tsukuyomi_dreamlord": {
        "cc_resistance": 0.30,
        "status_immunity": ["stun", "freeze"],
    },
}


def get_boss_combat_modifiers(mechanic_id: str) -> dict:
    """Get combat modifiers for a boss by its mechanic ID.

    Falls back to an empty dict if no preset is defined.
    """
    return dict(BOSS_COMBAT_MODIFIERS.get(mechanic_id, {}))


def get_boss_hunt_config(boss_id: str) -> Optional[dict]:
    """Get a Boss Hunt boss configuration by ID."""
    for boss in BOSS_HUNT_CONFIGS:
        if boss["id"] == boss_id:
            return boss
    return None


def get_all_boss_hunt_configs() -> list:
    """Get all Boss Hunt boss configurations."""
    return BOSS_HUNT_CONFIGS


# ---------------------------------------------------------------------------
# Build a Boss Hunt enemy definition ready for the frontend
# ---------------------------------------------------------------------------

def build_boss_hunt_enemy(boss_config: dict, progression: dict) -> dict:
    """Build a complete Boss Hunt enemy definition.

    Combines the boss config's combat modifiers with progression-based
    stats from the enemy_progression system.
    """
    from enemy_progression import build_enemy, compute_enemy_stats
    from game_data import CATALOG_BY_ID

    template = CATALOG_BY_ID.get(boss_config["template_id"])
    if not template:
        return {}

    # Merge combat modifiers from the boss config
    combat_mods = dict(boss_config.get("combat_modifiers", {}))

    # Build the enemy with progression
    enemy = build_enemy(template, progression)

    # Attach combat modifiers
    enemy["combat_modifiers"] = combat_mods

    # Attach boss identity for UI
    enemy["boss_identity"] = {
        "name": boss_config["name"],
        "element": boss_config["element"],
        "difficulty": boss_config["difficulty"],
        "traits": boss_config["traits"],
        "strategy": boss_config["strategy"],
        "vulnerability_hint": boss_config["vulnerability_hint"],
        "archetype": boss_config["archetype"],
    }

    # Attach boss mechanic
    if boss_config.get("boss_mechanic"):
        enemy["boss_mechanic"] = boss_config["boss_mechanic"]

    return enemy
