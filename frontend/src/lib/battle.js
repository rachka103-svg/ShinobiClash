// Client-side turn-based combat helpers.
// Mirrors backend stat formulas and contains battle-side mechanics.

import { spireFloorConfig, pickRarity } from "./spireConfig";

// ============================================================
// CORE CONFIGURATION
// ============================================================

const BASE_CRIT_CHANCE = 0.16;
const BASE_CRIT_MULTIPLIER = 1.65;
const MIN_DAMAGE_RATIO = 0.12;

// No single hit can exceed this fraction of the target's max HP. Prevents
// extreme level-gap one-shots (e.g. high-level nightmare bosses hitting for
// millions against a team of ~70k power) while leaving normal-level fights
// untouched (most hits are well below this ceiling).
const PER_HIT_HP_CAP = 0.4;

const DOT_TYPES = new Set([
  "burn",
  "poison",
  "bleed",
]);

const CC_TYPES = new Set([
  "stun",
  "freeze",
]);

const DEBUFF_TYPES = new Set([
  "atk_down",
  "def_down",
]);

// Buff statuses — applied to allies, tick down each turn.
const BUFF_TYPES = new Set([
  "atk_up",
  "def_up",
  "spd_up",
  "team_atk_up",
  "team_def_up",
  "regen",
  "immunity",
  "evade",
  "damage_reflect",
  "taunt",
]);

// Utility effect types — handled inline, not stored as statuses.
const UTILITY_TYPES = new Set([
  "cleanse",
  "dispel",
  "extra_turn",
  "revive_ally",
]);

// ============================================================
// STAT CALCULATION
// ============================================================

export function computeStats(template, level, ascension = 0) {
  const b = template.base_stats;

  const gl = 1 + 0.09 * (level - 1);
  const ga = 1 + 0.12 * ascension;

  return {
    hp: Math.round(b.hp * gl * ga),

    atk: Math.round(b.atk * gl * ga),

    def: Math.round(
      b.def *
        (1 + 0.08 * (level - 1)) *
        ga
    ),

    spd: Math.round(
      b.spd *
        (1 + 0.025 * (level - 1)) *
        (1 + 0.05 * ascension)
    ),

    chakra: b.chakra,

    critChance:
      b.critChance ??
      b.crit_rate ??
      BASE_CRIT_CHANCE,

    critMultiplier:
      b.critMultiplier ??
      b.crit_damage ??
      BASE_CRIT_MULTIPLIER,
  };
}

// ============================================================
// ELEMENT ADVANTAGE
// ============================================================

export function elementMultiplier(
  attEl,
  defEl,
  advantage
) {
  if (advantage?.[attEl] === defEl) {
    return 1.3;
  }

  if (advantage?.[defEl] === attEl) {
    return 0.75;
  }

  return 1.0;
}

// ============================================================
// STATUS HELPERS
// ============================================================

export function getStatus(
  actor,
  effectType
) {
  return actor.statuses?.find(
    (s) =>
      s.effectType === effectType &&
      (s.duration == null ||
        s.duration > 0)
  );
}

export function hasStatus(
  actor,
  effectType
) {
  return !!getStatus(
    actor,
    effectType
  );
}

// ============================================================
// ENEMY GEAR
// ============================================================

export function applyEnemyGear(stats, gearBonus) {
  if (!gearBonus) return stats;

  return {
    ...stats,
    hp: Math.round(
      stats.hp *
        (1 + (gearBonus.hp_pct || 0) / 100)
    ),
    atk: Math.round(
      stats.atk *
        (1 + (gearBonus.atk_pct || 0) / 100)
    ),
    def: Math.round(
      stats.def *
        (1 + (gearBonus.def_pct || 0) / 100)
    ),
    spd: Math.round(
      stats.spd *
        (1 + (gearBonus.spd_pct || 0) / 100)
    ),
  };
}

// ============================================================
// STAT DEBUFF HELPERS
// ============================================================

export function effectiveAtk(actor) {
  let atk = actor.atk;

  const debuffs =
    actor.statuses?.filter(
      (s) =>
        s.effectType === "atk_down" &&
        (s.duration ?? 0) > 0
    ) || [];

  for (const debuff of debuffs) {
    atk *=
      1 -
      (debuff.value || 0) / 100;
  }

  const buffs =
    actor.statuses?.filter(
      (s) =>
        (s.effectType === "atk_up" ||
          s.effectType === "team_atk_up") &&
        (s.duration ?? 0) > 0
    ) || [];

  for (const buff of buffs) {
    atk *=
      1 +
      (buff.value || 0) / 100;
  }

  return Math.max(
    1,
    Math.round(atk)
  );
}

export function effectiveDef(actor) {
  let def = actor.def;

  const debuffs =
    actor.statuses?.filter(
      (s) =>
        s.effectType === "def_down" &&
        (s.duration ?? 0) > 0
    ) || [];

  for (const debuff of debuffs) {
    def *=
      1 -
      (debuff.value || 0) / 100;
  }

  const buffs =
    actor.statuses?.filter(
      (s) =>
        (s.effectType === "def_up" ||
          s.effectType === "team_def_up") &&
        (s.duration ?? 0) > 0
    ) || [];

  for (const buff of buffs) {
    def *=
      1 +
      (buff.value || 0) / 100;
  }

  return Math.max(
    0,
    Math.round(def)
  );
}

// ============================================================
// PASSIVE VALUE HELPERS
// ============================================================

function passiveValue(
  actor,
  fallback = 0
) {
  return (
    actor?.passive?.value ??
    actor?.passive?.power ??
    actor?.passive?.amount ??
    fallback
  );
}

function passivePercent(
  actor,
  fallback = 0
) {
  const value = passiveValue(
    actor,
    fallback
  );

  return value > 1
    ? value / 100
    : value;
}

// ============================================================
// DAMAGE REDUCTION
// ============================================================

export function getDamageReduction(target) {
  let reduction = 0;

  if (
    target.passive?.effect_type ===
    "damage_reduction"
  ) {
    reduction += passivePercent(
      target,
      0.12
    );
  }

  return Math.min(
    0.75,
    Math.max(0, reduction)
  );
}

// ============================================================
// CRITICAL HIT
// ============================================================

export function getCritChance(actor) {
  let chance =
    actor.critChance ??
    BASE_CRIT_CHANCE;

  if (
    actor.passive?.effect_type ===
    "crit_boost"
  ) {
    chance += passivePercent(
      actor,
      0.1
    );
  }

  return Math.min(
    0.8,
    Math.max(0, chance)
  );
}

export function getCritMultiplier(actor) {
  return Math.max(
    1.1,
    actor.critMultiplier ??
      BASE_CRIT_MULTIPLIER
  );
}

// ============================================================
// BASE DAMAGE
// ============================================================

export function rollDamage(
  actor,
  target,
  jutsu,
  advantage
) {
  const atk = effectiveAtk(actor);
  const def = effectiveDef(target);

  const base =
    ((jutsu.power || 0) / 100) *
    atk;

  const mult = elementMultiplier(
    jutsu.element || actor.element,
    target.element,
    advantage || {}
  );

  let raw =
    base * mult -
    def * 0.8;

  raw = Math.max(
    raw,
    base * MIN_DAMAGE_RATIO
  );

  const variance =
    0.9 + Math.random() * 0.2;

  const crit =
    Math.random() <
    getCritChance(actor);

  const critMultiplier =
    crit
      ? getCritMultiplier(actor)
      : 1;

  const reduction =
    getDamageReduction(target);

  const dmg = Math.max(
    1,
    Math.round(
      raw *
        variance *
        critMultiplier *
        (1 - reduction)
    )
  );

  // Per-hit cap relative to target HP — prevents one-shots from extreme
  // level/power gaps without affecting normal battles.
  const hitCap = Math.round(
    (target.maxHp || dmg) * PER_HIT_HP_CAP
  );

  return {
    dmg: Math.min(dmg, hitCap),
    crit,
    mult,
    reduction,
  };
}

// ============================================================
// REFORGE MODIFIERS
// ============================================================

export const REFORGE_MODIFIERS = {
  burn: {
    effect: {
      type: "burn",
      chance: 30,
      duration: 3,
      value: 40,
    },
  },

  poison: {
    effect: {
      type: "poison",
      chance: 30,
      duration: 3,
      value: 35,
    },
  },

  bleed: {
    effect: {
      type: "bleed",
      chance: 30,
      duration: 3,
      value: 38,
    },
  },

  stun: {
    effect: {
      type: "stun",
      chance: 18,
      duration: 1,
    },
  },

  freeze: {
    effect: {
      type: "freeze",
      chance: 18,
      duration: 1,
    },
  },

  atk_down: {
    effect: {
      type: "atk_down",
      chance: 35,
      duration: 2,
      value: 20,
    },
  },

  def_down: {
    effect: {
      type: "def_down",
      chance: 35,
      duration: 2,
      value: 20,
    },
  },

  shock: {
    effect: {
      type: "shock",
      chance: 25,
      duration: 2,
      value: 50,
    },
  },

  extra_damage: {
    bonus_power_pct: 12,
  },
};

// ============================================================
// BUILD COMBATANT
// ============================================================

export function buildCombatant(
  uid,
  side,
  template,
  level,
  ascension = 0,
  instanceId = null,
  statsOverride = null,
  skillRank = 1,
  passiveUnlocked = true,
  reforge = null
) {
  const s =
    statsOverride ||
    computeStats(
      template,
      level,
      ascension
    );

  const skillMult =
    1 +
    Math.max(
      0,
      (skillRank || 1) - 1
    ) *
      0.08;

  const reforgeMap =
    reforge || {};

  const isPassiveSkill = (j) =>
    j?.type === "passive" ||
    j?.signature === true ||
    j?.passive === true ||
    String(j?.id || "").endsWith(
      "_passive"
    );

  const jutsus =
    (template.jutsus || [])
      .filter(
        (j) => !isPassiveSkill(j)
      )
      .map((j) => {
        let jj =
          j.type === "attack" ||
          j.type === "aoe" ||
          j.type === "heal"
            ? {
                ...j,
                power: Math.round(
                  (j.power || 0) *
                    skillMult
                ),
              }
            : { ...j };

        const mods =
          reforgeMap[j.id];

        if (
          mods &&
          mods.length
        ) {
          const effects = [
            ...(jj.effects || []),
          ];

          let bonusPct = 0;

          for (const mid of mods) {
            const m =
              REFORGE_MODIFIERS[mid];

            if (!m) continue;

            if (m.effect) {
              effects.push({
                ...m.effect,
              });
            }

            if (
              m.bonus_power_pct
            ) {
              bonusPct +=
                m.bonus_power_pct;
            }
          }

          if (effects.length) {
            jj.effects = effects;
          }

          if (
            bonusPct &&
            jj.power
          ) {
            jj.power = Math.round(
              jj.power *
                (1 +
                  bonusPct / 100)
            );
          }
        }

        return jj;
      });

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

    passive: passiveUnlocked
      ? template.passive || null
      : null,

    skillRank:
      skillRank || 1,

    level,
    ascension,

    maxHp: s.hp,
    hp: s.hp,

    maxChakra: s.chakra,

    chakra:
      side === "ally"
        ? s.chakra
        : Math.round(
            s.chakra * 0.5
          ),

    atk: s.atk,
    def: s.def,
    spd: s.spd,

    critChance:
      s.critChance ??
      BASE_CRIT_CHANCE,

    critMultiplier:
      s.critMultiplier ??
      BASE_CRIT_MULTIPLIER,

    shield: 0,

    jutsus,

    alive: true,

    statuses: [],

    revivalUsed: false,
    lowHpShieldUsed: false,

    kills: 0,
    damageTaken: 0,
    damageDealt: 0,

    bossMechanicId: null,
    bossPhaseIndex: -1,
    aoeHitsTaken: 0,
    shieldBrokenPhase: null,
    enraged: false,
    shieldPhaseActive: false,
    lifestealPct: 0,

    baseBattleAtk: s.atk,
    baseBattleSpd: s.spd,
    baseBattleDef: s.def,
  };
}

// ============================================================
// TURN ORDER
// ============================================================

export function buildOrder(combatants) {
  return combatants
    .filter(
      (c) => c.alive
    )
    .sort(
      (a, b) =>
        b.spd - a.spd ||
        Math.random() - 0.5
    )
    .map((c) => c.uid);
}

// ============================================================
// SPIRE ENEMY GENERATOR
// ============================================================

function mulberry32(a) {
  return function () {
    a |= 0;

    a =
      (a + 0x6d2b79f5) |
      0;

    let t = Math.imul(
      a ^ (a >>> 15),
      1 | a
    );

    t =
      (t +
        Math.imul(
          t ^ (t >>> 7),
          61 | t
        )) ^
      t;

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

export function spireEnemies(
  floor,
  catalog
) {
  const rng = mulberry32(
    (floor * 2654435761) >>>
      0
  );

  const cfg =
    spireFloorConfig(floor);

  const lvl =
    cfg.enemyLevel;

  const probs =
    cfg.rarityProbs;

  if (cfg.isBoss) {
    const bossRoll =
      0.3 + rng() * 0.7;

    let bossRarity =
      pickRarity(
        probs,
        bossRoll
      );

    if (
      bossRarity === "R" ||
      bossRarity === "SR"
    ) {
      bossRarity = "SSR";
    }

    const bossPool =
      catalog.filter(
        (c) =>
          c.rarity === bossRarity
      );

    const pool =
      bossPool.length
        ? bossPool
        : catalog.filter((c) =>
            [
              "SSR",
              "UR",
              "GR",
            ].includes(c.rarity)
          );

    const src =
      pool.length
        ? pool
        : catalog;

    const b =
      src[
        Math.floor(
          rng() * src.length
        )
      ] || catalog[0];

    return [
      {
        template_id: b.id,
        level: Math.round(
          lvl * 1.5
        ),
      },
    ];
  }

  const count =
    cfg.teamSize;

  const out = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const rarity =
      pickRarity(
        probs,
        rng()
      );

    let pool =
      catalog.filter(
        (c) =>
          c.rarity === rarity
      );

    if (!pool.length) {
      pool = catalog;
    }

    out.push({
      template_id:
        pool[
          Math.floor(
            rng() * pool.length
          )
        ].id,

      level:
        lvl +
        Math.floor(
          rng() * 3
        ),
    });
  }

  return out;
}

// ============================================================
// EVENT SYSTEM
// ============================================================

let _eventId = 0;

export function makeEvent(
  type,
  payload = {}
) {
  return {
    id: `ev${_eventId++}`,
    type,
    ts: Date.now(),
    ...payload,
  };
}

// ============================================================
// WIRED PASSIVE TYPES
// ============================================================

const WIRED_EFFECTS = new Set([
  "hp_scaling_power",
  "execute_low_hp",
  "stacking_mark_detonate",
  "escalating_dot",
  "team_shield",
  "revive_once",
  "lifesteal",
  "counterattack",
  "crit_boost",
  "speed_boost",
  "damage_reduction",
  "first_strike",
  "heal_on_kill",
  "chakra_on_hit",
  "berserk_low_hp",
  "poison_mastery",
  "burn_mastery",
  "shield_on_low_hp",
  // New bespoke passives
  "stun_chance",
  "freeze_chance",
  "burn_dot",
  "poison_dot",
  "speed_boost_self",
  "cleanse_debuff",
  "chakra_gain_boost",
  "heal_boost",
  "bonus_vs_full_hp",
  "soul_harvest",
  "adaptive_element",
  "intercept_lowest_hp",
  "counter_taunt",
  "evade_passive",
  "damage_reflect_passive",
  "team_regen_ward",
  "team_atk_buff",
  "team_def_buff",
  "revive_ally_passive",
  "stacking_power",
  "atk_scaling_turns",
  "crit_boost_self",
]);

export function hasWiredPassive(c) {
  return !!(
    c.passive &&
    WIRED_EFFECTS.has(
      c.passive.effect_type
    )
  );
}

// ============================================================
// DAMAGE RESOLUTION
// ============================================================

export function resolveDamage(
  actor,
  target,
  jutsu,
  advantage
) {
  // Evade check — target may dodge entirely
  const evadeBuff = target.statuses?.find(
    (s) =>
      s.effectType === "evade" &&
      (s.duration ?? 0) > 0
  );
  if (evadeBuff) {
    const evadeChance = (evadeBuff.value || 30) / 100;
    if (Math.random() < evadeChance) {
      return {
        dmg: 0,
        crit: false,
        mult: 1,
        reduction: 0,
        notes: ["evaded"],
        evaded: true,
      };
    }
  }

  // Passive evade
  if (
    target.passive?.effect_type === "evade_passive"
  ) {
    const chance = (target.passive.params?.evade_chance || 12) / 100;
    if (Math.random() < chance) {
      return {
        dmg: 0,
        crit: false,
        mult: 1,
        reduction: 0,
        notes: ["evaded"],
        evaded: true,
      };
    }
  }

  const base = rollDamage(
    actor,
    target,
    jutsu,
    advantage
  );

  let dmg = base.dmg;

  const notes = [];

  if (
    actor.passive?.effect_type ===
    "berserk_low_hp"
  ) {
    const hpPercent =
      actor.hp /
      actor.maxHp;

    if (hpPercent <= 0.4) {
      dmg = Math.round(
        dmg * 1.35
      );

      notes.push("berserk");
    }
  }

  if (
    actor.passive?.effect_type ===
    "hp_scaling_power"
  ) {
    const missingPct =
      1 -
      actor.hp /
        actor.maxHp;

    if (missingPct > 0.01) {
      dmg = Math.round(
        dmg *
          (1 +
            missingPct * 0.5)
      );

      notes.push("enrage");
    }
  }

  if (
    actor.passive?.effect_type ===
      "execute_low_hp" &&
    target.hp /
      target.maxHp <=
      0.3
  ) {
    dmg = Math.round(
      dmg * 1.5
    );

    notes.push("execute");
  }

  if (
    actor.passive?.effect_type ===
      "poison_mastery" &&
    hasStatus(target, "poison")
  ) {
    dmg = Math.round(
      dmg * 1.15
    );

    notes.push("poison_mastery");
  }

  if (
    actor.passive?.effect_type ===
      "burn_mastery" &&
    hasStatus(target, "burn")
  ) {
    dmg = Math.round(
      dmg * 1.15
    );

    notes.push("burn_mastery");
  }

  if (
    actor.passive?.effect_type ===
      "bonus_vs_full_hp" &&
    target.hp >= target.maxHp
  ) {
    const bonus = actor.passive.params?.bonus || 0.20;
    dmg = Math.round(dmg * (1 + bonus));
    notes.push("first_strike");
  }

  if (actor.enraged) {
    dmg = Math.round(
      dmg * 1.2
    );

    notes.push("boss_enrage");
  }

  // Damage reflect — target reflects a portion of damage back to attacker
  const reflectBuff = target.statuses?.find(
    (s) =>
      s.effectType === "damage_reflect" &&
      (s.duration ?? 0) > 0
  );
  if (reflectBuff && actor.alive && dmg > 0) {
    const reflectDmg = Math.round(dmg * (reflectBuff.value || 20) / 100);
    if (reflectDmg > 0) {
      actor.hp = Math.max(0, actor.hp - reflectDmg);
    }
  }

  // Passive damage reflect
  if (
    target.passive?.effect_type === "damage_reflect_passive" &&
    actor.alive &&
    dmg > 0
  ) {
    const reflectPct = target.passive.params?.reflect_pct || 15;
    const reflectDmg = Math.round(dmg * reflectPct / 100);
    if (reflectDmg > 0) {
      actor.hp = Math.max(0, actor.hp - reflectDmg);
    }
  }

  return {
    ...base,
    dmg: Math.max(1, dmg),
    notes,
  };
}

// ============================================================
// SHIELD DAMAGE APPLICATION
// ============================================================

export function applyDamage(
  target,
  damage,
  events = [],
  actor = null
) {
  if (
    !target ||
    !target.alive ||
    damage <= 0
  ) {
    return {
      damageToHp: 0,
      absorbed: 0,
      shieldBroken: false,
      killed: false,
      events,
    };
  }

  let remaining = damage;
  let absorbed = 0;
  let shieldBroken = false;

  if (target.shield > 0) {
    absorbed = Math.min(
      target.shield,
      remaining
    );

    target.shield -= absorbed;
    remaining -= absorbed;

    if (
      target.shield <= 0 &&
      absorbed > 0
    ) {
      target.shield = 0;
      shieldBroken = true;

      events.push(
        makeEvent(
          "SHIELD_BROKEN",
          {
            targetUid: target.uid,
          }
        )
      );
    }
  }

  const hpBefore =
    target.hp;

  if (remaining > 0) {
    target.hp = Math.max(
      0,
      target.hp - remaining
    );

    target.damageTaken =
      (target.damageTaken || 0) +
      remaining;
  }

  const damageToHp =
    hpBefore - target.hp;

  return {
    damageToHp,
    absorbed,
    shieldBroken,
    killed: target.hp <= 0,
    events,
  };
}

// ============================================================
// LOW HP PASSIVE CHECK
// ============================================================

export function checkLowHpPassives(
  target
) {
  const events = [];

  if (
    !target.alive ||
    target.lowHpShieldUsed
  ) {
    return events;
  }

  if (
    target.passive?.effect_type !==
    "shield_on_low_hp"
  ) {
    return events;
  }

  const hpPercent =
    target.hp /
    target.maxHp;

  if (hpPercent > 0.35) {
    return events;
  }

  const shieldPercent =
    passivePercent(
      target,
      0.25
    );

  const shieldAmount =
    Math.round(
      target.maxHp *
        shieldPercent
    );

  target.shield +=
    shieldAmount;

  target.lowHpShieldUsed =
    true;

  events.push(
    makeEvent(
      "SHIELD_APPLIED",
      {
        actorUid: target.uid,
        targetUid: target.uid,
        value: shieldAmount,
        text: `${target.passive.name}: Emergency Shield`,
      }
    )
  );

  return events;
}

// ============================================================
// COUNTERATTACK
// ============================================================

export function resolveCounterattack(
  target,
  attacker,
  advantage
) {
  const events = [];

  const isCounter =
    target.passive?.effect_type === "counterattack" ||
    target.passive?.effect_type === "counter_taunt";

  if (
    !target?.alive ||
    !attacker?.alive ||
    !isCounter
  ) {
    return {
      damage: 0,
      events,
    };
  }

  const chance =
    target.passive?.params?.counter_chance
      ? target.passive.params.counter_chance / 100
      : passivePercent(target, 0.25);

  if (Math.random() >= chance) {
    return {
      damage: 0,
      events,
    };
  }

  const damagePercent =
    target.passive?.params?.counter_pct
      ? target.passive.params.counter_pct / 100
      : passivePercent(target, 0.55);

  const pseudoJutsu = {
    id: "counterattack",
    name: "Counterattack",
    type: "attack",
    power: Math.round(
      damagePercent * 100
    ),
    element: target.element,
  };

  const result =
    resolveDamage(
      target,
      attacker,
      pseudoJutsu,
      advantage
    );

  const applied =
    applyDamage(
      attacker,
      result.dmg,
      events,
      target
    );

  events.push(
    makeEvent(
      "COUNTERATTACK",
      {
        actorUid: target.uid,
        targetUid: attacker.uid,
        value: result.dmg,
        crit: result.crit,
        text: `${target.passive.name}: Counterattack!`,
      }
    )
  );

  return {
    damage:
      applied.damageToHp,
    crit: result.crit,
    events,
  };
}

// ============================================================
// ON KILL PASSIVES
// ============================================================

export function resolveOnKillEffects(
  actor
) {
  const events = [];

  if (!actor?.alive) {
    return events;
  }

  actor.kills =
    (actor.kills || 0) + 1;

  if (
    actor.passive?.effect_type ===
    "heal_on_kill"
  ) {
    const healPercent =
      passivePercent(
        actor,
        0.15
      );

    const amount =
      Math.round(
        actor.maxHp *
          healPercent
      );

    const before =
      actor.hp;

    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + amount
    );

    const actual =
      actor.hp - before;

    if (actual > 0) {
      events.push(
        makeEvent(
          "PASSIVE_TRIGGER",
          {
            actorUid: actor.uid,
            targetUid: actor.uid,
            value: actual,
            text: `${actor.passive.name}: +${actual} HP`,
          }
        )
      );
    }
  }

  return events;
}

// ============================================================
// ON-HIT PASSIVE EFFECTS
// ============================================================

export function resolveOnHitEffects(
  actor,
  target,
  jutsu
) {
  const events = [];

  let burstDamage = 0;

  if (
    actor.passive?.effect_type ===
    "stacking_mark_detonate"
  ) {
    let mark =
      target.statuses?.find(
        (s) =>
          s.effectType ===
            "blood_mark" &&
          s.source === actor.uid
      );

    if (!mark) {
      mark = {
        id: `mark_${actor.uid}_${target.uid}_${Date.now()}`,
        effectType:
          "blood_mark",
        source: actor.uid,
        stacks: 1,
        duration: 3,
      };

      target.statuses.push(
        mark
      );

      events.push(
        makeEvent(
          "DEBUFF_APPLIED",
          {
            actorUid: actor.uid,
            targetUid:
              target.uid,
            text:
              "Blood Mark",
          }
        )
      );
    } else {
      mark.stacks += 1;
      mark.duration = 3;

      if (
        mark.stacks >= 3
      ) {
        burstDamage =
          Math.round(
            effectiveAtk(actor) *
              0.8
          );

        target.statuses =
          target.statuses.filter(
            (s) => s !== mark
          );

        events.push(
          makeEvent(
            "PASSIVE_TRIGGER",
            {
              actorUid:
                actor.uid,
              targetUid:
                target.uid,
              text:
                "Blood Mark Detonates!",
              value:
                burstDamage,
            }
          )
        );
      } else {
        events.push(
          makeEvent(
            "DEBUFF_APPLIED",
            {
              actorUid:
                actor.uid,
              targetUid:
                target.uid,
              text:
                `Blood Mark x${mark.stacks}`,
            }
          )
        );
      }
    }
  }

  if (
    actor.passive?.effect_type ===
    "escalating_dot"
  ) {
    let dot =
      target.statuses.find(
        (s) =>
          s.effectType ===
            "curse_dot" &&
          s.source === actor.uid
      );

    const baseMag =
      Math.max(
        6,
        Math.round(
          effectiveAtk(actor) *
            0.22
        )
      );

    if (!dot) {
      dot = {
        id: `dot_${actor.uid}_${target.uid}_${Date.now()}`,
        effectType: "curse_dot",
        source: actor.uid,
        duration: 4,
        magnitude: baseMag,
        stacks: 1,
      };

      target.statuses.push(dot);
    } else {
      dot.duration = 4;

      dot.stacks =
        Math.min(
          3,
          dot.stacks + 1
        );

      dot.magnitude =
        Math.max(
          dot.magnitude,
          baseMag
        );
    }

    events.push(
      makeEvent(
        "PASSIVE_TRIGGER",
        {
          actorUid: actor.uid,
          targetUid:
            target.uid,
          text:
            `${actor.passive.name}: Curse Applied!`,
        }
      )
    );
  }

  const effectEvents =
    applyJutsuEffects(
      actor,
      target,
      jutsu
    );

  events.push(
    ...effectEvents
  );

  if (
    actor.passive?.effect_type ===
      "lifesteal" &&
    actor.alive
  ) {
    const healPercent =
      passivePercent(
        actor,
        0.08
      );

    const healAmount =
      Math.round(
        actor.maxHp *
          healPercent
      );

    const oldHp =
      actor.hp;

    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + healAmount
    );

    const actualHeal =
      actor.hp - oldHp;

    if (actualHeal > 0) {
      events.push(
        makeEvent(
          "PASSIVE_TRIGGER",
          {
            actorUid:
              actor.uid,
            targetUid:
              actor.uid,
            text:
              `${actor.passive.name}: +${actualHeal} HP`,
            value:
              actualHeal,
          }
        )
      );
    }
  }

  if (
    actor.passive?.effect_type ===
    "chakra_on_hit"
  ) {
    const gain =
      passiveValue(
        actor,
        10
      );

    const oldChakra =
      actor.chakra;

    actor.chakra =
      Math.min(
        actor.maxChakra,
        actor.chakra + gain
      );

    const actualGain =
      actor.chakra -
      oldChakra;

    if (actualGain > 0) {
      events.push(
        makeEvent(
          "PASSIVE_TRIGGER",
          {
            actorUid:
              actor.uid,
            targetUid:
              actor.uid,
            text:
              `${actor.passive.name}: +${actualGain} Chakra`,
            value:
              actualGain,
          }
        )
      );
    }
  }

  return {
    burstDamage,
    events,
  };
}

// ============================================================
// STATUS EFFECT APPLICATION
// ============================================================

export function applyJutsuEffects(
  actor,
  target,
  jutsu
) {
  const events = [];

  if (
    !target.alive ||
    !jutsu.effects?.length
  ) {
    return events;
  }

  target.statuses =
    target.statuses || [];

  for (
    const eff of jutsu.effects
  ) {
    if (
      eff.chance != null &&
      eff.chance < 100 &&
      Math.random() * 100 >
        eff.chance
    ) {
      continue;
    }

    const et =
      eff.type;

    const dur =
      eff.duration || 2;

    const val =
      eff.value || 0;

    if (
      DOT_TYPES.has(et)
    ) {
      let multiplier =
        val / 100;

      if (
        actor.passive?.effect_type ===
          "burn_mastery" &&
        et === "burn"
      ) {
        multiplier *= 1.35;
      }

      if (
        actor.passive?.effect_type ===
          "poison_mastery" &&
        et === "poison"
      ) {
        multiplier *= 1.35;
      }

      const mag =
        Math.max(
          1,
          Math.round(
            effectiveAtk(actor) *
              multiplier
          )
        );

      let existing =
        target.statuses.find(
          (s) =>
            s.effectType === et &&
            s.source === actor.uid
        );

      if (existing) {
        existing.duration =
          dur;

        existing.magnitude =
          Math.max(
            existing.magnitude,
            mag
          );

        existing.stacks =
          Math.min(
            3,
            (existing.stacks || 1) +
              1
          );
      } else {
        target.statuses.push({
          id: `${et}_${actor.uid}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: dur,
          magnitude: mag,
          stacks: 1,
        });
      }

      events.push(
        makeEvent(
          "DEBUFF_APPLIED",
          {
            actorUid:
              actor.uid,
            targetUid:
              target.uid,
            text:
              `${et
                .charAt(0)
                .toUpperCase()}${et.slice(
                1
              )} applied!`,
          }
        )
      );
    }

    else if (
      CC_TYPES.has(et)
    ) {
      let existing =
        target.statuses.find(
          (s) =>
            s.effectType === et
        );

      if (existing) {
        existing.duration =
          Math.max(
            existing.duration || 0,
            dur
          );
      } else {
        target.statuses.push({
          id: `${et}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: dur,
        });

        events.push(
          makeEvent(
            "DEBUFF_APPLIED",
            {
              actorUid:
                actor.uid,
              targetUid:
                target.uid,
              text:
                `${et
                  .charAt(0)
                  .toUpperCase()}${et.slice(
                  1
                )}!`,
            }
          )
        );
      }
    }

    else if (
      DEBUFF_TYPES.has(et)
    ) {
      let existing =
        target.statuses.find(
          (s) =>
            s.effectType === et
        );

      if (existing) {
        existing.duration =
          dur;

        existing.value =
          Math.max(
            existing.value || 0,
            val
          );
      } else {
        target.statuses.push({
          id: `${et}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: dur,
          value: val,
        });
      }

      events.push(
        makeEvent(
          "DEBUFF_APPLIED",
          {
            actorUid:
              actor.uid,
            targetUid:
              target.uid,
            text:
              `${
                et ===
                "atk_down"
                  ? "ATK"
                  : "DEF"
              } Down!`,
          }
        )
      );
    }

    else if (et === "shock") {
      if (
        !target.statuses.find(
          (s) =>
            s.effectType ===
            "shock"
        )
      ) {
        target.statuses.push({
          id: `shock_${target.uid}_${Date.now()}`,
          effectType: "shock",
          source: actor.uid,
          duration: dur,
          value: val || 50,
        });

        events.push(
          makeEvent(
            "DEBUFF_APPLIED",
            {
              actorUid:
                actor.uid,
              targetUid:
                target.uid,
              text: "Shock!",
            }
          )
        );
      }
    }

    // ---- BUFF effects — applied to the target (ally or self) ----
    else if (BUFF_TYPES.has(et)) {
      // Check immunity — don't apply debuffs to immune targets,
      // but buffs are always allowed
      target.statuses.push({
        id: `${et}_${target.uid}_${Date.now()}`,
        effectType: et,
        source: actor.uid,
        duration: dur,
        value: val,
      });

      const label =
        et === "atk_up" ? "ATK Up!" :
        et === "def_up" ? "DEF Up!" :
        et === "spd_up" ? "SPD Up!" :
        et === "team_atk_up" ? "Team ATK Up!" :
        et === "team_def_up" ? "Team DEF Up!" :
        et === "regen" ? "Regen!" :
        et === "immunity" ? "Immunity!" :
        et === "evade" ? "Evade!" :
        et === "damage_reflect" ? "Damage Reflect!" :
        et === "taunt" ? "Taunt!" :
        et;

      events.push(
        makeEvent("BUFF_APPLIED", {
          actorUid: actor.uid,
          targetUid: target.uid,
          text: label,
        })
      );
    }

    // ---- UTILITY effects — handled inline ----
    else if (et === "cleanse") {
      const removed = (target.statuses || []).filter(
        (s) =>
          DOT_TYPES.has(s.effectType) ||
          CC_TYPES.has(s.effectType) ||
          DEBUFF_TYPES.has(s.effectType) ||
          s.effectType === "shock"
      );
      target.statuses = (target.statuses || []).filter(
        (s) =>
          !DOT_TYPES.has(s.effectType) &&
          !CC_TYPES.has(s.effectType) &&
          !DEBUFF_TYPES.has(s.effectType) &&
          s.effectType !== "shock"
      );
      if (removed.length > 0) {
        events.push(
          makeEvent("CLEANSE", {
            actorUid: actor.uid,
            targetUid: target.uid,
            text: `Cleansed ${removed.length} debuff(s)!`,
          })
        );
      }
    }

    else if (et === "dispel") {
      const removed = (target.statuses || []).filter(
        (s) => BUFF_TYPES.has(s.effectType)
      );
      target.statuses = (target.statuses || []).filter(
        (s) => !BUFF_TYPES.has(s.effectType)
      );
      if (removed.length > 0) {
        events.push(
          makeEvent("DISPEL", {
            actorUid: actor.uid,
            targetUid: target.uid,
            text: `Dispelled ${removed.length} buff(s)!`,
          })
        );
      }
    }

    else if (et === "extra_turn") {
      // Flag is read by the battle loop in Battle.jsx
      actor._extraTurn = true;
      events.push(
        makeEvent("PASSIVE_TRIGGER", {
          actorUid: actor.uid,
          targetUid: actor.uid,
          text: "Extra Turn!",
        })
      );
    }

    else if (et === "revive_ally") {
      // Handled by the 'revive' skill type in Battle.jsx
      // This effect is a no-op here when applied via applyJutsuEffects
    }
  }

  return events;
}

// ============================================================
// CROWD CONTROL CHECK
// ============================================================

export function isStunned(actor) {
  return !!actor.statuses?.some(
    (s) =>
      CC_TYPES.has(
        s.effectType
      ) &&
      (s.duration ?? 0) > 0
  );
}

// ============================================================
// TAUNT CHECK — returns the uid of a taunting enemy, or null
// ============================================================

export function getTauntTarget(arr, attackerSide) {
  const taunters = arr.filter(
    (c) =>
      c.alive &&
      c.side !== attackerSide &&
      c.statuses?.some(
        (s) =>
          s.effectType === "taunt" &&
          (s.duration ?? 0) > 0
      )
  );
  return taunters.length > 0 ? taunters[0].uid : null;
}

// ============================================================
// IMMUNITY CHECK — is the target immune to debuffs?
// ============================================================

export function isImmune(target) {
  return !!target.statuses?.some(
    (s) =>
      s.effectType === "immunity" &&
      (s.duration ?? 0) > 0
  );
}

// ============================================================
// STATUS TICKING
// ============================================================

export function tickStatuses(actor) {
  const events = [];

  let dmg = 0;

  if (
    !actor.statuses?.length
  ) {
    return {
      dmg,
      events,
    };
  }

  const keep = [];

  for (
    const s of actor.statuses
  ) {
    if (
      s.effectType ===
      "curse_dot"
    ) {
      const tick =
        Math.round(
          s.magnitude *
            (s.stacks || 1)
        );

      dmg += tick;

      events.push(
        makeEvent(
          "DOT_TRIGGERED",
          {
            targetUid:
              actor.uid,
            value: tick,
            effectType:
              "curse_dot",
          }
        )
      );

      s.duration -= 1;

      if (s.duration > 0) {
        keep.push(s);
      }
    }

    else if (
      DOT_TYPES.has(
        s.effectType
      )
    ) {
      const stacks =
        s.stacks || 1;

      const tick =
        Math.round(
          (s.magnitude || 0) *
            stacks
        );

      dmg += tick;

      events.push(
        makeEvent(
          "DOT_TRIGGERED",
          {
            targetUid:
              actor.uid,
            value: tick,
            effectType:
              s.effectType,
          }
        )
      );

      s.duration -= 1;

      if (s.duration > 0) {
        keep.push(s);
      }
    }

    else if (
      CC_TYPES.has(
        s.effectType
      ) ||
      DEBUFF_TYPES.has(
        s.effectType
      ) ||
      s.effectType === "shock"
    ) {
      s.duration -= 1;

      if (s.duration > 0) {
        keep.push(s);
      }
    }

    // Regen — heal ally each turn
    else if (s.effectType === "regen") {
      const healAmount = Math.round(
        (actor.maxHp || 0) * (s.value || 10) / 100
      );
      const oldHp = actor.hp;
      actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
      const actualHeal = actor.hp - oldHp;
      if (actualHeal > 0) {
        events.push(
          makeEvent("HEAL", {
            targetUid: actor.uid,
            value: actualHeal,
            text: `Regen +${actualHeal}`,
          })
        );
      }
      s.duration -= 1;
      if (s.duration > 0) {
        keep.push(s);
      }
    }

    // Buffs and taunt — tick duration
    else if (BUFF_TYPES.has(s.effectType)) {
      s.duration -= 1;
      if (s.duration > 0) {
        keep.push(s);
      }
    }

    else {
      keep.push(s);
    }
  }

  actor.statuses =
    keep;

  return {
    dmg,
    events,
  };
}

// ============================================================
// DEATH / REVIVAL
// ============================================================

export function resolveDeath(
  target,
  events = []
) {
  if (
    target.passive?.effect_type ===
      "revive_once" &&
    !target.revivalUsed
  ) {
    target.revivalUsed =
      true;

    target.hp =
      Math.max(
        1,
        Math.round(
          target.maxHp * 0.4
        )
      );

    target.shield = 0;
    target.alive = true;

    events.push(
      makeEvent(
        "REVIVAL",
        {
          targetUid:
            target.uid,
          text:
            `${target.name} rises again!`,
        }
      )
    );

    return true;
  }

  target.hp = 0;
  target.shield = 0;
  target.alive = false;

  events.push(
    makeEvent(
      "DEATH",
      {
        targetUid:
          target.uid,
      }
    )
  );

  return false;
}

// ============================================================
// BATTLE START PASSIVES
// ============================================================

export function applyBattleStartPassives(
  arr
) {
  const events = [];

  arr.forEach((c) => {
    if (!c.alive) return;

    if (
      c.passive?.effect_type ===
      "team_shield"
    ) {
      arr
        .filter(
          (a) =>
            a.side === c.side &&
            a.alive
        )
        .forEach((ally) => {
          const shieldPercent =
            passivePercent(
              c,
              0.15
            );

          const amt =
            Math.round(
              ally.maxHp *
                shieldPercent
            );

          ally.shield += amt;

          events.push(
            makeEvent(
              "SHIELD_APPLIED",
              {
                actorUid: c.uid,
                targetUid:
                  ally.uid,
                value: amt,
                text:
                  `${c.name}'s Aegis`,
              }
            )
          );
        });
    }

    if (
      c.passive?.effect_type ===
      "speed_boost"
    ) {
      const percent =
        passivePercent(
          c,
          0.15
        );

      const bonus =
        Math.round(
          c.baseBattleSpd *
            percent
        );

      c.spd =
        c.baseBattleSpd + bonus;

      events.push(
        makeEvent(
          "PASSIVE_TRIGGER",
          {
            actorUid: c.uid,
            targetUid: c.uid,
            text:
              `${c.passive.name}: Speed increased!`,
            value: bonus,
          }
        )
      );
    }

    if (
      c.passive?.effect_type ===
      "first_strike"
    ) {
      const bonus =
        passiveValue(
          c,
          20
        );

      const oldChakra =
        c.chakra;

      c.chakra =
        Math.min(
          c.maxChakra,
          c.chakra + bonus
        );

      const actualGain =
        c.chakra -
        oldChakra;

      if (actualGain > 0) {
        events.push(
          makeEvent(
            "PASSIVE_TRIGGER",
            {
              actorUid: c.uid,
              targetUid: c.uid,
              text:
                `${c.passive.name}: +${actualGain} Chakra`,
              value:
                actualGain,
            }
          )
        );
      }
    }

    // Team ATK buff at battle start
    if (
      c.passive?.effect_type === "team_atk_buff"
    ) {
      const boost = c.passive.params?.atk_boost || 20;
      const dur = c.passive.params?.duration || 3;
      arr
        .filter((a) => a.side === c.side && a.alive)
        .forEach((ally) => {
          ally.statuses = ally.statuses || [];
          ally.statuses.push({
            id: `team_atk_up_${ally.uid}_${Date.now()}`,
            effectType: "team_atk_up",
            source: c.uid,
            duration: dur,
            value: boost,
          });
        });
      events.push(
        makeEvent("BUFF_APPLIED", {
          actorUid: c.uid,
          text: `${c.passive.name}: Team ATK +${boost}%`,
        })
      );
    }

    // Team DEF buff at battle start
    if (
      c.passive?.effect_type === "team_def_buff"
    ) {
      const boost = c.passive.params?.def_boost || 15;
      const dur = c.passive.params?.duration || 3;
      arr
        .filter((a) => a.side === c.side && a.alive)
        .forEach((ally) => {
          ally.statuses = ally.statuses || [];
          ally.statuses.push({
            id: `team_def_up_${ally.uid}_${Date.now()}`,
            effectType: "team_def_up",
            source: c.uid,
            duration: dur,
            value: boost,
          });
        });
      events.push(
        makeEvent("BUFF_APPLIED", {
          actorUid: c.uid,
          text: `${c.passive.name}: Team DEF +${boost}%`,
        })
      );
    }

    // Speed boost self at battle start
    if (
      c.passive?.effect_type === "speed_boost_self"
    ) {
      const boost = c.passive.params?.initial_boost || c.passive.params?.spd_boost || 15;
      const bonus = Math.round(c.baseBattleSpd * boost / 100);
      c.spd = c.baseBattleSpd + bonus;
      events.push(
        makeEvent("PASSIVE_TRIGGER", {
          actorUid: c.uid,
          targetUid: c.uid,
          text: `${c.passive.name}: +${boost}% SPD`,
          value: bonus,
        })
      );
    }

    // Stacking power — initialize stacks
    if (
      c.passive?.effect_type === "stacking_power" ||
      c.passive?.effect_type === "atk_scaling_turns"
    ) {
      c._stacks = 0;
    }

    // Crit boost self — initialize stacks
    if (
      c.passive?.effect_type === "crit_boost_self"
    ) {
      c._critStacks = 0;
    }
  });

  return events;
}

// ============================================================
// BOSS MECHANICS
// ============================================================

export function evaluateBossPhase(
  boss,
  mechanicDef
) {
  if (
    !mechanicDef?.phases
  ) {
    return -1;
  }

  const pct =
    (boss.hp /
      boss.maxHp) *
    100;

  let idx = -1;

  mechanicDef.phases.forEach(
    (p, i) => {
      const match =
        (p.hp_above != null &&
          pct > p.hp_above) ||
        (p.hp_between &&
          pct <=
            p.hp_between[1] &&
          pct >
            p.hp_between[0]) ||
        (p.hp_below != null &&
          pct <= p.hp_below);

      if (match) {
        idx = i;
      }
    }
  );

  return idx;
}

// ============================================================
// ENTER BOSS PHASE
// ============================================================

export function enterBossPhase(
  boss,
  phase,
  events
) {
  // Reset phase state so multipliers do not stack permanently.
  boss.enraged = false;
  boss.shieldPhaseActive = false;
  boss.lifestealPct = 0;

  // Restore original stats before applying new phase modifiers.
  if (boss.baseBattleAtk != null) {
    boss.atk =
      boss.baseBattleAtk;
  }

  if (boss.baseBattleSpd != null) {
    boss.spd =
      boss.baseBattleSpd;
  }

  // ==========================================================
  // SHIELDED PHASE
  // ==========================================================

  if (
    phase.behavior ===
    "shielded"
  ) {
    const amt =
      Math.round(
        boss.maxHp *
          ((phase.shield_pct ||
            0) /
            100)
      );

    boss.shield += amt;

    boss.aoeHitsTaken = 0;

    boss.shieldPhaseActive =
      true;

    events.push(
      makeEvent(
        "SHIELD_APPLIED",
        {
          targetUid:
            boss.uid,
          value: amt,
          text:
            "Shield Phase",
        }
      )
    );

    events.push(
      makeEvent(
        "BOSS_PHASE_CHANGE",
        {
          targetUid:
            boss.uid,
          text:
            "DEFENSIVE PHASE",
        }
      )
    );
  }

  // ==========================================================
  // ENRAGED / EMPOWERED / DESPERATION
  // ==========================================================

  else if (
    phase.behavior ===
    "enraged" ||
    phase.behavior ===
      "empowered" ||
    phase.behavior ===
      "desperation"
  ) {
    const atkMult =
      phase.atk_mult || 1;

    const spdMult =
      phase.spd_mult || 1;

    boss.atk =
      Math.round(
        boss.baseBattleAtk *
          atkMult
      );

    boss.spd =
      Math.round(
        boss.baseBattleSpd *
          spdMult
      );

    if (phase.shield_pct) {
      const amt =
        Math.round(
          boss.maxHp *
            (phase.shield_pct / 100)
        );

      boss.shield += amt;

      events.push(
        makeEvent(
          "SHIELD_APPLIED",
          {
            targetUid:
              boss.uid,
            value: amt,
            text:
              phase.behavior ===
              "desperation"
                ? "Desperation Shield"
                : "Empowered Shield",
          }
        )
      );
    }

    if (phase.lifesteal_pct) {
      boss.lifestealPct =
        phase.lifesteal_pct;
    }

    boss.enraged = true;

    const phaseLabel =
      phase.behavior ===
      "desperation"
        ? "DESPERATION"
        : phase.behavior ===
          "empowered"
        ? "EMPOWERED"
        : "ENRAGED";

    events.push(
      makeEvent(
        "BOSS_PHASE_CHANGE",
        {
          targetUid:
            boss.uid,
          text: phaseLabel,
        }
      )
    );
  }

  // ==========================================================
  // ELEMENTAL SHIFT
  // ==========================================================

  else if (
    phase.behavior ===
    "elemental_shift"
  ) {
    boss.element =
      phase.shift_to ||
      boss.element;

    events.push(
      makeEvent(
        "BOSS_PHASE_CHANGE",
        {
          targetUid:
            boss.uid,
          text:
            `Element Shift: ${boss.element}`,
        }
      )
    );
  }

  // ==========================================================
  // NORMAL PHASE
  // ==========================================================

  else if (
    phase.behavior === "normal"
  ) {
    if (phase.atk_mult) {
      boss.atk =
        Math.round(
          boss.baseBattleAtk *
            phase.atk_mult
        );
    }

    if (phase.spd_mult) {
      boss.spd =
        Math.round(
          boss.baseBattleSpd *
            phase.spd_mult
        );
    }
  }

  return events;
}

// ============================================================
// CHECK BOSS PHASE TRANSITIONS
// ============================================================

export function checkBossPhaseTransitions(
  arr,
  bossMechanics
) {
  const events = [];

  if (!bossMechanics) {
    return events;
  }

  arr.forEach((c) => {
    if (
      !c.alive ||
      !c.bossMechanicId
    ) {
      return;
    }

    const def =
      bossMechanics[
        c.bossMechanicId
      ];

    if (!def) return;

    const newIdx =
      evaluateBossPhase(
        c,
        def
      );

    if (
      newIdx !== -1 &&
      newIdx !==
        c.bossPhaseIndex
    ) {
      const phase =
        def.phases[newIdx];

      const alreadyBroken =
        phase.behavior ===
          "shielded" &&
        c.shieldBrokenPhase ===
          newIdx;

      if (!alreadyBroken) {
        enterBossPhase(
          c,
          phase,
          events
        );
      }

      c.bossPhaseIndex =
        newIdx;
    }
  });

  return events;
}