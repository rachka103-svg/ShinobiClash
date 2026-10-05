/**
 * Frontend mirror of the backend evolution cost logic (progression.py).
 * Used by the auto-evolve UI to preview total costs across multiple star
 * levels without an extra API round-trip. The backend remains the
 * authoritative validator — this is purely for display/preview.
 */

const EVOLUTION_SHARD_BASE = {
  1: 80, 2: 100, 3: 120, 4: 160, 5: 220,
  6: 80, 7: 120, 8: 180, 9: 260, 10: 360, 11: 480,
};

const EVOLUTION_RYO_BASE = {
  1: 1000, 2: 2000, 3: 3500, 4: 5500, 5: 8000,
  6: 12000, 7: 18000, 8: 25000, 9: 35000, 10: 50000, 11: 70000,
};

const RARITY_RYO_MULT = {
  R: 0.8, SR: 1.0, SSR: 1.3, UR: 1.7, LR: 2.2, GR: 3.0,
};

const MAX_STARS = {
  R: 3, SR: 4, SSR: 5, UR: 6, LR: 7, GR: 8,
};

const ELEMENT_ESSENCE = {
  Fire: "fire_essence",
  Water: "water_essence",
  Earth: "earth_essence",
  Wind: "wind_essence",
  Lightning: "lightning_essence",
  Light: "light_essence",
  Dark: "dark_essence",
};

export function essenceIdForElement(element) {
  return ELEMENT_ESSENCE[element] || "fire_essence";
}

/**
 * Returns the cost to evolve from `currentStar` → `currentStar + 1`, or
 * null if the hero is already at its rarity's star cap.
 */
export function getEvolutionCost(rarity, currentStar, element) {
  const cap = MAX_STARS[rarity] || 8;
  if (currentStar >= cap) return null;

  const ryoMult = RARITY_RYO_MULT[rarity] || 1.0;
  const shards = EVOLUTION_SHARD_BASE[currentStar] || 480;
  const ryo = Math.round((EVOLUTION_RYO_BASE[currentStar] || 70000) * ryoMult);

  const items = {};
  if (currentStar <= 2) {
    items.evo_essence = 5 + currentStar * 5;
  }
  if (currentStar >= 3) {
    const eid = essenceIdForElement(element || "Fire");
    items[eid] = 5 + (currentStar - 2) * 5;
  }
  if (currentStar >= 5) {
    items.nightmare_dust = 10 + (currentStar - 4) * 5;
    items.dream_fragment = 3 + (currentStar - 4) * 2;
  }
  if (currentStar >= 7) {
    items.lunar_essence = 5;
    items.celestial_core = 2;
  }

  return { shards, ryo, items };
}

/**
 * Accumulates the total cost to rush-evolve from `fromStar` → `toStar`.
 * Returns { shards, ryo, items, steps }.
 */
export function getAutoEvolveTotalCost(rarity, fromStar, toStar, element) {
  let shards = 0;
  let ryo = 0;
  const items = {};
  const steps = [];

  for (let s = fromStar; s < toStar; s++) {
    const cost = getEvolutionCost(rarity, s, element);
    if (!cost) break;
    shards += cost.shards;
    ryo += cost.ryo;
    for (const [iid, q] of Object.entries(cost.items)) {
      items[iid] = (items[iid] || 0) + q;
    }
    steps.push({ from: s, to: s + 1, cost });
  }

  return { shards, ryo, items, steps };
}
