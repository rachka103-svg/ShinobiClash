"""Boss Hunt Configuration System — Dark Shrine Endgame Mode.

Three recurring legendary bosses, each at a different rarity tier with
extreme levels and escalating damage. Boss Hunt is the most challenging
mode in the game.

Tiers:
    UR  — Level 250
    LR  — Level 350
    GR  — Level 500

Escalation: Every 10 rounds, boss damage increases by 10% (compounding).
This is applied dynamically in the battle engine via the `escalating_damage`
flag on the enemy definition.

Architecture:
    BOSS_HUNT_CONFIGS — exactly 3 boss definitions
    BOSS_COMBAT_MODIFIERS — combat modifier presets per boss mechanic
    get_boss_combat_modifiers(mechanic_id) — returns modifiers for a boss
"""

from typing import Optional
from combat_modifiers import ENEMY_ARCHETYPES


# ---------------------------------------------------------------------------
# Boss Hunt Configurations — 3 bosses, one per rarity tier.
# Each has a unique identity, combat modifiers, and escalation.
# ---------------------------------------------------------------------------

BOSS_HUNT_CONFIGS = [
    {
        "id": "bh_shadow_trickster",
        "name": "Shadow Trickster",
        "title": "The Deceiver",
        "template_id": "loki",
        "element": "Dark",
        "rarity": "UR",
        "level": 250,
        "difficulty": "EXTREME",
        "archetype": "assassin",
        "combat_modifiers": {
            "damage_amplification": 0.25,
            "crit_resistance": 0.0,
            "debuff_resistance": 0.30,
            "cc_resistance": 0.35,
        },
        "boss_mechanic": "sealed_titan",
        "escalating_damage": True,
        "traits": [
            "🗡 High Speed",
            "🗡 Critical Strikes",
            "🗡 Debuff Resistance",
            "🗡 CC Resistance",
        ],
        "strategy": "Loki strikes fast and hard. Bring shields and sustain to outlast his burst windows. CC is unreliable.",
        "vulnerability_hint": "Shields / Sustain",
        "rewards": {
            "ryo": 1200,
            "gems": 40,
            "exp": 500,
            "boss_card_drop_rate": 2.0,
            "crystal_drop_rate": 1.5,
            "essence": "shadow_essence",
            "items": ["boss_crystal", "event_gear", "essence", "boss_card"],
        },
    },
    {
        "id": "bh_burn_sovereign",
        "name": "Burn Sovereign",
        "title": "The Sun Devourer",
        "template_id": "ra",
        "element": "Light",
        "rarity": "LR",
        "level": 350,
        "difficulty": "NIGHTMARE",
        "archetype": "burn_master",
        "combat_modifiers": {
            "status_immunity": ["burn"],
            "elemental_resistance": {"Fire": 0.45, "Light": 0.30},
            "elemental_vulnerability": {"Water": 0.25, "Dark": 0.20},
            "damage_amplification": 0.15,
            "regen_pct": 3,
        },
        "boss_mechanic": "abyssal_warden",
        "escalating_damage": True,
        "traits": [
            "🔥 Burn Immunity",
            "🔥 Fire Resistance",
            "💚 Regeneration 3%/turn",
            "💧 Water Vulnerability",
        ],
        "strategy": "Ra burns all who oppose him. Use Water and Dark attacks. Avoid burn-based strategies entirely.",
        "vulnerability_hint": "Water / Dark Damage",
        "rewards": {
            "ryo": 2400,
            "gems": 75,
            "exp": 1000,
            "boss_card_drop_rate": 1.0,
            "crystal_drop_rate": 0.8,
            "essence": "solar_essence",
            "items": ["boss_crystal", "event_gear", "essence", "boss_card"],
        },
    },
    {
        "id": "bh_chaos_serpent",
        "name": "Chaos Serpent",
        "title": "The Devourer",
        "template_id": "apep",
        "element": "Dark",
        "rarity": "GR",
        "level": 500,
        "difficulty": "NIGHTMARE",
        "archetype": "dual_immune",
        "combat_modifiers": {
            "physical_immunity": True,
            "magic_immunity": True,
            "ailment_vulnerability": {"burn": 0.30, "poison": 0.30, "bleed": 0.30, "curse_dot": 0.30},
            "damage_reduction": 0.10,
            "regen_pct": 5,
        },
        "boss_mechanic": "tsukuyomi_dreamlord",
        "escalating_damage": True,
        "traits": [
            "🛡 Physical Immunity",
            "🛡 Magic Immunity",
            "☠ Vulnerable to Ailments",
            "💚 Regeneration 5%/turn",
            "🛡 Damage Reduction",
        ],
        "strategy": "Apep is immune to all physical and magic damage. Defeat him with Burn, Poison, Bleed, or Curse. The ultimate challenge.",
        "vulnerability_hint": "Burn / Poison / Bleed / Curse",
        "rewards": {
            "ryo": 5000,
            "gems": 150,
            "exp": 2500,
            "boss_card_drop_rate": 0.5,
            "crystal_drop_rate": 0.4,
            "essence": "chaos_essence",
            "items": ["boss_crystal", "event_gear", "essence", "boss_card"],
        },
    },
]


# ---------------------------------------------------------------------------
# Map boss mechanic IDs to combat modifier presets for non-Boss-Hunt bosses.
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
    """Get combat modifiers for a boss by its mechanic ID."""
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
    """Build a complete Boss Hunt enemy definition."""
    from enemy_progression import build_enemy, compute_enemy_stats
    from game_data import CATALOG_BY_ID

    template = CATALOG_BY_ID.get(boss_config["template_id"])
    if not template:
        return {}

    combat_mods = dict(boss_config.get("combat_modifiers", {}))

    enemy = build_enemy(template, progression)

    enemy["combat_modifiers"] = combat_mods
    enemy["escalating_damage"] = boss_config.get("escalating_damage", False)

    enemy["boss_identity"] = {
        "name": boss_config["name"],
        "title": boss_config.get("title", ""),
        "element": boss_config["element"],
        "rarity": boss_config.get("rarity", ""),
        "level": boss_config.get("level", 60),
        "difficulty": boss_config["difficulty"],
        "traits": boss_config["traits"],
        "strategy": boss_config["strategy"],
        "vulnerability_hint": boss_config["vulnerability_hint"],
        "archetype": boss_config["archetype"],
        "rewards": boss_config.get("rewards", {}),
    }

    if boss_config.get("boss_mechanic"):
        enemy["boss_mechanic"] = boss_config["boss_mechanic"]

    return enemy
