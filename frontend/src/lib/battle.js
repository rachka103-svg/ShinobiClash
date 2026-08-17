// Client-side turn-based combat helpers (mirrors backend stat formulas).

export function computeStats(template, level, ascension = 0) {
  const b = template.base_stats;
  const gl = 1 + 0.09 * (level - 1);
  const ga = 1 + 0.12 * ascension;
  return {
    hp: Math.round(b.hp * gl * ga),
    atk: Math.round(b.atk * gl * ga),
    def: Math.round(b.def * (1 + 0.08 * (level - 1)) * ga),
    spd: Math.round(b.spd * (1 + 0.025 * (level - 1)) * (1 + 0.05 * ascension)),
    chakra: b.chakra,
  };
}

export function elementMultiplier(attEl, defEl, advantage) {
  if (advantage[attEl] === defEl) return 1.3;
  if (advantage[defEl] === attEl) return 0.75;
  return 1.0;
}

export function rollDamage(actor, target, jutsu, advantage) {
  const base = (jutsu.power / 100) * actor.atk;
  const mult = elementMultiplier(jutsu.element, target.element, advantage);
  let raw = base * mult - target.def * 0.5;
  raw = Math.max(raw, base * 0.18);
  const variance = 0.9 + Math.random() * 0.2;
  const crit = Math.random() < 0.16;
  let dmg = Math.round(raw * variance * (crit ? 1.65 : 1));
  return { dmg, crit, mult };
}

export function buildCombatant(uid, side, template, level, ascension = 0, instanceId = null) {
  const s = computeStats(template, level, ascension);
  return {
    uid,
    instanceId,
    side,
    templateId: template.id,
    portrait: template.portrait,
    name: template.name,
    element: template.element,
    rarity: template.rarity,
    role: template.role,
    level,
    ascension,
    maxHp: s.hp,
    hp: s.hp,
    maxChakra: s.chakra,
    chakra: side === "ally" ? s.chakra : Math.round(s.chakra * 0.5),
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    shield: 0,
    jutsus: template.jutsus,
    alive: true,
  };
}

export function buildOrder(combatants) {
  return combatants
    .filter((c) => c.alive)
    .sort((a, b) => b.spd - a.spd || Math.random() - 0.5)
    .map((c) => c.uid);
}

// Deterministic PRNG so a given Spire floor always has the same enemies.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate the enemy line-up for an Endless Spire floor. Scales forever. */
export function spireEnemies(floor, catalog) {
  const rng = mulberry32((floor * 2654435761) >>> 0);
  const boss = floor % 5 === 0;
  const lvl = 2 + floor * 2;
  let bands;
  if (floor <= 3) bands = ["R"];
  else if (floor <= 6) bands = ["R", "SR"];
  else if (floor <= 10) bands = ["SR", "SSR"];
  else if (floor <= 15) bands = ["SSR", "UR"];
  else bands = ["UR", "LR"];

  if (boss) {
    const bossPool = catalog.filter((c) => ["SSR", "UR", "LR"].includes(c.rarity));
    const b = bossPool[Math.floor(rng() * bossPool.length)] || catalog[0];
    return [{ template_id: b.id, level: Math.round(lvl * 1.5) }];
  }
  const pool = catalog.filter((c) => bands.includes(c.rarity));
  const src = pool.length ? pool : catalog;
  const count = Math.min(3, 2 + Math.floor((floor - 1) / 5));
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ template_id: src[Math.floor(rng() * src.length)].id, level: lvl + Math.floor(rng() * 3) });
  }
  return out;
}
