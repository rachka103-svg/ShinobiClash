/**
 * Shared game constants — a frontend mirror of the backend growth system
 * (game_data.py). Keeps client-side enemy stat computation consistent with
 * the server so Spire / Boss Hunt / Trial enemies reflect the same
 * rarity-scaled growth rates and evolution star bonus as player heroes.
 */

export const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, LR: 5, GR: 6, MYTHIC: 7 };

// Rarity-based growth rates — higher rarities grow faster per level,
// per ascension, and per evolution star (mirrors backend RARITY_*_GROWTH).
export const RARITY_LEVEL_GROWTH = {
  N: 0.06, R: 0.08, SR: 0.10, SSR: 0.12, UR: 0.14, LR: 0.16, GR: 0.18, MYTHIC: 0.20,
};
export const RARITY_ASCENSION_GROWTH = {
  N: 0.08, R: 0.10, SR: 0.12, SSR: 0.14, UR: 0.16, LR: 0.18, GR: 0.20, MYTHIC: 0.22,
};
export const RARITY_STAR_BONUS = {
  N: 0.12, R: 0.15, SR: 0.18, SSR: 0.21, UR: 0.24, LR: 0.27, GR: 0.30, MYTHIC: 0.33,
};

// Per-rarity star caps (mirrors backend progression.MAX_STARS).
export const MAX_STARS = { R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, GR: 8 };
export const STAR_ABSOLUTE_MAX = 8;

export const STAT_KEYS = ["hp", "atk", "def", "spd", "chakra", "crit_rate", "crit_damage", "accuracy", "resistance"];

export const RARITY_BASE = {
  N:      { hp: 500,  atk: 75,   def: 38,  spd: 80,  chakra: 95,  crit_rate: 4,  crit_damage: 135, accuracy: 83, resistance: 4 },
  R:      { hp: 800,  atk: 115,  def: 60,  spd: 95,  chakra: 100, crit_rate: 6,  crit_damage: 145, accuracy: 87, resistance: 7 },
  SR:     { hp: 1240, atk: 178,  def: 93,  spd: 113, chakra: 118, crit_rate: 8,  crit_damage: 155, accuracy: 89, resistance: 10 },
  SSR:    { hp: 1920, atk: 276,  def: 144, spd: 132, chakra: 138, crit_rate: 11, crit_damage: 170, accuracy: 91, resistance: 15 },
  UR:     { hp: 2980, atk: 430,  def: 224, spd: 155, chakra: 160, crit_rate: 14, crit_damage: 185, accuracy: 93, resistance: 20 },
  LR:     { hp: 4620, atk: 665,  def: 348, spd: 180, chakra: 185, crit_rate: 18, crit_damage: 210, accuracy: 95, resistance: 28 },
  GR:     { hp: 7160, atk: 1030, def: 540, spd: 210, chakra: 215, crit_rate: 22, crit_damage: 240, accuracy: 96, resistance: 36 },
  MYTHIC: { hp: 11100, atk: 1600, def: 837, spd: 244, chakra: 250, crit_rate: 28, crit_damage: 280, accuracy: 98, resistance: 48 },
};

export const ROLE_MOD = {
  Attacker: { hp: 1.0,  atk: 1.0,  def: 1.0,  spd: 1.0,  chakra: 1.0 },
  Tank:     { hp: 1.45, atk: 0.72, def: 1.4,  spd: 0.7,  chakra: 1.0 },
  Support:  { hp: 1.1,  atk: 0.85, def: 1.05, spd: 1.0,  chakra: 1.25 },
  Assassin: { hp: 0.88, atk: 1.15, def: 0.82, spd: 1.25, chakra: 1.1 },
  Mage:     { hp: 0.85, atk: 1.25, def: 0.75, spd: 1.05, chakra: 1.2 },
  Healer:   { hp: 1.05, atk: 0.7,  def: 0.95, spd: 1.0,  chakra: 1.3 },
  Control:  { hp: 0.95, atk: 0.9,  def: 0.9,  spd: 1.15, chakra: 1.15 },
  Bruiser:  { hp: 1.25, atk: 1.05, def: 1.1,  spd: 0.85, chakra: 1.0 },
};

export function maxStarsForRarity(rarity) {
  return MAX_STARS[rarity] ?? STAR_ABSOLUTE_MAX;
}

/**
 * Base stats for a hero at a given (possibly evolved) rarity. Falls back to
 * the template's stored base_stats when the rarity is unchanged (mirrors
 * backend expansion_systems.hero_base_stats).
 */
export function heroBaseStats(rarity, role, template) {
  if (template && rarity === template.rarity) return template.base_stats;
  const b = RARITY_BASE[rarity] || RARITY_BASE.R;
  const m = ROLE_MOD[role] || ROLE_MOD.Attacker;
  const out = {};
  for (const k of STAT_KEYS) {
    out[k] = k in m ? Math.round(b[k] * m[k]) : b[k];
  }
  return out;
}

/**
 * Compute combat stats for a hero/enemy at a given (possibly evolved)
 * rarity, level, ascension, and evolution star count. Mirrors the backend
 * compute_stats_for_rarity + the rarity-scaled star bonus so client-side
 * enemies grow at the same pace as player heroes.
 */
export function computeStatsForRarity(template, level, ascension = 0, rarity, stars = 1) {
  const r = rarity || template.rarity;
  const b = heroBaseStats(r, template.role, template);

  const gl = 1 + (RARITY_LEVEL_GROWTH[r] ?? 0.08) * (level - 1);
  const ga = 1 + (RARITY_ASCENSION_GROWTH[r] ?? 0.10) * ascension;

  let hp = Math.round(b.hp * gl * ga);
  let atk = Math.round(b.atk * gl * ga);
  let def = Math.round(b.def * (1 + 0.08 * (level - 1)) * ga);
  const spd = Math.round(b.spd * (1 + 0.025 * (level - 1)) * (1 + 0.05 * ascension));

  // Rarity-scaled evolution star bonus (growth system's third pillar).
  const starMult = 1 + Math.max(0, (stars || 1) - 1) * (RARITY_STAR_BONUS[r] ?? 0.15);
  hp = Math.round(hp * starMult);
  atk = Math.round(atk * starMult);
  def = Math.round(def * starMult);

  return { hp, atk, def, spd, chakra: b.chakra };
}
