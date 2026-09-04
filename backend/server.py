from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import asyncio
import uuid
import random
import secrets
import re
import json
import base64
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Body
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage

import game_data as gd
import expansion_systems as ex
import progression as prog
import admin_config as ac
import player_progression as pp

# Cryptographically-secure RNG for all gameplay-affecting randomness (gacha
# pulls, gear/loot drops, pity/5050 rolls). random.random()/random.choice()
# use a Mersenne Twister that is NOT safe against a determined attacker
# trying to predict/replay rolls — secrets.SystemRandom() draws from the OS
# CSPRNG instead while keeping the exact same random.Random API (.random(),
# .choice(), .choices(), .sample()), so call sites are drop-in compatible.
rng = secrets.SystemRandom()

# Generated/uploaded portraits are written here and served by the frontend at /custom/<id>.png
CUSTOM_DIR = ROOT_DIR.parent / "frontend" / "public" / "custom"
CUSTOM_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Shinobi Clash API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


def _extract_bearer_token(request: Request) -> str:
    """Pulls the access token from the httpOnly cookie, falling back to an
    `Authorization: Bearer <token>` header (used by non-browser clients)."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token


def _decode_access_token(token: str) -> dict:
    """Decodes + validates a JWT access token, raising 401 on any failure."""
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload


def migrate_progression(user: dict) -> bool:
    """Versioned one-time migrations (user['prog_v']):
      v2 — hero star/rarity migration (existing).
      v3 — player-level XP-curve migration: ensures stored level/exp is
           consistent with the current centralized XP curve. Processes any
           pending level-ups FORWARD only (never lowers a level). Does NOT
           retroactively grant level-up rewards for already-earned levels.
    """
    pv = user.get("prog_v", 0)
    if pv >= 3:
        return False
    changed = False
    if pv < 2:
        for inst in user.get("ninjas", []):
            tmpl = gd.CATALOG_BY_ID.get(inst.get("template_id"))
            if not tmpl:
                continue
            native = tmpl["rarity"]
            evolved = inst.get("evolved_rarity") or native
            stars = inst.get("stars", 1)
            resolved = prog.resolve_effective_rarity(evolved, native, stars)
            if resolved != evolved:
                inst["evolved_rarity"] = resolved
                changed = True
            if stars > prog.STAR_ABSOLUTE_MAX:
                inst["stars"] = prog.STAR_ABSOLUTE_MAX
                changed = True
    # v3: reconcile player level with the new XP curve (no retroactive rewards)
    if pv < 3:
        level = user.get("level", 1)
        exp = user.get("exp", 0)
        while exp >= gd.exp_to_next(level):
            exp -= gd.exp_to_next(level)
            level += 1
        if level != user.get("level", 1) or exp != user.get("exp", 0):
            user["level"] = level
            user["exp"] = exp
            changed = True
    user["prog_v"] = 3
    return changed


async def _sync_lazy_daily_state(user: dict) -> None:
    """Applies any pending energy/daily/arena/login resets (lazy migration
    evaluated on every authenticated request) and persists them if changed."""
    changed_e = ensure_energy_state(user)
    changed_d = ensure_daily_state(user)
    changed_a = ensure_arena_state(user)
    changed_l = ensure_login_state(user)
    changed_fs = ensure_free_summon_state(user)
    changed_bg = ensure_beginner_state(user)
    changed_ac = ensure_achievements_state(user)
    changed_prog = migrate_progression(user)
    if changed_e or changed_d or changed_a or changed_l or changed_fs or changed_bg or changed_ac:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "energy": user["energy"], "daily": user["daily"],
            "arena_rating": user["arena_rating"], "arena_wins": user["arena_wins"],
            "arena_losses": user["arena_losses"], "arena_daily": user["arena_daily"],
            "login": user["login"],
            "free_summons": user.get("free_summons"), "beginner": user.get("beginner"),
            "achievements": user.get("achievements"),
        }})
    if changed_prog:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "ninjas": user.get("ninjas", []), "prog_v": 3,
            "level": user.get("level", 1), "exp": user.get("exp", 0)}})


async def get_current_user(request: Request) -> dict:
    token = _extract_bearer_token(request)
    payload = _decode_access_token(token)
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    await _sync_lazy_daily_state(user)
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: str = Field(min_length=1, max_length=24)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TeamIn(BaseModel):
    team: List[str]


class BattleCompleteIn(BaseModel):
    stage_id: str
    result: str  # "win" | "lose"
    participants: List[str] = []  # instance_ids that fought
    survivors: List[str] = []     # instance_ids still alive at the end
    difficulty: str = "normal"    # "normal" | "hard" | "difficult" | "extreme"


class SummonIn(BaseModel):
    currency: str = "ryo"  # "ryo" | "ticket" | "gems"
    count: int = 1         # 1 | 10


class EvolveIn(BaseModel):
    instance_id: str


class GearEquipIn(BaseModel):
    gear_id: str
    instance_id: str


class GearUnequipIn(BaseModel):
    gear_id: str


class GearEnhanceIn(BaseModel):
    gear_id: str


class GearCraftIn(BaseModel):
    slot: str


class FuseIn(BaseModel):
    target_id: str  # item to create (see FUSION_RECIPES)
    qty: int = 1


class GearSummonIn(BaseModel):
    currency: str = "gems"  # "gems" | "ticket"
    count: int = 1


class UseExpIn(BaseModel):
    instance_id: str
    item_id: str
    qty: int = 1


class ForgeProduceIn(BaseModel):
    category: str   # e.g. "hp_potion"
    tier: int        # 1-200


class AscendIn(BaseModel):
    instance_id: str


class StarUpIn(BaseModel):
    instance_id: str


class ReforgeIn(BaseModel):
    instance_id: str
    jutsu_id: str
    modifier_id: str


class RevertIn(BaseModel):
    instance_id: str


class SpireCompleteIn(BaseModel):
    floor: int
    result: str
    participants: List[str] = []
    survivors: List[str] = []
    spire_path: str = "normal"  # "normal" | "fire" | "water" | "earth" | "light" | "dark"


class BattleStartIn(BaseModel):
    mode: str  # "campaign" | "spire" | "trial"
    id: str
    spire_path: str = "normal"  # "normal" | "fire" | "water" | "earth" | "light" | "dark"


class ArenaBattleStartIn(BaseModel):
    opponent_user_id: str


class ArenaBattleCompleteIn(BaseModel):
    opponent_user_id: str
    result: str
    participants: List[str] = []
    survivors: List[str] = []


class TrialCompleteIn(BaseModel):
    trial_id: str
    result: str
    participants: List[str] = []
    survivors: List[str] = []


class TsukuyomiCompleteIn(BaseModel):
    boss_id: str
    difficulty: str = "normal"
    result: str
    participants: List[str] = []
    survivors: List[str] = []


class ShopBuyIn(BaseModel):
    entry_id: str
    qty: int = 1


class HeroGenerateIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    concept: str = Field(default="", max_length=300)
    element: Optional[str] = None
    rarity: Optional[str] = None
    role: Optional[str] = None


class HeroSaveIn(BaseModel):
    id: Optional[str] = None
    name: str = Field(min_length=1, max_length=40)
    title: str = Field(default="", max_length=60)
    element: str
    rarity: str
    role: str
    lore: str = Field(default="", max_length=400)
    base_stats: dict
    portrait: Optional[str] = None
    jutsus: Optional[list] = None


class PortraitUploadIn(BaseModel):
    template_id: str
    image: str  # base64 (optionally a data URL)


class TranscendIn(BaseModel):
    instance_id: str


class CrystalEquipIn(BaseModel):
    crystal_id: str
    gear_id: str


class CrystalUnequipIn(BaseModel):
    crystal_id: str


class ArtDescribeIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    element: Optional[str] = None
    style: Optional[str] = None
    role: Optional[str] = None
    notes: str = Field(default="", max_length=300)


class ArtGenerateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=600)
    element: Optional[str] = None
    rarity: Optional[str] = None
    style: str = Field(default="anime", max_length=40)
    pose: str = Field(default="", max_length=200)
    model: str = "flash"  # "pro" | "flash"
    count: int = Field(default=4, ge=1, le=4)


# ---------------------------------------------------------------------------
# Energy & Daily Missions — lazy server-authoritative state (recomputed on
# every authenticated request via get_current_user; persisted only when it
# actually changes to avoid needless writes).
# ---------------------------------------------------------------------------
def ensure_energy_state(user: dict) -> bool:
    """Recompute energy regen from elapsed time. Returns True if changed."""
    old = user.get("energy")
    new = gd.compute_energy(old)
    changed = (
        not old
        or old.get("current") != new["current"]
        or old.get("last_regen_at") != new["last_regen_at"]
        or old.get("max") != new["max"]
    )
    user["energy"] = new
    return changed


def ensure_daily_state(user: dict) -> bool:
    """Reset daily missions if the UTC calendar day rolled over. Returns True if changed."""
    daily = user.get("daily")
    today = gd.daily_cycle_utc()
    if not daily or daily.get("cycle") != today:
        user["daily"] = gd.fresh_daily_state()
        return True
    # backfill any newly-added mission templates for an existing cycle
    added = False
    for m in gd.DAILY_MISSIONS:
        if m["id"] not in daily["missions"]:
            daily["missions"][m["id"]] = {"progress": 0, "claimed": False}
            added = True
    return added


def bump_mission(user: dict, event: str, amount: int = 1):
    """Increment progress for any daily mission tracking this event (capped at target)."""
    ensure_daily_state(user)
    daily = user["daily"]
    for m in gd.DAILY_MISSIONS:
        if m["event"] != event:
            continue
        prog = daily["missions"].setdefault(m["id"], {"progress": 0, "claimed": False})
        if not prog["claimed"]:
            prog["progress"] = min(m["target"], prog.get("progress", 0) + amount)
    bump_achievement(user, event, amount)


def bump_achievement(user: dict, event: str, amount: int = 1):
    """Increment progress for any event-based achievement tracking this event
    (capped at target). Metric-based achievements are derived live in
    achievements_public, so they need no bumping here."""
    ensure_achievements_state(user)
    ach = user["achievements"]
    for a in gd.ACHIEVEMENTS:
        if a.get("event") != event:
            continue
        prog = ach.setdefault(a["id"], {"progress": 0, "claimed": False})
        if not prog["claimed"]:
            prog["progress"] = min(a["target"], prog.get("progress", 0) + amount)


def achievements_public(user: dict) -> list:
    ensure_achievements_state(user)
    ach = user["achievements"]
    out = []
    for a in gd.ACHIEVEMENTS:
        st = ach.get(a["id"], {"progress": 0, "claimed": False})
        if "metric" in a:
            progress = min(a["target"], gd.achievement_metric(user, a["metric"]))
        else:
            progress = min(a["target"], st.get("progress", 0))
        out.append({
            "id": a["id"], "category": a["category"], "name": a["name"], "desc": a["desc"],
            "target": a["target"], "reward": a["reward"],
            "progress": progress, "complete": progress >= a["target"], "claimed": st.get("claimed", False),
        })
    return out


def beginner_public(user: dict) -> dict:
    b = user.get("beginner") or gd.fresh_beginner_state()
    locked = b.get("locked", [])
    current = b.get("current", [])
    # hydrate current template_ids into display dicts
    results = []
    for i, tid in enumerate(current):
        t = gd.CATALOG_BY_ID.get(tid)
        if not t:
            continue
        results.append({"index": i, "template_id": tid, "name": t["name"], "rarity": t["rarity"],
                        "element": t["element"], "role": t["role"], "portrait": t["portrait"],
                        "locked": i in locked})
    return {
        "finished": b.get("finished", False),
        "rolls_used": b.get("rolls_used", 0),
        "rolls_max": gd.BEGINNER_MAX_REROLLS,
        "locks_used": len(locked),
        "locks_max": gd.BEGINNER_MAX_LOCKS,
        "results": results,
    }


def free_summons_public(user: dict) -> dict:
    fs = user.get("free_summons") or gd.fresh_free_summon_state()
    return {
        "gem_used": fs.get("gem_used", 0), "gem_max": gd.FREE_GEM_SUMMONS_PER_DAY,
        "coin_used": fs.get("coin_used", 0), "coin_max": gd.FREE_COIN_SUMMONS_PER_DAY,
        "cycle": fs.get("cycle"),
    }


def _stepup_used(user: dict) -> int:
    """Resolves the step-up summons used counter, migrating from the legacy
    stepup_claimed milestone list if the new field doesn't exist yet."""
    used = user.get("step_up_summons_used")
    if used is not None:
        return used
    # Legacy migration: old system tracked claimed milestones as a list.
    # The level-1 milestone was a freebie that doesn't exist in the new
    # floor(level/10) system, so exclude it from the count.
    claimed = user.get("stepup_claimed") or []
    return len([m for m in claimed if m != 1])


def stepup_public(user: dict) -> dict:
    """Step-up summon status: earned vs used vs available, calculated
    deterministically from the player's current level."""
    level = user.get("level", 1)
    used = _stepup_used(user)
    total_earned = ex.stepup_total_earned(level)
    available = max(0, total_earned - used)
    return {
        "total_earned": total_earned,
        "used": used,
        "available": available,
        "level": level,
        "next_milestone": ex.stepup_next_milestone(level),
        "progress_to_next": level % ex.STEPUP_EVERY,
        "pull_count": ex.STEPUP_PULL_COUNT,
        "rates": ex.stepup_rates(),
    }


def missions_public(daily: dict) -> list:
    out = []
    for m in gd.DAILY_MISSIONS:
        prog = daily["missions"].get(m["id"], {"progress": 0, "claimed": False})
        out.append({**m, "progress": prog["progress"], "claimed": prog["claimed"],
                    "complete": prog["progress"] >= m["target"]})
    return out


def ensure_login_state(user: dict) -> bool:
    """Seeds the daily-login-streak tracker for existing users who don't
    have one yet. Does not itself grant/roll anything — /game/login/claim
    handles that explicitly so it's a deliberate player action."""
    if "login" not in user:
        user["login"] = gd.fresh_login_state()
        return True
    return False


def ensure_free_summon_state(user: dict) -> bool:
    """Seeds + UTC-daily-resets the free daily summon counters (1 Gem, 3 Ryo)."""
    fs = user.get("free_summons")
    today = gd.daily_cycle_utc()
    if not fs or fs.get("cycle") != today:
        user["free_summons"] = gd.fresh_free_summon_state()
        return True
    return False


def ensure_beginner_state(user: dict) -> bool:
    """Seeds the one-time beginner summon session for users who lack it."""
    if "beginner" not in user:
        user["beginner"] = gd.fresh_beginner_state()
        return True
    return False


def ensure_achievements_state(user: dict) -> bool:
    """Seeds + backfills the achievements progress tracker."""
    ach = user.get("achievements")
    if not ach:
        user["achievements"] = gd.fresh_achievements_state()
        return True
    added = False
    for a in gd.ACHIEVEMENTS:
        if a["id"] not in ach:
            ach[a["id"]] = {"progress": 0, "claimed": False}
            added = True
    return added


def ensure_arena_state(user: dict) -> bool:
    """Seeds Arena rating/win-loss fields and resets the daily attempt
    counter on UTC rollover. Returns True if anything changed."""
    changed = False
    if "arena_rating" not in user:
        user["arena_rating"] = gd.ARENA_RATING_DEFAULT
        changed = True
    if "arena_wins" not in user:
        user["arena_wins"] = 0
        changed = True
    if "arena_losses" not in user:
        user["arena_losses"] = 0
        changed = True
    arena_daily = user.get("arena_daily")
    today = gd.daily_cycle_utc()
    if not arena_daily or arena_daily.get("cycle") != today:
        user["arena_daily"] = gd.fresh_arena_daily_state()
        changed = True
    return changed


def arena_public(user: dict) -> dict:
    ad = user.get("arena_daily") or gd.fresh_arena_daily_state()
    return {
        "rating": user.get("arena_rating", gd.ARENA_RATING_DEFAULT),
        "wins": user.get("arena_wins", 0),
        "losses": user.get("arena_losses", 0),
        "attempts_used": ad.get("attempts_used", 0),
        "attempts_max": gd.ARENA_ATTEMPTS_MAX,
    }


def login_public(user: dict) -> dict:
    """Daily-login-streak status for the HUD: which day of the 7-day cycle
    the player is on, whether today's reward is still unclaimed, and a
    preview of tomorrow's reward so the UI can tease it."""
    login = user.get("login") or gd.fresh_login_state()
    today = gd.daily_cycle_utc()
    claimed_today = login.get("last_claim_date") == today
    next_day = (login.get("day", 0) % 7) + 1
    return {
        "day": login.get("day", 0),
        "claimed_today": claimed_today,
        "next_day": next_day,
        "next_reward": gd.LOGIN_REWARDS[next_day],
    }


async def upsert_arena_snapshot(user: dict):
    """Freezes the player's current saved team into db.arena_snapshots so
    Arena matchmaking never depends on the opponent's live/mutable state."""
    ninjas = user.get("ninjas", [])
    team = user.get("team", [])
    snap_team = []
    power = 0
    for tid in team:
        inst = next((n for n in ninjas if n["instance_id"] == tid), None)
        if not inst or inst["template_id"] not in gd.CATALOG_BY_ID:
            continue
        asc = inst.get("ascension", 0)
        snap_team.append({"template_id": inst["template_id"], "level": inst["level"], "ascension": asc})
        power += gd.ninja_power(inst["template_id"], inst["level"], asc)
    if not snap_team:
        return
    await db.arena_snapshots.update_one(
        {"user_id": str(user["_id"])},
        {"$set": {
            "user_id": str(user["_id"]), "name": user.get("name", "Shinobi"), "level": user.get("level", 1),
            "team": snap_team, "power": power, "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


def arena_team_public(snapshot_team: list) -> list:
    """Enriches a stored {template_id,level,ascension} snapshot team with
    display fields (name/portrait/rarity/element) resolved from the live
    catalog, so a hero re-skinned/edited by an admin still renders correctly."""
    out = []
    for t in snapshot_team:
        tmpl = gd.CATALOG_BY_ID.get(t["template_id"])
        if not tmpl:
            continue
        out.append({**t, "name": tmpl["name"], "portrait": tmpl["portrait"],
                    "rarity": tmpl["rarity"], "element": tmpl["element"]})
    return out


# ---------------------------------------------------------------------------
# Game profile helpers
# ---------------------------------------------------------------------------
def new_ninja_instance(template_id: str, level: int = 1) -> dict:
    return {"instance_id": str(uuid.uuid4()), "template_id": template_id, "level": level, "exp": 0, "ascension": 0, "stars": 1, "skill_rank": 1}


def _star_bonus_mult(stars: int) -> float:
    """Each star beyond the 1st adds a permanent stat bonus (evolution is
    the ONLY way to gain stars) — this is what gives duplicate shards and
    rare evolution materials real long-term value."""
    return 1 + max(0, (stars or 1) - 1) * gd.STAR_BONUS_PER_STAR


def _power_from_stats(s: dict) -> int:
    return round(s["hp"] * 0.4 + s["atk"] * 2.2 + s["def"] * 1.6 + s["spd"] * 1.2 + s.get("chakra", 0) * 1.0)


def gear_public(g: dict) -> dict:
    """Serialize a gear instance with computed display values."""
    stat, _ = gd.GEAR_MAIN_BASE[g["slot"]]
    return {
        **g,
        "main_stat": stat,
        "main_value": gd.gear_main_value(g["slot"], g["rarity"], g.get("plus", 0)),
        "score": gd.gear_score(g),
        "set_name": gd.GEAR_SETS.get(g["set_id"], {}).get("name"),
        "enhance_cost": gd.gear_enhance_cost(g["rarity"], g.get("plus", 0)) if g.get("plus", 0) < gd.GEAR_ENHANCE_MAX else None,
    }


def _hydrate_ninja_instance(inst: dict, gear_by_hero: dict, crystal_by_gear: dict, user: dict) -> None:
    """Computes all derived fields (stats/power/gear/skill/etc.) for a single
    owned hero instance, mutating it in place. Returns early (no-op) if the
    hero's static template can't be found (e.g. a deleted custom hero)."""
    inst.setdefault("exp", 0)
    inst.setdefault("ascension", 0)
    inst.setdefault("stars", 1)
    asc = inst["ascension"]
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        return
    rarity = ex.effective_rarity(inst, tmpl)
    native_rarity = tmpl["rarity"]
    star_mult = _star_bonus_mult(inst["stars"])
    base_stats = ex.compute_stats_for_rarity(inst["template_id"], inst["level"], asc, rarity)
    star_stats = {k: (round(v * star_mult) if k in ("hp", "atk", "def") else v) for k, v in base_stats.items()}
    equipped = gear_by_hero.get(inst["instance_id"], [])
    geared = gd.apply_gear_to_stats(star_stats, equipped) if equipped else star_stats
    socketed = [crystal_by_gear[g["gear_id"]] for g in equipped if g["gear_id"] in crystal_by_gear]
    final_stats = ex.apply_crystals_to_stats(geared, socketed) if socketed else geared
    inst["rarity"] = rarity
    inst["native_rarity"] = native_rarity
    inst["evolved_rarity"] = inst.get("evolved_rarity") or native_rarity
    inst["stats"] = final_stats
    inst["power"] = _power_from_stats(final_stats)
    inst["equipped_gear"] = {g["slot"]: g["gear_id"] for g in equipped}
    inst["socketed_crystals"] = {g["slot"]: crystal_by_gear[g["gear_id"]]["crystal_id"] for g in equipped if g["gear_id"] in crystal_by_gear}
    inst["gear_score"] = sum(gd.gear_score(g) for g in equipped)
    inst["exp_to_next"] = gd.hero_exp_to_next(inst["level"])
    inst["level_cap"] = gd.level_cap(rarity, asc)
    inst["ascension_max"] = gd.ASCENSION_MAX[rarity]
    inst["max_level"] = gd.max_level(rarity)
    # Per-rarity star cap (R=3 ... GR=8). Evolution is possible while below cap.
    stars = inst.get("stars", 1)
    stars_max = gd.max_stars_for_rarity(rarity)
    inst["stars_max"] = stars_max
    inst["at_star_cap"] = stars >= stars_max
    inst["evolution_cost"] = gd.evolution_cost(rarity, stars) if stars < stars_max else None
    inst["star_up_cost"] = inst["evolution_cost"]["shards"] if inst["evolution_cost"] else None
    inst["faction"] = tmpl.get("faction")
    inst["role"] = tmpl.get("role")
    skill_rank = inst.get("skill_rank", 1)
    sk = gd.skill_public(rarity, skill_rank)
    inst["skill_rank"] = skill_rank
    inst["skill"] = sk
    inst["passive_full"] = tmpl.get("passive")
    inst["passive"] = tmpl.get("passive") if sk["passive_unlocked"] else None
    inst["passive_locked"] = not sk["passive_unlocked"]
    inst["shards"] = user.get("hero_shards", {}).get(inst["template_id"], 0)
    # Ascension (rarity tier raise) — unlocked once the hero reaches its
    # current rarity's star cap. Costs shards + gold (+ elemental essence).
    asc_target = ex.transcendence_target(rarity)
    asc_cost = ex.transcendence_cost(rarity, tmpl.get("element"))
    inst["ascension_target"] = asc_target
    inst["ascension_cost"] = asc_cost
    inst["ascension_benefits"] = prog.get_ascension_benefits(asc_target) if asc_target else []
    inst["can_ascend_rarity"] = bool(asc_target and stars >= stars_max)
    # Kept for backward compatibility with older clients.
    inst["transcendence_target"] = asc_target
    inst["transcendence_cost"] = asc_cost
    # Ascension skill scaling — how many tiers above native, for battle.
    native_order = gd.RARITY_ORDER.get(native_rarity, 1)
    eff_order = gd.RARITY_ORDER.get(rarity, native_order)
    inst["ascension_tiers"] = max(0, eff_order - native_order)
    _askill = prog.ascension_skill_multipliers(native_order, eff_order)
    inst["ascension_skill_power_mult"] = round(_askill["power_mult"], 4)
    inst["ascension_skill_effect_mult"] = round(_askill["effect_mult"], 4)
    # Reforge — per-jutsu unlocked combat modifiers (burn/stun/extra dmg/etc.)
    inst_reforge = inst.get("reforge", {}) or {}
    inst["reforge"] = inst_reforge
    inst["reforge_next_cost"] = gd.reforge_cost(rarity, gd.reforge_total(inst_reforge))


def public_user(user: dict) -> dict:
    """Serialize a user document into a JSON-safe game profile."""
    ninjas = user.get("ninjas", [])
    gear_all = user.get("gear", [])
    gear_by_hero = {}
    for g in gear_all:
        if g.get("equipped_by"):
            gear_by_hero.setdefault(g["equipped_by"], []).append(g)
    crystal_all = user.get("crystals", [])
    crystal_by_gear = {}
    for c in crystal_all:
        gid = c.get("socketed_in")
        if gid:
            crystal_by_gear[gid] = c
    for inst in ninjas:
        _hydrate_ninja_instance(inst, gear_by_hero, crystal_by_gear, user)
    team_ids = set(user.get("team", []))
    team_power = sum(i.get("power", 0) for i in ninjas if i["instance_id"] in team_ids)
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", "Shinobi"),
        "role": user.get("role", "player"),
        "level": user.get("level", 1),
        "exp": user.get("exp", 0),
        "exp_to_next": gd.exp_to_next(user.get("level", 1)),
        "ryo": user.get("ryo", 0),
        "gems": user.get("gems", 0),
        "ninjas": ninjas,
        "inventory": user.get("inventory", {}),
        "hero_shards": user.get("hero_shards", {}),
        "gear": [gear_public(g) for g in gear_all],
        "crystals": [ex.crystal_public(c) for c in crystal_all],
        "crystal_config": {
            "tiers": ex.CRYSTAL_TIERS,
            "drop_fraction": ex.CRYSTAL_DROP_FRACTION,
        },
        "stepup": stepup_public(user),
        "pity": user.get("pity") or gd.fresh_pity_state(),
        "team": user.get("team", []),
        "cleared_stages": user.get("cleared_stages", []),
        "spire_floor": user.get("spire_floor", 0),
        "spire_floors": user.get("spire_floors", {}),
        "wins": user.get("wins", 0),
        "losses": user.get("losses", 0),
        "team_power": team_power,
        "team_cap": gd.max_team_size(user.get("level", 1)),
        "next_slot_level": gd.next_slot_level(user.get("level", 1)),
        "energy": user.get("energy") or gd.compute_energy(None),
        "missions": missions_public(user.get("daily") or gd.fresh_daily_state()),
        "arena": arena_public(user),
        "login": login_public(user),
        "beginner": beginner_public(user),
        "free_summons": free_summons_public(user),
        "achievements": achievements_public(user),
        "forge_level": user.get("forge_level", 1),
        "forge_xp": user.get("forge_xp", 0),
    }


async def grant_player_exp(user: dict, amount: int) -> Optional[dict]:
    """Adds player XP, processing any level-ups. Each level gained awards
    rewards (ryo/gems/items) from the centralized player_progression table.
    Returns None if no level-up occurred, or a level-up summary dict:
        {old_level, new_level, levels_gained, is_milestone, rewards: [...],
         total_rewards: {ryo, gems, items}}
    Multiple level-ups are processed in one pass — all rewards are granted,
    nothing is lost."""
    old_level = user.get("level", 1)
    level = old_level
    exp = user.get("exp", 0) + amount
    levels_gained = []
    while exp >= gd.exp_to_next(level):
        exp -= gd.exp_to_next(level)
        level += 1
        rewards = pp.get_level_rewards(level)
        # Apply rewards immediately
        user["ryo"] = user.get("ryo", 0) + rewards["ryo"]
        user["gems"] = user.get("gems", 0) + rewards["gems"]
        inv = user.get("inventory", {})
        for iid, qty in rewards["items"].items():
            inv[iid] = inv.get(iid, 0) + qty
        user["inventory"] = inv
        levels_gained.append(rewards)
    user["level"] = level
    user["exp"] = exp
    if not levels_gained:
        return None
    # Aggregate total rewards across all gained levels
    total = {"ryo": 0, "gems": 0, "items": {}}
    any_milestone = False
    for r in levels_gained:
        total["ryo"] += r["ryo"]
        total["gems"] += r["gems"]
        for iid, qty in r["items"].items():
            total["items"][iid] = total["items"].get(iid, 0) + qty
        if r["is_milestone"]:
            any_milestone = True
    return {
        "old_level": old_level,
        "new_level": level,
        "levels_gained": len(levels_gained),
        "is_milestone": any_milestone,
        "rewards": levels_gained,
        "total_rewards": total,
    }


def grant_hero_exp(inst: dict, amount: int) -> int:
    """Add EXP to a hero, auto-leveling up to its cap. Returns levels gained.
    Uses the hero's EFFECTIVE (ascended) rarity so an ascended hero can level
    toward the higher cap its new tier unlocks."""
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        return 0
    rarity = ex.effective_rarity(inst, tmpl)
    cap = gd.level_cap(rarity, inst.get("ascension", 0))
    inst["exp"] = inst.get("exp", 0) + amount
    gained = 0
    while inst["level"] < cap and inst["exp"] >= gd.hero_exp_to_next(inst["level"]):
        inst["exp"] -= gd.hero_exp_to_next(inst["level"])
        inst["level"] += 1
        gained += 1
    if inst["level"] >= cap:
        # clamp stored exp so the bar reads full at cap
        inst["exp"] = min(inst["exp"], gd.hero_exp_to_next(inst["level"]))
    return gained


def distribute_hero_exp(user: dict, participants: list, survivors: list, base: int) -> list:
    """Grant battle EXP to each participant (survivors get more). Returns per-hero log."""
    ninjas = user.get("ninjas", [])
    surv = set(survivors)
    out = []
    for iid in participants:
        inst = next((n for n in ninjas if n["instance_id"] == iid), None)
        if not inst:
            continue
        gain = round(base * (1.6 if iid in surv else 0.8))
        levels = grant_hero_exp(inst, gain)
        t = gd.CATALOG_BY_ID.get(inst["template_id"], {})
        out.append({"instance_id": iid, "name": t.get("name", "?"), "exp": gain, "levels": levels, "level": inst["level"]})
    return out


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    starters = [new_ninja_instance(tid) for tid in gd.STARTER_NINJAS]
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "player",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "level": 1,
        "exp": 0,
        "ryo": 500,
        "gems": 100,
        "inventory": {"exp_tome_minor": 5, "exp_tome_greater": 1, "summon_ticket": 1},
        "ninjas": starters,
        "team": [s["instance_id"] for s in starters],
        "cleared_stages": [],
        "wins": 0,
        "losses": 0,
        "energy": gd.compute_energy(None),
        "daily": gd.fresh_daily_state(),
        "login": gd.fresh_login_state(),
        "arena_rating": gd.ARENA_RATING_DEFAULT,
        "arena_wins": 0,
        "forge_level": 1,
        "forge_xp": 0,
        "arena_losses": 0,
        "arena_daily": gd.fresh_arena_daily_state(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    uid = str(res.inserted_id)
    await upsert_arena_snapshot(doc)
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return public_user(doc)


@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        response.set_cookie("access_token", create_access_token(str(user["_id"]), user["email"]),
                            httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------------------------------------------------------------------------
# Game endpoints
# ---------------------------------------------------------------------------
@api_router.get("/game/catalog")
async def catalog():
    return {"ninjas": gd.NINJA_CATALOG, "element_advantage": gd.ELEMENT_ADVANTAGE,
            "items": gd.ITEMS, "summon_cost": gd.SUMMON_COST, "gold_summon_x10_cost": gd.GOLD_SUMMON_X10_COST,
            "trials": gd.TRIALS + gd.DUNGEON_TRIALS,
            "banner": banner_info(), "factions": gd.FACTIONS, "roles": gd.ROLES,
            "tags": gd.TAGS, "rarities": gd.RARITIES,
            "enemy_templates": [gd.CATALOG_BY_ID.get(t["id"], t) for t in gd.NIGHTMARE_BOSS_TEMPLATES],
            "gem_costs": {
                "summon": gd.GEM_SUMMON_COST,
                "energy_refill_per_point": gd.GEM_ENERGY_REFILL_COST_PER_POINT,
                "energy_refill_min": gd.GEM_ENERGY_REFILL_MIN_COST,
            },
            # --- Phase J1 expansion config (data-driven; UI renders from this) ---
            "summon_rates": gd.summon_rates("gems"),
            "summon_rates_ryo": gd.summon_rates("ryo"),
            "pity_config": {
                "soft_pity_start": gd.MYTHIC_SOFT_PITY_START,
                "hard_pity": gd.MYTHIC_HARD_PITY,
                "featured_5050": gd.FEATURED_MYTHIC_5050,
                "x10_guarantee_rarity": gd.X10_GUARANTEE_RARITY,
                "pity_rarity": gd.TOP_RARITY,
                "pity_currencies": ["gems", "ticket"],
            },
            "gear_config": {
                "slots": gd.GEAR_SLOTS, "slot_meta": gd.GEAR_SLOT_META,
                "rarities": gd.GEAR_RARITIES, "rarity_meta": gd.GEAR_RARITY_META,
                "sets": gd.GEAR_SETS, "enhance_max": gd.GEAR_ENHANCE_MAX,
                "summon_gem_cost": gd.GEAR_SUMMON_GEM_COST, "summon_rates": gd.GEAR_SUMMON_RATES,
            },
            "craft_recipes": gd.CRAFT_RECIPES,
            "fusion_recipes": gd.FUSION_RECIPES,
            "exp_tome_gold_cost": gd.EXP_TOME_GOLD_COST,
            "reforge_modifiers": gd.REFORGE_MODIFIERS,
            "reforge_max_per_jutsu": gd.REFORGE_MAX_PER_JUTSU,
            "production_categories": gd.FORGE_PRODUCTION_CATEGORIES,
            "forge_max_level": gd.FORGE_MAX_LEVEL,
            "progression_config": {
                "ascension_ladder": prog.ASCENSION_LADDER,
                "max_stars": prog.MAX_STARS,
                "evolution_shard_costs": prog.EVOLUTION_SHARD_COST_BY_STAR,
                "ascension_costs": prog.ASCENSION_COSTS,
                "ascension_benefits": prog.ASCENSION_BENEFITS,
                "elemental_essence_enabled": prog.ELEMENTAL_ESSENCE_ENABLED,
                "element_essence": prog.ELEMENT_ESSENCE,
                "star_bonus_per_star": gd.STAR_BONUS_PER_STAR,
            },
            "dungeons": [
                {**d, "tiers": [
                    {"id": t["id"], "tier": t["tier"], "name": t["name"], "enemies": t["enemies"],
                     "rewards": {k: v for k, v in t["rewards"].items() if k != "blueprint_chance"},
                     "blueprint_chance": t["rewards"].get("blueprint_chance"),
                     "has_gear_drop": bool(t.get("gear_drop")),
                     "recommended_power": gd.dungeon_recommended_power(t)}
                    for t in gd.DUNGEON_TRIALS if t["dungeon_id"] == d["id"]
                ]} for d in gd.DUNGEONS
            ]}


@api_router.get("/game/stages")
async def stages():
    # boss_mechanics ships the reusable phase framework (shield/enrage/
    # elemental-shift definitions) referenced by `boss_mechanic` on boss
    # stages, so the client combat engine can resolve them during battle.
    #
    # The World Map (Campaign UI) needs two purely presentational, additive
    # fields that don't exist on the raw stage dicts: a computed
    # `recommended_power` (sum of enemy combat power, so the client can show
    # "your squad vs. this fight" without re-deriving formulas) and a short
    # `chapters` list of {chapter, name, lore} for the chapter navigator.
    # Neither touches STAGES itself — no stage/chapter data is invented.
    enriched_stages = []
    for s in gd.STAGES:
        enriched = gd.enrich_stage_enemies(s)
        rp = sum(gd._enemy_power_with_gear(e) for e in enriched["enemies"])
        enriched_stages.append({**enriched, "recommended_power": rp})
    chapter_nums = sorted(set(s["chapter"] for s in gd.STAGES))
    chapters = [{"chapter": c, **gd.chapter_meta(c)} for c in chapter_nums]
    return {"stages": enriched_stages, "boss_mechanics": gd.BOSS_MECHANICS, "chapters": chapters}


# ---------------------------------------------------------------------------
# Boss Hunt — global combat depth expansion endpoints
# ---------------------------------------------------------------------------
@api_router.get("/game/boss-hunt")
async def boss_hunt_list():
    """Returns all Boss Hunt boss configurations with their combat modifiers,
    traits, and strategy hints for the UI."""
    from boss_configs import get_all_boss_hunt_configs
    from combat_modifiers import combat_modifiers_summary
    bosses = []
    for boss in get_all_boss_hunt_configs():
        mods = boss.get("combat_modifiers", {})
        summary = combat_modifiers_summary(mods)
        bosses.append({
            "id": boss["id"],
            "name": boss["name"],
            "title": boss.get("title", ""),
            "template_id": boss["template_id"],
            "element": boss["element"],
            "rarity": boss.get("rarity", ""),
            "level": boss.get("level", 60),
            "difficulty": boss["difficulty"],
            "traits": boss["traits"],
            "strategy": boss["strategy"],
            "vulnerability_hint": boss["vulnerability_hint"],
            "archetype": boss["archetype"],
            "boss_mechanic": boss.get("boss_mechanic"),
            "escalating_damage": boss.get("escalating_damage", False),
            "combat_summary": summary,
            "rewards": boss.get("rewards", {}),
        })
    return {"bosses": bosses}


@api_router.get("/game/team-synergy")
async def team_synergy(user: dict = Depends(get_current_user)):
    """Evaluates the player's current team composition and returns active
    synergies + bonuses for the Team Builder UI."""
    from team_synergy import get_synergy_bonuses_for_team
    result = get_synergy_bonuses_for_team(user.get("team", []), user)
    return result


# ---------------------------------------------------------------------------
# Combat modifiers catalog — for UI display and debugging
# ---------------------------------------------------------------------------
@api_router.get("/game/combat-modifiers")
async def combat_modifiers_catalog():
    """Returns the enemy archetype catalog and combat modifier definitions
    for documentation and UI purposes."""
    from combat_modifiers import ENEMY_ARCHETYPES, combat_modifiers_summary
    archetypes = []
    for aid, arch in ENEMY_ARCHETYPES.items():
        summary = combat_modifiers_summary(arch.get("modifiers", {}))
        archetypes.append({
            "id": aid,
            "name": arch["name"],
            "modifiers": arch["modifiers"],
            "traits": arch.get("traits", []),
            "weakness_hint": arch.get("weakness_hint", ""),
            "summary": summary,
        })
    return {"archetypes": archetypes}


@api_router.post("/game/boss-hunt/complete")
async def boss_hunt_complete(body: dict, user: dict = Depends(get_current_user)):
    """Complete a Boss Hunt battle and award rewards."""
    from boss_configs import get_boss_hunt_config

    boss_id = body.get("boss_id", "")
    result = body.get("result", "lose")
    participants = body.get("participants", [])
    survivors = body.get("survivors", [])

    boss_config = get_boss_hunt_config(boss_id)
    if not boss_config:
        raise FastAPIException(status_code=404, detail="Boss Hunt boss not found")

    rewards = {"ryo": 0, "gems": 0, "exp": 0, "hero_exp": []}

    if result == "win":
        rarity_mult = {
            "UR": 1.5, "LR": 2.5, "GR": 4.0,
        }.get(boss_config.get("rarity", "UR"), 1.0)

        base_rewards = boss_config.get("rewards", {})
        rewards["ryo"] = round(base_rewards.get("ryo", 800) * rarity_mult)
        rewards["gems"] = round(base_rewards.get("gems", 30) * rarity_mult)
        rewards["exp"] = round(base_rewards.get("exp", 300) * rarity_mult)

        # Apply rewards
        user["ryo"] = user.get("ryo", 0) + rewards["ryo"]
        user["gems"] = user.get("gems", 0) + rewards["gems"]

        # Track cleared bosses
        cleared_bosses = user.get("cleared_bosses", [])
        if boss_id not in cleared_bosses:
            cleared_bosses.append(boss_id)
            # First-clear bonus
            rewards["gems"] += 50
            rewards["first_clear"] = True

        await db.users.update_one({"_id": user["_id"]}, {
            "$set": {"ryo": user["ryo"], "gems": user["gems"], "cleared_bosses": cleared_bosses},
        })

    return {"result": result, "rewards": rewards, "profile": public_user(user)}


@api_router.get("/game/profile")
async def profile(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.put("/game/team")
async def set_team(body: TeamIn, user: dict = Depends(get_current_user)):
    owned = {i["instance_id"] for i in user.get("ninjas", [])}
    cap = gd.max_team_size(user.get("level", 1))
    team = [tid for tid in body.team if tid in owned][:cap]
    if not team:
        raise HTTPException(status_code=400, detail="Team must contain at least one owned ninja")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"team": team}})
    user["team"] = team
    await upsert_arena_snapshot(user)
    return public_user(user)


@api_router.get("/game/energy")
async def get_energy(user: dict = Depends(get_current_user)):
    return {"energy": user["energy"]}


@api_router.post("/game/energy/refill")
async def refill_energy(user: dict = Depends(get_current_user)):
    """Instantly tops Energy up to max, spending Gems. Cost scales with how
    much is actually missing, with a small minimum so a near-full refill
    isn't free."""
    current_state = gd.compute_energy(user.get("energy"))
    missing = current_state["max"] - current_state["current"]
    if missing <= 0:
        raise HTTPException(status_code=400, detail="Energy is already full")
    cost = max(gd.GEM_ENERGY_REFILL_MIN_COST, missing * gd.GEM_ENERGY_REFILL_COST_PER_POINT)
    if user.get("gems", 0) < cost:
        raise HTTPException(status_code=400, detail=f"Not enough Gems — need {cost}, have {user.get('gems', 0)}")
    user["gems"] = user.get("gems", 0) - cost
    new_energy = {**current_state, "current": current_state["max"], "last_regen_at": datetime.now(timezone.utc).isoformat(), "next_tick_in": 0, "full_in": 0}
    user["energy"] = new_energy
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"energy": new_energy, "gems": user["gems"]}})
    return {"profile": public_user(user), "cost": cost}


@api_router.post("/game/login/claim")
async def claim_login_reward(user: dict = Depends(get_current_user)):
    """Claims today's daily-login reward and advances the 7-day streak.
    Missing a calendar day (UTC) resets the streak back to day 1."""
    login = user.get("login") or gd.fresh_login_state()
    today = gd.daily_cycle_utc()
    if login.get("last_claim_date") == today:
        raise HTTPException(status_code=400, detail="Already claimed today's reward")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    new_day = (login.get("day", 0) % 7) + 1 if login.get("last_claim_date") == yesterday else 1
    reward = gd.LOGIN_REWARDS[new_day]

    user["ryo"] = user.get("ryo", 0) + reward.get("ryo", 0)
    user["gems"] = user.get("gems", 0) + reward.get("gems", 0)
    inventory = user.get("inventory", {})
    for iid, qty in reward.get("items", {}).items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    login["day"] = new_day
    login["last_claim_date"] = today
    user["login"] = login

    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user["gems"], "inventory": inventory, "login": login,
    }})
    return {"profile": public_user(user), "reward": reward, "day": new_day}


_SPIRE_PATH_ELEMENTS = {"fire": "Fire", "water": "Water", "earth": "Earth", "light": "Light", "dark": "Dark"}


def _validate_spire_element(path: str, user: dict) -> None:
    """Ensures every hero in the player's active team matches the elemental
    Spire's required element.  Enforced server-side so it cannot be bypassed
    via direct API calls, saved formations, or client tampering."""
    required = _SPIRE_PATH_ELEMENTS.get(path)
    if not required:
        return
    team = user.get("team", [])
    for iid in team:
        inst = next((n for n in user.get("ninjas", []) if n.get("instance_id") == iid), None)
        if not inst:
            continue
        tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
        if tmpl and tmpl.get("element") != required:
            raise HTTPException(status_code=403, detail=f"{required.upper()} SPIRE requires a {required}-only team")


def _validate_battle_target(mode: str, target_id: str, user: dict = None) -> None:
    """Raises 404/400/403 if the requested stage/trial/boss/floor doesn't exist
    or is locked."""
    if mode == "campaign" and target_id not in gd.STAGES_BY_ID:
        raise HTTPException(status_code=404, detail="Stage not found")
    if mode == "trial" and target_id not in gd.TRIALS_BY_ID:
        raise HTTPException(status_code=404, detail="Trial not found")
    if mode == "tsukuyomi" and target_id not in gd.TSUKUYOMI_BY_ID:
        raise HTTPException(status_code=404, detail="Nightmare not found")
    if mode == "tsukuyomi" and user is not None:
        boss = gd.TSUKUYOMI_BY_ID.get(target_id)
        progress = user.get("tsukuyomi") or {}
        highest_cleared = user.get("tsukuyomi_highest_cleared", 0)
        status = gd.tsukuyomi_boss_status(boss, progress, highest_cleared)
        if status == "locked":
            raise HTTPException(status_code=403, detail=f"Clear all difficulties of Nightmare {boss['index'] - 1} to unlock this stage")
    if mode == "spire":
        try:
            if int(target_id) < 1:
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid floor")


@api_router.post("/game/battle/start")
async def battle_start(body: BattleStartIn, user: dict = Depends(get_current_user)):
    """Consumes Energy for a Campaign/Spire/Trial attempt. Must be called before
    entering the client-side battle screen; the attempt is charged regardless
    of the eventual win/lose outcome (standard gacha-game convention)."""
    mode = body.mode
    if mode not in gd.ENERGY_COST:
        raise HTTPException(status_code=400, detail="Invalid battle mode")
    _validate_battle_target(mode, body.id, user)

    # Elemental Spire: enforce element-only team restriction at battle start
    if mode == "spire" and body.spire_path != "normal":
        _validate_spire_element(body.spire_path, user)

    cost = gd.ENERGY_COST[mode]
    new_energy = gd.spend_energy(user.get("energy"), cost)
    if new_energy is None:
        current = gd.compute_energy(user.get("energy"))["current"]
        raise HTTPException(status_code=400, detail=f"Not enough Energy — need {cost}, have {current}")
    user["energy"] = new_energy
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"energy": new_energy}})
    return {"ok": True, "cost": cost, "profile": public_user(user)}


@api_router.get("/game/missions")
async def get_missions(user: dict = Depends(get_current_user)):
    return {"missions": missions_public(user["daily"]), "cycle": user["daily"]["cycle"]}


@api_router.post("/game/missions/claim/{mission_id}")
async def claim_mission(mission_id: str, user: dict = Depends(get_current_user)):
    tmpl = gd.DAILY_MISSIONS_BY_ID.get(mission_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Mission not found")
    prog = user["daily"]["missions"].get(mission_id, {"progress": 0, "claimed": False})
    if prog["claimed"]:
        raise HTTPException(status_code=400, detail="Reward already claimed")
    if prog["progress"] < tmpl["target"]:
        raise HTTPException(status_code=400, detail="Mission not complete yet")

    reward = tmpl["reward"]
    user["ryo"] = user.get("ryo", 0) + reward.get("ryo", 0)
    user["gems"] = user.get("gems", 0) + reward.get("gems", 0)
    inventory = user.get("inventory", {})
    for iid, qty in reward.get("items", {}).items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    prog["claimed"] = True
    user["daily"]["missions"][mission_id] = prog

    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user["gems"], "inventory": inventory, "daily": user["daily"]}})
    return {"profile": public_user(user), "reward": reward}


# ---------------------------------------------------------------------------
# Arena (async PvP) — fight a frozen snapshot of another player's saved team.
# ---------------------------------------------------------------------------
@api_router.get("/arena/status")
async def arena_status(user: dict = Depends(get_current_user)):
    return {"arena": arena_public(user)}


@api_router.post("/arena/opponent")
async def arena_opponent(user: dict = Depends(get_current_user)):
    """Free matchmaking preview — does not consume an attempt. Picks a random
    snapshotted team belonging to another player."""
    pipeline = [{"$match": {"user_id": {"$ne": str(user["_id"])}}}, {"$sample": {"size": 1}}]
    docs = await db.arena_snapshots.aggregate(pipeline).to_list(1)
    if not docs:
        raise HTTPException(status_code=404, detail="No challengers available yet — check back soon!")
    snap = docs[0]
    return {"opponent": {
        "user_id": snap["user_id"], "name": snap["name"], "level": snap["level"],
        "power": snap.get("power", 0), "team": arena_team_public(snap["team"]),
    }}


@api_router.post("/arena/battle/start")
async def arena_battle_start(body: ArenaBattleStartIn, user: dict = Depends(get_current_user)):
    """Consumes 1 daily Arena attempt and locks in the opponent's frozen team
    for the fight the client is about to play out."""
    ad = user.get("arena_daily") or gd.fresh_arena_daily_state()
    if ad.get("attempts_used", 0) >= gd.ARENA_ATTEMPTS_MAX:
        raise HTTPException(status_code=400, detail=f"No Arena attempts left today ({gd.ARENA_ATTEMPTS_MAX}/day) — come back tomorrow!")
    snap = await db.arena_snapshots.find_one({"user_id": body.opponent_user_id})
    if not snap:
        raise HTTPException(status_code=404, detail="Opponent is no longer available — find another challenger")
    if snap["user_id"] == str(user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot challenge yourself")

    ad["attempts_used"] = ad.get("attempts_used", 0) + 1
    user["arena_daily"] = ad
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"arena_daily": ad}})

    return {"profile": public_user(user), "opponent": {
        "user_id": snap["user_id"], "name": snap["name"], "level": snap["level"],
        "power": snap.get("power", 0), "team": arena_team_public(snap["team"]),
    }}


@api_router.post("/arena/battle/complete")
async def arena_battle_complete(body: ArenaBattleCompleteIn, user: dict = Depends(get_current_user)):
    """Records the outcome of an Arena fight (attempt was already deducted
    at /arena/battle/start). Win grants Ryo + hero EXP and raises rating;
    loss only lowers rating (no attempt refund, matching PvE convention)."""
    if body.result == "win":
        user["arena_rating"] = user.get("arena_rating", gd.ARENA_RATING_DEFAULT) + gd.ARENA_RATING_WIN
        user["arena_wins"] = user.get("arena_wins", 0) + 1
        user["ryo"] = user.get("ryo", 0) + gd.ARENA_WIN_REWARDS["ryo"]
        gems_gained = 0
        if user["arena_wins"] % gd.ARENA_WIN_MILESTONE_EVERY == 0:
            gems_gained = gd.ARENA_WIN_MILESTONE_GEMS
            user["gems"] = user.get("gems", 0) + gems_gained
        hero_exp = distribute_hero_exp(
            user, body.participants or list(user.get("team", [])), body.survivors, gd.ARENA_WIN_REWARDS["hero_exp_base"]
        )
        level_up = await grant_player_exp(user, gd.ARENA_WIN_REWARDS["hero_exp_base"])
        bump_mission(user, "any_win")
        bump_mission(user, "arena_win")
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "arena_rating": user["arena_rating"], "arena_wins": user["arena_wins"],
            "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"],
            "level": user["level"], "exp": user["exp"], "daily": user["daily"], "achievements": user.get("achievements"),
        }})
        return {"profile": public_user(user), "result": "win",
                "rewards": {"ryo": gd.ARENA_WIN_REWARDS["ryo"], "gems": gems_gained, "hero_exp": hero_exp},
                "level_up": level_up}
    else:
        user["arena_rating"] = max(0, user.get("arena_rating", gd.ARENA_RATING_DEFAULT) - gd.ARENA_RATING_LOSS)
        user["arena_losses"] = user.get("arena_losses", 0) + 1
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "arena_rating": user["arena_rating"], "arena_losses": user["arena_losses"]}})
        return {"profile": public_user(user), "result": "lose", "rewards": None}


def _distribute_battle_hero_exp(user: dict, participants: list, survivors: set, base_exp: int) -> list:
    """Grants hero EXP to each participant (survivors get 1.6x, fallen 0.8x)
    and returns the per-hero breakdown for the rewards payload."""
    ninjas = user.get("ninjas", [])
    hero_exp = []
    for iid in participants:
        inst = next((n for n in ninjas if n["instance_id"] == iid), None)
        if not inst:
            continue
        gain = round(base_exp * (1.6 if iid in survivors else 0.8))
        levels = grant_hero_exp(inst, gain)
        tmpl = gd.CATALOG_BY_ID.get(inst["template_id"], {})
        hero_exp.append({"instance_id": iid, "name": tmpl.get("name", "?"), "exp": gain,
                          "levels": levels, "level": inst["level"]})
    return hero_exp


def _roll_battle_item_drops(user: dict, chapter: int, first_clear: bool) -> dict:
    """Rolls the item-drop table for a campaign win and merges the results
    into the user's inventory. Returns the drop dict for the rewards payload."""
    inventory = user.get("inventory", {})
    drops = gd.roll_drops(chapter, first_clear)
    for iid, qty in drops.items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    return drops


def _roll_battle_gear_drop(user: dict, chapter: int) -> Optional[dict]:
    """Campaign battles from Chapter 2+ have a flat chance to drop a gear
    piece (the long-term equipment loop), capped by GEAR_INVENTORY_CAP."""
    if chapter < 2 or len(user.get("gear", [])) >= GEAR_INVENTORY_CAP or rng.random() >= 0.14:
        return None
    g = gd.roll_gear(min_tier=1, max_tier=min(1 + chapter // 3, 5), luck=min(0.5, chapter * 0.04))
    user.setdefault("gear", []).append(g)
    return gear_public(g)


def _apply_campaign_first_clear_bonus(user: dict, stage: dict, stage_id: str, cleared: list,
                                       ninjas: list, rewards: dict) -> None:
    """Grants the one-time first-clear bonus (bonus Ryo/Gems + items + a
    hero drop if any) and marks the stage as cleared. Enforces the campaign
    hero-reward rarity cap — UR/LR/GR heroes are NEVER granted from campaign.
    Mutates `cleared`, `ninjas` and `rewards` in place."""
    cleared.append(stage_id)
    fc = stage.get("first_clear", {})
    user["ryo"] += fc.get("ryo", 0)
    rewards["ryo"] += fc.get("ryo", 0)
    gems_gained = gd.first_clear_gems(stage.get("chapter", 1))
    user["gems"] = user.get("gems", 0) + gems_gained
    rewards["gems"] = gems_gained
    # First-clear item bundle (materials, tickets, etc.)
    fc_items = fc.get("items", {})
    if fc_items:
        inventory = user.get("inventory", {})
        for iid, qty in fc_items.items():
            inventory[iid] = inventory.get(iid, 0) + qty
        user["inventory"] = inventory
        merged = dict(rewards.get("items", {}))
        for iid, qty in fc_items.items():
            merged[iid] = merged.get(iid, 0) + qty
        rewards["items"] = merged
    # Hero reward — enforce chapter-based rarity cap
    drop = fc.get("ninja")
    if drop:
        tmpl = gd.CATALOG_BY_ID.get(drop)
        if tmpl:
            chapter = stage.get("chapter", 1)
            max_rarity = pp.campaign_hero_reward_max_rarity(chapter)
            if gd.RARITY_ORDER.get(tmpl["rarity"], 0) <= gd.RARITY_ORDER.get(max_rarity, 0):
                if not any(i["template_id"] == drop for i in ninjas):
                    ninjas.append(new_ninja_instance(drop))
                    rewards["ninja"] = {"template_id": drop, "name": tmpl["name"], "rarity": tmpl["rarity"]}


@api_router.post("/game/battle/complete")
async def battle_complete(body: BattleCompleteIn, user: dict = Depends(get_current_user)):
    stage = gd.STAGES_BY_ID.get(body.stage_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    if body.result != "win":
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"losses": 1}})
        user["losses"] = user.get("losses", 0) + 1
        return {"profile": public_user(user), "rewards": None, "result": "lose"}

    cleared = user.get("cleared_stages", [])
    first_clear = body.stage_id not in cleared
    chapter = stage.get("chapter", 1)
    # Difficulty exp multiplier — enemies are scaled client-side, but exp
    # rewards are scaled server-side. Extreme is capped at x25 (not x100).
    _diff_exp_mult = {"normal": 1, "hard": 2, "difficult": 10, "extreme": 25}
    exp_mult = _diff_exp_mult.get(body.difficulty, 1)
    base_exp = round(stage["rewards"]["exp"] * exp_mult)
    rewards = {"ryo": stage["rewards"]["ryo"], "gems": 0, "exp": base_exp, "ninja": None, "hero_exp": [], "items": {}}

    user["ryo"] = user.get("ryo", 0) + rewards["ryo"]
    level_up = await grant_player_exp(user, base_exp)
    user["wins"] = user.get("wins", 0) + 1

    # distribute hero EXP to participants (survivors full, fallen half)
    ninjas = user.get("ninjas", [])
    survivors = set(body.survivors)
    participants = body.participants or list(user.get("team", []))
    rewards["hero_exp"] = _distribute_battle_hero_exp(user, participants, survivors, base_exp)

    # item drops
    rewards["items"] = _roll_battle_item_drops(user, chapter, first_clear)
    inventory = user["inventory"]

    # forge material drops — chapter-gated, boss-specific mats from boss stages
    forge_drops = gd.roll_forge_drops(chapter, stage.get("is_boss", False), stage.get("boss_mechanic"), first_clear)
    if forge_drops:
        for iid, qty in forge_drops.items():
            inventory[iid] = inventory.get(iid, 0) + qty
        rewards.setdefault("forge_materials", {}).update(forge_drops)

    # gear drops — battles from Chapter 2 onward can drop gear (long-term loop)
    rewards["gear"] = _roll_battle_gear_drop(user, chapter)

    if first_clear:
        _apply_campaign_first_clear_bonus(user, stage, body.stage_id, cleared, ninjas, rewards)

    bump_mission(user, "campaign_win")
    bump_mission(user, "any_win")
    total_levels = sum(h["levels"] for h in rewards["hero_exp"])
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"ryo": user["ryo"], "gems": user.get("gems", 0), "level": user["level"], "exp": user["exp"],
                  "ninjas": ninjas, "inventory": inventory, "cleared_stages": cleared, "wins": user["wins"],
                  "daily": user["daily"], "gear": user.get("gear", [])}},
    )
    user["cleared_stages"] = cleared
    return {"profile": public_user(user), "rewards": rewards, "result": "win", "first_clear": first_clear, "level_up": level_up}


def _rarity_pool(min_rarity: str = None, exclude_top: bool = True,
                 currency: str = "gems", featured_id: str = None) -> list:
    """Weighted (template_id, weight) list, optionally floored at a rarity.
    Uses the per-currency weight table (Gold/Ryo banner has far lower rare
    rates). The featured rate-up is applied MULTIPLICATIVELY on the hero's own
    weight (so a rare hero stays rare — it is only relatively boosted), never
    as a flat chance."""
    weights = gd.GOLD_SUMMON_WEIGHTS if currency == "ryo" else gd.SUMMON_WEIGHTS
    floor = gd.RARITY_ORDER[min_rarity] if min_rarity else -1
    out = []
    for tid, t in gd.CATALOG_BY_ID.items():
        ri = gd.RARITY_ORDER[t["rarity"]]
        if exclude_top and t["rarity"] == gd.TOP_RARITY:
            continue
        if ri >= floor:
            w = weights.get(t["rarity"], 0)
            if w <= 0:
                continue
            if featured_id and tid == featured_id:
                w = w * FEATURED_RATE_MULT
            out.append((tid, w))
    return out


def _weighted_choice(pool: list) -> str:
    tids = [p[0] for p in pool]
    weights = [p[1] for p in pool]
    return rng.choices(tids, weights=weights, k=1)[0]


def _roll_top_rarity_pity(pity: dict, currency: str, featured: Optional[str],
                          featured_is_top: bool, top: str) -> tuple:
    """Evaluates the top-rarity pity roll for a single pull (GEM/TICKET
    banners only). Mutates `pity` in place. Returns
    (chosen_template_id_or_None, pity_note)."""
    if currency not in ("gems", "ticket"):
        return None, None
    counter = pity.get("ur", pity.get("gr", pity.get("mythic", 0))) + 1
    if rng.random() >= gd.pity_chance(counter):
        pity["ur"] = counter
        return None, None

    chosen = None
    pity_note = None
    tops = [tid for tid, t in gd.CATALOG_BY_ID.items() if t["rarity"] == top]
    if featured_is_top:
        if pity.get("featured_guarantee"):
            chosen = featured; pity["featured_guarantee"] = False; pity_note = "featured_guaranteed"
        elif rng.random() < gd.FEATURED_MYTHIC_5050:
            chosen = featured; pity_note = "featured_5050_won"
        else:
            others = [m for m in tops if m != featured] or tops
            chosen = rng.choice(others); pity["featured_guarantee"] = True; pity_note = "featured_5050_lost"
    else:
        chosen = rng.choice(tops) if tops else None
    pity["ur"] = 0
    if counter >= gd.MYTHIC_HARD_PITY:
        pity_note = pity_note or "hard_pity"
    return chosen, pity_note


def _grant_summoned_hero(user: dict, chosen: str) -> tuple:
    """Adds the pulled hero to the roster, or — if already owned — converts
    the pull into Hero Shards instead. Returns (tmpl, is_duplicate, shards_gained)."""
    tmpl = gd.CATALOG_BY_ID[chosen]
    hero_shards = user.setdefault("hero_shards", {})
    is_duplicate = any(n["template_id"] == chosen for n in user.get("ninjas", []))
    shards_gained = 0
    if is_duplicate:
        shards_gained = gd.SHARD_YIELD_PER_DUPLICATE[tmpl["rarity"]]
        hero_shards[chosen] = hero_shards.get(chosen, 0) + shards_gained
    else:
        user.setdefault("ninjas", []).append(new_ninja_instance(chosen))
    return tmpl, is_duplicate, shards_gained


def _pull_once(user: dict, pity: dict, currency: str = "gems", force_sr_plus: bool = False) -> dict:
    """Executes ONE gacha pull.
    - GEM / TICKET banner: GR (top tier) pity — base rate, soft-pity ramp, hard
      pity guarantee. A natural GR resets the counter. Featured GR is 50/50
      with a guarantee after a loss (state on `pity.featured_guarantee`).
    - GOLD / RYO banner: NO pity and much lower rare rates (via GOLD weights).
    Rate-up is applied multiplicatively inside `_rarity_pool` (never a flat
    chance). Mutates `pity`/`user`; returns the result dict."""
    top = gd.TOP_RARITY
    featured = FEATURED_BANNER["template_id"]
    featured_tmpl = gd.CATALOG_BY_ID.get(featured) if featured else None
    featured_is_top = bool(featured_tmpl and featured_tmpl["rarity"] == top)

    chosen, pity_note = _roll_top_rarity_pity(pity, currency, featured, featured_is_top, top)
    if chosen is None:
        pool = _rarity_pool(min_rarity=gd.X10_GUARANTEE_RARITY if force_sr_plus else None,
                            currency=currency, featured_id=featured)
        chosen = _weighted_choice(pool)
    pity["total_pulls"] = pity.get("total_pulls", 0) + 1

    tmpl, is_duplicate, shards_gained = _grant_summoned_hero(user, chosen)
    return {"template_id": chosen, "name": tmpl["name"], "rarity": tmpl["rarity"],
            "element": tmpl["element"], "role": tmpl["role"], "portrait": tmpl["portrait"],
            "duplicate": is_duplicate, "shards_gained": shards_gained, "pity_note": pity_note}


def _gold_summon_cost(count: int) -> int:
    """Total Ryo cost for `count` gold summons. x10 gets a 20% discount
    (8x single cost instead of 10x)."""
    if count >= 10:
        return gd.GOLD_SUMMON_X10_COST
    return gd.SUMMON_COST * count


def _validate_summon_funds(user: dict, inventory: dict, currency: str, count: int) -> None:
    """Raises 400 if the player can't afford `count` pulls on this currency."""
    if currency == "ticket":
        if inventory.get("summon_ticket", 0) < count:
            raise HTTPException(status_code=400, detail=f"Need {count} summon tickets")
    elif currency == "gems":
        if user.get("gems", 0) < gd.GEM_SUMMON_COST * count:
            raise HTTPException(status_code=400, detail=f"Not enough Gems — need {gd.GEM_SUMMON_COST * count}")
    else:
        cost = _gold_summon_cost(count)
        if user.get("ryo", 0) < cost:
            raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost}")


def _deduct_summon_cost(user: dict, inventory: dict, currency: str, count: int) -> None:
    """Charges the player for `count` pulls (mutates user/inventory in place)."""
    if currency == "ticket":
        inventory["summon_ticket"] -= count
        user["inventory"] = inventory
    elif currency == "gems":
        user["gems"] = user.get("gems", 0) - gd.GEM_SUMMON_COST * count
    else:
        user["ryo"] -= _gold_summon_cost(count)


@api_router.post("/game/summon")
async def summon(body: SummonIn, user: dict = Depends(get_current_user)):
    count = 10 if body.count >= 10 else 1
    inventory = user.get("inventory", {})
    currency = "ticket" if body.currency == "ticket" else ("gems" if body.currency == "gems" else "ryo")
    _validate_summon_funds(user, inventory, currency, count)

    pity = user.get("pity") or gd.fresh_pity_state()
    results = []
    for i in range(count):
        force = (count == 10 and i == 9 and
                 not any(gd.RARITY_ORDER[r["rarity"]] >= gd.RARITY_ORDER[gd.X10_GUARANTEE_RARITY] for r in results))
        results.append(_pull_once(user, pity, currency=currency, force_sr_plus=force))

    _deduct_summon_cost(user, inventory, currency, count)
    user["pity"] = pity
    bump_mission(user, "summon", count)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"], "inventory": inventory,
        "daily": user["daily"], "hero_shards": user.get("hero_shards", {}), "pity": pity,
    }})
    return {"profile": public_user(user), "results": results, "pity": pity,
            # legacy single-pull field kept for backward compatibility
            "summoned": results[0] if count == 1 else None}


# ---------------------------------------------------------------------------
# Beginner Summon — one-time ×10 newbie banner. Re-roll up to
# BEGINNER_MAX_REROLLS times, pin up to BEGINNER_MAX_LOCKS cards (survive
# rerolls), claim to grant the shown 10 and end it forever.
# ---------------------------------------------------------------------------
class BeginnerLockIn(BaseModel):
    index: int


def _beginner_pull_once() -> str:
    pool = gd.beginner_pool()
    tids = [p[0] for p in pool]
    weights = [p[1] for p in pool]
    return rng.choices(tids, weights=weights, k=1)[0]


@api_router.post("/game/beginner/summon")
async def beginner_summon(user: dict = Depends(get_current_user)):
    ensure_beginner_state(user)
    b = user["beginner"]
    if b.get("finished"):
        raise HTTPException(status_code=400, detail="Beginner summon already completed")
    if b.get("rolls_used", 0) >= gd.BEGINNER_MAX_REROLLS:
        raise HTTPException(status_code=400, detail="No rerolls remaining — claim your results")
    locked = list(b.get("locked", []))
    current = list(b.get("current", []))
    if len(current) < gd.BEGINNER_PULL_COUNT:
        current = current + [None] * (gd.BEGINNER_PULL_COUNT - len(current))
    new_current = []
    for i in range(gd.BEGINNER_PULL_COUNT):
        if i in locked and current[i] is not None:
            new_current.append(current[i])
        else:
            new_current.append(_beginner_pull_once())
    b["current"] = new_current
    b["locked"] = [i for i in locked if i < gd.BEGINNER_PULL_COUNT]
    b["rolls_used"] = b.get("rolls_used", 0) + 1
    user["beginner"] = b
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"beginner": b}})
    return {"profile": public_user(user), "beginner": beginner_public(user)}


@api_router.post("/game/beginner/lock")
async def beginner_lock(body: BeginnerLockIn, user: dict = Depends(get_current_user)):
    ensure_beginner_state(user)
    b = user["beginner"]
    if b.get("finished"):
        raise HTTPException(status_code=400, detail="Beginner summon already completed")
    current = b.get("current", [])
    if not current:
        raise HTTPException(status_code=400, detail="Summon first before locking")
    if body.index < 0 or body.index >= len(current):
        raise HTTPException(status_code=400, detail="Invalid card index")
    locked = list(b.get("locked", []))
    if body.index in locked:
        locked = [i for i in locked if i != body.index]
    else:
        if len(locked) >= gd.BEGINNER_MAX_LOCKS:
            raise HTTPException(status_code=400, detail=f"Maximum {gd.BEGINNER_MAX_LOCKS} locks reached")
        locked.append(body.index)
    b["locked"] = locked
    user["beginner"] = b
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"beginner": b}})
    return {"profile": public_user(user), "beginner": beginner_public(user)}


@api_router.post("/game/beginner/claim")
async def beginner_claim(user: dict = Depends(get_current_user)):
    ensure_beginner_state(user)
    b = user["beginner"]
    if b.get("finished"):
        raise HTTPException(status_code=400, detail="Beginner summon already completed")
    current = b.get("current", [])
    if len(current) < gd.BEGINNER_PULL_COUNT:
        raise HTTPException(status_code=400, detail="Summon first before claiming")
    results = []
    for tid in current:
        tmpl, is_dup, shards = _grant_summoned_hero(user, tid)
        results.append({"template_id": tid, "name": tmpl["name"], "rarity": tmpl["rarity"],
                        "element": tmpl["element"], "role": tmpl["role"], "portrait": tmpl["portrait"],
                        "duplicate": is_dup, "shards_gained": shards})
    b["finished"] = True
    b["current"] = []
    b["locked"] = []
    user["beginner"] = b
    bump_mission(user, "summon", gd.BEGINNER_PULL_COUNT)
    bump_achievement(user, "beginner_claim", 1)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": user.get("hero_shards", {}),
        "beginner": b, "daily": user["daily"], "achievements": user.get("achievements")}})
    return {"profile": public_user(user), "results": results}


# ---------------------------------------------------------------------------
# Free Daily Summons — 1 free Gem-banner pull + 3 free Ryo-banner pulls/day.
# ---------------------------------------------------------------------------
class FreeSummonIn(BaseModel):
    currency: str  # "gem" | "coin"


@api_router.post("/game/summon/free")
async def free_summon(body: FreeSummonIn, user: dict = Depends(get_current_user)):
    ensure_free_summon_state(user)
    fs = user["free_summons"]
    currency = "gems" if body.currency == "gem" else "ryo"
    if currency == "gems":
        if fs.get("gem_used", 0) >= gd.FREE_GEM_SUMMONS_PER_DAY:
            raise HTTPException(status_code=400, detail="No free Gem summon left today")
        fs["gem_used"] = fs.get("gem_used", 0) + 1
    else:
        if fs.get("coin_used", 0) >= gd.FREE_COIN_SUMMONS_PER_DAY:
            raise HTTPException(status_code=400, detail="No free Ryo summons left today")
        fs["coin_used"] = fs.get("coin_used", 0) + 1
    pity = user.get("pity") or gd.fresh_pity_state()
    result = _pull_once(user, pity, currency=currency)
    user["pity"] = pity
    bump_mission(user, "summon", 1)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": user.get("hero_shards", {}), "pity": pity,
        "free_summons": fs, "daily": user["daily"], "achievements": user.get("achievements")}})
    return {"profile": public_user(user), "result": result}


# ---------------------------------------------------------------------------
# STEP-UP SUMMON — a free x10 unlocked every 10 player levels (1, 10, 20 ...)
# with tripled (3x) base rates for SSR and above. One claim per milestone.
# ---------------------------------------------------------------------------
@api_router.get("/game/summon/stepup")
async def stepup_status(user: dict = Depends(get_current_user)):
    return {"stepup": stepup_public(user)}


@api_router.post("/game/summon/stepup")
async def stepup_claim(user: dict = Depends(get_current_user)):
    level = user.get("level", 1)
    used = _stepup_used(user)
    available = ex.stepup_available_count(level, used)
    if available <= 0:
        raise HTTPException(status_code=400, detail=f"No Step-Up summons available — reach level {ex.stepup_next_milestone(level)} for your next free x10")

    pity = user.get("pity") or gd.fresh_pity_state()
    pool = ex.stepup_pool(featured_id=FEATURED_BANNER.get("template_id"))
    results = []
    for i in range(ex.STEPUP_PULL_COUNT):
        # x10 guarantee: the final pull is forced SR+ if none appeared yet.
        force = (i == ex.STEPUP_PULL_COUNT - 1 and
                 not any(gd.RARITY_ORDER[r["rarity"]] >= gd.RARITY_ORDER[gd.X10_GUARANTEE_RARITY]
                        for r in results))
        if force:
            sr_pool = [(tid, w) for tid, w in pool
                       if gd.RARITY_ORDER[gd.CATALOG_BY_ID[tid]["rarity"]] >= gd.RARITY_ORDER[gd.X10_GUARANTEE_RARITY]]
            chosen = _weighted_choice(sr_pool) if sr_pool else _weighted_choice(pool)
        else:
            chosen = _weighted_choice(pool)
        tmpl, is_dup, shards = _grant_summoned_hero(user, chosen)
        results.append({"template_id": chosen, "name": tmpl["name"], "rarity": tmpl["rarity"],
                        "element": tmpl["element"], "role": tmpl["role"], "portrait": tmpl["portrait"],
                        "duplicate": is_dup, "shards_gained": shards})
        pity["total_pulls"] = pity.get("total_pulls", 0) + 1

    user["step_up_summons_used"] = used + 1
    user["pity"] = pity
    bump_mission(user, "summon", ex.STEPUP_PULL_COUNT)
    update_doc = {
        "ninjas": user["ninjas"], "hero_shards": user.get("hero_shards", {}),
        "pity": pity, "step_up_summons_used": used + 1,
        "daily": user["daily"], "achievements": user.get("achievements"),
    }
    # Clean up legacy stepup_claimed list if it still exists
    if "stepup_claimed" in user:
        user.pop("stepup_claimed", None)
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_doc, "$unset": {"stepup_claimed": ""}})
    else:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_doc})
    return {"profile": public_user(user), "results": results}


# ---------------------------------------------------------------------------
# Achievements — long-term goals granting currency + stat-boost items.
# ---------------------------------------------------------------------------
@api_router.get("/game/achievements")
async def get_achievements(user: dict = Depends(get_current_user)):
    return {"achievements": achievements_public(user)}


@api_router.post("/game/achievements/claim/{achievement_id}")
async def claim_achievement(achievement_id: str, user: dict = Depends(get_current_user)):
    a = gd.ACHIEVEMENTS_BY_ID.get(achievement_id)
    if not a:
        raise HTTPException(status_code=404, detail="Achievement not found")
    ensure_achievements_state(user)
    ach = user["achievements"]
    st = ach.get(achievement_id, {"progress": 0, "claimed": False})
    if st.get("claimed"):
        raise HTTPException(status_code=400, detail="Reward already claimed")
    if "metric" in a:
        progress = min(a["target"], gd.achievement_metric(user, a["metric"]))
    else:
        progress = min(a["target"], st.get("progress", 0))
    if progress < a["target"]:
        raise HTTPException(status_code=400, detail="Achievement not complete yet")
    reward = a["reward"]
    user["ryo"] = user.get("ryo", 0) + reward.get("ryo", 0)
    user["gems"] = user.get("gems", 0) + reward.get("gems", 0)
    inventory = user.get("inventory", {})
    for iid, qty in reward.get("items", {}).items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    st["claimed"] = True
    if "metric" not in a:
        st["progress"] = progress
    ach[achievement_id] = st
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user["gems"], "inventory": inventory, "achievements": ach}})
    return {"profile": public_user(user), "reward": reward}


async def _do_evolve(instance_id: str, user: dict) -> dict:
    """Evolution (star breakthrough) — the ONLY way to raise stars. Early
    stars burn duplicate shards + ryo; stars 4-6 additionally require rare
    evolution materials (Evolution Essence / Celestial Cores)."""
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        raise HTTPException(status_code=404, detail="Hero template not found")
    stars = inst.get("stars", 1)
    rarity = ex.effective_rarity(inst, tmpl)
    stars_max = gd.max_stars_for_rarity(rarity)
    if stars >= stars_max:
        raise HTTPException(status_code=400, detail="This hero is already at maximum evolution for its rarity — Ascend to raise the cap")
    cost = gd.evolution_cost(rarity, stars)
    hero_shards = user.setdefault("hero_shards", {})
    inventory = user.get("inventory", {})
    have_shards = hero_shards.get(inst["template_id"], 0)
    if have_shards < cost["shards"]:
        raise HTTPException(status_code=400, detail=f"Not enough shards ({have_shards}/{cost['shards']})")
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")
    for iid, qty in cost["items"].items():
        if inventory.get(iid, 0) < qty:
            name = gd.ITEMS.get(iid, {}).get("name", iid)
            raise HTTPException(status_code=400, detail=f"Not enough {name} ({inventory.get(iid, 0)}/{qty})")
    hero_shards[inst["template_id"]] = have_shards - cost["shards"]
    user["ryo"] -= cost["ryo"]
    for iid, qty in cost["items"].items():
        inventory[iid] -= qty
    inst["stars"] = stars + 1
    user["inventory"] = inventory
    bump_mission(user, "evolve")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"], "inventory": inventory,
        "daily": user["daily"], "achievements": user.get("achievements")}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"], "stars": inst["stars"]}


@api_router.post("/game/hero/evolve")
async def evolve_hero(body: EvolveIn, user: dict = Depends(get_current_user)):
    return await _do_evolve(body.instance_id, user)


@api_router.post("/game/hero/star-up")
async def star_up(body: StarUpIn, user: dict = Depends(get_current_user)):
    """Legacy route — kept for compatibility; now runs the Evolution system."""
    return await _do_evolve(body.instance_id, user)


@api_router.post("/game/hero/transcend")
async def transcend_hero(body: TranscendIn, user: dict = Depends(get_current_user)):
    """Rarity Ascension — raise a hero's rarity tier by one up the ladder
    (R -> SR -> SSR -> UR -> LR -> GR). Stars carry forward (they are NOT
    reset); the hero simply gains a higher star cap + recomputed base stats
    for the new tier. Requires the hero to be at its current rarity's star
    cap. Costs hero shards + Ryo (+ elemental essence when enabled)."""
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        raise HTTPException(status_code=404, detail="Hero template not found")
    cur_rarity = ex.effective_rarity(inst, tmpl)
    stars = inst.get("stars", 1)
    stars_max = gd.max_stars_for_rarity(cur_rarity)
    if stars < stars_max:
        raise HTTPException(status_code=400, detail=f"Reach {stars_max}\u2605 (max stars for {cur_rarity}) before ascending")
    cost = ex.transcendence_cost(cur_rarity, tmpl.get("element"))
    if not cost:
        raise HTTPException(status_code=400, detail="This hero has already reached the GR rarity cap")
    hero_shards = user.setdefault("hero_shards", {})
    have_shards = hero_shards.get(inst["template_id"], 0)
    if have_shards < cost["shards"]:
        raise HTTPException(status_code=400, detail=f"Not enough shards ({have_shards}/{cost['shards']})")
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")
    inventory = user.get("inventory", {})
    for iid, qty in cost["items"].items():
        if inventory.get(iid, 0) < qty:
            name = gd.ITEMS.get(iid, {}).get("name", iid)
            raise HTTPException(status_code=400, detail=f"Not enough {name} ({inventory.get(iid, 0)}/{qty})")
    # Deduct resources (single atomic pass — no duplicate deductions).
    hero_shards[inst["template_id"]] = have_shards - cost["shards"]
    user["ryo"] -= cost["ryo"]
    for iid, qty in cost["items"].items():
        inventory[iid] -= qty
    # Stars carry forward — only the rarity (and its higher star cap) changes.
    inst["evolved_rarity"] = cost["target"]
    user["inventory"] = inventory
    bump_mission(user, "evolve")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"], "inventory": inventory,
        "daily": user["daily"], "achievements": user.get("achievements")}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"],
            "new_rarity": cost["target"], "prev_rarity": cur_rarity,
            "stars": stars, "ascended": True}


@api_router.post("/game/hero/use-exp")
async def use_exp_item(body: UseExpIn, user: dict = Depends(get_current_user)):
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    item = gd.ITEMS.get(body.item_id)
    if not item or item["type"] != "exp":
        raise HTTPException(status_code=400, detail="Invalid EXP item")
    inventory = user.get("inventory", {})
    qty = max(1, body.qty)
    if inventory.get(body.item_id, 0) < qty:
        raise HTTPException(status_code=400, detail="Not enough of that item")
    rarity = gd.CATALOG_BY_ID[inst["template_id"]]["rarity"]
    if inst["level"] >= gd.level_cap(rarity, inst.get("ascension", 0)):
        raise HTTPException(status_code=400, detail="Hero is at its level cap — ascend to raise it")
    # Training consumes gold alongside tomes (dual cost, standard for genre)
    gold_cost = gd.EXP_TOME_GOLD_COST.get(body.item_id, 0) * qty
    if user.get("ryo", 0) < gold_cost:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — training costs {gold_cost}")
    user["ryo"] = user.get("ryo", 0) - gold_cost
    inventory[body.item_id] -= qty
    levels = grant_hero_exp(inst, item["value"] * qty)
    user["inventory"] = inventory
    if levels > 0:
        bump_mission(user, "hero_levelup", levels)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"ninjas": user["ninjas"], "inventory": inventory, "daily": user["daily"], "ryo": user["ryo"]}})
    return {"profile": public_user(user), "levels_gained": levels, "gold_spent": gold_cost}


@api_router.post("/game/hero/ascend")
async def ascend_hero(body: AscendIn, user: dict = Depends(get_current_user)):
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    rarity = gd.CATALOG_BY_ID[inst["template_id"]]["rarity"]
    asc = inst.get("ascension", 0)
    if asc >= gd.ASCENSION_MAX[rarity]:
        raise HTTPException(status_code=400, detail="Hero is fully ascended")
    if inst["level"] < gd.level_cap(rarity, asc):
        raise HTTPException(status_code=400, detail="Reach the level cap before ascending")
    cost = gd.ascension_cost(rarity, asc)
    inventory = user.get("inventory", {})
    if inventory.get("ascension_crystal", 0) < cost["ascension_crystal"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ascension Crystals ({inventory.get('ascension_crystal', 0)}/{cost['ascension_crystal']})")
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")
    for iid, qty in cost.get("items", {}).items():
        if iid == "ascension_crystal":
            continue
        if inventory.get(iid, 0) < qty:
            name = gd.ITEMS.get(iid, {}).get("name", iid)
            raise HTTPException(status_code=400, detail=f"Not enough {name} ({inventory.get(iid, 0)}/{qty})")
    inventory["ascension_crystal"] -= cost["ascension_crystal"]
    for iid, qty in cost.get("items", {}).items():
        if iid == "ascension_crystal":
            continue
        inventory[iid] = inventory.get(iid, 0) - qty
    user["ryo"] -= cost["ryo"]
    inst["ascension"] = asc + 1
    user["inventory"] = inventory
    bump_mission(user, "ascend")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"ninjas": user["ninjas"], "inventory": inventory, "ryo": user["ryo"], "daily": user["daily"], "achievements": user.get("achievements")}})
    return public_user(user)


@api_router.post("/game/hero/skill-up")
async def skill_up(body: StarUpIn, user: dict = Depends(get_current_user)):
    """Rank up a hero's skills using duplicate shards + Ryo. Each rank boosts
    all jutsu power; reaching PASSIVE_UNLOCK_RANK permanently unlocks the
    hero's signature passive."""
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        raise HTTPException(status_code=404, detail="Hero template not found")
    rank = inst.get("skill_rank", 1)
    if rank >= gd.SKILL_RANK_MAX:
        raise HTTPException(status_code=400, detail="Skills are already at max rank")
    cost = gd.skill_rank_cost(tmpl["rarity"], rank)
    hero_shards = user.setdefault("hero_shards", {})
    have = hero_shards.get(inst["template_id"], 0)
    if have < cost["shards"]:
        raise HTTPException(status_code=400, detail=f"Not enough shards ({have}/{cost['shards']})")
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")
    hero_shards[inst["template_id"]] = have - cost["shards"]
    user["ryo"] -= cost["ryo"]
    inst["skill_rank"] = rank + 1
    unlocked_passive = (rank + 1) == gd.passive_unlock_rank(tmpl["rarity"])
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"]}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"],
            "skill_rank": inst["skill_rank"], "unlocked_passive": unlocked_passive}


@api_router.post("/game/hero/reforge")
async def reforge_skill(body: ReforgeIn, user: dict = Depends(get_current_user)):
    """Refine one of a hero's active jutsus with a combat modifier (burn,
    stun, extra damage, etc.) by spending duplicate hero shards + Ryo. Each
    reforge permanently adds the modifier to that jutsu; the combat engine
    merges it into the jutsu's `effects`/power at battle-build time."""
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        raise HTTPException(status_code=404, detail="Hero template not found")
    jutsu = next((j for j in tmpl["jutsus"] if j["id"] == body.jutsu_id), None)
    if not jutsu:
        raise HTTPException(status_code=400, detail="Jutsu not found on this hero")
    if jutsu["type"] not in ("attack", "aoe", "heal"):
        raise HTTPException(status_code=400, detail="Only active jutsus can be reforged")
    mod = gd.REFORGE_MODIFIERS.get(body.modifier_id)
    if not mod:
        raise HTTPException(status_code=400, detail="Unknown reforge modifier")

    reforge = inst.setdefault("reforge", {})
    jmods = reforge.setdefault(body.jutsu_id, [])
    if body.modifier_id in jmods:
        raise HTTPException(status_code=400, detail="Modifier already applied to this jutsu")
    if len(jmods) >= gd.REFORGE_MAX_PER_JUTSU:
        raise HTTPException(status_code=400, detail="This jutsu has reached its reforge capacity")

    cost = gd.reforge_cost(tmpl["rarity"], gd.reforge_total(reforge))
    hero_shards = user.setdefault("hero_shards", {})
    have = hero_shards.get(inst["template_id"], 0)
    if have < cost["shards"]:
        raise HTTPException(status_code=400, detail=f"Not enough shards ({have}/{cost['shards']})")
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")

    hero_shards[inst["template_id"]] = have - cost["shards"]
    user["ryo"] = user.get("ryo", 0) - cost["ryo"]
    jmods.append(body.modifier_id)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"]}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"],
            "jutsu_id": body.jutsu_id, "modifier_id": body.modifier_id}


@api_router.post("/game/hero/revert")
async def revert_hero(body: RevertIn, user: dict = Depends(get_current_user)):
    """Revert a hero back to Lv.1 base form, refunding ALL materials invested:
    EXP tomes (+ their Ryo gold cost), ascension crystals/items/Ryo, evolution
    shards/items/Ryo, skill-rank shards/Ryo, and reforge shards/Ryo."""
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
    if not tmpl:
        raise HTTPException(status_code=404, detail="Hero template not found")
    native_rarity = tmpl["rarity"]
    rarity = ex.effective_rarity(inst, tmpl)  # effective (ascended) rarity

    if (inst.get("level", 1) == 1 and inst.get("exp", 0) == 0 and
            inst.get("ascension", 0) == 0 and inst.get("stars", 1) == 1 and
            inst.get("skill_rank", 1) == 1 and not gd.reforge_total(inst.get("reforge", {}))
            and rarity == native_rarity):
        raise HTTPException(status_code=400, detail="Hero is already at base level")

    inventory = user.get("inventory", {})
    hero_shards = user.setdefault("hero_shards", {})
    ryo_refund = 0
    shards_refund = 0

    # 1) EXP invested → refund as tomes (largest first) + their gold cost
    total_exp = inst.get("exp", 0)
    for lv in range(1, inst["level"]):
        total_exp += gd.hero_exp_to_next(lv)
    ancient = total_exp // 6000
    rem = total_exp % 6000
    greater = rem // 1200
    rem = rem % 1200
    minor = rem // 250
    if rem % 250:
        minor += 1
    if ancient:
        inventory["exp_tome_ancient"] = inventory.get("exp_tome_ancient", 0) + ancient
        ryo_refund += ancient * gd.EXP_TOME_GOLD_COST["exp_tome_ancient"]
    if greater:
        inventory["exp_tome_greater"] = inventory.get("exp_tome_greater", 0) + greater
        ryo_refund += greater * gd.EXP_TOME_GOLD_COST["exp_tome_greater"]
    if minor:
        inventory["exp_tome_minor"] = inventory.get("exp_tome_minor", 0) + minor
        ryo_refund += minor * gd.EXP_TOME_GOLD_COST["exp_tome_minor"]

    # 2) Ascension costs → refund crystals, items, Ryo
    asc = inst.get("ascension", 0)
    for i in range(asc):
        cost = gd.ascension_cost(rarity, i)
        inventory["ascension_crystal"] = inventory.get("ascension_crystal", 0) + cost["ascension_crystal"]
        ryo_refund += cost["ryo"]
        for iid, qty in cost.get("items", {}).items():
            inventory[iid] = inventory.get(iid, 0) + qty

    # 3) Evolution (star) costs → refund shards + Ryo (cost is star-based, so
    #    iterating by star number is correct regardless of which rarity each
    #    star was earned at).
    stars = inst.get("stars", 1)
    for i in range(stars - 1):
        cost = gd.evolution_cost(rarity, i)
        if not cost:
            continue
        shards_refund += cost["shards"]
        ryo_refund += cost["ryo"]
        for iid, qty in cost["items"].items():
            inventory[iid] = inventory.get(iid, 0) + qty

    # 3b) Rarity Ascension costs → refund shards + Ryo + essence for each
    #     tier the hero was ascended above its native rarity.
    cur = native_rarity
    while cur != rarity:
        acost = prog.get_ascension_cost(cur, tmpl.get("element"))
        if not acost:
            break
        shards_refund += acost["shards"]
        ryo_refund += acost["ryo"]
        for iid, qty in acost["items"].items():
            inventory[iid] = inventory.get(iid, 0) + qty
        nxt = prog.get_next_rarity(cur)
        if not nxt:
            break
        cur = nxt

    # 4) Skill-up costs → refund shards, Ryo
    skill_rank = inst.get("skill_rank", 1)
    for i in range(skill_rank - 1):
        cost = gd.skill_rank_cost(rarity, i)
        shards_refund += cost["shards"]
        ryo_refund += cost["ryo"]

    # 5) Reforge costs → refund shards, Ryo
    total_reforges = gd.reforge_total(inst.get("reforge", {}))
    for i in range(total_reforges):
        cost = gd.reforge_cost(rarity, i)
        shards_refund += cost["shards"]
        ryo_refund += cost["ryo"]

    if shards_refund:
        hero_shards[inst["template_id"]] = hero_shards.get(inst["template_id"], 0) + shards_refund
    user["ryo"] = user.get("ryo", 0) + ryo_refund

    # Reset hero to base
    inst["level"] = 1
    inst["exp"] = 0
    inst["ascension"] = 0
    inst["stars"] = 1
    inst["skill_rank"] = 1
    inst["reforge"] = {}
    inst["evolved_rarity"] = native_rarity  # undo rarity ascension
    user["inventory"] = inventory

    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "inventory": inventory, "ryo": user["ryo"],
        "hero_shards": hero_shards,
    }})
    await upsert_arena_snapshot(user)

    return {
        "profile": public_user(user),
        "refunded": {
            "exp_tome_ancient": ancient, "exp_tome_greater": greater, "exp_tome_minor": minor,
            "ascension_crystal": sum(gd.ascension_cost(rarity, i)["ascension_crystal"] for i in range(asc)),
            "shards": shards_refund, "ryo": ryo_refund,
        },
    }


# ---------------------------------------------------------------------------
# GEAR — equip/unequip/enhance/craft/fuse/summon (Phase J1)
# ---------------------------------------------------------------------------
GEAR_INVENTORY_CAP = 250


def _find_gear(user: dict, gear_id: str) -> dict:
    g = next((g for g in user.get("gear", []) if g["gear_id"] == gear_id), None)
    if not g:
        raise HTTPException(status_code=404, detail="Gear not found")
    return g


@api_router.post("/game/gear/equip")
async def gear_equip(body: GearEquipIn, user: dict = Depends(get_current_user)):
    g = _find_gear(user, body.gear_id)
    inst = next((i for i in user.get("ninjas", []) if i["instance_id"] == body.instance_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail="Hero not found")
    # one piece per slot per hero — auto-swap out whatever occupies the slot
    for other in user.get("gear", []):
        if other.get("equipped_by") == body.instance_id and other["slot"] == g["slot"] and other["gear_id"] != g["gear_id"]:
            other["equipped_by"] = None
    g["equipped_by"] = body.instance_id
    bump_mission(user, "equip_gear")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"gear": user["gear"], "daily": user["daily"], "achievements": user.get("achievements")}})
    return {"profile": public_user(user), "equipped": g["gear_id"]}


@api_router.post("/game/gear/unequip")
async def gear_unequip(body: GearUnequipIn, user: dict = Depends(get_current_user)):
    g = _find_gear(user, body.gear_id)
    g["equipped_by"] = None
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"gear": user["gear"]}})
    return {"profile": public_user(user)}


@api_router.post("/game/gear/enhance")
async def gear_enhance(body: GearEnhanceIn, user: dict = Depends(get_current_user)):
    g = _find_gear(user, body.gear_id)
    plus = g.get("plus", 0)
    if plus >= gd.GEAR_ENHANCE_MAX:
        raise HTTPException(status_code=400, detail="Gear is already at +15")
    cost = gd.gear_enhance_cost(g["rarity"], plus)
    inventory = user.get("inventory", {})
    if user.get("ryo", 0) < cost["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {cost['ryo']}")
    hammers = cost.get("forge_hammer", 0)
    if hammers and inventory.get("forge_hammer", 0) < hammers:
        raise HTTPException(status_code=400, detail=f"Not enough Forge Hammers ({inventory.get('forge_hammer', 0)}/{hammers})")
    user["ryo"] -= cost["ryo"]
    if hammers:
        inventory["forge_hammer"] -= hammers
    g["plus"] = plus + 1
    user["inventory"] = inventory
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"gear": user["gear"], "ryo": user["ryo"], "inventory": inventory}})
    return {"profile": public_user(user), "gear": gear_public(g)}


@api_router.post("/game/gear/craft")
async def gear_craft(body: GearCraftIn, user: dict = Depends(get_current_user)):
    recipe = gd.CRAFT_RECIPES.get(body.slot)
    if not recipe:
        raise HTTPException(status_code=400, detail="Invalid gear slot")
    if len(user.get("gear", [])) >= GEAR_INVENTORY_CAP:
        raise HTTPException(status_code=400, detail="Gear inventory is full — enhance or clear space first")
    inventory = user.get("inventory", {})
    if inventory.get(recipe["blueprint"], 0) < 1:
        raise HTTPException(status_code=400, detail=f"Missing {gd.ITEMS[recipe['blueprint']]['name']}")
    if inventory.get("forge_steel", 0) < recipe["forge_steel"]:
        raise HTTPException(status_code=400, detail=f"Not enough Forge Steel ({inventory.get('forge_steel', 0)}/{recipe['forge_steel']})")
    if user.get("ryo", 0) < recipe["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {recipe['ryo']}")
    inventory[recipe["blueprint"]] -= 1
    inventory["forge_steel"] -= recipe["forge_steel"]
    user["ryo"] -= recipe["ryo"]
    g = gd.craft_gear(body.slot)
    user.setdefault("gear", []).append(g)
    user["inventory"] = inventory
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"gear": user["gear"], "ryo": user["ryo"], "inventory": inventory}})
    return {"profile": public_user(user), "crafted": gear_public(g)}


@api_router.post("/game/material/fuse")
async def material_fuse(body: FuseIn, user: dict = Depends(get_current_user)):
    recipe = gd.FUSION_RECIPES.get(body.target_id)
    if not recipe:
        raise HTTPException(status_code=400, detail="Unknown fusion recipe")
    qty = max(1, min(99, body.qty))
    need = recipe["qty"] * qty
    inventory = user.get("inventory", {})
    have = inventory.get(recipe["from"], 0)
    if have < need:
        src = gd.ITEMS.get(recipe["from"], {}).get("name", recipe["from"])
        raise HTTPException(status_code=400, detail=f"Not enough {src} ({have}/{need})")
    inventory[recipe["from"]] = have - need
    inventory[body.target_id] = inventory.get(body.target_id, 0) + qty
    user["inventory"] = inventory
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"inventory": inventory}})
    return {"profile": public_user(user), "fused": {body.target_id: qty}}


# ---------------------------------------------------------------------------
# FORGE PRODUCTION — craft consumables from forge materials, gain forge XP.
# ---------------------------------------------------------------------------
@api_router.post("/game/forge/produce")
async def forge_produce(body: ForgeProduceIn, user: dict = Depends(get_current_user)):
    recipe = gd.forge_production_recipe(body.category, body.tier)
    if not recipe:
        raise HTTPException(status_code=400, detail="Invalid production recipe")

    forge_level = user.get("forge_level", 1)
    if forge_level < recipe["forge_level_req"]:
        raise HTTPException(status_code=400, detail=f"Forge level {recipe['forge_level_req']} required")

    inventory = user.get("inventory", {})
    # Check all materials
    for mat_id, need in recipe["materials"].items():
        have = inventory.get(mat_id, 0)
        if have < need:
            mat_name = gd.ITEMS.get(mat_id, {}).get("name", mat_id)
            raise HTTPException(status_code=400, detail=f"Not enough {mat_name} ({have}/{need})")

    # Check ryo
    if user.get("ryo", 0) < recipe["ryo"]:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {recipe['ryo']}")

    # Consume materials + ryo
    for mat_id, need in recipe["materials"].items():
        inventory[mat_id] -= need
    user["ryo"] -= recipe["ryo"]

    # Grant output item
    out_id = recipe["output"]["id"]
    inventory[out_id] = inventory.get(out_id, 0) + recipe["output"]["qty"]
    user["inventory"] = inventory

    # Grant forge XP and process level-ups
    forge_xp = user.get("forge_xp", 0) + recipe["forge_xp"]
    old_level = user.get("forge_level", 1)
    new_level, _, _ = gd.forge_level_from_xp(forge_xp)
    user["forge_xp"] = forge_xp
    user["forge_level"] = new_level
    leveled_up = new_level > old_level

    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "inventory": inventory, "ryo": user["ryo"],
        "forge_xp": forge_xp, "forge_level": new_level}})

    return {
        "profile": public_user(user),
        "produced": {"id": out_id, "name": recipe["output"]["name"], "qty": recipe["output"]["qty"]},
        "forge_xp_gained": recipe["forge_xp"],
        "forge_leveled_up": leveled_up,
        "forge_new_level": new_level,
    }


@api_router.post("/game/gear/summon")
async def gear_summon(body: GearSummonIn, user: dict = Depends(get_current_user)):
    """Armory summon — pulls gear (Rare+) using Gems or Gear Tickets.
    x10 guarantees at least one Epic+."""
    count = 10 if body.count >= 10 else 1
    if len(user.get("gear", [])) + count > GEAR_INVENTORY_CAP:
        raise HTTPException(status_code=400, detail="Gear inventory is full")
    inventory = user.get("inventory", {})
    if body.currency == "ticket":
        if inventory.get("gear_ticket", 0) < count:
            raise HTTPException(status_code=400, detail=f"Need {count} Gear Tickets")
        inventory["gear_ticket"] -= count
    else:
        cost = gd.GEAR_SUMMON_GEM_COST * count
        if user.get("gems", 0) < cost:
            raise HTTPException(status_code=400, detail=f"Not enough Gems — need {cost}")
        user["gems"] = user.get("gems", 0) - cost
    results = []
    for i in range(count):
        force_epic = (count == 10 and i == 9 and
                      not any(gd.GEAR_RARITY_META[r["rarity"]]["tier"] >= 4 for r in results))
        rarity = "epic" if force_epic else rng.choices(
            list(gd.GEAR_SUMMON_RATES.keys()), weights=list(gd.GEAR_SUMMON_RATES.values()), k=1)[0]
        tier = gd.GEAR_RARITY_META[rarity]["tier"]
        g = gd.roll_gear(min_tier=tier, max_tier=tier)
        user.setdefault("gear", []).append(g)
        results.append(gear_public(g))
    user["inventory"] = inventory
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "gear": user["gear"], "gems": user.get("gems", 0), "inventory": inventory}})
    return {"profile": public_user(user), "results": results}


# ---------------------------------------------------------------------------
# CRYSTALS — equippable stat-boosting relics dropped by bosses. One per gear piece.
# ---------------------------------------------------------------------------
def _find_crystal(user: dict, crystal_id: str) -> dict:
    c = next((x for x in user.get("crystals", []) if x.get("crystal_id") == crystal_id), None)
    if not c:
        raise HTTPException(status_code=404, detail="Crystal not found")
    return c


@api_router.post("/game/crystal/equip")
async def crystal_equip(body: CrystalEquipIn, user: dict = Depends(get_current_user)):
    c = _find_crystal(user, body.crystal_id)
    g = next((x for x in user.get("gear", []) if x.get("gear_id") == body.gear_id), None)
    if not g:
        raise HTTPException(status_code=404, detail="Gear not found")
    # one crystal per gear piece — unsocket whichever crystal holds this slot
    for other in user.get("crystals", []):
        if other.get("socketed_in") == body.gear_id and other["crystal_id"] != c["crystal_id"]:
            other["socketed_in"] = None
    c["socketed_in"] = body.gear_id
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"crystals": user["crystals"]}})
    return {"profile": public_user(user), "equipped": c["crystal_id"]}


@api_router.post("/game/crystal/unequip")
async def crystal_unequip(body: CrystalUnequipIn, user: dict = Depends(get_current_user)):
    c = _find_crystal(user, body.crystal_id)
    c["socketed_in"] = None
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"crystals": user["crystals"]}})
    return {"profile": public_user(user)}


@api_router.post("/game/spire/complete")
async def spire_complete(body: SpireCompleteIn, user: dict = Depends(get_current_user)):
    floor = body.floor
    if floor < 1:
        raise HTTPException(status_code=400, detail="Invalid floor")
    path = body.spire_path or "normal"

    # Enforce element-only team restriction server-side
    if path != "normal":
        _validate_spire_element(path, user)

    # Per-path floor progress — each elemental path tracks independently
    if path == "normal":
        current = user.get("spire_floor", 0)
    else:
        spire_floors = user.get("spire_floors", {})
        current = spire_floors.get(path, 0)

    if body.result != "win":
        return {"profile": public_user(user), "rewards": None, "result": "lose", "floor": floor}
    advancing = floor == current + 1
    r = gd.spire_rewards(floor, advancing)
    user["ryo"] = user.get("ryo", 0) + r["ryo"]
    gems_gained = 0
    if advancing:
        if r.get("milestone"):
            gems_gained = gd.SPIRE_MILESTONE_GEMS_BASE + floor
            user["gems"] = user.get("gems", 0) + gems_gained
        elif r.get("boss"):
            gems_gained = gd.SPIRE_BOSS_GEMS_BASE + floor // 5
            user["gems"] = user.get("gems", 0) + gems_gained
    hero_exp = distribute_hero_exp(user, body.participants or list(user.get("team", [])), body.survivors, r["hero_exp_base"])
    inventory = user.get("inventory", {})
    for iid, qty in r["items"].items():
        inventory[iid] = inventory.get(iid, 0) + qty
    # Elemental essence — small per-path reward identity, no new currency system
    if path != "normal" and advancing:
        essence_id = f"{path}_essence"
        inventory[essence_id] = inventory.get(essence_id, 0) + (3 if r.get("boss") else 1)
    user["inventory"] = inventory
    if advancing:
        if path == "normal":
            user["spire_floor"] = floor
        else:
            spire_floors = user.get("spire_floors", {})
            spire_floors[path] = floor
            user["spire_floors"] = spire_floors
    bump_mission(user, "spire_win")
    bump_mission(user, "any_win")
    total_levels = sum(h["levels"] for h in hero_exp)
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)
    level_up = await grant_player_exp(user, r.get("hero_exp_base", 0))
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"], "inventory": inventory,
        "spire_floor": user.get("spire_floor", current), "spire_floors": user.get("spire_floors", {}), "daily": user["daily"],
        "level": user["level"], "exp": user["exp"]}})
    rewards = {"ryo": r["ryo"], "gems": gems_gained, "items": r["items"], "hero_exp": hero_exp,
               "boss": r["boss"], "milestone": r.get("milestone", False), "advancing": advancing}
    if path != "normal" and advancing:
        rewards["essence"] = f"{path}_essence"
    return {"profile": public_user(user), "rewards": rewards, "result": "win", "floor": floor, "advancing": advancing, "level_up": level_up}


@api_router.post("/game/trial/complete")
async def trial_complete(body: TrialCompleteIn, user: dict = Depends(get_current_user)):
    trial = gd.TRIALS_BY_ID.get(body.trial_id)
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    if body.result != "win":
        return {"profile": public_user(user), "rewards": None, "result": "lose"}
    rw = trial["rewards"]
    user["ryo"] = user.get("ryo", 0) + rw.get("ryo", 0)
    hero_exp = distribute_hero_exp(user, body.participants or list(user.get("team", [])), body.survivors, rw.get("hero_exp", 40))
    inventory = user.get("inventory", {})
    for iid, qty in rw.get("items", {}).items():
        inventory[iid] = inventory.get(iid, 0) + qty

    # --- Resource Dungeon extras (gear drops / blueprint rolls) ---
    gear_reward = None
    blueprint_reward = None
    if trial.get("gear_drop") and len(user.get("gear", [])) < GEAR_INVENTORY_CAP:
        spec = trial["gear_drop"]
        g = gd.roll_gear(min_tier=spec["min_tier"], max_tier=spec["max_tier"], luck=min(0.75, spec.get("luck", 0)))
        user.setdefault("gear", []).append(g)
        gear_reward = gear_public(g)
    bp_chance = rw.get("blueprint_chance")
    if bp_chance and rng.random() < bp_chance:
        bp = f"blueprint_{rng.choice(gd.GEAR_SLOTS)}"
        inventory[bp] = inventory.get(bp, 0) + 1
        blueprint_reward = bp

    user["inventory"] = inventory
    bump_mission(user, "trial_win")
    bump_mission(user, "any_win")
    level_up = await grant_player_exp(user, rw.get("hero_exp", 40))
    total_levels = sum(h["levels"] for h in hero_exp)
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "ninjas": user["ninjas"], "inventory": inventory, "daily": user["daily"],
        "gear": user.get("gear", []), "level": user["level"], "exp": user["exp"]}})
    items_out = dict(rw.get("items", {}))
    if blueprint_reward:
        items_out[blueprint_reward] = items_out.get(blueprint_reward, 0) + 1
    return {"profile": public_user(user),
            "rewards": {"ryo": rw.get("ryo", 0), "items": items_out, "hero_exp": hero_exp, "gear": gear_reward},
            "result": "win", "level_up": level_up}


@api_router.get("/game/tsukuyomi")
async def tsukuyomi_list(user: dict = Depends(get_current_user)):
    """The Infinite Nightmare — 25 escalating bosses with basic + rare (gear-set)
    drops and a difficulty selector. Progress is tracked per boss + difficulty.
    Stages unlock sequentially: a stage is only playable after the previous one
    is cleared."""
    progress = user.get("tsukuyomi") or {}
    highest_cleared = user.get("tsukuyomi_highest_cleared", 0)
    return {
        "bosses": [gd.tsukuyomi_boss_public(b, progress, highest_cleared) for b in gd.TSUKUYOMI_BOSSES],
        "difficulties": gd.TSUKUYOMI_DIFFICULTIES,
        "progress": progress,
        "first_clears": user.get("tsukuyomi_fc") or {},
        "energy_cost": gd.ENERGY_COST["tsukuyomi"],
        "highest_cleared": highest_cleared,
    }


@api_router.post("/game/tsukuyomi/complete")
async def tsukuyomi_complete(body: TsukuyomiCompleteIn, user: dict = Depends(get_current_user)):
    boss = gd.TSUKUYOMI_BY_ID.get(body.boss_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Nightmare not found")
    diff = gd.TSUKU_DIFF_BY_ID.get(body.difficulty)
    if not diff:
        raise HTTPException(status_code=400, detail="Invalid difficulty")
    if body.result != "win":
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"losses": 1}})
        user["losses"] = user.get("losses", 0) + 1
        return {"profile": public_user(user), "rewards": None, "result": "lose"}

    r = gd.tsukuyomi_rewards(boss, body.difficulty)
    user["ryo"] = user.get("ryo", 0) + r["ryo"]
    user["wins"] = user.get("wins", 0) + 1
    hero_exp = distribute_hero_exp(user, body.participants or list(user.get("team", [])), body.survivors, r["hero_exp"])
    inventory = user.get("inventory", {})
    for iid, qty in r["items"].items():
        inventory[iid] = inventory.get(iid, 0) + qty

    # Forge material drops — Tsukuyomi bosses drop high-tier materials.
    tsuku_chapter = 30 + boss.get("index", 1) * 3   # map boss index to a high chapter
    _fc_done = (user.get("tsukuyomi_fc") or {}).get(body.boss_id, [])
    _is_fc = body.difficulty not in _fc_done
    forge_drops = gd.roll_forge_drops(tsuku_chapter, True, "tsukuyomi_dreamlord", _is_fc)
    if forge_drops:
        for iid, qty in forge_drops.items():
            inventory[iid] = inventory.get(iid, 0) + qty

    # RARE drop — a single random piece of the boss's signature gear set.
    gear_reward = None
    rare_hit = rng.random() < r["rare_chance"]
    if rare_hit and len(user.get("gear", [])) < GEAR_INVENTORY_CAP:
        g = gd.tsukuyomi_gear_drop(boss, body.difficulty)
        user.setdefault("gear", []).append(g)
        gear_reward = gear_public(g)

    # CRYSTAL drop — a super-rare bonus that scales with the boss's gear
    # rare-drop chance (boss index + difficulty) at a fraction of that rate.
    crystal_reward = None
    crystal_hit = ex.roll_crystal_drop(r["rare_chance"])
    if crystal_hit:
        user.setdefault("crystals", []).append(crystal_hit)
        crystal_reward = ex.crystal_public(crystal_hit)

    # progress: remember the highest difficulty cleared per boss
    tsuku = user.get("tsukuyomi") or {}
    order = {"normal": 1, "hard": 2, "nightmare": 3}
    prev = tsuku.get(body.boss_id)
    if not prev or order.get(body.difficulty, 0) > order.get(prev, 0):
        tsuku[body.boss_id] = body.difficulty
    user["tsukuyomi"] = tsuku

    # Sequential progression: update highest cleared stage index.
    # A stage counts as fully cleared only when ALL difficulties are beaten.
    boss_idx = boss.get("index", 1)
    highest_cleared = user.get("tsukuyomi_highest_cleared", 0)
    if tsuku.get(body.boss_id) == "nightmare" and boss_idx > highest_cleared:
        highest_cleared = boss_idx
    user["tsukuyomi_highest_cleared"] = highest_cleared

    # FIRST-CLEAR BONUS — one-time per (boss, difficulty).
    fc = user.get("tsukuyomi_fc") or {}
    done = fc.get(body.boss_id, [])
    first_clear_bonus = None
    if body.difficulty not in done:
        fcb = gd.tsukuyomi_first_clear_bonus(boss, body.difficulty)
        if fcb.get("gems"):
            user["gems"] = user.get("gems", 0) + fcb["gems"]
        for iid, n in fcb.get("items", {}).items():
            inventory[iid] = inventory.get(iid, 0) + n
        done = done + [body.difficulty]
        fc[body.boss_id] = done
        first_clear_bonus = fcb
    user["tsukuyomi_fc"] = fc

    user["inventory"] = inventory
    bump_mission(user, "any_win")
    level_up = await grant_player_exp(user, r["hero_exp"])
    total_levels = sum(h["levels"] for h in hero_exp)
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "wins": user["wins"], "ninjas": user["ninjas"], "inventory": inventory,
        "gear": user.get("gear", []), "crystals": user.get("crystals", []),
        "daily": user["daily"], "tsukuyomi": tsuku, "tsukuyomi_fc": fc,
        "tsukuyomi_highest_cleared": highest_cleared,
        "level": user["level"], "exp": user["exp"]}})
    return {"profile": public_user(user), "result": "win",
            "rewards": {"ryo": r["ryo"], "items": r["items"], "hero_exp": hero_exp,
                        "gear": gear_reward, "rare_hit": rare_hit, "rare_chance": r["rare_chance"],
                        "gear_set_name": boss["gear_set_name"], "first_clear_bonus": first_clear_bonus,
                        "crystal": crystal_reward,
                        "crystal_chance": round(r["rare_chance"] * ex.CRYSTAL_DROP_FRACTION, 4)},
            "level_up": level_up,
            "highest_cleared": highest_cleared}


@api_router.get("/game/shop")
async def shop_list(user: dict = Depends(get_current_user)):
    return {"items": gd.SHOP_ITEMS, "deals": gd.daily_shop_deals(), "skill_config": {
        "rank_max": gd.SKILL_RANK_MAX, "passive_unlock_rank": gd.PASSIVE_UNLOCK_RANK}}


@api_router.post("/game/shop/buy")
async def shop_buy(body: ShopBuyIn, user: dict = Depends(get_current_user)):
    entry = gd.SHOP_BY_ID.get(body.entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Item not found in shop")
    qty = max(1, min(99, body.qty))
    unit_price = gd.deal_price_for(body.entry_id)  # discounted if on today's deals
    on_deal = unit_price is not None
    if not on_deal:
        unit_price = entry["price"]
    total = unit_price * qty
    currency = entry["currency"]
    have = user.get("gems", 0) if currency == "gems" else user.get("ryo", 0)
    if have < total:
        label = "Gems" if currency == "gems" else "Ryo"
        raise HTTPException(status_code=400, detail=f"Not enough {label} — need {total}, have {have}")

    grant = entry.get("grant", {})
    # energy grant clamps to max
    granted = {"items": {}, "ryo": 0, "gems": 0, "energy": 0}
    if grant.get("energy"):
        estate = gd.compute_energy(user.get("energy"))
        add = grant["energy"] * qty
        new_current = min(estate["max"], estate["current"] + add)
        user["energy"] = {**estate, "current": new_current, "last_regen_at": datetime.now(timezone.utc).isoformat()}
        granted["energy"] = new_current - estate["current"]
    if grant.get("ryo"):
        user["ryo"] = user.get("ryo", 0) + grant["ryo"] * qty
        granted["ryo"] = grant["ryo"] * qty
    if grant.get("gems"):
        user["gems"] = user.get("gems", 0) + grant["gems"] * qty
        granted["gems"] = grant["gems"] * qty
    inventory = user.get("inventory", {})
    for iid, n in grant.get("items", {}).items():
        inventory[iid] = inventory.get(iid, 0) + n * qty
        granted["items"][iid] = n * qty
    user["inventory"] = inventory

    # charge
    if currency == "gems":
        user["gems"] = user.get("gems", 0) - total
    else:
        user["ryo"] = user.get("ryo", 0) - total

    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user.get("ryo", 0), "gems": user.get("gems", 0),
        "inventory": inventory, "energy": user.get("energy")}})
    return {"profile": public_user(user), "granted": granted, "spent": {"currency": currency, "amount": total}}


@api_router.get("/game/leaderboard")
async def leaderboard():
    users = await db.users.find({}).to_list(200)
    rows = []
    for u in users:
        power = sum(gd.ninja_power(i["template_id"], i["level"], i.get("ascension", 0)) for i in u.get("ninjas", []) if i["instance_id"] in u.get("team", []))
        rows.append({
            "name": u.get("name", "Shinobi"),
            "level": u.get("level", 1),
            "team_power": power,
            "wins": u.get("wins", 0),
            "cleared": len(u.get("cleared_stages", [])),
            "arena_rating": u.get("arena_rating", gd.ARENA_RATING_DEFAULT),
            "arena_wins": u.get("arena_wins", 0),
            "arena_losses": u.get("arena_losses", 0),
        })
    power_rows = sorted(rows, key=lambda r: (r["level"], r["team_power"]), reverse=True)
    arena_rows = sorted(rows, key=lambda r: (r["arena_rating"], r["arena_wins"]), reverse=True)
    return {"leaderboard": power_rows[:50], "arena_leaderboard": arena_rows[:50]}


# ---------------------------------------------------------------------------
# Admin — dynamic catalog, AI hero generation & portrait management
# ---------------------------------------------------------------------------
async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def load_catalog_config():
    """Load admin-created heroes + portrait/hero overrides from Mongo into the live catalog."""
    try:
        cfg = await db.game_config.find_one({"_id": "catalog"})
        custom = (cfg or {}).get("custom_heroes", [])
        overrides = (cfg or {}).get("portrait_overrides", {})
        hero_overrides = (cfg or {}).get("hero_overrides", {})
        tsuku_portraits = (cfg or {}).get("tsukuyomi_portrait_overrides", {})
        gd.load_dynamic(custom, overrides, hero_overrides)
        gd.load_tsukuyomi_portraits(tsuku_portraits)
    except Exception as e:
        logger.warning("Could not load dynamic catalog config (%s); using static catalog", e)


async def persist_catalog_config():
    await db.game_config.update_one(
        {"_id": "catalog"},
        {"$set": {"custom_heroes": gd._CUSTOM_HEROES, "portrait_overrides": gd._PORTRAIT_OVERRIDES,
                  "hero_overrides": gd._HERO_OVERRIDES,
                  "tsukuyomi_portrait_overrides": gd._TSUKUYOMI_PORTRAIT_OVERRIDES}},
        upsert=True,
    )


# Featured "rate-up" summon banner. When active, the featured hero has a flat boosted pull chance.
FEATURED_BANNER = {"template_id": None}
FEATURED_RATE_MULT = 2.0  # rate-up: featured hero's own weight is multiplied (relative boost, not a flat chance)


async def load_banner():
    doc = await db.game_config.find_one({"_id": "banner"})
    tid = (doc or {}).get("template_id")
    FEATURED_BANNER["template_id"] = tid if tid in gd.CATALOG_BY_ID else None


def banner_info():
    tid = FEATURED_BANNER["template_id"]
    t = gd.CATALOG_BY_ID.get(tid) if tid else None
    if not t:
        return None
    return {
        "template_id": t["id"], "name": t["name"], "title": t.get("title", ""),
        "rarity": t["rarity"], "element": t["element"], "role": t["role"],
        "portrait": t["portrait"], "rate_up_chance": FEATURED_RATE_MULT,
    }


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return s or "hero"


def _unique_id(base: str) -> str:
    hid = base
    i = 2
    while hid in gd.CATALOG_BY_ID:
        hid = f"{base}_{i}"
        i += 1
    return hid


def _save_portrait_png(hid: str, image_b64: str) -> str:
    if "," in image_b64 and image_b64.strip().startswith("data:"):
        image_b64 = image_b64.split(",", 1)[1]
    try:
        data = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")
    if len(data) > 6 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 6MB)")
    is_png = data[:8] == b"\x89PNG\r\n\x1a\n"
    is_jpg = data[:3] == b"\xff\xd8\xff"
    if not (is_png or is_jpg):
        raise HTTPException(status_code=400, detail="Image must be a PNG or JPEG")
    (CUSTOM_DIR / f"{hid}.png").write_bytes(data)
    return f"/custom/{hid}.png?v={int(time.time())}"


async def _ai_hero_design(body: HeroGenerateIn) -> dict:
    """Use the LLM to design stats/lore/element/role as structured JSON."""
    key = os.environ["EMERGENT_LLM_KEY"]
    chosen_el = body.element if body.element in gd.ELEMENTS else None
    chosen_rar = body.rarity if body.rarity in gd.RARITIES else None
    chosen_role = body.role if body.role in gd.ROLES else None
    system = (
        "You are a game designer for an anime ninja gacha RPG. Design ONE original fictional ninja. "
        "Respond with STRICT JSON only, no markdown, with keys: title (short epithet), element "
        f"(one of {gd.ELEMENTS}), rarity (one of {gd.RARITIES}), role (one of {gd.ROLES}), "
        "lore (1-2 vivid sentences), base_stats (object with integer hp, atk, def, spd, chakra). "
        "Typical ranges: hp 800-1500, atk 110-260, def 55-140, spd 60-160, chakra 100-150. "
        "Tanks have high hp/def low spd; Assassins high spd/atk; Support moderate with high chakra."
    )
    constraints = []
    if chosen_el: constraints.append(f"element MUST be {chosen_el}")
    if chosen_rar: constraints.append(f"rarity MUST be {chosen_rar}")
    if chosen_role: constraints.append(f"role MUST be {chosen_role}")
    prompt = f"Ninja name: {body.name}.\n"
    if body.concept:
        prompt += f"Concept/theme: {body.concept}.\n"
    if constraints:
        prompt += "Constraints: " + "; ".join(constraints) + ".\n"
    prompt += "Return the JSON now."

    chat = LlmChat(api_key=key, session_id=f"hero-design-{uuid.uuid4()}", system_message=system).with_model("openai", "gpt-4o-mini")
    raw = await chat.send_message(UserMessage(text=prompt))
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text).rstrip("`").strip()
    try:
        data = json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        try:
            data = json.loads(m.group(0)) if m else {}
        except Exception:
            data = {}

    element = chosen_el or (data.get("element") if data.get("element") in gd.ELEMENTS else "Fire")
    rarity = chosen_rar or (data.get("rarity") if data.get("rarity") in gd.RARITIES else "SR")
    role = chosen_role or (data.get("role") if data.get("role") in gd.ROLES else "Attacker")
    stats = gd.clamp_stats(data.get("base_stats", {}), rarity, role)
    return {
        "title": str(data.get("title", "") or "Unknown Shinobi")[:60],
        "element": element, "rarity": rarity, "role": role,
        "lore": str(data.get("lore", "") or "")[:400],
        "base_stats": stats,
    }


async def _ai_hero_portrait(hid: str, name: str, element: str, role: str, lore: str, rarity: str = "SR") -> str:
    key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=key, session_id=f"hero-art-{uuid.uuid4()}",
                   system_message="You generate high-quality, richly varied anime character portraits.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    var = _variation_modifiers(1)[0]
    prompt = (
        f"Anime-style vertical character portrait of an original fictional ninja warrior named {name}, "
        f"a {element}-element {role}. {lore}{_rarity_detail(rarity)} {var['angle']}, detailed ninja outfit with subtle "
        f"{element.lower()} energy effects. Distinct setting: {var['bg']}. Lighting: {var['light']}. "
        f"Color palette: {var['palette']}. Make it unique and original — avoid a generic dark gradient "
        "backdrop. Highly detailed digital painting, 3:4 portrait aspect ratio. No text, no watermark, no signature."
    )
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        raise HTTPException(status_code=502, detail="Image generation returned no image")
    return _save_portrait_png(hid, images[0]["data"])


def _hero_public(h: dict) -> dict:
    return {**h, "is_custom": gd.is_custom(h["id"])}


@api_router.get("/admin/heroes")
async def admin_list_heroes(_: dict = Depends(get_admin_user)):
    return {
        "heroes": [_hero_public(h) for h in gd.NINJA_CATALOG],
        "elements": gd.ELEMENTS, "roles": gd.ROLES, "rarities": gd.RARITIES,
    }


@api_router.post("/admin/hero/generate")
async def admin_generate_hero(body: HeroGenerateIn, _: dict = Depends(get_admin_user)):
    design = await _ai_hero_design(body)
    hid = _unique_id(_slugify(body.name))
    portrait = await _ai_hero_portrait(hid, body.name, design["element"], design["role"], design["lore"], design["rarity"])
    draft = {
        "id": hid, "name": body.name.strip(), "title": design["title"],
        "element": design["element"], "rarity": design["rarity"], "role": design["role"],
        "lore": design["lore"], "base_stats": design["base_stats"], "portrait": portrait,
    }
    return {"draft": draft}


@api_router.post("/admin/hero/save")
async def admin_save_hero(body: HeroSaveIn, _: dict = Depends(get_admin_user)):
    if body.element not in gd.ELEMENTS or body.rarity not in gd.RARITIES or body.role not in gd.ROLES:
        raise HTTPException(status_code=400, detail="Invalid element, rarity or role")
    hid = body.id or _unique_id(_slugify(body.name))
    # New heroes get auto-generated jutsus; existing custom heroes keep theirs.
    existing = next((h for h in gd._CUSTOM_HEROES if h["id"] == hid), None)
    jutsus = existing["jutsus"] if existing else gd._hero_jutsus(hid, body.name, body.element, body.rarity, body.role)
    hero = {
        "id": hid, "name": body.name.strip(), "title": body.title.strip() or "Unknown Shinobi",
        "element": body.element, "rarity": body.rarity, "role": body.role,
        "lore": body.lore.strip(), "base_stats": gd.clamp_stats(body.base_stats, body.rarity, body.role),
        "jutsus": jutsus, "portrait": body.portrait or f"/custom/{hid}.png",
    }
    gd.upsert_custom_hero(hero)
    await persist_catalog_config()
    return {"hero": _hero_public(gd.CATALOG_BY_ID[hid])}


@api_router.post("/admin/hero/edit")
async def admin_edit_hero(body: HeroSaveIn, _: dict = Depends(get_admin_user)):
    """Edit ANY hero (static or custom) — rarity, element, role, name, title,
    lore, base_stats, jutsus. For custom heroes, upserts the full hero dict;
    for static heroes, applies field-level overrides that merge on top of
    the original catalog entry."""
    if body.element not in gd.ELEMENTS or body.rarity not in gd.RARITIES or body.role not in gd.ROLES:
        raise HTTPException(status_code=400, detail="Invalid element, rarity or role")
    hid = body.id
    if not hid or hid not in gd.CATALOG_BY_ID:
        raise HTTPException(status_code=404, detail="Hero not found")

    fields = {
        "name": body.name.strip(),
        "title": body.title.strip() or "Unknown Shinobi",
        "element": body.element,
        "rarity": body.rarity,
        "role": body.role,
        "lore": body.lore.strip(),
        "base_stats": gd.clamp_stats(body.base_stats, body.rarity, body.role),
    }
    if body.jutsus is not None:
        fields["jutsus"] = body.jutsus
    if body.portrait:
        fields["portrait"] = body.portrait

    if gd.is_custom(hid):
        # Custom hero — full upsert (keeps existing jutsus if not provided)
        existing = gd.CATALOG_BY_ID[hid]
        hero = {**existing, **fields}
        gd.upsert_custom_hero(hero)
    else:
        # Static hero — field-level override
        gd.set_hero_override(hid, fields)
    await persist_catalog_config()
    return {"hero": _hero_public(gd.CATALOG_BY_ID[hid])}


@api_router.post("/admin/hero/portrait")
async def admin_upload_portrait(body: PortraitUploadIn, _: dict = Depends(get_admin_user)):
    if body.template_id not in gd.CATALOG_BY_ID:
        raise HTTPException(status_code=404, detail="Hero not found")
    portrait = _save_portrait_png(body.template_id, body.image)
    if gd.is_custom(body.template_id):
        hero = dict(gd.CATALOG_BY_ID[body.template_id])
        hero["portrait"] = portrait
        gd.upsert_custom_hero(hero)
    else:
        gd.set_portrait_override(body.template_id, portrait)
    await persist_catalog_config()
    return {"hero": _hero_public(gd.CATALOG_BY_ID[body.template_id])}


@api_router.delete("/admin/hero/{hid}/portrait")
async def admin_reset_portrait(hid: str, _: dict = Depends(get_admin_user)):
    if hid not in gd.CATALOG_BY_ID:
        raise HTTPException(status_code=404, detail="Hero not found")
    if gd.is_custom(hid):
        raise HTTPException(status_code=400, detail="Custom heroes have no original art to restore")
    if not gd.clear_portrait_override(hid):
        raise HTTPException(status_code=400, detail="This hero has no overridden portrait")
    (CUSTOM_DIR / f"{hid}.png").unlink(missing_ok=True)
    await persist_catalog_config()
    return {"hero": _hero_public(gd.CATALOG_BY_ID[hid])}


@api_router.get("/admin/tsukuyomi")
async def admin_list_tsukuyomi(_: dict = Depends(get_admin_user)):
    """List all Tsukuyomi nightmare bosses with their current portrait info."""
    return {
        "bosses": [
            {
                "id": b["id"], "index": b["index"], "name": b["name"],
                "template_id": b["template_id"], "rarity": b["rarity"],
                "element": b["element"],
                "portrait": gd._TSUKUYOMI_PORTRAIT_OVERRIDES.get(b["id"], b["portrait"]),
                "default_portrait": b["portrait"],
                "portrait_overridden": b["id"] in gd._TSUKUYOMI_PORTRAIT_OVERRIDES,
            }
            for b in gd.TSUKUYOMI_BOSSES
        ],
    }


@api_router.post("/admin/tsukuyomi/portrait")
async def admin_tsukuyomi_portrait(body: PortraitUploadIn, _: dict = Depends(get_admin_user)):
    """Upload a custom portrait for a Tsukuyomi nightmare boss."""
    boss = gd.TSUKUYOMI_BY_ID.get(body.template_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Tsukuyomi boss not found")
    portrait = _save_portrait_png(f"tsuku_{body.template_id}", body.image)
    gd.set_tsukuyomi_portrait(body.template_id, portrait)
    await persist_catalog_config()
    return {
        "id": boss["id"], "name": boss["name"],
        "portrait": portrait, "portrait_overridden": True,
    }


@api_router.delete("/admin/tsukuyomi/{boss_id}/portrait")
async def admin_reset_tsukuyomi_portrait(boss_id: str, _: dict = Depends(get_admin_user)):
    """Reset a Tsukuyomi boss portrait back to the hero template's default."""
    boss = gd.TSUKUYOMI_BY_ID.get(boss_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Tsukuyomi boss not found")
    if not gd.clear_tsukuyomi_portrait(boss_id):
        raise HTTPException(status_code=400, detail="This boss has no overridden portrait")
    (CUSTOM_DIR / f"tsuku_{boss_id}.png").unlink(missing_ok=True)
    await persist_catalog_config()
    return {
        "id": boss["id"], "name": boss["name"],
        "portrait": boss["portrait"], "portrait_overridden": False,
    }


@api_router.delete("/admin/hero/{hid}")
async def admin_delete_hero(hid: str, _: dict = Depends(get_admin_user)):
    if not gd.is_custom(hid):
        raise HTTPException(status_code=400, detail="Only admin-created heroes can be deleted")
    gd.remove_custom_hero(hid)
    (CUSTOM_DIR / f"{hid}.png").unlink(missing_ok=True)
    if FEATURED_BANNER["template_id"] == hid:
        FEATURED_BANNER["template_id"] = None
        await db.game_config.update_one({"_id": "banner"}, {"$set": {"template_id": None}}, upsert=True)
    await persist_catalog_config()
    return {"ok": True, "deleted": hid}


class BannerIn(BaseModel):
    template_id: str


@api_router.get("/admin/banner")
async def admin_get_banner(_: dict = Depends(get_admin_user)):
    return {"banner": banner_info()}


@api_router.post("/admin/banner")
async def admin_set_banner(body: BannerIn, _: dict = Depends(get_admin_user)):
    t = gd.CATALOG_BY_ID.get(body.template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Hero not found")
    if gd.RARITY_ORDER[t["rarity"]] < gd.RARITY_ORDER["SSR"]:
        raise HTTPException(status_code=400, detail="Only SSR, UR or GR heroes can be featured")
    FEATURED_BANNER["template_id"] = body.template_id
    await db.game_config.update_one({"_id": "banner"}, {"$set": {"template_id": body.template_id}}, upsert=True)
    return {"banner": banner_info()}


@api_router.delete("/admin/banner")
async def admin_clear_banner(_: dict = Depends(get_admin_user)):
    FEATURED_BANNER["template_id"] = None
    await db.game_config.update_one({"_id": "banner"}, {"$set": {"template_id": None}}, upsert=True)
    return {"banner": None}


# ---------------------------------------------------------------------------
# ADMIN — Gear/Equipment editor (set bonuses, rarity meta, set icons).
# Overrides are merged onto the static GEAR_SETS / GEAR_RARITY_META dicts and
# persisted to Mongo so they survive restarts.
# ---------------------------------------------------------------------------
async def load_gear_config():
    doc = await db.game_config.find_one({"_id": "gear_config"}) or {}
    sets = doc.get("sets")
    if isinstance(sets, dict):
        for sid, fields in sets.items():
            if sid in gd.GEAR_SETS and isinstance(fields, dict):
                gd.GEAR_SETS[sid].update(fields)
    rmeta = doc.get("rarity_meta")
    if isinstance(rmeta, dict):
        for r, fields in rmeta.items():
            if r in gd.GEAR_RARITY_META and isinstance(fields, dict):
                gd.GEAR_RARITY_META[r].update(fields)


async def persist_gear_config():
    await db.game_config.update_one(
        {"_id": "gear_config"},
        {"$set": {"sets": gd.GEAR_SETS, "rarity_meta": gd.GEAR_RARITY_META}},
        upsert=True,
    )


class ImageUploadIn(BaseModel):
    image: str  # base64 (optionally a data URL)


class GearSetIn(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    bonus2: Optional[dict] = None
    bonus4: Optional[dict] = None


class GearRarityIn(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    mult: Optional[float] = None
    subs: Optional[int] = None
    tier: Optional[int] = None


@api_router.get("/admin/gear-config")
async def admin_get_gear_config(_: dict = Depends(get_admin_user)):
    return {"sets": gd.GEAR_SETS, "rarities": gd.GEAR_RARITIES, "rarity_meta": gd.GEAR_RARITY_META,
            "slots": gd.GEAR_SLOTS, "slot_meta": gd.GEAR_SLOT_META,
            "substat_pool": gd.GEAR_SUBSTAT_POOL}


@api_router.put("/admin/gear-set/{set_id}")
async def admin_update_gear_set(set_id: str, body: GearSetIn, _: dict = Depends(get_admin_user)):
    if set_id not in gd.GEAR_SETS:
        raise HTTPException(status_code=404, detail="Gear set not found")
    s = gd.GEAR_SETS[set_id]
    if body.name is not None:
        s["name"] = body.name[:40]
    if body.color is not None:
        s["color"] = body.color
    if body.bonus2 is not None:
        s["bonus2"] = body.bonus2
    if body.bonus4 is not None:
        s["bonus4"] = body.bonus4
    await persist_gear_config()
    return {"set": gd.GEAR_SETS[set_id]}


@api_router.post("/admin/gear-set/{set_id}/icon")
async def admin_upload_gear_icon(set_id: str, body: ImageUploadIn, _: dict = Depends(get_admin_user)):
    if set_id not in gd.GEAR_SETS:
        raise HTTPException(status_code=404, detail="Gear set not found")
    icon = _save_portrait_png(f"gear_{set_id}", body.image)
    gd.GEAR_SETS[set_id]["icon"] = icon
    await persist_gear_config()
    return {"set": gd.GEAR_SETS[set_id]}


@api_router.put("/admin/gear-rarity/{rarity}")
async def admin_update_gear_rarity(rarity: str, body: GearRarityIn, _: dict = Depends(get_admin_user)):
    if rarity not in gd.GEAR_RARITY_META:
        raise HTTPException(status_code=404, detail="Rarity not found")
    m = gd.GEAR_RARITY_META[rarity]
    if body.name is not None:
        m["name"] = body.name[:40]
    if body.color is not None:
        m["color"] = body.color
    if body.mult is not None:
        m["mult"] = float(body.mult)
    if body.subs is not None:
        m["subs"] = max(0, int(body.subs))
    if body.tier is not None:
        m["tier"] = max(1, int(body.tier))
    await persist_gear_config()
    return {"rarity_meta": gd.GEAR_RARITY_META[rarity]}


# ---------------------------------------------------------------------------
# ADMIN — Economy / global game knobs. These mutate live game_data attributes
# so every read-site picks them up instantly, and persist to Mongo so they
# survive restarts (re-applied in load_economy on startup).
# ---------------------------------------------------------------------------
ECON_FIELDS = {
    "summon_cost": ("SUMMON_COST", int),
    "gem_summon_cost": ("GEM_SUMMON_COST", int),
    "gem_energy_refill_per_point": ("GEM_ENERGY_REFILL_COST_PER_POINT", int),
    "gem_energy_refill_min": ("GEM_ENERGY_REFILL_MIN_COST", int),
    "gear_summon_gem_cost": ("GEAR_SUMMON_GEM_COST", int),
    "pity_soft_start": ("MYTHIC_SOFT_PITY_START", int),
    "pity_hard": ("MYTHIC_HARD_PITY", int),
    "featured_5050": ("FEATURED_MYTHIC_5050", float),
}


def _econ_snapshot():
    snap = {k: getattr(gd, attr) for k, (attr, _) in ECON_FIELDS.items()}
    snap["featured_rate_mult"] = FEATURED_RATE_MULT
    return snap


async def load_economy():
    global FEATURED_RATE_MULT
    doc = await db.game_config.find_one({"_id": "economy"}) or {}
    for k, (attr, cast) in ECON_FIELDS.items():
        if k in doc:
            try: setattr(gd, attr, cast(doc[k]))
            except Exception: pass
    if "featured_rate_mult" in doc:
        try: FEATURED_RATE_MULT = float(doc["featured_rate_mult"])
        except Exception: pass


@api_router.get("/admin/economy")
async def admin_get_economy(_: dict = Depends(get_admin_user)):
    return {"economy": _econ_snapshot(), "summon_rates": gd.summon_rates("gems"), "summon_rates_ryo": gd.summon_rates("ryo")}


@api_router.post("/admin/economy")
async def admin_set_economy(body: dict = Body(...), _: dict = Depends(get_admin_user)):
    global FEATURED_RATE_MULT
    updates = {}
    for k, (attr, cast) in ECON_FIELDS.items():
        if k in body and body[k] is not None:
            try:
                val = cast(body[k])
                setattr(gd, attr, val)
                updates[k] = val
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid value for {k}")
    if "featured_rate_mult" in body and body["featured_rate_mult"] is not None:
        FEATURED_RATE_MULT = float(body["featured_rate_mult"]); updates["featured_rate_mult"] = FEATURED_RATE_MULT
    if updates:
        await db.game_config.update_one({"_id": "economy"}, {"$set": updates}, upsert=True)
    return {"economy": _econ_snapshot(), "summon_rates": gd.summon_rates("gems")}


# ---------------------------------------------------------------------------
# ADMIN — Game Config (Balance, Heroes & Stats). Hybrid DB-backed overrides
# applied live to game_data module attributes + persisted to Mongo.
# ---------------------------------------------------------------------------
@api_router.get("/admin/config")
async def admin_get_config(_: dict = Depends(get_admin_user)):
    return {"config": ac.config_by_category(), "all": ac.config_snapshot()}


@api_router.post("/admin/config")
async def admin_set_config(body: dict = Body(...), _: dict = Depends(get_admin_user)):
    try:
        snap = await ac.save_game_config(db, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"config": snap, "summon_rates": gd.summon_rates("gems"), "summon_rates_ryo": gd.summon_rates("ryo")}


# ---------------------------------------------------------------------------
# ADMIN — Stage editor (enemies, rewards, first-clear, boss mechanic).
# ---------------------------------------------------------------------------
@api_router.get("/admin/stages-config")
async def admin_get_stages_config(_: dict = Depends(get_admin_user)):
    stages = [{**s, "recommended_power": sum(gd.ninja_power(e["template_id"], e["level"]) for e in s["enemies"])}
              for s in gd.STAGES]
    return {"stages": stages, "boss_mechanics": ac._json_safe(gd.BOSS_MECHANICS),
            "hero_ids": sorted(gd.CATALOG_BY_ID.keys())}


@api_router.put("/admin/stage/{stage_id}")
async def admin_update_stage(stage_id: str, body: dict = Body(...), _: dict = Depends(get_admin_user)):
    try:
        updated = await ac.save_stage_override(db, stage_id, body)
    except KeyError:
        raise HTTPException(status_code=404, detail="Stage not found")
    return {"stage": updated}


# ---------------------------------------------------------------------------
# ADMIN — Boss mechanic editor (phases, multipliers, immunities, adds).
# ---------------------------------------------------------------------------
@api_router.put("/admin/boss-mechanic/{mech_id}")
async def admin_update_boss_mechanic(mech_id: str, body: dict = Body(...), _: dict = Depends(get_admin_user)):
    try:
        updated = await ac.save_boss_override(db, mech_id, body)
    except KeyError:
        raise HTTPException(status_code=404, detail="Boss mechanic not found")
    return {"mechanic": updated}


# ---------------------------------------------------------------------------
# ADMIN — Player management. Search users and grant/set any currency, level,
# energy, tickets or upgrade materials. "add" increments, "set" overwrites.
# ---------------------------------------------------------------------------
GRANT_FIELDS = ["ryo", "gems"]
GRANT_INV = ["summon_ticket", "gear_ticket", "ascension_crystal", "evo_stone", "gold_dust"]


@api_router.get("/admin/players")
async def admin_list_players(q: str = "", _: dict = Depends(get_admin_user)):
    query = {}
    if q:
        query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]}
    rows = await db.users.find(query).limit(50).to_list(50)
    out = []
    for u in rows:
        uid = u.get("id") or str(u.get("_id"))
        out.append({
            "id": uid, "name": u.get("name"), "email": u.get("email"), "role": u.get("role", "player"),
            "level": u.get("level", 1), "ryo": u.get("ryo", 0), "gems": u.get("gems", 0),
            "energy": (u.get("energy") or {}).get("current", 0),
            "heroes": len(u.get("ninjas", [])),
            "inventory": {k: (u.get("inventory") or {}).get(k, 0) for k in GRANT_INV},
        })
    return {"players": out, "count": len(out)}


@api_router.post("/admin/player/grant")
async def admin_grant_player(body: dict = Body(...), _: dict = Depends(get_admin_user)):
    uid = body.get("user_id")
    mode = body.get("mode", "add")  # "add" | "set"
    u = await db.users.find_one({"id": uid})
    if not u:
        try:
            from bson import ObjectId
            u = await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            u = None
    if not u:
        raise HTTPException(status_code=404, detail="Player not found")
    key = {"id": u["id"]} if u.get("id") else {"_id": u["_id"]}
    setd = {}
    for f in GRANT_FIELDS:
        if body.get(f) not in (None, ""):
            cur = u.get(f, 0)
            setd[f] = int(body[f]) if mode == "set" else cur + int(body[f])
            setd[f] = max(0, setd[f])
    if body.get("level") not in (None, ""):
        setd["level"] = max(1, int(body["level"])) if mode == "set" else max(1, u.get("level", 1) + int(body["level"]))
    inv = dict(u.get("inventory") or {})
    for f in GRANT_INV:
        if body.get(f) not in (None, ""):
            inv[f] = int(body[f]) if mode == "set" else inv.get(f, 0) + int(body[f])
            inv[f] = max(0, inv[f])
    if any(body.get(f) not in (None, "") for f in GRANT_INV):
        setd["inventory"] = inv
    if body.get("energy") not in (None, ""):
        en = dict(u.get("energy") or {"current": 0, "max": 120})
        en["current"] = int(body["energy"]) if mode == "set" else en.get("current", 0) + int(body["energy"])
        en["current"] = max(0, en["current"])
        setd["energy"] = en
    if setd:
        await db.users.update_one(key, {"$set": setd})
    fresh = await db.users.find_one(key)
    return {"ok": True, "player": {"id": uid, "name": fresh.get("name"), "level": fresh.get("level"),
            "ryo": fresh.get("ryo"), "gems": fresh.get("gems"),
            "energy": (fresh.get("energy") or {}).get("current", 0),
            "inventory": {k: (fresh.get("inventory") or {}).get(k, 0) for k in GRANT_INV}}}


# ---------------------------------------------------------------------------
# Admin Art Studio — generate downloadable high-quality character art
# ---------------------------------------------------------------------------
ART_MODELS = {
    "pro": "gemini-3-pro-image-preview",
    "flash": "gemini-3.1-flash-image-preview",
}

# Higher rarity = more ornate, detailed, effect-heavy art. Drives the prompt's detail tier.
RARITY_ART = {
    "R":   "clean, grounded design with modest practical details, simple attire and minimal special effects",
    "SR":  "a more detailed costume with decorative accents, refined gear and a subtle elemental glow",
    "SSR": "a highly detailed, ornate costume with rich materials, glowing elemental effects and a dynamic energy aura",
    "UR":  "extremely intricate ornate armor with gold and gem accents, a radiant elemental aura, dramatic magical particle effects and an epic atmosphere",
    "LR":  "an ultra-detailed god-tier splash-art design with an overwhelming radiant aura, divine cosmic energy, elaborate ornamentation, swirling particle effects and a legendary mythic presence at the highest level of detail",
}


def _rarity_detail(rarity) -> str:
    if rarity in RARITY_ART:
        return f" Rarity tier {rarity}: {RARITY_ART[rarity]}."
    return ""

# Diverse modifier pools so each variation in a batch is visually distinct
# (the #1 cause of "generic AI art" is reusing the same background/lighting prompt).
ART_BACKGROUNDS = [
    "a moonlit bamboo forest shrouded in mist",
    "a snow-capped mountain shrine at twilight",
    "a neon-lit ninja village rooftop at night, glowing signs in the rain",
    "a blazing volcanic cavern with rivers of lava",
    "a misty waterfall cliff with floating spirit lanterns",
    "an ancient stone temple interior lit by torchlight",
    "a cherry-blossom courtyard at dusk, petals drifting in the wind",
    "stormy ocean cliffs under crashing waves and lightning",
    "desert ruins beneath a blood-red sky and twin moons",
    "a golden autumn maple grove with falling leaves",
    "a glowing underground crystal cavern",
    "a war-torn battlefield at dawn with drifting smoke",
    "floating sky islands above a sea of clouds",
    "a lantern-lit festival street bustling at night",
    "a frozen tundra with shimmering aurora overhead",
    "a minimalist ink-wash sumi-e void with bold brushstrokes",
]
ART_LIGHTING = [
    "dramatic rim backlighting", "warm golden-hour glow", "cool moonlit silver light",
    "high-contrast chiaroscuro shadows", "soft diffused ambient light", "vivid neon glow",
    "fiery underlight from below", "ethereal bioluminescent glow", "flashes of stormy lightning",
    "dappled sunlight through foliage",
]
ART_ANGLES = [
    "heroic low-angle shot looking up", "dynamic three-quarter action view",
    "intense head-and-shoulders close-up", "full-body mid-motion leaping pose",
    "over-the-shoulder turning glance", "centered symmetrical power stance",
    "dramatic dutch-tilt combat angle", "crouched ready-to-strike stance",
]
ART_PALETTES = [
    "vibrant saturated colors", "muted earthy tones", "moody teal-and-orange contrast",
    "soft pastel hues", "rich jewel tones", "warm amber and crimson",
    "cold blue and violet", "stark monochrome with a single accent color",
]


def _variation_modifiers(count: int) -> list:
    """Pick distinct background/lighting/angle/palette combos for each variation."""
    bgs = random.sample(ART_BACKGROUNDS, count)
    lights = random.sample(ART_LIGHTING, count)
    angles = random.sample(ART_ANGLES, count)
    pals = random.sample(ART_PALETTES, count)
    return [{"bg": bgs[i], "light": lights[i], "angle": angles[i], "palette": pals[i]} for i in range(count)]


def _build_art_prompt(name: str, description: str, element: Optional[str], style: str, pose: str, var: dict, rarity: Optional[str] = None) -> str:
    style = (style or "anime").strip()
    parts = [f"{style} style character art of an original fictional ninja warrior named {name}."]
    if description.strip():
        parts.append(description.strip())
    if element in gd.ELEMENTS:
        parts.append(f"{element}-element themed, with subtle {element.lower()} energy effects.")
    rd = _rarity_detail(rarity)
    if rd:
        parts.append(rd.strip())
    parts.append(pose.strip() if pose.strip() else f"Composition: {var['angle']}.")
    parts.append(f"Distinct setting: {var['bg']}.")
    parts.append(f"Lighting: {var['light']}. Color palette: {var['palette']}.")
    parts.append(
        "Make this render visually UNIQUE and original — do NOT use a generic dark gradient studio "
        "backdrop or a repetitive composition; commit fully to the described setting and mood. "
        "Intricately detailed costume and gear, ultra high resolution, sharp focus, masterpiece quality, "
        "professional digital painting, vertical 3:4 portrait composition. No text, no watermark, no signature, no border."
    )
    return " ".join(parts)


async def _generate_art_image(prompt: str, model_id: str):
    key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=key, session_id=f"art-{uuid.uuid4()}",
                   system_message="You generate high-quality, richly detailed anime character art.")
    chat.with_model("gemini", model_id).with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        return None
    img = images[0]
    return f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}"


@api_router.post("/admin/art/describe")
async def admin_art_describe(body: ArtDescribeIn, _: dict = Depends(get_admin_user)):
    key = os.environ["EMERGENT_LLM_KEY"]
    system = (
        "You are a concept artist for an anime ninja game. Given a character's traits, write a vivid, "
        "purely VISUAL description (2-3 sentences) suitable for an image generator: appearance, hair/eyes, "
        "outfit, colors, signature weapon and mood. Output only the description, no preamble or quotes."
    )
    prompt = f"Character name: {body.name}."
    if body.element:
        prompt += f" Element: {body.element}."
    if body.role:
        prompt += f" Combat role: {body.role}."
    if body.style:
        prompt += f" Art style: {body.style}."
    if body.notes.strip():
        prompt += f" Extra notes: {body.notes.strip()}."
    prompt += " Write the visual description now."
    chat = LlmChat(api_key=key, session_id=f"art-desc-{uuid.uuid4()}", system_message=system).with_model("openai", "gpt-4o-mini")
    text = await chat.send_message(UserMessage(text=prompt))
    return {"description": (text or "").strip().strip('"')[:600]}


@api_router.post("/admin/art/generate")
async def admin_art_generate(body: ArtGenerateIn, _: dict = Depends(get_admin_user)):
    model_id = ART_MODELS.get(body.model, ART_MODELS["flash"])
    count = max(1, min(4, body.count))
    mods = _variation_modifiers(count)
    prompts = [_build_art_prompt(body.name, body.description, body.element, body.style, body.pose, mods[i], body.rarity) for i in range(count)]
    results = await asyncio.gather(*[_generate_art_image(prompts[i], model_id) for i in range(count)], return_exceptions=True)
    images = []
    for i, r in enumerate(results):
        if isinstance(r, str):
            images.append({"id": i, "data_url": r, "scene": mods[i]["bg"]})
        elif isinstance(r, Exception):
            logger.warning("Art generation variation failed: %s", r)
    if not images:
        raise HTTPException(status_code=502, detail="Art generation failed — please try again")
    return {"images": images, "model": model_id, "prompt": prompts[0]}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Shinobi Clash API online"}


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await load_catalog_config()
    await load_banner()
    await load_economy()
    await load_gear_config()
    await ac.load_game_config(db)
    await ac.load_stage_overrides(db)
    await ac.load_boss_overrides(db)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@shinobi.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        starters = [new_ninja_instance(tid) for tid in gd.STARTER_NINJAS]
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password), "name": "Sensei",
            "role": "admin", "created_at": datetime.now(timezone.utc).isoformat(),
            "level": 1, "exp": 0, "ryo": 50000, "gems": 5000,
            "inventory": {"exp_tome_minor": 20, "exp_tome_greater": 5, "exp_tome_ancient": 1, "ascension_crystal": 30, "summon_ticket": 5},
            "ninjas": starters, "team": [s["instance_id"] for s in starters],
            "cleared_stages": [], "wins": 0, "losses": 0,
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
