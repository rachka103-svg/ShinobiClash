// Phase 3B — Ability Resolution Layer / Status Framework / Boss Mechanics
// unit tests. Run via: node --experimental-vm-modules or through the
// bundled CJS build (see /app/backend/tests/test_phase3b_combat.py which
// invokes this indirectly through node after an esbuild bundle step, and
// also via the standalone runner below):
//
//   npx esbuild src/lib/battle.js --bundle --format=cjs --platform=node --outfile=/tmp/battle_bundle.cjs
//   node --input-type=module -e "..." (see run_battle_tests.mjs)
//
// These are plain assertions (no framework dependency) so they can run in
// any Node environment without adding a new test runner to the project.
import assert from "node:assert";
import {
  resolveDamage, resolveOnHitEffects, tickStatuses, resolveDeath,
  applyBattleStartPassives, evaluateBossPhase, enterBossPhase, checkBossPhaseTransitions,
} from "./battle.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}\n    ${e.message}`); process.exitCode = 1; }
};

const mk = (over = {}) => ({
  uid: "u1", side: "ally", name: "Test Hero", element: "Fire", rarity: "SR", role: "Attacker",
  passive: null, level: 20, ascension: 0, maxHp: 1000, hp: 1000, maxChakra: 100, chakra: 100,
  atk: 200, def: 80, spd: 100, shield: 0, alive: true, statuses: [], revivalUsed: false,
  bossMechanicId: null, bossPhaseIndex: -1, aoeHitsTaken: 0, shieldBrokenPhase: null,
  enraged: false, shieldPhaseActive: false, ...over,
});
const attackJutsu = { id: "j_atk", type: "attack", power: 100, chakra_cost: 0, element: "Fire" };
const aoeJutsu = { id: "j_aoe", type: "aoe", power: 100, chakra_cost: 50, element: "Fire" };
const advantage = { Fire: { strong: "Wind", weak: "Water" } };

console.log("Phase 3B combat ability tests");

// 1. Damage mechanic — Shadow Execute (execute_low_hp)
test("execute_low_hp deals bonus damage below 30% HP", () => {
  const actor = mk({ passive: { effect_type: "execute_low_hp" } });
  const fullHpTarget = mk({ uid: "t1", side: "enemy", hp: 1000, maxHp: 1000 });
  const lowHpTarget = mk({ uid: "t2", side: "enemy", hp: 200, maxHp: 1000 });
  const r1 = resolveDamage(actor, fullHpTarget, attackJutsu, advantage);
  const r2 = resolveDamage(actor, lowHpTarget, attackJutsu, advantage);
  assert.ok(r2.dmg > r1.dmg, "execute damage should exceed normal damage");
  assert.ok(r2.notes.includes("execute"));
});

// 2. Berserker / enrage — hp_scaling_power
test("hp_scaling_power increases damage as actor HP drops", () => {
  const target = mk({ uid: "t1", side: "enemy" });
  const fullHpActor = mk({ passive: { effect_type: "hp_scaling_power" }, hp: 1000, maxHp: 1000 });
  const lowHpActor = mk({ passive: { effect_type: "hp_scaling_power" }, hp: 100, maxHp: 1000 });
  const r1 = resolveDamage(fullHpActor, { ...target }, attackJutsu, advantage);
  const r2 = resolveDamage(lowHpActor, { ...target }, attackJutsu, advantage);
  assert.ok(r2.dmg > r1.dmg, "low HP berserker should deal more damage");
  assert.ok(r2.notes.includes("enrage"));
});

// 3. Mark/debuff — Blood Mark stacking + detonation at 5 stacks
test("stacking_mark_detonate stacks then bursts at 5", () => {
  const actor = mk({ passive: { effect_type: "stacking_mark_detonate" } });
  const target = mk({ uid: "t1", side: "enemy" });
  let burst = 0;
  for (let i = 0; i < 4; i++) {
    const { burstDamage } = resolveOnHitEffects(actor, target, attackJutsu);
    burst = burstDamage;
    assert.strictEqual(burstDamage, 0, "should not detonate before 5 stacks");
  }
  const mark = target.statuses.find((s) => s.effectType === "blood_mark");
  assert.strictEqual(mark.stacks, 4);
  const fifth = resolveOnHitEffects(actor, target, attackJutsu);
  assert.ok(fifth.burstDamage > 0, "5th stack should detonate for bonus damage");
  assert.strictEqual(target.statuses.find((s) => s.effectType === "blood_mark"), undefined, "mark consumed on detonate");
});

// 4. Damage-over-time — Withering Curse (escalating_dot) attaches & ticks
test("escalating_dot attaches a DoT that deals damage on tick and expires", () => {
  const actor = mk({ passive: { effect_type: "escalating_dot" } });
  const target = mk({ uid: "t1", side: "enemy" });
  resolveOnHitEffects(actor, target, attackJutsu);
  const dot = target.statuses.find((s) => s.effectType === "curse_dot");
  assert.ok(dot, "dot should be attached");
  assert.strictEqual(dot.duration, 4);
  let totalTicks = 0;
  for (let i = 0; i < 4; i++) {
    const { dmg } = tickStatuses(target);
    assert.ok(dmg > 0, "dot should deal damage on tick");
    totalTicks++;
  }
  assert.strictEqual(target.statuses.length, 0, "dot should be removed after duration expires");
  assert.strictEqual(totalTicks, 4);
});

// 5. Shield — Aegis of the Pack (team_shield) applies to whole side at battle start
test("team_shield grants a shield to all allies at battle start", () => {
  const holder = mk({ uid: "h1", side: "ally", passive: { effect_type: "team_shield" } });
  const ally = mk({ uid: "a1", side: "ally" });
  const enemy = mk({ uid: "e1", side: "enemy" });
  const events = applyBattleStartPassives([holder, ally, enemy]);
  assert.ok(holder.shield > 0, "passive holder itself should be shielded");
  assert.ok(ally.shield > 0, "ally should be shielded");
  assert.strictEqual(enemy.shield, 0, "enemy should NOT be shielded");
  assert.ok(events.some((e) => e.type === "SHIELD_APPLIED"));
});

// 6. Revival — Phoenix Revival (revive_once) triggers exactly once
test("revive_once revives at reduced HP exactly once, then dies normally", () => {
  const target = mk({ uid: "t1", passive: { effect_type: "revive_once" }, hp: 0, maxHp: 1000 });
  const events1 = [];
  const revived1 = resolveDeath(target, events1);
  assert.strictEqual(revived1, true);
  assert.ok(target.alive);
  assert.ok(target.hp > 0);
  assert.ok(events1.some((e) => e.type === "REVIVAL"));

  target.hp = 0; // fell again
  const events2 = [];
  const revived2 = resolveDeath(target, events2);
  assert.strictEqual(revived2, false, "should not revive a second time");
  assert.strictEqual(target.alive, false);
  assert.ok(events2.some((e) => e.type === "DEATH"));
});

// 7. Boss mechanics — shield phase / enrage phase / elemental shift
const sealedTitan = {
  name: "Sealed Titan Protocol",
  phases: [
    { hp_above: 60, behavior: "normal" },
    { hp_between: [30, 60], behavior: "shielded", shield_pct: 25 },
    { hp_below: 30, behavior: "enraged", atk_mult: 1.6, spd_mult: 1.3 },
  ],
};
const abyssalWarden = {
  name: "Abyssal Warden Protocol",
  phases: [
    { hp_above: 70, behavior: "normal" },
    { hp_between: [35, 70], behavior: "elemental_shift", shift_to: "Water" },
    { hp_below: 35, behavior: "enraged", atk_mult: 1.5 },
  ],
};

test("boss shield phase applies a real shield value that absorbs damage", () => {
  const boss = mk({ uid: "boss1", side: "enemy", hp: 500, maxHp: 1000, bossMechanicId: "sealed_titan" });
  const idx = evaluateBossPhase(boss, sealedTitan);
  assert.strictEqual(idx, 1, "50% hp should match the shielded phase");
  const events = [];
  enterBossPhase(boss, sealedTitan.phases[idx], events);
  assert.ok(boss.shield > 0, "shield phase must grant a real shield value");
  assert.strictEqual(boss.shieldPhaseActive, true);
  assert.ok(events.some((e) => e.type === "SHIELD_APPLIED"));
});

test("boss enrage phase permanently boosts atk/spd", () => {
  const boss = mk({ uid: "boss1", side: "enemy", hp: 200, maxHp: 1000, atk: 200, spd: 100, bossMechanicId: "sealed_titan" });
  const idx = evaluateBossPhase(boss, sealedTitan);
  assert.strictEqual(idx, 2);
  const events = [];
  enterBossPhase(boss, sealedTitan.phases[idx], events);
  assert.strictEqual(boss.atk, 320, "atk should be multiplied by atk_mult (1.6)");
  assert.strictEqual(boss.spd, 130, "spd should be multiplied by spd_mult (1.3)");
  assert.strictEqual(boss.enraged, true);
  assert.ok(events.some((e) => e.type === "BOSS_PHASE_CHANGE"));
});

test("boss elemental shift changes the boss's element", () => {
  const boss = mk({ uid: "boss2", side: "enemy", hp: 500, maxHp: 1000, element: "Fire", bossMechanicId: "abyssal_warden" });
  const idx = evaluateBossPhase(boss, abyssalWarden);
  assert.strictEqual(idx, 1);
  const events = [];
  enterBossPhase(boss, abyssalWarden.phases[idx], events);
  assert.strictEqual(boss.element, "Water");
  assert.ok(events.some((e) => e.type === "BOSS_PHASE_CHANGE"));
});

test("checkBossPhaseTransitions only advances when hp% crosses into a new phase, and re-triggers correctly across full arena/campaign array", () => {
  const boss = mk({ uid: "boss3", side: "enemy", hp: 1000, maxHp: 1000, bossMechanicId: "sealed_titan", bossPhaseIndex: -1 });
  const ally = mk({ uid: "a1", side: "ally" });
  const arr = [ally, boss];
  const bossMechanics = { sealed_titan: sealedTitan };
  let events = checkBossPhaseTransitions(arr, bossMechanics);
  assert.strictEqual(events.length, 0, "no phase change at full HP (normal phase has no enter behavior)");
  boss.hp = 500; // drop into shielded band
  events = checkBossPhaseTransitions(arr, bossMechanics);
  assert.ok(boss.shieldPhaseActive);
  assert.strictEqual(boss.bossPhaseIndex, 1);
  boss.hp = 200; // drop into enraged band
  events = checkBossPhaseTransitions(arr, bossMechanics);
  assert.ok(boss.enraged);
  assert.strictEqual(boss.bossPhaseIndex, 2);
});

console.log(`\n${passed} test(s) passed.`);
