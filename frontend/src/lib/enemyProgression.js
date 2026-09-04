/**
 * Frontend mirror of the backend enemy_progression system for Spire enemies.
 *
 * Spire enemies are generated client-side (spireEnemies in battle.js), so
 * this module computes the same progression curves (ascension, gear, skill
 * rank, passives) that the backend applies to campaign/tsukuyomi enemies.
 *
 * The gear stat computation uses percentage approximations derived from the
 * same progression curves — the backend computes exact gear stats from real
 * gear pieces, but the spire runs entirely client-side so we mirror the
 * curves here.
 */

// Rarity ordering (matches backend RARITY_ORDER)
const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, LR: 5, GR: 6, MYTHIC: 7 };

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function intLerp(t, start, end) {
  t = clamp(t, 0, 1);
  return Math.round(start + t * (end - start));
}

// --- Progression score ---
function spireScore(floor, isBoss) {
  let base = clamp(floor / 1000, 0, 1);
  if (isBoss) base = Math.min(1, base + 0.03);
  return base;
}

// --- Rarity ---
const RARITY_BY_SCORE = [
  [0.0, 1], [0.08, 2], [0.2, 3], [0.35, 4], [0.55, 5], [0.75, 6], [0.92, 7],
];

function rarityForScore(score, isBoss) {
  let idx = 1;
  for (const [threshold, rIdx] of RARITY_BY_SCORE) {
    if (score >= threshold) idx = rIdx;
  }
  if (isBoss) idx = Math.min(7, idx + 1);
  return idx;
}

const RARITY_NAMES = ["N", "R", "SR", "SSR", "UR", "LR", "GR", "MYTHIC"];

// --- Ascension (0-16) ---
function ascensionForScore(score) {
  if (score < 0.05) return 0;
  if (score < 0.15) return intLerp((score - 0.05) / 0.1, 0, 2);
  if (score < 0.3) return intLerp((score - 0.15) / 0.15, 2, 5);
  if (score < 0.5) return intLerp((score - 0.3) / 0.2, 5, 8);
  if (score < 0.7) return intLerp((score - 0.5) / 0.2, 8, 12);
  if (score < 0.9) return intLerp((score - 0.7) / 0.2, 12, 15);
  return intLerp((score - 0.9) / 0.1, 15, 16);
}

// --- Gear tier (0-5) ---
function gearTierForScore(score) {
  if (score < 0.04) return 0;
  if (score < 0.12) return 1;
  if (score < 0.25) return 2;
  if (score < 0.45) return 3;
  if (score < 0.65) return 4;
  return 5;
}

// --- Enhancement (0-15) ---
function enhancementForScore(score) {
  if (score < 0.04) return 0;
  if (score < 0.15) return intLerp((score - 0.04) / 0.11, 0, 3);
  if (score < 0.35) return intLerp((score - 0.15) / 0.2, 3, 7);
  if (score < 0.55) return intLerp((score - 0.35) / 0.2, 7, 11);
  if (score < 0.8) return intLerp((score - 0.55) / 0.25, 11, 15);
  return 15;
}

// --- Reforge count (0-2) ---
function reforgeForScore(score) {
  if (score < 0.3) return 0;
  if (score < 0.55) return 1;
  return 2;
}

// --- Crystal tier (0-5) ---
function crystalTierForScore(score) {
  if (score < 0.1) return 0;
  if (score < 0.25) return 1;
  if (score < 0.45) return 2;
  if (score < 0.65) return 3;
  if (score < 0.85) return 4;
  return 5;
}

// --- Skill rank (1-10) ---
function skillRankForScore(score) {
  if (score < 0.05) return 1;
  if (score < 0.15) return intLerp((score - 0.05) / 0.1, 1, 2);
  if (score < 0.3) return intLerp((score - 0.15) / 0.15, 2, 4);
  if (score < 0.5) return intLerp((score - 0.3) / 0.2, 4, 6);
  if (score < 0.7) return intLerp((score - 0.5) / 0.2, 6, 8);
  if (score < 0.9) return intLerp((score - 0.7) / 0.2, 8, 9);
  return 10;
}

// Passive unlock ranks per rarity (matches backend RARITY_PASSIVE_UNLOCK_RANK)
const PASSIVE_UNLOCK_RANK = { R: 5, SR: 4, SSR: 3, UR: 2, LR: 2, GR: 2, N: 3, MYTHIC: 2 };

// --- Gear bonus percentages (approximation from progression) ---
function gearBonusPct(score, gearTier, enhancement, crystalTier) {
  if (gearTier === 0) return null;
  // Approximate gear bonus as percentages — the backend computes exact
  // values from real gear pieces, but for client-side spire enemies this
  // approximation is sufficient and scales correctly with progression.
  const tierMult = [0, 0.05, 0.10, 0.18, 0.28, 0.40][gearTier] || 0;
  const enhanceMult = 1 + 0.06 * enhancement;
  const crystalMult = crystalTier > 0 ? 1 + 0.04 * crystalTier : 1;
  const total = tierMult * enhanceMult * crystalMult;
  return {
    hp_pct: Math.round(total * 100 * 1.2),
    atk_pct: Math.round(total * 100),
    def_pct: Math.round(total * 100 * 0.85),
    spd_pct: Math.round(total * 100 * 0.5),
  };
}

/**
 * Compute full progression for a spire enemy.
 * Returns the progression fields that buildCombatant consumes.
 */
export function spireEnemyProgression(floor, level, isBoss, templateRarity) {
  const score = spireScore(floor, isBoss);
  const targetRarityIdx = rarityForScore(score, isBoss);
  const targetRarity = RARITY_NAMES[targetRarityIdx];
  const ascension = ascensionForScore(score);
  const gearTier = gearTierForScore(score);
  const enhancement = gearTier > 0 ? enhancementForScore(score) : 0;
  const reforgeCount = reforgeForScore(score);
  const crystalTier = crystalTierForScore(score);
  const skillRank = skillRankForScore(score);
  const passiveUnlockRank = PASSIVE_UNLOCK_RANK[targetRarity] || 3;
  const passiveUnlocked = skillRank >= passiveUnlockRank;
  const gearBonus = gearBonusPct(score, gearTier, enhancement, crystalTier);

  // Resolve evolved rarity: walk up from template rarity to target
  let evolvedRarity = templateRarity;
  const nativeIdx = RARITY_ORDER[templateRarity] || 0;
  if (targetRarityIdx > nativeIdx) {
    const ladder = ["R", "SR", "SSR", "UR", "LR", "GR"];
    const startIdx = ladder.indexOf(templateRarity);
    if (startIdx >= 0) {
      for (let i = startIdx + 1; i < ladder.length; i++) {
        if (RARITY_ORDER[ladder[i]] > targetRarityIdx) break;
        evolvedRarity = ladder[i];
      }
    }
  }

  return {
    ascension,
    evolvedRarity,
    gearBonus,
    skillRank,
    passiveLocked: !passiveUnlocked,
    reforgeCount,
    progression: {
      level,
      rarity: evolvedRarity,
      ascension,
      gear_tier: gearTier,
      gear_enhancement: enhancement,
      reforge_count: reforgeCount,
      crystal_tier: crystalTier,
      skill_rank: skillRank,
      passive_unlocked: passiveUnlocked,
      score,
    },
  };
}
