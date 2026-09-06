"""Boss Crysta system — signature crystals dropped by Tsukuyomi Nightmare bosses.

Design philosophy (Iruna/Toram-inspired):
  The boss is the SOURCE of the crystal, not a template for its effects.
  Each crystal's effects are intentionally varied and unpredictable —
  a tank boss might drop a lifesteal crystal, an assassin boss might
  drop a magic-resistance crystal.  The boss provides identity and
  rarity; the crystal provides the surprise.

All effects use existing game mechanics only:
  - Crystal stat bonuses (hp, atk, def, spd — flat + pct)
  - Combat modifiers already handled by the battle engine:
      damage_reduction, lifesteal_pct, regen_pct, shield_pct,
      cc_resistance, debuff_resistance,
      physical_resistance, magic_resistance,
      physical_damage_reduction, magic_damage_reduction,
      crit_resistance, crit_damage_reduction,
      elemental_resistance {Element: pct}, elemental_vulnerability {Element: pct},
      ailment_resistance {ailment: pct}, ailment_amplification {ailment: pct},
      status_resistance {status: pct}

Rarity still controls power level (stat_mult + number of substats).
"""

# ── Rarity → stat_mult / n_subs mapping ─────────────────────────────────
_RARITY_MULT = {"R": 3.0, "SR": 3.5, "SSR": 4.0, "UR": 4.5, "LR": 5.0, "GR": 5.5, "MYTHIC": 6.0}
_RARITY_SUBS = {"R": 2, "SR": 3, "SSR": 3, "UR": 4, "LR": 4, "GR": 5, "MYTHIC": 5}


def _bc(boss_id, boss_name, template_id, element, rarity,
        crystal_name, description, main_stat, subs, combat_modifiers,
        source="tsukuyomi"):
    """Helper to build a Boss Crysta definition."""
    return {
        "id": f"bc_{template_id}",
        "boss_id": boss_id,
        "boss_name": boss_name,
        "template_id": template_id,
        "element": element,
        "rarity": rarity,
        "name": crystal_name,
        "type": "boss_crysta",
        "source": source,
        "description": description,
        "main_stat": main_stat,
        "stat_mult": _RARITY_MULT[rarity],
        "subs": subs[:_RARITY_SUBS[rarity]],
        "combat_modifiers": combat_modifiers,
    }


# ── 25 Boss Crystas — effects intentionally NOT tied to boss class/role ──
# Each crystal has a unique combination drawn from a broad pool of
# legitimate game mechanics.  No two crystals share the same effect set.

BOSS_CRYSTAS = [
    # 1  Hollow Spawn — HP + Crit Resistance  (anti-crit, not offense)
    _bc("tsuku_1", "Hollow Spawn", "nm_hollow_spawn", "Dark", "R",
        "Hollow Shade Crystal",
        "A shard of the first dream, sharp as the void it was born from.",
        "hp",
        [("def_pct", 4), ("spd", 5)],
        {"crit_resistance": 0.08}),

    # 2  Ash Revenant — ATK + Physical Damage Reduction  (offense + phys def)
    _bc("tsuku_2", "Ash Revenant", "nm_ash_revenant", "Fire", "R",
        "Ashen Ember Crystal",
        "Cinders of burned-away memories, still burning with forgotten fury.",
        "atk",
        [("hp_pct", 4), ("spd", 4)],
        {"physical_damage_reduction": 0.06}),

    # 3  Tide Wraith — SPD + Burn Ailment Resistance  (speed + DoT defense)
    _bc("tsuku_3", "Tide Wraith", "nm_tide_wraith", "Water", "R",
        "Drowned Soul Crystal",
        "The cold of the deep dark, pulled from a drowned dreamer's grasp.",
        "spd",
        [("atk_pct", 4), ("hp_pct", 3)],
        {"ailment_resistance": {"burn": 0.15}}),

    # 4  Gale Phantom — DEF + Lifesteal  (defense + sustain, not CC)
    _bc("tsuku_4", "Gale Phantom", "nm_gale_phantom", "Wind", "SR",
        "Phantom Gale Crystal",
        "A howling wind that scatters thoughts and sharpens the mind.",
        "def",
        [("hp_pct", 4), ("atk_pct", 4)],
        {"lifesteal_pct": 4}),

    # 5  Stone Husk — HP + Crit Damage Reduction  (anti-crit-damage)
    _bc("tsuku_5", "Stone Husk", "nm_stone_husk", "Earth", "SR",
        "Petrified Husk Crystal",
        "Too heavy for the dream to dissolve, too stubborn to crack.",
        "hp",
        [("def_pct", 5), ("spd", 4)],
        {"crit_damage_reduction": 0.10}),

    # 6  Spark Shade — SPD + Magic Resistance  (speed + magic def)
    _bc("tsuku_6", "Spark Shade", "nm_spark_shade", "Lightning", "SR",
        "Static Shade Crystal",
        "Flickering static that jolts the body into cold, electric focus.",
        "spd",
        [("atk_pct", 5), ("hp_pct", 4)],
        {"magic_resistance": 0.08}),

    # 7  Moonlit Horror — ATK + Debuff Resistance  (offense + debuff immune)
    _bc("tsuku_7", "Moonlit Horror", "nm_moonlit_horror", "Dark", "SSR",
        "Moonlit Shadow Crystal",
        "The pale glow of a nonexistent moon, sharp enough to cut shadows.",
        "atk",
        [("spd", 7), ("hp_pct", 5)],
        {"debuff_resistance": 0.12}),

    # 8  Cinder Beast — HP + Wind Elemental Resistance  (unexpected for a Fire boss)
    _bc("tsuku_8", "Cinder Beast", "nm_cinder_beast", "Fire", "SSR",
        "Smoldering Beast Crystal",
        "A predator's warmth, feeding on the heat of hope.",
        "hp",
        [("atk_pct", 6), ("def_pct", 5)],
        {"elemental_resistance": {"Wind": 0.10}}),

    # 9  Frost Terror — ATK + Shock Ailment Resistance  (offense + ailment def)
    _bc("tsuku_9", "Frost Terror", "nm_frost_terror", "Water", "SSR",
        "Frozen Terror Crystal",
        "It freezes the blood of anyone who meets its gaze.",
        "atk",
        [("hp_pct", 5), ("spd", 6)],
        {"ailment_resistance": {"shock": 0.15}}),

    # 10 Storm Nightmare — SPD + CC Resistance  (speed + CC immune)
    _bc("tsuku_10", "Storm Nightmare", "nm_storm_nightmare", "Wind", "SSR",
        "Nightmare Storm Crystal",
        "A cyclone of regret that sharpens the mind against the storm.",
        "spd",
        [("atk_pct", 5), ("hp_pct", 5)],
        {"cc_resistance": 0.12}),

    # 11 Iron Dread — DEF + Shield  (defense + barrier)
    _bc("tsuku_11", "Iron Dread", "nm_iron_dread", "Earth", "UR",
        "Iron Dread Crystal",
        "Forged from the weight of unspoken fears, unbreakable as dread.",
        "def",
        [("hp_pct", 6), ("atk_pct", 5), ("spd", 6)],
        {"shield_pct": 12}),

    # 12 Bolt Fiend — ATK + Crit Resistance  (offense + anti-crit)
    _bc("tsuku_12", "Bolt Fiend", "nm_bolt_fiend", "Lightning", "UR",
        "Bolt Fiend Crystal",
        "A crackling demon's spark, faster than thought itself.",
        "atk",
        [("spd", 8), ("hp_pct", 5), ("def_pct", 5)],
        {"crit_resistance": 0.10}),

    # 13 Shadow Sovereign — HP + Curse DoT Ailment Resistance  (unexpected for an Assassin)
    _bc("tsuku_13", "Shadow Sovereign", "nm_shadow_sovereign", "Dark", "UR",
        "Shadow Sovereign Crystal",
        "The crown of the space between dreams, where nothing is real.",
        "hp",
        [("atk_pct", 6), ("def_pct", 6), ("spd", 6)],
        {"ailment_resistance": {"curse_dot": 0.15}}),

    # 14 Flame Calamity — ATK + Damage Reduction  (offense + flat def)
    _bc("tsuku_14", "Flame Calamity", "nm_flame_calamity", "Fire", "UR",
        "Calamity Flame Crystal",
        "A living inferno that reduces dreams to white ash.",
        "atk",
        [("hp_pct", 6), ("spd", 7), ("def_pct", 5)],
        {"damage_reduction": 0.04}),

    # 15 Tide Leviathan — DEF + Regen  (defense + healing)
    _bc("tsuku_15", "Tide Leviathan", "nm_tide_leviathan", "Water", "UR",
        "Leviathan Tide Crystal",
        "The cold of the deepest trench, vast and patient as the abyss.",
        "def",
        [("hp_pct", 6), ("atk_pct", 5), ("spd", 6)],
        {"regen_pct": 3}),

    # 16 Gale Apocalypse — SPD + Stun Status Resist + Bleed Ailment Resist
    _bc("tsuku_16", "Gale Apocalypse", "nm_gale_apocalypse", "Wind", "LR",
        "Apocalypse Gale Crystal",
        "The final storm that unmade the first dreamer's mind.",
        "spd",
        [("atk_pct", 6), ("hp_pct", 6), ("def_pct", 5)],
        {"status_resistance": {"stun": 0.20}, "ailment_resistance": {"bleed": 0.12}}),

    # 17 Earth Titan — HP + Physical Damage Reduction  (pure phys def)
    _bc("tsuku_17", "Earth Titan", "nm_earth_titan", "Earth", "LR",
        "Titan Earth Crystal",
        "A mountain given will, crushing and enduring in equal measure.",
        "hp",
        [("atk_pct", 6), ("def_pct", 6), ("spd", 7)],
        {"physical_damage_reduction": 0.08}),

    # 18 Lightning God — ATK + Magic Damage Reduction  (offense + magic def)
    _bc("tsuku_18", "Lightning God", "nm_lightning_god", "Lightning", "LR",
        "Lightning God Crystal",
        "Borrowed thunder, smiting with the force of a false deity.",
        "atk",
        [("spd", 9), ("hp_pct", 6), ("def_pct", 5)],
        {"magic_damage_reduction": 0.08}),

    # 19 Dark Overlord — HP + Lifesteal + Crit Resistance  (sustain + anti-crit)
    _bc("tsuku_19", "Dark Overlord", "nm_dark_overlord", "Dark", "LR",
        "Overlord Shadow Crystal",
        "The tyrant's crown, devourer of lucid minds.",
        "hp",
        [("atk_pct", 7), ("def_pct", 6), ("spd", 7)],
        {"lifesteal_pct": 6, "crit_resistance": 0.08}),

    # 20 Solar Eclipse — DEF + Shield + Fire Vulnerability (benefit + drawback)
    _bc("tsuku_20", "Solar Eclipse", "nm_solar_eclipse", "Light", "LR",
        "Eclipse Solar Crystal",
        "A blotted sun that casts healing light into consuming shadow.",
        "def",
        [("hp_pct", 7), ("atk_pct", 6), ("spd", 7)],
        {"shield_pct": 15, "elemental_vulnerability": {"Fire": 0.10}}),

    # 21 Inferno Lord — ATK + Poison Resist + Water Vuln (benefit + drawback)
    _bc("tsuku_21", "Inferno Lord", "nm_inferno_lord", "Fire", "GR",
        "Inferno Lord Crystal",
        "A crowned flame-king's eternal burn, reducing all to white ash.",
        "atk",
        [("hp_pct", 7), ("spd", 8), ("def_pct", 6), ("spd_pct", 4)],
        {"ailment_resistance": {"poison": 0.15}, "elemental_vulnerability": {"Water": 0.10}}),

    # 22 Abyss Queen — HP + Regen + Physical Damage Reduction  (sustain + phys def)
    _bc("tsuku_22", "Abyss Queen", "nm_abyss_queen", "Water", "GR",
        "Abyss Queen Crystal",
        "The cold of the deepest trench, mending with abyssal grace.",
        "hp",
        [("def_pct", 7), ("atk_pct", 6), ("spd", 7), ("spd_pct", 4)],
        {"regen_pct": 4, "physical_damage_reduction": 0.06}),

    # 23 Void Emperor — SPD + Freeze Status Resist + Damage Reduction
    _bc("tsuku_23", "Void Emperor", "nm_void_emperor", "Dark", "GR",
        "Void Emperor Crystal",
        "An emptiness wearing a crown, commanding the silence between dreams.",
        "spd",
        [("atk_pct", 7), ("hp_pct", 7), ("def_pct", 6), ("spd_pct", 5)],
        {"status_resistance": {"freeze": 0.20}, "damage_reduction": 0.04}),

    # 24 Celestial Dread — DEF + Dark Elemental Resist + Shield
    _bc("tsuku_24", "Celestial Dread", "nm_celestial_dread", "Light", "GR",
        "Celestial Dread Crystal",
        "A fallen star that blesses nightmares with annihilating radiance.",
        "def",
        [("hp_pct", 8), ("atk_pct", 6), ("spd", 7), ("spd_pct", 4)],
        {"elemental_resistance": {"Dark": 0.10}, "shield_pct": 18}),

    # 25 Eternal Nightmare — ATK + Lifesteal + Damage Reduction + Curse Vuln
    _bc("tsuku_25", "Eternal Nightmare", "nm_eternal_nightmare", "Dark", "MYTHIC",
        "Eternal Nightmare Crystal",
        "The final dream — the one from which no sleeper wakes.",
        "atk",
        [("spd", 10), ("hp_pct", 8), ("def_pct", 7), ("spd_pct", 5)],
        {"lifesteal_pct": 8, "damage_reduction": 0.05, "ailment_amplification": {"curse_dot": 0.12}}),

    # ═════════════════════════════════════════════════════════════════════
    # BOSS HUNT CRYSTAS — endgame signature crystals from Boss Hunt bosses.
    # Effects are independently designed (NOT based on boss class/role).
    # Stronger than Tsukuyomi crystas, with meaningful tradeoffs.
    # ═════════════════════════════════════════════════════════════════════

    # BH-1 Shadow Trickster — SPD + Physical Resistance + Lightning Vulnerability
    # Tradeoff: great physical defense, but exposed to Lightning damage
    _bc("bh_shadow_trickster", "Shadow Trickster", "loki", "Dark", "UR",
        "Shadow Trickster Crystal",
        "The deceiver's shard. Turns aside steel, yet invites the thunder's judgment.",
        "spd",
        [("atk_pct", 6), ("hp_pct", 5), ("def_pct", 5)],
        {"physical_resistance": 0.10, "elemental_vulnerability": {"Lightning": 0.08}},
        source="boss_hunt"),

    # BH-2 Burn Sovereign — DEF + Shield + Debuff Resistance + Earth Vulnerability
    # Tradeoff: powerful defensive utility, but exposed to Earth damage
    _bc("bh_burn_sovereign", "Burn Sovereign", "ra", "Light", "LR",
        "Burn Sovereign Crystal",
        "A sovereign's burning aegis. Shields the bearer and resists corruption, yet the earth claims its due.",
        "def",
        [("hp_pct", 7), ("atk_pct", 6), ("spd", 7), ("spd_pct", 4)],
        {"shield_pct": 20, "debuff_resistance": 0.15, "elemental_vulnerability": {"Earth": 0.08}},
        source="boss_hunt"),

    # BH-3 Chaos Serpent — ATK + Lifesteal + Physical/Magic Resistance + Wind Vulnerability
    # The ultimate crysta: massive sustain and dual resistance, but a real drawback
    _bc("bh_chaos_serpent", "Chaos Serpent", "apep", "Dark", "GR",
        "Chaos Serpent Crystal",
        "The devourer's final gift. Sustains and shields from all sides, yet leaves the bearer exposed to the storm.",
        "atk",
        [("spd", 10), ("hp_pct", 8), ("def_pct", 7), ("spd_pct", 5)],
        {"lifesteal_pct": 8, "physical_resistance": 0.08, "magic_resistance": 0.08, "elemental_vulnerability": {"Wind": 0.12}},
        source="boss_hunt"),
]

# ── Lookup indices ─────────────────────────────────────────────────────
BOSS_CRYSTAS_BY_ID = {bc["id"]: bc for bc in BOSS_CRYSTAS}
BOSS_CRYSTAS_BY_BOSS_ID = {bc["boss_id"]: bc for bc in BOSS_CRYSTAS}
