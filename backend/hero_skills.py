"""Bespoke skill kits for every hero in the catalog.

Each hero receives 3 active skills (basic / active / ultimate) plus a unique
passive.  Mechanics are drawn from a diverse pool — stun, freeze, burn,
poison, bleed, taunt, extra-turn, revive-ally, cleanse, team buffs, shields,
lifesteal, counter, evade, damage-reflect, dispel, regen, immunity — so no
two heroes play exactly the same way.

The battle engine (frontend/src/lib/battle.js) consumes `jutsu.type` for
skill resolution and `jutsu.effects[]` for status/buff application.  New
effect types introduced here are handled by the updated engine.
"""

import random

# ---------------------------------------------------------------------------
# Effect helper — shorthand for building jutsu effect entries.
# ---------------------------------------------------------------------------
def _eff(effect_type, chance=100, duration=2, value=0, **kw):
    d = {"type": effect_type, "chance": chance, "duration": duration, "value": value}
    d.update(kw)
    return d


# ---------------------------------------------------------------------------
# Rarity scaling — higher rarity heroes get stronger versions of their kit.
# Applied at load time by game_data.py.
# ---------------------------------------------------------------------------
def _scale_kit(kit, rarity, role):
    """Tune power/cost/chance based on rarity tier."""
    from game_data import RARITY_ORDER
    ri = RARITY_ORDER.get(rarity, 1)

    # SR+ — 5% power boost to chakra skills
    if ri >= 2:
        for s in kit["skills"]:
            if s.get("chakra_cost", 0) > 0:
                s["power"] = int(s.get("power", 0) * 1.05)

    # SSR+ — effect chances +5%
    if ri >= 3:
        for s in kit["skills"]:
            for e in s.get("effects", []):
                if e.get("chance", 0) < 100:
                    e["chance"] = min(100, e["chance"] + 5)

    # UR+ — chakra costs -10%, chakra gain +5
    if ri >= 4:
        for s in kit["skills"]:
            c = s.get("chakra_cost", 0)
            if c > 0:
                s["chakra_cost"] = max(10, int(c * 0.90))
            if s.get("chakra_gain", 0) > 0:
                s["chakra_gain"] += 5

    # GR+ — ultimate +12% power
    if ri >= 6:
        for s in kit["skills"]:
            if s.get("chakra_cost", 0) >= 70:
                s["power"] = int(s.get("power", 0) * 1.12)

    # LR+ — role-specific mastery
    if ri >= 5:
        if role == "Assassin":
            for s in kit["skills"]:
                for e in s.get("effects", []):
                    if e["type"] == "bleed":
                        e["duration"] += 1
                        e["value"] = int(e["value"] * 1.25)
        elif role == "Mage":
            for s in kit["skills"]:
                for e in s.get("effects", []):
                    if e["type"] in ("burn", "poison"):
                        e["duration"] += 1
                        e["value"] = int(e["value"] * 1.25)
        elif role == "Tank":
            for s in kit["skills"]:
                if s["type"] in ("shield", "taunt"):
                    s["power"] = int(s.get("power", 0) * 1.25)
        elif role in ("Healer", "Support"):
            for s in kit["skills"]:
                if s["type"] in ("heal", "aoe_heal", "team_buff"):
                    s["power"] = int(s.get("power", 0) * 1.18)
        elif role == "Control":
            for s in kit["skills"]:
                for e in s.get("effects", []):
                    if e["type"] in ("stun", "freeze"):
                        e["chance"] = min(100, e["chance"] + 15)
        elif role == "Bruiser":
            for s in kit["skills"]:
                if s["type"] == "attack":
                    s["power"] = int(s.get("power", 0) * 1.15)
        else:  # Attacker
            for s in kit["skills"]:
                if s["type"] in ("attack", "aoe"):
                    s["power"] = int(s.get("power", 0) * 1.12)

    # Normalize: cap status-effect chances to rarity-appropriate levels so
    # low-rarity heroes can't chain-CC and high-rarity heroes feel dangerous.
    _normalize_effect_chances(kit, rarity)

    return kit


# Status effect types whose application chance should be capped by rarity.
_STATUS_EFFECT_TYPES = frozenset({"burn", "poison", "bleed", "stun", "freeze", "atk_down", "def_down", "shock", "dispel"})
_RARITY_EFFECT_CAP = {"N": 10, "R": 15, "SR": 20, "SSR": 25, "UR": 30, "LR": 35, "GR": 45, "MYTHIC": 60}


def _normalize_effect_chances(kit, rarity):
    """Cap status-effect application chances to rarity-appropriate levels."""
    cap = _RARITY_EFFECT_CAP.get(rarity, 15)
    for skill in kit.get("skills", []):
        for effect in skill.get("effects", []):
            if effect.get("type") in _STATUS_EFFECT_TYPES:
                if effect.get("chance", 0) > cap:
                    effect["chance"] = cap
    return kit


# ===========================================================================
# HERO KITS — 69 unique definitions
# ===========================================================================
# Each entry: {"skills": [basic, active, ultimate], "passive": {...}}
# Skill types: attack, aoe, heal, aoe_heal, shield, taunt, revive,
#              team_buff, cleanse
# Effect types: stun, freeze, burn, poison, bleed, atk_down, def_down, shock,
#               extra_turn, taunt, revive_ally, cleanse, team_atk_up,
#               team_def_up, regen, immunity, evade, damage_reflect, dispel,
#               atk_up, def_up, spd_up
# Passive effect_types: lifesteal, counterattack, revive_once, execute_low_hp,
#                        stun_chance, freeze_chance, burn_dot, poison_dot,
#                        hp_scaling_power, berserk_low_hp, stacking_mark_detonate,
#                        escalating_dot, team_shield, team_atk_buff, team_def_buff,
#                        damage_reduction, chakra_gain_boost, heal_boost,
#                        speed_boost_self, cleanse_debuff, energy_drain,
#                        counter_taunt, evade_passive, damage_reflect_passive,
#                        team_regen_ward, revive_ally_passive, soul_harvest,
#                        bonus_vs_full_hp, adaptive_element, delay_turn,
#                        intercept_lowest_hp, stacking_power, shield_ally_low
# ===========================================================================

HERO_KITS = {

# ───────────────────────────── ORIGINAL 12 ─────────────────────────────

"blaze": {
    "skills": [
        {"id": "blaze_basic", "name": "Ember Fist", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 28, "element": "Fire", "description": "A burning punch that builds chakra and stokes the inner flame."},
        {"id": "blaze_combo", "name": "Crimson Combo", "type": "attack", "power": 185, "chakra_cost": 45, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=65, duration=3, value=22)], "description": "A rapid three-hit combo that ignites the target, dealing burn damage over time."},
        {"id": "blaze_ult", "name": "Phoenix Fury", "type": "attack", "power": 260, "chakra_cost": 80, "chakra_gain": 0, "element": "Fire", "effects": [_eff("extra_turn", chance=25), _eff("burn", chance=80, duration=3, value=30)], "description": "An explosive flurry of phoenix-flame strikes. 25% chance to strike again."},
    ],
    "passive": {"id": "blaze_passive", "name": "Inner Fire", "effect_type": "lifesteal", "description": "Heals for 10% of damage dealt, growing fiercer with every strike.", "params": {"lifesteal_pct": 10}, "signature": True},
},

"ripple": {
    "skills": [
        {"id": "ripple_basic", "name": "Water Lash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": "Water", "description": "A whip of water that builds chakra and flows around defenses."},
        {"id": "ripple_precision", "name": "Tide Blade", "type": "attack", "power": 170, "chakra_cost": 42, "chakra_gain": 0, "element": "Water", "effects": [_eff("atk_down", chance=60, duration=2, value=18)], "description": "A precision water blade that cuts deep, weakening the target's attack."},
        {"id": "ripple_ult", "name": "Tidal Crucible", "type": "aoe", "power": 155, "chakra_cost": 78, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=30, duration=1)], "description": "A crushing tidal wave that hits all enemies with a chance to freeze."},
    ],
    "passive": {"id": "ripple_passive", "name": "Flowing Strike", "effect_type": "crit_boost_self", "description": "Gains +8% crit rate after each hit, stacking up to 3 times.", "params": {"crit_boost": 8, "max_stacks": 3}, "signature": True},
},

"zephyr": {
    "skills": [
        {"id": "zephyr_basic", "name": "Gale Slash", "type": "attack", "power": 98, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A cutting gust so fast it builds extra chakra."},
        {"id": "zephyr_vacuum", "name": "Vacuum Blade", "type": "attack", "power": 175, "chakra_cost": 42, "chakra_gain": 0, "element": "Wind", "effects": [_eff("extra_turn", chance=20)], "description": "A compressed air blade that pierces defenses. 20% chance to act again."},
        {"id": "zephyr_ult", "name": "Tempest Sweep", "type": "aoe", "power": 145, "chakra_cost": 72, "chakra_gain": 0, "element": "Wind", "effects": [_eff("spd_up", chance=100, duration=2, value=15)], "description": "A sweeping storm hitting all foes, boosting Zephyr's own speed."},
    ],
    "passive": {"id": "zephyr_passive", "name": "Gale Step", "effect_type": "speed_boost_self", "description": "Gains +15% speed after landing a critical hit.", "params": {"spd_boost": 15}, "signature": True},
},

"boulder": {
    "skills": [
        {"id": "boulder_basic", "name": "Rock Smash", "type": "attack", "power": 92, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "A heavy stone fist that builds chakra."},
        {"id": "boulder_taunt", "name": "Come and Fight!", "type": "taunt", "power": 0, "chakra_cost": 40, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("def_up", chance=100, duration=2, value=30)], "description": "Challenges all enemies, forcing them to attack Boulder while raising his defense."},
        {"id": "boulder_ult", "name": "Earthquake Slam", "type": "aoe", "power": 140, "chakra_cost": 75, "chakra_gain": 0, "element": "Earth", "effects": [_eff("stun", chance=35, duration=1), _eff("def_down", chance=70, duration=2, value=20)], "description": "A ground-shaking slam hitting all enemies with a chance to stun and weaken defense."},
    ],
    "passive": {"id": "boulder_passive", "name": "Stone Counter", "effect_type": "counter_taunt", "description": "When struck while above 50% HP, has a 30% chance to counter-attack for 50% damage.", "params": {"counter_chance": 30, "counter_pct": 50}, "signature": True},
},

"spark": {
    "skills": [
        {"id": "spark_basic", "name": "Shock Jab", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 28, "element": "Lightning", "description": "An electric jab that builds chakra and crackles with static."},
        {"id": "spark_bolt", "name": "Bolt Lance", "type": "attack", "power": 172, "chakra_cost": 42, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=35, duration=1)], "description": "A spear of lightning with a 35% chance to stun the target."},
        {"id": "spark_ult", "name": "Chain Lightning", "type": "aoe", "power": 125, "chakra_cost": 70, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=25, duration=1), _eff("shock", chance=60, duration=2, value=40)], "description": "Lightning arcs between all enemies, stunning and shocking them."},
    ],
    "passive": {"id": "spark_passive", "name": "Static Field", "effect_type": "stun_chance", "description": "Every attack has a 15% chance to stun the target for 1 turn.", "params": {"stun_chance": 15}, "signature": True},
},

"ember": {
    "skills": [
        {"id": "ember_basic", "name": "Cinder Cut", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A flaming slash that builds chakra."},
        {"id": "ember_talon", "name": "Phoenix Talon", "type": "attack", "power": 205, "chakra_cost": 45, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=70, duration=3, value=25)], "description": "A diving fire claw that scorches and burns the enemy."},
        {"id": "ember_ult", "name": "Inferno Bloom", "type": "aoe", "power": 150, "chakra_cost": 75, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=80, duration=3, value=28)], "description": "Blossoms of fire engulf the battlefield, burning all enemies."},
    ],
    "passive": {"id": "ember_passive", "name": "Phoenix Rebirth", "effect_type": "revive_once", "description": "The first time Ember would fall, she revives with 40% HP and cleanses all debuffs.", "params": {"revive_hp_pct": 40}, "signature": True},
},

"frost": {
    "skills": [
        {"id": "frost_basic", "name": "Icicle Dart", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 32, "element": "Water", "description": "A shard of ice that builds chakra."},
        {"id": "frost_heal", "name": "Blizzard Mercy", "type": "heal", "power": 240, "chakra_cost": 55, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=40, duration=1)], "description": "Restores a large amount of an ally's HP and freezes a random enemy."},
        {"id": "frost_ult", "name": "Frozen Sanctuary", "type": "shield", "power": 160, "chakra_cost": 72, "chakra_gain": 0, "element": "Water", "effects": [_eff("immunity", chance=100, duration=2)], "description": "Places a powerful protective barrier on an ally, granting debuff immunity."},
    ],
    "passive": {"id": "frost_passive", "name": "Winter's Touch", "effect_type": "freeze_chance", "description": "Every attack has a 15% chance to freeze the target for 1 turn.", "params": {"freeze_chance": 15}, "signature": True},
},

"terra": {
    "skills": [
        {"id": "terra_basic", "name": "Stone Smash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "A heavy stone strike that builds chakra."},
        {"id": "terra_bulwark", "name": "Mountain's Oath", "type": "taunt", "power": 0, "chakra_cost": 45, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("def_up", chance=100, duration=2, value=35)], "description": "Terra taunts all enemies and hardens her skin, drastically raising defense."},
        {"id": "terra_ult", "name": "Gaia's Embrace", "type": "shield", "power": 180, "chakra_cost": 70, "chakra_gain": 0, "element": "Earth", "effects": [_eff("regen", chance=100, duration=3, value=12)], "description": "A massive shield on an ally that also grants regeneration."},
    ],
    "passive": {"id": "terra_passive", "name": "Guardian's Ward", "effect_type": "intercept_lowest_hp", "description": "Intercepts 25% of damage aimed at the lowest-HP ally.", "params": {"intercept_pct": 25}, "signature": True},
},

"gale": {
    "skills": [
        {"id": "gale_basic", "name": "Storm Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Wind", "description": "A lightning-fast slash that builds extra chakra."},
        {"id": "gale_cyclone", "name": "Cyclone Edge", "type": "attack", "power": 200, "chakra_cost": 48, "chakra_gain": 0, "element": "Wind", "effects": [_eff("extra_turn", chance=30)], "description": "A spinning wind blade with a 30% chance to act again."},
        {"id": "gale_ult", "name": "Hurricane Slash", "type": "aoe", "power": 165, "chakra_cost": 80, "chakra_gain": 0, "element": "Wind", "effects": [_eff("spd_up", chance=100, duration=2, value=20), _eff("extra_turn", chance=15)], "description": "A devastating hurricane hitting all enemies, boosting speed and a chance to act again."},
    ],
    "passive": {"id": "gale_passive", "name": "Storm Surge", "effect_type": "speed_boost_self", "description": "Gains +20% speed after each kill, stacking up to 2 times.", "params": {"spd_boost": 20, "max_stacks": 2}, "signature": True},
},

"raijin": {
    "skills": [
        {"id": "raijin_basic", "name": "Thunder Jab", "type": "attack", "power": 108, "chakra_cost": 0, "chakra_gain": 30, "element": "Lightning", "description": "An electric jab that builds chakra and charges the storm."},
        {"id": "raijin_crash", "name": "Thunder Crash", "type": "attack", "power": 210, "chakra_cost": 48, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=40, duration=1), _eff("shock", chance=60, duration=2, value=35)], "description": "A devastating thunder strike with a 40% stun chance and lingering shock."},
        {"id": "raijin_ult", "name": "Storm God's Wrath", "type": "aoe", "power": 170, "chakra_cost": 82, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=35, duration=1), _eff("shock", chance=80, duration=3, value=45)], "description": "A cataclysmic lightning storm that stuns and shocks all enemies."},
    ],
    "passive": {"id": "raijin_passive", "name": "Escalating Storm", "effect_type": "stacking_power", "description": "Each attack increases Raijin's attack power by 5%, stacking up to 4 times.", "params": {"atk_boost": 5, "max_stacks": 4}, "signature": True},
},

"shade": {
    "skills": [
        {"id": "shade_basic", "name": "Shadow Slice", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A swift shadow slash that builds chakra."},
        {"id": "shade_execute", "name": "Hollow Blade", "type": "attack", "power": 220, "chakra_cost": 48, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=75, duration=3, value=25)], "description": "A lethal strike that leaves the enemy bleeding profusely."},
        {"id": "shade_ult", "name": "Eternal Darkness", "type": "attack", "power": 300, "chakra_cost": 85, "chakra_gain": 0, "element": "Dark", "effects": [_eff("extra_turn", chance=20)], "description": "An ultimate assassination technique. 20% chance to act again. Deals +50% damage to enemies below 30% HP."},
    ],
    "passive": {"id": "shade_passive", "name": "Shadow Execute", "effect_type": "execute_low_hp", "description": "Deals 50% bonus damage to enemies below 30% HP.", "params": {"threshold": 0.30, "bonus": 0.50}, "signature": True},
},

"lumina": {
    "skills": [
        {"id": "lumina_basic", "name": "Radiant Strike", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A beam of light that builds extra chakra."},
        {"id": "lumina_revive", "name": "Dawn's Revival", "type": "revive", "power": 0, "chakra_cost": 60, "chakra_gain": 0, "element": "Light", "effects": [_eff("revive_ally", chance=100, hp_pct=35)], "description": "Revives a fallen ally with 35% HP and cleanses their debuffs."},
        {"id": "lumina_ult", "name": "Radiant Sanctuary", "type": "aoe_heal", "power": 180, "chakra_cost": 80, "chakra_gain": 0, "element": "Light", "effects": [_eff("cleanse", chance=100), _eff("immunity", chance=100, duration=1)], "description": "Heals all allies, cleanses debuffs, and grants brief immunity."},
    ],
    "passive": {"id": "lumina_passive", "name": "Purifying Light", "effect_type": "cleanse_debuff", "description": "Cleanses one debuff from a random ally each turn.", "params": {"cleanse_per_turn": 1}, "signature": True},
},

# ───────────────────────────── MYTHOLOGICAL HEROES ─────────────────────

"ember_scout": {
    "skills": [
        {"id": "ember_scout_b", "name": "Flame Seeker", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 28, "element": "Fire", "description": "A swift burning strike that builds chakra."},
        {"id": "ember_scout_a", "name": "Scorching Pursuit", "type": "attack", "power": 175, "chakra_cost": 42, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=55, duration=2, value=18), _eff("extra_turn", chance=15)], "description": "A chasing flame strike that burns and has a chance to act again."},
        {"id": "ember_scout_u", "name": "Wildfire Spread", "type": "aoe", "power": 135, "chakra_cost": 72, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=65, duration=3, value=22)], "description": "A spreading wildfire that burns all enemies."},
    ],
    "passive": {"id": "ember_scout_p", "name": "Trailblazer", "effect_type": "burn_dot", "description": "Attacks leave a small burn on the target (10% of ATK per turn).", "params": {"burn_pct": 10}, "signature": True},
},

"saltide": {
    "skills": [
        {"id": "saltide_b", "name": "Tidal Slash", "type": "attack", "power": 102, "chakra_cost": 0, "chakra_gain": 28, "element": "Water", "description": "A saltwater blade that builds chakra."},
        {"id": "saltide_a", "name": "Riptide Drag", "type": "attack", "power": 168, "chakra_cost": 42, "chakra_gain": 0, "element": "Water", "effects": [_eff("spd_up", chance=100, duration=2, value=10), _eff("atk_down", chance=55, duration=2, value=15)], "description": "A riptide that drags the enemy down, slowing their attacks while boosting own speed."},
        {"id": "saltide_u", "name": "Tsunami Crash", "type": "aoe", "power": 150, "chakra_cost": 72, "chakra_gain": 0, "element": "Water", "effects": [_eff("def_down", chance=65, duration=2, value=18)], "description": "A massive wave that crashes into all enemies, weakening their defense."},
    ],
    "passive": {"id": "saltide_p", "name": "Sea Legs", "effect_type": "damage_reduction", "description": "Takes 10% reduced damage while above 50% HP.", "params": {"reduction_pct": 10, "threshold": 0.50}, "signature": True},
},

"stoneback": {
    "skills": [
        {"id": "stoneback_b", "name": "Shell Slam", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 30, "element": "Earth", "description": "A heavy shell strike that builds chakra."},
        {"id": "stoneback_a", "name": "Petrify Roar", "type": "taunt", "power": 0, "chakra_cost": 42, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("stun", chance=25, duration=1)], "description": "A terrifying roar that taunts all enemies and may stun one."},
        {"id": "stoneback_u", "name": "Living Bastion", "type": "shield", "power": 200, "chakra_cost": 70, "chakra_gain": 0, "element": "Earth", "effects": [_eff("regen", chance=100, duration=3, value=10)], "description": "Transforms into a living fortress, shielding an ally and granting regeneration."},
    ],
    "passive": {"id": "stoneback_p", "name": "Petrified Shell", "effect_type": "damage_reduction", "description": "Takes 15% reduced damage from all sources.", "params": {"reduction_pct": 15}, "signature": True},
},

"dust_wisp": {
    "skills": [
        {"id": "dust_wisp_b", "name": "Sand Cutter", "type": "attack", "power": 98, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A cutting sandstorm blade that builds chakra."},
        {"id": "dust_wisp_a", "name": "Mirage Step", "type": "attack", "power": 165, "chakra_cost": 42, "chakra_gain": 0, "element": "Wind", "effects": [_eff("evade", chance=100, duration=1, value=40)], "description": "A mirage strike that grants Dust Wisp a 40% evade chance for 1 turn."},
        {"id": "dust_wisp_u", "name": "Desert Burial", "type": "aoe", "power": 140, "chakra_cost": 72, "chakra_gain": 0, "element": "Wind", "effects": [_eff("def_down", chance=70, duration=2, value=20)], "description": "A sandstorm that buries all enemies, crushing their defenses."},
    ],
    "passive": {"id": "dust_wisp_p", "name": "Wandering Spirit", "effect_type": "evade_passive", "description": "Has a 12% chance to dodge any attack.", "params": {"evade_chance": 12}, "signature": True},
},

"glow_sentinel": {
    "skills": [
        {"id": "glow_sentinel_b", "name": "Lantern Strike", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A lantern-illuminated strike that builds extra chakra."},
        {"id": "glow_sentinel_a", "name": "Beacon of Hope", "type": "team_buff", "power": 0, "chakra_cost": 48, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_atk_up", chance=100, duration=2, value=20)], "description": "Rallies the team, boosting all allies' attack by 20% for 2 turns."},
        {"id": "glow_sentinel_u", "name": "Sacred Flame", "type": "shield", "power": 150, "chakra_cost": 68, "chakra_gain": 0, "element": "Light", "effects": [_eff("cleanse", chance=100), _eff("regen", chance=100, duration=2, value=10)], "description": "A holy flame that shields an ally, cleanses debuffs, and grants regeneration."},
    ],
    "passive": {"id": "glow_sentinel_p", "name": "Steady Light", "effect_type": "chakra_gain_boost", "description": "Generates +8 extra chakra for the whole team each turn.", "params": {"chakra_boost": 8}, "signature": True},
},

"shade_walker": {
    "skills": [
        {"id": "shade_walker_b", "name": "Dusk Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A shadow slash that builds chakra."},
        {"id": "shade_walker_a", "name": "Twilight Mark", "type": "attack", "power": 160, "chakra_cost": 42, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=65, duration=3, value=20), _eff("atk_down", chance=50, duration=2, value=15)], "description": "A mark of twilight that bleeds and weakens the target."},
        {"id": "shade_walker_u", "name": "Nightfall Execution", "type": "attack", "power": 240, "chakra_cost": 78, "chakra_gain": 0, "element": "Dark", "effects": [_eff("extra_turn", chance=20)], "description": "A lethal execution strike with a 20% chance to act again. Deals bonus damage to bleeding targets."},
    ],
    "passive": {"id": "shade_walker_p", "name": "First Strike", "effect_type": "bonus_vs_full_hp", "description": "Deals 25% bonus damage to targets at full HP.", "params": {"bonus": 0.25}, "signature": True},
},

"prometheus": {
    "skills": [
        {"id": "prometheus_b", "name": "Flame Whip", "type": "attack", "power": 108, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A whip of stolen fire that builds chakra."},
        {"id": "prometheus_a", "name": "Gift of Fire", "type": "attack", "power": 195, "chakra_cost": 46, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=80, duration=3, value=28), _eff("team_atk_up", chance=100, duration=2, value=15)], "description": "A devastating fire strike that burns the enemy and inspires allies, boosting team attack."},
        {"id": "prometheus_u", "name": "Titan's Inferno", "type": "aoe", "power": 175, "chakra_cost": 80, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=90, duration=3, value=35)], "description": "A titan's inferno that engulfs all enemies in searing flame."},
    ],
    "passive": {"id": "prometheus_p", "name": "Fire Bringer", "effect_type": "burn_dot", "description": "Every attack applies a burn dealing 15% of ATK per turn for 2 turns.", "params": {"burn_pct": 15, "duration": 2}, "signature": True},
},

"poseidon": {
    "skills": [
        {"id": "poseidon_b", "name": "Trident Thrust", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 30, "element": "Water", "description": "A trident strike that builds chakra."},
        {"id": "poseidon_a", "name": "Ocean's Fury", "type": "attack", "power": 200, "chakra_cost": 46, "chakra_gain": 0, "element": "Water", "effects": [_eff("def_down", chance=70, duration=2, value=22), _eff("freeze", chance=25, duration=1)], "description": "A crushing trident blow that weakens defense and may freeze."},
        {"id": "poseidon_u", "name": "Tsunami Devastation", "type": "aoe", "power": 180, "chakra_cost": 80, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=35, duration=1), _eff("def_down", chance=75, duration=2, value=20)], "description": "A cataclysmic tsunami that freezes and shatters the defenses of all enemies."},
    ],
    "passive": {"id": "poseidon_p", "name": "Sea Lord's Dominion", "effect_type": "freeze_chance", "description": "Every attack has a 20% chance to freeze the target for 1 turn.", "params": {"freeze_chance": 20}, "signature": True},
},

"gaia": {
    "skills": [
        {"id": "gaia_b", "name": "Earth Pulse", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 32, "element": "Earth", "description": "A ground tremor strike that builds chakra."},
        {"id": "gaia_a", "name": "World Mother's Embrace", "type": "taunt", "power": 0, "chakra_cost": 45, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("regen", chance=100, duration=3, value=15)], "description": "Gaia taunts all enemies and enters a regenerating earth state."},
        {"id": "gaia_u", "name": "Primordial Genesis", "type": "aoe_heal", "power": 200, "chakra_cost": 78, "chakra_gain": 0, "element": "Earth", "effects": [_eff("team_def_up", chance=100, duration=2, value=25), _eff("regen", chance=100, duration=3, value=12)], "description": "Heals all allies, boosts team defense, and grants regeneration to all."},
    ],
    "passive": {"id": "gaia_p", "name": "Living Earth", "effect_type": "team_regen_ward", "description": "At the start of each round, all allies regenerate 5% of their max HP.", "params": {"regen_pct": 5}, "signature": True},
},

"thor": {
    "skills": [
        {"id": "thor_b", "name": "Hammer Blow", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A hammer strike charged with thunder that builds chakra."},
        {"id": "thor_a", "name": "Mjolnir's Throw", "type": "attack", "power": 205, "chakra_cost": 46, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=45, duration=1), _eff("shock", chance=65, duration=2, value=38)], "description": "A thrown hammer that stuns and shocks the target with thunder."},
        {"id": "thor_u", "name": "Thunderstorm Siege", "type": "aoe", "power": 165, "chakra_cost": 80, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=40, duration=1), _eff("shock", chance=85, duration=3, value=42)], "description": "A thunderstorm that stuns and shocks every enemy on the field."},
    ],
    "passive": {"id": "thor_p", "name": "God of Thunder", "effect_type": "stun_chance", "description": "Every attack has a 20% chance to stun the target for 1 turn.", "params": {"stun_chance": 20}, "signature": True},
},

"apollo": {
    "skills": [
        {"id": "apollo_b", "name": "Sun Arrow", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A radiant arrow that builds extra chakra."},
        {"id": "apollo_a", "name": "Solar Blessing", "type": "heal", "power": 220, "chakra_cost": 50, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_atk_up", chance=100, duration=2, value=18)], "description": "Heals an ally and blesses the team with increased attack."},
        {"id": "apollo_u", "name": "Divine Radiance", "type": "aoe_heal", "power": 170, "chakra_cost": 78, "chakra_gain": 0, "element": "Light", "effects": [_eff("cleanse", chance=100), _eff("team_atk_up", chance=100, duration=2, value=15)], "description": "A burst of divine light that heals all allies, cleanses debuffs, and boosts attack."},
    ],
    "passive": {"id": "apollo_p", "name": "Sun's Vigil", "effect_type": "heal_boost", "description": "Healing abilities restore 15% more HP.", "params": {"heal_boost": 15}, "signature": True},
},

"anubis": {
    "skills": [
        {"id": "anubis_b", "name": "Soul Slash", "type": "attack", "power": 108, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A jackal-headed slash that builds chakra."},
        {"id": "anubis_a", "name": "Weighing of Souls", "type": "attack", "power": 185, "chakra_cost": 44, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=70, duration=3, value=22), _eff("atk_down", chance=55, duration=2, value=18)], "description": "A judgment strike that bleeds and weakens the unworthy."},
        {"id": "anubis_u", "name": "Duat's Embrace", "type": "attack", "power": 260, "chakra_cost": 82, "chakra_gain": 0, "element": "Dark", "effects": [_eff("extra_turn", chance=25)], "description": "A deathly embrace that may act again. Gains permanent power when an enemy dies."},
    ],
    "passive": {"id": "anubis_p", "name": "Soul Harvest", "effect_type": "soul_harvest", "description": "Gains +5% attack permanently each time an enemy is defeated.", "params": {"atk_boost": 5}, "signature": True},
},

"hermes": {
    "skills": [
        {"id": "hermes_b", "name": "Swift Cut", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 34, "element": "Wind", "description": "A lightning-fast cut that builds extra chakra."},
        {"id": "hermes_a", "name": "Caduceus Strike", "type": "attack", "power": 175, "chakra_cost": 42, "chakra_gain": 0, "element": "Wind", "effects": [_eff("extra_turn", chance=35)], "description": "A staff strike with a 35% chance to act again — Hermes is the fastest of all."},
        {"id": "hermes_u", "name": "Messenger's Blitz", "type": "aoe", "power": 145, "chakra_cost": 76, "chakra_gain": 0, "element": "Wind", "effects": [_eff("extra_turn", chance=25), _eff("spd_up", chance=100, duration=2, value=25)], "description": "A blitz that hits all enemies, boosts speed, and has a 25% chance to act again."},
    ],
    "passive": {"id": "hermes_p", "name": "Swift Messenger", "effect_type": "speed_boost_self", "description": "Starts battle with +20% speed. Gains another +10% after each kill.", "params": {"initial_boost": 20, "kill_boost": 10}, "signature": True},
},

"pele": {
    "skills": [
        {"id": "pele_b", "name": "Magma Fist", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A molten punch that builds chakra."},
        {"id": "pele_a", "name": "Volcanic Eruption", "type": "attack", "power": 210, "chakra_cost": 48, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=85, duration=3, value=30), _eff("def_down", chance=60, duration=2, value=20)], "description": "An erupting blow that burns and shatters defenses."},
        {"id": "pele_u", "name": "Island Forge", "type": "aoe", "power": 185, "chakra_cost": 82, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=95, duration=3, value=38), _eff("def_down", chance=80, duration=2, value=22)], "description": "A volcanic cataclysm that burns and shreds the defense of all enemies."},
    ],
    "passive": {"id": "pele_p", "name": "Volcano Goddess", "effect_type": "burn_dot", "description": "Every attack applies a powerful burn (18% of ATK per turn for 3 turns).", "params": {"burn_pct": 18, "duration": 3}, "signature": True},
},

"tiamat": {
    "skills": [
        {"id": "tiamat_b", "name": "Dragon Bite", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 30, "element": "Water", "description": "A primordial dragon bite that builds chakra."},
        {"id": "tiamat_a", "name": "Abyssal Maw", "type": "attack", "power": 200, "chakra_cost": 46, "chakra_gain": 0, "element": "Water", "effects": [_eff("def_down", chance=75, duration=2, value=22), _eff("bleed", chance=60, duration=3, value=20)], "description": "A crushing maw that bleeds and shreds the enemy's defense."},
        {"id": "tiamat_u", "name": "Primordial Deluge", "type": "aoe", "power": 180, "chakra_cost": 80, "chakra_gain": 0, "element": "Water", "effects": [_eff("def_down", chance=85, duration=2, value=25), _eff("bleed", chance=70, duration=3, value=22)], "description": "A cataclysmic flood that bleeds and shreds the defense of all enemies."},
    ],
    "passive": {"id": "tiamat_p", "name": "Salt Sea Dragon", "effect_type": "hp_scaling_power", "description": "Grows stronger as HP drops — up to +50% damage at low HP.", "params": {"max_bonus": 0.50}, "signature": True},
},

"osiris": {
    "skills": [
        {"id": "osiris_b", "name": "Scepter Strike", "type": "attack", "power": 92, "chakra_cost": 0, "chakra_gain": 30, "element": "Earth", "description": "A royal scepter strike that builds chakra."},
        {"id": "osiris_a", "name": "Underworld's Call", "type": "taunt", "power": 0, "chakra_cost": 45, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("regen", chance=100, duration=3, value=12)], "description": "Osiris taunts all enemies and draws upon the underworld for regeneration."},
        {"id": "osiris_u", "name": "Resurrection", "type": "revive", "power": 0, "chakra_cost": 85, "chakra_gain": 0, "element": "Earth", "effects": [_eff("revive_ally", chance=100, hp_pct=40), _eff("team_def_up", chance=100, duration=2, value=20)], "description": "Revives a fallen ally with 40% HP and boosts team defense. Can self-revive once."},
    ],
    "passive": {"id": "osiris_p", "name": "Resurrection King", "effect_type": "revive_once", "description": "The first time Osiris would fall, he revives with 50% HP.", "params": {"revive_hp_pct": 50}, "signature": True},
},

"zeus": {
    "skills": [
        {"id": "zeus_b", "name": "Olympian Strike", "type": "attack", "power": 115, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A sky-father strike that builds chakra."},
        {"id": "zeus_a", "name": "Thunderbolt", "type": "attack", "power": 215, "chakra_cost": 48, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=50, duration=1), _eff("shock", chance=75, duration=2, value=40)], "description": "A divine thunderbolt with a 50% stun chance and powerful shock."},
        {"id": "zeus_u", "name": "Sky Father's Judgment", "type": "aoe", "power": 175, "chakra_cost": 85, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=45, duration=1), _eff("shock", chance=90, duration=3, value=48)], "description": "A judgment of lightning that stuns and shocks all enemies."},
    ],
    "passive": {"id": "zeus_p", "name": "King of the Gods", "effect_type": "stun_chance", "description": "Every attack has a 25% chance to stun the target for 1 turn.", "params": {"stun_chance": 25}, "signature": True},
},

"athena": {
    "skills": [
        {"id": "athena_b", "name": "Spear of Wisdom", "type": "attack", "power": 92, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A strategic spear thrust that builds extra chakra."},
        {"id": "athena_a", "name": "Aegis Formation", "type": "team_buff", "power": 0, "chakra_cost": 50, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_def_up", chance=100, duration=2, value=30), _eff("team_atk_up", chance=100, duration=2, value=12)], "description": "A tactical formation that boosts all allies' defense by 30% and attack by 12%."},
        {"id": "athena_u", "name": "Strategist's Triumph", "type": "shield", "power": 220, "chakra_cost": 80, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_def_up", chance=100, duration=2, value=20), _eff("cleanse", chance=100)], "description": "A massive shield on an ally that also cleanses and boosts team defense."},
    ],
    "passive": {"id": "athena_p", "name": "War Sage", "effect_type": "team_def_buff", "description": "At the start of battle, all allies gain +15% defense for 3 turns.", "params": {"def_boost": 15, "duration": 3}, "signature": True},
},

"hades": {
    "skills": [
        {"id": "hades_b", "name": "Death Strike", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A cold death strike that builds chakra."},
        {"id": "hades_a", "name": "Soul Reap", "type": "attack", "power": 190, "chakra_cost": 46, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=75, duration=3, value=24), _eff("atk_down", chance=60, duration=2, value=20)], "description": "A scythe strike that bleeds and drains the enemy's attack."},
        {"id": "hades_u", "name": "Underworld's Grip", "type": "aoe", "power": 165, "chakra_cost": 82, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=80, duration=3, value=26), _eff("atk_down", chance=75, duration=2, value=22)], "description": "The underworld's grip that bleeds and weakens all enemies."},
    ],
    "passive": {"id": "hades_p", "name": "Death Lord", "effect_type": "soul_harvest", "description": "Gains +8% attack permanently each time an enemy is defeated.", "params": {"atk_boost": 8}, "signature": True},
},

"quetzalcoatl": {
    "skills": [
        {"id": "quetzalcoatl_b", "name": "Feather Blade", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 30, "element": "Wind", "description": "A feathered wind blade that builds chakra."},
        {"id": "quetzalcoatl_a", "name": "Serpent Coil", "type": "attack", "power": 200, "chakra_cost": 46, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=30, duration=1), _eff("spd_up", chance=100, duration=2, value=18)], "description": "A coiling serpent strike that may stun and boosts own speed."},
        {"id": "quetzalcoatl_u", "name": "Divine Tempest", "type": "aoe", "power": 175, "chakra_cost": 80, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=35, duration=1), _eff("extra_turn", chance=15)], "description": "A divine wind that stuns all enemies and may allow another action."},
    ],
    "passive": {"id": "quetzalcoatl_p", "name": "Feathered Serpent", "effect_type": "speed_boost_self", "description": "Gains +15% speed after landing a critical hit.", "params": {"spd_boost": 15}, "signature": True},
},

"amaterasu": {
    "skills": [
        {"id": "amaterasu_b", "name": "Sun Ray", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 36, "element": "Light", "description": "A beam of sunlight that builds extra chakra."},
        {"id": "amaterasu_a", "name": "Healing Dawn", "type": "aoe_heal", "power": 160, "chakra_cost": 55, "chakra_gain": 0, "element": "Light", "effects": [_eff("regen", chance=100, duration=3, value=14), _eff("cleanse", chance=100)], "description": "A dawn light that heals all allies, cleanses debuffs, and grants regeneration."},
        {"id": "amaterasu_u", "name": "Supreme Radiance", "type": "aoe_heal", "power": 220, "chakra_cost": 85, "chakra_gain": 0, "element": "Light", "effects": [_eff("cleanse", chance=100), _eff("immunity", chance=100, duration=2), _eff("team_atk_up", chance=100, duration=2, value=18)], "description": "A supreme radiance that heals all allies, cleanses, grants immunity, and boosts attack."},
    ],
    "passive": {"id": "amaterasu_p", "name": "Sun Goddess", "effect_type": "team_regen_ward", "description": "At the start of each round, all allies regenerate 8% of their max HP and gain debuff resistance.", "params": {"regen_pct": 8}, "signature": True},
},

"loki": {
    "skills": [
        {"id": "loki_b", "name": "Trick Slash", "type": "attack", "power": 108, "chakra_cost": 0, "chakra_gain": 34, "element": "Dark", "description": "A deceptive slash that builds extra chakra."},
        {"id": "loki_a", "name": "Illusion Strike", "type": "attack", "power": 185, "chakra_cost": 44, "chakra_gain": 0, "element": "Dark", "effects": [_eff("extra_turn", chance=30), _eff("dispel", chance=75)], "description": "A trickster's strike with a 30% chance to act again and dispel enemy buffs."},
        {"id": "loki_u", "name": "Ragnarok Trick", "type": "aoe", "power": 160, "chakra_cost": 80, "chakra_gain": 0, "element": "Dark", "effects": [_eff("dispel", chance=100), _eff("atk_down", chance=80, duration=2, value=25), _eff("extra_turn", chance=20)], "description": "A cataclysmic trick that dispels all enemy buffs, weakens them, and may allow another action."},
    ],
    "passive": {"id": "loki_p", "name": "Trickster Unbound", "effect_type": "adaptive_element", "description": "Shifts its active element to counter the strongest element in the enemy team.", "params": {}, "signature": True},
},

"hephaestus": {
    "skills": [
        {"id": "hephaestus_b", "name": "Forge Hammer", "type": "attack", "power": 115, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A smith's hammer blow that builds chakra."},
        {"id": "hephaestus_a", "name": "Molten Strike", "type": "attack", "power": 210, "chakra_cost": 48, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=85, duration=3, value=30), _eff("damage_reflect", chance=100, duration=2, value=25)], "description": "A molten strike that burns the enemy and grants Hephaestus 25% damage reflect."},
        {"id": "hephaestus_u", "name": "Divine Forge", "type": "aoe", "power": 180, "chakra_cost": 85, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=90, duration=3, value=35), _eff("def_down", chance=80, duration=2, value=22)], "description": "A forge eruption that burns and shatters the defense of all enemies."},
    ],
    "passive": {"id": "hephaestus_p", "name": "Divine Artificer", "effect_type": "damage_reflect_passive", "description": "Reflects 15% of all damage taken back to the attacker.", "params": {"reflect_pct": 15}, "signature": True},
},

"leviathan": {
    "skills": [
        {"id": "leviathan_b", "name": "Abyssal Bite", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 30, "element": "Water", "description": "A deep-sea bite that builds chakra."},
        {"id": "leviathan_a", "name": "Serpent's Coil", "type": "taunt", "power": 0, "chakra_cost": 45, "chakra_gain": 0, "element": "Water", "effects": [_eff("taunt", chance=100, duration=2), _eff("def_up", chance=100, duration=2, value=40), _eff("damage_reflect", chance=100, duration=2, value=20)], "description": "Leviathan taunts all enemies, hardens its scales, and reflects 20% of damage taken."},
        {"id": "leviathan_u", "name": "Abyssal Maelstrom", "type": "aoe", "power": 150, "chakra_cost": 80, "chakra_gain": 0, "element": "Water", "effects": [_eff("stun", chance=30, duration=1), _eff("def_down", chance=75, duration=2, value=22)], "description": "A maelstrom that stuns and shreds the defense of all enemies."},
    ],
    "passive": {"id": "leviathan_p", "name": "Serpent of the Abyss", "effect_type": "intercept_lowest_hp", "description": "Intercepts 30% of damage aimed at the lowest-HP ally.", "params": {"intercept_pct": 30}, "signature": True},
},

"brahma": {
    "skills": [
        {"id": "brahma_b", "name": "Creator's Hand", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 36, "element": "Light", "description": "A creator's touch that builds extra chakra."},
        {"id": "brahma_a", "name": "World Genesis", "type": "aoe_heal", "power": 200, "chakra_cost": 60, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_atk_up", chance=100, duration=3, value=20), _eff("team_def_up", chance=100, duration=3, value=20), _eff("regen", chance=100, duration=3, value=15)], "description": "A genesis that heals all allies and grants attack, defense, and regeneration buffs."},
        {"id": "brahma_u", "name": "Creator's Miracle", "type": "revive", "power": 0, "chakra_cost": 90, "chakra_gain": 0, "element": "Light", "effects": [_eff("revive_ally", chance=100, hp_pct=50), _eff("team_atk_up", chance=100, duration=3, value=25), _eff("immunity", chance=100, duration=2)], "description": "Revives a fallen ally with 50% HP, boosts team attack, and grants immunity to all allies."},
    ],
    "passive": {"id": "brahma_p", "name": "Creator of Worlds", "effect_type": "team_regen_ward", "description": "At the start of each round, all allies regenerate 10% of their max HP and gain debuff resistance.", "params": {"regen_pct": 10}, "signature": True},
},

"apep": {
    "skills": [
        {"id": "apep_b", "name": "Chaos Fang", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A chaos serpent fang that builds chakra."},
        {"id": "apep_a", "name": "Withering Curse", "type": "attack", "power": 195, "chakra_cost": 46, "chakra_gain": 0, "element": "Dark", "effects": [_eff("poison", chance=85, duration=3, value=28), _eff("dispel", chance=80)], "description": "A chaos curse that poisons and dispels all buffs from the target."},
        {"id": "apep_u", "name": "Eternal Chaos", "type": "aoe", "power": 170, "chakra_cost": 85, "chakra_gain": 0, "element": "Dark", "effects": [_eff("poison", chance=95, duration=3, value=32), _eff("dispel", chance=100), _eff("atk_down", chance=85, duration=2, value=25)], "description": "A wave of chaos that poisons, dispels, and weakens all enemies."},
    ],
    "passive": {"id": "apep_p", "name": "Chaos Serpent", "effect_type": "escalating_dot", "description": "Applies a curse that deals increasing damage each round it persists.", "params": {"base_pct": 22, "max_stacks": 3}, "signature": True},
},

# ───────────────────────────── V2 HEROES ─────────────────────────────

"pebble": {
    "skills": [
        {"id": "pebble_b", "name": "Stone Throw", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 30, "element": "Earth", "description": "A thrown stone that builds chakra."},
        {"id": "pebble_a", "name": "Pebble Guard", "type": "taunt", "power": 0, "chakra_cost": 38, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("def_up", chance=100, duration=2, value=25)], "description": "Pebble taunts enemies and hardens into stone."},
        {"id": "pebble_u", "name": "Rock Slide", "type": "aoe", "power": 120, "chakra_cost": 68, "chakra_gain": 0, "element": "Earth", "effects": [_eff("def_down", chance=60, duration=2, value=15)], "description": "A rock slide that hits all enemies and weakens defense."},
    ],
    "passive": {"id": "pebble_p", "name": "Stonebound", "effect_type": "damage_reduction", "description": "Takes 10% reduced damage from all sources.", "params": {"reduction_pct": 10}, "signature": True},
},

"spritz": {
    "skills": [
        {"id": "spritz_b", "name": "Splash Jab", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 28, "element": "Water", "description": "A splash attack that builds chakra."},
        {"id": "spritz_a", "name": "Bubble Trap", "type": "attack", "power": 160, "chakra_cost": 40, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=30, duration=1), _eff("atk_down", chance=50, duration=2, value=15)], "description": "A bubble that may freeze and weakens the enemy's attack."},
        {"id": "spritz_u", "name": "Water Cannon", "type": "aoe", "power": 130, "chakra_cost": 68, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=20, duration=1)], "description": "A water cannon that hits all enemies with a chance to freeze."},
    ],
    "passive": {"id": "spritz_p", "name": "Puddle Splasher", "effect_type": "crit_boost_self", "description": "Gains +5% crit rate after each hit, stacking up to 3 times.", "params": {"crit_boost": 5, "max_stacks": 3}, "signature": True},
},

"cinderling": {
    "skills": [
        {"id": "cinderling_b", "name": "Ember Spark", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A small fire spark that builds chakra."},
        {"id": "cinderling_a", "name": "Flame Burst", "type": "attack", "power": 155, "chakra_cost": 42, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=60, duration=2, value=18)], "description": "A burst of flame that burns the target."},
        {"id": "cinderling_u", "name": "Campfire Blaze", "type": "aoe", "power": 130, "chakra_cost": 70, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=65, duration=3, value=20)], "description": "A blaze that burns all enemies."},
    ],
    "passive": {"id": "cinderling_p", "name": "Enthusiastic Flame", "effect_type": "burn_dot", "description": "Attacks have a 30% chance to apply a small burn (8% of ATK per turn).", "params": {"burn_pct": 8, "chance": 30}, "signature": True},
},

"petal": {
    "skills": [
        {"id": "petal_b", "name": "Petal Dart", "type": "attack", "power": 78, "chakra_cost": 0, "chakra_gain": 34, "element": "Wind", "description": "A gentle petal dart that builds extra chakra."},
        {"id": "petal_a", "name": "Soothing Breeze", "type": "heal", "power": 200, "chakra_cost": 48, "chakra_gain": 0, "element": "Wind", "effects": [_eff("regen", chance=100, duration=3, value=12)], "description": "Heals an ally and grants regeneration."},
        {"id": "petal_u", "name": "Garden of Healing", "type": "aoe_heal", "power": 150, "chakra_cost": 72, "chakra_gain": 0, "element": "Wind", "effects": [_eff("regen", chance=100, duration=2, value=10)], "description": "Heals all allies and grants regeneration."},
    ],
    "passive": {"id": "petal_p", "name": "Gentle Mending", "effect_type": "heal_boost", "description": "Healing abilities restore 12% more HP.", "params": {"heal_boost": 12}, "signature": True},
},

"glimmer": {
    "skills": [
        {"id": "glimmer_b", "name": "Candle Beam", "type": "attack", "power": 82, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A candle beam that builds extra chakra."},
        {"id": "glimmer_a", "name": "Steadying Light", "type": "shield", "power": 130, "chakra_cost": 45, "chakra_gain": 0, "element": "Light", "effects": [_eff("cleanse", chance=100)], "description": "Shields an ally and cleanses their debuffs."},
        {"id": "glimmer_u", "name": "Lantern Flare", "type": "team_buff", "power": 0, "chakra_cost": 70, "chakra_gain": 0, "element": "Light", "effects": [_eff("team_def_up", chance=100, duration=2, value=18), _eff("team_atk_up", chance=100, duration=2, value=12)], "description": "A lantern flare that boosts all allies' defense and attack."},
    ],
    "passive": {"id": "glimmer_p", "name": "Candlewick Ward", "effect_type": "chakra_gain_boost", "description": "Generates +6 extra chakra for the whole team each turn.", "params": {"chakra_boost": 6}, "signature": True},
},

"shiver": {
    "skills": [
        {"id": "shiver_b", "name": "Shadow Stab", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 30, "element": "Dark", "description": "A quick shadow stab that builds chakra."},
        {"id": "shiver_a", "name": "Backstab", "type": "attack", "power": 170, "chakra_cost": 42, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=60, duration=2, value=18)], "description": "A vicious backstab that bleeds the target."},
        {"id": "shiver_u", "name": "Alley Ambush", "type": "attack", "power": 220, "chakra_cost": 75, "chakra_gain": 0, "element": "Dark", "effects": [_eff("extra_turn", chance=15), _eff("bleed", chance=70, duration=3, value=22)], "description": "An ambush strike with a chance to act again and heavy bleed."},
    ],
    "passive": {"id": "shiver_p", "name": "Reckless Strike", "effect_type": "bonus_vs_full_hp", "description": "Deals 20% bonus damage to targets at full HP.", "params": {"bonus": 0.20}, "signature": True},
},

"voltling": {
    "skills": [
        {"id": "voltling_b", "name": "Static Zap", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 32, "element": "Lightning", "description": "A static zap that builds chakra."},
        {"id": "voltling_a", "name": "Short Circuit", "type": "attack", "power": 140, "chakra_cost": 42, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=40, duration=1), _eff("shock", chance=55, duration=2, value=30)], "description": "A short circuit that stuns and shocks the target."},
        {"id": "voltling_u", "name": "Static Field", "type": "aoe", "power": 115, "chakra_cost": 70, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=30, duration=1), _eff("shock", chance=65, duration=2, value=32)], "description": "A static field that stuns and shocks all enemies."},
    ],
    "passive": {"id": "voltling_p", "name": "Static Novice", "effect_type": "stun_chance", "description": "Every attack has a 12% chance to stun the target for 1 turn.", "params": {"stun_chance": 12}, "signature": True},
},

"rockling": {
    "skills": [
        {"id": "rockling_b", "name": "Rubble Toss", "type": "attack", "power": 100, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "A rubble toss that builds chakra."},
        {"id": "rockling_a", "name": "Brawler's Maul", "type": "attack", "power": 165, "chakra_cost": 42, "chakra_gain": 0, "element": "Earth", "effects": [_eff("bleed", chance=55, duration=2, value=16), _eff("def_down", chance=45, duration=2, value=15)], "description": "A savage maul that bleeds and weakens defense."},
        {"id": "rockling_u", "name": "Rubble Rampage", "type": "aoe", "power": 150, "chakra_cost": 75, "chakra_gain": 0, "element": "Earth", "effects": [_eff("bleed", chance=60, duration=2, value=18)], "description": "A rampage of rubble that bleeds all enemies."},
    ],
    "passive": {"id": "rockling_p", "name": "Momentum", "effect_type": "atk_scaling_turns", "description": "Gains +5% attack each turn, stacking up to 4 times.", "params": {"atk_boost": 5, "max_stacks": 4}, "signature": True},
},

"pyra_emberling": {
    "skills": [
        {"id": "pyra_b", "name": "Scholar's Spark", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A studied flame spark that builds chakra."},
        {"id": "pyra_a", "name": "Ember Pattern", "type": "attack", "power": 155, "chakra_cost": 42, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=65, duration=3, value=20), _eff("atk_down", chance=45, duration=2, value=14)], "description": "A pattern of embers that burns and weakens the target."},
        {"id": "pyra_u", "name": "Scholar's Inferno", "type": "aoe", "power": 140, "chakra_cost": 72, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=75, duration=3, value=24), _eff("def_down", chance=55, duration=2, value=16)], "description": "A calculated inferno that burns and weakens all enemies."},
    ],
    "passive": {"id": "pyra_p", "name": "Ember Study", "effect_type": "burn_dot", "description": "Attacks have a 40% chance to apply a burn (10% of ATK per turn for 2 turns).", "params": {"burn_pct": 10, "chance": 40}, "signature": True},
},

"nyx_wailer": {
    "skills": [
        {"id": "nyx_b", "name": "Mourning Cry", "type": "attack", "power": 78, "chakra_cost": 0, "chakra_gain": 34, "element": "Dark", "description": "A sorrowful cry that builds extra chakra."},
        {"id": "nyx_a", "name": "Dirge of Sorrow", "type": "heal", "power": 210, "chakra_cost": 50, "chakra_gain": 0, "element": "Dark", "effects": [_eff("regen", chance=100, duration=2, value=14), _eff("cleanse", chance=100)], "description": "A mourning dirge that heals, cleanses, and grants regeneration."},
        {"id": "nyx_u", "name": "Underworld Lament", "type": "revive", "power": 0, "chakra_cost": 80, "chakra_gain": 0, "element": "Dark", "effects": [_eff("revive_ally", chance=100, hp_pct=30), _eff("regen", chance=100, duration=2, value=10)], "description": "A lament that revives a fallen ally with 30% HP and grants regeneration."},
    ],
    "passive": {"id": "nyx_p", "name": "Mourning Chanter", "effect_type": "heal_boost", "description": "Healing abilities restore 15% more HP.", "params": {"heal_boost": 15}, "signature": True},
},

"gale_binder": {
    "skills": [
        {"id": "gale_binder_b", "name": "Windrope Lash", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 32, "element": "Wind", "description": "A windrope lash that builds chakra."},
        {"id": "gale_binder_a", "name": "Binding Snare", "type": "attack", "power": 135, "chakra_cost": 42, "chakra_gain": 0, "element": "Wind", "effects": [_eff("freeze", chance=45, duration=1), _eff("spd_up", chance=100, duration=2, value=12)], "description": "A snare that may freeze the target and boosts own speed."},
        {"id": "gale_binder_u", "name": "Cyclone Prison", "type": "aoe", "power": 120, "chakra_cost": 72, "chakra_gain": 0, "element": "Wind", "effects": [_eff("freeze", chance=35, duration=1), _eff("atk_down", chance=60, duration=2, value=16)], "description": "A cyclone prison that freezes and weakens all enemies."},
    ],
    "passive": {"id": "gale_binder_p", "name": "Windrope Adept", "effect_type": "freeze_chance", "description": "Every attack has a 15% chance to freeze the target for 1 turn.", "params": {"freeze_chance": 15}, "signature": True},
},

"krag_stoneshoulder": {
    "skills": [
        {"id": "krag_b", "name": "Quarry Smash", "type": "attack", "power": 102, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "A quarry smash that builds chakra."},
        {"id": "krag_a", "name": "Iron Fist", "type": "attack", "power": 170, "chakra_cost": 42, "chakra_gain": 0, "element": "Earth", "effects": [_eff("bleed", chance=55, duration=2, value=16), _eff("stun", chance=20, duration=1)], "description": "An iron fist blow that bleeds and may stun."},
        {"id": "krag_u", "name": "Bastion Breaker", "type": "aoe", "power": 155, "chakra_cost": 75, "chakra_gain": 0, "element": "Earth", "effects": [_eff("def_down", chance=65, duration=2, value=18), _eff("bleed", chance=55, duration=2, value=18)], "description": "A bastion-breaking slam that bleeds and weakens all enemies."},
    ],
    "passive": {"id": "krag_p", "name": "Quarry Champion", "effect_type": "atk_scaling_turns", "description": "Gains +6% attack each turn, stacking up to 3 times.", "params": {"atk_boost": 6, "max_stacks": 3}, "signature": True},
},

"vesper_flameweaver": {
    "skills": [
        {"id": "vesper_b", "name": "Ember Loom", "type": "attack", "power": 92, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A woven flame ribbon that builds chakra."},
        {"id": "vesper_a", "name": "Flame Ribbon Cut", "type": "attack", "power": 175, "chakra_cost": 44, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=70, duration=3, value=22), _eff("bleed", chance=40, duration=2, value=14)], "description": "A cutting ribbon of fire that burns and bleeds the target."},
        {"id": "vesper_u", "name": "Ember Tapestry", "type": "aoe", "power": 160, "chakra_cost": 78, "chakra_gain": 0, "element": "Fire", "effects": [_eff("burn", chance=80, duration=3, value=26), _eff("def_down", chance=60, duration=2, value=18)], "description": "A tapestry of fire that burns and weakens all enemies."},
    ],
    "passive": {"id": "vesper_p", "name": "Ember Loomkeeper", "effect_type": "burn_dot", "description": "Attacks apply a burn (12% of ATK per turn for 2 turns).", "params": {"burn_pct": 12, "duration": 2}, "signature": True},
},

"coralia_tidesong": {
    "skills": [
        {"id": "coralia_b", "name": "Reef Song", "type": "attack", "power": 80, "chakra_cost": 0, "chakra_gain": 34, "element": "Water", "description": "A coral song that builds extra chakra."},
        {"id": "coralia_a", "name": "Tidal Mending", "type": "heal", "power": 230, "chakra_cost": 50, "chakra_gain": 0, "element": "Water", "effects": [_eff("regen", chance=100, duration=3, value=14), _eff("cleanse", chance=100)], "description": "A healing tide that restores, cleanses, and grants regeneration."},
        {"id": "coralia_u", "name": "Ocean's Lullaby", "type": "aoe_heal", "power": 180, "chakra_cost": 78, "chakra_gain": 0, "element": "Water", "effects": [_eff("cleanse", chance=100), _eff("regen", chance=100, duration=2, value=12), _eff("immunity", chance=100, duration=1)], "description": "A lullaby that heals all allies, cleanses, grants regeneration, and brief immunity."},
    ],
    "passive": {"id": "coralia_p", "name": "Reef Chorister", "effect_type": "heal_boost", "description": "Healing abilities restore 18% more HP.", "params": {"heal_boost": 18}, "signature": True},
},

"zephyrine_stormbind": {
    "skills": [
        {"id": "zephyrine_b", "name": "Cyclone Snare", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 32, "element": "Wind", "description": "A cyclone snare that builds chakra."},
        {"id": "zephyrine_a", "name": "Storm Bind", "type": "attack", "power": 150, "chakra_cost": 44, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=45, duration=1), _eff("freeze", chance=30, duration=1)], "description": "A storm binding that may stun or freeze the target."},
        {"id": "zephyrine_u", "name": "Cyclone Warden's Prison", "type": "aoe", "power": 130, "chakra_cost": 76, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=40, duration=1), _eff("atk_down", chance=70, duration=2, value=18)], "description": "A cyclone prison that stuns and weakens all enemies."},
    ],
    "passive": {"id": "zephyrine_p", "name": "Cyclone Warden", "effect_type": "stun_chance", "description": "Every attack has a 18% chance to stun the target for 1 turn.", "params": {"stun_chance": 18}, "signature": True},
},

"grondar_ironfist": {
    "skills": [
        {"id": "grondar_b", "name": "Iron Haymaker", "type": "attack", "power": 105, "chakra_cost": 0, "chakra_gain": 28, "element": "Earth", "description": "An iron haymaker that builds chakra."},
        {"id": "grondar_a", "name": "Bastion Crush", "type": "attack", "power": 175, "chakra_cost": 44, "chakra_gain": 0, "element": "Earth", "effects": [_eff("stun", chance=30, duration=1), _eff("def_down", chance=65, duration=2, value=20)], "description": "A crushing blow that stuns and shatters defense."},
        {"id": "grondar_u", "name": "Iron Rampage", "type": "aoe", "power": 160, "chakra_cost": 78, "chakra_gain": 0, "element": "Earth", "effects": [_eff("bleed", chance=65, duration=3, value=20), _eff("def_down", chance=70, duration=2, value=20)], "description": "An iron rampage that bleeds and shatters the defense of all enemies."},
    ],
    "passive": {"id": "grondar_p", "name": "Bastion Breaker", "effect_type": "hp_scaling_power", "description": "Grows stronger as HP drops — up to +40% damage at low HP.", "params": {"max_bonus": 0.40}, "signature": True},
},

"susanoo": {
    "skills": [
        {"id": "susanoo_b", "name": "Storm Blade", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 32, "element": "Wind", "description": "A storm-wrapped blade that builds chakra."},
        {"id": "susanoo_a", "name": "Tempest Grasp", "type": "attack", "power": 160, "chakra_cost": 44, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=50, duration=1), _eff("freeze", chance=35, duration=1)], "description": "A tempest grasp with high stun and freeze chances."},
        {"id": "susanoo_u", "name": "Storm Tempest Lord", "type": "aoe", "power": 145, "chakra_cost": 80, "chakra_gain": 0, "element": "Wind", "effects": [_eff("stun", chance=45, duration=1), _eff("freeze", chance=30, duration=1), _eff("atk_down", chance=75, duration=2, value=22)], "description": "A tempest that stuns, freezes, and weakens all enemies."},
    ],
    "passive": {"id": "susanoo_p", "name": "Storm Tempest Lord", "effect_type": "stun_chance", "description": "Every attack has a 22% chance to stun the target for 1 turn.", "params": {"stun_chance": 22}, "signature": True},
},

"freyja": {
    "skills": [
        {"id": "freyja_b", "name": "Valkyrie Strike", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A valkyrie strike that builds extra chakra."},
        {"id": "freyja_a", "name": "Matron's Grace", "type": "heal", "power": 250, "chakra_cost": 52, "chakra_gain": 0, "element": "Light", "effects": [_eff("regen", chance=100, duration=3, value=16), _eff("immunity", chance=100, duration=1)], "description": "A grace that heals heavily, grants regeneration, and brief immunity."},
        {"id": "freyja_u", "name": "Valkyrie's Revival", "type": "revive", "power": 0, "chakra_cost": 85, "chakra_gain": 0, "element": "Light", "effects": [_eff("revive_ally", chance=100, hp_pct=40), _eff("team_atk_up", chance=100, duration=2, value=18), _eff("regen", chance=100, duration=2, value=12)], "description": "Revives a fallen ally with 40% HP, boosts team attack, and grants regeneration."},
    ],
    "passive": {"id": "freyja_p", "name": "Valkyrie Matron", "effect_type": "revive_ally_passive", "description": "Once per battle, automatically revives a fallen ally with 25% HP on Freyja's turn.", "params": {"revive_hp_pct": 25}, "signature": True},
},

"ares": {
    "skills": [
        {"id": "ares_b", "name": "War Cry", "type": "attack", "power": 108, "chakra_cost": 0, "chakra_gain": 30, "element": "Fire", "description": "A war cry strike that builds chakra."},
        {"id": "ares_a", "name": "Relentless Maul", "type": "attack", "power": 185, "chakra_cost": 44, "chakra_gain": 0, "element": "Fire", "effects": [_eff("bleed", chance=70, duration=3, value=22), _eff("atk_up", chance=100, duration=2, value=20)], "description": "A savage maul that bleeds and enrages Ares, boosting his attack."},
        {"id": "ares_u", "name": "War Incarnate", "type": "aoe", "power": 170, "chakra_cost": 80, "chakra_gain": 0, "element": "Fire", "effects": [_eff("bleed", chance=80, duration=3, value=25), _eff("atk_up", chance=100, duration=2, value=25)], "description": "A war incarnate rampage that bleeds all enemies and massively boosts Ares' attack."},
    ],
    "passive": {"id": "ares_p", "name": "War Incarnate", "effect_type": "berserk_low_hp", "description": "When below 40% HP, deals 35% more damage.", "params": {"threshold": 0.40, "bonus": 0.35}, "signature": True},
},

"kali": {
    "skills": [
        {"id": "kali_b", "name": "Destroyer's Slash", "type": "attack", "power": 110, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A destroyer's slash that builds chakra."},
        {"id": "kali_a", "name": "Time's Edge", "type": "attack", "power": 190, "chakra_cost": 46, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=80, duration=3, value=26), _eff("extra_turn", chance=20)], "description": "A time-cutting blade that bleeds and has a 20% chance to act again."},
        {"id": "kali_u", "name": "Destroyer of Time", "type": "aoe", "power": 165, "chakra_cost": 82, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=85, duration=3, value=28), _eff("atk_down", chance=80, duration=2, value=22), _eff("extra_turn", chance=15)], "description": "A temporal destruction that bleeds, weakens all enemies, and may allow another action."},
    ],
    "passive": {"id": "kali_p", "name": "Destroyer of Time", "effect_type": "escalating_dot", "description": "Applies a curse that deals increasing damage each round it persists.", "params": {"base_pct": 22, "max_stacks": 3}, "signature": True},
},

"odin": {
    "skills": [
        {"id": "odin_b", "name": "Spear of Wisdom", "type": "attack", "power": 92, "chakra_cost": 0, "chakra_gain": 36, "element": "Lightning", "description": "An ancient spear strike that builds extra chakra."},
        {"id": "odin_a", "name": "Rallying Warcry", "type": "team_buff", "power": 0, "chakra_cost": 52, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("team_atk_up", chance=100, duration=3, value=25), _eff("team_def_up", chance=100, duration=2, value=15)], "description": "A warcry that boosts all allies' attack by 25% and defense by 15% for 3 turns."},
        {"id": "odin_u", "name": "All-Father's Wisdom", "type": "aoe_heal", "power": 180, "chakra_cost": 85, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("team_atk_up", chance=100, duration=2, value=20), _eff("cleanse", chance=100), _eff("immunity", chance=100, duration=1)], "description": "Heals all allies, cleanses, boosts attack, and grants brief immunity."},
    ],
    "passive": {"id": "odin_p", "name": "All-Father", "effect_type": "team_atk_buff", "description": "At the start of battle, all allies gain +20% attack for 3 turns.", "params": {"atk_boost": 20, "duration": 3}, "signature": True},
},

"sekhmet": {
    "skills": [
        {"id": "sekhmet_b", "name": "Lioness Claw", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 32, "element": "Fire", "description": "A lioness claw strike that builds chakra."},
        {"id": "sekhmet_a", "name": "Blood Mark", "type": "attack", "power": 185, "chakra_cost": 46, "chakra_gain": 0, "element": "Fire", "effects": [_eff("bleed", chance=80, duration=3, value=24)], "description": "A marking strike that applies Blood Mark stacks. At 3 stacks, it detonates for massive bonus damage."},
        {"id": "sekhmet_u", "name": "Plague Breath", "type": "aoe", "power": 170, "chakra_cost": 82, "chakra_gain": 0, "element": "Fire", "effects": [_eff("bleed", chance=85, duration=3, value=26), _eff("atk_down", chance=75, duration=2, value=22), _eff("extra_turn", chance=15)], "description": "A plague breath that bleeds, weakens all enemies, and may allow another action."},
    ],
    "passive": {"id": "sekhmet_p", "name": "Lioness of War", "effect_type": "stacking_mark_detonate", "description": "Every attack applies a Blood Mark stack; at 3 stacks the mark detonates for bonus damage.", "params": {"stacks_to_detonate": 3, "detonate_pct": 80}, "signature": True},
},

"inari": {
    "skills": [
        {"id": "inari_b", "name": "Fox Flame", "type": "attack", "power": 90, "chakra_cost": 0, "chakra_gain": 32, "element": "Light", "description": "A fox flame that builds chakra."},
        {"id": "inari_a", "name": "Fortune's Blessing", "type": "attack", "power": 170, "chakra_cost": 46, "chakra_gain": 0, "element": "Light", "effects": [_eff("burn", chance=70, duration=3, value=24), _eff("team_atk_up", chance=100, duration=2, value=15)], "description": "A blessed flame that burns the enemy and boosts team attack."},
        {"id": "inari_u", "name": "Fox of Fortune", "type": "aoe", "power": 160, "chakra_cost": 80, "chakra_gain": 0, "element": "Light", "effects": [_eff("burn", chance=80, duration=3, value=28), _eff("team_atk_up", chance=100, duration=2, value=18), _eff("regen", chance=100, duration=2, value=10)], "description": "A fortune flame that burns all enemies, boosts team attack, and grants regeneration."},
    ],
    "passive": {"id": "inari_p", "name": "Fox of Fortune", "effect_type": "chakra_gain_boost", "description": "Generates +12 extra chakra for the whole team each turn.", "params": {"chakra_boost": 12}, "signature": True},
},

"ra": {
    "skills": [
        {"id": "ra_b", "name": "Sun Spear", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 34, "element": "Light", "description": "A solar spear that builds extra chakra."},
        {"id": "ra_a", "name": "Solar Flare", "type": "attack", "power": 200, "chakra_cost": 48, "chakra_gain": 0, "element": "Light", "effects": [_eff("burn", chance=85, duration=3, value=30), _eff("dispel", chance=75)], "description": "A solar flare that burns and dispels enemy buffs."},
        {"id": "ra_u", "name": "Sun Sovereign's Decree", "type": "aoe", "power": 185, "chakra_cost": 85, "chakra_gain": 0, "element": "Light", "effects": [_eff("burn", chance=95, duration=3, value=35), _eff("dispel", chance=100), _eff("team_atk_up", chance=100, duration=2, value=20)], "description": "A sovereign decree that burns, dispels all enemy buffs, and boosts team attack."},
    ],
    "passive": {"id": "ra_p", "name": "Sun Sovereign", "effect_type": "cleanse_debuff", "description": "Cleanses one debuff from a random ally each turn.", "params": {"cleanse_per_turn": 1}, "signature": True},
},

"fenrir": {
    "skills": [
        {"id": "fenrir_b", "name": "Wolf Bite", "type": "attack", "power": 112, "chakra_cost": 0, "chakra_gain": 30, "element": "Dark", "description": "A savage wolf bite that builds chakra."},
        {"id": "fenrir_a", "name": "Bound Wolf's Rage", "type": "attack", "power": 195, "chakra_cost": 46, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=80, duration=3, value=26), _eff("atk_up", chance=100, duration=2, value=25)], "description": "A raging bite that bleeds and enrages Fenrir, boosting his attack."},
        {"id": "fenrir_u", "name": "Unchained Fury", "type": "aoe", "power": 175, "chakra_cost": 82, "chakra_gain": 0, "element": "Dark", "effects": [_eff("bleed", chance=90, duration=3, value=30), _eff("atk_up", chance=100, duration=2, value=30), _eff("extra_turn", chance=20)], "description": "An unchained fury that bleeds all enemies, massively boosts attack, and may allow another action."},
    ],
    "passive": {"id": "fenrir_p", "name": "The Bound Wolf", "effect_type": "counter_taunt", "description": "When struck, has a 35% chance to counter-attack for 60% damage.", "params": {"counter_chance": 35, "counter_pct": 60}, "signature": True},
},

"perun": {
    "skills": [
        {"id": "perun_b", "name": "Thunder Warlord Strike", "type": "attack", "power": 115, "chakra_cost": 0, "chakra_gain": 30, "element": "Lightning", "description": "A warlord's thunder strike that builds chakra."},
        {"id": "perun_a", "name": "Lightning Crash", "type": "attack", "power": 215, "chakra_cost": 48, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=45, duration=1), _eff("shock", chance=80, duration=3, value=42)], "description": "A lightning crash with a 45% stun chance and powerful shock."},
        {"id": "perun_u", "name": "Thunder Warlord's Siege", "type": "aoe", "power": 180, "chakra_cost": 85, "chakra_gain": 0, "element": "Lightning", "effects": [_eff("stun", chance=40, duration=1), _eff("shock", chance=90, duration=3, value=48), _eff("extra_turn", chance=15)], "description": "A thunder siege that stuns, shocks all enemies, and may allow another action."},
    ],
    "passive": {"id": "perun_p", "name": "Thunder Warlord", "effect_type": "stun_chance", "description": "Every attack has a 22% chance to stun the target for 1 turn.", "params": {"stun_chance": 22}, "signature": True},
},

"tlaloc": {
    "skills": [
        {"id": "tlaloc_b", "name": "Rain Spear", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 32, "element": "Water", "description": "A rain spear that builds chakra."},
        {"id": "tlaloc_a", "name": "Rainstorm Bind", "type": "attack", "power": 155, "chakra_cost": 44, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=50, duration=1), _eff("stun", chance=30, duration=1), _eff("atk_down", chance=65, duration=2, value=18)], "description": "A rainstorm that freezes, stuns, and weakens the target."},
        {"id": "tlaloc_u", "name": "Rainstorm Sovereign's Flood", "type": "aoe", "power": 140, "chakra_cost": 80, "chakra_gain": 0, "element": "Water", "effects": [_eff("freeze", chance=40, duration=1), _eff("stun", chance=35, duration=1), _eff("atk_down", chance=80, duration=2, value=22)], "description": "A cataclysmic flood that freezes, stuns, and weakens all enemies."},
    ],
    "passive": {"id": "tlaloc_p", "name": "Rainstorm Sovereign", "effect_type": "freeze_chance", "description": "Every attack has a 22% chance to freeze the target for 1 turn.", "params": {"freeze_chance": 22}, "signature": True},
},

"izanami": {
    "skills": [
        {"id": "izanami_b", "name": "Underworld Touch", "type": "attack", "power": 82, "chakra_cost": 0, "chakra_gain": 34, "element": "Dark", "description": "An underworld touch that builds extra chakra."},
        {"id": "izanami_a", "name": "Queen's Mercy", "type": "heal", "power": 240, "chakra_cost": 52, "chakra_gain": 0, "element": "Dark", "effects": [_eff("regen", chance=100, duration=3, value=15), _eff("cleanse", chance=100)], "description": "A queen's mercy that heals, cleanses, and grants regeneration."},
        {"id": "izanami_u", "name": "Underworld Resurrection", "type": "revive", "power": 0, "chakra_cost": 88, "chakra_gain": 0, "element": "Dark", "effects": [_eff("revive_ally", chance=100, hp_pct=45), _eff("team_def_up", chance=100, duration=2, value=22), _eff("immunity", chance=100, duration=1)], "description": "Revives a fallen ally with 45% HP, boosts team defense, and grants immunity."},
    ],
    "passive": {"id": "izanami_p", "name": "Queen of the Underworld", "effect_type": "soul_harvest", "description": "Gains +6% attack permanently each time an enemy is defeated.", "params": {"atk_boost": 6}, "signature": True},
},

"ymir": {
    "skills": [
        {"id": "ymir_b", "name": "Giant Smash", "type": "attack", "power": 95, "chakra_cost": 0, "chakra_gain": 30, "element": "Earth", "description": "A primordial giant smash that builds chakra."},
        {"id": "ymir_a", "name": "Primordial Wall", "type": "taunt", "power": 0, "chakra_cost": 45, "chakra_gain": 0, "element": "Earth", "effects": [_eff("taunt", chance=100, duration=2), _eff("def_up", chance=100, duration=2, value=45), _eff("team_def_up", chance=100, duration=2, value=15)], "description": "Ymir taunts all enemies, massively boosts own defense, and grants team defense."},
        {"id": "ymir_u", "name": "Primordial Giant's Wrath", "type": "aoe", "power": 155, "chakra_cost": 80, "chakra_gain": 0, "element": "Earth", "effects": [_eff("stun", chance=30, duration=1), _eff("def_down", chance=80, duration=2, value=22)], "description": "A giant's wrath that stuns and shatters the defense of all enemies."},
    ],
    "passive": {"id": "ymir_p", "name": "Primordial Giant", "effect_type": "team_shield", "description": "At the start of battle, all allies gain a shield equal to 15% of their max HP.", "params": {"shield_pct": 15}, "signature": True},
},

"chronos": {
    "skills": [
        {"id": "chronos_b", "name": "Time Blade", "type": "attack", "power": 88, "chakra_cost": 0, "chakra_gain": 32, "element": "Dark", "description": "A time-cutting blade that builds chakra."},
        {"id": "chronos_a", "name": "Temporal Lock", "type": "attack", "power": 155, "chakra_cost": 44, "chakra_gain": 0, "element": "Dark", "effects": [_eff("stun", chance=50, duration=1), _eff("freeze", chance=40, duration=1)], "description": "A temporal lock with high stun and freeze chances."},
        {"id": "chronos_u", "name": "Warden of Ages", "type": "aoe", "power": 135, "chakra_cost": 82, "chakra_gain": 0, "element": "Dark", "effects": [_eff("stun", chance=45, duration=1), _eff("freeze", chance=40, duration=1), _eff("atk_down", chance=85, duration=2, value=25)], "description": "A temporal ward that stuns, freezes, and weakens all enemies."},
    ],
    "passive": {"id": "chronos_p", "name": "Warden of Ages", "effect_type": "stun_chance", "description": "Every attack has a 25% chance to stun the target for 1 turn.", "params": {"stun_chance": 25}, "signature": True},
},

"yggdrasil_spirit": {
    "skills": [
        {"id": "yggdrasil_b", "name": "Root Strike", "type": "attack", "power": 85, "chakra_cost": 0, "chakra_gain": 36, "element": "Earth", "description": "A root strike that builds extra chakra."},
        {"id": "yggdrasil_a", "name": "World Tree's Blessing", "type": "aoe_heal", "power": 170, "chakra_cost": 55, "chakra_gain": 0, "element": "Earth", "effects": [_eff("regen", chance=100, duration=3, value=16), _eff("cleanse", chance=100), _eff("team_def_up", chance=100, duration=2, value=18)], "description": "A world tree blessing that heals all allies, cleanses, grants regeneration, and boosts defense."},
        {"id": "yggdrasil_u", "name": "Heart of the World Tree", "type": "revive", "power": 0, "chakra_cost": 88, "chakra_gain": 0, "element": "Earth", "effects": [_eff("revive_ally", chance=100, hp_pct=50), _eff("team_def_up", chance=100, duration=3, value=25), _eff("regen", chance=100, duration=3, value=15), _eff("immunity", chance=100, duration=2)], "description": "Revives a fallen ally with 50% HP and grants massive team-wide defense, regeneration, and immunity."},
    ],
    "passive": {"id": "yggdrasil_p", "name": "Heart of the World Tree", "effect_type": "team_regen_ward", "description": "At the start of each round, all allies regenerate 10% of their max HP and gain debuff resistance.", "params": {"regen_pct": 10}, "signature": True},
},

}


def get_hero_kit(hero_id, name, element, rarity, role):
    """Return the bespoke kit for a hero, or None if not found."""
    kit = HERO_KITS.get(hero_id)
    if kit is None:
        return None
    # Apply rarity scaling
    return _scale_kit(kit, rarity, role)


def get_hero_passive(hero_id, role):
    """Return the bespoke passive for a hero, or a generic role passive."""
    kit = HERO_KITS.get(hero_id)
    if kit and "passive" in kit:
        return kit["passive"]
    # Fallback to generic role passive
    from game_data import ROLE_GENERIC_PASSIVE
    g = ROLE_GENERIC_PASSIVE.get(role, ROLE_GENERIC_PASSIVE["Attacker"])
    return {"id": f"generic_{role.lower()}", "name": g["name"], "effect_type": g["effect_type"], "description": g["desc"], "signature": False}
