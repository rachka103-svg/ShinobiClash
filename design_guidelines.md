{
  "design_system_scope": {
    "screen": "/campaign (Campaign.jsx)",
    "goal": "Replace flat stage list with a cinematic World → Chapter → Stage → Battle map experience, without changing data/logic/APIs.",
    "non_goals": [
      "No changes to battle-start flow, energy validation, rewards, completion logic",
      "No new palette/typography; must use existing tokens + existing glow/scrim/vignette helpers",
      "No heavy 3D, no continuously animated backgrounds, no excessive particles"
    ]
  },

  "brand_attributes": [
    "premium fantasy RPG",
    "dark atmospheric",
    "rare-rarity gold accents",
    "cinematic lighting + layered depth",
    "touch-first clarity (mobile)"
  ],

  "existing_tokens_to_use_not_replace": {
    "base": "--base (#05050A)",
    "panel": "--panel (#0B0B14)",
    "chakra": "--chakra (#00E5FF)",
    "fox": "--fox (#FF5722)",
    "jutsu": "--jutsu (#D500F9)",
    "shadcn_css_vars": [
      "--background, --foreground, --card, --muted, --border, --ring, --radius"
    ],
    "existing_utilities": [
      ".glass (blurred surface)",
      ".panel (cinematic panel gradient)",
      ".grain (noise overlay)",
      ".glow-cyan, .glow-text-cyan, .glow-text-orange",
      ".fade-up (entrance)",
      ".rarity-pulse / .aura-2/.aura-3/.aura-4 (rarity framing)"
    ],
    "note": "Do not introduce a new palette. Use rarity tier colors + element colors already present in the app. Gold/amber accents should come from existing currency styling (if present) or a single tokenized amber accent class already used elsewhere."
  },

  "layout_composition": {
    "overall_structure_mobile_first": {
      "pattern": "TopBar (existing) + Campaign header strip + Chapter navigator (horizontal) + Map viewport (vertical) + Stage preview (bottom sheet)",
      "no_horizontal_page_scroll": true,
      "recommended_container": "Use a full-bleed map canvas inside the existing app shell; constrain content width with px-4 but allow background to bleed edge-to-edge.",
      "safe_areas": "Respect iOS bottom safe area for the stage preview sheet CTA row (pb-[env(safe-area-inset-bottom)])."
    },

    "background_and_depth": {
      "reuse_existing_battle_bg": {
        "instruction": "Reuse the existing painted bamboo-forest-at-dusk background image used on Battle screen as the Campaign map atmosphere.",
        "treatment": [
          "Apply a dark vignette overlay (top+bottom) to keep nodes readable",
          "Add a subtle scrim behind chapter strip and behind stage preview sheet",
          "Optional: add .grain overlay at low opacity (already exists)"
        ],
        "performance": "Background must be static (no video). If parallax is used, it must be minimal and only on scroll (transform translateY), not continuous animation."
      },
      "layering": {
        "layers": [
          "Layer 0: background image + vignette",
          "Layer 1: faint path line + fog/scrim patches",
          "Layer 2: stage nodes + connectors",
          "Layer 3: chapter strip + stage preview sheet"
        ],
        "rule": "Never let decorative layers reduce node contrast; readability wins."
      }
    },

    "grid_and_spacing": {
      "mobile_spacing": {
        "outer_padding": "px-4",
        "chapter_strip_height": "~92–112px",
        "node_vertical_rhythm": "min 84px between node centers (touch + readability)",
        "map_section_padding": "pt-3 pb-28 (reserve space for bottom sheet peek/CTA)"
      },
      "tablet_desktop": {
        "max_width": "max-w-[520px] for map column; keep cinematic focus",
        "center_column": "mx-auto but do NOT center-align text globally"
      }
    }
  },

  "chapter_navigator_strip": {
    "purpose": "Fast chapter switching without losing place; communicates chapter state at a glance.",
    "component_strategy": {
      "use": [
        "shadcn ScrollArea (horizontal)",
        "shadcn Button (ghost/secondary variants)",
        "shadcn Progress (completion %)"
      ],
      "avoid": [
        "generic dashboard cards",
        "oversized text",
        "neon gradients"
      ]
    },
    "composition": {
      "layout": "Horizontal scroll strip with ‘region chips’ (chapter cards) sized for thumb taps.",
      "chip_size": "min-w-[240px] h-[84px] rounded-xl",
      "chip_internal_grid": "Left: chapter number badge + title stack; Right: completion ring/percent + boss icon",
      "text_hierarchy": {
        "title": "Chapter {n}: {name} (font-display optional for chapter number only)",
        "lore": "1-line lore (truncate) in muted foreground",
        "meta": "Completion % + state label (Cleared / In Progress / Locked)"
      }
    },
    "states": {
      "selected": {
        "treatment": "Slight scale (1.01), brighter border, subtle cyan ring glow (use --ring / chakra), and a top highlight line.",
        "motion": "Framer Motion layoutId underline or glow bar; 180–240ms"
      },
      "cleared": {
        "treatment": "Gold/amber accent tick + subdued glow; do not confetti",
        "boss_beaten_indicator": "Small boss skull/oni mask icon with reduced opacity"
      },
      "in_progress": {
        "treatment": "Cyan accent progress bar; show ‘Next: Stage X’ microtext"
      },
      "locked": {
        "treatment": "Desaturate + lock icon; disable interaction; keep readable"
      }
    },
    "data_testids": {
      "strip": "campaign-chapter-strip",
      "chapter_chip": "campaign-chapter-chip-{chapterId}",
      "chapter_progress": "campaign-chapter-progress-{chapterId}"
    }
  },

  "stage_path_map": {
    "path_shape": {
      "recommended": "Vertical zigzag spine (alternating left/right nodes) to feel like a journey while still scrolling vertically.",
      "rule": "No horizontal page scrolling; zigzag must fit within a single column width.",
      "implementation_hint": "Compute node x-offset by index parity: left = 18%, right = 82% (translateX to center node)."
    },
    "connectors": {
      "style": "Thin path line with subtle glow; use SVG path or absolutely-positioned divs.",
      "completed": "solid line with low cyan glow",
      "upcoming": "dashed line with low opacity",
      "performance": "No animated dashed marching ants continuously; only animate on unlock or chapter switch."
    },
    "node_hitbox": {
      "min_touch": "44x44 (Apple HIG); recommend 56x56 for comfort",
      "spacing": "Keep at least 16px from screen edges"
    },
    "node_types_and_visuals": {
      "completed": {
        "shape": "coin-like disc with inner check",
        "surface": "panel/glass with subtle cyan rim",
        "accent": "small completion sparkle (single burst on completion only; not looping)"
      },
      "current_unlocked": {
        "shape": "disc + outer ring",
        "accent": "pulse ring (slow, subtle) using existing glow utilities; keep amplitude low",
        "label": "‘NEXT’ microtag above node"
      },
      "locked": {
        "shape": "disc with lock",
        "treatment": "desaturated, reduced contrast but still visible; no glow",
        "interaction": "tap shows toast or sheet state ‘Locked — clear previous stage’ (presentation only)"
      },
      "boss": {
        "shape": "larger node (72–84px) with horned frame silhouette",
        "accent": "warm orange/amber rim + subtle ember glow (use fox/orange glow-text-orange; avoid gradients)",
        "label": "BOSS banner ribbon (small)"
      }
    },
    "node_labels": {
      "rule": "Avoid huge text on map. Use small stage number label near node; full name appears in preview sheet.",
      "placement": "Stage number in a tiny badge offset (top-left) + optional difficulty icon"
    },
    "scroll_behavior": {
      "chapter_switch": "On chapter change, scroll map container to top with smooth behavior; preserve last scroll per chapter in memory if feasible.",
      "focus_selected": "When selecting a node, gently scroll it into view (center-ish) before opening preview sheet."
    },
    "data_testids": {
      "map": "campaign-stage-map",
      "node": "campaign-stage-node-{stageId}",
      "connector": "campaign-stage-connector-{fromStageId}-{toStageId}"
    }
  },

  "stage_preview_panel": {
    "pattern": "Mobile bottom sheet (preferred) with a ‘peek’ collapsed state; expands on node tap.",
    "component_strategy": {
      "use": [
        "shadcn Drawer (mobile-first) OR shadcn Sheet (bottom)",
        "shadcn Tabs (Enemies / Rewards / Info)",
        "shadcn Badge (elements/rarity)",
        "shadcn Progress (recommended power comparison)",
        "shadcn Button (primary CTA)"
      ],
      "note": "Use Drawer for mobile ergonomics; Sheet is acceptable if Drawer already used elsewhere."
    },
    "hierarchy": {
      "top_row": "Stage number + stage name (truncate) + state pill (Cleared/Locked/Boss)",
      "power_row": "Recommended Power vs Squad Power (two numbers) + a small delta indicator",
      "enemy_row": "Enemy portraits (Avatar) with role + element badges",
      "rewards_row": "Reward preview (normal + first-clear) as compact icon chips",
      "cta_row": "Energy cost + Battle button (or Locked button disabled)"
    },
    "boss_preview_additions": {
      "boss_header": "Boss portrait larger + name + power",
      "mechanic_summary": "1–2 lines max (phase/mechanic) using existing boss-mechanic data",
      "warning_style": "Use fox/orange accent for danger; keep readable"
    },
    "cta_rules": {
      "battle_enabled": "Only when unlocked and energy validation passes (existing logic).",
      "locked_state": "Disable CTA; show requirement text.",
      "micro_interaction": "On Battle press: 0.97 press scale + quick glow flash; then navigate to battle (existing)."
    },
    "motion": {
      "open_close": "220–280ms ease-out; no bounce",
      "content": "Fade-up for inner sections (stagger 40ms) only on first open"
    },
    "data_testids": {
      "sheet": "campaign-stage-preview-sheet",
      "title": "campaign-stage-preview-title",
      "enemy_list": "campaign-stage-preview-enemies",
      "rewards": "campaign-stage-preview-rewards",
      "energy": "campaign-stage-preview-energy-cost",
      "battle_button": "campaign-stage-preview-battle-button"
    }
  },

  "chapter_completion_celebration": {
    "goal": "Subtle premium acknowledgement; no economy changes.",
    "treatment": [
      "In chapter chip: small ‘CLEARED’ gold tag + faint shine sweep (single pass on first view)",
      "On map: a small crest stamp near final node (static)"
    ],
    "avoid": [
      "confetti",
      "full-screen overlays",
      "looping fireworks"
    ]
  },

  "micro_interactions_and_motion_budget": {
    "allowed_animations_only": [
      "stage selection (node press + ring highlight)",
      "unlock state reveal (one-time connector glow + node brighten)",
      "boss emphasis (subtle idle glow only)",
      "chapter transition (map crossfade + scroll-to-top)",
      "battle launch (button press + quick flash)"
    ],
    "framer_motion_patterns": {
      "layout": "Use layoutId for selected chapter underline and selected node halo.",
      "reduced_motion": "Respect prefers-reduced-motion: disable pulsing and use static highlight."
    },
    "timings": {
      "tap_feedback": "90–120ms",
      "panel_open": "220–280ms",
      "chapter_switch": "240–320ms crossfade"
    }
  },

  "accessibility_and_readability": {
    "touch": [
      "All nodes and chapter chips must be >=44px touch targets",
      "Provide visible focus ring for keyboard (ring uses existing --ring)"
    ],
    "contrast": "Keep text on dark scrims; avoid placing text directly on busy background without a scrim.",
    "labels": "Provide aria-labels for stage nodes and chapter chips; stage number alone is not sufficient.",
    "motion": "Provide reduced-motion fallback."
  },

  "component_path": {
    "shadcn_primary": {
      "ScrollArea": "/app/frontend/src/components/ui/scroll-area.jsx",
      "Button": "/app/frontend/src/components/ui/button.jsx",
      "Badge": "/app/frontend/src/components/ui/badge.jsx",
      "Progress": "/app/frontend/src/components/ui/progress.jsx",
      "Drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "Sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "Tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "Avatar": "/app/frontend/src/components/ui/avatar.jsx",
      "Separator": "/app/frontend/src/components/ui/separator.jsx",
      "Tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "Sonner": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "notes": [
      "Project uses .js components; keep new components in .jsx/.js.",
      "Do not use raw HTML dropdown/calendar/toast; use shadcn components only."
    ]
  },

  "implementation_notes_for_main_agent": {
    "instructions_to_main_agent": [
      "Keep existing campaign data shape; only add display-only fields: stage.recommended_power and chapter.name/lore.",
      "Build a MapCanvas component that renders nodes + connectors from the existing stage list grouped by chapter.",
      "Use a vertical scroll container for the map; chapter strip is a separate horizontal ScrollArea.",
      "Use Drawer/Sheet for stage preview; do not navigate away until Battle CTA.",
      "Add data-testid to every interactive element: chapter chips, stage nodes, preview CTA, tabs.",
      "Avoid universal transitions (no transition-all). Only transition opacity/background-color/border-color/shadow where needed.",
      "Use existing .panel/.glass/.grain helpers for surfaces; do not invent new gradients."
    ],
    "suggested_new_components": [
      "CampaignChapterStrip.jsx",
      "CampaignStageMap.jsx",
      "CampaignStageNode.jsx",
      "CampaignStagePreviewDrawer.jsx"
    ],
    "lightweight_svg_strategy": "Prefer a single SVG overlay for connectors per chapter (paths between node centers) to reduce DOM nodes."
  },

  "image_urls": {
    "reuse_existing": [
      {
        "category": "campaign-map-background",
        "description": "Reuse the existing Battle screen painted bamboo forest dusk background already in the repo/assets. Apply vignette + scrim overlays for readability.",
        "url": "IN-REPO (reuse existing battle background asset)"
      }
    ],
    "optional_new": [
      {
        "category": "chapter-crest-overlays",
        "description": "Optional small monochrome crest SVGs (inline) for chapter identity; keep file size tiny and single-color.",
        "url": "INLINE SVG (no external fetch)"
      }
    ]
  },

  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
