"""Centralized PLAYER progression configuration — XP curve, level-up rewards,
and campaign hero-reward rarity restrictions.

This is the SINGLE source of truth for player-level balancing. All XP
requirements, level-up rewards, and campaign reward rarity caps live here so
the game can be rebalanced by editing one file.

Design:
  - XP curve is piecewise: fast early (1-10), moderate (11-25), slower
    (26-50), long-term (50+). No exponential walls.
  - Every level grants a reward (ryo, gems, items). Milestone levels grant
    significantly better rewards.
  - Campaign hero rewards are rarity-capped by chapter so high-rarity heroes
    (UR/LR/GR) are NEVER given away through ordinary campaign progression.
    Summoning remains the primary way to acquire powerful heroes.
"""

from typing import Optional

# ---------------------------------------------------------------------------
# XP curve — xp_required_for_level(L) = XP needed to go from L → L+1
# ---------------------------------------------------------------------------
def xp_required_for_level(level: int) -> int:
    """Piecewise XP curve. Fast early, moderate mid, slower late, long-term
    endgame. Smooth transitions at each breakpoint."""
    if level < 1:
        level = 1
    if level <= 10:
        # L1=100 ... L10=550 — very fast, frequent level-ups early
        return 100 + (level - 1) * 50
    elif level <= 25:
        # L11=670 ... L25=2350 — moderate pace
        return 550 + (level - 10) * 120
    elif level <= 50:
        # L26=2630 ... L50=9630 — slower, meaningful investment
        return 2350 + (level - 25) * 280
    else:
        # L51=10180 ... — long-term progression, no exponential wall
        return 9630 + (level - 50) * 550


# ---------------------------------------------------------------------------
# Level-up rewards
# ---------------------------------------------------------------------------
MILESTONE_LEVELS = {5, 10, 20, 30, 50, 75, 100}

# Explicit milestone rewards — significantly more exciting than standard levels.
# NO UR/LR/GR heroes are given as level-up rewards; summon tickets + resources
# keep summoning as the primary hero-acquisition path.
MILESTONE_REWARDS = {
    5:   {"ryo": 1500,  "gems": 50,   "items": {"summon_ticket": 1, "exp_tome_greater": 3, "ascension_crystal": 2}},
    10:  {"ryo": 3000,  "gems": 120,  "items": {"summon_ticket": 2, "exp_tome_ancient": 1, "ascension_crystal": 5}},
    20:  {"ryo": 6000,  "gems": 250,  "items": {"summon_ticket": 3, "exp_tome_ancient": 2, "ascension_crystal": 8}},
    30:  {"ryo": 10000, "gems": 400,  "items": {"summon_ticket": 5, "exp_tome_ancient": 3, "ascension_crystal": 12}},
    50:  {"ryo": 20000, "gems": 700,  "items": {"summon_ticket": 8, "exp_tome_ancient": 5, "ascension_crystal": 20}},
    75:  {"ryo": 35000, "gems": 1200, "items": {"summon_ticket": 12, "exp_tome_ancient": 8, "ascension_crystal": 30}},
    100: {"ryo": 60000, "gems": 2000, "items": {"summon_ticket": 20, "exp_tome_ancient": 12, "ascension_crystal": 50}},
}


def _default_level_reward(level: int) -> dict:
    """Standard (non-milestone) level-up reward, tiered by level range."""
    if level <= 10:
        return {"ryo": 300 + level * 50, "gems": 5,
                "items": {"exp_tome_minor": 2}}
    elif level <= 25:
        return {"ryo": 800 + level * 80, "gems": 15,
                "items": {"exp_tome_greater": 1, "ascension_crystal": 1}}
    elif level <= 50:
        return {"ryo": 2000 + level * 120, "gems": 25,
                "items": {"exp_tome_greater": 2, "ascension_crystal": 3}}
    else:
        return {"ryo": 4000 + level * 150, "gems": 40,
                "items": {"exp_tome_ancient": 1, "ascension_crystal": 5}}


def get_level_rewards(level: int) -> dict:
    """Returns the reward dict for reaching `level`.
    Milestone levels use the explicit MILESTONE_REWARDS table; all others
    use the tiered default. Always returns a dict with ryo, gems, items."""
    if level in MILESTONE_REWARDS:
        r = MILESTONE_REWARDS[level]
        return {"ryo": r["ryo"], "gems": r["gems"], "items": dict(r["items"]),
                "is_milestone": True, "level": level}
    r = _default_level_reward(level)
    return {"ryo": r["ryo"], "gems": r["gems"], "items": dict(r["items"]),
            "is_milestone": False, "level": level}


def is_milestone_level(level: int) -> bool:
    return level in MILESTONE_LEVELS


# ---------------------------------------------------------------------------
# Campaign hero-reward rarity caps — prevents high-rarity heroes from being
# given away through ordinary campaign stage completion.
# ---------------------------------------------------------------------------
# Rarities by RARITY_ORDER: N=0, R=1, SR=2, SSR=3, UR=4, LR=5, GR=6
_CAMPAIGN_HERO_CAPS = [
    (10, "R"),     # Chapters  1-10:  only R heroes
    (25, "SR"),    # Chapters 11-25: up to SR heroes
    (999, "SSR"),  # Chapters  26+:  up to SSR heroes (UR/LR/GR NEVER from campaign)
]


def campaign_hero_reward_max_rarity(chapter: int) -> str:
    """Maximum rarity a full hero reward can have for the given chapter.
    UR, LR, and GR are NEVER rewarded through campaign progression."""
    for cap_chapter, max_rarity in _CAMPAIGN_HERO_CAPS:
        if chapter <= cap_chapter:
            return max_rarity
    return "SSR"


# ---------------------------------------------------------------------------
# Campaign milestone chapters — major checkpoints with bonus rewards
# ---------------------------------------------------------------------------
CAMPAIGN_MILESTONE_CHAPTERS = {5, 10, 20, 30, 50, 75, 100}


def is_campaign_milestone_chapter(chapter: int) -> bool:
    return chapter in CAMPAIGN_MILESTONE_CHAPTERS
