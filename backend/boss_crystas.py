"""Boss Crysta system — signature crystals dropped by Tsukuyomi Nightmare bosses.

Each of the 25 Nightmare bosses has a unique Boss Crysta whose design is derived
from that boss's actual combat identity (element, role, kit, passives) as
defined in game_data.py's NIGHTMARE_BOSS_TEMPLATES.

Design pipeline:  Boss identity → gameplay identity → crystal identity

Combat modifiers used (all already supported by the battle engine):
  damage_reduction  — flat % reduction to all incoming damage
  lifesteal_pct     — heal % of damage dealt
  regen_pct         — heal % of max HP each turn
  shield_pct        — shield = % of max HP at battle start
  cc_resistance     — % chance to resist stun/freeze
  debuff_resistance — % chance to resist debuffs

Stat bonuses use the existing crystal stat system (flat + percent for
hp, atk, def, spd).  Each Boss Crysta has a unique main stat, fixed
substats, and a stat_mult that scales with the boss's rarity tier.
"""

# ── Rarity → stat_mult / n_subs mapping ─────────────────────────────────
_RARITY_MULT = {"R": 3.0, "SR": 3.5, "SSR": 4.0, "UR": 4.5, "LR": 5.0, "GR": 5.5, "MYTHIC": 6.0}
_RARITY_SUBS = {"R": 2, "SR": 3, "SSR": 3, "UR": 4, "LR": 4, "GR": 5, "MYTHIC": 5}


def _bc(boss_id, boss_name, template_id, element, rarity, role,
        crystal_name, description, main_stat, subs, combat_modifiers):
    """Helper to build a Boss Crysta definition."""
    return {
        "id": f"bc_{template_id}",
        "boss_id": boss_id,          # tsuku_1 .. tsuku_25
        "boss_name": boss_name,
        "template_id": template_id,
        "element": element,
        "rarity": rarity,
        "role": role,
        "name": crystal_name,
        "type": "boss_crysta",
        "source": "tsukuyomi",
        "description": description,
        "main_stat": main_stat,
        "stat_mult": _RARITY_MULT[rarity],
        "subs": subs[:_RARITY_SUBS[rarity]],
        "combat_modifiers": combat_modifiers,
    }


# ── 25 Boss Crystas — one per Nightmare boss ────────────────────────────
# Order matches the Tsukuyomi stage order (tsuku_1 .. tsuku_25).

BOSS_CRYSTAS = [
    # 1  Hollow Spawn — Dark, R, Assassin — bleed/execution, First Strike
    _bc("tsuku_1", "Hollow Spawn", "nm_hollow_spawn", "Dark", "R", "Assassin",
        "Hollow Shade Crystal",
        "A shard of the first dream, sharp as the void it was born from.",
        "atk",
        [("atk_pct", 4), ("spd", 5), ("hp_pct", 3)],
        {"lifesteal_pct": 3}),

    # 2  Ash Revenant — Fire, R, Attacker — burst, Combat Focus
    _bc("tsuku_2", "Ash Revenant", "nm_ash_revenant", "Fire", "R", "Attacker",
        "Ashen Ember Crystal",
        "Cinders of burned-away memories, still burning with forgotten fury.",
        "atk",
        [("atk_pct", 5), ("spd", 4), ("hp_pct", 3)],
        {}),

    # 3  Tide Wraith — Water, R, Mage — burn/poison DoT, Arcane Focus
    _bc("tsuku_3", "Tide Wraith", "nm_tide_wraith", "Water", "R", "Mage",
        "Drowned Soul Crystal",
        "The cold of the deep dark, pulled from a drowned dreamer's grasp.",
        "atk",
        [("atk_pct", 4), ("hp_pct", 4), ("spd", 3)],
        {}),

    # 4  Gale Phantom — Wind, SR, Control — stun/freeze, Disruption
    _bc("tsuku_4", "Gale Phantom", "nm_gale_phantom", "Wind", "SR", "Control",
        "Phantom Gale Crystal",
        "A howling wind that scatters thoughts and sharpens the mind.",
        "spd",
        [("spd_pct", 4), ("atk_pct", 4), ("hp_pct", 3)],
        {"cc_resistance": 0.08, "debuff_resistance": 0.05}),

    # 5  Stone Husk — Earth, SR, Tank — shields, Iron Resolve
    _bc("tsuku_5", "Stone Husk", "nm_stone_husk", "Earth", "SR", "Tank",
        "Petrified Husk Crystal",
        "Too heavy for the dream to dissolve, too stubborn to crack.",
        "hp",
        [("def_pct", 5), ("hp_pct", 4), ("atk_pct", 3)],
        {"damage_reduction": 0.04, "shield_pct": 8}),

    # 6  Spark Shade — Lightning, SR, Attacker — burst, Combat Focus
    _bc("tsuku_6", "Spark Shade", "nm_spark_shade", "Lightning", "SR", "Attacker",
        "Static Shade Crystal",
        "Flickering static that jolts the body into cold, electric focus.",
        "atk",
        [("atk_pct", 5), ("spd", 6), ("hp_pct", 3)],
        {}),

    # 7  Moonlit Horror — Dark, SSR, Assassin — bleed/execution, First Strike
    _bc("tsuku_7", "Moonlit Horror", "nm_moonlit_horror", "Dark", "SSR", "Assassin",
        "Moonlit Shadow Crystal",
        "The pale glow of a nonexistent moon, sharp enough to cut shadows.",
        "atk",
        [("atk_pct", 6), ("spd", 7), ("hp_pct", 4)],
        {"lifesteal_pct": 5}),

    # 8  Cinder Beast — Fire, SSR, Bruiser — bleed, Momentum
    _bc("tsuku_8", "Cinder Beast", "nm_cinder_beast", "Fire", "SSR", "Bruiser",
        "Smoldering Beast Crystal",
        "A predator's warmth, feeding on the heat of hope.",
        "hp",
        [("atk_pct", 5), ("hp_pct", 5), ("def_pct", 4)],
        {"damage_reduction": 0.03, "lifesteal_pct": 3}),

    # 9  Frost Terror — Water, SSR, Mage — burn/poison DoT, Arcane Focus
    _bc("tsuku_9", "Frost Terror", "nm_frost_terror", "Water", "SSR", "Mage",
        "Frozen Terror Crystal",
        "It freezes the blood of anyone who meets its gaze.",
        "atk",
        [("atk_pct", 6), ("hp_pct", 5), ("spd", 5)],
        {}),

    # 10 Storm Nightmare — Wind, SSR, Control — stun/freeze, Disruption
    _bc("tsuku_10", "Storm Nightmare", "nm_storm_nightmare", "Wind", "SSR", "Control",
        "Nightmare Storm Crystal",
        "A cyclone of regret that sharpens the mind against the storm.",
        "spd",
        [("spd_pct", 5), ("atk_pct", 5), ("hp_pct", 4)],
        {"cc_resistance": 0.10, "debuff_resistance": 0.08}),

    # 11 Iron Dread — Earth, UR, Tank — shields/stun, Iron Resolve
    _bc("tsuku_11", "Iron Dread", "nm_iron_dread", "Earth", "UR", "Tank",
        "Iron Dread Crystal",
        "Forged from the weight of unspoken fears, unbreakable as dread.",
        "hp",
        [("def_pct", 6), ("hp_pct", 6), ("atk_pct", 4)],
        {"damage_reduction": 0.06, "shield_pct": 12}),

    # 12 Bolt Fiend — Lightning, UR, Attacker — burst, Combat Focus
    _bc("tsuku_12", "Bolt Fiend", "nm_bolt_fiend", "Lightning", "UR", "Attacker",
        "Bolt Fiend Crystal",
        "A crackling demon's spark, faster than thought itself.",
        "atk",
        [("atk_pct", 7), ("spd", 8), ("hp_pct", 4)],
        {"lifesteal_pct": 4}),

    # 13 Shadow Sovereign — Dark, UR, Assassin — bleed/execution, First Strike
    _bc("tsuku_13", "Shadow Sovereign", "nm_shadow_sovereign", "Dark", "UR", "Assassin",
        "Shadow Sovereign Crystal",
        "The crown of the space between dreams, where nothing is real.",
        "atk",
        [("atk_pct", 7), ("spd", 7), ("hp_pct", 5)],
        {"lifesteal_pct": 6}),

    # 14 Flame Calamity — Fire, UR, Mage — burn/poison DoT, Arcane Focus
    _bc("tsuku_14", "Flame Calamity", "nm_flame_calamity", "Fire", "UR", "Mage",
        "Calamity Flame Crystal",
        "A living inferno that reduces dreams to white ash.",
        "atk",
        [("atk_pct", 7), ("hp_pct", 6), ("spd", 6)],
        {}),

    # 15 Tide Leviathan — Water, UR, Tank — shields/stun, Iron Resolve
    _bc("tsuku_15", "Tide Leviathan", "nm_tide_leviathan", "Water", "UR", "Tank",
        "Leviathan Tide Crystal",
        "The cold of the deepest trench, vast and patient as the abyss.",
        "hp",
        [("def_pct", 6), ("hp_pct", 7), ("atk_pct", 4)],
        {"damage_reduction": 0.05, "regen_pct": 2, "shield_pct": 10}),

    # 16 Gale Apocalypse — Wind, LR, Control — stun/freeze, Disruption
    _bc("tsuku_16", "Gale Apocalypse", "nm_gale_apocalypse", "Wind", "LR", "Control",
        "Apocalypse Gale Crystal",
        "The final storm that unmade the first dreamer's mind.",
        "spd",
        [("spd_pct", 6), ("atk_pct", 6), ("hp_pct", 5)],
        {"cc_resistance": 0.15, "debuff_resistance": 0.12}),

    # 17 Earth Titan — Earth, LR, Bruiser — bleed, Momentum
    _bc("tsuku_17", "Earth Titan", "nm_earth_titan", "Earth", "LR", "Bruiser",
        "Titan Earth Crystal",
        "A mountain given will, crushing and enduring in equal measure.",
        "hp",
        [("atk_pct", 6), ("hp_pct", 7), ("def_pct", 5)],
        {"damage_reduction": 0.05, "lifesteal_pct": 4}),

    # 18 Lightning God — Lightning, LR, Attacker — burst, Combat Focus
    _bc("tsuku_18", "Lightning God", "nm_lightning_god", "Lightning", "LR", "Attacker",
        "Lightning God Crystal",
        "Borrowed thunder, smiting with the force of a false deity.",
        "atk",
        [("atk_pct", 8), ("spd", 9), ("hp_pct", 5)],
        {"lifesteal_pct": 5}),

    # 19 Dark Overlord — Dark, LR, Assassin — bleed/execution, First Strike
    _bc("tsuku_19", "Dark Overlord", "nm_dark_overlord", "Dark", "LR", "Assassin",
        "Overlord Shadow Crystal",
        "The tyrant's crown, devourer of lucid minds.",
        "atk",
        [("atk_pct", 8), ("spd", 8), ("hp_pct", 6)],
        {"lifesteal_pct": 7, "cc_resistance": 0.05}),

    # 20 Solar Eclipse — Light, LR, Support — healing/shielding, Steady Hand
    _bc("tsuku_20", "Solar Eclipse", "nm_solar_eclipse", "Light", "LR", "Support",
        "Eclipse Solar Crystal",
        "A blotted sun that casts healing light into consuming shadow.",
        "hp",
        [("def_pct", 6), ("hp_pct", 7), ("atk_pct", 5)],
        {"shield_pct": 15, "regen_pct": 3}),

    # 21 Inferno Lord — Fire, GR, Mage — burn/poison DoT, ascendant
    _bc("tsuku_21", "Inferno Lord", "nm_inferno_lord", "Fire", "GR", "Mage",
        "Inferno Lord Crystal",
        "A crowned flame-king's eternal burn, reducing all to white ash.",
        "atk",
        [("atk_pct", 9), ("hp_pct", 7), ("spd", 7), ("def_pct", 5)],
        {}),

    # 22 Abyss Queen — Water, GR, Healer — healing/shielding, ascendant
    _bc("tsuku_22", "Abyss Queen", "nm_abyss_queen", "Water", "GR", "Healer",
        "Abyss Queen Crystal",
        "The cold of the deepest trench, mending with abyssal grace.",
        "hp",
        [("def_pct", 7), ("hp_pct", 8), ("atk_pct", 5), ("spd", 5)],
        {"regen_pct": 4, "shield_pct": 18, "damage_reduction": 0.03}),

    # 23 Void Emperor — Dark, GR, Control — stun/freeze, ascendant
    _bc("tsuku_23", "Void Emperor", "nm_void_emperor", "Dark", "GR", "Control",
        "Void Emperor Crystal",
        "An emptiness wearing a crown, commanding the silence between dreams.",
        "spd",
        [("spd_pct", 7), ("atk_pct", 7), ("hp_pct", 6), ("def_pct", 5)],
        {"cc_resistance": 0.20, "debuff_resistance": 0.15, "damage_reduction": 0.04}),

    # 24 Celestial Dread — Light, GR, Support — healing/shielding, ascendant
    _bc("tsuku_24", "Celestial Dread", "nm_celestial_dread", "Light", "GR", "Support",
        "Celestial Dread Crystal",
        "A fallen star that blesses nightmares with annihilating radiance.",
        "hp",
        [("def_pct", 7), ("hp_pct", 8), ("atk_pct", 5), ("spd", 5)],
        {"shield_pct": 20, "regen_pct": 4, "damage_reduction": 0.03}),

    # 25 Eternal Nightmare — Dark, MYTHIC, Assassin — ascendant, ultimate
    _bc("tsuku_25", "Eternal Nightmare", "nm_eternal_nightmare", "Dark", "MYTHIC", "Assassin",
        "Eternal Nightmare Crystal",
        "The final dream — the one from which no sleeper wakes.",
        "atk",
        [("atk_pct", 10), ("spd", 10), ("hp_pct", 7), ("def_pct", 6)],
        {"lifesteal_pct": 8, "cc_resistance": 0.08, "damage_reduction": 0.03}),
]

# ── Lookup indices ─────────────────────────────────────────────────────
BOSS_CRYSTAS_BY_ID = {bc["id"]: bc for bc in BOSS_CRYSTAS}
BOSS_CRYSTAS_BY_BOSS_ID = {bc["boss_id"]: bc for bc in BOSS_CRYSTAS}
