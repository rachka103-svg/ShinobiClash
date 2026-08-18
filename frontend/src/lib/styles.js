// Re-exports the shared design tokens from theme.js so every existing import
// of `RARITY`/`ELEMENT` from "@/lib/styles" keeps working unchanged.
// New code should prefer importing directly from "@/lib/theme".
export { RARITY, ELEMENT } from "@/lib/theme";

export const portraitUrl = (id) => `/ninjas/${id}.png`;

// Lucide icon name per inventory item (resolved in components).
export const ITEM_ICON = {
  exp_tome_minor: "ScrollText",
  exp_tome_greater: "ScrollText",
  exp_tome_ancient: "BookOpen",
  ascension_crystal: "Gem",
  summon_ticket: "Ticket",
};
