/**
 * Frontend mirror of backend/combat_modifiers.py.
 *
 * Centralized damage-type / resistance / immunity / damage-reduction /
 * life-steal / shield framework. Applied during battle resolution in
 * battle.js. Consumed by ALL PvE modes — never mode-specific.
 */

// Damage type classification
const PHYSICAL_ROLES = new Set(["Attacker", "Assassin", "Bruiser", "Tank"]);
const MAGIC_ROLES = new Set(["Mage", "Healer", "Support", "Control"]);

const AILMENT_TYPES = new Set(["burn", "poison", "bleed", "curse_dot", "shock"]);
const CC_TYPES = new Set(["stun", "freeze"]);
const DEBUFF_TYPES = new Set([
  "burn", "poison", "bleed", "stun", "freeze",
  "atk_down", "def_down", "shock", "curse_dot",
]);

/**
 * Classify a jutsu's damage as 'physical', 'magic', or 'ailment'.
 * Ailment damage (DoT ticks) bypasses physical/magic immunity entirely.
 */
export function classifyDamageType(jutsu, actor) {
  if (jutsu?._is_dot_tick) return "ailment";
  if (jutsu?.damage_type) return jutsu.damage_type;
  const role = actor?.role || "Attacker";
  return PHYSICAL_ROLES.has(role) ? "physical" : "magic";
}

/**
 * Get combat modifiers from a combatant, with defaults.
 */
export function getCombatModifiers(combatant) {
  return combatant?.combat_modifiers || combatant?.combatModifiers || {};
}

/**
 * Compute the final damage after all resistance/immunity/reduction mods.
 *
 * Returns { damage, immune, resisted, reductionPct, notes }
 */
export function computeDamageModifier(baseDamage, damageType, targetMods, jutsuElement) {
  const notes = [];
  let reduction = 0;
  let immune = false;

  // --- Immunity checks ---
  if (damageType === "physical" && targetMods.physical_immunity) {
    return { damage: 0, immune: true, resisted: false, reductionPct: 1, notes: ["IMMUNE"] };
  }
  if (damageType === "magic" && targetMods.magic_immunity) {
    return { damage: 0, immune: true, resisted: false, reductionPct: 1, notes: ["IMMUNE"] };
  }

  // --- Type-specific resistance ---
  if (damageType === "physical") {
    const physRes = targetMods.physical_resistance || 0;
    const physDr = targetMods.physical_damage_reduction || 0;
    reduction += physRes + physDr;
    if (physRes > 0) notes.push(`PHYS RESIST ${Math.round(physRes * 100)}%`);
  } else if (damageType === "magic") {
    const magicRes = targetMods.magic_resistance || 0;
    const magicDr = targetMods.magic_damage_reduction || 0;
    reduction += magicRes + magicDr;
    if (magicRes > 0) notes.push(`MAGIC RESIST ${Math.round(magicRes * 100)}%`);
  }

  // --- Elemental resistance / vulnerability ---
  if (jutsuElement && damageType !== "ailment") {
    const elemRes = (targetMods.elemental_resistance || {})[jutsuElement] || 0;
    const elemVuln = (targetMods.elemental_vulnerability || {})[jutsuElement] || 0;
    reduction += elemRes;
    reduction -= elemVuln;
    if (elemRes > 0) notes.push(`${jutsuElement.toUpperCase()} RESIST`);
    if (elemVuln > 0) notes.push(`${jutsuElement.toUpperCase()} VULN`);
  }

  // --- Flat damage reduction (all damage types) ---
  const flatDr = targetMods.damage_reduction || 0;
  reduction += flatDr;
  if (flatDr > 0) notes.push(`DMG REDUCTION ${Math.round(flatDr * 100)}%`);

  // --- Shielded bonus reduction ---
  if (targetMods._shielded_reduction) {
    reduction += targetMods._shielded_reduction;
  }

  // --- Ailment-specific resistance/amplification ---
  // Read both `ailment_amplification` (increases ailment damage taken)
  // and `ailment_vulnerability` (same effect, alternate naming used by
  // the dual_immune archetype and Boss Hunt configs).
  if (damageType === "ailment") {
    const ailmentType = targetMods._current_ailment_type || "";
    if (ailmentType) {
      const ailRes = (targetMods.ailment_resistance || {})[ailmentType] || 0;
      const ailAmp = (targetMods.ailment_amplification || {})[ailmentType] || 0;
      const ailVuln = (targetMods.ailment_vulnerability || {})[ailmentType] || 0;
      const totalAmp = ailAmp + ailVuln;
      reduction += ailRes;
      reduction -= totalAmp;
      if (ailRes > 0) notes.push(`${ailmentType.toUpperCase()} RESIST`);
      if (totalAmp > 0) notes.push(`${ailmentType.toUpperCase()} VULN`);
    }
  }

  // --- Cap at 90% to prevent impossible encounters ---
  reduction = Math.max(0, Math.min(0.90, reduction));

  const finalDamage = baseDamage * (1 - reduction);
  const resisted = reduction > 0 && !immune;

  return {
    damage: Math.max(0, finalDamage),
    immune,
    resisted,
    reductionPct: reduction,
    notes,
  };
}

/**
 * Compute HP recovered from life steal.
 * DoT damage does NOT trigger life steal (prevents infinite healing loops).
 */
export function computeLifesteal(damageDealt, attackerMods, isDot = false) {
  if (isDot) return 0;
  const pct = attackerMods.lifesteal_pct || 0;
  if (pct <= 0) return 0;
  return Math.max(0, Math.round(damageDealt * pct / 100));
}

/**
 * Returns true if the target resists a debuff/status application.
 */
export function resistDebuff(effectType, targetMods) {
  // Status immunity
  const statusImmunity = targetMods.status_immunity || [];
  if (statusImmunity.includes(effectType)) return true;

  // CC resistance
  if (CC_TYPES.has(effectType)) {
    const ccRes = targetMods.cc_resistance || 0;
    if (ccRes > 0 && Math.random() < ccRes) return true;
  }

  // Status-specific resistance
  const statusRes = targetMods.status_resistance || {};
  if (effectType in statusRes) {
    if (Math.random() < statusRes[effectType]) return true;
  }

  // General debuff resistance
  if (DEBUFF_TYPES.has(effectType)) {
    const debuffRes = targetMods.debuff_resistance || 0;
    if (debuffRes > 0 && Math.random() < debuffRes) return true;
  }

  return false;
}

/**
 * Apply crit resistance to incoming crit chance/multiplier.
 * Returns [adjustedChance, adjustedMultiplier].
 */
export function applyCritResistance(critChance, critMultiplier, targetMods) {
  const critRes = targetMods.crit_resistance || 0;
  const critDr = targetMods.crit_damage_reduction || 0;
  return [
    Math.max(0, critChance - critRes),
    Math.max(1.0, critMultiplier * (1 - critDr)),
  ];
}

/**
 * Convert raw combat modifiers into a UI-friendly summary.
 */
export function combatModifiersSummary(mods) {
  if (!mods) return { traits: [], immunities: [], resistances: [], vulnerabilities: [], strategyHint: "" };

  const traits = [];
  const immunities = [];
  const resistances = [];
  const vulnerabilities = [];
  const strategyParts = [];

  if (mods.physical_immunity) {
    immunities.push("Physical Immunity");
    strategyParts.push("Use magic or ailments");
  }
  if (mods.magic_immunity) {
    immunities.push("Magic Immunity");
    strategyParts.push("Use physical or ailments");
  }
  if (mods.physical_immunity && mods.magic_immunity) {
    strategyParts.length = 0;
    strategyParts.push("Use Burn / Poison / Bleed ailments");
  }

  if ((mods.damage_reduction || 0) > 0) traits.push(`Damage Reduction ${Math.round(mods.damage_reduction * 100)}%`);
  if ((mods.physical_resistance || 0) > 0) resistances.push(`Physical Resistance ${Math.round(mods.physical_resistance * 100)}%`);
  if ((mods.magic_resistance || 0) > 0) resistances.push(`Magic Resistance ${Math.round(mods.magic_resistance * 100)}%`);

  for (const [elem, val] of Object.entries(mods.elemental_resistance || {})) {
    if (val > 0) resistances.push(`${elem} Resistance`);
  }
  for (const [elem, val] of Object.entries(mods.elemental_vulnerability || {})) {
    if (val > 0) vulnerabilities.push(`${elem} Vulnerability`);
  }

  if ((mods.lifesteal_pct || 0) > 0) {
    traits.push(`Life Steal ${mods.lifesteal_pct}%`);
    strategyParts.push("Bring anti-heal");
  }
  if ((mods.regen_pct || 0) > 0) {
    traits.push(`Regeneration ${mods.regen_pct}%/turn`);
    strategyParts.push("Bring anti-heal or burst");
  }
  if ((mods.shield_pct || 0) > 0) {
    traits.push(`Shield ${mods.shield_pct}% Max HP`);
    strategyParts.push("Bring sustained DPS");
  }
  if ((mods.shield_regen_turns || 0) > 0) traits.push(`Shield Regen every ${mods.shield_regen_turns} turns`);
  if ((mods.cc_resistance || 0) > 0) {
    traits.push(`CC Resistance ${Math.round(mods.cc_resistance * 100)}%`);
    strategyParts.push("Don't rely on CC");
  }
  if ((mods.debuff_resistance || 0) > 0) traits.push(`Debuff Resistance ${Math.round(mods.debuff_resistance * 100)}%`);
  if ((mods.damage_amplification || 0) > 0) traits.push(`Damage Amplification ${Math.round(mods.damage_amplification * 100)}%`);

  for (const status of (mods.status_immunity || [])) {
    immunities.push(`${status.charAt(0).toUpperCase() + status.slice(1)} Immunity`);
  }

  for (const [ail, val] of Object.entries(mods.ailment_amplification || {})) {
    if (val > 0) vulnerabilities.push(`${ail.charAt(0).toUpperCase() + ail.slice(1)} Amplification`);
  }
  for (const [ail, val] of Object.entries(mods.ailment_vulnerability || {})) {
    if (val > 0) vulnerabilities.push(`${ail.charAt(0).toUpperCase() + ail.slice(1)} Vulnerability`);
  }
  for (const [ail, val] of Object.entries(mods.ailment_resistance || {})) {
    if (val > 0) resistances.push(`${ail.charAt(0).toUpperCase() + ail.slice(1)} Resistance`);
  }

  if ((mods.crit_resistance || 0) > 0) traits.push(`Crit Resistance ${Math.round(mods.crit_resistance * 100)}%`);
  if ((mods.anti_heal || 0) > 0) traits.push(`Anti-Heal ${Math.round(mods.anti_heal * 100)}%`);

  const strategyHint = [...new Set(strategyParts)].join(" · ");

  return { traits, immunities, resistances, vulnerabilities, strategyHint };
}
