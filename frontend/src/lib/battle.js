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
    passive: template.passive || null,
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
    // --- ability-resolution / status-effect state (Phase 3B) ---
    statuses: [],       // [{id, effectType, source, stacks, duration, magnitude}]
    revivalUsed: false,  // guards one-time revive-on-death passives
    // --- boss-mechanic state (only set on boss stage enemies) ---
    bossMechanicId: null,
    bossPhaseIndex: -1,
    aoeHitsTaken: 0,
    shieldBrokenPhase: null,
    enraged: false,
    shieldPhaseActive: false,
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

// ===========================================================================
// PHASE 3B — Central Ability Resolution Layer + Status-Effect Framework
// ===========================================================================
// This is the single, reusable, data-driven place the combat engine reads a
// hero's `passive.effect_type` and resolves its behavior against live battle
// state. It is consumed identically by Campaign, Spire and Arena (all three
// build combatants via `buildCombatant` above and drive them through the
// same `Battle.jsx` turn loop) — no mode has its own ability logic.
//
// Only 6 effect_types are wired to real combat behavior in this phase
// (per the Phase 3B directive): hp_scaling_power, execute_low_hp,
// stacking_mark_detonate, escalating_dot, team_shield, revive_once.
// Every other passive in MECHANIC_LIBRARY (backend game_data.py) is
// intentionally left DATA-ONLY for now — heroes carrying them simply fight
// with their base kit, nothing crashes, and they're trivial to wire in later
// by adding another branch to the functions below.
// ===========================================================================

let _eventId = 0;
/** Structured combat event — the UI (and future VFX/animation layer) reads
 * these instead of recomputing anything; the engine remains the single
 * source of truth for what happened. */
export function makeEvent(type, payload = {}) {
  return { id: `ev${_eventId++}`, type, ts: Date.now(), ...payload };
}

const WIRED_EFFECTS = new Set([
  "hp_scaling_power", "execute_low_hp", "stacking_mark_detonate",
  "escalating_dot", "team_shield", "revive_once",
]);

/** Whether this combatant's passive is one of the mechanics actually wired
 * into combat this phase (vs. data-only, awaiting a future pass). */
export function hasWiredPassive(c) {
  return !!(c.passive && WIRED_EFFECTS.has(c.passive.effect_type));
}

/**
 * Central damage resolver — the single place attack/aoe damage is computed.
 * Wraps the base `rollDamage` formula with any passive modifiers that alter
 * outgoing damage (berserker scaling, execute bonus, boss enrage).
 */
export function resolveDamage(actor, target, jutsu, advantage) {
  const base = rollDamage(actor, target, jutsu, advantage);
  let dmg = base.dmg;
  const notes = [];

  // Berserker's Rage (hp_scaling_power): the lower the actor's own HP, the
  // harder it hits — up to +50% at 0% HP.
  if (actor.passive?.effect_type === "hp_scaling_power") {
    const missingPct = 1 - actor.hp / actor.maxHp;
    if (missingPct > 0.01) {
      dmg = Math.round(dmg * (1 + missingPct * 0.5));
      notes.push("enrage");
    }
  }

  // Shadow Execute (execute_low_hp): devastating bonus vs low-HP targets.
  if (actor.passive?.effect_type === "execute_low_hp" && target.hp / target.maxHp < 0.3) {
    dmg = Math.round(dmg * 1.5);
    notes.push("execute");
  }

  // Boss enrage phase directly buffs `atk` on phase-enter (see
  // enterBossPhase), so no extra multiplier is needed here — it's already
  // baked into `actor.atk` by the time rollDamage ran above.
  return { ...base, dmg, notes };
}

/**
 * Resolves secondary on-hit effects (marks, DoTs) that attach to the target
 * as a `status` after a successful attack/aoe hit. Returns any immediate
 * bonus damage (e.g. a mark detonating) plus structured events.
 */
export function resolveOnHitEffects(actor, target, jutsu) {
  const events = [];
  let burstDamage = 0;
  if (!target.alive || (jutsu.type !== "attack" && jutsu.type !== "aoe")) return { burstDamage, events };
  target.statuses = target.statuses || [];

  // Blood Mark (stacking_mark_detonate): stacks per hit; detonates at 5.
  if (actor.passive?.effect_type === "stacking_mark_detonate") {
    let mark = target.statuses.find((s) => s.effectType === "blood_mark" && s.source === actor.uid);
    if (!mark) {
      mark = { id: `mark_${actor.uid}_${target.uid}_${Date.now()}`, effectType: "blood_mark", source: actor.uid, stacks: 0 };
      target.statuses.push(mark);
    }
    mark.stacks += 1;
    if (mark.stacks >= 5) {
      burstDamage = Math.round(actor.atk * 0.8);
      target.statuses = target.statuses.filter((s) => s !== mark);
      events.push(makeEvent("DEBUFF_APPLIED", { targetUid: target.uid, text: "Blood Mark Detonates!" }));
    } else {
      events.push(makeEvent("DEBUFF_APPLIED", { targetUid: target.uid, text: `Blood Mark x${mark.stacks}` }));
    }
  }

  // Withering Curse (escalating_dot): refreshable DoT, ticks on the
  // target's own turns (see tickStatuses), growing with repeated hits.
  if (actor.passive?.effect_type === "escalating_dot") {
    let dot = target.statuses.find((s) => s.effectType === "curse_dot" && s.source === actor.uid);
    const baseMag = Math.max(6, Math.round(actor.atk * 0.22));
    if (!dot) {
      dot = { id: `dot_${actor.uid}_${target.uid}_${Date.now()}`, effectType: "curse_dot", source: actor.uid, duration: 4, magnitude: baseMag, stacks: 1 };
      target.statuses.push(dot);
    } else {
      dot.duration = 4; // refresh
      dot.stacks = Math.min(3, dot.stacks + 1); // escalates with repeated applications
    }
    events.push(makeEvent("DEBUFF_APPLIED", { targetUid: target.uid, text: "Withering Curse" }));
  }

  return { burstDamage, events };
}

/**
 * Ticks all of `actor`'s active statuses at the START of their own turn
 * (the defined trigger timing for DoTs in this implementation). Mutates
 * `actor.statuses` in place (removing expired entries) and returns the
 * total damage to apply plus structured events.
 */
export function tickStatuses(actor) {
  const events = [];
  let dmg = 0;
  if (!actor.statuses?.length) return { dmg, events };
  const keep = [];
  for (const s of actor.statuses) {
    if (s.effectType === "curse_dot") {
      const tick = s.magnitude * s.stacks;
      dmg += tick;
      events.push(makeEvent("DOT_TRIGGERED", { targetUid: actor.uid, value: tick }));
      s.duration -= 1;
      if (s.duration > 0) keep.push(s);
    } else {
      keep.push(s);
    }
  }
  actor.statuses = keep;
  return { dmg, events };
}

/**
 * Central death resolver. Every code path that would set a combatant to
 * hp<=0/alive=false MUST go through this function instead, so revive-once
 * passives (Phoenix Revival) are guaranteed to trigger exactly once,
 * anywhere damage comes from (attack, AoE, mark detonation, DoT tick).
 * Returns true if the combatant was revived instead of dying.
 */
export function resolveDeath(target, events) {
  if (target.passive?.effect_type === "revive_once" && !target.revivalUsed) {
    target.revivalUsed = true;
    target.hp = Math.max(1, Math.round(target.maxHp * 0.4));
    target.alive = true;
    events.push(makeEvent("REVIVAL", { targetUid: target.uid, text: `${target.name} rises again!` }));
    return true;
  }
  target.hp = 0;
  target.alive = false;
  events.push(makeEvent("DEATH", { targetUid: target.uid }));
  return false;
}

/**
 * Battle-start passive trigger (Aegis of the Pack / team_shield): grants
 * every ally on the same side as the passive-holder a shield worth 15% of
 * their own max HP. Called exactly once, right after combatants are built.
 */
export function applyBattleStartPassives(arr) {
  const events = [];
  arr.forEach((c) => {
    if (c.alive && c.passive?.effect_type === "team_shield") {
      arr.filter((a) => a.side === c.side && a.alive).forEach((ally) => {
        const amt = Math.round(ally.maxHp * 0.15);
        ally.shield += amt;
        events.push(makeEvent("SHIELD_APPLIED", { targetUid: ally.uid, value: amt, text: `${c.name}'s Aegis` }));
      });
    }
  });
  return events;
}

// ---------------------------------------------------------------------------
// Boss-mechanic runtime — connects the backend's data-only BOSS_MECHANICS
// framework (shield phase / enrage phase / elemental shift) to live combat.
// Reusable across any future boss: it only reads `mechanicDef.phases`.
// ---------------------------------------------------------------------------

/** Returns the index of the phase `boss` should currently be in (by HP%),
 * or -1 if none match (shouldn't happen with well-formed phase data). */
export function evaluateBossPhase(boss, mechanicDef) {
  if (!mechanicDef?.phases) return -1;
  const pct = (boss.hp / boss.maxHp) * 100;
  let idx = -1;
  mechanicDef.phases.forEach((p, i) => {
    const match =
      (p.hp_above != null && pct > p.hp_above) ||
      (p.hp_between && pct <= p.hp_between[1] && pct > p.hp_between[0]) ||
      (p.hp_below != null && pct <= p.hp_below);
    if (match) idx = i;
  });
  return idx;
}

/** Applies the stat/state change for entering a new boss phase. Mutates
 * `boss` in place and appends structured events. */
export function enterBossPhase(boss, phase, events) {
  boss.enraged = false;
  boss.shieldPhaseActive = false;
  if (phase.behavior === "shielded") {
    const amt = Math.round(boss.maxHp * ((phase.shield_pct || 0) / 100));
    boss.shield += amt;
    boss.aoeHitsTaken = 0;
    boss.shieldPhaseActive = true;
    events.push(makeEvent("SHIELD_APPLIED", { targetUid: boss.uid, value: amt, text: "Shield Phase" }));
  } else if (phase.behavior === "enraged") {
    boss.atk = Math.round(boss.atk * (phase.atk_mult || 1));
    boss.spd = Math.round(boss.spd * (phase.spd_mult || 1));
    boss.enraged = true;
    events.push(makeEvent("BOSS_PHASE_CHANGE", { targetUid: boss.uid, text: "ENRAGED" }));
  } else if (phase.behavior === "elemental_shift") {
    boss.element = phase.shift_to || boss.element;
    events.push(makeEvent("BOSS_PHASE_CHANGE", { targetUid: boss.uid, text: `Element Shift: ${boss.element}` }));
  }
  return events;
}

/**
 * Called after any damage is applied — checks every living combatant with
 * an active `bossMechanicId` for a phase transition and applies it. Also
 * enforces the "shielded" phase's break condition (3 AoE hits, tracked via
 * `boss.aoeHitsTaken` — incremented by the caller in Battle.jsx) so a
 * shield that's already been broken doesn't reapply itself.
 */
export function checkBossPhaseTransitions(arr, bossMechanics) {
  const events = [];
  if (!bossMechanics) return events;
  arr.forEach((c) => {
    if (!c.alive || !c.bossMechanicId) return;
    const def = bossMechanics[c.bossMechanicId];
    if (!def) return;
    const newIdx = evaluateBossPhase(c, def);
    if (newIdx !== -1 && newIdx !== c.bossPhaseIndex) {
      const phase = def.phases[newIdx];
      const alreadyBroken = phase.behavior === "shielded" && c.shieldBrokenPhase === newIdx;
      if (!alreadyBroken) enterBossPhase(c, phase, events);
      c.bossPhaseIndex = newIdx;
    }
  });
  return events;
}
