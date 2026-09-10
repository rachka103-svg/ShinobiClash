// Maps item IDs to the route where they can be obtained, so cost rows
// in the HeroDetailModal and Forge can link players to the right place.
export const ITEM_SOURCES = {
  // Evolution materials
  evo_essence:        { route: "/campaign",  label: "Campaign" },

  // Ascension materials
  ascension_crystal:   { route: "/dungeons",  label: "EXP Temple" },

  // Boss / Nightmare materials
  boss_core:           { route: "/boss-hunt", label: "Boss Hunt" },
  lunar_essence:       { route: "/tsukuyomi", label: "Tsukuyomi" },

  // Elemental essences (future ascension materials)
  fire_essence:        { route: "/dungeons",  label: "Dungeons" },
  water_essence:       { route: "/dungeons",  label: "Dungeons" },
  earth_essence:       { route: "/dungeons",  label: "Dungeons" },
  wind_essence:        { route: "/dungeons",  label: "Dungeons" },
  lightning_essence:   { route: "/dungeons",  label: "Dungeons" },
  light_essence:       { route: "/dungeons",  label: "Dungeons" },
  dark_essence:        { route: "/dungeons",  label: "Dungeons" },

  // EXP tomes + spirit dust (EXP Temple dungeon)
  exp_tome_minor:      { route: "/dungeons",  label: "EXP Temple" },
  exp_tome_greater:    { route: "/dungeons",  label: "EXP Temple" },
  exp_tome_ancient:    { route: "/dungeons",  label: "EXP Temple" },
  spirit_dust:         { route: "/dungeons",  label: "EXP Temple" },

  // Other dungeon materials
  scrap_iron:          { route: "/dungeons",  label: "Gold Vault" },

  // Forge materials (chapter-gated campaign drops)
  copper_ore:          { route: "/campaign",  label: "Campaign" },
  tin_shard:           { route: "/campaign",  label: "Campaign" },
  iron_ingot:          { route: "/campaign",  label: "Campaign" },
  mithril_shard:       { route: "/campaign",  label: "Campaign" },
  adamantite_chunk:    { route: "/campaign",  label: "Campaign" },
  runic_crystal:       { route: "/campaign",  label: "Campaign" },
  orichalcum_ingot:    { route: "/campaign",  label: "Campaign" },
  dragon_scale:        { route: "/campaign",  label: "Campaign" },
  void_essence:        { route: "/campaign",  label: "Campaign" },
  primordial_core:     { route: "/campaign",  label: "Campaign" },

  // Boss-specific forge materials
  titan_core:          { route: "/campaign",  label: "Campaign (Boss)" },
  warden_scale:        { route: "/campaign",  label: "Campaign (Boss)" },

  // Summon tickets (campaign first-clear + shop)
  summon_ticket:       { route: "/campaign",  label: "Campaign" },
};

export function getItemSource(itemId) {
  return ITEM_SOURCES[itemId] || null;
}
