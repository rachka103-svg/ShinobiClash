// Maps item IDs to their drop location, so cost rows and forge item icons
// can show a popup and link players to the right place.
// `route`  — in-app route to navigate to
// `source` — short label for the drop location
// `detail` — longer description of how/where the item drops
export const ITEM_SOURCES = {
  // Evolution materials
  evo_essence:        { route: "/campaign",  source: "Campaign", detail: "Drops from all Campaign stage clears. Higher chapters yield more." },

  // Ascension materials
  ascension_crystal:   { route: "/dungeons",  source: "EXP Temple", detail: "Drops from EXP Temple dungeon tiers. Also available in the Shop for Gems." },

  // Boss / Nightmare materials
  boss_core:           { route: "/boss-hunt", source: "Boss Hunt", detail: "Ripped from defeated Boss Hunt bosses. Required for Transformation to GR." },
  lunar_essence:       { route: "/tsukuyomi", source: "Tsukuyomi", detail: "A rare prize torn from Nightmare bosses in the Tsukuyomi Infinite Nightmare." },

  // Elemental essences (future ascension materials)
  fire_essence:        { route: "/dungeons",  source: "Dungeons", detail: "Condensed flame. A future ascension material for Fire heroes. Found in Dungeons." },
  water_essence:       { route: "/dungeons",  source: "Dungeons", detail: "Condensed tide. A future ascension material for Water heroes. Found in Dungeons." },
  earth_essence:       { route: "/dungeons",  source: "Dungeons", detail: "Condensed stone. A future ascension material for Earth heroes. Found in Dungeons." },
  wind_essence:        { route: "/dungeons",  source: "Dungeons", detail: "Condensed gale. A future ascension material for Wind heroes. Found in Dungeons." },
  lightning_essence:   { route: "/dungeons",  source: "Dungeons", detail: "Condensed storm. A future ascension material for Lightning heroes. Found in Dungeons." },
  light_essence:       { route: "/dungeons",  source: "Dungeons", detail: "Condensed radiance. A future ascension material for Light heroes. Found in Dungeons." },
  dark_essence:        { route: "/dungeons",  source: "Dungeons", detail: "Condensed shadow. A future ascension material for Dark heroes. Found in Dungeons." },

  // EXP tomes + spirit dust (EXP Temple dungeon)
  exp_tome_minor:      { route: "/dungeons",  source: "EXP Temple", detail: "Drops from EXP Temple dungeon Tiers 1–2." },
  exp_tome_greater:    { route: "/dungeons",  source: "EXP Temple", detail: "Drops from EXP Temple dungeon Tiers 2–5." },
  exp_tome_ancient:    { route: "/dungeons",  source: "EXP Temple", detail: "Drops from EXP Temple dungeon Tiers 4–5." },
  spirit_dust:         { route: "/dungeons",  source: "EXP Temple", detail: "Drops from EXP Temple dungeon Tiers 3–5." },

  // Other dungeon materials
  scrap_iron:          { route: "/dungeons",  source: "Gold Vault", detail: "Drops from Gold Vault dungeon Tier 2+." },

  // Forge materials (chapter-gated campaign drops)
  copper_ore:          { route: "/campaign",  source: "Campaign Ch.1+", detail: "Common forge material. Drops from Campaign stages starting at Chapter 1." },
  tin_shard:           { route: "/campaign",  source: "Campaign Ch.3+", detail: "Uncommon forge material. Drops from Campaign stages starting at Chapter 3." },
  iron_ingot:          { route: "/campaign",  source: "Campaign Ch.6+", detail: "Sturdy metal for mid-tier recipes. Drops from Campaign stages starting at Chapter 6." },
  mithril_shard:       { route: "/campaign",  source: "Campaign Ch.10+", detail: "Rare forge material. Drops from Campaign stages starting at Chapter 10." },
  adamantite_chunk:    { route: "/campaign",  source: "Campaign Ch.15+", detail: "Hardened alloy for high-tier recipes. Drops from Campaign stages starting at Chapter 15." },
  runic_crystal:       { route: "/campaign",  source: "Campaign Ch.20+", detail: "Crystallised magic. Drops from Campaign stages starting at Chapter 20." },
  orichalcum_ingot:    { route: "/campaign",  source: "Campaign Ch.30+", detail: "Legendary metal. Drops from Campaign stages starting at Chapter 30." },
  dragon_scale:        { route: "/campaign",  source: "Campaign Ch.40+", detail: "Scale of a fallen wyrm. Drops from Campaign stages starting at Chapter 40." },
  void_essence:        { route: "/campaign",  source: "Campaign Ch.50+", detail: "Condensed nothingness. Drops from Campaign stages starting at Chapter 50." },
  primordial_core:     { route: "/campaign",  source: "Campaign Ch.70+", detail: "The forge's ultimate fuel. Drops from Campaign stages starting at Chapter 70." },

  // Boss-specific forge materials
  titan_core:          { route: "/campaign",  source: "Campaign (Boss)", detail: "Rare drop from Sealed Titan boss stages in Campaign." },
  warden_scale:        { route: "/campaign",  source: "Campaign (Boss)", detail: "Rare drop from Abyssal Warden boss stages in Campaign." },

  // Summon tickets (campaign first-clear + shop)
  summon_ticket:       { route: "/campaign",  source: "Campaign", detail: "Earned from Campaign stage first-clears. Also sold in the Shop." },
};

export function getItemSource(itemId) {
  return ITEM_SOURCES[itemId] || null;
}
