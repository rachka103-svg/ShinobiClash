/**
 * Frontend mirror of backend/team_synergy.py.
 *
 * Evaluates the player's active team composition and determines
 * applicable synergy bonuses. Synergies are deterministic, clearly
 * communicated, and affect actual combat stats.
 */

import { GAME_ICONS } from "./gameIcons";

const ELEMENT_TAGS = {
  Fire: "FIRE", Water: "WATER", Wind: "WIND", Earth: "EARTH",
  Lightning: "LIGHTNING", Dark: "DARK", Light: "LIGHT",
};

const ROLE_SYNERGY_TAGS = {
  Attacker: "DPS", Assassin: "ASSASSIN", Tank: "TANK",
  Support: "SUPPORT", Healer: "HEALER", Mage: "DPS",
  Control: "CONTROL", Bruiser: "DPS",
};

const TAG_TO_SYNERGY = {
  BURN: "BURN", POISON: "POISON", BLEED: "BLEED",
  STUN: "STUN", FREEZE: "FREEZE", DOT: "DOT",
  SHIELD: "SHIELD", HEAL: "HEAL", LIFESTEAL: "LIFESTEAL",
};

/**
 * Extract synergy tags from a hero template/instance.
 */
export function getSynergyTags(hero) {
  const tags = new Set();
  const element = hero?.element || "";
  if (element in ELEMENT_TAGS) tags.add(ELEMENT_TAGS[element]);
  const role = hero?.role || "";
  if (role in ROLE_SYNERGY_TAGS) tags.add(ROLE_SYNERGY_TAGS[role]);
  for (const tag of (hero?.tags || [])) {
    if (tag in TAG_TO_SYNERGY) tags.add(TAG_TO_SYNERGY[tag]);
  }
  return [...tags];
}

// ---------------------------------------------------------------------------
// Synergy definitions — centralized configuration.
// ---------------------------------------------------------------------------

export const TEAM_SYNERGIES = [
  // Elemental
  { id: "fire_squad", name: "Flame Covenant", icon: GAME_ICONS.fire, category: "elemental", tag: "FIRE",
    tiers: [
      { count: 3, bonuses: { fire_damage_pct: 8 }, label: "3+ Fire Heroes" },
      { count: 4, bonuses: { fire_damage_pct: 15 }, label: "4+ Fire Heroes" },
      { count: 5, bonuses: { fire_damage_pct: 25 }, label: "5 Fire Heroes" },
    ] },
  { id: "water_squad", name: "Tide Covenant", icon: GAME_ICONS.water, category: "elemental", tag: "WATER",
    tiers: [
      { count: 3, bonuses: { water_damage_pct: 8 }, label: "3+ Water Heroes" },
      { count: 4, bonuses: { water_damage_pct: 15 }, label: "4+ Water Heroes" },
      { count: 5, bonuses: { water_damage_pct: 25 }, label: "5 Water Heroes" },
    ] },
  { id: "wind_squad", name: "Gale Covenant", icon: GAME_ICONS.wind, category: "elemental", tag: "WIND",
    tiers: [
      { count: 3, bonuses: { wind_damage_pct: 8 }, label: "3+ Wind Heroes" },
      { count: 4, bonuses: { wind_damage_pct: 15 }, label: "4+ Wind Heroes" },
      { count: 5, bonuses: { wind_damage_pct: 25 }, label: "5 Wind Heroes" },
    ] },
  { id: "earth_squad", name: "Stone Covenant", icon: GAME_ICONS.earth, category: "elemental", tag: "EARTH",
    tiers: [
      { count: 3, bonuses: { earth_damage_pct: 8 }, label: "3+ Earth Heroes" },
      { count: 4, bonuses: { earth_damage_pct: 15 }, label: "4+ Earth Heroes" },
      { count: 5, bonuses: { earth_damage_pct: 25 }, label: "5 Earth Heroes" },
    ] },
  { id: "lightning_squad", name: "Storm Covenant", icon: GAME_ICONS.lightning, category: "elemental", tag: "LIGHTNING",
    tiers: [
      { count: 3, bonuses: { lightning_damage_pct: 8 }, label: "3+ Lightning Heroes" },
      { count: 4, bonuses: { lightning_damage_pct: 15 }, label: "4+ Lightning Heroes" },
      { count: 5, bonuses: { lightning_damage_pct: 25 }, label: "5 Lightning Heroes" },
    ] },
  { id: "dark_squad", name: "Shadow Covenant", icon: GAME_ICONS.dark, category: "elemental", tag: "DARK",
    tiers: [
      { count: 3, bonuses: { dark_damage_pct: 8 }, label: "3+ Dark Heroes" },
      { count: 4, bonuses: { dark_damage_pct: 15 }, label: "4+ Dark Heroes" },
      { count: 5, bonuses: { dark_damage_pct: 25 }, label: "5 Dark Heroes" },
    ] },
  { id: "light_squad", name: "Radiant Covenant", icon: GAME_ICONS.light, category: "elemental", tag: "LIGHT",
    tiers: [
      { count: 3, bonuses: { light_damage_pct: 8 }, label: "3+ Light Heroes" },
      { count: 4, bonuses: { light_damage_pct: 15 }, label: "4+ Light Heroes" },
      { count: 5, bonuses: { light_damage_pct: 25 }, label: "5 Light Heroes" },
    ] },

  // Role
  { id: "tank_dps", name: "Guardian Formation", icon: GAME_ICONS.shield, category: "role",
    requirements: { TANK: 1, DPS: 2 },
    tiers: [{ count: 1, bonuses: { damage_reduction_pct: 5, atk_pct: 5 }, label: "1 Tank + 2 DPS" }] },
  { id: "support_dps", name: "War Support", icon: GAME_ICONS.swords, category: "role",
    requirements: { SUPPORT: 1, DPS: 2 },
    tiers: [{ count: 1, bonuses: { atk_pct: 8 }, label: "1 Support + 2 DPS" }] },
  { id: "healer_tank", name: "Iron Wall", icon: GAME_ICONS.heart, category: "role",
    requirements: { HEALER: 1, TANK: 1 },
    tiers: [{ count: 1, bonuses: { hp_pct: 10, def_pct: 5 }, label: "1 Healer + 1 Tank" }] },
  { id: "assassin_control", name: "Shadow Tactics", icon: GAME_ICONS.dagger, category: "role",
    requirements: { ASSASSIN: 1, CONTROL: 1 },
    tiers: [{ count: 1, bonuses: { atk_pct: 6, crit_chance_pct: 4 }, label: "1 Assassin + 1 Control" }] },
  { id: "double_healer", name: "Divine Mercy", icon: GAME_ICONS.sparkles, category: "role",
    requirements: { HEALER: 2 },
    tiers: [{ count: 2, bonuses: { healing_pct: 15 }, label: "2 Healers" }] },

  // Status
  { id: "burn_squad", name: "Inferno Legion", icon: GAME_ICONS.fire, category: "status", tag: "BURN",
    tiers: [
      { count: 2, bonuses: { burn_damage_pct: 20 }, label: "2+ Burn Specialists" },
      { count: 3, bonuses: { burn_damage_pct: 35 }, label: "3 Burn Specialists" },
    ] },
  { id: "poison_squad", name: "Toxic Legion", icon: GAME_ICONS.poison, category: "status", tag: "POISON",
    tiers: [
      { count: 2, bonuses: { poison_damage_pct: 20 }, label: "2+ Poison Specialists" },
      { count: 3, bonuses: { poison_damage_pct: 35 }, label: "3 Poison Specialists" },
    ] },
  { id: "bleed_squad", name: "Crimson Legion", icon: GAME_ICONS.bleed, category: "status", tag: "BLEED",
    tiers: [
      { count: 2, bonuses: { bleed_damage_pct: 20 }, label: "2+ Bleed Specialists" },
      { count: 3, bonuses: { bleed_damage_pct: 35 }, label: "3 Bleed Specialists" },
    ] },
  { id: "freeze_squad", name: "Frost Legion", icon: GAME_ICONS.freeze, category: "status", tag: "FREEZE",
    tiers: [
      { count: 2, bonuses: { cc_effectiveness_pct: 15 }, label: "2+ Freeze Specialists" },
      { count: 3, bonuses: { cc_effectiveness_pct: 25 }, label: "3 Freeze Specialists" },
    ] },

  // Faction
  { id: "faction_unity", name: "Faction Unity", icon: GAME_ICONS.building, category: "faction",
    factionBased: true,
    tiers: [
      { count: 3, bonuses: { atk_pct: 5, hp_pct: 5 }, label: "3+ Same Faction" },
      { count: 4, bonuses: { atk_pct: 8, hp_pct: 8 }, label: "4+ Same Faction" },
      { count: 5, bonuses: { atk_pct: 12, hp_pct: 12 }, label: "5 Same Faction" },
    ] },
];

/**
 * Evaluate a team's composition and return active synergies + bonuses.
 */
export function evaluateTeamSynergy(teamTemplates) {
  if (!teamTemplates || teamTemplates.length === 0) {
    return { active: [], bonuses: {}, tagCounts: {} };
  }

  const tagCounts = {};
  const factionCounts = {};

  for (const hero of teamTemplates) {
    for (const tag of getSynergyTags(hero)) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    const faction = hero?.faction || "";
    if (faction) factionCounts[faction] = (factionCounts[faction] || 0) + 1;
  }

  const topFaction = Object.entries(factionCounts).sort((a, b) => b[1] - a[1])[0] || ["", 0];

  const activeSynergies = [];
  const totalBonuses = {};

  for (const synergy of TEAM_SYNERGIES) {
    let bestTier = null;

    if (synergy.factionBased) {
      const actual = topFaction[1];
      for (const tier of synergy.tiers) {
        if (actual >= tier.count) bestTier = tier;
      }
    } else if (synergy.requirements) {
      // Multi-requirement synergy (role-based)
      const allMet = Object.entries(synergy.requirements).every(
        ([tag, needed]) => (tagCounts[tag] || 0) >= needed
      );
      if (allMet) {
        bestTier = synergy.tiers[0]; // role synergies have a single tier
      }
    } else if (synergy.tag) {
      // Single-tag count synergy (elemental, status)
      const count = tagCounts[synergy.tag] || 0;
      for (const tier of synergy.tiers) {
        if (count >= tier.count) bestTier = tier;
      }
    }

    if (bestTier) {
      activeSynergies.push({
        id: synergy.id,
        name: synergy.name,
        icon: synergy.icon,
        category: synergy.category,
        label: bestTier.label,
        bonuses: bestTier.bonuses,
      });
      for (const [k, v] of Object.entries(bestTier.bonuses)) {
        totalBonuses[k] = (totalBonuses[k] || 0) + v;
      }
    }
  }

  return { active: activeSynergies, bonuses: totalBonuses, tagCounts };
}

/**
 * Apply synergy bonuses to a combatant's stats.
 */
export function applySynergyToStats(stats, bonuses) {
  if (!bonuses) return stats;
  const result = { ...stats };

  if (bonuses.atk_pct) result.atk = Math.round(result.atk * (1 + bonuses.atk_pct / 100));
  if (bonuses.hp_pct) {
    result.hp = Math.round(result.hp * (1 + bonuses.hp_pct / 100));
    result.maxHp = result.hp;
  }
  if (bonuses.def_pct) result.def = Math.round(result.def * (1 + bonuses.def_pct / 100));
  if (bonuses.spd_pct) result.spd = Math.round(result.spd * (1 + bonuses.spd_pct / 100));
  if (bonuses.crit_chance_pct) {
    result.critChance = (result.critChance || 0.06) + bonuses.crit_chance_pct / 100;
  }

  return result;
}
