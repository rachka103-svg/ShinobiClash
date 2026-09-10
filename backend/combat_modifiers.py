"""Global Combat Modifiers System.

A centralized, extensible framework for damage types, resistances,
immunities, damage reduction, life steal, shields, and ailment
interactions. Designed to be consumed by ALL PvE modes (Campaign,
Tsukuyomi, Spire, Trials, Boss Hunt, future modes) — never mode-specific.

Enemy combat modifiers are attached to enemy definitions as a
`combat_modifiers` dict. The frontend mirror (combatModifiers.js) reads
the same structure and applies it during battle resolution.

Architecture:
    combat_modifiers = {
        "physical_immunity": True/False,
        "magic_immunity": True/False,
        "physical_resistance": 0.0-0.8,   # fraction of physical damage reduced
        "magic_resistance": 0.0-0.8,      # fraction of magic damage reduced
        "elemental_resistance": {"Fire": 0.3, "Water": 0.1, ...},
        "elemental_vulnerability": {"Fire": 0.2, ...},
        "damage_reduction": 0.0-0.75,     # flat reduction on ALL damage
        "physical_damage_reduction": 0.0-0.5,
        "magic_damage_reduction": 0.0-0.5,
        "lifesteal_pct": 0-30,            # % of damage dealt healed as HP
        "shield_pct": 0-50,              # starts battle with shield = pct% of max HP
        "shield_regen_turns": 0,         # re-shield every N turns (0 = no regen)
        "regen_pct": 0-10,               # heals pct% of max HP each turn
        "debuff_resistance": 0.0-0.8,     # chance to resist debuff application
        "cc_resistance": 0.0-1.0,        # chance to resist stun/freeze
        "status_immunity": ["burn", "poison", ...],  # immune to these statuses
        "status_resistance": {"burn": 0.5, ...},     # partial resistance
        "ailment_amplification": {"burn": 0.3, ...}, # takes extra ailment damage
        "ailment_resistance": {"burn": 0.3, ...},   # takes less ailment damage
        "crit_resistance": 0.0-0.5,      # reduces incoming crit chance
        "crit_damage_reduction": 0.0-0.5, # reduces crit damage multiplier
        "anti_heal": 0.0-1.0,            # reduces ALL healing received
        "damage_amplification": 0.0-0.5, # deals extra damage to all targets
        "execute_resistance": 0.0-1.0,  # resists execute-type bonus damage
    }
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Damage type classification — determines which resistance/immunity applies.
# Physical = Attacker, Assassin, Bruiser, Tank roles (melee/weapon attacks)
# Magic = Mage, Healer, Support, Control roles (elemental/mystic attacks)
# Ailments (burn, poison, bleed, curse) bypass physical/magic immunity.
# ---------------------------------------------------------------------------

PHYSICAL_ROLES = {"Attacker", "Assassin", "Bruiser", "Tank"}
MAGIC_ROLES = {"Mage", "Healer", "Support", "Control"}

# Status types that are ailments (DoT) — bypass physical/magic immunity
AILMENT_TYPES = {"burn", "poison", "bleed", "curse_dot", "shock"}

# CC types
CC_TYPES = {"stun", "freeze"}

# All debuff types (for debuff_resistance)
DEBUFF_TYPES = {"burn", "poison", "bleed", "stun", "freeze", "atk_down", "def_down", "shock", "curse_dot"}


def classify_damage_type(jutsu: dict, actor: dict) -> str:
    """Classify a jutsu's damage as 'physical', 'magic', or 'ailment'.

    Ailment damage (DoT ticks) bypasses physical/magic immunity entirely.
    """
    # DoT ticks are always ailment damage
    if jutsu.get("_is_dot_tick"):
        return "ailment"

    # If the jutsu explicitly declares a damage type, use it
    if jutsu.get("damage_type"):
        return jutsu["damage_type"]

    # Infer from the actor's role
    role = actor.get("role", "Attacker")
    if role in PHYSICAL_ROLES:
        return "physical"
    return "magic"


def get_combat_modifiers(enemy: dict) -> dict:
    """Extract combat modifiers from an enemy definition, with defaults."""
    return enemy.get("combat_modifiers") or enemy.get("combatModifiers") or {}


# ---------------------------------------------------------------------------
# Damage Type + Resistance resolution
# ---------------------------------------------------------------------------

def compute_damage_modifier(
    base_damage: float,
    damage_type: str,
    target_mods: dict,
    jutsu_element: Optional[str] = None,
) -> dict:
    """Compute the final damage after all resistance/immunity/reduction mods.

    Returns:
        {
            "damage": float,         # final damage (0 if immune)
            "immune": bool,          # target was immune to this damage type
            "resisted": bool,         # damage was partially resisted
            "reduction_pct": float,   # total reduction applied (0-1)
            "notes": [str],           # feedback notes for battle log
        }
    """
    notes = []
    reduction = 0.0
    immune = False

    # --- Immunity checks ---
    if damage_type == "physical" and target_mods.get("physical_immunity"):
        immune = True
        notes.append("IMMUNE")
        return {"damage": 0, "immune": True, "resisted": False, "reduction_pct": 1.0, "notes": notes}

    if damage_type == "magic" and target_mods.get("magic_immunity"):
        immune = True
        notes.append("IMMUNE")
        return {"damage": 0, "immune": True, "resisted": False, "reduction_pct": 1.0, "notes": notes}

    # --- Type-specific resistance ---
    if damage_type == "physical":
        phys_res = target_mods.get("physical_resistance", 0)
        phys_dr = target_mods.get("physical_damage_reduction", 0)
        reduction += phys_res + phys_dr
        if phys_res > 0:
            notes.append(f"PHYS RESIST {int(phys_res * 100)}%")

    elif damage_type == "magic":
        magic_res = target_mods.get("magic_resistance", 0)
        magic_dr = target_mods.get("magic_damage_reduction", 0)
        reduction += magic_res + magic_dr
        if magic_res > 0:
            notes.append(f"MAGIC RESIST {int(magic_res * 100)}%")

    # --- Elemental resistance / vulnerability ---
    if jutsu_element and damage_type != "ailment":
        elem_res = target_mods.get("elemental_resistance", {}).get(jutsu_element, 0)
        elem_vuln = target_mods.get("elemental_vulnerability", {}).get(jutsu_element, 0)
        reduction += elem_res
        reduction -= elem_vuln  # vulnerability increases damage
        if elem_res > 0:
            notes.append(f"{jutsu_element.upper()} RESIST")
        if elem_vuln > 0:
            notes.append(f"{jutsu_element.upper()} VULN")

    # --- Flat damage reduction (applies to ALL damage types) ---
    flat_dr = target_mods.get("damage_reduction", 0)
    reduction += flat_dr
    if flat_dr > 0:
        notes.append(f"DMG REDUCTION {int(flat_dr * 100)}%")

    # --- Shielded bonus reduction ---
    # (Shield interaction is handled separately in applyDamage, but
    # some bosses get extra reduction while shielded)
    if target_mods.get("_shielded_reduction"):
        reduction += target_mods["_shielded_reduction"]

    # --- Ailment-specific resistance/amplification ---
    if damage_type == "ailment":
        ailment_type = target_mods.get("_current_ailment_type", "")
        if ailment_type:
            ail_res = target_mods.get("ailment_resistance", {}).get(ailment_type, 0)
            ail_amp = target_mods.get("ailment_amplification", {}).get(ailment_type, 0)
            reduction += ail_res
            reduction -= ail_amp
            if ail_res > 0:
                notes.append(f"{ailment_type.upper()} RESIST")
            if ail_amp > 0:
                notes.append(f"{ailment_type.upper()} AMP")

    # --- Cap total reduction at 90% to prevent impossible encounters ---
    # (100% would make the enemy unkillable; 90% still requires strategy)
    reduction = max(0.0, min(0.90, reduction))

    final_damage = base_damage * (1.0 - reduction)

    resisted = reduction > 0 and not immune

    return {
        "damage": max(0, final_damage),
        "immune": immune,
        "resisted": resisted,
        "reduction_pct": reduction,
        "notes": notes,
    }


# ---------------------------------------------------------------------------
# Life Steal resolution
# ---------------------------------------------------------------------------

def compute_lifesteal(
    damage_dealt: float,
    attacker_mods: dict,
    is_dot: bool = False,
) -> int:
    """Compute HP recovered from life steal.

    DoT damage does NOT trigger life steal (prevents infinite healing loops).
    """
    if is_dot:
        return 0

    lifesteal_pct = attacker_mods.get("lifesteal_pct", 0)
    if lifesteal_pct <= 0:
        return 0

    heal = round(damage_dealt * lifesteal_pct / 100)
    return max(0, heal)


# ---------------------------------------------------------------------------
# Debuff/CC resistance resolution
# ---------------------------------------------------------------------------

def resist_debuff(
    effect_type: str,
    target_mods: dict,
) -> bool:
    """Returns True if the target resists a debuff/status application.

    Checks status_immunity, status_resistance, debuff_resistance, and
    cc_resistance in order.
    """
    # Status immunity — complete immunity
    status_immunity = target_mods.get("status_immunity", [])
    if effect_type in status_immunity:
        return True

    # CC resistance — applies to stun/freeze
    if effect_type in CC_TYPES:
        cc_res = target_mods.get("cc_resistance", 0)
        if cc_res > 0:
            import random
            if random.random() < cc_res:
                return True

    # Status-specific resistance
    status_res = target_mods.get("status_resistance", {})
    if effect_type in status_res:
        if random.random() < status_res[effect_type]:
            return True

    # General debuff resistance
    if effect_type in DEBUFF_TYPES:
        debuff_res = target_mods.get("debuff_resistance", 0)
        if debuff_res > 0:
            import random
            if random.random() < debuff_res:
                return True

    return False


# ---------------------------------------------------------------------------
# Crit resistance
# ---------------------------------------------------------------------------

def apply_crit_resistance(
    crit_chance: float,
    crit_multiplier: float,
    target_mods: dict,
) -> tuple:
    """Returns (adjusted_crit_chance, adjusted_crit_multiplier)."""
    crit_res = target_mods.get("crit_resistance", 0)
    crit_dr = target_mods.get("crit_damage_reduction", 0)

    adjusted_chance = max(0, crit_chance - crit_res)
    adjusted_mult = max(1.0, crit_multiplier * (1.0 - crit_dr))

    return adjusted_chance, adjusted_mult


# ---------------------------------------------------------------------------
# Enemy identity archetypes — reusable combat modifier presets.
# Each archetype gives an enemy a clear identity with strengths AND
# weaknesses, never everything at once.
# ---------------------------------------------------------------------------

ENEMY_ARCHETYPES = {
    "tank": {
        "name": "Tank",
        "modifiers": {
            "damage_reduction": 0.25,
            "physical_resistance": 0.20,
            "shield_pct": 20,
        },
        "traits": ["High DEF", "Damage Reduction", "Shield"],
        "weakness_hint": "Use magic or sustained DPS",
    },
    "vampiric": {
        "name": "Vampiric",
        "modifiers": {
            "lifesteal_pct": 15,
            "regen_pct": 3,
        },
        "traits": ["Life Steal", "Regeneration", "Moderate Defense"],
        "weakness_hint": "Bring anti-heal or burst damage",
    },
    "burn_master": {
        "name": "Burn Master",
        "modifiers": {
            "status_immunity": ["burn"],
            "ailment_amplification": {"burn": 0.0},
            "elemental_resistance": {"Fire": 0.40},
            "elemental_vulnerability": {"Water": 0.25},
        },
        "traits": ["Burn Immunity", "Fire Resistance", "Water Vulnerability"],
        "weakness_hint": "Use Water attacks",
    },
    "assassin": {
        "name": "Assassin",
        "modifiers": {
            "damage_amplification": 0.20,
        },
        "traits": ["High SPD", "Critical Chance", "High Burst"],
        "weakness_hint": "Bring shields and sustain",
    },
    "control": {
        "name": "Controller",
        "modifiers": {
            "cc_resistance": 0.50,
            "debuff_resistance": 0.30,
        },
        "traits": ["CC Resistance", "Crowd Control", "Moderate Damage"],
        "weakness_hint": "Don't rely on stun/freeze",
    },
    "physical_immune": {
        "name": "Physical Immune",
        "modifiers": {
            "physical_immunity": True,
        },
        "traits": ["Immune to Physical Damage"],
        "weakness_hint": "Use magic attacks or ailments",
    },
    "magic_immune": {
        "name": "Magic Immune",
        "modifiers": {
            "magic_immunity": True,
        },
        "traits": ["Immune to Magic Damage"],
        "weakness_hint": "Use physical attacks or ailments",
    },
    "dual_immune": {
        "name": "Ailment Vulnerable",
        "modifiers": {
            "physical_immunity": True,
            "magic_immunity": True,
            "ailment_vulnerability": {"burn": 0.30, "poison": 0.30, "bleed": 0.30},
        },
        "traits": ["Immune to Physical + Magic", "Vulnerable to Ailments"],
        "weakness_hint": "Use Burn / Poison / Bleed",
    },
    "shielded": {
        "name": "Shielded",
        "modifiers": {
            "shield_pct": 30,
            "shield_regen_turns": 5,
            "damage_reduction": 0.15,
        },
        "traits": ["Large Shield", "Shield Regen", "Damage Reduction"],
        "weakness_hint": "Bring high sustained DPS",
    },
    "regenerator": {
        "name": "Regenerator",
        "modifiers": {
            "regen_pct": 5,
            "damage_reduction": 0.10,
        },
        "traits": ["High Regeneration", "Moderate Defense"],
        "weakness_hint": "Bring anti-heal or burst",
    },
    "executioner": {
        "name": "Executioner",
        "modifiers": {
            "damage_amplification": 0.15,
            "crit_resistance": 0.0,
        },
        "traits": ["High Damage", "Execute Threshold"],
        "weakness_hint": "Keep HP above threshold",
    },
}


def get_archetype(archetype_id: str) -> dict:
    """Get a combat modifier preset by archetype ID."""
    return ENEMY_ARCHETYPES.get(archetype_id, {})


def get_archetype_modifiers(archetype_id: str) -> dict:
    """Get just the modifiers dict for an archetype."""
    arch = ENEMY_ARCHETYPES.get(archetype_id, {})
    return arch.get("modifiers", {})


# ---------------------------------------------------------------------------
# Progression-based modifier assignment — assigns combat modifiers to
# enemies based on their progression score and tier (normal/elite/boss).
# Normal enemies get minimal modifiers; bosses get sophisticated builds.
# ---------------------------------------------------------------------------

import random as _rng


def assign_combat_modifiers(
    progression: dict,
    template: dict,
    is_boss: bool = False,
    is_elite: bool = False,
    archetype_override: Optional[str] = None,
    seed: int = 0,
) -> dict:
    """Assign combat modifiers to an enemy based on progression and tier.

    Normal enemies: 0-1 simple modifiers
    Elite enemies: 1-2 modifiers
    Boss enemies: 2-4 modifiers with a clear archetype identity

    Returns a combat_modifiers dict (possibly empty for normal enemies).
    """
    score = progression.get("score", 0)
    rng = _rng.Random(seed or hash((template.get("id", ""), score, is_boss)))

    # Normal enemies below score 0.15 get NO modifiers — keep them simple
    if not is_boss and not is_elite and score < 0.15:
        return {}

    # If an explicit archetype is specified, use it
    if archetype_override and archetype_override in ENEMY_ARCHETYPES:
        mods = dict(ENEMY_ARCHETYPES[archetype_override]["modifiers"])
        # Scale some modifiers slightly with progression
        if "damage_reduction" in mods and score > 0.5:
            mods["damage_reduction"] = min(0.50, mods["damage_reduction"] + 0.05)
        return mods

    # --- Boss assignment: pick a clear archetype identity ---
    if is_boss:
        # Bosses always get a meaningful archetype
        boss_archetypes = [
            "tank", "vampiric", "burn_master", "assassin", "control",
            "shielded", "regenerator", "executioner",
        ]
        # Higher progression: add physical/magic immune bosses
        if score > 0.30:
            boss_archetypes.extend(["physical_immune", "magic_immune"])
        if score > 0.55:
            boss_archetypes.append("dual_immune")

        archetype_id = rng.choice(boss_archetypes)
        mods = dict(ENEMY_ARCHETYPES[archetype_id]["modifiers"])

        # Scale modifiers slightly with progression for late-game bosses
        if score > 0.5:
            if "damage_reduction" in mods:
                mods["damage_reduction"] = min(0.50, mods["damage_reduction"] + 0.05)
            if "lifesteal_pct" in mods:
                mods["lifesteal_pct"] = min(25, mods["lifesteal_pct"] + 3)
            if "shield_pct" in mods:
                mods["shield_pct"] = min(40, mods["shield_pct"] + 5)

        return mods

    # --- Elite assignment: 1-2 simple modifiers ---
    if is_elite or score > 0.25:
        elite_mods = {}
        if rng.random() < 0.4:
            elite_mods["damage_reduction"] = round(rng.uniform(0.10, 0.20), 2)
        if rng.random() < 0.3:
            elite_mods["lifesteal_pct"] = rng.randint(5, 10)
        if rng.random() < 0.2:
            elite_mods["shield_pct"] = rng.randint(10, 20)
        if rng.random() < 0.15:
            elite_mods["regen_pct"] = rng.randint(2, 4)
        return elite_mods

    # --- Normal enemies: very occasional simple modifier ---
    if rng.random() < 0.10:
        return {"damage_reduction": 0.08}

    return {}


# ---------------------------------------------------------------------------
# Public summary for UI display
# ---------------------------------------------------------------------------

def combat_modifiers_summary(mods: dict) -> dict:
    """Convert raw combat modifiers into a UI-friendly summary.

    Returns:
        {
            "traits": [str],         # readable trait list
            "immunities": [str],     # immunity descriptions
            "resistances": [str],    # resistance descriptions
            "vulnerabilities": [str], # vulnerability descriptions
            "strategy_hint": str,    # recommended strategy
        }
    """
    traits = []
    immunities = []
    resistances = []
    vulnerabilities = []
    strategy_parts = []

    if mods.get("physical_immunity"):
        immunities.append("Physical Immunity")
        strategy_parts.append("Use magic or ailments")
    if mods.get("magic_immunity"):
        immunities.append("Magic Immunity")
        strategy_parts.append("Use physical or ailments")
    if mods.get("physical_immunity") and mods.get("magic_immunity"):
        strategy_parts = ["Use Burn / Poison / Bleed ailments"]

    if mods.get("damage_reduction", 0) > 0:
        traits.append(f"Damage Reduction {int(mods['damage_reduction'] * 100)}%")
    if mods.get("physical_resistance", 0) > 0:
        resistances.append(f"Physical Resistance {int(mods['physical_resistance'] * 100)}%")
    if mods.get("magic_resistance", 0) > 0:
        resistances.append(f"Magic Resistance {int(mods['magic_resistance'] * 100)}%")

    for elem, val in mods.get("elemental_resistance", {}).items():
        if val > 0:
            resistances.append(f"{elem} Resistance")
    for elem, val in mods.get("elemental_vulnerability", {}).items():
        if val > 0:
            vulnerabilities.append(f"{elem} Vulnerability")

    if mods.get("lifesteal_pct", 0) > 0:
        traits.append(f"Life Steal {mods['lifesteal_pct']}%")
        strategy_parts.append("Bring anti-heal")
    if mods.get("regen_pct", 0) > 0:
        traits.append(f"Regeneration {mods['regen_pct']}%/turn")
        strategy_parts.append("Bring anti-heal or burst")
    if mods.get("shield_pct", 0) > 0:
        traits.append(f"Shield {mods['shield_pct']}% Max HP")
        strategy_parts.append("Bring sustained DPS")
    if mods.get("shield_regen_turns", 0) > 0:
        traits.append(f"Shield Regen every {mods['shield_regen_turns']} turns")
    if mods.get("cc_resistance", 0) > 0:
        traits.append(f"CC Resistance {int(mods['cc_resistance'] * 100)}%")
        strategy_parts.append("Don't rely on CC")
    if mods.get("debuff_resistance", 0) > 0:
        traits.append(f"Debuff Resistance {int(mods['debuff_resistance'] * 100)}%")
    if mods.get("damage_amplification", 0) > 0:
        traits.append(f"Damage Amplification {int(mods['damage_amplification'] * 100)}%")

    for status in mods.get("status_immunity", []):
        immunities.append(f"{status.title()} Immunity")

    for ail, val in mods.get("ailment_amplification", {}).items():
        if val > 0:
            vulnerabilities.append(f"{ail.title()} Amplification")
    for ail, val in mods.get("ailment_resistance", {}).items():
        if val > 0:
            resistances.append(f"{ail.title()} Resistance")

    if mods.get("crit_resistance", 0) > 0:
        traits.append(f"Crit Resistance {int(mods['crit_resistance'] * 100)}%")
    if mods.get("anti_heal", 0) > 0:
        traits.append(f"Anti-Heal {int(mods['anti_heal'] * 100)}%")

    strategy = " · ".join(dict.fromkeys(strategy_parts)) if strategy_parts else ""

    return {
        "traits": traits,
        "immunities": immunities,
        "resistances": resistances,
        "vulnerabilities": vulnerabilities,
        "strategy_hint": strategy,
    }
