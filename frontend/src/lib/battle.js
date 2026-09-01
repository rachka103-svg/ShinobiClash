// Client-side turn-based combat helpers (mirrors backend stat formulas).

import { spireFloorConfig, pickRarity } from "./spireConfig";

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
  };
}

export function elementMultiplier(
  attEl,
  defEl,
  advantage
) {
  if (advantage[attEl] === defEl) return 1.3;
  if (advantage[defEl] === attEl) return 0.75;
  return 1.0;
}

// ============================================================
// ENEMY GEAR — applies generated stat bonuses (from stage data)
// to an enemy's computed stats, representing equipment that
// scales with campaign progression.
// ============================================================
export function applyEnemyGear(stats, gearBonus) {
  if (!gearBonus) return stats;
  return {
    hp: Math.round(stats.hp * (1 + (gearBonus.hp_pct || 0) / 100)),
    atk: Math.round(stats.atk * (1 + (gearBonus.atk_pct || 0) / 100)),
    def: Math.round(stats.def * (1 + (gearBonus.def_pct || 0) / 100)),
    spd: Math.round(stats.spd * (1 + (gearBonus.spd_pct || 0) / 100)),
    chakra: stats.chakra,
  };
}

// ============================================================
// STAT DEBUFF HELPERS
// ============================================================

export function effectiveAtk(actor) {
  let atk = actor.atk;

  const debuff =
    actor.statuses?.find(
      (s) =>
        s.effectType === "atk_down" &&
        (s.duration ?? 0) > 0
    );

  if (debuff) {
    atk = Math.round(
      atk *
        (1 -
          (debuff.value || 0) / 100)
    );
  }

  return atk;
}

export function effectiveDef(actor) {
  let def = actor.def;

  const debuff =
    actor.statuses?.find(
      (s) =>
        s.effectType === "def_down" &&
        (s.duration ?? 0) > 0
    );

  if (debuff) {
    def = Math.round(
      def *
        (1 -
          (debuff.value || 0) / 100)
    );
  }

  return def;
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
    jutsu.element,
    target.element,
    advantage
  );

  // Defense subtracts more meaningfully so battles last a few actions
  // longer without turning enemies into HP sponges — strategy and status
  // effects get room to matter.
  let raw =
    base * mult -
    def * 0.6;

  raw = Math.max(
    raw,
    base * 0.15
  );

  const variance =
    0.9 + Math.random() * 0.2;

  const crit =
    Math.random() < 0.14;

  const dmg = Math.round(
    raw *
      variance *
      (crit ? 1.5 : 1)
  );

  return {
    dmg,
    crit,
    mult,
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

  // ============================================================
  // PASSIVE FILTER
  // Passives must NEVER become selectable battle commands.
  // ============================================================

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

            if (m.bonus_power_pct) {
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

    // Passives are stored separately.
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

    shield: 0,

    // ACTIVE abilities only.
    jutsus,

    alive: true,

    statuses: [],

    revivalUsed: false,
    lowHpShieldUsed: false,

    bossMechanicId: null,
    bossPhaseIndex: -1,
    aoeHitsTaken: 0,
    shieldBrokenPhase: null,
    enraged: false,
    shieldPhaseActive: false,
  };
}

// ============================================================
// TURN ORDER
// ============================================================

export function buildOrder(
  combatants
) {
  return combatants
    .filter((c) => c.alive)
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
      (a + 0x6d2b79f5) | 0;

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
    (floor * 2654435761) >>> 0
  );

  const cfg = spireFloorConfig(floor);
  const lvl = cfg.enemyLevel;
  const probs = cfg.rarityProbs;

  // Boss floor: a single high-rarity enemy with boosted level.
  if (cfg.isBoss) {
    // Boss rarity is at least SSR, weighted toward the floor's top rarities.
    const bossRoll = 0.3 + rng() * 0.7; // skew toward rarer
    let bossRarity = pickRarity(probs, bossRoll);
    if (bossRarity === "R" || bossRarity === "SR") bossRarity = "SSR";
    const bossPool = catalog.filter((c) => c.rarity === bossRarity);
    const pool = bossPool.length
      ? bossPool
      : catalog.filter((c) => ["SSR", "UR", "GR"].includes(c.rarity));
    const src = pool.length ? pool : catalog;
    const b = src[Math.floor(rng() * src.length)] || catalog[0];
    return [
      {
        template_id: b.id,
        level: Math.round(lvl * 1.5),
      },
    ];
  }

  const count = cfg.teamSize;
  const out = [];

  for (let i = 0; i < count; i++) {
    const rarity = pickRarity(probs, rng());
    let pool = catalog.filter((c) => c.rarity === rarity);
    if (!pool.length) pool = catalog; // fallback if no heroes of that rarity
    const src = pool;
    out.push({
      template_id: src[Math.floor(rng() * src.length)].id,
      level: lvl + Math.floor(rng() * 3),
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

  // New passive mechanics
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
// DAMAGE RESOLUTION + PASSIVE DAMAGE MODIFIERS
// ============================================================

export function resolveDamage(
  actor,
  target,
  jutsu,
  advantage
) {
  const base =
    rollDamage(
      actor,
      target,
      jutsu,
      advantage
    );

  let dmg = base.dmg;

  const notes = [];

  // ============================================================
  // PASSIVE: Berserk at low HP
  // ============================================================

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

  // ============================================================
  // PASSIVE: Crit Boost
  // ============================================================

  if (
    actor.passive?.effect_type ===
    "crit_boost"
  ) {
    if (Math.random() < 0.2) {
      dmg = Math.round(
        dmg * 1.25
      );

      notes.push(
        "critical_passive"
      );
    }
  }

  // ============================================================
  // PASSIVE: Berserker scaling
  // ============================================================

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

  // ============================================================
  // PASSIVE: Execute bonus
  // ============================================================

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

  // ============================================================
  // BOSS ENRAGE
  // ============================================================

  if (actor.enraged) {
    dmg = Math.round(
      dmg * 1.2
    );
  }

  return {
    ...base,
    dmg,
    notes,
  };
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

  // ============================================================
  // PASSIVE: Blood Mark stacking
  // ============================================================

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

      if (
        mark.stacks >= 3
      ) {
        burstDamage =
          Math.round(
            actor.atk * 0.8
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

  // ============================================================
  // PASSIVE: Withering Curse / Escalating DOT
  // ============================================================

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
          actor.atk * 0.22
        )
      );

    if (!dot) {
      dot = {
        id: `dot_${actor.uid}_${target.uid}_${Date.now()}`,
        effectType:
          "curse_dot",
        source: actor.uid,
        duration: 4,
        magnitude: baseMag,
        stacks: 1,
      };

      target.statuses.push(
        dot
      );
    } else {
      dot.duration = 4;

      dot.stacks = Math.min(
        3,
        dot.stacks + 1
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

  // ============================================================
  // JUTSU STATUS EFFECTS
  // ============================================================

  const effEvents =
    applyJutsuEffects(
      actor,
      target,
      jutsu
    );

  events.push(
    ...effEvents
  );

  // ============================================================
  // PASSIVE: Lifesteal
  // ============================================================

  if (
    actor.passive?.effect_type ===
      "lifesteal" &&
    actor.alive
  ) {
    const healAmount =
      Math.round(
        actor.maxHp * 0.08
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

  // ============================================================
  // PASSIVE: Chakra on Hit
  // ============================================================

  if (
    actor.passive?.effect_type ===
    "chakra_on_hit"
  ) {
    const gain = 10;

    const oldChakra =
      actor.chakra;

    actor.chakra = Math.min(
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

  // ============================================================
  // PASSIVE: Poison Mastery
  // ============================================================

  if (
    actor.passive?.effect_type ===
    "poison_mastery"
  ) {
    const poisoned =
      target.statuses?.some(
        (s) =>
          s.effectType ===
          "poison"
      );

    if (poisoned) {
      const bonusDamage =
        Math.round(
          actor.atk * 0.15
        );

      target.hp = Math.max(
        0,
        target.hp -
          bonusDamage
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
              `${actor.passive.name}: Poison Bonus!`,
            value:
              bonusDamage,
          }
        )
      );
    }
  }

  // ============================================================
  // PASSIVE: Burn Mastery
  // ============================================================

  if (
    actor.passive?.effect_type ===
    "burn_mastery"
  ) {
    const burning =
      target.statuses?.some(
        (s) =>
          s.effectType ===
          "burn"
      );

    if (burning) {
      const bonusDamage =
        Math.round(
          actor.atk * 0.15
        );

      target.hp = Math.max(
        0,
        target.hp -
          bonusDamage
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
              `${actor.passive.name}: Burning Fury!`,
            value:
              bonusDamage,
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
// STATUS EFFECT SYSTEM
// ============================================================

const DOT_TYPES =
  new Set([
    "burn",
    "poison",
    "bleed",
  ]);

const CC_TYPES =
  new Set([
    "stun",
    "freeze",
  ]);

const DEBUFF_TYPES =
  new Set([
    "atk_down",
    "def_down",
  ]);

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
      const mag =
        Math.max(
          1,
          Math.round(
            effectiveAtk(actor) *
              (val / 100)
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
      } else {
        target.statuses.push({
          id: `${et}_${actor.uid}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: dur,
          magnitude: mag,
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
            text: `${et
              .charAt(0)
              .toUpperCase()}${et.slice(
              1
            )} applied!`,
          }
        )
      );
    } else if (
      CC_TYPES.has(et)
    ) {
      if (
        !target.statuses.find(
          (s) =>
            s.effectType === et
        )
      ) {
        target.statuses.push({
          id: `${et}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: 1,
        });

        events.push(
          makeEvent(
            "DEBUFF_APPLIED",
            {
              actorUid:
                actor.uid,
              targetUid:
                target.uid,
              text: `${et
                .charAt(0)
                .toUpperCase()}${et.slice(
                1
              )}!`,
            }
          )
        );
      }
    } else if (
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
      } else {
        target.statuses.push({
          id: `${et}_${target.uid}_${Date.now()}`,
          effectType: et,
          source: actor.uid,
          duration: dur,
          value: val,
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
    } else if (et === "shock") {
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
  }

  return events;
}

// ============================================================
// CROWD CONTROL CHECK
// ============================================================

export function isStunned(
  actor
) {
  return !!actor.statuses?.some(
    (s) =>
      CC_TYPES.has(
        s.effectType
      ) &&
      (s.duration ?? 0) > 0
  );
}

// ============================================================
// STATUS TICKING
// ============================================================

export function tickStatuses(
  actor
) {
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
        s.magnitude *
        s.stacks;

      dmg += tick;

      events.push(
        makeEvent(
          "DOT_TRIGGERED",
          {
            targetUid:
              actor.uid,
            value: tick,
          }
        )
      );

      s.duration -= 1;

      if (s.duration > 0) {
        keep.push(s);
      }
    } else if (
      DOT_TYPES.has(
        s.effectType
      )
    ) {
      const tick =
        s.magnitude || 0;

      dmg += tick;

      events.push(
        makeEvent(
          "DOT_TRIGGERED",
          {
            targetUid:
              actor.uid,
            value: tick,
          }
        )
      );

      s.duration -= 1;

      if (s.duration > 0) {
        keep.push(s);
      }
    } else if (
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
    } else {
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
  events
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

    target.alive =
      true;

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
    // ==========================================================
    // PASSIVE: Team Shield
    // ==========================================================

    if (
      c.alive &&
      c.passive?.effect_type ===
        "team_shield"
    ) {
      arr
        .filter(
          (a) =>
            a.side === c.side &&
            a.alive
        )
        .forEach(
          (ally) => {
            const amt =
              Math.round(
                ally.maxHp *
                  0.15
              );

            ally.shield +=
              amt;

            events.push(
              makeEvent(
                "SHIELD_APPLIED",
                {
                  actorUid:
                    c.uid,
                  targetUid:
                    ally.uid,
                  value: amt,
                  text:
                    `${c.name}'s Aegis`,
                }
              )
            );
          }
        );
    }

    // ==========================================================
    // PASSIVE: Speed Boost
    // ==========================================================

    if (
      c.alive &&
      c.passive?.effect_type ===
        "speed_boost"
    ) {
      const bonus =
        Math.round(
          c.spd * 0.15
        );

      c.spd += bonus;

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

    // ==========================================================
    // PASSIVE: First Strike
    // ==========================================================

    if (
      c.alive &&
      c.passive?.effect_type ===
        "first_strike"
    ) {
      const bonus = 20;

      const oldChakra =
        c.chakra;

      c.chakra =
        Math.min(
          c.maxChakra,
          c.chakra +
            bonus
        );

      const actualGain =
        c.chakra -
        oldChakra;

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
          pct >
            p.hp_above) ||
        (p.hp_between &&
          pct <=
            p.hp_between[1] &&
          pct >
            p.hp_between[0]) ||
        (p.hp_below != null &&
          pct <=
            p.hp_below);

      if (match) {
        idx = i;
      }
    }
  );

  return idx;
}

export function enterBossPhase(
  boss,
  phase,
  events
) {
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
  } else if (
    phase.behavior ===
    "enraged" ||
    phase.behavior ===
      "empowered" ||
    phase.behavior ===
      "desperation"
  ) {
    // Apply stat multipliers from the phase definition
    if (phase.atk_mult) {
      boss.atk = Math.round(boss.atk * phase.atk_mult);
    }
    if (phase.spd_mult) {
      boss.spd = Math.round(boss.spd * phase.spd_mult);
    }

    // Empowered/desperation phases can grant shields
    if (phase.shield_pct) {
      const amt = Math.round(boss.maxHp * (phase.shield_pct / 100));
      boss.shield += amt;
      events.push(
        makeEvent("SHIELD_APPLIED", {
          targetUid: boss.uid,
          value: amt,
          text: phase.behavior === "desperation" ? "Desperation Shield" : "Empowered Shield",
        })
      );
    }

    // Desperation phase grants lifesteal
    if (phase.lifesteal_pct) {
      boss.lifestealPct = phase.lifesteal_pct;
    }

    boss.enraged = true;

    const phaseLabel =
      phase.behavior === "desperation" ? "DESPERATION" :
      phase.behavior === "empowered" ? "EMPOWERED" : "ENRAGED";

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
  } else if (
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
  } else if (
    phase.behavior === "normal" &&
    phase.atk_mult
  ) {
    // Phase 1 of Dreamlord has a passive atk boost applied at battle start
    boss.atk = Math.round(boss.atk * phase.atk_mult);
    if (phase.spd_mult) {
      boss.spd = Math.round(boss.spd * phase.spd_mult);
    }
  }

  return events;
}

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
