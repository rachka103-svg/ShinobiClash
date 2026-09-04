"""Static game catalog: fictional ninja characters, jutsu, campaign stages and combat helpers."""

import random
from typing import Optional
import hero_skills

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
RARITY_ORDER = {"N": 0, "R": 1, "SR": 2, "SSR": 3, "UR": 4, "LR": 5, "GR": 6, "MYTHIC": 7}
# NOTE: LR (5) now sits BELOW GR (6) — GR is the ascension pinnacle. This
# ordering is what stat scaling, summon weights and skill mastery all follow.
RARITY_TIERS = {k: v + 1 for k, v in RARITY_ORDER.items()}
ASCENSION_MAX = {"N": 16, "R": 16, "SR": 16, "SSR": 16, "UR": 16, "GR": 16, "LR": 16, "MYTHIC": 16}

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
# Wide progressive gaps: each tier is ~1.55x the previous, so it takes
# 3-4 evolutions (stars) of a lower rarity to match the BASE of the next.
# STAR_BONUS_PER_STAR = 0.18 → star 4 (3 evolutions) = 1.54x base, which
# roughly equals the next tier's base — exactly the intended feel.
RARITY_BASE = {
    "N":      {"hp": 500,  "atk": 75,   "def": 38,  "spd": 80,  "chakra": 95,  "crit_rate": 4,  "crit_damage": 135, "accuracy": 83, "resistance": 4},
    "R":      {"hp": 800,  "atk": 115,  "def": 60,  "spd": 95,  "chakra": 100, "crit_rate": 6,  "crit_damage": 145, "accuracy": 87, "resistance": 7},
    "SR":     {"hp": 1240, "atk": 178,  "def": 93,  "spd": 113, "chakra": 118, "crit_rate": 8,  "crit_damage": 155, "accuracy": 89, "resistance": 10},
    "SSR":    {"hp": 1920, "atk": 276,  "def": 144, "spd": 132, "chakra": 138, "crit_rate": 11, "crit_damage": 170, "accuracy": 91, "resistance": 15},
    "UR":     {"hp": 2980, "atk": 430,  "def": 224, "spd": 155, "chakra": 160, "crit_rate": 14, "crit_damage": 185, "accuracy": 93, "resistance": 20},
    "LR":     {"hp": 4620, "atk": 665,  "def": 348, "spd": 180, "chakra": 185, "crit_rate": 18, "crit_damage": 210, "accuracy": 95, "resistance": 28},
    "GR":     {"hp": 7160, "atk": 1030, "def": 540, "spd": 210, "chakra": 215, "crit_rate": 22, "crit_damage": 240, "accuracy": 96, "resistance": 36},
    "MYTHIC": {"hp": 11100,"atk": 1600, "def": 837, "spd": 244, "chakra": 250, "crit_rate": 28, "crit_damage": 280, "accuracy": 98, "resistance": 48},
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
    "osiris": "phoenix_revival",  # "Resurrection King" — thematically perfect for the revive-once mechanic
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


# ============================================================
# HERO COMBAT KIT ARCHITECTURE
# ============================================================
# Each role has a deliberately different combat identity.
#
# Attacker  = burst damage + elemental pressure
# Tank      = shields + stun + defensive control
# Assassin  = bleed + marks + execution pressure
# Mage      = burn/poison DOT + explosive AOE
# Healer    = powerful healing + regeneration/support
# Control   = stun/freeze + ATK/DEF disruption
# Bruiser   = bleed + sustained frontline damage
# Support   = healing + shielding + team utility
#
# Rarity increases power and kit complexity. Higher rarities
# receive an additional Ascendant skill through _hero_jutsus.
# ============================================================


def _effect(effect_type, chance=100, duration=2, value=0):
    """Small helper to keep combat-effect definitions consistent."""
    effect = {
        "type": effect_type,
        "chance": chance,
        "duration": duration,
    }
    if value:
        effect["value"] = value
    return effect


def _kit_support(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Guidance",
            "type": "attack",
            "power": 82 + ri * 3,
            "chakra_cost": 0,
            "chakra_gain": 34,
            "element": element,
            "description": f"A focused pulse of {el} energy that builds chakra.",
        },
        {
            "id": f"{hid}_blessing",
            "name": "Divine Blessing",
            "type": "heal",
            "power": 185 + ri * 42,
            "chakra_cost": 50 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "description": "Restores a significant amount of an ally's HP.",
        },
        {
            "id": f"{hid}_ward",
            "name": f"{first}'s Ward",
            "type": "shield",
            "power": 110 + ri * 20,
            "chakra_cost": 68 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "description": "Creates a protective ward around an ally.",
        },
    ]


def _kit_tank(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Smash",
            "type": "attack",
            "power": 100 + ri * 3,
            "chakra_cost": 0,
            "chakra_gain": 30,
            "element": element,
            "description": "A crushing frontline strike that builds chakra.",
        },
        {
            "id": f"{hid}_crush",
            "name": f"{first}'s Crushing Blow",
            "type": "attack",
            "power": 145 + ri * 18,
            "chakra_cost": 42 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect("stun", chance=3 + ri * 3, duration=1),
            ],
            "description": "A devastating blow with a chance to stun the target.",
        },
        {
            "id": f"{hid}_guard",
            "name": "Aegis Ward",
            "type": "shield",
            "power": 150 + ri * 24,
            "chakra_cost": 60 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "description": "Raises a powerful protective shield around an ally.",
        },
    ]


def _kit_assassin(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Slash",
            "type": "attack",
            "power": 112 + ri * 4,
            "chakra_cost": 0,
            "chakra_gain": 34,
            "element": element,
            "description": "A swift precision strike that builds chakra.",
        },
        {
            "id": f"{hid}_bleed",
            "name": "Severing Shadow",
            "type": "attack",
            "power": 145 + ri * 17,
            "chakra_cost": 42 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect(
                    "bleed",
                    chance=5 + ri * 4,
                    duration=3,
                    value=24 + ri * 2,
                ),
            ],
            "description": "A vicious strike that leaves the enemy bleeding.",
        },
        {
            "id": f"{hid}_execution",
            "name": f"{first}'s Execution",
            "type": "attack",
            "power": 215 + ri * 25,
            "chakra_cost": 75 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "description": "A lethal finishing strike designed to destroy weakened enemies.",
        },
    ]


def _kit_mage(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Spark",
            "type": "attack",
            "power": 95 + ri * 4,
            "chakra_cost": 0,
            "chakra_gain": 31,
            "element": element,
            "description": f"A concentrated spark of {el} magic that builds chakra.",
        },
        {
            "id": f"{hid}_curse",
            "name": "Arcane Affliction",
            "type": "attack",
            "power": 125 + ri * 15,
            "chakra_cost": 45 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect(
                    "burn" if element in ("Fire", "Light") else "poison",
                    chance=5 + ri * 4,
                    duration=3,
                    value=22 + ri * 2,
                ),
            ],
            "description": "Inflicts a lingering elemental affliction on the target.",
        },
        {
            "id": f"{hid}_nova",
            "name": f"{element} Nova",
            "type": "aoe",
            "power": 175 + ri * 21,
            "chakra_cost": 78 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "description": f"A catastrophic eruption of {el} magic strikes every enemy.",
        },
    ]


def _kit_healer(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Mend",
            "type": "attack",
            "power": 78 + ri * 3,
            "chakra_cost": 0,
            "chakra_gain": 33,
            "element": element,
            "description": "A modest elemental strike that builds chakra.",
        },
        {
            "id": f"{hid}_renewal",
            "name": f"{first}'s Renewal",
            "type": "heal",
            "power": 240 + ri * 45,
            "chakra_cost": 52 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "description": "Restores a massive amount of HP to a wounded ally.",
        },
        {
            "id": f"{hid}_sanctuary",
            "name": "Sacred Sanctuary",
            "type": "shield",
            "power": 130 + ri * 23,
            "chakra_cost": 72 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "description": "Places a powerful protective barrier on an endangered ally.",
        },
    ]


def _kit_control(hid, element, el, first, ri):
    control_effect = "freeze" if element in ("Water", "Wind") else "stun"

    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Snare",
            "type": "attack",
            "power": 88 + ri * 3,
            "chakra_cost": 0,
            "chakra_gain": 32,
            "element": element,
            "description": f"A binding lash of {el} energy that builds chakra.",
        },
        {
            "id": f"{hid}_disable",
            "name": f"{first}'s Grasp",
            "type": "attack",
            "power": 130 + ri * 16,
            "chakra_cost": 45 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect(
                    control_effect,
                    chance=3 + ri * 3,
                    duration=1,
                ),
            ],
            "description": "Disrupts the enemy and may prevent their next action.",
        },
        {
            "id": f"{hid}_weakness",
            "name": "Shattering Curse",
            "type": "aoe",
            "power": 115 + ri * 15,
            "chakra_cost": 72 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect(
                    "def_down",
                    chance=8 + ri * 4,
                    duration=2,
                    value=18 + ri * 2,
                ),
            ],
            "description": "Damages all enemies and weakens their defenses.",
        },
    ]


def _kit_bruiser(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Haymaker",
            "type": "attack",
            "power": 108 + ri * 4,
            "chakra_cost": 0,
            "chakra_gain": 29,
            "element": element,
            "description": "A brutal frontline blow that builds chakra.",
        },
        {
            "id": f"{hid}_maul",
            "name": "Relentless Maul",
            "type": "attack",
            "power": 165 + ri * 19,
            "chakra_cost": 44 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "effects": [
                _effect(
                    "bleed",
                    chance=5 + ri * 4,
                    duration=3,
                    value=20 + ri * 2,
                ),
            ],
            "description": "A savage attack that leaves the target bleeding.",
        },
        {
            "id": f"{hid}_rampage",
            "name": f"{element} Rampage",
            "type": "aoe",
            "power": 155 + ri * 19,
            "chakra_cost": 76 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "description": f"A violent {el} rampage crashes into every enemy.",
        },
    ]


def _kit_attacker(hid, element, el, first, ri):
    return [
        {
            "id": f"{hid}_b",
            "name": f"{element} Strike",
            "type": "attack",
            "power": 110 + ri * 4,
            "chakra_cost": 0,
            "chakra_gain": 31,
            "element": element,
            "description": f"A direct strike infused with {el} energy.",
        },
        {
            "id": f"{hid}_burst",
            "name": f"{first}'s Onslaught",
            "type": "attack",
            "power": 205 + ri * 24,
            "chakra_cost": 48 + ri * 2,
            "chakra_gain": 0,
            "element": element,
            "description": "An overwhelming burst of concentrated power.",
        },
        {
            "id": f"{hid}_cataclysm",
            "name": f"{element} Cataclysm",
            "type": "aoe",
            "power": 160 + ri * 20,
            "chakra_cost": 78 + ri * 3,
            "chakra_gain": 0,
            "element": element,
            "description": f"A destructive wave of {el} energy devastates all enemies.",
        },
    ]


def _kit_default(hid, element, el, first, ri):
    return _kit_attacker(hid, element, el, first, ri)


# ============================================================
# ROLE -> KIT BUILDER
# ============================================================

_ROLE_KIT_BUILDERS = {
    "Attacker": _kit_attacker,
    "Support": _kit_support,
    "Tank": _kit_tank,
    "Assassin": _kit_assassin,
    "Mage": _kit_mage,
    "Healer": _kit_healer,
    "Control": _kit_control,
    "Bruiser": _kit_bruiser,
}


def _add_ascendant_skill(kit, hid, name, element, el, role, ri):
    """Adds a genuinely role-specific ultimate for high-rarity heroes."""

    first = name.split(" ")[0]

    if role == "Tank":
        skill = {
            "id": f"{hid}_asc",
            "name": f"{first}'s Fortress",
            "type": "shield",
            "power": 230 + ri * 30,
            "chakra_cost": 105,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "description": "An ascendant defensive technique that creates an immense protective barrier.",
        }

    elif role == "Assassin":
        skill = {
            "id": f"{hid}_asc",
            "name": f"{first}'s Final Execution",
            "type": "attack",
            "power": 300 + ri * 32,
            "chakra_cost": 110,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "description": "An ultimate assassination technique capable of obliterating weakened targets.",
        }

    elif role == "Mage":
        skill = {
            "id": f"{hid}_asc",
            "name": f"{element} Apocalypse",
            "type": "aoe",
            "power": 245 + ri * 30,
            "chakra_cost": 110,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "effects": [
                _effect(
                    "burn" if element in ("Fire", "Light") else "poison",
                    chance=100,
                    duration=3,
                    value=28 + ri * 2,
                ),
            ],
            "description": f"An apocalyptic eruption of {el} magic engulfs the battlefield.",
        }

    elif role == "Healer":
        skill = {
            "id": f"{hid}_asc",
            "name": f"{first}'s Miracle",
            "type": "heal",
            "power": 300 + ri * 45,
            "chakra_cost": 105,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "description": "An ascendant restoration capable of saving an ally from near defeat.",
        }

    elif role == "Support":
        skill = {
            "id": f"{hid}_asc",
            "name": "Celestial Intervention",
            "type": "heal",
            "power": 250 + ri * 38,
            "chakra_cost": 105,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "description": "A divine intervention that restores a massive amount of vitality.",
        }

    elif role == "Control":
        skill = {
            "id": f"{hid}_asc",
            "name": "Absolute Dominion",
            "type": "aoe",
            "power": 185 + ri * 24,
            "chakra_cost": 110,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "effects": [
                _effect("stun", chance=45 + min(ri * 2, 25), duration=1),
            ],
            "description": "A battlefield-wide domination technique that can disable multiple enemies.",
        }

    elif role == "Bruiser":
        skill = {
            "id": f"{hid}_asc",
            "name": f"{first}'s Berserker Rampage",
            "type": "aoe",
            "power": 230 + ri * 28,
            "chakra_cost": 110,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "effects": [
                _effect(
                    "bleed",
                    chance=85,
                    duration=3,
                    value=25 + ri * 2,
                ),
            ],
            "description": "An unstoppable rampage that tears through every enemy.",
        }

    else:
        skill = {
            "id": f"{hid}_asc",
            "name": f"{first}'s Ascension",
            "type": "aoe",
            "power": 260 + ri * 30,
            "chakra_cost": 110,
            "chakra_gain": 0,
            "element": element,
            "ascendant": True,
            "description": f"The ultimate ascendant manifestation of {first}'s {el} power.",
        }

    kit.append(skill)

# ============================================================
# RARITY MASTERY SYSTEM
# ============================================================
# Rarity now changes gameplay mechanics, not just raw stats.
#
# N / R      = Standard kit
# SR         = Improved skill power
# SSR        = Enhanced effect reliability
# UR         = Superior chakra efficiency
# GR         = Ascendant ultimate
# LR         = Mastery-enhanced combat effects
# MYTHIC     = Extreme mastery and signature-level bonuses
# ============================================================


# Status effect types whose application chance should be capped by rarity.
_STATUS_EFFECT_TYPES = frozenset({"burn", "poison", "bleed", "stun", "freeze", "atk_down", "def_down", "shock", "dispel"})
# Max status-effect chance per rarity tier. R heroes get 5-15%, scaling up
# to 60% for MYTHIC so high-rarity enemies feel dangerous without making
# low-rarity fights a CC chain.
_RARITY_EFFECT_CAP = {"N": 10, "R": 15, "SR": 20, "SSR": 25, "UR": 30, "LR": 35, "GR": 45, "MYTHIC": 60}


def _normalize_effect_chances(kit, rarity):
    """Cap status-effect application chances to rarity-appropriate levels."""
    cap = _RARITY_EFFECT_CAP.get(rarity, 15)
    skills = kit if isinstance(kit, list) else kit.get("skills", [])
    for skill in skills:
        for effect in skill.get("effects", []):
            if effect.get("type") in _STATUS_EFFECT_TYPES:
                if effect.get("chance", 0) > cap:
                    effect["chance"] = cap
    return kit


def _apply_rarity_mastery(kit, rarity, role, ri):
    """
    Enhances a generated hero kit based on rarity.

    This intentionally modifies existing skills rather than adding
    generic duplicate abilities. Higher rarities therefore feel
    mechanically stronger while preserving role identity.
    """

    # --------------------------------------------------------
    # SR — refined combat techniques
    # Small power improvement to signature abilities.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["SR"]:
        for skill in kit:
            if skill["chakra_cost"] > 0:
                skill["power"] = int(skill.get("power", 0) * 1.05)

    # --------------------------------------------------------
    # SSR — improved mastery of status effects
    # Makes effects more reliable.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["SSR"]:
        for skill in kit:
            for effect in skill.get("effects", []):
                if effect.get("chance", 0) < 100:
                    effect["chance"] = min(
                        100,
                        effect["chance"] + 5
                    )

    # --------------------------------------------------------
    # UR — superior chakra control
    # Powerful techniques become more efficient.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["UR"]:
        for skill in kit:
            cost = skill.get("chakra_cost", 0)

            if cost > 0:
                skill["chakra_cost"] = max(
                    10,
                    int(cost * 0.90)
                )

            if skill.get("chakra_gain", 0) > 0:
                skill["chakra_gain"] += 5

    # --------------------------------------------------------
    # GR — Ascendant heroes gain stronger active techniques.
    # The actual Ascendant skill is added separately.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["GR"]:
        for skill in kit:
            if skill.get("ascendant"):
                skill["power"] = int(
                    skill.get("power", 0) * 1.12
                )

    # --------------------------------------------------------
    # LR — Legendary mastery.
    #
    # Each role receives a mechanical specialization.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["LR"]:

        if role == "Assassin":
            for skill in kit:
                for effect in skill.get("effects", []):
                    if effect.get("type") == "bleed":
                        effect["duration"] += 1
                        effect["value"] = int(
                            effect.get("value", 0) * 1.25
                        )

        elif role == "Mage":
            for skill in kit:
                for effect in skill.get("effects", []):
                    if effect.get("type") in ("burn", "poison"):
                        effect["duration"] += 1
                        effect["value"] = int(
                            effect.get("value", 0) * 1.25
                        )

        elif role == "Tank":
            for skill in kit:
                if skill.get("type") == "shield":
                    skill["power"] = int(
                        skill.get("power", 0) * 1.25
                    )

        elif role == "Healer":
            for skill in kit:
                if skill.get("type") == "heal":
                    skill["power"] = int(
                        skill.get("power", 0) * 1.20
                    )

        elif role == "Control":
            for skill in kit:
                for effect in skill.get("effects", []):
                    if effect.get("type") in (
                        "stun",
                        "freeze",
                        "def_down",
                    ):
                        effect["chance"] = min(
                            100,
                            effect.get("chance", 0) + 15
                        )

        elif role == "Support":
            for skill in kit:
                if skill.get("type") in ("heal", "shield"):
                    skill["power"] = int(
                        skill.get("power", 0) * 1.18
                    )

        elif role == "Bruiser":
            for skill in kit:
                if skill.get("type") == "attack":
                    skill["power"] = int(
                        skill.get("power", 0) * 1.15
                    )

        else:  # Attacker
            for skill in kit:
                if skill.get("type") in ("attack", "aoe"):
                    skill["power"] = int(
                        skill.get("power", 0) * 1.12
                    )

    # --------------------------------------------------------
    # MYTHIC — pinnacle mastery.
    #
    # Mythic heroes receive a major improvement to their
    # signature/Ascendant abilities.
    # --------------------------------------------------------
    if ri >= RARITY_ORDER["MYTHIC"]:
        for skill in kit:

            # Ascendant becomes dramatically stronger.
            if skill.get("ascendant"):
                skill["power"] = int(
                    skill.get("power", 0) * 1.20
                )
                skill["chakra_cost"] = max(
                    40,
                    int(skill.get("chakra_cost", 0) * 0.85)
                )

            # Status effects become more reliable.
            for effect in skill.get("effects", []):
                if effect.get("chance", 0) > 0:
                    effect["chance"] = min(
                        100,
                        effect["chance"] + 10
                    )

    # Normalize: cap status-effect chances to rarity-appropriate levels so
    # lower-rarity heroes can't chain-CC enemies and high-rarity heroes feel
    # meaningfully more reliable without being guaranteed.
    _normalize_effect_chances(kit, rarity)

    return kit


def _hero_jutsus(hid, name, element, rarity, role):
    ri = RARITY_ORDER[rarity]
    first = name.split(" ")[0]
    el = element.lower()

    # Build the role-specific core kit.
    kit_builder = _ROLE_KIT_BUILDERS.get(role, _kit_default)
    kit = kit_builder(hid, element, el, first, ri)

    # LR and above receive a fourth active Ascendant ability, so elite
    # rarities are mechanically different rather than just stronger. (Threshold
    # is LR so both LR and the GR pinnacle — plus MYTHIC — receive it.)
    if ri >= RARITY_ORDER["LR"]:
        _add_ascendant_skill(kit, hid, name, element, el, role, ri)

    # Rarity mastery tunes the kit further for high rarities.
    kit = _apply_rarity_mastery(kit, rarity, role, ri)

    # Auto-generate structured descriptions with target counts
    from skill_descriptions import apply_descriptions
    apply_descriptions({"skills": kit}, role)

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
    ("brahma", "Brahma", "Creator of Worlds", "Light", "GR", "Support", "The creator god who shaped the universe from nothing."),
    ("apep", "Apep", "Chaos Serpent", "Dark", "GR", "Assassin", "The eternal chaos serpent who devours the sun each night."),
]

# Backfill the original 12 heroes with extended base_stats and ultimate abilities
for _h in _ORIGINAL_12:
    _h["base_stats"] = _hero_stats(_h["rarity"], _h["role"])
    _kit = hero_skills.get_hero_kit(_h["id"], _h["name"], _h["element"], _h["rarity"], _h["role"])
    if _kit:
        _h["jutsus"] = _kit["skills"]
    _h["passive"] = hero_skills.get_hero_passive(_h["id"], _h["role"])
    NINJA_CATALOG.append(_h)

for _hid, _name, _title, _el, _rar, _role, _lore in _HERO_DEFS:
    _kit = hero_skills.get_hero_kit(_hid, _name, _el, _rar, _role)
    NINJA_CATALOG.append({
        "id": _hid, "name": _name, "title": _title, "element": _el, "rarity": _rar,
        "role": _role, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _kit["skills"] if _kit else _hero_jutsus(_hid, _name, _el, _rar, _role),
        "passive": hero_skills.get_hero_passive(_hid, _role),
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
    ("ra", "Ra", "Sun Sovereign", "Light", "LR", "Mage", "Celestial Ascendancy", "The sun god who sails the sky each day to hold back eternal night."),
    ("fenrir", "Fenrir", "The Bound Wolf", "Dark", "GR", "Bruiser", "Nightveil Syndicate", "A monstrous wolf prophesied to break its chains at the end of the world."),
    ("perun", "Perun", "Thunder Warlord", "Lightning", "LR", "Attacker", "Stormcall Legion", "Slavic god of thunder who rides the storm astride a fiery chariot."),
    ("tlaloc", "Tlaloc", "Rainstorm Sovereign", "Water", "LR", "Control", "Tidebound Covenant", "Aztec god of rain and storm, both life-giver and destroyer."),
    ("izanami", "Izanami", "Queen of the Underworld", "Dark", "LR", "Healer", "Abyssal Depths Cabal", "Goddess of creation and death, ruling the underworld with tragic grace."),
    ("ymir", "Ymir", "Primordial Giant", "Earth", "GR", "Tank", "Ironroot Dominion", "The first giant, from whose bones and flesh the world itself was formed."),
    ("chronos", "Chronos", "Warden of Ages", "Dark", "LR", "Control", "Abyssal Depths Cabal", "The primordial embodiment of time, who can unravel a battle's very pace."),
    ("yggdrasil_spirit", "Yggdrasil", "Heart of the World Tree", "Earth", "LR", "Support", "Celestial Ascendancy", "The spirit of the world tree, whose roots and branches sustain all realms."),
]

for _hid, _name, _title, _el, _rar, _role, _fac, _lore in _HERO_DEFS_V2:
    _kit = hero_skills.get_hero_kit(_hid, _name, _el, _rar, _role)
    NINJA_CATALOG.append({
        "id": _hid, "name": _name, "title": _title, "element": _el, "rarity": _rar,
        "role": _role, "faction": _fac, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _kit["skills"] if _kit else _hero_jutsus(_hid, _name, _el, _rar, _role),
        "is_placeholder_art": True,
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
    _n.setdefault("passive", hero_skills.get_hero_passive(_n["id"], _n["role"]))
    _n.setdefault("is_placeholder_art", False)
    _n.setdefault("star_level_default", 1)

# ---------------------------------------------------------------------------
# HERO IDENTITY OVERHAUL — every hero receives combat personality beyond raw
# damage. Existing manually-authored heroes and generated heroes are enriched
# here so the entire roster uses the same combat language. Effects are attached
# deterministically from hero identity/role/element and scale upward by rarity.
# ---------------------------------------------------------------------------
_ROLE_EFFECTS = {
    "Attacker": [("burn", 8, 3, 28), ("bleed", 10, 3, 30), ("def_down", 12, 2, 18)],
    "Tank": [("stun", 5, 1, 0), ("def_down", 12, 2, 20), ("atk_down", 10, 2, 18)],
    "Support": [("atk_down", 10, 2, 15), ("def_down", 10, 2, 15), ("burn", 8, 2, 20)],
    "Assassin": [("bleed", 12, 3, 34), ("poison", 10, 3, 26), ("def_down", 12, 2, 22)],
    "Mage": [("burn", 12, 3, 34), ("poison", 10, 3, 30), ("def_down", 12, 2, 20)],
    "Healer": [("atk_down", 8, 2, 16), ("freeze", 5, 1, 0), ("def_down", 8, 2, 15)],
    "Control": [("stun", 8, 1, 0), ("freeze", 8, 1, 0), ("atk_down", 12, 2, 22)],
    "Bruiser": [("bleed", 10, 3, 30), ("stun", 5, 1, 0), ("def_down", 10, 2, 18)],
}

# Rarity-based bonus and cap for identity effects — keeps R heroes at 5-15%
# while allowing GR/MYTHIC enemies to feel dangerous.
_IDENTITY_RARITY_BONUS = {"N": 0, "R": 0, "SR": 3, "SSR": 6, "UR": 10, "LR": 14, "GR": 18, "MYTHIC": 22}
_IDENTITY_RARITY_CAP = {"N": 10, "R": 15, "SR": 20, "SSR": 25, "UR": 30, "LR": 35, "GR": 45, "MYTHIC": 60}

def _identity_effect(hero, slot):
    pool = _ROLE_EFFECTS.get(hero.get("role"), _ROLE_EFFECTS["Attacker"])
    seed = sum(ord(c) for c in hero["id"]) + slot * 7
    et, chance, duration, value = pool[seed % len(pool)]
    rarity = hero.get("rarity", "R")
    rarity_bonus = _IDENTITY_RARITY_BONUS.get(rarity, 0)
    cap = _IDENTITY_RARITY_CAP.get(rarity, 15)
    effect = {"type": et, "chance": min(cap, chance + rarity_bonus), "duration": duration}
    if value:
        effect["value"] = value + rarity_bonus // 2
    return effect

def _enrich_hero_identity(hero):
    rarity = hero.get("rarity", "R")
    rank = RARITY_ORDER.get(rarity, 1)
    active_index = 0
    for j in hero.get("jutsus", []):
        if j.get("type") not in ("attack", "aoe"):
            continue
        # Basic attacks stay simple at low rarity, but higher rarity heroes
        # increasingly bring secondary mechanics into battle.
        if active_index > 0 or rank >= RARITY_ORDER.get("SSR", 3):
            j.setdefault("effects", [])
            if not j["effects"]:
                j["effects"].append(_identity_effect(hero, active_index))
        active_index += 1
    hero["identity_rank"] = rarity

for _n in NINJA_CATALOG:
    _enrich_hero_identity(_n)

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

# ---------------------------------------------------------------------------
# 5-TIER RARITY SYSTEM. The catalog was authored across 8 legacy tiers; we
# collapse them into exactly 5 canonical tiers (R < SR < SSR < UR < GR) with
# GR as the pinnacle. UR is the pity target; GR has NO pity (super rare).
# Legacy N drops to R; the old top tiers (LR / MYTHIC) fold up into GR.
# Base stats keep their authored values so no existing hero is nerfed.
# ---------------------------------------------------------------------------
RARITY_REMAP = {"N": "R", "R": "R", "SR": "SR", "SSR": "SSR", "UR": "UR", "GR": "GR", "LR": "LR", "MYTHIC": "GR"}
for _n in NINJA_CATALOG:
    _n["rarity"] = RARITY_REMAP.get(_n["rarity"], _n["rarity"])
CATALOG_BY_ID = {n["id"]: n for n in NINJA_CATALOG}

STARTER_NINJAS = ["blaze", "ripple", "zephyr"]

# Weighted summon pool (per rarity). Lower rarity = higher chance.
# GEM banner (premium) — the standard, pity-backed rates.
SUMMON_WEIGHTS = {"R": 1000, "SR": 320, "SSR": 95, "UR": 20, "LR": 6, "GR": 2}
# GOLD/RYO banner (budget) — SUPER low chance at rare heroes and NO pity.
# Heavily floored to R/SR; UR/GR are vanishingly rare here.
GOLD_SUMMON_WEIGHTS = {"R": 4000, "SR": 520, "SSR": 60, "UR": 4, "LR": 1.5, "GR": 0.5}
# Gold (Ryo) summon cost — significantly increased from 300 to make gold
# summons a meaningful decision rather than something players can spam.
# A new player clearing Chapter 1 earns ~10k Ryo (first clears + rewards),
# so 5000 = ~2 summons per chapter of first-clear progress. Daily income
# (login + missions + stage replays + gold vault) is ~2.5k-4k Ryo, giving
# roughly 2-3 summons per day from routine play.
SUMMON_COST = 5000
# x10 Gold Summon — 8x the single cost (20% discount vs 10 individual pulls).
GOLD_SUMMON_X10_COST = 40000

# Shards gained when pulling a hero already owned (duplicate protection —
# duplicates are NEVER wasted). Lower rarity yields more shards since it's
# pulled far more often; shards feed the star-up system.
SHARD_YIELD_PER_DUPLICATE = {"R": 100, "SR": 100, "SSR": 100, "UR": 100, "LR": 100, "GR": 100, "MYTHIC": 100}
# Absolute star ceiling across all rarities (GR caps at 8). Per-rarity caps
# live in progression.MAX_STARS; use max_stars_for_rarity() for the real cap.
STAR_LEVEL_MAX = 8


def max_stars_for_rarity(rarity: str) -> int:
    """Per-rarity star cap (R=3 ... GR=8). Falls back to the absolute ceiling
    for rarities outside the ascension ladder (N / MYTHIC)."""
    import progression as _prog
    return _prog.get_max_stars_for_rarity(rarity)


def star_up_cost(rarity: str, current_star: int) -> int:
    """Shards required to raise a hero from `current_star` to `current_star + 1`."""
    ri = RARITY_ORDER[rarity]
    return round((40 + ri * 15) * (1 + 0.6 * (current_star - 1)))

# ---------------------------------------------------------------------------
# Campaign stages
# ---------------------------------------------------------------------------
_CURATED_STAGES = [
    {"id": "s1", "chapter": 1, "name": "Bandits at the Gate", "region": "Leaf Outskirts",
     "enemies": [{"template_id": "blaze", "level": 1}, {"template_id": "boulder", "level": 1}],
     "rewards": {"ryo": 150, "exp": 40}, "first_clear": {"ryo": 200, "ninja": None}},
    {"id": "s2", "chapter": 1, "name": "The Stolen Scroll", "region": "Leaf Outskirts",
     "enemies": [{"template_id": "ripple", "level": 2}, {"template_id": "spark", "level": 2}],
     "rewards": {"ryo": 170, "exp": 50}, "first_clear": {"ryo": 250, "ninja": None}},
    {"id": "s3", "chapter": 1, "name": "Forest Ambush", "region": "Misty Woods",
     "enemies": [{"template_id": "zephyr", "level": 3}, {"template_id": "boulder", "level": 3}, {"template_id": "spark", "level": 2}],
     "rewards": {"ryo": 200, "exp": 65}, "first_clear": {"ryo": 300, "ninja": "blaze", "items": {"exp_tome_minor": 2}}},
    {"id": "s4", "chapter": 2, "name": "River of Blades", "region": "Misty Woods",
     "enemies": [{"template_id": "ripple", "level": 5}, {"template_id": "frost", "level": 4}],
     "rewards": {"ryo": 230, "exp": 80}, "first_clear": {"ryo": 350, "ninja": None}},
    {"id": "s5", "chapter": 2, "name": "The Rogue Medic", "region": "Misty Woods",
     "enemies": [{"template_id": "frost", "level": 6}, {"template_id": "ripple", "level": 5}, {"template_id": "ember", "level": 5}],
     "rewards": {"ryo": 260, "exp": 95}, "first_clear": {"ryo": 400, "ninja": "ripple", "items": {"exp_tome_minor": 2}}},
    {"id": "s6", "chapter": 2, "name": "Stone Sentinels", "region": "Rocky Pass",
     "enemies": [{"template_id": "terra", "level": 7}, {"template_id": "boulder", "level": 7}],
     "rewards": {"ryo": 300, "exp": 115}, "first_clear": {"ryo": 450, "ninja": None}},
    {"id": "s7", "chapter": 3, "name": "Thunder on the Ridge", "region": "Rocky Pass",
     "enemies": [{"template_id": "spark", "level": 9}, {"template_id": "raijin", "level": 8}],
     "rewards": {"ryo": 340, "exp": 135}, "first_clear": {"ryo": 500, "ninja": "spark", "items": {"exp_tome_minor": 3}}},
    {"id": "s8", "chapter": 3, "name": "Eye of the Storm", "region": "Howling Cliffs",
     "enemies": [{"template_id": "gale", "level": 10}, {"template_id": "zephyr", "level": 9}, {"template_id": "spark", "level": 9}],
     "rewards": {"ryo": 380, "exp": 160}, "first_clear": {"ryo": 600, "ninja": None}},
    {"id": "s9", "chapter": 3, "name": "The Storm Herald", "region": "Howling Cliffs",
     "enemies": [{"template_id": "gale", "level": 13}, {"template_id": "raijin", "level": 12}],
     "rewards": {"ryo": 430, "exp": 185}, "first_clear": {"ryo": 700, "ninja": None, "items": {"summon_ticket": 1, "exp_tome_greater": 2, "ascension_crystal": 1}}},
    {"id": "s10", "chapter": 4, "name": "Shadows Gather", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "shade", "level": 14}, {"template_id": "raijin", "level": 13}, {"template_id": "ember", "level": 13}],
     "rewards": {"ryo": 500, "exp": 220}, "first_clear": {"ryo": 800, "ninja": None}},
    {"id": "s11", "chapter": 4, "name": "Light Against Dark", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "lumina", "level": 16}, {"template_id": "shade", "level": 15}],
     "rewards": {"ryo": 600, "exp": 260}, "first_clear": {"ryo": 900, "ninja": None, "items": {"summon_ticket": 1, "ascension_crystal": 3, "exp_tome_greater": 3}}},
    {"id": "s12", "chapter": 4, "name": "The Hollow Blade", "region": "Forsaken Shrine",
     "enemies": [{"template_id": "shade", "level": 18}, {"template_id": "lumina", "level": 17}, {"template_id": "gale", "level": 16}],
     "rewards": {"ryo": 800, "exp": 320}, "first_clear": {"ryo": 1500, "ninja": None, "items": {"summon_ticket": 2, "ascension_crystal": 5, "exp_tome_ancient": 1}}},
]

_CURATED_STAGES_BY_ID = {s["id"]: s for s in _CURATED_STAGES}

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
# Regions for the hand-authored Chapters 1-4 — used by the procedural stage
# filler so the generated stages 4+ in those chapters stay in-step with the
# curated first three instead of switching to the Chapter 5+ region pool.
_CURATED_CHAPTER_REGIONS = {1: "Leaf Outskirts", 2: "Misty Woods", 3: "Howling Cliffs", 4: "Forsaken Shrine"}


def _rarity_band_for_chapter(chapter: int) -> list:
    """Which rarity tiers a chapter's regular (non-boss) enemies are drawn from.
    Scales gradually: Chapters 1-3 stay R only (approachable), 4-6 add SR,
    7-10 introduce SSR, 11+ see UR, and very late chapters see GR enemies."""
    order = ["N", "R", "SR", "SSR", "UR", "GR", "LR", "MYTHIC"]
    if chapter <= 3:
        return ["R"]
    elif chapter <= 6:
        return ["R", "SR"]
    elif chapter <= 10:
        return ["SR", "SSR"]
    elif chapter <= 15:
        return ["SSR", "UR"]
    elif chapter <= 25:
        return ["UR", "GR"]
    else:
        return ["GR", "LR", "MYTHIC"]


def _boss_rarity_for_chapter(chapter: int) -> list:
    """Boss rarity scales more aggressively than regular mobs — bosses are
    always at least one tier above the regular enemy band."""
    if chapter <= 3:
        return ["R", "SR"]
    elif chapter <= 6:
        return ["SR", "SSR"]
    elif chapter <= 10:
        return ["SSR", "UR"]
    elif chapter <= 15:
        return ["UR", "GR"]
    elif chapter <= 25:
        return ["GR", "LR"]
    else:
        return ["LR", "MYTHIC"]


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
    "tsukuyomi_dreamlord": {
        "name": "Dreamlord's Descent",
        "phases": [
            {"hp_above": 60, "behavior": "normal", "atk_mult": 1.15, "spd_mult": 1.0},
            {"hp_between": [25, 60], "behavior": "empowered", "atk_mult": 1.45, "spd_mult": 1.35, "shield_pct": 15},
            {"hp_below": 25, "behavior": "desperation", "atk_mult": 2.0, "spd_mult": 1.5, "shield_pct": 25, "lifesteal_pct": 15},
        ],
        "summons_adds_at_pct": 50,
        "immune_to": ["stun", "freeze"],
    },
}


def _enemy_gear_bonuses(chapter: int, is_boss: bool, stage_rng) -> dict:
    """Legacy gear bonus — kept for backward compatibility with any code
    that still calls it directly. New enemy generation uses the centralized
    enemy_progression system which computes REAL gear stats from actual
    gear pieces, enhancement levels, set bonuses, and crystals."""
    # Delegate to the progression system for consistent values
    from enemy_progression import get_enemy_progression, compute_enemy_gear_bonus
    prog = get_enemy_progression(
        mode="campaign", chapter=chapter, is_boss=is_boss,
        base_level=max(1, chapter * 5),
    )
    # Return only the pct portion for backward-compatible callers
    bonus = compute_enemy_gear_bonus(prog, {"id": "_legacy", "rarity": "R", "role": "Attacker"})
    return {k: v for k, v in bonus.items() if k.endswith("_pct")}


def _build_enemy_team(chapter, candidates, pool_by_rarity, stage_rng, count, base_level, stage_i=1) -> list:
    """Build an enemy team with intelligent composition that scales with
    chapter progression. Early chapters use random attackers; mid/late
    chapters form synergistic teams with tanks, healers, supports, and
    damage dealers. Progression enrichment is deferred to API call time
    via enrich_stage_enemies() to avoid circular imports at module load."""
    if chapter <= 3 or count <= 1:
        return [{"template_id": stage_rng.choice(candidates), "level": base_level + stage_rng.randint(0, 2)} for _ in range(count)]

    by_role = {}
    for tid in candidates:
        tmpl = CATALOG_BY_ID.get(tid)
        if not tmpl:
            continue
        by_role.setdefault(tmpl["role"], []).append(tid)

    tanks = by_role.get("Tank", []) or by_role.get("Bruiser", []) or candidates
    healers = by_role.get("Healer", []) or by_role.get("Support", []) or []
    supports = by_role.get("Support", []) or by_role.get("Control", []) or []
    damage = by_role.get("Attacker", []) or by_role.get("Assassin", []) or by_role.get("Mage", []) or candidates
    control = by_role.get("Control", []) or by_role.get("Mage", []) or []

    raw = []
    if count >= 3 and chapter >= 7:
        raw.append({"template_id": stage_rng.choice(tanks), "level": base_level + stage_rng.randint(0, 2)})
        if healers and chapter >= 10:
            raw.append({"template_id": stage_rng.choice(healers), "level": base_level + stage_rng.randint(0, 1)})
        elif supports:
            raw.append({"template_id": stage_rng.choice(supports), "level": base_level + stage_rng.randint(0, 1)})
        else:
            raw.append({"template_id": stage_rng.choice(damage), "level": base_level + stage_rng.randint(0, 2)})
        for _ in range(count - 2):
            if chapter >= 15 and control and stage_rng.random() > 0.6:
                raw.append({"template_id": stage_rng.choice(control), "level": base_level + stage_rng.randint(0, 2)})
            else:
                raw.append({"template_id": stage_rng.choice(damage), "level": base_level + stage_rng.randint(0, 2)})
    elif count >= 2 and chapter >= 5:
        raw.append({"template_id": stage_rng.choice(damage), "level": base_level + stage_rng.randint(0, 2)})
        if tanks and stage_rng.random() > 0.4:
            raw.append({"template_id": stage_rng.choice(tanks), "level": base_level + stage_rng.randint(0, 2)})
        else:
            raw.append({"template_id": stage_rng.choice(damage), "level": base_level + stage_rng.randint(0, 2)})
        for _ in range(count - 2):
            raw.append({"template_id": stage_rng.choice(candidates), "level": base_level + stage_rng.randint(0, 2)})
    else:
        raw = [{"template_id": stage_rng.choice(candidates), "level": base_level + stage_rng.randint(0, 2)} for _ in range(count)]

    return raw


def _build_boss_stage(sid, chapter, region, base_level, candidates, pool_by_rarity, stage_rng) -> dict:
    boss_band = _boss_rarity_for_chapter(chapter)
    boss_candidates = [tid for r in boss_band for tid in pool_by_rarity.get(r, [])] or candidates
    boss_tid = stage_rng.choice(boss_candidates)
    mech_id = "sealed_titan" if chapter % 2 == 0 else "abyssal_warden"
    boss_level_mult = 1.6 if chapter <= 5 else (1.8 + (chapter - 5) * 0.03)
    boss_level = round(base_level * boss_level_mult)
    enemies = [{"template_id": boss_tid, "level": boss_level}]
    if chapter >= 8:
        add_band = _rarity_band_for_chapter(chapter)
        add_candidates = [tid for r in add_band for tid in pool_by_rarity.get(r, [])] or candidates
        add_count = min(2, 1 + (chapter - 8) // 5)
        add_level = round(boss_level * 0.85)
        for _ in range(add_count):
            enemies.append({"template_id": stage_rng.choice(add_candidates), "level": add_level})
    return {
        "id": sid, "chapter": chapter, "name": f"{CATALOG_BY_ID[boss_tid]['name']}'s Last Stand",
        "region": region, "enemies": enemies, "is_boss": True,
        "boss_mechanic": mech_id,
        "rewards": {"ryo": 400 + chapter * 120, "exp": 150 + chapter * 45},
        "first_clear": {"ryo": 900 + chapter * 200, "ninja": None},
    }


def _build_normal_stage(sid, chapter, i, region, base_level, candidates, stage_rng) -> dict:
    count = min(3, 2 + i // 3)
    enemies = _build_enemy_team(chapter, candidates, {}, stage_rng, count, base_level, stage_i=i)
    return {
        "id": sid, "chapter": chapter, "name": f"{region} Skirmish {i}",
        "region": region, "enemies": enemies, "is_boss": False,
        "rewards": {"ryo": 220 + chapter * 60, "exp": 80 + chapter * 25},
        "first_clear": {"ryo": 400 + chapter * 100, "ninja": None},
    }


def generate_campaign_stages(start_chapter: int, end_chapter: int, stages_per_chapter: int = 6, start_i: int = 1) -> list:
    """Procedurally builds stage definitions for any chapter range. Designed
    to scale to hundreds/thousands of stages without hand-authored data or
    UI changes — Campaign/Roster already render whatever this returns.
    `start_i` lets a chapter be partially filled (used to top up the curated
    Chapters 1-4 from stage 4 up to `stages_per_chapter`)."""
    out = []
    pool_by_rarity = {}
    for tid, t in CATALOG_BY_ID.items():
        pool_by_rarity.setdefault(t["rarity"], []).append(tid)

    for chapter in range(start_chapter, end_chapter + 1):
        region = _CURATED_CHAPTER_REGIONS.get(chapter) or _CHAPTER_REGIONS[(chapter - 1) % len(_CHAPTER_REGIONS)]
        band = _rarity_band_for_chapter(chapter)
        candidates = [tid for r in band for tid in pool_by_rarity.get(r, [])] or list(CATALOG_BY_ID.keys())
        for i in range(start_i, stages_per_chapter + 1):
            is_boss = i == stages_per_chapter
            sid = f"s{12 + (chapter - start_chapter) * stages_per_chapter + i}" if start_chapter > 4 else f"c{chapter}_{i}"
            # Difficulty curve:
            #   Chapters 1-3: gentle — player feels powerful, fast progress
            #   Chapters 4-8: moderate ramp — evolution & better teams needed
            #   Chapters 9-15: steeper — gear, team composition matter
            #   Chapter 16+: demanding — optimization, transformation, elements
            if chapter <= 4:
                base_level = (chapter + i + (chapter - 1) * 3)
            elif chapter <= 8:
                base_level = (chapter * 5 + i + (chapter - 4) * 3)
            elif chapter <= 15:
                base_level = (chapter * 6 + i + (chapter - 8) * 5)
            else:
                base_level = (chapter * 7 + i + (chapter - 15) * 8)
            stage_rng = random.Random((chapter * 1000 + i))
            if is_boss:
                stage = _build_boss_stage(sid, chapter, region, base_level, candidates, pool_by_rarity, stage_rng)
            else:
                stage = _build_normal_stage(sid, chapter, i, region, base_level, candidates, stage_rng)
            out.append(stage)
    return out


# Assemble the full stage list. Curated Chapters 1-4 keep their hand-authored
# first three stages (names, regions, first-clear ninja rewards intact) and
# are topped up to 12 stages each with procedurally generated stages 4-12.
# Chapters 5+ are fully procedural — every chapter ends up with 12 stages
# (within the 10-20 per-chapter target).
STAGES = []
for _ch in range(1, 5):
    STAGES.extend([s for s in _CURATED_STAGES if s["chapter"] == _ch])
    STAGES.extend(generate_campaign_stages(_ch, _ch, stages_per_chapter=12, start_i=4))
STAGES.extend(generate_campaign_stages(5, 100, stages_per_chapter=12))
STAGES_BY_ID = {s["id"]: s for s in STAGES}


def enrich_stage_enemies(stage: dict) -> dict:
    """Enrich a stage's enemies with full RPG progression from the centralized
    enemy_progression system. Called at API serve time (not module load) to
    avoid circular imports. Adds evolved rarity, ascension, real gear stats,
    skill rank, passive status, reforge, and combat modifiers to each enemy."""
    from enemy_progression import get_enemy_progression, build_enemy, compute_enemy_stats
    from combat_modifiers import assign_combat_modifiers
    from boss_configs import get_boss_combat_modifiers
    chapter = stage.get("chapter", 1)
    is_boss = stage.get("is_boss", False)
    boss_mechanic = stage.get("boss_mechanic")
    enriched_enemies = []
    for idx, e in enumerate(stage.get("enemies", [])):
        # Skip already-enriched enemies (idempotent)
        if "stats_override" in e:
            enriched_enemies.append(e)
            continue
        tmpl = CATALOG_BY_ID.get(e.get("template_id"))
        if not tmpl:
            enriched_enemies.append(e)
            continue
        is_stage_boss = is_boss and idx == 0
        prog = get_enemy_progression(
            mode="campaign", chapter=chapter, stage=6,
            is_boss=is_stage_boss,
            base_level=e["level"],
        )
        built = build_enemy(tmpl, prog, is_boss=is_stage_boss)
        built["level"] = e["level"]
        built["progression"]["level"] = e["level"]
        built["stats_override"] = compute_enemy_stats(tmpl, {**prog, "level": e["level"]})

        # For boss stages with a boss mechanic, merge mechanic-based combat modifiers
        if is_stage_boss and boss_mechanic:
            mechanic_mods = get_boss_combat_modifiers(boss_mechanic)
            if mechanic_mods:
                existing_mods = built.get("combat_modifiers", {})
                merged = {**existing_mods, **mechanic_mods}
                built["combat_modifiers"] = merged

        enriched_enemies.append(built)
    return {**stage, "enemies": enriched_enemies}


# ---------------------------------------------------------------------------
# Chapter presentation metadata — purely descriptive (name + one-line lore)
# for the World Map. Adds zero new gameplay data; chapters 1-4 get hand
# -written lore matching their curated stage names, chapters 5+ (procedural)
# derive a short line from their assigned region so the map never shows a
# blank/missing chapter card as new content slices are appended.
# ---------------------------------------------------------------------------
CHAPTER_LORE = {
    1: {"name": "Leaf Outskirts", "lore": "Bandits prowl the borderlands — your journey as a shinobi begins here."},
    2: {"name": "Misty Woods & Rocky Pass", "lore": "A rogue medic and stone sentinels guard the deep woods and mountain trail."},
    3: {"name": "Howling Cliffs", "lore": "Storms rage over the cliffs where a rebel Herald commands the winds."},
    4: {"name": "Forsaken Shrine", "lore": "Shadows gather at the old shrine — light and dark collide."},
}

# Real, art-directed backdrops land here per chapter number once produced
# (e.g. 1: "/art/campaign/ch1_leaf_outskirts.png"). Left empty for now — the
# frontend falls back to a tasteful CSS atmosphere (existing accent token +
# the shared battle backdrop) rather than any generated placeholder art, and
# picks up real art automatically the moment a path is added here, with no
# UI changes required.
# Real chapter environment art, served from the frontend's public folder.
# To swap a chapter's artwork later, just replace the file at the mapped
# path (or point the entry at a new file) — no frontend changes required.
CHAPTER_BACKGROUNDS = {
    1: "/art/chapters/chapter-1-leaf-outskirts.webp",
}

# Cycles through colors already in the existing design-token system (no new
# palette) so each chapter's temporary atmosphere still feels distinct.
_CHAPTER_ACCENTS = ["#FF5722", "#00E5FF", "#D500F9", "#FFCA28", "#00E676"]


def chapter_meta(chapter: int) -> dict:
    if chapter in CHAPTER_LORE:
        meta = CHAPTER_LORE[chapter]
    else:
        region = _CHAPTER_REGIONS[(chapter - 1) % len(_CHAPTER_REGIONS)]
        meta = {"name": region, "lore": f"An uncharted stretch of the shadow realm — few shinobi return from the {region} unscathed."}
    return {
        **meta,
        "accent": _CHAPTER_ACCENTS[(chapter - 1) % len(_CHAPTER_ACCENTS)],
        "background_image": CHAPTER_BACKGROUNDS.get(chapter),
    }


# ---------------------------------------------------------------------------
# Combat / progression helpers
# ---------------------------------------------------------------------------
import random as _random
import secrets as _secrets

# Cryptographically-secure RNG for gameplay-affecting rolls (loot/drop tables,
# gear rarity/slot/substat generation, craft rarity). Kept separate from the
# `_random.Random(seed)` instances used elsewhere in this file for
# INTENTIONALLY deterministic/reproducible content (e.g. the Tsukuyomi boss
# roster and the daily shop deals, which must give every player the exact
# same result on the exact same day) — those must stay seeded and are not
# touched here.
secure_rng = _secrets.SystemRandom()


# ---------------------------------------------------------------------------
# Items, drops & progression
# ---------------------------------------------------------------------------
ITEMS = {
    "exp_tome_minor":    {"id": "exp_tome_minor", "name": "Minor EXP Tome", "type": "exp", "value": 250, "icon": "scroll", "color": "#9E9E9E", "desc": "Grants 250 EXP to a single hero."},
    "exp_tome_greater":  {"id": "exp_tome_greater", "name": "Greater EXP Tome", "type": "exp", "value": 1200, "icon": "scroll-text", "color": "#29B6F6", "desc": "Grants 1,200 EXP to a single hero."},
    "exp_tome_ancient":  {"id": "exp_tome_ancient", "name": "Ancient EXP Tome", "type": "exp", "value": 6000, "icon": "book-open", "color": "#AB47BC", "desc": "Grants 6,000 EXP to a single hero."},
    "ascension_crystal": {"id": "ascension_crystal", "name": "Ascension Crystal", "type": "material", "value": 0, "icon": "gem", "color": "#00E5FF", "desc": "Spent to ascend a hero beyond its level cap."},
    "summon_ticket":     {"id": "summon_ticket", "name": "Summon Ticket", "type": "ticket", "value": 0, "icon": "ticket", "color": "#FFCA28", "desc": "Summons a hero for free, no Ryo required."},
    "astral_sigil":      {"id": "astral_sigil", "name": "Astral Sigil", "type": "material", "value": 0, "icon": "sparkles", "color": "#64FFDA", "desc": "A rune of ascendant starlight. Consumed to transcend a hero's rarity tier toward GR."},
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
        iid, qty = secure_rng.choice(pool)
        drops[iid] = drops.get(iid, 0) + qty
    return drops


# ---------------------------------------------------------------------------
# Combat / progression helpers
# ---------------------------------------------------------------------------
HERO_MAX_LEVEL = 500
BOSS_MAX_LEVEL = 1000
ASCENSION_STEP = 25


def level_cap(rarity: str, ascension: int) -> int:
    """Levels 1-100 need NO ascension. Each ascension then unlocks +25 more
    levels (asc1->125, asc2->150, asc3->175 ...), capped at 500 for all heroes."""
    if ascension <= 0:
        return 100
    return min(HERO_MAX_LEVEL, 100 + ascension * ASCENSION_STEP)


# ---------------------------------------------------------------------------
# Centralized team slot unlock configuration.
# Slots 1–3 are always available. Slot 4 unlocks at Lv.100, slot 5 at Lv.200.
# 5 is the permanent maximum — no 6th player combat slot ever exists.
# ---------------------------------------------------------------------------
TEAM_SLOT_UNLOCKS = {4: 100, 5: 200}
MAX_TEAM_SIZE = 5


def max_team_size(level: int) -> int:
    """Squad starts at 3 slots; unlocks 4th at Lv.100 and 5th at Lv.200 (max 5)."""
    size = 3
    for slot, req_level in sorted(TEAM_SLOT_UNLOCKS.items()):
        if level >= req_level:
            size = slot
    return min(MAX_TEAM_SIZE, size)


def next_slot_level(level: int) -> Optional[int]:
    """Player level at which the next squad slot unlocks, or None if maxed."""
    for slot, req_level in sorted(TEAM_SLOT_UNLOCKS.items()):
        if level < req_level:
            return req_level
    return None


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
    """Player account level curve. Delegates to the centralized
    player_progression module so all progression balancing lives in one place."""
    import player_progression as _pp
    return _pp.xp_required_for_level(level)


def hero_exp_to_next(level: int) -> int:
    """Beginner-friendly hero EXP curve. Early experimentation is cheap;
    investment becomes meaningful only after the player has had time to build
    a roster."""
    if level < 20:
        return round(55 + (level - 1) * 32 + (level ** 2) * 1.5)
    if level < 50:
        return round(420 + (level - 20) * 72 + (level ** 2) * 2.2)
    return round(1450 + (level - 50) * 110 + (level ** 2) * 3.5)


def ascension_cost(rarity: str, ascension: int) -> dict:
    """Cost to go from `ascension` -> ascension + 1. Massively scaled so
    pushing a hero toward level 500 is a genuine long-term investment. High
    ascensions also demand rare evolution materials."""
    ri = RARITY_ORDER[rarity]
    crystals = 8 + ascension * 6 + ri * 4
    ryo = 8000 + ascension * 9000 + ri * 3000
    items = {"ascension_crystal": crystals}
    if ascension >= 4:
        items["evo_essence"] = 2 + (ascension - 4) * 2
    if ascension >= 8:
        items["celestial_core"] = 1 + (ascension - 8)
    return {"ascension_crystal": crystals, "ryo": ryo, "items": items}


# ---------------------------------------------------------------------------
# Endless Spire (ascending tower) — 1000 floors with phased progression.
# ---------------------------------------------------------------------------
SPIRE_MAX_FLOOR = 1000

# Six progression phases. Each defines the enemy level band and stat
# multiplier band for its floor range; the actual values are linearly
# interpolated within the phase so transitions are smooth (no sudden walls).
SPIRE_PHASES = [
    # name,              min,  max,  lvl_s, lvl_e, mult_s, mult_e, reward_mult
    ("Onboarding",         1,   50,     2,    30,    1.0,    1.3,   1.0),
    ("Early Progression", 51,  150,    30,    70,    1.3,    1.8,   1.5),
    ("Midgame",          151,  350,    70,   140,    1.8,    2.8,   2.5),
    ("Advanced",         351,  600,   140,   220,    2.8,    4.5,   4.0),
    ("Endgame",          601,  850,   220,   300,    4.5,    7.0,   6.0),
    ("Ascendant",        851, 1000,   300,   380,    7.0,   10.0,   9.0),
]

# Gradual rarity probability per phase (sums to 1.0). Higher phases shift
# toward rarer enemies — but never jumps all-at-once; the interpolation
# between phases blends the probabilities smoothly.
SPIRE_RARITY_PROBS = [
    {"R": 0.70, "SR": 0.25, "SSR": 0.05, "UR": 0.00, "GR": 0.00},  # 1 Onboarding
    {"R": 0.35, "SR": 0.40, "SSR": 0.20, "UR": 0.05, "GR": 0.00},  # 2 Early
    {"R": 0.10, "SR": 0.25, "SSR": 0.35, "UR": 0.25, "GR": 0.05},  # 3 Midgame
    {"R": 0.00, "SR": 0.10, "SSR": 0.25, "UR": 0.40, "GR": 0.25},  # 4 Advanced
    {"R": 0.00, "SR": 0.00, "SSR": 0.15, "UR": 0.35, "GR": 0.50},  # 5 Endgame
    {"R": 0.00, "SR": 0.00, "SSR": 0.05, "UR": 0.25, "GR": 0.70},  # 6 Ascendant
]

# Boss floors: 10, 25, 50, 75, 100, then every 50 up to 1000.
SPIRE_BOSS_FLOORS = frozenset(
    {10, 25, 50, 75, 100} | {f for f in range(150, 1001, 50)}
)
# Major milestone floors with special rewards.
SPIRE_MILESTONE_FLOORS = frozenset({100, 250, 500, 750, 1000})


def _spire_phase_for(floor: int) -> int:
    """Returns the 0-based phase index for a floor (clamped to 0-5)."""
    for i, (_, lo, hi, *_rest) in enumerate(SPIRE_PHASES):
        if lo <= floor <= hi:
            return i
    return len(SPIRE_PHASES) - 1


def _spire_lerp(floor: int, phase_idx: int, start: float, end: float) -> float:
    """Linear interpolation of a value within a phase, based on floor."""
    _, lo, hi, *_ = SPIRE_PHASES[phase_idx]
    t = (floor - lo) / max(1, hi - lo)
    return start + t * (end - start)


def spire_floor_config(floor: int) -> dict:
    """Deterministic procedural config for a single Spire floor. All tuning
    constants are centralized above so the curve can be adjusted in one place."""
    floor = max(1, min(floor, SPIRE_MAX_FLOOR))
    pi = _spire_phase_for(floor)
    name, lo, hi, lvl_s, lvl_e, mult_s, mult_e, reward_mult = SPIRE_PHASES[pi]

    enemy_level = round(_spire_lerp(floor, pi, lvl_s, lvl_e))
    stat_mult = round(_spire_lerp(floor, pi, mult_s, mult_e), 3)
    is_boss = floor in SPIRE_BOSS_FLOORS
    is_milestone = floor in SPIRE_MILESTONE_FLOORS
    team_size = 3 if floor >= 10 else 2

    # Blend rarity probabilities between the current and next phase for a
    # smooth transition (weighted by how far through the phase we are).
    _, plo, phi, *_ = SPIRE_PHASES[pi]
    t = (floor - plo) / max(1, phi - plo)
    probs_here = SPIRE_RARITY_PROBS[pi]
    probs_next = SPIRE_RARITY_PROBS[min(pi + 1, len(SPIRE_RARITY_PROBS) - 1)]
    rarity_probs = {r: round(probs_here[r] * (1 - t) + probs_next[r] * t, 4)
                    for r in probs_here}

    return {
        "floor": floor,
        "phase": name,
        "phase_idx": pi + 1,
        "enemy_level": enemy_level,
        "stat_mult": stat_mult,
        "rarity_probs": rarity_probs,
        "team_size": team_size,
        "is_boss": is_boss,
        "is_milestone": is_milestone,
        "reward_mult": reward_mult,
    }


def spire_rewards(floor: int, advancing: bool) -> dict:
    cfg = spire_floor_config(floor)
    base_ryo = 100 + floor * 25
    base_exp = 30 + floor * 10
    rm = cfg["reward_mult"]
    boss = cfg["is_boss"]
    milestone = cfg["is_milestone"]

    ryo = round(base_ryo * rm)
    hero_exp = round(base_exp * rm)
    if boss:
        ryo = round(ryo * 1.5)
        hero_exp = round(hero_exp * 1.5)

    if advancing:
        if milestone:
            items = {"ascension_crystal": 5, "summon_ticket": 3,
                     "exp_tome_greater": 3, "lunar_essence": 1}
        elif boss:
            items = {"ascension_crystal": 2, "summon_ticket": 1, "exp_tome_greater": 1}
        else:
            items = {"exp_tome_minor": 2}
            if floor % 3 == 0:
                items["exp_tome_greater"] = 1
    else:  # replay / farming -> reduced, no premium materials
        ryo = round(ryo * 0.4)
        hero_exp = round(hero_exp * 0.4)
        items = {"exp_tome_minor": 1}
    return {"ryo": ryo, "hero_exp_base": hero_exp, "items": items,
            "boss": boss, "milestone": milestone}


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
ENERGY_COST = {"campaign": 10, "spire": 0, "trial": 8, "tsukuyomi": 0}


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
     "event": "campaign_win", "target": 3, "reward": {"ryo": 200, "gems": 0, "items": {"exp_tome_minor": 1}}},
    {"id": "m_win_5", "name": "Win 5 Battles", "desc": "Win 5 battles (Campaign, Spire or Trials).",
     "event": "any_win", "target": 5, "reward": {"ryo": 250, "gems": 0, "items": {}}},
    {"id": "m_summon_1", "name": "Summon Once", "desc": "Perform 1 summon at the altar.",
     "event": "summon", "target": 1, "reward": {"ryo": 0, "gems": 5, "items": {"summon_ticket": 1}}},
    {"id": "m_levelup_1", "name": "Level Up a Hero", "desc": "Gain at least 1 hero level.",
     "event": "hero_levelup", "target": 1, "reward": {"ryo": 150, "gems": 0, "items": {"exp_tome_minor": 1}}},
    {"id": "m_spire_1", "name": "Climb the Spire", "desc": "Win 1 Endless Spire floor.",
     "event": "spire_win", "target": 1, "reward": {"ryo": 180, "gems": 10, "items": {}}},
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
# Gems — scarcer premium currency, separate from Ryo. Spent on premium
# summons and instant Energy refills. Earned only from meaningful moments
# (missions above, first-time Campaign clears, Arena/Spire milestones and
# the daily login streak) — never from ordinary repeat battle wins, so it
# keeps feeling valuable instead of trickling in like Ryo.
# ---------------------------------------------------------------------------
GEM_SUMMON_COST = 150
GEM_ENERGY_REFILL_COST_PER_POINT = 4
GEM_ENERGY_REFILL_MIN_COST = 15

ARENA_WIN_MILESTONE_EVERY = 5      # every 5th Arena win
ARENA_WIN_MILESTONE_GEMS = 20

# Spire gem rewards: boss floors give gems; major milestones give big bonuses.
SPIRE_BOSS_GEMS_BASE = 30
SPIRE_MILESTONE_GEMS_BASE = 200


def first_clear_gems(chapter: int) -> int:
    """Small, chapter-scaled Gem bonus for a Campaign stage's first clear."""
    return min(60, 8 + max(1, chapter) * 3)


# 7-day repeating daily-login reward cycle. Consecutive calendar days (UTC)
# advance the cycle; missing a day resets it back to day 1.
LOGIN_REWARDS = {
    1: {"ryo": 200, "gems": 0, "items": {}},
    2: {"ryo": 150, "gems": 0, "items": {"exp_tome_minor": 1}},
    3: {"ryo": 100, "gems": 15, "items": {}},
    4: {"ryo": 250, "gems": 0, "items": {"exp_tome_minor": 1}},
    5: {"ryo": 150, "gems": 20, "items": {}},
    6: {"ryo": 200, "gems": 0, "items": {"exp_tome_greater": 1}},
    7: {"ryo": 300, "gems": 50, "items": {"summon_ticket": 1}},
}


def fresh_login_state() -> dict:
    return {"day": 0, "last_claim_date": None}


# ---------------------------------------------------------------------------
# Dynamic catalog registry — admin-created heroes & image overrides.
# Static heroes live in STATIC_CATALOG; admin additions/overrides are merged
# on top at runtime so they become fully playable (summon, battle, gallery).
# ---------------------------------------------------------------------------
ELEMENTS = list(ELEMENT_ADVANTAGE.keys())
RARITIES = ["R", "SR", "SSR", "UR", "LR", "GR"]

STATIC_CATALOG = [dict(n) for n in NINJA_CATALOG]
_CUSTOM_HEROES = []
_PORTRAIT_OVERRIDES = {}
_HERO_OVERRIDES = {}


# ---------------------------------------------------------------------------
# Skill Description Generator — produces clean, player-facing descriptions
# that replace internal effect terminology (atk_down, curse_dot, etc.) with
# readable text ("reduce ATK by 20% for 2 turns").
# ---------------------------------------------------------------------------
_MAGIC_ROLES = {"Mage", "Healer", "Support", "Control"}

_EFFECT_LABELS = {
    "burn":        lambda e: f"{_chance(e)}chance to Burn",
    "poison":      lambda e: f"{_chance(e)}chance to Poison",
    "bleed":       lambda e: f"{_chance(e)}chance to Bleed",
    "stun":        lambda e: f"{_chance(e)}chance to Stun for {_dur(e)} turn(s)",
    "freeze":      lambda e: f"{_chance(e)}chance to Freeze for {_dur(e)} turn(s)",
    "atk_down":    lambda e: f"{_chance(e)}chance to reduce ATK by {e.get('value', 0)}% for {_dur(e)} turns",
    "def_down":    lambda e: f"{_chance(e)}chance to reduce DEF by {e.get('value', 0)}% for {_dur(e)} turns",
    "shock":       lambda e: f"{_chance(e)}chance to Shock",
    "extra_turn":  lambda e: f"{_chance(e)}chance to act again",
    "regen":       lambda e: f"Regen {e.get('value', 10)}% HP/turn for {_dur(e)} turns",
    "immunity":    lambda e: f"Immunity for {_dur(e)} turns",
    "evade":       lambda e: f"{e.get('value', 30)}% Evade for {_dur(e)} turns",
    "def_up":      lambda e: f"DEF Up {e.get('value', 20)}% for {_dur(e)} turns",
    "atk_up":      lambda e: f"ATK Up {e.get('value', 20)}% for {_dur(e)} turns",
    "spd_up":      lambda e: f"SPD Up {e.get('value', 15)}% for {_dur(e)} turns",
    "team_atk_up": lambda e: f"Team ATK Up {e.get('value', 20)}% for {_dur(e)} turns",
    "team_def_up": lambda e: f"Team DEF Up {e.get('value', 15)}% for {_dur(e)} turns",
    "taunt":       lambda e: f"Taunt for {_dur(e)} turns",
    "damage_reflect": lambda e: f"Damage Reflect {e.get('value', 20)}% for {_dur(e)} turns",
    "cleanse":     lambda e: "Cleanse debuffs",
    "dispel":      lambda e: "Dispel buffs",
    "revive_ally": lambda e: f"Revive ally at {e.get('hp_pct', 30)}% HP",
}


def _chance(e):
    c = e.get("chance", 100)
    return f"{c}% " if c < 100 else ""


def _dur(e):
    return e.get("duration", 2)


def _skill_description(jutsu, role):
    """Generate a clean, player-facing description from jutsu data."""
    jtype = jutsu.get("type", "attack")
    power = jutsu.get("power", 0)
    is_magic = role in _MAGIC_ROLES
    dmg_type = "Magic" if is_magic else "Physical"
    effects = jutsu.get("effects", [])

    parts = []

    if jtype in ("attack", "aoe"):
        parts.append(f"{power}% {dmg_type} Damage")
    elif jtype == "heal":
        parts.append(f"Restore HP ({power}% ATK)")
    elif jtype == "aoe_heal":
        parts.append(f"Restore HP to all allies ({power}% ATK)")
    elif jtype == "shield":
        parts.append(f"Grant Shield ({power}% DEF)")
    elif jtype == "taunt":
        parts.append("Taunt enemies")
    elif jtype == "team_buff":
        parts.append("Grant team buffs")
    elif jtype == "cleanse":
        parts.append("Cleanse debuffs")
    elif jtype == "revive":
        parts.append("Revive a fallen ally")
    else:
        parts.append(f"{power}% {dmg_type} Damage")

    # DEF penetration on the jutsu itself
    pen = jutsu.get("def_penetration", 0)
    if pen:
        parts.append(f"+ {pen}% DEF Penetration")

    # Effect suffixes
    for eff in effects:
        et = eff.get("type", "")
        label_fn = _EFFECT_LABELS.get(et)
        if label_fn:
            parts.append(f"+ {label_fn(eff)}")

    return " ".join(parts)


def _finalize_kit(n):
    """Ensure every hero has a separate automatic signature passive and that
    GR heroes carry an Ascendant active skill. Passive abilities are deliberately
    kept OUT of jutsus so they can never appear as selectable battle commands."""
    jutsus = n.get("jutsus")
    if not jutsus or not n.get("id"):
        return
    role = n.get("role", "Attacker")
    element = n.get("element", "Fire")
    # Regenerate clean player-facing skill descriptions
    for j in jutsus:
        j["description"] = _skill_description(j, role)
    # Legacy safety: remove any passive accidentally stored as a selectable jutsu.
    n["jutsus"] = [j for j in jutsus if j.get("type") != "passive"]
    jutsus = n["jutsus"]
    if n.get("rarity") == "GR" and not any(j.get("ascendant") for j in jutsus):
        first = n.get("name", "Hero").split(" ")[0]
        asc_type = "heal" if role in ("Support", "Healer") else "aoe"
        jutsus.append({
            "id": f"{n['id']}_asc", "name": f"{first}'s Ascension", "type": asc_type,
            "power": 260 if asc_type == "aoe" else 270,
            "chakra_cost": 115, "chakra_gain": 0, "element": element,
            "ascendant": True,
            "description": f"An ascendant {element.lower()} surge — {first}'s ultimate expression of power, unique to GR heroes.",
        })
    if "passive" not in n:
        n["passive"] = hero_skills.get_hero_passive(n["id"], role)


def _rebuild_catalog():
    global NINJA_CATALOG, CATALOG_BY_ID
    merged = [dict(n) for n in STATIC_CATALOG] + [dict(n) for n in _CUSTOM_HEROES]
    for n in merged:
        if n["id"] in _PORTRAIT_OVERRIDES:
            n["portrait"] = _PORTRAIT_OVERRIDES[n["id"]]
        if n["id"] in _HERO_OVERRIDES:
            n.update(_HERO_OVERRIDES[n["id"]])
        _finalize_kit(n)
    NINJA_CATALOG = merged
    CATALOG_BY_ID = {n["id"]: n for n in merged}
    # Re-merge nightmare boss templates so stat lookups survive catalog rebuilds,
    # applying any admin portrait/field overrides on top of the static template.
    for _nb in NIGHTMARE_BOSS_BY_ID.values():
        nb = dict(_nb)
        if nb["id"] in _PORTRAIT_OVERRIDES:
            nb["portrait"] = _PORTRAIT_OVERRIDES[nb["id"]]
        if nb["id"] in _HERO_OVERRIDES:
            nb.update(_HERO_OVERRIDES[nb["id"]])
        CATALOG_BY_ID[nb["id"]] = nb


def load_dynamic(custom_heroes, overrides, hero_overrides=None):
    global _CUSTOM_HEROES, _PORTRAIT_OVERRIDES, _HERO_OVERRIDES
    _CUSTOM_HEROES = [dict(h) for h in (custom_heroes or [])]
    _PORTRAIT_OVERRIDES = dict(overrides or {})
    _HERO_OVERRIDES = dict(hero_overrides or {})
    _rebuild_catalog()


def upsert_custom_hero(hero):
    global _CUSTOM_HEROES
    _CUSTOM_HEROES = [h for h in _CUSTOM_HEROES if h["id"] != hero["id"]] + [dict(hero)]
    _rebuild_catalog()


def remove_custom_hero(hid):
    global _CUSTOM_HEROES
    _CUSTOM_HEROES = [h for h in _CUSTOM_HEROES if h["id"] != hid]
    _PORTRAIT_OVERRIDES.pop(hid, None)
    _HERO_OVERRIDES.pop(hid, None)
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


def set_hero_override(template_id, fields):
    """Apply field-level overrides to a static hero (name, rarity, element,
    role, jutsus, base_stats, etc). The override is merged on top of the
    static catalog entry at rebuild time."""
    _HERO_OVERRIDES[template_id] = {**_HERO_OVERRIDES.get(template_id, {}), **fields}
    _rebuild_catalog()


def clear_hero_override(template_id):
    """Remove all overrides for a static hero, restoring its original values."""
    if template_id in _HERO_OVERRIDES:
        _HERO_OVERRIDES.pop(template_id, None)
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


# ===========================================================================
# PHASE J1 — LONG-TERM PROGRESSION EXPANSION
# Evolution (star breakthrough) · Gear · Crafting/Fusion · Resource Dungeons
# · Summon pity system. All config data-driven so it scales for years.
# ===========================================================================

# ---------------------------------------------------------------------------
# New materials & items (added to the existing ITEMS registry)
# ---------------------------------------------------------------------------
ITEMS.update({
    "spirit_dust":      {"id": "spirit_dust", "name": "Spirit Dust", "type": "material", "value": 0, "icon": "sparkle", "color": "#80DEEA", "desc": "Faint spiritual residue. Fuse 4 into an Evolution Essence."},
    "evo_essence":      {"id": "evo_essence", "name": "Evolution Essence", "type": "material", "value": 0, "icon": "flame", "color": "#00E676", "desc": "Condensed life force required to evolve heroes past 3 stars."},
    "celestial_core":   {"id": "celestial_core", "name": "Celestial Core", "type": "material", "value": 0, "icon": "sun", "color": "#FFC857", "desc": "A fragment of a fallen star. Gates the final evolution stages."},
    "scrap_iron":       {"id": "scrap_iron", "name": "Scrap Iron", "type": "material", "value": 0, "icon": "wrench", "color": "#9E9E9E", "desc": "Battlefield salvage. Fuse 3 into Forge Steel."},
    "forge_steel":      {"id": "forge_steel", "name": "Forge Steel", "type": "material", "value": 0, "icon": "anvil", "color": "#29B6F6", "desc": "Refined metal used to craft gear at the Forge."},
    "forge_hammer":     {"id": "forge_hammer", "name": "Forge Hammer", "type": "material", "value": 0, "icon": "hammer", "color": "#FF5722", "desc": "Consumed when enhancing gear beyond +5."},
    "gear_ticket":      {"id": "gear_ticket", "name": "Gear Summon Ticket", "type": "ticket", "value": 0, "icon": "ticket", "color": "#D500F9", "desc": "Summons a piece of gear from the Armory, no Gems required."},
    "blueprint_weapon":    {"id": "blueprint_weapon", "name": "Weapon Blueprint", "type": "blueprint", "value": 0, "icon": "scroll", "color": "#FF5722", "desc": "Craft a weapon at the Forge."},
    "blueprint_armor":     {"id": "blueprint_armor", "name": "Armor Blueprint", "type": "blueprint", "value": 0, "icon": "scroll", "color": "#29B6F6", "desc": "Craft armor at the Forge."},
    "blueprint_accessory": {"id": "blueprint_accessory", "name": "Accessory Blueprint", "type": "blueprint", "value": 0, "icon": "scroll", "color": "#00E676", "desc": "Craft an accessory at the Forge."},
    "blueprint_relic":     {"id": "blueprint_relic", "name": "Relic Blueprint", "type": "blueprint", "value": 0, "icon": "scroll", "color": "#FFC857", "desc": "Craft a relic at the Forge."},
    # --- Elemental Ascension Materials (consumed when ascending rarity tiers).
    # Architecture is in place; required only once progression.ELEMENTAL_ESSENCE_ENABLED is True.
    "fire_essence":      {"id": "fire_essence", "name": "Fire Essence", "type": "material", "value": 0, "icon": "flame", "color": "#FF5722", "desc": "Condensed flame. A future ascension material for Fire heroes."},
    "water_essence":     {"id": "water_essence", "name": "Water Essence", "type": "material", "value": 0, "icon": "droplet", "color": "#29B6F6", "desc": "Condensed tide. A future ascension material for Water heroes."},
    "earth_essence":     {"id": "earth_essence", "name": "Earth Essence", "type": "material", "value": 0, "icon": "mountain", "color": "#A1887F", "desc": "Condensed stone. A future ascension material for Earth heroes."},
    "wind_essence":      {"id": "wind_essence", "name": "Wind Essence", "type": "material", "value": 0, "icon": "wind", "color": "#00E676", "desc": "Condensed gale. A future ascension material for Wind heroes."},
    "lightning_essence": {"id": "lightning_essence", "name": "Lightning Essence", "type": "material", "value": 0, "icon": "zap", "color": "#FFCA28", "desc": "Condensed storm. A future ascension material for Lightning heroes."},
    "light_essence":     {"id": "light_essence", "name": "Light Essence", "type": "material", "value": 0, "icon": "sun", "color": "#FFD54F", "desc": "Condensed radiance. A future ascension material for Light heroes."},
    "dark_essence":      {"id": "dark_essence", "name": "Dark Essence", "type": "material", "value": 0, "icon": "moon", "color": "#7C4DFF", "desc": "Condensed shadow. A future ascension material for Dark heroes."},
})

# Battle drops now include crafting/evolution materials (long-term grind loops).
DROP_TABLE.extend([
    ("scrap_iron", 2, 26),
    ("spirit_dust", 1, 14),
])

# ---------------------------------------------------------------------------
# Leveling — EXP tomes now also consume Ryo (gold) per use, standard for the
# genre: gold + tomes are the dual cost of raw levels.
# ---------------------------------------------------------------------------
EXP_TOME_GOLD_COST = {"exp_tome_minor": 25, "exp_tome_greater": 110, "exp_tome_ancient": 500}

# ---------------------------------------------------------------------------
# Evolution (star breakthrough) — stars are gained ONLY through evolution.
# Early stars burn duplicate shards; the highest stars are gated behind rare
# evolution materials so 5-6★ remains a genuine long-term chase.
# ---------------------------------------------------------------------------
STAR_BONUS_PER_STAR = 0.18  # +18% HP/ATK/DEF per star beyond the 1st (big evolution payoff)


def evolution_cost(rarity: str, current_star: int):
    """Full cost to evolve a hero from `current_star` -> `current_star + 1`.
    Delegates to the centralized progression config (per-rarity star caps +
    shard/gold costs). Returns None when the hero is already at its rarity's
    star cap (no further evolution possible — Ascension is the next step)."""
    import progression as _prog
    return _prog.get_evolution_cost(rarity, current_star)


# ---------------------------------------------------------------------------
# GEAR SYSTEM — 4 slots · 5 rarities · main stat + substats · +15 enhance ·
# 2pc/4pc set bonuses. Gear lives on the user doc as instances.
# ---------------------------------------------------------------------------
GEAR_SLOTS = ["weapon", "armor", "accessory", "relic"]
GEAR_SLOT_META = {
    "weapon":    {"name": "Weapon", "icon": "sword", "main_stat": "atk"},
    "armor":     {"name": "Armor", "icon": "shield", "main_stat": "def"},
    "accessory": {"name": "Accessory", "icon": "gem", "main_stat": "hp"},
    "relic":     {"name": "Relic", "icon": "sparkles", "main_stat": "spd"},
}
GEAR_RARITIES = ["common", "fine", "rare", "epic", "legendary"]
GEAR_RARITY_META = {
    "common":    {"name": "Common", "color": "#9E9E9E", "mult": 1.00, "subs": 1, "tier": 1},
    "fine":      {"name": "Fine", "color": "#00E676", "mult": 1.35, "subs": 2, "tier": 2},
    "rare":      {"name": "Rare", "color": "#29B6F6", "mult": 1.80, "subs": 2, "tier": 3},
    "epic":      {"name": "Epic", "color": "#D500F9", "mult": 2.40, "subs": 3, "tier": 4},
    "legendary": {"name": "Legendary", "color": "#FFC857", "mult": 3.20, "subs": 4, "tier": 5},
}
# Base main-stat value at +0 for a COMMON piece (scaled by rarity mult + plus).
GEAR_MAIN_BASE = {"weapon": ("atk", 20), "armor": ("def", 16), "accessory": ("hp", 130), "relic": ("spd", 8)}
# Substat roll ranges (value rolled once at drop; % stats apply to hero base).
GEAR_SUBSTAT_POOL = [
    ("atk_pct", 3, 8), ("def_pct", 3, 8), ("hp_pct", 3, 8), ("spd_pct", 2, 6),
    ("atk", 6, 18), ("def", 5, 15), ("hp", 40, 120),
]
GEAR_ENHANCE_MAX = 15
GEAR_MAIN_GROWTH_PER_PLUS = 0.09  # main stat +9% (of base) per enhance level

GEAR_SETS = {
    "raider":  {"name": "Raider",  "color": "#FF5722", "bonus2": {"atk_pct": 8},  "bonus4": {"atk_pct": 20}},
    "bulwark": {"name": "Bulwark", "color": "#29B6F6", "bonus2": {"def_pct": 10}, "bonus4": {"def_pct": 18, "hp_pct": 10}},
    "vital":   {"name": "Vital",   "color": "#00E676", "bonus2": {"hp_pct": 8},   "bonus4": {"hp_pct": 22}},
    "swift":   {"name": "Swift",   "color": "#00E5FF", "bonus2": {"spd_pct": 5},  "bonus4": {"spd_pct": 12, "atk_pct": 6}},
    "shadow":  {"name": "Shadow",  "color": "#D500F9", "bonus2": {"atk_pct": 5, "spd_pct": 3}, "bonus4": {"atk_pct": 14, "spd_pct": 8}},
    "sage":    {"name": "Sage",    "color": "#FFC857", "bonus2": {"hp_pct": 5, "def_pct": 5}, "bonus4": {"atk_pct": 10, "hp_pct": 10, "def_pct": 10}},
}


def gear_main_value(slot: str, rarity: str, plus: int) -> int:
    stat, base = GEAR_MAIN_BASE[slot]
    v = base * GEAR_RARITY_META[rarity]["mult"] * (1 + GEAR_MAIN_GROWTH_PER_PLUS * plus)
    return max(1, round(v))


def roll_gear(min_tier: int = 1, max_tier: int = 3, luck: float = 0.0) -> dict:
    """Generate a new random gear instance. `min_tier`/`max_tier` bound the
    rarity band (1=common .. 5=legendary); `luck` [0..1] skews toward the top
    of the band."""
    import uuid as _uuid
    band = [r for r in GEAR_RARITIES if min_tier <= GEAR_RARITY_META[r]["tier"] <= max_tier]
    weights = []
    for i, r in enumerate(band):
        w = max(1.0, (len(band) - i) * 10 * (1 - luck) + (i + 1) * 10 * luck)
        weights.append(w)
    rarity = secure_rng.choices(band, weights=weights, k=1)[0]
    slot = secure_rng.choice(GEAR_SLOTS)
    set_id = secure_rng.choice(list(GEAR_SETS.keys()))
    n_subs = GEAR_RARITY_META[rarity]["subs"]
    subs = []
    pool = GEAR_SUBSTAT_POOL[:]
    secure_rng.shuffle(pool)
    for stat, lo, hi in pool[:n_subs]:
        subs.append({"stat": stat, "value": secure_rng.randint(lo, hi)})
    return {
        "gear_id": str(_uuid.uuid4()), "slot": slot, "set_id": set_id, "rarity": rarity,
        "plus": 0, "subs": subs, "equipped_by": None, "locked": False,
    }


def gear_stats(gear: dict) -> dict:
    """Resolved stat contribution of one piece: flat + percent buckets."""
    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}
    stat, _ = GEAR_MAIN_BASE[gear["slot"]]
    flat[stat] += gear_main_value(gear["slot"], gear["rarity"], gear.get("plus", 0))
    for s in gear.get("subs", []):
        if s["stat"].endswith("_pct"):
            pct[s["stat"][:-4]] += s["value"]
        else:
            flat[s["stat"]] += s["value"]
    return {"flat": flat, "pct": pct}


def gear_score(gear: dict) -> int:
    st = gear_stats(gear)
    f = st["flat"]
    p = st["pct"]
    score = f["hp"] * 0.35 + f["atk"] * 2.2 + f["def"] * 1.7 + f["spd"] * 3.0
    score += (p["hp"] + p["atk"] + p["def"] + p["spd"]) * 9
    score *= 1 + 0.05 * gear.get("plus", 0)
    return round(score)


def apply_gear_to_stats(base: dict, gear_list: list) -> dict:
    """Applies a hero's equipped gear (flat + % + set bonuses) to its base
    stats dict {hp,atk,def,spd,chakra}. Used by profile serialization; the
    client combat engine consumes the final serialized stats directly."""
    flat = {"hp": 0, "atk": 0, "def": 0, "spd": 0}
    pct = {"hp": 0.0, "atk": 0.0, "def": 0.0, "spd": 0.0}
    set_counts = {}
    for g in gear_list:
        st = gear_stats(g)
        for k in flat:
            flat[k] += st["flat"][k]
            pct[k] += st["pct"][k]
        set_counts[g["set_id"]] = set_counts.get(g["set_id"], 0) + 1
    for sid, cnt in set_counts.items():
        s = GEAR_SETS.get(sid)
        if not s:
            continue
        for bonus_key, need in (("bonus2", 2), ("bonus4", 4)):
            if cnt >= need:
                for stat_pct, val in s[bonus_key].items():
                    pct[stat_pct[:-4]] += val
    return {
        "hp": round((base["hp"] + flat["hp"]) * (1 + pct["hp"] / 100)),
        "atk": round((base["atk"] + flat["atk"]) * (1 + pct["atk"] / 100)),
        "def": round((base["def"] + flat["def"]) * (1 + pct["def"] / 100)),
        "spd": round((base["spd"] + flat["spd"]) * (1 + pct["spd"] / 100)),
        "chakra": base["chakra"],
    }


def gear_enhance_cost(rarity: str, plus: int) -> dict:
    """Cost to enhance from `plus` -> `plus + 1`. Hammers required past +5."""
    tier = GEAR_RARITY_META[rarity]["tier"]
    cost = {"ryo": 120 + plus * 90 + tier * 60}
    if plus >= 5:
        cost["forge_hammer"] = 1 + (plus - 5) // 4
    return cost


# ---------------------------------------------------------------------------
# Crafting & Fusion
# ---------------------------------------------------------------------------
CRAFT_RECIPES = {
    slot: {"blueprint": f"blueprint_{slot}", "forge_steel": 3, "ryo": 1200}
    for slot in GEAR_SLOTS
}
# Crafted gear rarity distribution — crafting always yields Fine or better.
CRAFT_RARITY_WEIGHTS = {"fine": 46, "rare": 34, "epic": 16, "legendary": 4}

FUSION_RECIPES = {
    "forge_steel":    {"from": "scrap_iron", "qty": 3},
    "evo_essence":    {"from": "spirit_dust", "qty": 4},
    "celestial_core": {"from": "evo_essence", "qty": 4},
}


def craft_gear(slot: str) -> dict:
    rarity = secure_rng.choices(list(CRAFT_RARITY_WEIGHTS.keys()),
                             weights=list(CRAFT_RARITY_WEIGHTS.values()), k=1)[0]
    g = roll_gear(min_tier=GEAR_RARITY_META[rarity]["tier"], max_tier=GEAR_RARITY_META[rarity]["tier"])
    g["slot"] = slot  # blueprint dictates the slot
    stat, _ = GEAR_MAIN_BASE[slot]
    return g


# ---------------------------------------------------------------------------
# RESOURCE DUNGEONS — Gold Vault / EXP Temple, 5 tiers each. Gear is no
# longer farmable here — Tsukuyomi (the Infinite Nightmare) is now the sole
# source of gear drops, keeping farming focused on one dedicated system.
# Implemented as trial-mode entries (registered into TRIALS_BY_ID) so the
# existing energy gating + battle flow works with ZERO new combat plumbing.
# ---------------------------------------------------------------------------
DUNGEONS = [
    {"id": "gold_vault", "name": "Gold Vault", "icon": "coins", "color": "#FFC857",
     "desc": "Raid the vault — the deeper you go, the bigger the Ryo haul.", "focus": "ryo"},
    {"id": "exp_temple", "name": "EXP Temple", "icon": "sparkles", "color": "#00E5FF",
     "desc": "Ancient halls overflowing with EXP tomes and spirit dust.", "focus": "tomes"},
]
DUNGEON_TIER_LEVELS = [4, 12, 22, 34, 48]
_DUNGEON_ENEMY_SETS = {
    "gold_vault":   ["spark", "zephyr", "raijin"],
    "exp_temple":   ["frost", "ember", "lumina"],
}


def _dungeon_trial_entries() -> list:
    out = []
    for d in DUNGEONS:
        roster = _DUNGEON_ENEMY_SETS[d["id"]]
        for tier in range(1, len(DUNGEON_TIER_LEVELS) + 1):
            lvl = DUNGEON_TIER_LEVELS[tier - 1]
            count = 2 if tier <= 2 else 3
            enemies = [{"template_id": roster[i % len(roster)], "level": lvl + i} for i in range(count)]
            out.append({
                "id": f"d_{d['id']}_t{tier}", "dungeon_id": d["id"], "tier": tier,
                "name": f"{d['name']} — Tier {tier}", "icon": d["icon"], "color": d["color"],
                "enemies": enemies,
                "rewards": _dungeon_reward_table(d["id"], tier),
                "gear_drop": None,
            })
    return out


def _dungeon_reward_table(dungeon_id: str, tier: int) -> dict:
    if dungeon_id == "gold_vault":
        return {"ryo": 380 + round(tier ** 1.5 * 320), "hero_exp": 30 + tier * 15,
                "items": ({"scrap_iron": tier // 2} if tier >= 2 else {})}
    # exp_temple
    tomes = [
        {"exp_tome_minor": 4},
        {"exp_tome_minor": 4, "exp_tome_greater": 1},
        {"exp_tome_greater": 3, "spirit_dust": 1},
        {"exp_tome_greater": 3, "exp_tome_ancient": 1, "spirit_dust": 2},
        {"exp_tome_ancient": 2, "exp_tome_greater": 2, "spirit_dust": 3},
    ][tier - 1]
    return {"ryo": 90 + tier * 60, "hero_exp": 40 + tier * 20, "items": tomes}


DUNGEON_TRIALS = _dungeon_trial_entries()
TRIALS_BY_ID.update({t["id"]: t for t in DUNGEON_TRIALS})


def dungeon_recommended_power(entry: dict) -> int:
    """Recommended power for trial dungeons. Uses the full progression
    power calculation when enemies have progression data, otherwise falls
    back to the base ninja_power."""
    from enemy_progression import team_recommended_power
    has_progression = any("stats_override" in e for e in entry["enemies"])
    if has_progression:
        return team_recommended_power(entry["enemies"], CATALOG_BY_ID)
    return sum(ninja_power(e["template_id"], e["level"]) for e in entry["enemies"])


# ---------------------------------------------------------------------------
# SUMMON — transparent rates, x10 pulls, rarity-tiered pity.
# MYTHIC pity: base rate pulls 1-99 · soft pity ramps 100-149 · hard pity at
# 150 · a natural MYTHIC resets the counter · featured MYTHIC is 50/50 with a
# guarantee after a loss. x10 guarantees at least one SR+.
# ---------------------------------------------------------------------------
MYTHIC_SOFT_PITY_START = 60
MYTHIC_HARD_PITY = 90
MYTHIC_SOFT_PITY_CEIL = 0.35     # ramped UR chance just before hard pity
FEATURED_MYTHIC_5050 = 0.5
TOP_RARITY = "UR"                # UR is the pity target; GR has NO pity (super rare)
X10_GUARANTEE_RARITY = "SR"      # every x10 contains at least one SR or better
GEAR_SUMMON_GEM_COST = 90
GEAR_SUMMON_RATES = {"rare": 62, "epic": 30, "legendary": 8}


def summon_rates(currency: str = "gems") -> dict:
    """Advertised per-rarity pull rates (%), derived from weights x catalog
    composition so they're always truthful. Gold/Ryo banner uses its own
    (much lower top-tier) weight table."""
    weights = GOLD_SUMMON_WEIGHTS if currency == "ryo" else SUMMON_WEIGHTS
    counts = {}
    for t in CATALOG_BY_ID.values():
        counts[t["rarity"]] = counts.get(t["rarity"], 0) + 1
    total = sum(weights.get(r, 0) * c for r, c in counts.items())
    if total <= 0:
        return {}
    return {r: round(weights.get(r, 0) * c / total * 100, 3)
            for r, c in sorted(counts.items(), key=lambda kv: RARITY_ORDER.get(kv[0], 0))}


def pity_chance(pull_number_since_last: int) -> float:
    """Probability this GEM pull is the pity target (UR) given the pity counter
    (1-based pull number since the last UR). GR has no pity — it is only
    obtainable through natural low-probability pulls from the summon pool."""
    base = (summon_rates("gems").get(TOP_RARITY, 0.05)) / 100
    n = pull_number_since_last
    if n >= MYTHIC_HARD_PITY:
        return 1.0
    if n >= MYTHIC_SOFT_PITY_START:
        ramp = (n - MYTHIC_SOFT_PITY_START) / (MYTHIC_HARD_PITY - MYTHIC_SOFT_PITY_START)
        return base + ramp * (MYTHIC_SOFT_PITY_CEIL - base)
    return base


# Backward-compatible aliases
gr_chance = pity_chance
mythic_chance = pity_chance


def fresh_pity_state() -> dict:
    return {"ur": 0, "featured_guarantee": False, "total_pulls": 0}



# ===========================================================================
# EXTENDED ITEM / MATERIAL METADATA
# Enriches ITEMS with every material id referenced across gear, crafting,
# fusion, dungeons and the new Tsukuyomi + Shop systems, so the UI always has
# a proper name / icon / color / description instead of a raw id.
# ===========================================================================
ITEMS.update({
    "gear_ticket":     {"id": "gear_ticket", "name": "Armory Ticket", "type": "ticket", "value": 0, "icon": "anvil", "color": "#7C4DFF", "desc": "Summons a piece of gear for free from the Armory."},
    "forge_hammer":    {"id": "forge_hammer", "name": "Forge Hammer", "type": "material", "value": 0, "icon": "hammer", "color": "#FF5722", "desc": "Required to enhance gear beyond +5."},
    "forge_steel":     {"id": "forge_steel", "name": "Forge Steel", "type": "material", "value": 0, "icon": "anvil", "color": "#B0BEC5", "desc": "Refined steel used to craft gear from blueprints."},
    "scrap_iron":      {"id": "scrap_iron", "name": "Scrap Iron", "type": "material", "value": 0, "icon": "box", "color": "#90A4AE", "desc": "Fuse 3 into Forge Steel."},
    "spirit_dust":     {"id": "spirit_dust", "name": "Spirit Dust", "type": "material", "value": 0, "icon": "sparkles", "color": "#80DEEA", "desc": "Fuse 4 into Evolution Essence."},
    "evo_essence":     {"id": "evo_essence", "name": "Evolution Essence", "type": "material", "value": 0, "icon": "sparkles", "color": "#D500F9", "desc": "Rare material for high-tier hero evolution."},
    "celestial_core":  {"id": "celestial_core", "name": "Celestial Core", "type": "material", "value": 0, "icon": "gem", "color": "#FFC857", "desc": "The rarest evolution material — for the final stars."},
    "blueprint_weapon":    {"id": "blueprint_weapon", "name": "Weapon Blueprint", "type": "material", "value": 0, "icon": "sword", "color": "#FF7043", "desc": "Craft a random Weapon in the Forge."},
    "blueprint_armor":     {"id": "blueprint_armor", "name": "Armor Blueprint", "type": "material", "value": 0, "icon": "shield", "color": "#42A5F5", "desc": "Craft a random Armor in the Forge."},
    "blueprint_accessory": {"id": "blueprint_accessory", "name": "Accessory Blueprint", "type": "material", "value": 0, "icon": "gem", "color": "#26C6DA", "desc": "Craft a random Accessory in the Forge."},
    "blueprint_relic":     {"id": "blueprint_relic", "name": "Relic Blueprint", "type": "material", "value": 0, "icon": "sparkles", "color": "#AB47BC", "desc": "Craft a random Relic in the Forge."},
    # --- Tsukuyomi standalone material set (dream-realm themed) ---
    "nightmare_dust":  {"id": "nightmare_dust", "name": "Nightmare Dust", "type": "material", "value": 0, "icon": "moon", "color": "#7C4DFF", "desc": "Residue of a slain dream-beast. The common spoil of Tsukuyomi."},
    "dream_fragment":  {"id": "dream_fragment", "name": "Dream Fragment", "type": "material", "value": 0, "icon": "sparkles", "color": "#B388FF", "desc": "A shard of broken illusion — an uncommon Tsukuyomi spoil."},
    "lunar_essence":   {"id": "lunar_essence", "name": "Lunar Essence", "type": "material", "value": 0, "icon": "gem", "color": "#E1BEE7", "desc": "Condensed moonlight torn from a Nightmare boss — a rare Tsukuyomi prize."},
})


# ===========================================================================
# TSUKUYOMI — the Infinite Nightmare. A gallery of 25 escalating dream-bosses.
# Each boss is stronger than the last, carries BASIC material drops plus a
# 5-10% RARE drop (a single random piece of that boss's signature GEAR SET,
# never the whole set), and supports a difficulty selector that slightly
# raises the rare rate. Runs on the exact same client battle engine.
# ===========================================================================

# Centralized Tsukuyomi scaling configuration — tune progression here without
# touching combat code. Level curve and gear bonuses ensure Stage 1 is the
# weakest encounter and Stage 25 is the strongest, with all stats scaling.
TSUKU_SCALING_CONFIG = {
    "base_level": 10,               # Stage 1 base level
    "level_per_stage": 20,           # Level increase per stage — ensures Stage N+1
                                     # normal exceeds Stage N nightmare (2.6× mult).
                                     # Stage 25 normal = 490, nightmare = 1274.
    "gear_hp_per_stage": 5.0,       # HP gear bonus per stage index
    "gear_atk_per_stage": 4.0,      # ATK gear bonus per stage index
    "gear_def_per_stage": 3.5,      # DEF gear bonus per stage index
    "gear_spd_per_stage": 2.0,      # SPD gear bonus per stage index
    "adds_start_stage": 8,          # First add appears at this stage (normal diff)
    "second_add_start_stage": 18,   # Second add appears at this stage (normal diff)
}

TSUKUYOMI_DIFFICULTIES = [
    {"id": "normal",    "name": "Normal",    "power_mult": 1.0, "rate_bonus": 0.00, "reward_mult": 1.0, "color": "#00E5FF"},
    {"id": "hard",      "name": "Hard",      "power_mult": 1.7, "rate_bonus": 0.02, "reward_mult": 1.6, "color": "#FFCA28"},
    {"id": "nightmare", "name": "Nightmare", "power_mult": 2.6, "rate_bonus": 0.04, "reward_mult": 2.4, "color": "#FF1744"},
]
TSUKU_DIFF_BY_ID = {d["id"]: d for d in TSUKUYOMI_DIFFICULTIES}

_TSUKU_EPITHETS = [
    "the Sleepless", "Dream Devourer", "the Hollow Moon", "Weaver of Fears", "the Silent Scream",
    "Eater of Hope", "the Pale Requiem", "Herald of Endless Night", "the Broken Mirror", "Shade of Regret",
    "the Drowning Lullaby", "Warden of Nightmares", "the Crimson Slumber", "Voice in the Dark", "the Fading Star",
    "Keeper of Lost Dreams", "the Withered Crown", "Bringer of Sorrow", "the Veiled Abyss", "Whisper of the Void",
    "the Last Nightmare", "Sovereign of Sleep", "the Eclipsed Heart", "Phantom of the Moon", "the Infinite Dream",
]
_TSUKU_LORE = [
    "It waits at the edge of sleep, where the moon never sets.",
    "Every dream it touches curdles into a waking terror.",
    "Those who face it forget their own names by dawn.",
    "It spins fear into silk and binds the mind in it.",
    "Its scream is silent, yet it shatters the strongest will.",
]


# ---------------------------------------------------------------------------
# Original Nightmare Boss Templates — 25 standalone boss enemies that are
# NOT part of the playable hero roster. Each is an original dream-beast with
# its own name, element, rarity, role, stats, and combat kit. Portraits
# default to a placeholder; the admin panel can upload custom art per boss.
# ---------------------------------------------------------------------------
_NIGHTMARE_BOSS_DEFS = [
    # id, name, element, rarity, role, lore
    ("nm_hollow_spawn",    "Hollow Spawn",       "Dark",      "R",      "Assassin",  "A shapeless thing born from the first dream ever dreamt."),
    ("nm_ash_revenant",    "Ash Revenant",       "Fire",      "R",      "Attacker",  "It rises from the cinders of burned-away memories."),
    ("nm_tide_wraith",     "Tide Wraith",         "Water",     "R",      "Mage",      "A drowned soul that pulls dreamers into the deep dark."),
    ("nm_gale_phantom",    "Gale Phantom",        "Wind",      "SR",     "Control",   "It howls through sleeping minds, scattering thoughts like leaves."),
    ("nm_stone_husk",      "Stone Husk",          "Earth",     "SR",     "Tank",      "A petrified nightmare too heavy for the dream to dissolve."),
    ("nm_spark_shade",     "Spark Shade",         "Lightning", "SR",     "Attacker",  "Flickering static that jolts dreamers into cold sweats."),
    ("nm_moonlit_horror",  "Moonlit Horror",      "Dark",      "SSR",    "Assassin",  "It hunts in the pale glow of a moon that does not exist."),
    ("nm_cinder_beast",    "Cinder Beast",        "Fire",      "SSR",    "Bruiser",   "A smouldering predator that feeds on the warmth of hope."),
    ("nm_frost_terror",    "Frost Terror",        "Water",     "SSR",    "Mage",      "It freezes the blood of anyone who meets its gaze."),
    ("nm_storm_nightmare", "Storm Nightmare",     "Wind",      "SSR",    "Control",   "A cyclone of regret that tears through the dreamscape."),
    ("nm_iron_dread",      "Iron Dread",          "Earth",     "UR",     "Tank",      "An armored colossus forged from the weight of unspoken fears."),
    ("nm_bolt_fiend",      "Bolt Fiend",          "Lightning", "UR",     "Attacker",  "A crackling demon that strikes faster than thought itself."),
    ("nm_shadow_sovereign","Shadow Sovereign",    "Dark",      "UR",     "Assassin",  "It rules the space between dreams where nothing is real."),
    ("nm_flame_calamity",  "Flame Calamity",      "Fire",      "UR",     "Mage",      "A living inferno that reduces dreams to white ash."),
    ("nm_tide_leviathan",  "Tide Leviathan",       "Water",     "UR",     "Tank",      "A vast serpent that drowns entire dreamscapes in a single breath."),
    ("nm_gale_apocalypse", "Gale Apocalypse",     "Wind",      "LR",     "Control",   "The final storm that unmade the first dreamer's mind."),
    ("nm_earth_titan",     "Earth Titan",         "Earth",     "LR",     "Bruiser",   "A mountain given will, crushing dreamers beneath its tread."),
    ("nm_lightning_god",   "Lightning God",       "Lightning", "LR",     "Attacker",  "A false deity of the dreamscape that smites with borrowed thunder."),
    ("nm_dark_overlord",   "Dark Overlord",       "Dark",      "LR",     "Assassin",  "The tyrant of the nightmare realm, devourer of lucid minds."),
    ("nm_solar_eclipse",   "Solar Eclipse",       "Light",     "LR",     "Support",   "A blotted sun that casts healing light into consuming shadow."),
    ("nm_inferno_lord",    "Inferno Lord",        "Fire",      "GR",     "Mage",      "A crowned flame-king whose dreamscape burns for eternity."),
    ("nm_abyss_queen",     "Abyss Queen",         "Water",     "GR",     "Healer",    "She mends nightmare-spawn with the cold of the deepest trench."),
    ("nm_void_emperor",    "Void Emperor",        "Dark",      "GR",     "Control",   "An emptiness wearing a crown, commanding the silence between dreams."),
    ("nm_celestial_dread", "Celestial Dread",    "Light",     "GR",     "Support",   "A fallen star that blesses nightmares with annihilating radiance."),
    ("nm_eternal_nightmare","Eternal Nightmare", "Dark",      "MYTHIC", "Assassin",  "The final dream — the one from which no sleeper wakes."),
]

NIGHTMARE_BOSS_TEMPLATES = []
for _hid, _name, _el, _rar, _role, _lore in _NIGHTMARE_BOSS_DEFS:
    NIGHTMARE_BOSS_TEMPLATES.append({
        "id": _hid, "name": _name, "title": _name, "element": _el, "rarity": _rar,
        "role": _role, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _hero_jutsus(_hid, _name, _el, _rar, _role),
        "passive": _passive_for(_hid, _role),
        "portrait": "/heroes/_placeholder.png",
        "is_nightmare_boss": True,
    })
NIGHTMARE_BOSS_BY_ID = {t["id"]: t for t in NIGHTMARE_BOSS_TEMPLATES}

# Merge nightmare boss templates into CATALOG_BY_ID so the progression /
# stat-computation pipeline can resolve them by template_id. They are NOT
# added to NINJA_CATALOG, so they never appear as summonable heroes.
for _nb in NIGHTMARE_BOSS_TEMPLATES:
    CATALOG_BY_ID[_nb["id"]] = _nb


def _tsukuyomi_boss_defs() -> list:
    # Use the original nightmare boss templates directly — these are
    # standalone dream-beasts, NOT heroes from the playable roster.
    templates = NIGHTMARE_BOSS_TEMPLATES
    if not templates:
        return []
    set_keys = list(GEAR_SETS.keys())
    # Adds are sampled from the regular hero catalog for variety.
    hero_ids = [hid for hid in CATALOG_BY_ID.keys() if not CATALOG_BY_ID[hid].get("is_nightmare_boss")]
    out = []
    for i, t in enumerate(templates):
        idx = i + 1
        rng = _random.Random(7000 + idx)
        adds = rng.sample(hero_ids, min(2, len(hero_ids))) if hero_ids else []
        cfg = TSUKU_SCALING_CONFIG
        boss_gear = {
            "hp_pct": round(cfg["gear_hp_per_stage"] * idx),
            "atk_pct": round(cfg["gear_atk_per_stage"] * idx),
            "def_pct": round(cfg["gear_def_per_stage"] * idx),
            "spd_pct": round(cfg["gear_spd_per_stage"] * idx),
        }
        out.append({
            "id": f"tsuku_{idx}",
            "index": idx,
            "name": f"{t['name']}, {_TSUKU_EPITHETS[i % len(_TSUKU_EPITHETS)]}",
            "template_id": t["id"],
            "portrait": t["portrait"],
            "element": t["element"],
            "rarity": t["rarity"],
            "base_level": cfg["base_level"] + (idx - 1) * cfg["level_per_stage"],
            "rare_chance": round(min(0.10, 0.05 + (i // 5) * 0.0125), 4),
            "gear_set": set_keys[i % len(set_keys)],
            "gear_set_name": GEAR_SETS[set_keys[i % len(set_keys)]]["name"],
            "gear_set_color": GEAR_SETS[set_keys[i % len(set_keys)]]["color"],
            "boss_mechanic": "tsukuyomi_dreamlord",
            "boss_gear": boss_gear,
            "adds": adds,
            "lore": _TSUKU_LORE[i % len(_TSUKU_LORE)],
        })
    return out


TSUKUYOMI_BOSSES = _tsukuyomi_boss_defs()
TSUKUYOMI_BY_ID = {b["id"]: b for b in TSUKUYOMI_BOSSES}

# Admin-managed portrait overrides for Tsukuyomi bosses (boss_id -> portrait URL).
# When set, the override is used instead of the underlying hero template's portrait.
_TSUKUYOMI_PORTRAIT_OVERRIDES: dict = {}


def load_tsukuyomi_portraits(overrides: dict):
    global _TSUKUYOMI_PORTRAIT_OVERRIDES
    _TSUKUYOMI_PORTRAIT_OVERRIDES = dict(overrides or {})


def set_tsukuyomi_portrait(boss_id: str, portrait: str):
    _TSUKUYOMI_PORTRAIT_OVERRIDES[boss_id] = portrait


def clear_tsukuyomi_portrait(boss_id: str) -> bool:
    if boss_id in _TSUKUYOMI_PORTRAIT_OVERRIDES:
        _TSUKUYOMI_PORTRAIT_OVERRIDES.pop(boss_id, None)
        return True
    return False


def tsukuyomi_enemies(boss: dict, difficulty: str = "normal") -> list:
    """Build Tsukuyomi enemy list with full RPG progression. Each enemy
    receives evolved rarity, ascension, real gear, crystals, skill rank,
    and passives from the centralized progression system."""
    from enemy_progression import get_enemy_progression, build_enemy, compute_enemy_stats
    diff = TSUKU_DIFF_BY_ID.get(difficulty, TSUKUYOMI_DIFFICULTIES[0])
    cfg = TSUKU_SCALING_CONFIG
    idx = boss.get("index", 1)
    lvl = max(1, round(boss["base_level"] * diff["power_mult"]))

    # Boss gets full progression with is_boss=True
    boss_prog = get_enemy_progression(
        mode="tsukuyomi", stage=idx, difficulty=difficulty,
        is_boss=True, base_level=lvl,
    )
    boss_tmpl = CATALOG_BY_ID.get(boss["template_id"])
    if boss_tmpl:
        boss_enemy = build_enemy(boss_tmpl, boss_prog, is_boss=True)
        boss_enemy["level"] = lvl
        boss_enemy["progression"]["level"] = lvl
        boss_enemy["stats_override"] = compute_enemy_stats(boss_tmpl, {**boss_prog, "level": lvl})

        # Attach boss mechanic combat modifiers
        from boss_configs import get_boss_combat_modifiers
        mechanic_id = boss.get("boss_mechanic")
        if mechanic_id:
            mechanic_mods = get_boss_combat_modifiers(mechanic_id)
            if mechanic_mods:
                existing = boss_enemy.get("combat_modifiers", {})
                boss_enemy["combat_modifiers"] = {**existing, **mechanic_mods}
    else:
        boss_enemy = {"template_id": boss["template_id"], "level": lvl}
    enemies = [boss_enemy]

    add_lvl = max(1, round(lvl * 0.85))

    # Adds appear based on stage index and difficulty — later stages get more adds
    add_tids = []
    if difficulty == "hard":
        add_tids = [boss["adds"][0]]
    elif difficulty == "nightmare":
        add_tids = list(boss["adds"])
    elif difficulty == "normal":
        if idx >= cfg["adds_start_stage"]:
            add_tids.append(boss["adds"][0])
        if idx >= cfg["second_add_start_stage"]:
            add_tids.append(boss["adds"][1])

    for add_tid in add_tids:
        add_tmpl = CATALOG_BY_ID.get(add_tid)
        if add_tmpl:
            add_prog = get_enemy_progression(
                mode="tsukuyomi", stage=idx, difficulty=difficulty,
                is_boss=False, base_level=add_lvl,
            )
            add_enemy = build_enemy(add_tmpl, add_prog)
            add_enemy["level"] = add_lvl
            add_enemy["progression"]["level"] = add_lvl
            add_enemy["stats_override"] = compute_enemy_stats(add_tmpl, {**add_prog, "level": add_lvl})
        else:
            add_enemy = {"template_id": add_tid, "level": add_lvl}
        enemies.append(add_enemy)

    return enemies


def _enemy_power_with_gear(enemy: dict) -> int:
    """Compute recommended power reflecting the enemy's FULL build —
    evolved rarity, ascension, gear, crystals, skill rank, and reforges.
    Falls back to legacy calculation for enemies without progression data."""
    if "stats_override" in enemy and "progression" in enemy:
        from enemy_progression import team_recommended_power
        return team_recommended_power([enemy], CATALOG_BY_ID)
    # Legacy fallback: base stats + gear_bonus percentages
    s = compute_stats(enemy["template_id"], enemy["level"])
    g = enemy.get("gear_bonus") or {}
    hp = s["hp"] * (1 + g.get("hp_pct", 0) / 100)
    atk = s["atk"] * (1 + g.get("atk_pct", 0) / 100)
    df = s["def"] * (1 + g.get("def_pct", 0) / 100)
    spd = s["spd"] * (1 + g.get("spd_pct", 0) / 100)
    return round(hp * 0.4 + atk * 2.2 + df * 1.6 + spd * 1.2 + s["chakra"] * 1.0)


def tsukuyomi_recommended_power(boss: dict, difficulty: str = "normal") -> int:
    """Recommended power reflecting the enemy's actual build — evolved
    rarity, ascension, gear, crystals, skill rank, and reforges."""
    enemies = tsukuyomi_enemies(boss, difficulty)
    return sum(_enemy_power_with_gear(e) for e in enemies)


def tsukuyomi_rewards(boss: dict, difficulty: str = "normal") -> dict:
    diff = TSUKU_DIFF_BY_ID.get(difficulty, TSUKUYOMI_DIFFICULTIES[0])
    rm = diff["reward_mult"]
    i = boss["index"]
    ryo = round((280 + i * 70) * rm)
    hero_exp = round((55 + i * 12) * rm)
    items = {
        "nightmare_dust": max(2, round((2 + i // 4) * rm)),
        "dream_fragment": 1 + (1 if difficulty != "normal" else 0),
    }
    if difficulty == "nightmare":
        items["lunar_essence"] = 1
    rare_chance = round(min(0.15, boss["rare_chance"] + diff["rate_bonus"]), 4)
    return {"ryo": ryo, "hero_exp": hero_exp, "items": items, "rare_chance": rare_chance}


def tsukuyomi_gear_drop(boss: dict, difficulty: str = "normal") -> dict:
    """Rolls ONE random gear piece from this boss's signature set (a single
    slot — weapon OR armor OR accessory OR relic, never the full set)."""
    if difficulty == "nightmare":
        band = (4, 5, 0.5)
    elif difficulty == "hard":
        band = (4, 4, 0.2)
    else:
        band = (3, 4, 0.1)
    g = roll_gear(min_tier=band[0], max_tier=band[1], luck=band[2])
    g["set_id"] = boss["gear_set"]  # force the boss's signature set
    return g


def tsukuyomi_boss_status(boss: dict, progress: dict = None, highest_cleared: int = 0) -> str:
    """Determine the sequential unlock status of a Tsukuyomi stage.

    A stage is fully cleared only when ALL difficulties (normal, hard,
    nightmare) have been beaten. The next stage unlocks exclusively when
    the previous stage is fully cleared — having enough power alone does
    NOT bypass the sequential gate.

    Returns one of: 'cleared', 'available', 'locked'.
    - cleared: all three difficulties beaten (progress[boss_id] == 'nightmare')
    - available: stage 1, or previous stage fully cleared, or partially cleared
    - locked: previous stage not yet fully cleared
    """
    idx = boss.get("index", 1)
    progress = progress or {}
    boss_id = boss["id"]

    # Fully cleared = nightmare (the highest difficulty) is done
    if progress.get(boss_id) == "nightmare":
        return "cleared"

    # Stage 1 is always playable
    if idx == 1:
        return "available"

    # If this stage already has any progress it was previously unlocked
    if boss_id in progress:
        return "available"

    # Otherwise unlock only when the previous stage is fully cleared
    prev_id = f"tsuku_{idx - 1}"
    if progress.get(prev_id) == "nightmare":
        return "available"

    return "locked"


def tsukuyomi_boss_public(boss: dict, progress: dict = None, highest_cleared: int = 0) -> dict:
    portrait = _TSUKUYOMI_PORTRAIT_OVERRIDES.get(boss["id"], boss["portrait"])
    status = tsukuyomi_boss_status(boss, progress, highest_cleared)
    lock_requirement = None
    if status == "locked":
        lock_requirement = f"Clear all difficulties of Nightmare {boss.get('index', 1) - 1} to unlock"
    return {
        **boss,
        "portrait": portrait,
        "portrait_overridden": boss["id"] in _TSUKUYOMI_PORTRAIT_OVERRIDES,
        "status": status,
        "lock_requirement": lock_requirement,
        "difficulties": [
            {**d, "recommended_power": tsukuyomi_recommended_power(boss, d["id"]),
             "enemies": tsukuyomi_enemies(boss, d["id"])}
            for d in TSUKUYOMI_DIFFICULTIES
        ],
    }


# ===========================================================================
# ITEM SHOP — spend Gems or Ryo on resource/progression consumables.
# Each entry grants direct resources (energy/ryo) and/or inventory items.
# ===========================================================================
SHOP_ITEMS = [
    # --- Gem shop (premium) ---
    {"id": "shop_energy_flask", "name": "Energy Flask", "desc": "Instantly restore 60 Energy.", "icon": "zap", "color": "#00E676", "currency": "gems", "price": 40, "grant": {"energy": 60}},
    {"id": "shop_gold_pouch", "name": "Gold Pouch", "desc": "A hefty pouch of 6,000 Ryo.", "icon": "coins", "color": "#FFCA28", "currency": "gems", "price": 50, "grant": {"ryo": 6000}},
    {"id": "shop_summon_ticket", "name": "Summon Ticket", "desc": "One free hero summon.", "icon": "ticket", "color": "#FFCA28", "currency": "gems", "price": 120, "grant": {"items": {"summon_ticket": 1}}},
    {"id": "shop_ascension", "name": "Ascension Crystals ×2", "desc": "Ascend heroes past their level cap.", "icon": "gem", "color": "#00E5FF", "currency": "gems", "price": 90, "grant": {"items": {"ascension_crystal": 2}}},
    {"id": "shop_evo_essence", "name": "Evolution Essence ×2", "desc": "Rare evolution material.", "icon": "sparkles", "color": "#D500F9", "currency": "gems", "price": 110, "grant": {"items": {"evo_essence": 2}}},
    {"id": "shop_ancient_tome", "name": "Ancient EXP Tome", "desc": "Grants 6,000 hero EXP.", "icon": "book-open", "color": "#AB47BC", "currency": "gems", "price": 70, "grant": {"items": {"exp_tome_ancient": 1}}},
    # --- Ryo shop (grind-funded) ---
    {"id": "shop_minor_tome", "name": "Minor EXP Tome ×5", "desc": "Five minor EXP tomes.", "icon": "scroll", "color": "#9E9E9E", "currency": "ryo", "price": 900, "grant": {"items": {"exp_tome_minor": 5}}},
    {"id": "shop_greater_tome", "name": "Greater EXP Tome", "desc": "Grants 1,200 hero EXP.", "icon": "scroll-text", "color": "#29B6F6", "currency": "ryo", "price": 1400, "grant": {"items": {"exp_tome_greater": 1}}},
    {"id": "shop_forge_hammer", "name": "Forge Hammer ×3", "desc": "Enhance gear beyond +5.", "icon": "hammer", "color": "#FF5722", "currency": "ryo", "price": 1800, "grant": {"items": {"forge_hammer": 3}}},
    {"id": "shop_forge_steel", "name": "Forge Steel ×5", "desc": "Craft gear from blueprints.", "icon": "anvil", "color": "#B0BEC5", "currency": "ryo", "price": 1200, "grant": {"items": {"forge_steel": 5}}},
    {"id": "shop_scrap_iron", "name": "Scrap Iron ×10", "desc": "Basic fusion material.", "icon": "box", "color": "#90A4AE", "currency": "ryo", "price": 700, "grant": {"items": {"scrap_iron": 10}}},
    # --- Blueprints (crafting) — previously a Gear Foundry drop; now sold
    # directly since gear itself is exclusively farmed via Tsukuyomi.
    {"id": "shop_blueprint_weapon", "name": "Weapon Blueprint", "desc": "Craft a random Weapon in the Forge.", "icon": "sword", "color": "#FF7043", "currency": "gems", "price": 160, "grant": {"items": {"blueprint_weapon": 1}}},
    {"id": "shop_blueprint_armor", "name": "Armor Blueprint", "desc": "Craft random Armor in the Forge.", "icon": "shield", "color": "#42A5F5", "currency": "gems", "price": 160, "grant": {"items": {"blueprint_armor": 1}}},
    {"id": "shop_blueprint_accessory", "name": "Accessory Blueprint", "desc": "Craft a random Accessory in the Forge.", "icon": "gem", "color": "#26C6DA", "currency": "gems", "price": 160, "grant": {"items": {"blueprint_accessory": 1}}},
    {"id": "shop_blueprint_relic", "name": "Relic Blueprint", "desc": "Craft a random Relic in the Forge.", "icon": "sparkles", "color": "#AB47BC", "currency": "gems", "price": 200, "grant": {"items": {"blueprint_relic": 1}}},
]
SHOP_BY_ID = {s["id"]: s for s in SHOP_ITEMS}


# ===========================================================================
# SKILLS / JUTSUS — duplicate hero shards now also rank up a hero's skills.
# A hero has a single Skill Rank (1..10). Each rank boosts the power of all
# active jutsus (+8% each) and, at PASSIVE_UNLOCK_RANK, permanently UNLOCKS
# the hero's signature passive. Shards are shared with Evolution, creating a
# meaningful choice between raw stars and stronger, passive-enabled skills.
# ===========================================================================
SKILL_RANK_MAX = 10
PASSIVE_UNLOCK_RANK = 3
RARITY_PASSIVE_UNLOCK_RANK = {"R": 5, "SR": 4, "SSR": 3, "UR": 2, "LR": 2, "GR": 2}
SKILL_POWER_PER_RANK = 0.08  # +8% jutsu power per rank beyond the 1st


def skill_power_mult(rank: int) -> float:
    return round(1 + max(0, (rank or 1) - 1) * SKILL_POWER_PER_RANK, 4)


def skill_rank_cost(rarity: str, rank: int) -> dict:
    """Shard + Ryo cost to raise Skill Rank from `rank` -> `rank + 1`."""
    ri = RARITY_ORDER.get(rarity, 1)
    shards = round((30 + ri * 12) * (1 + 0.5 * (rank - 1)))
    ryo = 600 + rank * 500 + ri * 200
    return {"shards": shards, "ryo": ryo}


def passive_unlock_rank(rarity: str) -> int:
    return RARITY_PASSIVE_UNLOCK_RANK.get(rarity, PASSIVE_UNLOCK_RANK)

def skill_public(rarity: str, rank: int) -> dict:
    rank = max(1, rank or 1)
    unlock_rank = passive_unlock_rank(rarity)
    return {
        "rank": rank,
        "rank_max": SKILL_RANK_MAX,
        "power_mult": skill_power_mult(rank),
        "passive_unlock_rank": unlock_rank,
        "passive_unlocked": rank >= unlock_rank,
        "next_cost": skill_rank_cost(rarity, rank) if rank < SKILL_RANK_MAX else None,
    }


# ===========================================================================
# REFORGE — spend duplicate hero shards to refine a hero's active jutsus,
# unlocking combat modifiers (burn, stun, extra damage, etc.). A reforge
# adds an entry to a jutsu's `effects` array (consumed by the combat engine's
# applyJutsuEffects) or a flat power bonus — so reforged skills fight
# measurably differently without any new battle code paths.
# ===========================================================================
REFORGE_MAX_PER_JUTSU = 2

REFORGE_MODIFIERS = {
    "burn":         {"id": "burn",    "name": "Ember Reforge",     "desc": "Chance to inflict Burn (fire DoT).",     "effect": {"type": "burn", "chance": 8, "duration": 3, "value": 40}},
    "poison":       {"id": "poison",  "name": "Venom Reforge",     "desc": "Chance to inflict Poison (DoT).",      "effect": {"type": "poison", "chance": 8, "duration": 3, "value": 35}},
    "bleed":        {"id": "bleed",   "name": "Razor Reforge",     "desc": "Chance to inflict Bleed (DoT).",        "effect": {"type": "bleed", "chance": 8, "duration": 3, "value": 38}},
    "stun":         {"id": "stun",    "name": "Static Reforge",    "desc": "Chance to Stun (skip target's turn).",  "effect": {"type": "stun", "chance": 5, "duration": 1}},
    "freeze":       {"id": "freeze",  "name": "Frost Reforge",     "desc": "Chance to Freeze (skip target's turn).","effect": {"type": "freeze", "chance": 5, "duration": 1}},
    "atk_down":     {"id": "atk_down", "name": "Demoralize Reforge", "desc": "Chance to lower target ATK.",        "effect": {"type": "atk_down", "chance": 10, "duration": 2, "value": 20}},
    "def_down":     {"id": "def_down", "name": "Piercing Reforge",  "desc": "Chance to lower target DEF.",        "effect": {"type": "def_down", "chance": 10, "duration": 2, "value": 20}},
    "extra_damage": {"id": "extra_damage", "name": "Power Reforge", "desc": "+12% jutsu damage.",                  "bonus_power_pct": 12},
}


def reforge_cost(rarity: str, total_reforges: int) -> dict:
    """Shard + Ryo cost to apply the NEXT reforge to a hero (scales with how
    many reforges the hero already has, so each one is a bigger investment)."""
    ri = RARITY_ORDER.get(rarity, 1)
    shards = round((45 + ri * 15) * (1 + 0.5 * total_reforges))
    ryo = 900 + total_reforges * 700 + ri * 200
    return {"shards": shards, "ryo": ryo}


def reforge_total(inst_reforge: dict) -> int:
    return sum(len(v) for v in (inst_reforge or {}).values())


# ===========================================================================
# DAILY SHOP DEALS — a few rotating discounted items, deterministic per UTC
# day so every player sees the same deals and they refresh at midnight UTC.
# ===========================================================================
DAILY_DEAL_COUNT = 3
_DEAL_DISCOUNTS = [20, 25, 30, 35, 40]


def daily_shop_deals() -> list:
    day = daily_cycle_utc()
    seed = int(day.replace("-", ""))
    rng = _random.Random(seed)
    pool = [s["id"] for s in SHOP_ITEMS]
    picks = rng.sample(pool, min(DAILY_DEAL_COUNT, len(pool)))
    out = []
    for pid in picks:
        entry = SHOP_BY_ID[pid]
        disc = rng.choice(_DEAL_DISCOUNTS)
        deal_price = max(1, round(entry["price"] * (100 - disc) / 100))
        out.append({"entry_id": pid, "discount_pct": disc, "orig_price": entry["price"], "deal_price": deal_price})
    return out


def deal_price_for(entry_id: str) -> Optional[int]:
    for d in daily_shop_deals():
        if d["entry_id"] == entry_id:
            return d["deal_price"]
    return None


# ===========================================================================
# TSUKUYOMI FIRST-CLEAR BONUS — a one-time reward the first time each boss is
# beaten on each difficulty (Normal / Hard / Nightmare).
# ===========================================================================
def tsukuyomi_first_clear_bonus(boss: dict, difficulty: str) -> dict:
    diff = TSUKU_DIFF_BY_ID.get(difficulty, TSUKUYOMI_DIFFICULTIES[0])
    i = boss["index"]
    gems = round((20 + i * 2) * diff["reward_mult"])
    items = {}
    if difficulty == "hard":
        items["summon_ticket"] = 1
    elif difficulty == "nightmare":
        items["summon_ticket"] = 1
        items["gear_ticket"] = 1
    return {"gems": gems, "items": items}


# ===========================================================================
# BEGINNER SUMMON — a one-time ×10 newbie banner. The player can re-roll the
# ×10 up to BEGINNER_MAX_REROLLS times, pinning up to BEGINNER_MAX_LOCKS cards
# so they survive re-rolls; claiming grants the shown 10 and ends it forever.
# Draws from EVERY catalog hero (standard weights, no pity / no featured).
# ===========================================================================
BEGINNER_MAX_REROLLS = 10
BEGINNER_MAX_LOCKS = 3
BEGINNER_PULL_COUNT = 10


def beginner_pool():
    """Weighted (template_id, weight) list over ALL catalog heroes."""
    out = []
    for tid, t in CATALOG_BY_ID.items():
        out.append((tid, SUMMON_WEIGHTS.get(t["rarity"], 1)))
    return out


def fresh_beginner_state() -> dict:
    return {"finished": False, "rolls_used": 0, "current": [], "locked": []}


# ===========================================================================
# FREE DAILY SUMMONS — 1 free Gem-banner pull + 3 free Ryo-banner pulls per
# UTC day, reset on the same cycle as daily missions.
# ===========================================================================
FREE_GEM_SUMMONS_PER_DAY = 1
FREE_COIN_SUMMONS_PER_DAY = 3


def fresh_free_summon_state() -> dict:
    return {"cycle": daily_cycle_utc(), "gem_used": 0, "coin_used": 0}


# ===========================================================================
# ACHIEVEMENTS — long-term goals granting currency + stat-boost items.
# `event` achievements accumulate progress from gameplay events; `metric`
# achievements derive progress live from the user's state (heroes/level/etc).
# The "beginner" category doubles as the new-player mission track.
# ===========================================================================
ACHIEVEMENTS = [
    # --- Beginner (onboarding missions) ---
    {"id": "a_first_summon", "category": "beginner", "name": "First Summon", "desc": "Perform your first summon.",
     "event": "summon", "target": 1, "reward": {"ryo": 0, "gems": 20, "items": {"summon_ticket": 1}}},
    {"id": "a_first_clear", "category": "beginner", "name": "First Victory", "desc": "Clear your first Campaign stage.",
     "event": "campaign_win", "target": 1, "reward": {"ryo": 300, "gems": 10, "items": {}}},
    {"id": "a_team3", "category": "beginner", "name": "Form a Squad", "desc": "Set a battle team of 3 heroes.",
     "metric": "team", "target": 3, "reward": {"ryo": 0, "gems": 15, "items": {}}},
    {"id": "a_heroes5", "category": "beginner", "name": "Assemble Heroes", "desc": "Own 5 heroes.",
     "metric": "heroes", "target": 5, "reward": {"ryo": 500, "gems": 0, "items": {"exp_tome_greater": 1}}},
    {"id": "a_level5", "category": "beginner", "name": "Reach Level 5", "desc": "Reach player level 5.",
     "metric": "level", "target": 5, "reward": {"ryo": 0, "gems": 20, "items": {}}},
    {"id": "a_equip", "category": "beginner", "name": "Equip Gear", "desc": "Equip a piece of gear on a hero.",
     "event": "equip_gear", "target": 1, "reward": {"ryo": 200, "gems": 0, "items": {}}},
    {"id": "a_spire5", "category": "beginner", "name": "Spire Climber", "desc": "Reach Spire floor 5.",
     "metric": "spire", "target": 5, "reward": {"ryo": 0, "gems": 30, "items": {}}},
    {"id": "a_beginner_claim", "category": "beginner", "name": "Beginner Summon", "desc": "Claim your beginner summon rewards.",
     "event": "beginner_claim", "target": 1, "reward": {"ryo": 0, "gems": 50, "items": {"summon_ticket": 2}}},
    # --- Combat ---
    {"id": "a_wins10", "category": "combat", "name": "Veteran", "desc": "Win 10 battles.",
     "event": "any_win", "target": 10, "reward": {"ryo": 0, "gems": 20, "items": {}}},
    {"id": "a_wins50", "category": "combat", "name": "Champion", "desc": "Win 50 battles.",
     "event": "any_win", "target": 50, "reward": {"ryo": 0, "gems": 50, "items": {"ascension_crystal": 3}}},
    {"id": "a_wins100", "category": "combat", "name": "Legend", "desc": "Win 100 battles.",
     "event": "any_win", "target": 100, "reward": {"ryo": 0, "gems": 100, "items": {"exp_tome_ancient": 1}}},
    {"id": "a_arena5", "category": "combat", "name": "Arena Duelist", "desc": "Win 5 Arena battles.",
     "event": "arena_win", "target": 5, "reward": {"ryo": 0, "gems": 25, "items": {}}},
    # --- Collection ---
    {"id": "a_summon10", "category": "collection", "name": "Summoner", "desc": "Perform 10 summons.",
     "event": "summon", "target": 10, "reward": {"ryo": 0, "gems": 15, "items": {}}},
    {"id": "a_summon50", "category": "collection", "name": "Master Summoner", "desc": "Perform 50 summons.",
     "event": "summon", "target": 50, "reward": {"ryo": 0, "gems": 40, "items": {"summon_ticket": 3}}},
    {"id": "a_heroes10", "category": "collection", "name": "Collector", "desc": "Own 10 heroes.",
     "metric": "heroes", "target": 10, "reward": {"ryo": 0, "gems": 30, "items": {}}},
    {"id": "a_heroes20", "category": "collection", "name": "Master Collector", "desc": "Own 20 heroes.",
     "metric": "heroes", "target": 20, "reward": {"ryo": 0, "gems": 60, "items": {"exp_tome_ancient": 1}}},
    # --- Progression ---
    {"id": "a_level20", "category": "progression", "name": "Rising Shinobi", "desc": "Reach player level 20.",
     "metric": "level", "target": 20, "reward": {"ryo": 0, "gems": 50, "items": {}}},
    {"id": "a_level50", "category": "progression", "name": "Elite Shinobi", "desc": "Reach player level 50.",
     "metric": "level", "target": 50, "reward": {"ryo": 0, "gems": 120, "items": {}}},
    {"id": "a_spire20", "category": "progression", "name": "Tower Conqueror", "desc": "Reach Spire floor 20.",
     "metric": "spire", "target": 20, "reward": {"ryo": 0, "gems": 80, "items": {}}},
    {"id": "a_evolve1", "category": "progression", "name": "Evolution", "desc": "Evolve a hero for the first time.",
     "event": "evolve", "target": 1, "reward": {"ryo": 0, "gems": 20, "items": {}}},
    {"id": "a_ascend1", "category": "progression", "name": "Ascension", "desc": "Ascend a hero for the first time.",
     "event": "ascend", "target": 1, "reward": {"ryo": 0, "gems": 25, "items": {}}},
]
ACHIEVEMENTS_BY_ID = {a["id"]: a for a in ACHIEVEMENTS}


def achievement_metric(user: dict, key: str) -> int:
    if key == "team":
        return len(user.get("team", []))
    if key == "heroes":
        return len(user.get("ninjas", []))
    if key == "level":
        return user.get("level", 1)
    if key == "spire":
        return user.get("spire_floor", 0)
    return 0


def fresh_achievements_state() -> dict:
    return {a["id"]: {"progress": 0, "claimed": False} for a in ACHIEVEMENTS}


# ===========================================================================
# FORGE PRODUCTION SYSTEM — forge levels 1-200, tiered recipes, chapter-gated
# material drops. See forge_production.py for full logic.
# ===========================================================================
import forge_production as fp

# Register forge materials in ITEMS so the UI has proper metadata.
ITEMS.update({
    m[0]: {"id": m[0], "name": m[1], "type": "forge_material", "value": 0,
           "icon": m[2], "color": m[3], "desc": m[4]}
    for m in fp.FORGE_MATERIALS
})

# Register all forge-produced consumables (5 categories × 200 tiers = 1000).
ITEMS.update(fp.forge_item_entries())

# Re-export key functions so server.py can call them via gd.
FORGE_PRODUCTION_CATEGORIES = fp.PRODUCTION_CATEGORIES
FORGE_MAX_LEVEL = fp.FORGE_MAX_LEVEL
forge_production_recipe = fp.production_recipe
forge_production_recipes = fp.all_production_recipes
forge_level_from_xp = fp.forge_level_from_xp
forge_xp_for_level = fp.forge_xp_for_level
roll_forge_drops = fp.roll_forge_drops
