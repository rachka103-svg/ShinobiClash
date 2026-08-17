"""Static game catalog: fictional ninja characters, jutsu, campaign stages and combat helpers."""

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

RARITY_TIERS = {"R": 1, "SR": 2, "SSR": 3, "UR": 4, "LR": 5}
RARITY_ORDER = {"R": 0, "SR": 1, "SSR": 2, "UR": 3, "LR": 4}
ASCENSION_MAX = {"R": 2, "SR": 3, "SSR": 4, "UR": 5, "LR": 6}

# ---------------------------------------------------------------------------
# Ninja catalog. All characters are original/fictional to avoid copyright.
# portrait paths are served statically from the frontend /ninjas folder.
# ---------------------------------------------------------------------------
NINJA_CATALOG = [
    {
        "id": "blaze",
        "name": "Blaze Akagi",
        "title": "Spark of the Crimson Leaf",
        "element": "Fire",
        "rarity": "R",
        "role": "Attacker",
        "lore": "A hot-headed genin whose fists ignite with every punch he throws.",
        "base_stats": {"hp": 820, "atk": 120, "def": 60, "spd": 95, "chakra": 100},
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
        "base_stats": {"hp": 860, "atk": 112, "def": 66, "spd": 90, "chakra": 100},
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
        "base_stats": {"hp": 780, "atk": 118, "def": 54, "spd": 120, "chakra": 100},
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
        "base_stats": {"hp": 1100, "atk": 90, "def": 110, "spd": 60, "chakra": 100},
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
        "base_stats": {"hp": 800, "atk": 122, "def": 58, "spd": 110, "chakra": 100},
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
        "base_stats": {"hp": 980, "atk": 150, "def": 72, "spd": 108, "chakra": 110},
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
        "base_stats": {"hp": 940, "atk": 110, "def": 80, "spd": 96, "chakra": 120},
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
        "base_stats": {"hp": 1320, "atk": 105, "def": 135, "spd": 66, "chakra": 110},
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
        "base_stats": {"hp": 1040, "atk": 185, "def": 78, "spd": 132, "chakra": 120},
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
        "base_stats": {"hp": 1010, "atk": 192, "def": 76, "spd": 140, "chakra": 120},
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
        "base_stats": {"hp": 1120, "atk": 220, "def": 88, "spd": 150, "chakra": 130},
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
        "base_stats": {"hp": 1160, "atk": 165, "def": 96, "spd": 124, "chakra": 140},
        "jutsus": [
            {"id": "lumina_basic", "name": "Radiant Bolt", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Light", "description": "A beam of light. Builds chakra."},
            {"id": "lumina_heal", "name": "Sacred Dawn", "type": "heal", "power": 320, "chakra_cost": 60, "chakra_gain": 0, "element": "Light", "description": "Bathes an ally in restorative light."},
            {"id": "lumina_aoe", "name": "Judgment Ray", "type": "aoe", "power": 200, "chakra_cost": 90, "chakra_gain": 0, "element": "Light", "description": "A pillar of light scorches all enemies."},
        ],
    },
]

# ---------------------------------------------------------------------------
# Legendary Heroes — adapted from world mythology, redesigned as anime-styled
# fighters and merged into the playable roster.
# ---------------------------------------------------------------------------
RARITY_BASE = {
    "R":   {"hp": 800,  "atk": 115, "def": 60,  "spd": 95,  "chakra": 100},
    "SR":  {"hp": 980,  "atk": 150, "def": 78,  "spd": 105, "chakra": 110},
    "SSR": {"hp": 1080, "atk": 188, "def": 85,  "spd": 125, "chakra": 120},
    "UR":  {"hp": 1180, "atk": 215, "def": 92,  "spd": 140, "chakra": 130},
    "LR":  {"hp": 1320, "atk": 245, "def": 105, "spd": 150, "chakra": 150},
}
ROLE_MOD = {
    "Attacker": {"hp": 1.0,  "atk": 1.0,  "def": 1.0,  "spd": 1.0,  "chakra": 1.0},
    "Tank":     {"hp": 1.45, "atk": 0.72, "def": 1.4,  "spd": 0.7,  "chakra": 1.0},
    "Support":  {"hp": 1.1,  "atk": 0.85, "def": 1.05, "spd": 1.0,  "chakra": 1.25},
    "Assassin": {"hp": 0.88, "atk": 1.15, "def": 0.82, "spd": 1.25, "chakra": 1.1},
}


def _hero_stats(rarity, role):
    b = RARITY_BASE[rarity]
    m = ROLE_MOD[role]
    return {k: int(b[k] * m[k]) for k in b}


def _hero_jutsus(hid, name, element, rarity, role):
    ri = RARITY_ORDER[rarity]
    first = name.split(" ")[0]
    el = element.lower()
    if role == "Support":
        return [
            {"id": f"{hid}_b", "name": f"{element} Bolt", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 30, "element": element, "description": f"A bolt of {el} energy. Builds chakra."},
            {"id": f"{hid}_heal", "name": "Divine Blessing", "type": "heal", "power": 200 + ri * 38, "chakra_cost": 55 + ri * 2, "chakra_gain": 0, "element": element, "description": "Restores a large amount of an ally's HP."},
            {"id": f"{hid}_aoe", "name": f"{element} Radiance", "type": "aoe", "power": 125 + ri * 16, "chakra_cost": 70 + ri * 3, "chakra_gain": 0, "element": element, "description": f"Unleashes {el} energy on all enemies."},
        ]
    if role == "Tank":
        return [
            {"id": f"{hid}_b", "name": f"{element} Smash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": element, "description": "A heavy blow. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Wrath", "type": "attack", "power": 160 + ri * 18, "chakra_cost": 45 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A crushing {el} strike on one foe."},
            {"id": f"{hid}_guard", "name": "Aegis Ward", "type": "shield", "power": 0, "chakra_cost": 50 + ri * 2, "chakra_gain": 0, "element": element, "description": "Grants a powerful damage shield to an ally."},
        ]
    if role == "Assassin":
        return [
            {"id": f"{hid}_b", "name": f"{element} Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": element, "description": "A quick strike. Builds chakra."},
            {"id": f"{hid}_sig", "name": f"{first}'s Execution", "type": "attack", "power": 200 + ri * 24, "chakra_cost": 50 + ri * 2, "chakra_gain": 0, "element": element, "description": f"A merciless {el} blow to one enemy."},
            {"id": f"{hid}_aoe", "name": f"{element} Eclipse", "type": "aoe", "power": 155 + ri * 14, "chakra_cost": 80 + ri * 2, "chakra_gain": 0, "element": element, "description": f"{element} energy ravages all foes."},
        ]
    return [
        {"id": f"{hid}_b", "name": f"{element} Strike", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 25, "element": element, "description": "An elemental strike. Builds chakra."},
        {"id": f"{hid}_sig", "name": f"{first}'s Onslaught", "type": "attack", "power": 180 + ri * 22, "chakra_cost": 40 + ri * 3, "chakra_gain": 0, "element": element, "description": f"A devastating {el} blow on one enemy."},
        {"id": f"{hid}_aoe", "name": f"{element} Cataclysm", "type": "aoe", "power": 130 + ri * 16, "chakra_cost": 70 + ri * 4, "chakra_gain": 0, "element": element, "description": f"Erupts with {el} energy hitting all enemies."},
    ]


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

for _hid, _name, _title, _el, _rar, _role, _lore in _HERO_DEFS:
    NINJA_CATALOG.append({
        "id": _hid, "name": _name, "title": _title, "element": _el, "rarity": _rar,
        "role": _role, "lore": _lore, "base_stats": _hero_stats(_rar, _role),
        "jutsus": _hero_jutsus(_hid, _name, _el, _rar, _role),
    })

# Portrait paths: original ninjas live in /ninjas, imported heroes in /heroes.
_NINJA_IDS = {"blaze", "ripple", "zephyr", "boulder", "spark", "ember", "frost", "terra", "gale", "raijin", "shade", "lumina"}
for _n in NINJA_CATALOG:
    _n["portrait"] = f"/ninjas/{_n['id']}.png" if _n["id"] in _NINJA_IDS else f"/heroes/{_n['id']}.png"

CATALOG_BY_ID = {n["id"]: n for n in NINJA_CATALOG}

STARTER_NINJAS = ["blaze", "ripple", "zephyr"]

# Weighted summon pool (per rarity). Lower rarity = higher chance.
SUMMON_WEIGHTS = {"R": 1000, "SR": 320, "SSR": 95, "UR": 20, "LR": 3}
SUMMON_COST = 300

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
ROLES = ["Attacker", "Tank", "Support", "Assassin"]
RARITIES = ["R", "SR", "SSR", "UR", "LR"]

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
