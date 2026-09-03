// Endless Spire scaling configuration — mirrors the backend game_data.py
// SPIRE_PHASES / SPIRE_RARITY_PROBS so the client-side enemy generator
// (spireEnemies in battle.js) and the Spire UI stay in sync with the
// server's reward/scaling logic. All tuning constants live here.

export const SPIRE_MAX_FLOOR = 1000;

// [name, min, max, lvlStart, lvlEnd, multStart, multEnd, rewardMult]
export const SPIRE_PHASES = [
  ["Onboarding",        1,   50,    2,   30,  1.0,  1.3, 1.0],
  ["Early Progression", 51,  150,   30,   70,  1.3,  1.8, 1.5],
  ["Midgame",          151,  350,   70,  140,  1.8,  2.8, 2.5],
  ["Advanced",         351,  600,  140,  220,  2.8,  4.5, 4.0],
  ["Endgame",          601,  850,  220,  300,  4.5,  7.0, 6.0],
  ["Ascendant",        851, 1000,  300,  380,  7.0, 10.0, 9.0],
];

export const SPIRE_RARITY_PROBS = [
  { R: 0.70, SR: 0.25, SSR: 0.05, UR: 0.00, GR: 0.00 },
  { R: 0.35, SR: 0.40, SSR: 0.20, UR: 0.05, GR: 0.00 },
  { R: 0.10, SR: 0.25, SSR: 0.35, UR: 0.25, GR: 0.05 },
  { R: 0.00, SR: 0.10, SSR: 0.25, UR: 0.40, GR: 0.25 },
  { R: 0.00, SR: 0.00, SSR: 0.15, UR: 0.35, GR: 0.50 },
  { R: 0.00, SR: 0.00, SSR: 0.05, UR: 0.25, GR: 0.70 },
];

export const SPIRE_BOSS_FLOORS = new Set(
  [10, 25, 50, 75, 100, ...Array.from({ length: 18 }, (_, i) => 150 + i * 50)]
);
export const SPIRE_MILESTONE_FLOORS = new Set([100, 250, 500, 750, 1000]);

const RARITY_ORDER = { R: 0, SR: 1, SSR: 2, UR: 3, LR: 4, GR: 5 };
const RARITIES = ["R", "SR", "SSR", "UR", "GR"];

function phaseIndex(floor) {
  for (let i = 0; i < SPIRE_PHASES.length; i++) {
    if (floor >= SPIRE_PHASES[i][1] && floor <= SPIRE_PHASES[i][2]) return i;
  }
  return SPIRE_PHASES.length - 1;
}

function lerp(floor, pi, start, end) {
  const lo = SPIRE_PHASES[pi][1];
  const hi = SPIRE_PHASES[pi][2];
  const t = (floor - lo) / Math.max(1, hi - lo);
  return start + t * (end - start);
}

export function spireFloorConfig(floor) {
  floor = Math.max(1, Math.min(floor, SPIRE_MAX_FLOOR));
  const pi = phaseIndex(floor);
  const p = SPIRE_PHASES[pi];

  const enemyLevel = Math.round(lerp(floor, pi, p[3], p[4]));
  const statMult = Math.round(lerp(floor, pi, p[5], p[6]) * 1000) / 1000;
  const isBoss = SPIRE_BOSS_FLOORS.has(floor);
  const isMilestone = SPIRE_MILESTONE_FLOORS.has(floor);
  const teamSize = floor >= 10 ? 3 : 2;

  // Blend rarity probabilities between current and next phase
  const t = (floor - p[1]) / Math.max(1, p[2] - p[1]);
  const here = SPIRE_RARITY_PROBS[pi];
  const next = SPIRE_RARITY_PROBS[Math.min(pi + 1, SPIRE_RARITY_PROBS.length - 1)];
  const rarityProbs = {};
  for (const r of RARITIES) {
    rarityProbs[r] = Math.round((here[r] * (1 - t) + next[r] * t) * 10000) / 10000;
  }

  return {
    floor,
    phase: p[0],
    phaseIdx: pi + 1,
    enemyLevel,
    statMult,
    rarityProbs,
    teamSize,
    isBoss,
    isMilestone,
    rewardMult: p[7],
  };
}

/** Pick a rarity from a probability map using a uniform random value [0,1). */
export function pickRarity(probs, roll) {
  let acc = 0;
  for (const r of RARITIES) {
    acc += probs[r];
    if (roll < acc) return r;
  }
  return "GR";
}
