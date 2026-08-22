{
  "project": {
    "name": "Shinobi Clash",
    "theme_codename": "Neon Shadow — Deco Prestige",
    "scope": "ELEVATE (not redesign) the existing dark cinematic gacha RPG UI into a premium theme. Extend existing tokens in /app/frontend/src/lib/theme.js and :root in /app/frontend/src/index.css so changes propagate globally. Showcase focus: Summon + Roster.",
    "non_negotiables": [
      "Backward-compatible: extend tokens/utilities; do not rip out existing palette or classnames.",
      "Single mode only: DARK.",
      "Keep chakra cyan (#00E5FF) as PRIMARY interactive accent.",
      "Introduce METALLIC GOLD as PRESTIGE accent (rarity/rewards/premium).",
      "Ornate rarity-scaled card frames are the signature: ornamentation + glow intensity increases with rarity; UR/LR/MYTHIC get gold treatment.",
      "Art-first: UI must not clutter character art; use scrims/vignettes for legibility.",
      "No page-level horizontal scroll. Any horizontal scroller must be bounded (overflow-x-auto) and use scrollbar-none.",
      "All interactive and key informational elements MUST include data-testid (kebab-case, role-based).",
      "Use shadcn/ui components from /app/frontend/src/components/ui (JS files).",
      "No transition:all. Animate transform/opacity for motion; use transition-colors for hover/focus color changes only.",
      "Gradients restricted: never exceed 20% viewport; never on text-heavy reading areas; never on small UI elements (<100px)."
    ]
  },

  "brand_attributes": {
    "tone": ["cinematic", "premium", "high-contrast", "collectible-prestige", "deco-ornate-but-controlled"],
    "visual_metaphors": [
      "obsidian lacquer canvas",
      "cyan chakra circuitry for interaction",
      "Deco gold pinstripes + corner filigree for prestige",
      "rarity as jewelry: frames feel like crafted artifacts"
    ],
    "reference_learnings_to_bake_in": {
      "goddess_era": "Art dominates; UI stays uncluttered; text sits on blurred scrims.",
      "girls_x_battle": "Clean, high-contrast, legible; punchy rarity feedback in summon.",
      "afk_arena_epic_seven": "Ornamentation scales with rarity; gold for prestige; rarity ladder + stars; dark blurred scrims behind text over art."
    }
  },

  "design_tokens": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_these": {
        "button": "button.jsx",
        "card": "card.jsx",
        "badge": "badge.jsx",
        "tabs": "tabs.jsx",
        "dialog": "dialog.jsx",
        "drawer": "drawer.jsx",
        "sheet": "sheet.jsx",
        "carousel": "carousel.jsx",
        "scroll_area": "scroll-area.jsx",
        "table": "table.jsx",
        "tooltip": "tooltip.jsx",
        "popover": "popover.jsx",
        "alert_dialog": "alert-dialog.jsx",
        "progress": "progress.jsx",
        "select": "select.jsx",
        "toggle_group": "toggle-group.jsx",
        "sonner": "sonner.jsx"
      }
    },

    "css_custom_properties": {
      "where": "/app/frontend/src/index.css :root (extend; do not remove existing vars)",
      "additions": {
        "--canvas": "#05050A",
        "--canvas-2": "#0B0B14",
        "--canvas-3": "#12121F",

        "--gold": "#FFCA28",
        "--gold-2": "#FFC857",
        "--gold-dim": "rgba(255,202,40,0.22)",
        "--gold-hairline": "rgba(255,202,40,0.35)",

        "--stroke-soft": "rgba(255,255,255,0.08)",
        "--stroke": "rgba(255,255,255,0.12)",
        "--stroke-hard": "rgba(255,255,255,0.18)",

        "--glass-fill": "rgba(11, 11, 20, 0.62)",
        "--glass-fill-strong": "rgba(6, 6, 12, 0.78)",
        "--glass-border": "rgba(255,255,255,0.10)",
        "--glass-border-strong": "rgba(255,255,255,0.14)",

        "--shadow-deep": "0 18px 60px rgba(0,0,0,0.55)",
        "--shadow-lift": "0 24px 80px rgba(0,0,0,0.62)",

        "--ring-cyan": "rgba(0,229,255,0.55)",
        "--ring-gold": "rgba(255,202,40,0.45)",

        "--radius-card": "14px",
        "--radius-panel": "16px",
        "--radius-cta": "12px",

        "--deco-notch": "10px",
        "--deco-corner": "18px"
      }
    },

    "semantic_color_system": {
      "background_layers": {
        "bg_void": "BG.void (#05050A)",
        "bg_deep": "BG.deep (#0B0B14)",
        "bg_night": "BG.night (#12121F)",
        "rule": "Use bg_void for app canvas; bg_deep for most panels; bg_night only for small raised strips (HUD rows)."
      },
      "text": {
        "primary": "TEXT.primary (#FFFFFF)",
        "secondary": "TEXT.secondary (rgba(226,232,240,0.78))",
        "tertiary": "TEXT.tertiary (rgba(148,163,184,0.72))",
        "muted": "TEXT.muted (rgba(100,116,139,0.55))"
      },
      "interactive_accents": {
        "primary": "ACCENT.chakra (#00E5FF)",
        "cta_energy": "ACCENT.fox (#FF5722) — use sparingly for stamina/energy spend or urgent CTA",
        "mystic": "ACCENT.jutsu (#D500F9) — use as mystical highlight, not default",
        "prestige": "ACCENT.gold (#FFCA28) — rewards, UR+ frames, premium currency"
      },
      "states": {
        "success": "Use chakra cyan (fits theme)",
        "warning": "Gold/amber",
        "danger": "hsl(var(--destructive))",
        "info": "chakra cyan"
      }
    },

    "rarity_system": {
      "keep_or_tweak": {
        "decision": "KEEP existing rarity colors for backward compatibility; add a 'classic ladder mapping' for UI hints (stars, labels) without changing token colors.",
        "classic_ladder_reference": {
          "common": "N/R (gray)",
          "rare": "SR (blue)",
          "epic": "SSR (purple)",
          "legendary": "UR (gold)",
          "ascendant": "GR/LR (hot pink/red-pink)",
          "mythic": "MYTHIC (mint)"
        }
      },
      "rarity_frame_system_spec": {
        "goal": "A single frame component style that scales ornamentation + glow with rarity. Must look premium but not bleed into adjacent cards.",
        "implementation_note": "Implement as CSS utility classes (e.g., .frame, .frame--SSR) + CSS vars (--rarity, --glow) set inline or via class. Use existing .aura-2/.aura-3/.aura-4 and .rarity-pulse where appropriate.",
        "base_frame_recipe": {
          "container": "relative overflow-hidden rounded-[var(--radius-card)]",
          "inner_surface": "bg-[rgba(11,11,20,0.65)] backdrop-blur-[18px] border border-white/10",
          "double_stroke": "Use pseudo-elements: outer 1px stroke + inner inset 1px stroke with 6–10px gap.",
          "deco_corners": "Use 4 corner ornaments via pseudo-elements or an SVG mask; keep geometry stepped (Art-Deco), not floral.",
          "scrim_for_text_over_art": "Use theme.scrimBottom() or a bottom gradient overlay on portrait areas."
        },
        "tiers": {
          "N": {
            "rarity_color": "RARITY.N.color (#7C7C86)",
            "border": "1px solid rgba(255,255,255,0.08)",
            "inner_inset": "none",
            "corner_ornament": "none",
            "glow": "none (or extremely subtle 0 0 10px rgba(124,124,134,0.10))",
            "shine": "off",
            "notes": "Keep N visually quiet so higher tiers feel special."
          },
          "R": {
            "rarity_color": "RARITY.R.color (#9E9E9E)",
            "border": "1px solid rgba(255,255,255,0.10)",
            "inner_inset": "inset 0 0 0 1px rgba(255,255,255,0.06)",
            "corner_ornament": "micro notches only (2px stepped corners)",
            "glow": "0 0 14px rgba(158,158,158,0.12)",
            "shine": "off"
          },
          "SR": {
            "rarity_color": "RARITY.SR.color (#29B6F6)",
            "border": "1px solid rgba(41,182,246,0.35)",
            "inner_inset": "inset 0 0 0 1px rgba(255,255,255,0.08)",
            "corner_ornament": "level-1: small deco corner brackets (thin L-shapes)",
            "glow": "0 0 0 1px rgba(41,182,246,0.18), 0 0 18px rgba(41,182,246,0.18)",
            "shine": "optional on hover only (no infinite)"
          },
          "SSR": {
            "rarity_color": "RARITY.SSR.color (#AB47BC)",
            "border": "1px solid rgba(171,71,188,0.40)",
            "inner_inset": "inset 0 0 0 1px rgba(255,255,255,0.10)",
            "corner_ornament": "level-2: deco brackets + tiny diamond studs at corners",
            "glow": "Use existing .aura-2 with --glow set to rarity color",
            "shine": "allow .shine-sweep on large featured cards only",
            "notes": "SSR is where 'premium' begins; keep ornamentation noticeable but still clean."
          },
          "UR": {
            "rarity_color": "RARITY.UR.color (#FFCA28)",
            "border": "1px solid var(--gold-hairline)",
            "inner_inset": "inset 0 0 0 1px rgba(255,255,255,0.12)",
            "corner_ornament": "level-3: gold deco corners (stepped fanburst) + thin pinstripe top/bottom",
            "glow": "Use .aura-3 with --glow = rgba(255,202,40,0.85)",
            "shine": "single sweep on reveal; hover sweep allowed on roster featured",
            "gold_usage": "YES (prestige accent)"
          },
          "GR": {
            "rarity_color": "RARITY.GR.color (#FF4081)",
            "border": "1px solid rgba(255,64,129,0.42)",
            "inner_inset": "inset 0 0 0 1px rgba(255,255,255,0.12)",
            "corner_ornament": "level-3: deco corners + small side chevrons",
            "glow": "Use .aura-3 with --glow = rgba(255,64,129,0.85)",
            "shine": "reveal-only"
          },
          "LR": {
            "rarity_color": "RARITY.LR.color (#FF2D78)",
            "border": "2px solid rgba(255,202,40,0.55) + inner 1px rarity tint",
            "inner_inset": "inset 0 0 0 1px rgba(255,45,120,0.35)",
            "corner_ornament": "level-4: gold filigree corners + diamond studs + top crest plate",
            "glow": "Use .aura-4 with --glow = rgba(255,202,40,0.95) (gold-forward) plus subtle rarity tint",
            "shine": "reveal-only + featured roster cards",
            "gold_usage": "YES (prestige accent)"
          },
          "MYTHIC": {
            "rarity_color": "RARITY.MYTHIC.color (#64FFDA)",
            "border": "2px solid rgba(255,202,40,0.55) + inner 1px mint tint",
            "inner_inset": "inset 0 0 0 1px rgba(100,255,218,0.35)",
            "corner_ornament": "level-5: gold deco frame + mint 'aether' inlays (thin inner glow line)",
            "glow": "Reveal: .rarity-pulse with --glow = rgba(100,255,218,0.95). Inventory: static glow only.",
            "shine": "single sweep on reveal only",
            "gold_usage": "YES (prestige accent)",
            "notes": "MYTHIC should feel like 'artifact-grade'—gold structure with alien mint energy."
          }
        },
        "frame_css_scaffold": {
          "note": "Main agent can implement in index.css as additive utilities. Keep selectors simple.",
          "snippet": "/* Rarity Frame System (additive) */\n.frame { position: relative; border-radius: var(--radius-card); overflow: hidden; }\n.frame::before { content: \"\"; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; border: 1px solid var(--frame-stroke, rgba(255,255,255,0.10)); }\n.frame::after { content: \"\"; position: absolute; inset: 8px; border-radius: calc(var(--radius-card) - 8px); pointer-events: none; border: 1px solid var(--frame-inset, rgba(255,255,255,0.06)); opacity: var(--frame-inset-opacity, 1); }\n.frame[data-rarity=\"UR\"], .frame[data-rarity=\"LR\"], .frame[data-rarity=\"MYTHIC\"] { --frame-stroke: var(--gold-hairline); }\n/* Corner ornaments: implement via background SVG mask or 4 absolutely-positioned spans */\n"
        }
      }
    },

    "glass_panel_recipe": {
      "goal": "Refined glass panels that feel like HUD glass, not generic glassmorphism.",
      "use_existing": [".glass", ".panel"],
      "recommended_recipe": {
        "class_combo": "glass panel rounded-[var(--radius-panel)] shadow-[var(--shadow-deep)]",
        "border": "1px solid rgba(255,255,255,0.10) + optional inner inset line",
        "blur": "backdrop-filter: blur(18px) (already in .glass)",
        "edge_light": "Add a subtle top edge highlight: linear-gradient(to bottom, rgba(255,255,255,0.10), transparent 40%) as overlay",
        "legibility": "If text sits over art, add scrimBottom() overlay; never rely on blur alone."
      }
    },

    "art_deco_gold_hairline_recipe": {
      "goal": "Deco prestige without turning the whole UI gold.",
      "rules": [
        "Gold is for UR+ frames, premium rewards, featured banner highlights, and 'claim' moments.",
        "Do NOT use gold as default button fill everywhere; keep cyan as primary interaction.",
        "Use gold as hairlines, corner ornaments, and small crests (<= 24px tall) in headers."
      ],
      "tailwind_utilities": {
        "hairline": "border border-[rgba(255,202,40,0.35)]",
        "pinstripe": "bg-[linear-gradient(90deg,transparent,rgba(255,202,40,0.35),transparent)]",
        "crest_plate": "bg-[rgba(255,202,40,0.10)] border border-[rgba(255,202,40,0.35)]"
      }
    }
  },

  "typography": {
    "fonts": {
      "display": {
        "family": "Bebas Neue",
        "usage": "Screen titles, summon callouts, rarity labels, big numbers.",
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
      "section_title": "text-lg font-semibold",
      "card_title": "text-sm font-semibold",
      "body": "text-sm text-white/80 leading-relaxed",
      "micro": "text-xs text-white/60",
      "label": "text-[11px] uppercase tracking-[0.18em] text-white/60"
    },
    "numbers": {
      "rule": "Use tabular numbers for counters (pity, currency, stats).",
      "tailwind": "tabular-nums"
    }
  },

  "layout_and_grid": {
    "global_rules": [
      "Mobile-first; keep existing page layouts. This spec is a RESKIN: apply new surfaces/frames/tokens to existing structure.",
      "No page-level horizontal overflow: add min-w-0 to flex children with text; avoid negative margins.",
      "Roster grids: keep gaps generous (gap-3 mobile, gap-4 md+) so glows don’t merge.",
      "Use scrims/vignettes behind text over art (theme.scrimBottom + theme.vignetteInset)."
    ],
    "summon_page_showcase": {
      "do_not_redesign_layout": true,
      "skin_targets": [
        "Banner carousel: add deco gold hairline on featured banner only; keep cyan for active indicator.",
        "Rates dialog: glass panel + gold hairline header divider.",
        "Pity module: framed panel with subtle cyan ring; MYTHIC threshold gets gold crest.",
        "Sticky CTA bar: cyan primary button + optional gold 'Premium' secondary when applicable."
      ]
    },
    "roster_page_showcase": {
      "do_not_redesign_layout": true,
      "skin_targets": [
        "Hero cards: apply rarity frame system; keep art dominant; add bottom scrim for name/level.",
        "Filters/sorts: glass strip with cyan focus ring; avoid heavy glow.",
        "Selected hero: elevate with stronger shadow + controlled aura (SSR+ only)."
      ]
    }
  },

  "components": {
    "button_system": {
      "variants": {
        "primary_cyan": {
          "usage": "Default primary actions: Summon, Confirm, Equip, Save.",
          "tailwind": "bg-[var(--chakra)] text-[var(--base)] hover:bg-[color:rgba(0,229,255,0.92)] focus-visible:ring-2 focus-visible:ring-[var(--chakra)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)]",
          "shape": "rounded-[var(--radius-cta)]",
          "motion": "Use framer-motion whileTap={{ scale: 0.98 }}; hover can lift -1px (transform only)."
        },
        "secondary_glass": {
          "usage": "Secondary actions: Rates, Details, Manage.",
          "tailwind": "bg-white/5 border border-white/10 text-white hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[var(--chakra)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)]",
          "note": "Optional .shine-sweep ONLY on wide buttons (>=140px)."
        },
        "prestige_gold": {
          "usage": "Premium/reward actions only: Claim, Ascend, UR+ special summon (if exists).",
          "tailwind": "bg-[rgba(255,202,40,0.14)] border border-[rgba(255,202,40,0.35)] text-[rgba(255,202,40,0.95)] hover:bg-[rgba(255,202,40,0.18)] focus-visible:ring-2 focus-visible:ring-[rgba(255,202,40,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--base)]",
          "rule": "Gold buttons should be rarer than cyan buttons."
        },
        "danger": {
          "tailwind": "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        },
        "ghost": {
          "tailwind": "bg-transparent hover:bg-white/5 text-white"
        }
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-11 px-4 text-sm",
        "lg": "h-12 px-5 text-base"
      },
      "data_testid_examples": [
        "summon-x1-button",
        "summon-x10-button",
        "summon-skip-button",
        "roster-filter-open-button",
        "hero-card-button",
        "hero-detail-close-button"
      ]
    },

    "rarity_badges_and_stars": {
      "badge": {
        "component": "Badge",
        "pattern": "<Badge data-testid=\"hero-rarity-badge\" className=\"text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5\">SSR</Badge>",
        "rule": "Badge fill stays neutral; rarity is communicated via frame + small accent dot/line."
      },
      "stars": {
        "rule": "Stars are the universal gacha language. Keep them small and consistent; gold stars for high tiers, neutral for low tiers.",
        "implementation": "Use lucide-react Star icon; fill via currentColor; set color based on rarity tier.",
        "data_testid": "hero-stars-row"
      }
    },

    "scrims_and_vignettes": {
      "use": "Any text over portrait art.",
      "recipes": {
        "bottom_scrim": "style={{ background: scrimBottom(\"0.92\") }}",
        "inset_vignette": "style={{ backgroundImage: vignetteInset }}"
      }
    }
  },

  "summon_reveal_spec": {
    "rarity_flash_colors": {
      "N": "rgba(124,124,134,0.55)",
      "R": "rgba(158,158,158,0.55)",
      "SR": "rgba(41,182,246,0.55)",
      "SSR": "rgba(171,71,188,0.55)",
      "UR": "rgba(255,202,40,0.55)",
      "GR": "rgba(255,64,129,0.55)",
      "LR": "rgba(255,45,120,0.55)",
      "MYTHIC": "rgba(100,255,218,0.55)"
    },
    "staging": {
      "principles": [
        "Punchy but skippable.",
        "Tiered flourish: higher rarity gets stronger burst + longer settle.",
        "Avoid heavy filters; use opacity/transform + a single overlay flash.",
        "x10 pacing: quick intro (0.4–0.6s), then stagger flips 60–90ms."
      ],
      "recommended_stages": {
        "intro": "Dark vignette + subtle cyan rune ring (static CSS radial).",
        "tell": "Container/orb appears; subtle color steer based on highest rarity in batch (very faint).",
        "burst": "Single flash overlay tinted to rarity; add 2–3 sparkles (existing .sparkle) for SSR+.",
        "reveal": "Cards flip into grid; each card uses rarity frame system.",
        "summary": "Results grid with quick actions (favorite/lock) and CTA to Roster."
      },
      "skip": {
        "rule": "Tap anywhere to skip to final reveal; show explicit Skip button after 600ms.",
        "data_testids": {
          "overlay": "summon-reveal-overlay",
          "skip_button": "summon-skip-button",
          "close_button": "summon-reveal-close-button"
        }
      }
    },
    "js_scaffold": {
      "note": "Keep in .js (not .tsx).",
      "snippet": "// RevealOverlay.js\nimport { motion, AnimatePresence, useReducedMotion } from 'framer-motion';\nimport { Button } from '../components/ui/button';\n\nexport default function RevealOverlay({ open, results, onClose, onSkip, highestRarityKey }) {\n  const reduce = useReducedMotion();\n  const flash = {\n    initial: { opacity: 0 },\n    animate: { opacity: 1 },\n    exit: { opacity: 0 },\n    transition: { duration: reduce ? 0.12 : 0.22 }\n  };\n\n  return (\n    <AnimatePresence>\n      {open ? (\n        <motion.div\n          className=\"fixed inset-0 z-50 bg-black/80\"\n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          onClick={onSkip}\n          data-testid=\"summon-reveal-overlay\"\n        >\n          <motion.div\n            className=\"absolute inset-0\"\n            style={{ background: 'radial-gradient(60% 40% at 50% 40%, rgba(0,229,255,0.10), transparent 70%)' }}\n            {...flash}\n          />\n\n          <div className=\"absolute top-4 right-4\">\n            <Button\n              variant=\"secondary\"\n              onClick={(e) => { e.stopPropagation(); onSkip?.(); }}\n              data-testid=\"summon-skip-button\"\n            >\n              Skip\n            </Button>\n          </div>\n\n          {/* results grid here */}\n        </motion.div>\n      ) : null}\n    </AnimatePresence>\n  );\n}\n"
    }
  },

  "motion_and_microinteractions": {
    "rules": [
      "No universal transitions.",
      "Use framer-motion for transforms; Tailwind transition-colors for hover/focus.",
      "Use existing .fade-up for panel entrances; stagger children 40–80ms.",
      "Press feedback: scale 0.98 on buttons/cards; release to 1."
    ],
    "durations": {
      "tap": "90–140ms",
      "panel_enter": "220–320ms",
      "reveal_intro": "400–600ms",
      "card_flip": "260–340ms"
    },
    "hover_rules_desktop": [
      "Cards: lift -2px + slightly stronger shadow; do not increase glow spread too much.",
      "Buttons: color shift + subtle glow; avoid big neon blooms."
    ]
  },

  "accessibility": {
    "contrast": [
      "Body text on panels should be white/80 or higher.",
      "Use white/60 only for metadata.",
      "Never place gold text on bright gold fills; gold is usually border/ornament, not body text."
    ],
    "focus": [
      "All interactive elements must have visible focus ring (chakra cyan).",
      "Dialogs/Sheets must trap focus (shadcn default)."
    ],
    "touch_targets": ["Min 44px height for primary actions", ">= 8px spacing between adjacent icon buttons"],
    "reduced_motion": {
      "rule": "Respect prefers-reduced-motion: shorten/disable flourish; keep functional transitions.",
      "implementation": "Use framer-motion useReducedMotion() to reduce scale/rotation and remove stagger."
    }
  },

  "image_urls": {
    "note": "This is an existing game; prefer in-game art. External URLs are placeholders only.",
    "placeholders": {
      "deco_corner_svg": {
        "category": "Frame ornaments",
        "description": "Implement ornaments as inline SVG or CSS mask; avoid external dependencies for core UI.",
        "urls": []
      }
    }
  },

  "instructions_to_main_agent": {
    "implementation_priorities": [
      "1) Extend :root tokens in /app/frontend/src/index.css with gold hairlines + glass borders (additive).",
      "2) Implement Rarity Frame System utilities (frame base + per-rarity vars) in index.css (additive).",
      "3) Apply frame system to Roster hero cards and Summon result cards (no layout changes).",
      "4) Summon reveal: add rarity flash overlay + skippable staging; use rarity flash colors above.",
      "5) Ensure all interactive/key info elements have data-testid."
    ],
    "data_testid_rules": [
      "Use kebab-case and role-based naming.",
      "Examples: summon-pity-count-text, roster-hero-count-text, hero-card-open-button, summon-rates-open-button."
    ],
    "performance_notes": [
      "Avoid continuous box-shadow animation in large grids; reserve pulses for reveal/selected states.",
      "Backdrop blur is expensive: use .glass selectively; prefer .panel for most surfaces."
    ]
  },

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.\n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
