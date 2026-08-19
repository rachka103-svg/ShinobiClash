{
  "project": {
    "name": "Shinobi Clash",
    "scope": "Extend existing dark cinematic mobile-first gacha RPG UI for Bulk Train/Evolve, Gear/Forge, Summon Ceremony redesign, Resource Dungeons hub, Crafting + Material Fusion.",
    "non_negotiables": [
      "Keep existing design tokens/palette/utilities (base #05050A, panel #0B0B14, chakra cyan #00E5FF, fox orange #FF5722, jutsu magenta #D500F9, amber for gold/rare).",
      "Mobile-first. NO page-level horizontal scrolling ever (use min-w-0 on flex children; avoid negative margins that widen layout).",
      "Performance: animate transform/opacity only; no continuous background animation.",
      "Use shadcn/ui components from /app/frontend/src/components/ui (JS files).",
      "Use framer-motion + lucide-react only (no new heavy libs).",
      "All interactive + key informational elements MUST include data-testid (kebab-case, role-based).",
      "Summon reveal must be skippable (tap-to-skip / skip button) and not annoying on x10."
    ]
  },

  "brand_attributes": {
    "tone": ["cinematic", "premium", "grindy-long-term", "high-contrast", "alive-with-glow"],
    "visual_metaphors": [
      "obsidian panels + runic neon edges",
      "chakra energy (cyan) for primary actions",
      "foxfire (orange) for currency/heat/crit moments",
      "jutsu magenta for mythic/arcane emphasis"
    ],
    "do_not_change": [
      "Existing rarity tier colors + aura utilities (.aura-2/.aura-3/.aura-4, .rarity-pulse, .shine-sweep)",
      "Existing fonts: Outfit (body/UI), Bebas Neue (display via .font-display)"
    ]
  },

  "design_tokens": {
    "css_custom_properties": {
      "note": "These extend existing :root tokens in /app/frontend/src/index.css; do not replace existing values. Prefer Tailwind + existing CSS utilities; add only if needed.",
      "additions": {
        "--gold": "#FFC857",
        "--panel-2": "rgba(11, 11, 20, 0.78)",
        "--stroke-soft": "rgba(255,255,255,0.08)",
        "--stroke-hard": "rgba(255,255,255,0.14)",
        "--shadow-deep": "0 18px 60px rgba(0,0,0,0.55)",
        "--shadow-glow-cyan": "0 0 0 1px rgba(0,229,255,0.18), 0 0 28px rgba(0,229,255,0.22)",
        "--shadow-glow-orange": "0 0 0 1px rgba(255,87,34,0.18), 0 0 28px rgba(255,87,34,0.22)",
        "--shadow-glow-magenta": "0 0 0 1px rgba(213,0,249,0.18), 0 0 28px rgba(213,0,249,0.22)",
        "--radius-card": "14px",
        "--radius-chip": "9999px"
      }
    },

    "semantic_color_system": {
      "background": "#05050A",
      "surface": "#0B0B14",
      "surfaceElevated": "linear-gradient(160deg, rgba(20, 22, 38, 0.9), rgba(8, 8, 16, 0.95)) (existing .panel)",
      "textPrimary": "#FFFFFF",
      "textSecondary": "rgba(255,255,255,0.72)",
      "textMuted": "rgba(255,255,255,0.55)",
      "stroke": "rgba(255,255,255,0.07)",
      "focusRing": "chakra cyan (#00E5FF)",
      "state": {
        "success": "chakra cyan (use for confirmations in this theme)",
        "warning": "amber/gold (#FFC857)",
        "danger": "destructive token (hsl(var(--destructive)))"
      },
      "accents": {
        "primary": "chakra cyan (#00E5FF)",
        "secondary": "fox orange (#FF5722)",
        "mythic": "jutsu magenta (#D500F9)",
        "gold": "amber (#FFC857)"
      }
    },

    "shadows_and_glow": {
      "rule": "Glow is a frame, not a flood. Keep spread modest so adjacent cards never visually merge (matches existing comment in index.css).",
      "presets": {
        "card": "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
        "glowCyan": "shadow-[0_0_0_1px_rgba(0,229,255,0.18),0_0_28px_rgba(0,229,255,0.22)]",
        "glowOrange": "shadow-[0_0_0_1px_rgba(255,87,34,0.18),0_0_28px_rgba(255,87,34,0.22)]",
        "glowMagenta": "shadow-[0_0_0_1px_rgba(213,0,249,0.18),0_0_28px_rgba(213,0,249,0.22)]"
      }
    },

    "radius": {
      "global": "--radius (0.4rem) for shadcn primitives",
      "cards": "14px (cinematic panels)",
      "chips": "9999px",
      "buttons": "10–12px for primary CTAs (premium/action-first)"
    },

    "spacing": {
      "principle": "Use 2–3x more spacing than feels comfortable; mobile-first readability.",
      "layout": {
        "pagePadding": "px-4",
        "sectionGap": "space-y-4 (mobile), space-y-6 (sm+)"
      },
      "cards": {
        "cardPadding": "p-4",
        "denseRowGap": "gap-2",
        "gridGap": "gap-3"
      }
    }
  },

  "typography": {
    "fonts": {
      "display": {
        "family": "Bebas Neue",
        "usage": "Hero names, banner titles, rarity callouts, big numbers (pity, gear score).",
        "class": "font-display"
      },
      "body": {
        "family": "Outfit",
        "usage": "All UI labels, stats, descriptions."
      }
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display tracking-wide",
      "h2": "text-base md:text-lg text-white/80",
      "sectionTitle": "text-lg font-semibold",
      "cardTitle": "text-sm font-semibold",
      "body": "text-sm text-white/80 leading-relaxed",
      "micro": "text-xs text-white/60"
    },
    "numbers": {
      "rule": "Use tabular numbers for stats/counters where possible.",
      "tailwind": "tabular-nums"
    }
  },

  "layout_and_grid": {
    "global_rules": [
      "Never allow page-level horizontal overflow. Any horizontal scroller must be a bounded element with overflow-x-auto and w-full.",
      "In flex rows, always add min-w-0 to children that contain text to prevent overflow.",
      "Prefer single-column mobile layout; introduce 2-column only at sm/md for dense inventory screens."
    ],
    "page_shell": {
      "structure": "TopBar (existing) + scrollable content area",
      "content_container": "max-w-[520px] mx-auto w-full px-4 (only if existing app already uses centered max width; otherwise keep full width but preserve px-4)",
      "section_pattern": "Title row (left) + small action (right) + panel card"
    },
    "bento_patterns": {
      "hero_modal_header": "Full-width portrait header (AspectRatio) with gradient vignette overlay; stats strip below; then 3-card row for EXP tomes.",
      "inventory": "Sticky filter row + ScrollArea list; detail drawer/sheet for item actions.",
      "dungeons_hub": "3 large dungeon cards stacked; each expands into difficulty selector + drop preview."
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_these": {
        "tabs": "tabs.jsx",
        "dialog": "dialog.jsx",
        "drawer": "drawer.jsx (mobile-first detail panels)",
        "sheet": "sheet.jsx (full-height forge panels)",
        "card": "card.jsx",
        "button": "button.jsx",
        "badge": "badge.jsx",
        "progress": "progress.jsx",
        "carousel": "carousel.jsx (banner previews)",
        "scrollArea": "scroll-area.jsx",
        "select": "select.jsx",
        "slider": "slider.jsx (bulk enhancement amount)",
        "tooltip": "tooltip.jsx",
        "popover": "popover.jsx",
        "alertDialog": "alert-dialog.jsx (confirm spend)",
        "table": "table.jsx (rates panel)",
        "sonner": "sonner.jsx (toasts)"
      }
    },

    "button_system": {
      "variants": {
        "primary": {
          "look": "chakra cyan glow, solid fill",
          "tailwind": "bg-[var(--chakra)] text-[var(--base)] hover:bg-[#00E5FF]/90 focus-visible:ring-2 focus-visible:ring-[var(--chakra)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)]",
          "motion": "hover: translateY(-1px) + subtle glow increase (transform/opacity only)"
        },
        "secondary": {
          "look": "panel button with border + subtle shine sweep",
          "tailwind": "bg-white/5 border border-white/10 text-white hover:bg-white/8",
          "note": "Use .shine-sweep on large CTAs only (>= 140px wide)."
        },
        "danger": {
          "look": "destructive token",
          "tailwind": "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        },
        "ghost": {
          "look": "text + icon, no fill",
          "tailwind": "bg-transparent hover:bg-white/5"
        }
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-11 px-4 text-sm",
        "lg": "h-12 px-5 text-base"
      },
      "interaction_rules": [
        "No transition:all. Use transition-colors for hover, and separate motion via framer-motion for transforms.",
        "Always include data-testid on buttons (e.g., summon-x10-button, gear-enhance-confirm-button)."
      ]
    },

    "rarity_badges": {
      "rule": "Rarity color + aura utilities already exist; apply them consistently across hero cards, gear cards, summon reveals.",
      "badge_pattern": "<Badge className=\"text-xs px-2 py-0.5 rounded-full border border-white/10 bg-white/5\">SSR</Badge>",
      "aura_usage": {
        "SSR_UR_LR": "Use .aura-2/.aura-3/.aura-4 on the card container with CSS var --glow set to tier color.",
        "MYTHIC": "Use .rarity-pulse + stronger drop-shadow on reveal stage only; avoid infinite pulse in inventory lists."
      }
    }
  },

  "page_guidelines": {
    "summon_ceremony": {
      "layout": {
        "top": "Banner carousel (shadcn carousel) with 1.2 peek; below it: banner title + featured units row (mini cards) + rates button.",
        "mid": "Pity counter module (MYTHIC) with soft/hard thresholds + 50/50 status chip.",
        "bottom": "Sticky CTA bar: x1 and x10 buttons + currency display."
      },
      "rates_panel": {
        "component": "Dialog + Table",
        "content": [
          "Transparent disclosure: base rates per rarity tier",
          "Pity explanation: soft pity 100–149, hard pity 150",
          "50/50 featured guarantee rules",
          "Tap targets >= 44px"
        ],
        "data_testids": {
          "open": "summon-rates-open-button",
          "dialog": "summon-rates-dialog",
          "close": "summon-rates-close-button"
        }
      },
      "reveal_animation": {
        "principles": [
          "Transform/opacity only (scale, rotateY for flip via framer-motion; avoid heavy filters).",
          "Tiered flourish: bigger for higher rarity; MYTHIC gets epic burst once, then settles.",
          "x10 should be paced: quick intro (0.4–0.6s), then per-card flips staggered 60–90ms.",
          "Skippable: tap anywhere to fast-forward to final state; show a Skip button after 0.6s."
        ],
        "stages": {
          "stage0": "Ceremony intro: dark vignette + subtle cyan rune ring (static image/CSS radial) fades in.",
          "stage1": "Orb/scroll appears (simple circle/rect) scales from 0.9->1 with glow.",
          "stage2": "Burst: rarity color flash overlay (opacity only) + sound hook (if exists).",
          "stage3": "Cards grid: 2x5 on mobile; each card flips to reveal rarity + unit.",
          "stage4": "Summary: show pulls results with quick actions (lock/favorite, go to roster)."
        },
        "implementation_scaffold_js": {
          "note": "Pseudo-structure for main agent; keep in .js (not .tsx).",
          "snippet": "// RevealOverlay.js\nimport { motion, AnimatePresence } from 'framer-motion';\n\nexport default function RevealOverlay({ open, results, onClose, onSkip }) {\n  // stage: 'intro' | 'burst' | 'grid' | 'done'\n  // allow tap-to-skip\n  return (\n    <AnimatePresence>\n      {open ? (\n        <motion.div\n          className=\"fixed inset-0 z-50 bg-black/80\"\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          onClick={onSkip}\n          data-testid=\"summon-reveal-overlay\"\n        >\n          {/* stage content */}\n        </motion.div>\n      ) : null}\n    </AnimatePresence>\n  );\n}\n"
        }
      },
      "micro_interactions": [
        "Banner carousel swipe: add subtle snap + scale on active banner.",
        "Rates button hover/press: glow-cyan intensifies; press scale 0.98.",
        "Pity counter: when incrementing, animate number pop (scale 1.08 -> 1)."
      ]
    },

    "hero_detail_modal_extensions": {
      "container": "Dialog or Drawer depending on existing pattern; keep cinematic portrait header.",
      "tabs": {
        "component": "Tabs",
        "tabs": ["Train", "Evolve", "Gear"],
        "data_testids": {
          "tabs": "hero-detail-tabs",
          "train": "hero-train-tab",
          "evolve": "hero-evolve-tab",
          "gear": "hero-gear-tab"
        }
      },
      "train_bulk_exp": {
        "layout": "Match reference: 3-card row of EXP tomes with +xp and owned count; add bulk slider + quick max button.",
        "components": ["Card", "Slider", "Button", "Progress"],
        "interaction": [
          "Tome card tap increments selected count; long-press opens quick input (optional).",
          "Show projected level + stat deltas before confirm.",
          "Confirm spend via AlertDialog."
        ],
        "data_testids": {
          "tome_card": "hero-train-tome-card",
          "slider": "hero-train-amount-slider",
          "confirm": "hero-train-confirm-button"
        }
      },
      "evolve_star_breakthrough": {
        "layout": "Left: current stars; Right: next stars preview; below: required shards + rare mats with counts.",
        "components": ["Card", "Badge", "Progress", "AlertDialog"],
        "rules": [
          "Stars raised ONLY via evolution consuming duplicate shards early and rare evolution materials for high stars.",
          "Show locked state if insufficient mats; keep CTA disabled with tooltip explaining missing items."
        ],
        "data_testids": {
          "evolve-panel": "hero-evolve-panel",
          "evolve-button": "hero-evolve-confirm-button"
        }
      },
      "gear_tab": {
        "layout": "4 equip slots grid (2x2): Weapon/Armor/Accessory/Relic; each slot shows icon, rarity border, gear score.",
        "components": ["Card", "Sheet", "ScrollArea", "Select"],
        "interaction": [
          "Tap slot opens Sheet with gear inventory filtered to that slot.",
          "Equip action shows toast (sonner).",
          "Enhance shortcut button on equipped gear card."
        ],
        "data_testids": {
          "slot": "hero-gear-slot",
          "open-inventory": "hero-gear-open-inventory-button",
          "equip": "hero-gear-equip-button"
        }
      }
    },

    "gear_inventory_and_forge": {
      "information_architecture": [
        "Gear Inventory (list/grid + filters)",
        "Gear Detail (stats, set bonuses, enhance +1..+15)",
        "Crafting (blueprints + materials)",
        "Material Fusion (merge low-tier mats into higher tier)"
      ],
      "inventory_layout": {
        "top_filters": "Sticky row: Slot Select + Rarity Select + Set Select + Sort",
        "list": "ScrollArea with compact gear cards; each card shows name, rarity, gear score, 2–3 key stats.",
        "detail": "Open in Drawer/Sheet; keep actions at bottom (Enhance, Equip, Lock)."
      },
      "gear_card_pattern": {
        "container": "Card with .panel styling + rarity border",
        "must_show": ["gear score", "rarity", "slot", "set (if any)", "enhance level +X"],
        "avoid": "Too many stats in list view; keep dense stats in detail view."
      },
      "enhancement_ui": {
        "progress": "Progress component for +1..+15 track; show breakpoints at +5/+10/+15 with subtle ticks.",
        "bulk": "Hold-to-enhance is optional; otherwise provide Enhance x1 and Enhance to +N (if mats allow).",
        "confirm": "AlertDialog for large spends."
      },
      "crafting_ui": {
        "blueprints": "Card list of blueprints with preview + required mats; disabled state if missing.",
        "materials": "Material chips with counts; tap opens fusion sheet.",
        "data_testids": {
          "craft-button": "gear-craft-button",
          "fusion-open": "material-fusion-open-button"
        }
      }
    },

    "resource_dungeons_hub": {
      "cards": [
        {
          "name": "Gold Vault",
          "accent": "amber/gold",
          "icon": "lucide: Coins",
          "drops": "Gold + occasional rare mats"
        },
        {
          "name": "EXP Temple",
          "accent": "chakra cyan",
          "icon": "lucide: Sparkles",
          "drops": "EXP tomes"
        },
        {
          "name": "Gear Foundry",
          "accent": "fox orange",
          "icon": "lucide: Anvil",
          "drops": "Gear + crafting mats"
        }
      ],
      "interaction": [
        "Each dungeon card expands (Collapsible) to show difficulty tiers (ToggleGroup) + drop preview row.",
        "Energy cost displayed as a chip; Start button pinned at bottom of expanded card.",
        "Difficulty selection animates underline/indicator (opacity/transform only)."
      ],
      "data_testids": {
        "dungeon-card": "dungeon-card",
        "difficulty-toggle": "dungeon-difficulty-toggle",
        "start": "dungeon-start-button"
      }
    }
  },

  "motion_and_microinteractions": {
    "rules": [
      "No universal transitions (no transition-all).",
      "Prefer framer-motion for transforms; Tailwind transition-colors for color changes.",
      "Entrance animations: fade-up (existing .fade-up) for panels; stagger children 40–80ms.",
      "Press feedback: scale 0.98 on buttons/cards; release back to 1."
    ],
    "recommended_durations": {
      "tap": "90–140ms",
      "panel_enter": "220–320ms",
      "reveal_intro": "400–600ms",
      "card_flip": "260–340ms"
    },
    "skip_behavior": {
      "summon": "Tap anywhere to skip to final reveal; keep a visible Skip button after 600ms for clarity."
    }
  },

  "accessibility": {
    "contrast": [
      "Text on panel must be >= white/80 for body; use white/60 only for metadata.",
      "Avoid magenta text on dark without glow; prefer magenta as border/glow/accent chip."
    ],
    "focus": [
      "All interactive elements must have visible focus ring (ring chakra cyan).",
      "Ensure Dialog/Sheet traps focus (shadcn default)."
    ],
    "touch_targets": ["Minimum 44px height for primary actions", "Spacing between adjacent icon buttons >= 8px"],
    "reduced_motion": {
      "rule": "Respect prefers-reduced-motion: shorten or disable reveal flourishes; keep functional transitions.",
      "implementation": "Use framer-motion useReducedMotion() to reduce scale/rotation and remove stagger."
    }
  },

  "image_urls": {
    "note": "Keep existing in-game art pipeline. Use external images only for placeholder dev/testing; replace before production.",
    "placeholders": {
      "summon_banner_background": {
        "category": "Summon Ceremony banner backdrop",
        "description": "Dark cinematic abstract background with subtle cyan highlights (placeholder only)",
        "urls": []
      },
      "dungeon_card_backgrounds": {
        "category": "Resource Dungeons cards",
        "description": "Moody stone/temple/vault textures (placeholder only)",
        "urls": []
      }
    }
  },

  "instructions_to_main_agent": {
    "implementation_priorities": [
      "1) Summon Ceremony redesign: carousel + rates dialog + pity module + reveal overlay (skippable).",
      "2) HeroDetailModal tabs: Train (bulk tomes), Evolve (stars + mats), Gear (4 slots + inventory sheet).",
      "3) Gear/Forge page: inventory + detail sheet + enhance + craft + fusion.",
      "4) Resource Dungeons hub: 3 expandable cards with difficulty tiers + drop preview."
    ],
    "testing_requirements": [
      "Add data-testid to every interactive element and key info (pity count, gear score, gold cost, owned mats).",
      "Use kebab-case and role-based naming (e.g., summon-pity-count-text, gear-score-value)."
    ],
    "performance_notes": [
      "Animate only transform/opacity; avoid animating box-shadow continuously in lists.",
      "Use rarity pulses only on focused/selected items or during reveal; keep inventory mostly static."
    ],
    "no_horizontal_scroll": [
      "Add min-w-0 to flex children containing text.",
      "Use overflow-hidden on page wrappers; use overflow-x-auto only on intentional scrollers (banner carousel)."
    ]
  },

  "gradient_restriction_rule": {
    "rules": [
      "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.",
      "NEVER let gradients cover more than 20% of the viewport.",
      "NEVER apply gradients to text-heavy content or reading areas.",
      "NEVER use gradients on small UI elements (<100px width).",
      "NEVER stack multiple gradient layers in the same viewport."
    ],
    "enforcement": "IF gradient area exceeds 20% of viewport OR affects readability, THEN use solid colors",
    "allowed_usage": [
      "Section backgrounds (not content backgrounds)",
      "Hero section header content (dark to light to dark)",
      "Decorative overlays and accent elements only"
    ]
  },

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc\n",
    "\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.\n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
