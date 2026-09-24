/**
 * Centralized AI-generated icon registry for the game.
 * Maps emoji-based icon keys to high-quality dark-fantasy image URLs.
 * Used by spireConfig, teamSynergy, BattleFighter, and BossHunt.
 */

export const GAME_ICONS = {
  // Elements
  fire:    "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/303cba87f_generated_ffd3ba4c.png",
  water:   "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/b9ace6de6_generated_7f1b0ce8.png",
  earth:   "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/c6422bbce_generated_64e54149.png",
  light:   "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/e4520dc03_generated_4d2b172a.png",
  dark:    "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/c84d8b98e_generated_5ec2441a.png",
  lightning: "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/8609c0cc6_generated_f978fdff.png",
  wind:    "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/e9db4b8d9_generated_151f5878.png",

  // Spire-specific
  castle:  "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/1ada297ce_generated_f05ea280.png",

  // Status effects
  poison:  "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/e97338b58_generated_36080d6c.png",
  bleed:   "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/e0398a6ed_generated_26a87128.png",
  stun:    "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/c0987d7a4_generated_81516eb6.png",
  freeze:  "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/721d952ad_generated_f55a0d11.png",
  swords:  "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/e667451da_generated_193fff57.png",
  shield:  "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/a90b3322a_generated_5d3d87cd.png",
  curse:   "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/182395c03_generated_1a1bada0.png",
  mark:    "🔖",

  // Role / synergy
  dagger:    "🗡️",
  sparkles:  "✨",
  heart:     "💚",
  building:  "🏛️",

  // Misc
  gift:    "🎁",
};

/** Check if an icon value is an image URL (vs a legacy emoji). */
export function isIconUrl(icon) {
  return typeof icon === "string" && icon.startsWith("http");
}
