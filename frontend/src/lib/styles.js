export const RARITY = {
  R: { label: "R", color: "#9E9E9E", name: "Common" },
  SR: { label: "SR", color: "#29B6F6", name: "Rare" },
  SSR: { label: "SSR", color: "#AB47BC", name: "Epic" },
  UR: { label: "UR", color: "#FFCA28", name: "Legendary" },
  LR: { label: "LR", color: "#FF2D78", name: "Mythic" },
};

export const ELEMENT = {
  Fire: { color: "#FF5722", icon: "flame" },
  Water: { color: "#29B6F6", icon: "droplet" },
  Wind: { color: "#00E676", icon: "wind" },
  Earth: { color: "#A1887F", icon: "mountain" },
  Lightning: { color: "#FFCA28", icon: "zap" },
  Dark: { color: "#7C4DFF", icon: "moon" },
  Light: { color: "#FFD54F", icon: "sun" },
};

export const portraitUrl = (id) => `/ninjas/${id}.png`;

// Lucide icon name per inventory item (resolved in components).
export const ITEM_ICON = {
  exp_tome_minor: "ScrollText",
  exp_tome_greater: "ScrollText",
  exp_tome_ancient: "BookOpen",
  ascension_crystal: "Gem",
  summon_ticket: "Ticket",
};
