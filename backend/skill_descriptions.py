"""Auto-generates structured skill descriptions from skill data.

Every description follows the format:
  1. Damage percentage (for offensive skills)
  2. Physical or Magic damage
  3. Number/type of targets
  4. Additional effects
  5. Chance of those effects
  6. Duration where applicable

Target counts are derived from the skill's `type` field, which the battle
engine uses for targeting — so descriptions always match actual behavior.
"""

# Roles that deal Magic damage; all others deal Physical.
_MAGIC_ROLES = frozenset({"Mage", "Healer", "Support"})


def _damage_type(role):
    return "Magic" if role in _MAGIC_ROLES else "Physical"


def _target_label(skill_type):
    """Return the target phrase derived from the skill type."""
    return {
        "attack": "1 enemy",
        "aoe": "all enemies",
        "heal": "1 ally",
        "aoe_heal": "all allies",
        "shield": "1 ally",
        "revive": "1 fallen ally",
        "cleanse": "1 ally",
    }.get(skill_type, "")


def _turns(duration):
    """Pluralize 'turn' / 'turns'."""
    return f"{duration} turn" if duration == 1 else f"{duration} turns"


# Effect-type → human-readable fragment builder.
# Each builder receives the effect dict and returns a string fragment
# (without leading "and").  Returns None if the effect should be omitted
# from the description (e.g. taunt on taunt skills, revive_ally on revive).


def _eff_burn(eff):
    return f"Burn for {_turns(eff.get('duration', 2))}"


def _eff_poison(eff):
    return f"Poison for {_turns(eff.get('duration', 2))}"


def _eff_bleed(eff):
    return f"Bleed for {_turns(eff.get('duration', 2))}"


def _eff_stun(eff):
    return f"Stun for {_turns(eff.get('duration', 1))}"


def _eff_freeze(eff):
    return f"Freeze for {_turns(eff.get('duration', 1))}"


def _eff_atk_down(eff):
    v = eff.get("value", 0)
    return f"reduce ATK by {v}% for {_turns(eff.get('duration', 2))}"


def _eff_def_down(eff):
    v = eff.get("value", 0)
    return f"reduce DEF by {v}% for {_turns(eff.get('duration', 2))}"


def _eff_shock(eff):
    return f"Shock for {_turns(eff.get('duration', 2))}"


def _eff_dispel(eff):
    return "dispel buffs"


def _eff_extra_turn(eff):
    return "act again"


def _eff_cleanse(eff):
    return "cleanse debuffs"


def _eff_immunity(eff):
    return f"Immunity for {_turns(eff.get('duration', 1))}"


def _eff_regen(eff):
    return f"Regeneration for {_turns(eff.get('duration', 2))}"


def _eff_evade(eff):
    v = eff.get("value", 0)
    return f"{v}% Evade for {_turns(eff.get('duration', 1))}"


def _eff_damage_reflect(eff):
    v = eff.get("value", 0)
    return f"{v}% Damage Reflect for {_turns(eff.get('duration', 2))}"


def _eff_spd_up(eff):
    v = eff.get("value", 0)
    return f"+{v}% SPD for {_turns(eff.get('duration', 2))}"


def _eff_def_up(eff):
    v = eff.get("value", 0)
    return f"+{v}% DEF for {_turns(eff.get('duration', 2))}"


def _eff_atk_up(eff):
    v = eff.get("value", 0)
    return f"+{v}% ATK for {_turns(eff.get('duration', 2))}"


def _eff_team_atk_up(eff):
    v = eff.get("value", 0)
    return f"boosts team ATK by {v}% for {_turns(eff.get('duration', 2))}"


def _eff_team_def_up(eff):
    v = eff.get("value", 0)
    return f"boosts team DEF by {v}% for {_turns(eff.get('duration', 2))}"


def _eff_taunt(eff):
    return None  # handled in taunt skill description


def _eff_revive_ally(eff):
    return None  # handled in revive skill description


_EFFECT_BUILDERS = {
    "burn": _eff_burn,
    "poison": _eff_poison,
    "bleed": _eff_bleed,
    "stun": _eff_stun,
    "freeze": _eff_freeze,
    "atk_down": _eff_atk_down,
    "def_down": _eff_def_down,
    "shock": _eff_shock,
    "dispel": _eff_dispel,
    "extra_turn": _eff_extra_turn,
    "cleanse": _eff_cleanse,
    "immunity": _eff_immunity,
    "regen": _eff_regen,
    "evade": _eff_evade,
    "damage_reflect": _eff_damage_reflect,
    "spd_up": _eff_spd_up,
    "def_up": _eff_def_up,
    "atk_up": _eff_atk_up,
    "team_atk_up": _eff_team_atk_up,
    "team_def_up": _eff_team_def_up,
    "taunt": _eff_taunt,
    "revive_ally": _eff_revive_ally,
}

# Effects that are applied to the enemy target on offensive skills.
_ENEMY_EFFECTS = frozenset({
    "burn", "poison", "bleed", "stun", "freeze",
    "atk_down", "def_down", "shock", "dispel",
})

# Effects that are applied to self/actor on offensive skills.
_SELF_EFFECTS = frozenset({
    "spd_up", "def_up", "atk_up", "evade", "damage_reflect",
    "regen", "immunity", "cleanse", "extra_turn",
})

# Effects that are team-wide.
_TEAM_EFFECTS = frozenset({"team_atk_up", "team_def_up"})


def _build_effect_fragment(eff):
    """Build a single effect fragment, or None if it should be skipped."""
    builder = _EFFECT_BUILDERS.get(eff.get("type"))
    if builder is None:
        return None
    return builder(eff)


def _chance_prefix(eff):
    """Return 'has a X% chance to ' if chance < 100, else ''."""
    chance = eff.get("chance", 100)
    if chance < 100:
        return f"has a {chance}% chance to "
    return ""


def generate_description(skill, role):
    """Generate a structured description for a skill based on its data.

    The description accurately reflects the skill's targeting behavior
    (derived from `skill["type"]`) and its effects (from `skill["effects"]`).
    """
    st = skill.get("type", "")
    power = skill.get("power", 0)
    effects = skill.get("effects", [])
    dt = _damage_type(role)

    # ---- Offensive skills (attack, aoe) ----
    if st in ("attack", "aoe"):
        target = _target_label(st)
        desc = f"Deals {power}% {dt} Damage to {target}"

        enemy_parts = []
        self_parts = []
        team_parts = []

        for eff in effects:
            et = eff.get("type")
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue

            prefix = _chance_prefix(eff)

            if et in _ENEMY_EFFECTS:
                enemy_parts.append(f"{prefix}{frag}")
            elif et in _TEAM_EFFECTS:
                team_parts.append(frag)
            elif et in _SELF_EFFECTS:
                if et == "extra_turn":
                    self_parts.append(f"{prefix}{frag}")
                else:
                    self_parts.append(f"grants self {frag}")
            else:
                enemy_parts.append(f"{prefix}{frag}")

        all_parts = enemy_parts + self_parts + team_parts
        if all_parts:
            desc += " and " + " and ".join(all_parts)
        desc += "."
        return desc

    # ---- Heal skills (heal, aoe_heal) ----
    if st in ("heal", "aoe_heal"):
        target = _target_label(st)
        desc = f"Heals {target}"

        ally_parts = []
        enemy_parts = []
        for eff in effects:
            et = eff.get("type")
            if et in ("revive_ally", "taunt"):
                continue
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue
            prefix = _chance_prefix(eff)
            if et in _ENEMY_EFFECTS:
                # Insert "1 enemy" before " for " in the fragment
                # e.g. "Freeze for 1 turn" → "Freeze 1 enemy for 1 turn"
                if " for " in frag:
                    enemy_parts.append(f"{prefix}{frag.replace(' for ', ' 1 enemy for ', 1)}")
                else:
                    enemy_parts.append(f"{prefix}{frag} 1 enemy")
            else:
                if et in ("regen", "immunity", "evade", "damage_reflect"):
                    ally_parts.append(f"{prefix}grants {frag}")
                elif et == "cleanse":
                    ally_parts.append(f"{prefix}cleanses debuffs")
                else:
                    ally_parts.append(f"{prefix}{frag}")

        all_parts = ally_parts + enemy_parts
        if all_parts:
            desc += " and " + " and ".join(all_parts)
        desc += "."
        return desc

    # ---- Shield skills ----
    if st == "shield":
        desc = "Shields 1 ally"

        ally_parts = []
        for eff in effects:
            et = eff.get("type")
            if et in ("revive_ally", "taunt"):
                continue
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue
            prefix = _chance_prefix(eff)
            if et in ("regen", "immunity", "evade", "damage_reflect"):
                ally_parts.append(f"{prefix}grants {frag}")
            elif et == "cleanse":
                ally_parts.append(f"{prefix}cleanses debuffs")
            else:
                ally_parts.append(f"{prefix}{frag}")

        if ally_parts:
            desc += " and " + " and ".join(ally_parts)
        desc += "."
        return desc

    # ---- Taunt skills ----
    if st == "taunt":
        desc = "Taunts all enemies"

        self_parts = []
        enemy_parts = []
        for eff in effects:
            et = eff.get("type")
            if et == "taunt":
                continue
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue
            prefix = _chance_prefix(eff)

            if et in _ENEMY_EFFECTS and et not in ("atk_down", "def_down", "shock", "dispel"):
                # CC effects (stun, freeze) target a random enemy
                if " for " in frag:
                    enemy_parts.append(f"{prefix}{frag.replace(' for ', ' 1 enemy for ', 1)}")
                else:
                    enemy_parts.append(f"{prefix}{frag} 1 enemy")
            elif et in ("atk_down", "def_down", "shock", "dispel"):
                enemy_parts.append(f"{prefix}{frag}")
            else:
                self_parts.append(f"gains {frag}")

        all_parts = self_parts + enemy_parts
        if all_parts:
            desc += " and " + " and ".join(all_parts)
        desc += "."
        return desc

    # ---- Revive skills ----
    if st == "revive":
        revive_eff = next((e for e in effects if e.get("type") == "revive_ally"), None)
        hp_pct = revive_eff.get("hp_pct", 30) if revive_eff else 30
        desc = f"Revives 1 fallen ally with {hp_pct}% HP"

        ally_parts = []
        for eff in effects:
            et = eff.get("type")
            if et in ("revive_ally", "taunt"):
                continue
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue
            if et in ("regen", "immunity", "evade", "damage_reflect"):
                ally_parts.append(f"grants {frag}")
            elif et == "cleanse":
                ally_parts.append("cleanses debuffs")
            else:
                ally_parts.append(frag)

        if ally_parts:
            desc += " and " + " and ".join(ally_parts)
        desc += "."
        return desc

    # ---- Team buff skills ----
    if st == "team_buff":
        desc = "Grants buffs to all allies"

        buff_parts = []
        for eff in effects:
            et = eff.get("type")
            if et == "taunt":
                continue
            frag = _build_effect_fragment(eff)
            if frag is None:
                continue
            buff_parts.append(frag)

        if buff_parts:
            desc += " (" + ", ".join(buff_parts) + ")"
        desc += "."
        return desc

    # ---- Cleanse skills ----
    if st == "cleanse":
        return "Cleanses debuffs from 1 ally."

    # ---- Fallback: keep existing description ----
    return skill.get("description", "")


def apply_descriptions(kit, role):
    """Overwrite the description of every skill in a kit with auto-generated ones."""
    for skill in kit.get("skills", []):
        skill["description"] = generate_description(skill, role)
    return kit
