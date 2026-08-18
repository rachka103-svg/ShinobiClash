"""Static game catalog: fictional ninja characters, jutsu, campaign stages and combat helpers."""

import random
from typing import Optional

# Element advantage ring + dark/light pair.
ELEMENT_ADVANTAGE = {
    "Fire": "Wind",
    "Wind": "Earth",
    "Earth": "Lightning",
    "Lightning": "Water",
    "Water": "Fire",
    "Dark": "Light",
    "Light": "Dark",
}

# ---------------------------------------------------------------------------
# Rarity system — 8 tiers. Every tier has a purpose: lower tiers are cheap
# and accessible and can still carry a unique mechanic that matters in the
# right team; higher tiers are generally stronger but never make the rest
# of the roster obsolete. Team building — not raw rarity — is the objective.
# ---------------------------------------------------------------------------
RARITY_ORDER = {"N": 0, "R": 1, "SR": 2, "SSR": 3, "UR": 4, "GR": 5, "LR": 6, "MYTHIC": 7}
RARITY_TIERS = {k: v + 1 for k, v in RARITY_ORDER.items()}
ASCENSION_MAX = {"N": 1, "R": 2, "SR": 3, "SSR": 4, "UR": 5, "GR": 6, "LR": 6, "MYTHIC": 7}

# ---------------------------------------------------------------------------
# Ninja catalog. All characters are original/fictional to avoid copyright.
# portrait paths are served statically from the frontend /ninjas folder.
# ---------------------------------------------------------------------------
# Original 12 heroes — manually defined with curated kits. These will be
# backfilled with extended base_stats and ultimate abilities (for UR tier)
# after the helper functions are defined.
_ORIGINAL_12 = [
    {
        "id": "blaze",
        "name": "Blaze Akagi",
        "title": "Spark of the Crimson Leaf",
        "element": "Fire",
        "rarity": "R",
        "role": "Attacker",
        "lore": "A hot-headed genin whose fists ignite with every punch he throws.",
        "jutsus": [
            {"id": "blaze_basic", "name": "Ember Strike", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": "Fire", "description": "A swift burning punch. Builds chakra."},
            {"id": "blaze_fire", "name": "Searing Palm", "type": "attack", "power": 175, "chakra_cost": 40, "chakra_gain": 0, "element": "Fire", "description": "A blazing palm thrust dealing heavy fire damage."},
            {"id": "blaze_aoe", "name": "Flame Cyclone", "type": "aoe", "power": 130, "chakra_cost": 70, "chakra_gain": 0, "element": "Fire", "description": "Spins a vortex of fire hitting all enemies."},
        ],
    },
    {
        "id": "ripple",
        "name": "Ripple Mizuno",
        "title": "Tide Walker",
        "element": "Water",
        "rarity": "R",
        "role": "Attacker",
        "lore": "Calm and precise, she bends water into razor-sharp blades.",
        "jutsus": [
            {"id": "ripple_basic", "name": "Water Lash", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": "Water", "description": "A whip of water. Builds chakra."},
            {"id": "ripple_water", "name": "Razor Wave", "type": "attack", "power": 170, "chakra_cost": 40, "chakra_gain": 0, "element": "Water", "description": "A crescent water blade slicing one foe."},
            {"id": "ripple_heal", "name": "Healing Mist", "type": "heal", "power": 160, "chakra_cost": 60, "chakra_gain": 0, "element": "Water", "description": "Mends an ally's wounds with soothing mist."},
        ],
    },
    {
        "id": "zephyr",
        "name": "Zephyr Kazeo",
        "title": "Whisper of the Wind",
        "element": "Wind",
        "rarity": "R",
        "role": "Attacker",
        "lore": "Fast as a gust, he strikes before enemies can blink.",
        "jutsus": [
            {"id": "zephyr_basic", "name": "Gale Slash", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": "Wind", "description": "A cutting gust. Builds chakra."},
            {"id": "zephyr_wind", "name": "Vacuum Blade", "type": "attack", "power": 180, "chakra_cost": 40, "chakra_gain": 0, "element": "Wind", "description": "A compressed air blade that pierces defenses."},
            {"id": "zephyr_aoe", "name": "Tempest Sweep", "type": "aoe", "power": 125, "chakra_cost": 70, "chakra_gain": 0, "element": "Wind", "description": "A sweeping storm hitting all foes."},
        ],
    },
    {
        "id": "boulder",
        "name": "Boulder Ganseki",
        "title": "The Standing Wall",
        "element": "Earth",
        "rarity": "R",
        "role": "Tank",
        "lore": "Immovable and loyal, he shields his comrades with stone.",
        "jutsus": [
            {"id": "boulder_basic", "name": "Rock Smash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 25, "element": "Earth", "description": "A heavy stone fist. Builds chakra."},
            {"id": "boulder_earth", "name": "Stone Hammer", "type": "attack", "power": 165, "chakra_cost": 45, "chakra_gain": 0, "element": "Earth", "description": "Drops a colossal rock onto a foe."},
            {"id": "boulder_guard", "name": "Earth Bulwark", "type": "shield", "power": 0, "chakra_cost": 50, "chakra_gain": 0, "element": "Earth", "description": "Raises a wall granting an ally a damage shield."},
        ],
    },
    {
        "id": "spark",
        "name": "Spark Denko",
        "title": "Static Trickster",
        "element": "Lightning",
        "rarity": "R",
        "role": "Attacker",
        "lore": "Crackling with mischief and a thousand volts.",
        "jutsus": [
            {"id": "spark_basic", "name": "Shock Jab", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": "Lightning", "description": "An electric jab. Builds chakra."},
            {"id": "spark_lightning", "name": "Bolt Lance", "type": "attack", "power": 178, "chakra_cost": 40, "chakra_gain": 0, "element": "Lightning", "description": "A spear of lightning that rarely misses."},
            {"id": "spark_aoe", "name": "Chain Lightning", "type": "aoe", "power": 120, "chakra_cost": 70, "chakra_gain": 0, "element": "Lightning", "description": "Lightning arcs between all enemies."},
        ],
    },
    {
        "id": "ember",
        "name": "Ember Kazama",
        "title": "Phoenix Dancer",
        "element": "Fire",
        "rarity": "SR",
        "role": "Attacker",
        "lore": "Her graceful katas leave trails of living flame.",
        "jutsus": [
            {"id": "ember_basic", "name": "Cinder Cut", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 28, "element": "Fire", "description": "A flaming slash. Builds chakra."},
            {"id": "ember_fire", "name": "Phoenix Talon", "type": "attack", "power": 205, "chakra_cost": 45, "chakra_gain": 0, "element": "Fire", "description": "A diving fire claw scorching one enemy."},
            {"id": "ember_aoe", "name": "Inferno Bloom", "type": "aoe", "power": 150, "chakra_cost": 75, "chakra_gain": 0, "element": "Fire", "description": "Blossoms of fire engulf the battlefield."},
        ],
    },
    {
        "id": "frost",
        "name": "Frost Yukihana",
        "title": "Snowfall Medic",
        "element": "Water",
        "rarity": "SR",
        "role": "Support",
        "lore": "A gentle healer whose ice mends as easily as it freezes.",
        "jutsus": [
            {"id": "frost_basic", "name": "Icicle Dart", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 30, "element": "Water", "description": "A shard of ice. Builds chakra."},
            {"id": "frost_heal", "name": "Blizzard Mercy", "type": "heal", "power": 240, "chakra_cost": 55, "chakra_gain": 0, "element": "Water", "description": "Restores a large amount of an ally's HP."},
            {"id": "frost_aoe", "name": "Frozen Veil", "type": "aoe", "power": 135, "chakra_cost": 70, "chakra_gain": 0, "element": "Water", "description": "A freezing wave damages all enemies."},
        ],
    },
    {
        "id": "terra",
        "name": "Terra Iwakage",
        "title": "Mountain's Oath",
        "element": "Earth",
        "rarity": "SR",
        "role": "Tank",
        "lore": "Stoic guardian who has never once stepped back from a fight.",
        "jutsus": [
            {"id": "terra_basic", "name": "Granite Fist", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "A crushing punch. Builds chakra."},
            {"id": "terra_earth", "name": "Tectonic Crush", "type": "attack", "power": 195, "chakra_cost": 50, "chakra_gain": 0, "element": "Earth", "description": "Splits the ground beneath one enemy."},
            {"id": "terra_guard", "name": "Iron Mountain", "type": "shield", "power": 0, "chakra_cost": 55, "chakra_gain": 0, "element": "Earth", "description": "Grants a powerful shield to an ally."},
        ],
    },
    {
        "id": "gale",
        "name": "Gale Fujikaze",
        "title": "Storm Herald",
        "element": "Wind",
        "rarity": "SSR",
        "role": "Attacker",
        "lore": "Commands hurricanes with a flick of the wrist.",
        "jutsus": [
            {"id": "gale_basic", "name": "Slicing Wind", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A keen gust. Builds chakra."},
            {"id": "gale_wind", "name": "Hurricane Fang", "type": "attack", "power": 235, "chakra_cost": 50, "chakra_gain": 0, "element": "Wind", "description": "A devastating cyclone tears one enemy apart."},
            {"id": "gale_aoe", "name": "Sky Render", "type": "aoe", "power": 170, "chakra_cost": 80, "chakra_gain": 0, "element": "Wind", "description": "A storm front shreds every enemy."},
        ],
    },
    {
        "id": "raijin",
        "name": "Raijin Voltcleaver",
        "title": "Thunder God's Heir",
        "element": "Lightning",
        "rarity": "SSR",
        "role": "Attacker",
        "lore": "Said to move at the speed of thunder itself.",
        "jutsus": [
            {"id": "raijin_basic", "name": "Volt Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 30, "element": "Lightning", "description": "A charged slash. Builds chakra."},
            {"id": "raijin_lightning", "name": "Thunderclap Edge", "type": "attack", "power": 240, "chakra_cost": 50, "chakra_gain": 0, "element": "Lightning", "description": "A blinding bolt strike to one enemy."},
            {"id": "raijin_aoe", "name": "Lightning Judgment", "type": "aoe", "power": 165, "chakra_cost": 80, "chakra_gain": 0, "element": "Lightning", "description": "Calls down bolts upon all foes."},
        ],
    },
    {
        "id": "shade",
        "name": "Shade Kurogane",
        "title": "The Hollow Blade",
        "element": "Dark",
        "rarity": "UR",
        "role": "Assassin",
        "lore": "A nameless shinobi who walks between shadows and silence.",
        "jutsus": [
            {"id": "shade_basic", "name": "Shadow Cut", "type": "attack", "power": 115, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A silent strike from the dark. Builds chakra."},
            {"id": "shade_dark", "name": "Void Execution", "type": "attack", "power": 275, "chakra_cost": 55, "chakra_gain": 0, "element": "Dark", "description": "A merciless blow that ignores some defense."},
            {"id": "shade_aoe", "name": "Eclipse Storm", "type": "aoe", "power": 185, "chakra_cost": 85, "chakra_gain": 0, "element": "Dark", "description": "Darkness swallows every enemy."},
        ],
    },
    {
        "id": "lumina",
        "name": "Lumina Hikari",
        "title": "Dawn's Radiance",
        "element": "Light",
        "rarity": "UR",
        "role": "Support",
        "lore": "Where she walks, despair cannot follow.",
        "jutsus": [
            {"id": "lumina_basic", "name": "Radiant Bolt", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Light", "description": "A beam of light. Builds chakra."},
            {"id": "lumina_heal", "name": "Sacred Dawn", "type": "heal", "power": 320, "chakra_cost": 60, "chakra_gain": 0, "element": "Light", "description": "Bathes an ally in restorative light."},
            {"id": "lumina_aoe", "name": "Judgment Ray", "type": "aoe", "power": 200, "chakra_cost": 90, "chakra_gain": 0, "element": "Light", "description": "A pillar of light scorches all enemies."},
        ],
    },
]

NINJA_CATALOG = []

# ---------------------------------------------------------------------------
# Legendary Heroes — adapted from world mythology, redesigned as anime-styled
# fighters and merged into the playable roster.
# ---------------------------------------------------------------------------
RARITY_BASE = {
    "N":      {"hp": 700,  "atk": 100, "def": 50,  "spd": 90,  "chakra": 100, "crit_rate": 5,  "crit_damage": 140, "accuracy": 85, "resistance": 5},
    "R":      {"hp": 800,  "atk": 115, "def": 60,  "spd": 95,  "chakra": 100, "crit_rate": 6,  "crit_damage": 145, "accuracy": 87, "resistance": 7},
    "SR":     {"hp": 980,  "atk": 150, "def": 78,  "spd": 105, "chakra": 110, "crit_rate": 8,  "crit_damage": 155, "accuracy": 89, "resistance": 10},
    "SSR":    {"hp": 1080, "atk": 188, "def": 85,  "spd": 125, "chakra": 120, "crit_rate": 10, "crit_damage": 165, "accuracy": 91, "resistance": 14},
    "UR":     {"hp": 1180, "atk": 215, "def": 92,  "spd": 140, "chakra": 130, "crit_rate": 12, "crit_damage": 175, "accuracy": 93, "resistance": 18},
    "GR":     {"hp": 1260, "atk": 230, "def": 98,  "spd": 145, "chakra": 140, "crit_rate": 14, "crit_damage": 185, "accuracy": 94, "resistance": 22},
    "LR":     {"hp": 1320, "atk": 245, "def": 105, "spd": 150, "chakra": 150, "crit_rate": 16, "crit_damage": 195, "accuracy": 95, "resistance": 26},
    "MYTHIC": {"hp": 1450, "atk": 270, "def": 115, "spd": 160, "chakra": 165, "crit_rate": 18, "crit_damage": 210, "accuracy": 96, "resistance": 30},
}
STAT_KEYS = ("hp", "atk", "def", "spd", "chakra", "crit_rate", "crit_damage", "accuracy", "resistance")
ROLE_MOD = {
    "Attacker": {"hp": 1.0,  "atk": 1.0,  "def": 1.0,  "spd": 1.0,  "chakra": 1.0},
    "Tank":     {"hp": 1.45, "atk": 0.72, "def": 1.4,  "spd": 0.7,  "chakra": 1.0},
    "Support":  {"hp": 1.1,  "atk": 0.85, "def": 1.05, "spd": 1.0,  "chakra": 1.25},
    "Assassin": {"hp": 0.88, "atk": 1.15, "def": 0.82, "spd": 1.25, "chakra": 1.1},
    "Mage":     {"hp": 0.85, "atk": 1.25, "def": 0.75, "spd": 1.05, "chakra": 1.2},
    "Healer":   {"hp": 1.05, "atk": 0.7,  "def": 0.95, "spd": 1.0,  "chakra": 1.3},
    "Control":  {"hp": 0.95, "atk": 0.9,  "def": 0.9,  "spd": 1.15, "chakra": 1.15},
    "Bruiser":  {"hp": 1.25, "atk": 1.05, "def": 1.1,  "spd": 0.85, "chakra": 1.0},
}

# ---------------------------------------------------------------------------
# Roles, secondary tags & factions — data-driven identity, not hardcoded UI.
# ---------------------------------------------------------------------------
ROLES = ["Attacker", "Tank", "Support", "Assassin", "Mage", "Healer", "Control", "Bruiser"]
TAGS = [
    "AOE", "SINGLE_TARGET", "DOT", "CRIT", "BURN", "BLEED", "POISON", "STUN", "FREEZE",
    "SHIELD", "HEAL", "BUFF", "DEBUFF", "COUNTER", "LIFESTEAL", "SUMMONER", "EXECUTOR",
    "ENERGY", "SPEED",
]
FACTIONS = [
    "Crimson Leaf Order",     # fire / leaf-village aligned shinobi
    "Tidebound Covenant",     # water
    "Gale Wardens",           # wind
    "Ironroot Dominion",      # earth
    "Stormcall Legion",       # lightning
    "Nightveil Syndicate",    # dark
    "Radiant Choir",          # light
    "Emberforge Pantheon",    # fire-adjacent gods/legends
    "Abyssal Depths Cabal",   # sea / death-adjacent gods
    "Celestial Ascendancy",   # sky / creation gods
]

# ---------------------------------------------------------------------------
# Ability mechanic library — reusable, data-driven identity for hero passives.
# Each entry describes a MECHANIC (not a hardcoded battle if-statement); the
# battle engine consumes `effect_type` + `params` to resolve behavior as it
# is progressively extended. Roughly 20-35% of the roster carries one of the
# more elaborate "signature" mechanics below; the rest use a simpler,
# role-appropriate generic passive — this creates a natural learning curve.
# ---------------------------------------------------------------------------
MECHANIC_LIBRARY = {
    "blood_mark":        {"name": "Blood Mark", "effect_type": "stacking_mark_detonate", "desc": "Every attack applies a Blood Mark stack; at 5 stacks the mark detonates for bonus damage."},
    "phoenix_revival":   {"name": "Phoenix Revival", "effect_type": "revive_once", "desc": "The first time this hero would fall, it revives instead with a portion of its HP."},
    "shadow_execute":    {"name": "Shadow Execute", "effect_type": "execute_low_hp", "desc": "Deals massively increased damage against enemies below 30% HP."},
    "time_weave":        {"name": "Time Weave", "effect_type": "delay_turn", "desc": "Can delay a target enemy's next turn."},
    "guardian_ward":     {"name": "Guardian Ward", "effect_type": "intercept_lowest_hp", "desc": "Intercepts a portion of damage aimed at the lowest-HP ally."},
    "soul_harvest":      {"name": "Soul Harvest", "effect_type": "stack_on_kill", "desc": "Gains a permanent stack of power whenever an enemy is defeated."},
    "elemental_flux":    {"name": "Elemental Flux", "effect_type": "adaptive_element", "desc": "Shifts its active element to counter the strongest element in the enemy team."},
    "withering_curse":   {"name": "Withering Curse", "effect_type": "escalating_dot", "desc": "Applies a curse that deals increasing damage to the target each round it persists."},
    "berserker_rage":    {"name": "Berserker's Rage", "effect_type": "hp_scaling_power", "desc": "Grows stronger — bonus attack and crit — the lower its own HP falls."},
    "spirit_summon":     {"name": "Spirit Summon", "effect_type": "summon_entity", "desc": "Calls forth a temporary spirit ally that fights for a limited number of turns."},
    "lifesteal_edge":    {"name": "Lifesteal Edge", "effect_type": "lifesteal", "desc": "Basic attacks restore HP equal to a portion of the damage dealt."},
    "static_paralysis":  {"name": "Static Paralysis", "effect_type": "stun_chance", "desc": "Attacks carry a chance to stun the target for one turn."},
    "frostbite_touch":   {"name": "Frostbite Touch", "effect_type": "freeze_chance", "desc": "Attacks carry a chance to freeze the target, skipping its next action."},
    "toxic_bloom":       {"name": "Toxic Bloom", "effect_type": "poison_dot", "desc": "Applies a stacking poison that deals damage over time."},
    "cinder_trail":      {"name": "Cinder Trail", "effect_type": "burn_dot", "desc": "Attacks leave enemies burning, dealing fire damage over time."},
    "aegis_of_the_pack": {"name": "Aegis of the Pack", "effect_type": "team_shield", "desc": "Grants the whole team a protective shield at the start of battle."},
    "rallying_warcry":   {"name": "Rallying Warcry", "effect_type": "team_atk_buff", "desc": "Boosts the attack of all allies for several turns."},
    "bulwark_stance":    {"name": "Bulwark Stance", "effect_type": "team_def_buff", "desc": "Boosts the defense of all allies for several turns."},
    "vengeful_counter":  {"name": "Vengeful Counter", "effect_type": "counter_attack", "desc": "Has a chance to counterattack whenever struck by a single-target hit."},
    "gale_step":         {"name": "Gale Step", "effect_type": "speed_boost_self", "desc": "Gains bonus speed whenever it lands a critical hit."},
    "chakra_leech":      {"name": "Chakra Leech", "effect_type": "energy_drain", "desc": "Drains a portion of the target's chakra on hit, slowing their next ability."},
    "purifying_light":   {"name": "Purifying Light", "effect_type": "cleanse_debuff", "desc": "Cleanses one negative effect from an ally each turn it acts."},
    "world_ender_curse":  {"name": "World-Ender's Curse", "effect_type": "team_wide_curse", "desc": "Curses the entire enemy team, weakening their damage output each round."},
    "eternal_vigil":     {"name": "Eternal Vigil", "effect_type": "revive_ward", "desc": "Prevents one ally from falling below 1 HP once per battle."},
    "chrono_lock":       {"name": "Chrono Lock", "effect_type": "delay_all_enemies", "desc": "Occasionally delays the entire enemy team's next turn at once."},
    "world_tree_bloom":  {"name": "World Tree Bloom", "effect_type": "team_regen_ward", "desc": "At the start of each round, all allies regenerate HP and gain resistance to debuffs."},
}

# generic, low-complexity passive per role — used for the majority of the
# roster so not every hero needs a fully bespoke mechanic (accessibility).
ROLE_GENERIC_PASSIVE = {
    "Attacker": {"name": "Combat Focus", "effect_type": "crit_boost_self", "desc": "Gains a small critical rate boost after landing a hit."},
    "Tank":     {"name": "Iron Resolve", "effect_type": "damage_reduction", "desc": "Takes slightly reduced damage while above half HP."},
    "Support":  {"name": "Steady Hand", "effect_type": "chakra_gain_boost", "desc": "Generates a little extra chakra for the whole team each turn."},
    "Assassin": {"name": "First Strike", "effect_type": "bonus_vs_full_hp", "desc": "Deals bonus damage to targets at full HP."},
    "Mage":     {"name": "Arcane Focus", "effect_type": "elemental_dmg_boost", "desc": "Deals bonus damage when using its own element against a weaker foe."},
    "Healer":   {"name": "Gentle Mending", "effect_type": "heal_boost", "desc": "Healing abilities restore slightly more HP."},
    "Control":  {"name": "Disruption", "effect_type": "accuracy_debuff", "desc": "Reduces the accuracy of the last enemy it struck."},
    "Bruiser":  {"name": "Momentum", "effect_type": "atk_scaling_turns", "desc": "Gains a small attack boost the longer the battle continues."},
}

# hero_id -> mechanic_id for heroes carrying a bespoke "signature" mechanic.
SIGNATURE_MECHANIC_MAP = {
    "shade": "shadow_execute", "lumina": "purifying_light", "hades": "soul_harvest",
    "zeus": "chrono_lock", "amaterasu": "eternal_vigil", "loki": "elemental_flux",
    "leviathan": "guardian_ward", "apep": "withering_curse", "brahma": "aegis_of_the_pack",
    "susanoo": "time_weave", "freyja": "eternal_vigil", "ares": "berserker_rage", "kali": "withering_curse",
    "odin": "rallying_warcry", "sekhmet": "blood_mark", "inari": "spirit_summon", "ra": "purifying_light",
    "fenrir": "vengeful_counter", "perun": "static_paralysis", "tlaloc": "bulwark_stance",
    "izanami": "soul_harvest", "ymir": "aegis_of_the_pack", "chronos": "chrono_lock",
    "yggdrasil_spirit": "world_tree_bloom",
}


def _passive_for(hid: str, role: str) -> dict:
    mech_id = SIGNATURE_MECHANIC_MAP.get(hid)
    if mech_id:
        m = MECHANIC_LIBRARY[mech_id]
        return {"id": mech_id, "name": m["name"], "effect_type": m["effect_type"], "description": m["desc"], "signature": True}
    g = ROLE_GENERIC_PASSIVE[role]
    return {"id": f"generic_{role.lower()}", "name": g["name"], "effect_type": g["effect_type"], "description": g["desc"], "signature": False}


def _hero_stats(rarity, role):
    b = RARITY_BASE[rarity]
    m = ROLE_MOD[role]
    out = {}
    for k in STAT_KEYS:
        if k in m:
            out[k] = int(b[k] * m[k])
        else:
            out[k] = b[k]
    return out


def _hero_jutsus(hid, name, element, rarity, role):
    ri = RARITY_ORDER[rarity]
    first = name.split(" ")[0]
    el = element.lower()
    if role == "Support":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Bolt", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 30, "element": element, "description": f"A bolt of {el} energy. Builds chakra."},
            {"id": f"{hid}_heal", "name": "Divine Blessing", "type": "heal", "power": 200 + ri * 38, "chakra_cost": 55 + ri * 2, "chakra_gain": 0, "element": element, "description": "Restores a large amount of an ally's HP."},
            {"id": f"{hid}_aoe", "name": f"{element} Radiance", "type": "aoe", "power": 125 + ri * 16, "chakra_cost": 70 + ri * 3, "chakra_gain": 0, "element": element, "description": f"Unleashes {el} energy on all enemies."},
        ]
    elif role == "Tank":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Smash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": element, "description": "A heavy blow. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Wrath", "type": "attack", "power": 160 + ri * 18, "chakra_cost": 45 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A crushing {el} strike on one foe."},
            {"id": f"{hid}_guard", "name": "Aegis Ward", "type": "shield", "power": 0, "chakra_cost": 50 + ri * 2, "chakra_gain": 0, "element": element, "description": "Grants a powerful damage shield to an ally."},
        ]
    elif role == "Assassin":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": element, "description": "A quick strike. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Execution", "type": "attack", "power": 200 + ri * 24, "chakra_cost": 50 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A merciless {el} blow to one enemy."},
            {"id": f"{hid}_aoe", "name": f"{element} Eclipse", "type": "aoe", "power": 155 + ri * 14, "chakra_cost": 80 + ri * 2, "chakra_gain": 0, "element": element, "description": f"{element} energy ravages all foes."},
        ]
    elif role == "Mage":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Spark", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 30, "element": element, "description": f"A crackling burst of {el} energy. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Arcanum", "type": "attack", "power": 210 + ri * 26, "chakra_cost": 50 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A concentrated blast of pure {el} magic."},
            {"id": f"{hid}_aoe", "name": f"{element} Nova", "type": "aoe", "power": 160 + ri * 18, "chakra_cost": 80 + ri * 3, "chakra_gain": 0, "element": element, "description": f"A detonation of {el} magic engulfs every enemy."},
        ]
    elif role == "Healer":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Mend", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 30, "element": element, "description": "A modest strike. Builds chakra."},
            {"id": f"{hid}_heal", "name": f"{first}'s Renewal", "type": "heal", "power": 230 + ri * 42, "chakra_cost": 55 + ri * 2, "chakra_gain": 0, "element": element, "description": "A potent restoration that mends an ally's deepest wounds."},
            {"id": f"{hid}_aoe", "name": f"{element} Sanctuary", "type": "heal", "power": 140 + ri * 22, "chakra_cost": 75 + ri * 3, "chakra_gain": 0, "element": element, "description": "A wave of restorative energy washes over the whole team."},
        ]
    elif role == "Control":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Snare", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 30, "element": element, "description": f"A binding lash of {el} energy. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Grasp", "type": "attack", "power": 175 + ri * 20, "chakra_cost": 45 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A disabling {el} strike that disrupts the target."},
            {"id": f"{hid}_aoe", "name": f"{element} Lockdown", "type": "aoe", "power": 135 + ri * 15, "chakra_cost": 75 + ri * 3, "chakra_gain": 0, "element": element, "description": f"{element} energy binds every enemy at once."},
        ]
    elif role == "Bruiser":
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Haymaker", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 27, "element": element, "description": "A heavy-handed blow. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Reckoning", "type": "attack", "power": 195 + ri * 21, "chakra_cost": 45 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A brutal {el}-charged haymaker on one foe."},
            {"id": f"{hid}_aoe", "name": f"{element} Rampage", "type": "aoe", "power": 145 + ri * 17, "chakra_cost": 75 + ri * 3, "chakra_gain": 0, "element": element, "description": f"A wide {el} rampage crashing into all enemies."},
        ]
    else:
        kit = [
            {"id": f"{hid}_b", "name": f"{element} Strike", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": element, "description": "An elemental strike. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Onslaught", "type": "attack", "power": 180 + ri * 22, "chakra_cost": 40 + ri * 3, "chakra_gain": 0, "element": element, "description": f"A devastating {el} blow on one enemy."},
            {"id": f"{hid}_aoe", "name": f"{element} Cataclysm", "type": "aoe", "power": 130 + ri * 16, "chakra_cost": 70 + ri * 4, "chakra_gain": 0, "element": element, "description": f"Erupts with {el} energy hitting all enemies."},
        ]
    # UR and above unlock a 4th, ultimate-tier ability — high chakra cost,
    # highest impact. This is what makes top-rarity kits feel meaningfully
    # deeper/more strategic than a common hero's straightforward kit.
    if ri >= RARITY_ORDER["UR"]:
        ult_type = "heal" if role in ("Support", "Healer") else "aoe"
        kit.append({
            "id": f"{hid}_ult", "name": f"{first}'s Ultimate — {element} Reckoning", "type": ult_type,
            "power": (170 + ri * 24) if ult_type == "heal" else (185 + ri * 22),
            "chakra_cost": 95 + ri * 3, "chakra_gain": 0, "element": element, "ultimate": True,
            "description": f"An overwhelming release of {el} power — this hero's signature finishing move.",
        })
    return kit


_HERO_DEFS = [
    # id, name, title, element, rarity, role, lore
    ("ember_scout", "Ember Scout", "Flame Seeker", "Fire", "R", "Attacker", "A young fire adept hardened by surviving a volcanic eruption."),
    ("saltide", "Saltide", "Shore Warden", "Water", "R", "Attacker", "A coastal guard who learned to read the currents and tides."),
    ("stoneback", "Stoneback", "Rock Tortoise", "Earth", "R", "Tank", "An ancient tortoise whose shell petrified into living rock armor."),
    ("dust_wisp", "Dust Wisp", "Desert Wanderer", "Wind", "R", "Attacker", "A being of condensed desert wind who guides lost travelers."),
    ("glow_sentinel", "Glow Sentinel", "Lantern Knight", "Light", "R", "Support", "A devoted knight whose enchanted lantern banishes darkness."),
    ("shade_walker", "Shade Walker", "Dusk Wanderer", "Dark", "R", "Assassin", "A wanderer who treads the boundary between light and shadow."),
    ("prometheus", "Prometheus", "The Fire Bringer", "Fire", "SR", "Attacker", "Titan who stole fire from the gods to gift it to humanity."),
    ("poseidon", "Poseidon", "Sea Lord", "Water", "SR", "Attacker", "God of the seas whose trident splits coastlines with a flick."),
    ("gaia", "Gaia", "World Mother", "Earth", "SR", "Tank", "Primordial goddess whose very body is the earth itself."),
    ("thor", "Thor", "Thunder God", "Wind", "SR", "Attacker", "God of thunder whose hammer calls lightning from clear skies."),
    ("apollo", "Apollo", "Sun Archer", "Light", "SR", "Support", "God of sun and prophecy whose light both mends and strikes."),
    ("anubis", "Anubis", "Soul Judge", "Dark", "SR", "Assassin", "God of death who weighs souls against the feather of truth."),
    ("hermes", "Hermes", "Swift Messenger", "Wind", "SR", "Assassin", "Messenger of the gods, fast enough to outrun the wind."),
    ("pele", "Pele", "Volcano Goddess", "Fire", "SSR", "Attacker", "Goddess of volcanoes who shapes islands from molten rock."),
    ("tiamat", "Tiamat", "Primordial Sea Dragon", "Water", "SSR", "Attacker", "Dragon goddess of the salt sea from whom the world was made."),
    ("osiris", "Osiris", "Resurrection King", "Earth", "SSR", "Tank", "God of the afterlife who taught humanity to farm the land."),
    ("zeus", "Zeus", "Sky Father", "Wind", "SSR", "Attacker", "King of the gods who hurls lightning from Mount Olympus."),
    ("athena", "Athena", "War Sage", "Light", "SSR", "Support", "Goddess of wisdom and strategy, born armored from Zeus."),
    ("hades", "Hades", "Death Lord", "Dark", "SSR", "Assassin", "God of the underworld who rules the dead with cold justice."),
    ("quetzalcoatl", "Quetzalcoatl", "Feathered Serpent", "Wind", "SSR", "Attacker", "God of wind and knowledge who gifted humanity the calendar."),
    ("amaterasu", "Amaterasu", "Sun Goddess", "Light", "UR", "Support", "Supreme goddess who rules the heavens with radiant light."),
    ("loki", "Loki", "Trickster Unbound", "Dark", "UR", "Assassin", "The trickster whose chains will shatter at Ragnarok."),
    ("hephaestus", "Hephaestus", "Divine Artificer", "Fire", "UR", "Attacker", "Greatest smith of the gods, whose forge never cools."),
    ("leviathan", "Leviathan", "Serpent of the Abyss", "Water", "UR", "Tank", "The great sea monster no weapon of man can pierce."),
    ("brahma", "Brahma", "Creator of Worlds", "Light", "LR", "Support", "The creator god who shaped the universe from nothing."),
    ("apep", "Apep", "Chaos Serpent", "Dark", "LR", "Assassin", "The eternal chaos serpent who devours the sun each night."),
]

# Backfill the original 12 heroes with extended base_stats and ultimate abilities
for _h in _ORIGINAL_12:
    _h["base_stats"] = _hero_stats(_h["rarity"], _h["role"])
    if RARITY_ORDER[_h["rarity"]] >= RARITY_ORDER["UR"]:
        # Add ultimate ability for UR+ heroes
        _ri = RARITY_ORDER[_h["rarity"]]
        _ult_type = "heal" if _h["role"] in ("Support", "Healer") else "aoe"
        _h["jutsus"].append({
            "id": f"{_h['id']}_ult", "name": f"{_h['name'].split()[0]}'s Ultimate — {_h['element']} Reckoning", "type": _ult_type,
            "power": (170 + _ri * 24) if _ult_type == "heal" else (185 + _ri * 22),
            "chakra_cost": 95 + _ri * 3, "chakra_gain": 0, "element": _h["element"], "ultimate": True,
            "description": f"An overwhelming release of {_h['element'].lower()} power — this hero's signature finishing move.",
        })
    NINJA_CATALOG.append(_h)

for _hid, _name, _title, _el, _rar, _role, _lore in _HERO_DEFS:
    NINJA_CATALOG.append({
        "id": _hid, "name": _name, "title": _title, "element": _el, "rarity": _rar,
        "role": _role, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _hero_jutsus(_hid, _name, _el, _rar, _role),
    })

# ---------------------------------------------------------------------------
# Roster expansion — brings the total playable catalog from 38 to ~69 heroes
# across all 8 rarity tiers, filling in every role (including the new
# Mage/Healer/Control/Bruiser roles) and introducing the GR and MYTHIC tiers
# plus original faction identities. Heroes without finished artwork use a
# clearly-marked temporary placeholder portrait until real art is produced —
# never a mislabeled final asset.
# ---------------------------------------------------------------------------
_HERO_DEFS_V2 = [
    # id, name, title, element, rarity, role, faction, lore
    ("pebble", "Pebble", "Stonebound Novice", "Earth", "N", "Tank", "Ironroot Dominion", "A pebble-shinobi recruit still growing into his stone armor."),
    ("spritz", "Spritz", "Puddle Splasher", "Water", "N", "Attacker", "Tidebound Covenant", "An eager academy student who hasn't yet learned to control her splashes."),
    ("cinderling", "Cinderling", "Campfire Apprentice", "Fire", "N", "Mage", "Emberforge Pantheon", "A tiny flame-spirit apprentice, more enthusiastic than precise."),
    ("petal", "Petal", "Breeze Novice", "Wind", "N", "Healer", "Gale Wardens", "A gentle academy medic-in-training who calms the wind to soothe wounds."),
    ("glimmer", "Glimmer", "Candlewick Ward", "Light", "N", "Support", "Radiant Choir", "A young acolyte whose candle-light steadies frightened allies."),
    ("shiver", "Shiver", "Alley Shade", "Dark", "N", "Assassin", "Nightveil Syndicate", "A street urchin turned shadow-runner, quick but still reckless."),
    ("voltling", "Voltling", "Static Novice", "Lightning", "N", "Control", "Stormcall Legion", "A crackling academy dropout who short-circuits enemy footing."),
    ("rockling", "Rockling", "Rubble Brawler", "Earth", "N", "Bruiser", "Ironroot Dominion", "A scrappy brawler who throws rubble as often as fists."),
    ("pyra_emberling", "Pyra Emberling", "Kindled Scholar", "Fire", "R", "Mage", "Emberforge Pantheon", "A scholar of flame magic who studies embers for hidden patterns."),
    ("nyx_wailer", "Nyx Wailer", "Mourning Chanter", "Dark", "R", "Healer", "Nightveil Syndicate", "A curse-singer who mends wounds by borrowing pain from shadow."),
    ("gale_binder", "Gale Binder", "Windrope Adept", "Wind", "R", "Control", "Gale Wardens", "Weaves living rope from wind currents to snare her foes."),
    ("krag_stoneshoulder", "Krag Stoneshoulder", "Quarry Champion", "Earth", "R", "Bruiser", "Ironroot Dominion", "A quarry laborer whose shoulders have broken more boulders than blades."),
    ("vesper_flameweaver", "Vesper Flameweaver", "Ember Loomkeeper", "Fire", "SR", "Mage", "Emberforge Pantheon", "Weaves fire into cloth-like ribbons that cut and burn at will."),
    ("coralia_tidesong", "Coralia Tidesong", "Reef Chorister", "Water", "SR", "Healer", "Tidebound Covenant", "Her songs call healing tides to wash over wounded allies."),
    ("zephyrine_stormbind", "Zephyrine Stormbind", "Cyclone Warden", "Wind", "SR", "Control", "Gale Wardens", "Binds enemies inside miniature cyclones of her own making."),
    ("grondar_ironfist", "Grondar Ironfist", "Bastion Breaker", "Earth", "SR", "Bruiser", "Ironroot Dominion", "His iron fists have cracked castle gates and enemy lines alike."),
    ("susanoo", "Susanoo", "Storm Tempest Lord", "Wind", "SSR", "Control", "Celestial Ascendancy", "God of storms and sea, exiled from the heavens for his fury."),
    ("freyja", "Freyja", "Valkyrie Matron", "Light", "SSR", "Healer", "Radiant Choir", "Goddess of love and war who mends the fallen before battle resumes."),
    ("ares", "Ares", "War Incarnate", "Fire", "SSR", "Bruiser", "Emberforge Pantheon", "God of war who thrives on the chaos of the front line."),
    ("kali", "Kali", "Destroyer of Time", "Dark", "SSR", "Assassin", "Nightveil Syndicate", "Goddess of destruction and time, feared even by other gods."),
    ("odin", "Odin", "All-Father", "Lightning", "UR", "Support", "Stormcall Legion", "The all-father, who traded an eye for infinite wisdom."),
    ("sekhmet", "Sekhmet", "Lioness of War", "Fire", "UR", "Assassin", "Emberforge Pantheon", "Lioness war-goddess whose breath once brought plague to enemies of Egypt."),
    ("inari", "Inari", "Fox of Fortune", "Light", "UR", "Mage", "Radiant Choir", "A shapeshifting kitsune deity of prosperity, rice, and cunning magic."),
    ("ra", "Ra", "Sun Sovereign", "Light", "GR", "Mage", "Celestial Ascendancy", "The sun god who sails the sky each day to hold back eternal night."),
    ("fenrir", "Fenrir", "The Bound Wolf", "Dark", "GR", "Bruiser", "Nightveil Syndicate", "A monstrous wolf prophesied to break its chains at the end of the world."),
    ("perun", "Perun", "Thunder Warlord", "Lightning", "GR", "Attacker", "Stormcall Legion", "Slavic god of thunder who rides the storm astride a fiery chariot."),
    ("tlaloc", "Tlaloc", "Rainstorm Sovereign", "Water", "GR", "Control", "Tidebound Covenant", "Aztec god of rain and storm, both life-giver and destroyer."),
    ("izanami", "Izanami", "Queen of the Underworld", "Dark", "GR", "Healer", "Abyssal Depths Cabal", "Goddess of creation and death, ruling the underworld with tragic grace."),
    ("ymir", "Ymir", "Primordial Giant", "Earth", "LR", "Tank", "Ironroot Dominion", "The first giant, from whose bones and flesh the world itself was formed."),
    ("chronos", "Chronos", "Warden of Ages", "Dark", "MYTHIC", "Control", "Abyssal Depths Cabal", "The primordial embodiment of time, who can unravel a battle's very pace."),
    ("yggdrasil_spirit", "Yggdrasil", "Heart of the World Tree", "Earth", "MYTHIC", "Support", "Celestial Ascendancy", "The spirit of the world tree, whose roots and branches sustain all realms."),
]

for _hid, _name, _title, _el, _rar, _role, _fac, _lore in _HERO_DEFS_V2:
    NINJA_CATALOG.append({
        "id": _hid, "name": _name, "title": _title, "element": _el, "rarity": _rar,
        "role": _role, "faction": _fac, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _hero_jutsus(_hid, _name, _el, _rar, _role), "is_placeholder_art": True,
    })

# ---------------------------------------------------------------------------
# Faction defaults (for heroes defined before the faction system existed),
# secondary tags and passive mechanics — applied to the ENTIRE roster so
# every hero, old or new, has full identity coverage.
# ---------------------------------------------------------------------------
_ELEMENT_FACTION_DEFAULT = {
    "Fire": "Crimson Leaf Order", "Water": "Tidebound Covenant", "Wind": "Gale Wardens",
    "Earth": "Ironroot Dominion", "Lightning": "Stormcall Legion", "Dark": "Nightveil Syndicate",
    "Light": "Radiant Choir",
}
_FACTION_OVERRIDE = {
    "poseidon": "Abyssal Depths Cabal", "tiamat": "Abyssal Depths Cabal", "leviathan": "Abyssal Depths Cabal",
    "thor": "Celestial Ascendancy", "zeus": "Celestial Ascendancy", "quetzalcoatl": "Celestial Ascendancy", "brahma": "Celestial Ascendancy",
    "hephaestus": "Emberforge Pantheon", "pele": "Emberforge Pantheon", "prometheus": "Emberforge Pantheon",
}
_ROLE_TAGS = {
    "Attacker": ["SINGLE_TARGET", "CRIT"], "Tank": ["SHIELD", "SINGLE_TARGET"],
    "Support": ["HEAL", "BUFF"], "Assassin": ["EXECUTOR", "CRIT"],
    "Mage": ["AOE", "DEBUFF"], "Healer": ["HEAL", "BUFF"],
    "Control": ["STUN", "DEBUFF"], "Bruiser": ["AOE", "LIFESTEAL"],
}
_ELEMENT_TAG = {
    "Fire": "BURN", "Water": "HEAL", "Wind": "SPEED", "Earth": "SHIELD",
    "Lightning": "STUN", "Dark": "DEBUFF", "Light": "BUFF",
}

for _n in NINJA_CATALOG:
    _n.setdefault("faction", _FACTION_OVERRIDE.get(_n["id"], _ELEMENT_FACTION_DEFAULT.get(_n["element"], "Crimson Leaf Order")))
    _tags = list(dict.fromkeys(_ROLE_TAGS.get(_n["role"], ["SINGLE_TARGET"]) + [_ELEMENT_TAG.get(_n["element"], "AOE")]))
    _n.setdefault("tags", _tags)
    _n.setdefault("passive", _passive_for(_n["id"], _n["role"]))
    _n.setdefault("is_placeholder_art", False)
    _n.setdefault("star_level_default", 1)

# Portrait paths: original ninjas live in /ninjas, imported legends in
# /heroes; roster-expansion heroes without finished art use a clearly
# marked temporary placeholder (never presented as final artwork).
_NINJA_IDS = {"blaze", "ripple", "zephyr", "boulder", "spark", "ember", "frost", "terra", "gale", "raijin", "shade", "lumina"}
_V2_IDS = {h[0] for h in _HERO_DEFS_V2}
for _n in NINJA_CATALOG:
    if _n["id"] in _V2_IDS:
        _n["portrait"] = "/heroes/_placeholder.png"
    elif _n["id"] in _NINJA_IDS:
        _n["portrait"] = f"/ninjas/{_n['id']}.png"
    else:
        _n["portrait"] = f"/heroes/{_n['id']}.png"

CATALOG_BY_ID = {n["id"]: n for n in NINJA_CATALOG}

STARTER_NINJAS = ["blaze", "ripple", "zephyr"]

# Weighted summon pool (per rarity). Lower rarity = higher chance.
SUMMON_WEIGHTS = {"N": 3000, "R": 1000, "SR": 320, "SSR": 95, "UR": 20, "GR": 6, "LR": 3, "MYTHIC": 1}
SUMMON_COST = 300

# Shards gained when pulling a hero already owned (duplicate protection —
# duplicates are NEVER wasted). Lower rarity yields more shards since it's
# pulled far more often; shards feed the star-up system (see ascension_cost
# analog `star_up_cost` below).
SHARD_YIELD_PER_DUPLICATE = {"N": 50, "R": 40, "SR": 30, "SSR": 20, "UR": 12, "GR": 8, "LR": 5, "MYTHIC": 3}
STAR_LEVEL_MAX = 6


def star_up_cost(rarity: str, current_star: int) -> int:
    """Shards required to raise a hero from `current_star` to `current_star + 1`."""
    ri = RARITY_ORDER[rarity]
    return round((40 + ri * 15) * (1 + 0.6 * (current_star - 1)))

# ---------------------------------------------------------------------------
# Campaign stages
# ---------------------------------------------------------------------------
STAGES = [
    {"id": "s1", "chapter": 1, "name": "Bandits at the Gate", "region": "Leaf Outskirts",
     "enemies": [{"template_id": "blaze", "level": 1}, {"template_id": "boulder", "level": 1}],
     "rewards": {"ryo": 150, "exp": 40}, "first_clear": {"ryo": 200, "ninja": None}},
    {"id": "s2", "chapter": 1, "name": "The Stolen Scroll", "region": "Leaf Outskirts",
     "enemies": [{"template_id": "ripple", "level": 2}, {"template_id": "spark", "level": 2}],
     "rewards": {"ryo": 170, "exp": 50}, "first_clear": {"ryo": 250, "ninja": None}},
    {"id": "s3", "chapter": 1, "name": "Forest Ambush", "region": "Misty Woods",
     "enemies": [{"template_id": "zephyr", "level": 3}, {"template_id": "boulder", "level": 3}, {"template_id": "spark", "level": 2}],
     "rewards": {"ryo": 200, "exp": 65}, "first_clear": {"ryo": 300, "ninja": "ember"}},
    {"id": "s4", "chapter": 2, "name": "River of Blades", "region": "Misty Woods",
     "enemies": [{"template_id": "ripple", "level": 5}, {"template_id": "frost", "level": 4}],
     "rewards": {"ryo": 230, "exp": 80}, "first_clear": {"ryo": 350, "ninja": None}},
    {"id": "s5", "chapter": 2, "name": "The Rogue Medic", "region": "Misty Woods",
     "enemies": [{"template_id": "frost", "level": 6}, {"template_id": "ripple", "level": 5}, {"template_id": "ember", "level": 5}],
     "rewards": {"ryo": 260, "exp": 95}, "first_clear": {"ryo": 400, "ninja": "frost"}},
    {"id": "s6", "chapter": 2, "name": "Stone Sentinels", "region": "Rocky Pass",
     "enemies": [{"template_id": "terra", "level": 7}, {"template_id": "boulder", "level": 7}],
     "rewards": {"ryo": 300, "exp": 115}, "first_clear": {"ryo": 450, "ninja": None}},
    {"id": "s7", "chapter": 3, "name": "Thunder on the Ridge", "region": "Rocky Pass",
     "enemies": [{"template_id": "spark", "level": 9}, {"template_id": "raijin", "level": 8}],
     "rewards": {"ryo": 340, "exp": 135}, "first_clear": {"ryo": 500, "ninja": "terra"}},
    {"id": "s8", "chapter": 3, "name": "Eye of the Storm", "region": "Howling Cliffs",
     "enemies": [{"template_id": "gale", "level": 10}, {"template_id": "zephyr", "level": 9}, {"template_id": "spark", "level": 9}],
     "rewards": {"ryo": 380, "exp": 160}, "first_clear": {"ryo": 600, "ninja": None}},
    {"id": "s9", "chapter": 3, "name": "The Storm Herald", "region": "Howling Cliffs",
     "enemies": [{"template_id": "gale", "level": 13}, {"template_id": "raijin", "level": 12}],
     "rewards": {"ryo": 430, "exp": 185}, "first_clear": {"ryo": 700, "ninja": "gale"}},
    {"id": "s10", "chapter": 4, "name": "Shadows Gather", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "shade", "level": 14}, {"template_id": "raijin", "level": 13}, {"template_id": "ember", "level": 13}],
     "rewards": {"ryo": 500, "exp": 220}, "first_clear": {"ryo": 800, "ninja": None}},
    {"id": "s11", "chapter": 4, "name": "Light Against Dark", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "lumina", "level": 16}, {"template_id": "shade", "level": 15}],
     "rewards": {"ryo": 600, "exp": 260}, "first_clear": {"ryo": 900, "ninja": "lumina"}},
    {"id": "s12", "chapter": 4, "name": "The Hollow Blade", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "shade", "level": 18}, {"template_id": "lumina", "level": 17}, {"template_id": "gale", "level": 16}],
     "rewards": {"ryo": 800, "exp": 320}, "first_clear": {"ryo": 1500, "ninja": "shade"}},
]

STAGES_BY_ID = {s["id"]: s for s in STAGES}

# ---------------------------------------------------------------------------
# Scalable stage architecture — s1-s12 above are the curated Chapters 1-4.
# Everything from Chapter 5 onward is procedurally generated by
# `generate_campaign_stages`, which can be called with ANY chapter range
# (including chapter 100+, thousands of stages) without hand-authoring UI
# or data for each one — this is what makes the campaign "endless-ready."
# Enemy difficulty bands scale with chapter and reuse the full expanded
# catalog, so newly added heroes automatically populate future content.
# ---------------------------------------------------------------------------
_CHAPTER_REGIONS = [
    "Ashfall Wastes", "Drowned Coral Reach", "Skyshard Peaks", "Thundercrag Basin",
    "Withering Hollow", "Sunspire Sanctum", "Frozen Reliquary", "Voidglass Expanse",
    "Verdant Undercroft", "Obsidian Bastion",
]


def _rarity_band_for_chapter(chapter: int) -> list:
    """Which rarity tiers a chapter's regular (non-boss) enemies are drawn from."""
    order = ["N", "R", "SR", "SSR", "UR", "GR", "LR", "MYTHIC"]
    # every 2 chapters, the band creeps up one tier; caps at GR for regular mobs
    lo = min(5, max(0, (chapter - 1) // 2))
    hi = min(6, lo + 2)
    return order[lo:hi + 1]


def _boss_rarity_for_chapter(chapter: int) -> list:
    order = ["SSR", "UR", "GR", "LR", "MYTHIC"]
    idx = min(len(order) - 1, max(0, (chapter - 4) // 2))
    return order[idx:idx + 2] or [order[-1]]


# Reusable boss-phase framework — a mega boss is never just a bigger HP bar.
# Each entry is data the (client) battle engine can progressively read to
# drive multi-phase fights: shield windows, enrage thresholds, and adds.
BOSS_MECHANICS = {
    "sealed_titan": {
        "name": "Sealed Titan Protocol",
        "phases": [
            {"hp_above": 60, "behavior": "normal"},
            {"hp_between": [30, 60], "behavior": "shielded", "shield_pct": 25, "break_condition": "aoe_hit_3_times"},
            {"hp_below": 30, "behavior": "enraged", "atk_mult": 1.6, "spd_mult": 1.3},
        ],
        "summons_adds_at_pct": 50,
        "immune_to": [],
    },
    "abyssal_warden": {
        "name": "Abyssal Warden Protocol",
        "phases": [
            {"hp_above": 70, "behavior": "normal"},
            {"hp_between": [35, 70], "behavior": "elemental_shift", "shift_to": "Water"},
            {"hp_below": 35, "behavior": "enraged", "atk_mult": 1.5, "reflects_crit": True},
        ],
        "summons_adds_at_pct": 40,
        "immune_to": ["poison"],
    },
}


def generate_campaign_stages(start_chapter: int, end_chapter: int, stages_per_chapter: int = 6) -> list:
    """Procedurally builds stage definitions for any chapter range. Designed
    to scale to hundreds/thousands of stages without hand-authored data or
    UI changes — Campaign/Roster already render whatever this returns."""
    out = []
    pool_by_rarity = {}
    for tid, t in CATALOG_BY_ID.items():
        pool_by_rarity.setdefault(t["rarity"], []).append(tid)

    for chapter in range(start_chapter, end_chapter + 1):
        region = _CHAPTER_REGIONS[(chapter - 1) % len(_CHAPTER_REGIONS)]
        band = _rarity_band_for_chapter(chapter)
        candidates = [tid for r in band for tid in pool_by_rarity.get(r, [])] or list(CATALOG_BY_ID.keys())
        for i in range(1, stages_per_chapter + 1):
            is_boss = i == stages_per_chapter
            sid = f"s{12 + (chapter - start_chapter) * stages_per_chapter + i}" if start_chapter > 4 else f"c{chapter}_{i}"
            base_level = chapter * 5 + i
            rng = random.Random((chapter * 1000 + i))
            if is_boss:
                boss_band = _boss_rarity_for_chapter(chapter)
                boss_candidates = [tid for r in boss_band for tid in pool_by_rarity.get(r, [])] or candidates
                boss_tid = rng.choice(boss_candidates)
                mech_id = "sealed_titan" if chapter % 2 == 0 else "abyssal_warden"
                enemies = [{"template_id": boss_tid, "level": round(base_level * 1.6)}]
                stage = {
                    "id": sid, "chapter": chapter, "name": f"{CATALOG_BY_ID[boss_tid]['name']}'s Last Stand",
                    "region": region, "enemies": enemies, "is_boss": True,
                    "boss_mechanic": mech_id,
                    "rewards": {"ryo": 400 + chapter * 120, "exp": 150 + chapter * 45},
                    "first_clear": {"ryo": 900 + chapter * 200, "ninja": None},
                }
            else:
                count = min(3, 2 + i // 3)
                enemies = [{"template_id": rng.choice(candidates), "level": base_level + rng.randint(0, 2)} for _ in range(count)]
                stage = {
                    "id": sid, "chapter": chapter, "name": f"{region} Skirmish {i}",
                    "region": region, "enemies": enemies, "is_boss": False,
                    "rewards": {"ryo": 220 + chapter * 60, "exp": 80 + chapter * 25},
                    "first_clear": {"ryo": 400 + chapter * 100, "ninja": None},
                }
            out.append(stage)
    return out


# Currently generate Chapters 5-8 (24 more stages) as the next content slice.
# Calling generate_campaign_stages(9, 100) later scales the campaign further
# with zero additional hand-authored data or UI work.
STAGES.extend(generate_campaign_stages(5, 8, stages_per_chapter=6))
STAGES_BY_ID = {s["id"]: s for s in STAGES}


# ---------------------------------------------------------------------------
# Combat / progression helpers
# ---------------------------------------------------------------------------
import random as _random


# ---------------------------------------------------------------------------
# Items, drops & progression
# ---------------------------------------------------------------------------
ITEMS = {
    "exp_tome_minor":    {"id": "exp_tome_minor", "name": "Minor EXP Tome", "type": "exp", "value": 250, "icon": "scroll", "color": "#9E9E9E", "desc": "Grants 250 EXP to a single hero."},
    "exp_tome_greater":  {"id": "exp_tome_greater", "name": "Greater EXP Tome", "type": "exp", "value": 1200, "icon": "scroll-text", "color": "#29B6F6", "desc": "Grants 1,200 EXP to a single hero."},
    "exp_tome_ancient":  {"id": "exp_tome_ancient", "name": "Ancient EXP Tome", "type": "exp", "value": 6000, "icon": "book-open", "color": "#AB47BC", "desc": "Grants 6,000 EXP to a single hero."},
    "ascension_crystal": {"id": "ascension_crystal", "name": "Ascension Crystal", "type": "material", "value": 0, "icon": "gem", "color": "#00E5FF", "desc": "Spent to ascend a hero beyond its level cap."},
    "summon_ticket":     {"id": "summon_ticket", "name": "Summon Ticket", "type": "ticket", "value": 0, "icon": "ticket", "color": "#FFCA28", "desc": "Summons a hero for free, no Ryo required."},
}

# (item_id, qty, weight) — rolled on each battle win.
DROP_TABLE = [
    ("exp_tome_minor", 2, 50),
    ("exp_tome_greater", 1, 22),
    ("ascension_crystal", 1, 16),
    ("summon_ticket", 1, 8),
    ("exp_tome_ancient", 1, 4),
]


def roll_drops(chapter: int, first_clear: bool) -> dict:
    drops = {}
    rolls = 1 + (1 if chapter >= 3 else 0) + (1 if first_clear else 0)
    pool = []
    for iid, qty, w in DROP_TABLE:
        pool.extend([(iid, qty)] * w)
    for _ in range(rolls):
        iid, qty = _random.choice(pool)
        drops[iid] = drops.get(iid, 0) + qty
    return drops


# ---------------------------------------------------------------------------
# Combat / progression helpers
# ---------------------------------------------------------------------------
def level_cap(rarity: str, ascension: int) -> int:
    """Base cap of 20, +10 per ascension star."""
    return 20 + ascension * 10


def max_team_size(level: int) -> int:
    """Squad starts at 3 slots; unlocks a 4th at Lv.10 and a 5th at Lv.20 (max 5)."""
    return min(5, 3 + max(0, level) // 10)


def next_slot_level(level: int) -> Optional[int]:
    """Player level at which the next squad slot unlocks, or None if maxed."""
    cap = max_team_size(level)
    return None if cap >= 5 else (cap - 2) * 10


def max_level(rarity: str) -> int:
    return level_cap(rarity, ASCENSION_MAX[rarity])


def compute_stats(template_id: str, level: int, ascension: int = 0) -> dict:
    t = CATALOG_BY_ID[template_id]
    b = t["base_stats"]
    gl = 1 + 0.09 * (level - 1)
    ga = 1 + 0.12 * ascension
    return {
        "hp": round(b["hp"] * gl * ga),
        "atk": round(b["atk"] * gl * ga),
        "def": round(b["def"] * (1 + 0.08 * (level - 1)) * ga),
        "spd": round(b["spd"] * (1 + 0.025 * (level - 1)) * (1 + 0.05 * ascension)),
        "chakra": b["chakra"],
    }


def ninja_power(template_id: str, level: int, ascension: int = 0) -> int:
    s = compute_stats(template_id, level, ascension)
    return round(s["hp"] * 0.4 + s["atk"] * 2.2 + s["def"] * 1.6 + s["spd"] * 1.2 + s["chakra"] * 1.0)


def exp_to_next(level: int) -> int:
    """Player account level curve."""
    return 80 + (level - 1) * 60


def hero_exp_to_next(level: int) -> int:
    """Per-hero level curve — grows steadily so high levels feel earned."""
    return round(100 + (level - 1) * 90 + (level ** 2) * 4)


def ascension_cost(rarity: str, ascension: int) -> dict:
    """Cost to go from `ascension` -> ascension + 1."""
    ri = RARITY_ORDER[rarity]
    return {"ascension_crystal": 5 + ascension * 5 + ri * 3, "ryo": 500 + ascension * 400 + ri * 300}


# ---------------------------------------------------------------------------
# Endless Spire (ascending tower) — scales forever, farmable on replay.
# ---------------------------------------------------------------------------
def spire_rewards(floor: int, advancing: bool) -> dict:
    boss = floor % 5 == 0
    ryo = 120 + floor * 35
    hero_exp = 40 + floor * 12
    if advancing:
        if boss:
            items = {"ascension_crystal": 2, "summon_ticket": 1, "exp_tome_greater": 1}
        else:
            items = {"exp_tome_minor": 2}
            if floor % 3 == 0:
                items["exp_tome_greater"] = 1
    else:  # replay / farming -> reduced, no premium materials
        ryo = round(ryo * 0.4)
        hero_exp = round(hero_exp * 0.4)
        items = {"exp_tome_minor": 1}
    return {"ryo": ryo, "hero_exp_base": hero_exp, "items": items, "boss": boss}


# ---------------------------------------------------------------------------
# Trial dungeons — repeatable farming for specific materials.
# ---------------------------------------------------------------------------
TRIALS = [
    {"id": "t_scroll", "name": "Scroll Sanctum", "desc": "Farm EXP Tomes to train your heroes.",
     "material": "exp_tome_greater", "icon": "book-open", "color": "#29B6F6",
     "enemies": [{"template_id": "frost", "level": 10}, {"template_id": "ember", "level": 10}],
     "rewards": {"ryo": 120, "hero_exp": 60, "items": {"exp_tome_minor": 3, "exp_tome_greater": 1}}},
    {"id": "t_crystal", "name": "Crystal Cavern", "desc": "Mine Ascension Crystals to break level caps.",
     "material": "ascension_crystal", "icon": "gem", "color": "#00E5FF",
     "enemies": [{"template_id": "terra", "level": 12}, {"template_id": "boulder", "level": 12}],
     "rewards": {"ryo": 140, "hero_exp": 60, "items": {"ascension_crystal": 3}}},
    {"id": "t_gold", "name": "Gold Vault", "desc": "Raid the vault for a big Ryo payout.",
     "material": "ryo", "icon": "coins", "color": "#FFCA28",
     "enemies": [{"template_id": "spark", "level": 11}, {"template_id": "zephyr", "level": 11}, {"template_id": "raijin", "level": 11}],
     "rewards": {"ryo": 600, "hero_exp": 50, "items": {}}},
]
TRIALS_BY_ID = {t["id"]: t for t in TRIALS}


# ---------------------------------------------------------------------------
# Daily Energy — gates battle attempts (campaign/spire/trial). Regenerates
# over real time up to a cap; consumed per stage attempt regardless of
# win/lose (standard gacha-game convention).
# ---------------------------------------------------------------------------
from datetime import datetime, timezone, timedelta

ENERGY_MAX_DEFAULT = 100
ENERGY_REGEN_SECONDS = 180  # +1 energy every 3 minutes -> full regen in 5h
ENERGY_COST = {"campaign": 10, "spire": 10, "trial": 8}


def _parse_iso(ts: Optional[str]) -> datetime:
    if not ts:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(ts)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def compute_energy(energy_state: Optional[dict]) -> dict:
    """Pure function: given a stored {current,max,last_regen_at}, returns the
    up-to-date state plus derived countdown fields. Never mutates the input."""
    state = energy_state or {}
    max_e = int(state.get("max", ENERGY_MAX_DEFAULT))
    current = int(state.get("current", max_e))
    last = _parse_iso(state.get("last_regen_at"))
    now = datetime.now(timezone.utc)

    if current < max_e:
        elapsed = (now - last).total_seconds()
        ticks = int(elapsed // ENERGY_REGEN_SECONDS)
        if ticks > 0:
            current = min(max_e, current + ticks)
            last = last + timedelta(seconds=ticks * ENERGY_REGEN_SECONDS)

    if current >= max_e:
        current = max_e
        last = now  # reset baseline once full so no drift accumulates

    remainder = max(0.0, (now - last).total_seconds())
    next_tick_in = 0 if current >= max_e else max(0, round(ENERGY_REGEN_SECONDS - remainder))
    full_in = 0 if current >= max_e else next_tick_in + (max_e - current - 1) * ENERGY_REGEN_SECONDS

    return {
        "current": current, "max": max_e, "last_regen_at": last.isoformat(),
        "next_tick_in": int(next_tick_in), "full_in": int(full_in),
    }


def spend_energy(energy_state: Optional[dict], amount: int) -> Optional[dict]:
    """Returns the up-to-date energy state after spending `amount`, or None
    if there isn't enough energy available right now."""
    state = compute_energy(energy_state)
    if state["current"] < amount:
        return None
    state["current"] -= amount
    # re-derive the countdown fields for the new (lower) current value
    return compute_energy(state)


# ---------------------------------------------------------------------------
# Daily Missions — reset every UTC day; progress is driven exclusively by
# server-side gameplay events (cannot be gamed from the client).
# ---------------------------------------------------------------------------
def daily_cycle_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


DAILY_MISSIONS = [
    {"id": "m_clear_3", "name": "Clear 3 Stages", "desc": "Win any 3 Campaign stages.",
     "event": "campaign_win", "target": 3, "reward": {"ryo": 200, "items": {"exp_tome_minor": 1}}},
    {"id": "m_win_5", "name": "Win 5 Battles", "desc": "Win 5 battles (Campaign, Spire or Trials).",
     "event": "any_win", "target": 5, "reward": {"ryo": 250, "items": {}}},
    {"id": "m_summon_1", "name": "Summon Once", "desc": "Perform 1 summon at the altar.",
     "event": "summon", "target": 1, "reward": {"ryo": 0, "items": {"summon_ticket": 1}}},
    {"id": "m_levelup_1", "name": "Level Up a Hero", "desc": "Gain at least 1 hero level.",
     "event": "hero_levelup", "target": 1, "reward": {"ryo": 150, "items": {"exp_tome_minor": 1}}},
    {"id": "m_spire_1", "name": "Climb the Spire", "desc": "Win 1 Endless Spire floor.",
     "event": "spire_win", "target": 1, "reward": {"ryo": 180, "items": {}}},
]
DAILY_MISSIONS_BY_ID = {m["id"]: m for m in DAILY_MISSIONS}


def fresh_daily_state() -> dict:
    return {
        "cycle": daily_cycle_utc(),
        "missions": {m["id"]: {"progress": 0, "claimed": False} for m in DAILY_MISSIONS},
    }


# ---------------------------------------------------------------------------
# Arena (async PvP) — battles are fought against a frozen snapshot of another
# player's saved team, never live. Matchmaking picks a random snapshot from
# the pool; daily attempts are capped and reset on the same UTC cycle as
# Daily Missions. Reuses the existing turn-based battle engine on the client.
# ---------------------------------------------------------------------------
ARENA_ATTEMPTS_MAX = 5
ARENA_RATING_DEFAULT = 1000
ARENA_RATING_WIN = 20
ARENA_RATING_LOSS = 12
ARENA_WIN_REWARDS = {"ryo": 220, "hero_exp_base": 50}


def fresh_arena_daily_state() -> dict:
    return {"cycle": daily_cycle_utc(), "attempts_used": 0}


# ---------------------------------------------------------------------------
# Dynamic catalog registry — admin-created heroes & image overrides.
# Static heroes live in STATIC_CATALOG; admin additions/overrides are merged
# on top at runtime so they become fully playable (summon, battle, gallery).
# ---------------------------------------------------------------------------
ELEMENTS = list(ELEMENT_ADVANTAGE.keys())
RARITIES = ["N", "R", "SR", "SSR", "UR", "GR", "LR", "MYTHIC"]

STATIC_CATALOG = [dict(n) for n in NINJA_CATALOG]
_CUSTOM_HEROES = []
_PORTRAIT_OVERRIDES = {}


def _rebuild_catalog():
    global NINJA_CATALOG, CATALOG_BY_ID
    merged = [dict(n) for n in STATIC_CATALOG] + [dict(n) for n in _CUSTOM_HEROES]
    for n in merged:
        if n["id"] in _PORTRAIT_OVERRIDES:
            n["portrait"] = _PORTRAIT_OVERRIDES[n["id"]]
    NINJA_CATALOG = merged
    CATALOG_BY_ID = {n["id"]: n for n in merged}


def load_dynamic(custom_heroes, overrides):
    global _CUSTOM_HEROES, _PORTRAIT_OVERRIDES
    _CUSTOM_HEROES = [dict(h) for h in (custom_heroes or [])]
    _PORTRAIT_OVERRIDES = dict(overrides or {})
    _rebuild_catalog()


def upsert_custom_hero(hero):
    global _CUSTOM_HEROES
    _CUSTOM_HEROES = [h for h in _CUSTOM_HEROES if h["id"] != hero["id"]] + [dict(hero)]
    _rebuild_catalog()


def remove_custom_hero(hid):
    global _CUSTOM_HEROES
    _CUSTOM_HEROES = [h for h in _CUSTOM_HEROES if h["id"] != hid]
    _PORTRAIT_OVERRIDES.pop(hid, None)
    _rebuild_catalog()


def set_portrait_override(template_id, portrait):
    _PORTRAIT_OVERRIDES[template_id] = portrait
    _rebuild_catalog()


def clear_portrait_override(template_id):
    """Remove a static hero's portrait override, restoring its original art."""
    if template_id in _PORTRAIT_OVERRIDES:
        _PORTRAIT_OVERRIDES.pop(template_id, None)
        _rebuild_catalog()
        return True
    return False


def is_custom(hid):
    return any(h["id"] == hid for h in _CUSTOM_HEROES)


def clamp_stats(stats, rarity, role):
    """Keep admin/AI-supplied stats within a balanced band for the rarity+role."""
    base = _hero_stats(rarity, role)
    out = {}
    for k in ("hp", "atk", "def", "spd", "chakra"):
        try:
            v = int(stats.get(k, base[k]))
        except (TypeError, ValueError):
            v = base[k]
        out[k] = max(int(base[k] * 0.6), min(int(base[k] * 1.5), v))
    return out
