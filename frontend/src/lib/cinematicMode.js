/**
 * getCinematicMode — centralized cinematic presentation policy.
 *
 * Decides whether a cinematic should play based on battle speed (1/2/3),
 * Auto Battle state, and the cinematic type.
 *
 * Returns: "FULL" | "SHORT" | "MINIMAL" | "DISABLED"
 *
 *   type: "intro" | "attack" | "ultimate" | "turn"
 *
 * Policy:
 *   Manual 1×  → FULL (except normal attacks → DISABLED)
 *   Manual 2×  → SHORT for ultimate/intro, MINIMAL for turn
 *   Manual 3×  → MINIMAL for ultimate/intro, DISABLED for turn
 *   Auto 1×    → SHORT for ultimate/intro, MINIMAL for turn
 *   Auto 2×    → MINIMAL for ultimate, DISABLED for others
 *   Auto 3×    → DISABLED for everything
 */
export function getCinematicMode({ speed, auto, type }) {
  // Normal attacks never get a cinematic overlay
  if (type === "attack") return "DISABLED";

  if (auto) {
    if (speed >= 3) return "DISABLED";
    if (speed === 2) {
      return type === "ultimate" || type === "intro" ? "MINIMAL" : "DISABLED";
    }
    // auto + 1×
    if (type === "ultimate" || type === "intro") return "SHORT";
    return "MINIMAL"; // turn
  }

  // Manual
  if (speed === 3) {
    return type === "ultimate" || type === "intro" ? "MINIMAL" : "DISABLED";
  }
  if (speed === 2) {
    return type === "ultimate" || type === "intro" ? "SHORT" : "MINIMAL";
  }
  // Manual 1×
  return "FULL";
}

/**
 * getCinematicDuration — computes the actual duration in milliseconds.
 *
 * The mode factor compounds with the speed multiplier so that higher
 * speeds AND more aggressive modes both shorten the cinematic.
 *
 * @param {string} mode  — FULL | SHORT | MINIMAL | DISABLED
 * @param {number} baseMs — base duration at 1× manual FULL
 * @param {number} speed  — current battle speed (1/2/3)
 * @returns {number} duration in ms (0 for DISABLED)
 */
export function getCinematicDuration(mode, baseMs, speed) {
  if (mode === "DISABLED") return 0;
  const factor = mode === "FULL" ? 1.0 : mode === "SHORT" ? 0.6 : 0.35;
  return Math.max(60, Math.round((baseMs * factor) / speed));
}
