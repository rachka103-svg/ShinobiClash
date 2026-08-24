from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import asyncio
import uuid
import random
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


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        changed_e = ensure_energy_state(user)
        changed_d = ensure_daily_state(user)
        changed_a = ensure_arena_state(user)
        changed_l = ensure_login_state(user)
        if changed_e or changed_d or changed_a or changed_l:
            await db.users.update_one({"_id": user["_id"]}, {"$set": {
                "energy": user["energy"], "daily": user["daily"],
                "arena_rating": user["arena_rating"], "arena_wins": user["arena_wins"],
                "arena_losses": user["arena_losses"], "arena_daily": user["arena_daily"],
                "login": user["login"],
            }})
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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


class AscendIn(BaseModel):
    instance_id: str


class StarUpIn(BaseModel):
    instance_id: str


class SpireCompleteIn(BaseModel):
    floor: int
    result: str
    participants: List[str] = []
    survivors: List[str] = []


class BattleStartIn(BaseModel):
    mode: str  # "campaign" | "spire" | "trial"
    id: str


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


class PortraitUploadIn(BaseModel):
    template_id: str
    image: str  # base64 (optionally a data URL)


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


def public_user(user: dict) -> dict:
    """Serialize a user document into a JSON-safe game profile."""
    ninjas = user.get("ninjas", [])
    gear_all = user.get("gear", [])
    gear_by_hero = {}
    for g in gear_all:
        if g.get("equipped_by"):
            gear_by_hero.setdefault(g["equipped_by"], []).append(g)
    for inst in ninjas:
        inst.setdefault("exp", 0)
        inst.setdefault("ascension", 0)
        inst.setdefault("stars", 1)
        asc = inst["ascension"]
        tmpl = gd.CATALOG_BY_ID.get(inst["template_id"])
        if not tmpl:
            continue
        rarity = tmpl["rarity"]
        star_mult = _star_bonus_mult(inst["stars"])
        base_stats = gd.compute_stats(inst["template_id"], inst["level"], asc)
        star_stats = {k: (round(v * star_mult) if k in ("hp", "atk", "def") else v) for k, v in base_stats.items()}
        equipped = gear_by_hero.get(inst["instance_id"], [])
        final_stats = gd.apply_gear_to_stats(star_stats, equipped) if equipped else star_stats
        inst["stats"] = final_stats
        inst["power"] = _power_from_stats(final_stats)
        inst["equipped_gear"] = {g["slot"]: g["gear_id"] for g in equipped}
        inst["gear_score"] = sum(gd.gear_score(g) for g in equipped)
        inst["exp_to_next"] = gd.hero_exp_to_next(inst["level"])
        inst["level_cap"] = gd.level_cap(rarity, asc)
        inst["ascension_max"] = gd.ASCENSION_MAX[rarity]
        inst["max_level"] = gd.max_level(rarity)
        inst["stars_max"] = gd.STAR_LEVEL_MAX
        inst["evolution_cost"] = gd.evolution_cost(rarity, inst["stars"]) if inst["stars"] < gd.STAR_LEVEL_MAX else None
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
        "pity": user.get("pity") or gd.fresh_pity_state(),
        "team": user.get("team", []),
        "cleared_stages": user.get("cleared_stages", []),
        "spire_floor": user.get("spire_floor", 0),
        "wins": user.get("wins", 0),
        "losses": user.get("losses", 0),
        "team_power": team_power,
        "team_cap": gd.max_team_size(user.get("level", 1)),
        "next_slot_level": gd.next_slot_level(user.get("level", 1)),
        "energy": user.get("energy") or gd.compute_energy(None),
        "missions": missions_public(user.get("daily") or gd.fresh_daily_state()),
        "arena": arena_public(user),
        "login": login_public(user),
    }


async def grant_player_exp(user: dict, amount: int):
    level = user.get("level", 1)
    exp = user.get("exp", 0) + amount
    while exp >= gd.exp_to_next(level):
        exp -= gd.exp_to_next(level)
        level += 1
    user["level"] = level
    user["exp"] = exp


def grant_hero_exp(inst: dict, amount: int) -> int:
    """Add EXP to a hero, auto-leveling up to its cap. Returns levels gained."""
    rarity = gd.CATALOG_BY_ID[inst["template_id"]]["rarity"]
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
            "items": gd.ITEMS, "summon_cost": gd.SUMMON_COST,
            "trials": gd.TRIALS + gd.DUNGEON_TRIALS,
            "banner": banner_info(), "factions": gd.FACTIONS, "roles": gd.ROLES,
            "tags": gd.TAGS, "rarities": gd.RARITIES,
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
    enriched_stages = [
        {**s, "recommended_power": sum(gd.ninja_power(e["template_id"], e["level"]) for e in s["enemies"])}
        for s in gd.STAGES
    ]
    chapter_nums = sorted(set(s["chapter"] for s in gd.STAGES))
    chapters = [{"chapter": c, **gd.chapter_meta(c)} for c in chapter_nums]
    return {"stages": enriched_stages, "boss_mechanics": gd.BOSS_MECHANICS, "chapters": chapters}


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


@api_router.post("/game/battle/start")
async def battle_start(body: BattleStartIn, user: dict = Depends(get_current_user)):
    """Consumes Energy for a Campaign/Spire/Trial attempt. Must be called before
    entering the client-side battle screen; the attempt is charged regardless
    of the eventual win/lose outcome (standard gacha-game convention)."""
    mode = body.mode
    if mode not in gd.ENERGY_COST:
        raise HTTPException(status_code=400, detail="Invalid battle mode")
    if mode == "campaign" and body.id not in gd.STAGES_BY_ID:
        raise HTTPException(status_code=404, detail="Stage not found")
    if mode == "trial" and body.id not in gd.TRIALS_BY_ID:
        raise HTTPException(status_code=404, detail="Trial not found")
    if mode == "tsukuyomi" and body.id not in gd.TSUKUYOMI_BY_ID:
        raise HTTPException(status_code=404, detail="Nightmare not found")
    if mode == "spire":
        try:
            if int(body.id) < 1:
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid floor")

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
        await grant_player_exp(user, gd.ARENA_WIN_REWARDS["hero_exp_base"])
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "arena_rating": user["arena_rating"], "arena_wins": user["arena_wins"],
            "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"],
            "level": user["level"], "exp": user["exp"],
        }})
        return {"profile": public_user(user), "result": "win",
                "rewards": {"ryo": gd.ARENA_WIN_REWARDS["ryo"], "gems": gems_gained, "hero_exp": hero_exp}}
    else:
        user["arena_rating"] = max(0, user.get("arena_rating", gd.ARENA_RATING_DEFAULT) - gd.ARENA_RATING_LOSS)
        user["arena_losses"] = user.get("arena_losses", 0) + 1
        await db.users.update_one({"_id": user["_id"]}, {"$set": {
            "arena_rating": user["arena_rating"], "arena_losses": user["arena_losses"]}})
        return {"profile": public_user(user), "result": "lose", "rewards": None}


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
    base_exp = stage["rewards"]["exp"]
    rewards = {"ryo": stage["rewards"]["ryo"], "gems": 0, "exp": base_exp, "ninja": None, "hero_exp": [], "items": {}}

    user["ryo"] = user.get("ryo", 0) + rewards["ryo"]
    await grant_player_exp(user, base_exp)
    user["wins"] = user.get("wins", 0) + 1

    # distribute hero EXP to participants (survivors full, fallen half)
    ninjas = user.get("ninjas", [])
    survivors = set(body.survivors)
    participants = body.participants or list(user.get("team", []))
    for iid in participants:
        inst = next((n for n in ninjas if n["instance_id"] == iid), None)
        if not inst:
            continue
        gain = round(base_exp * (1.6 if iid in survivors else 0.8))
        levels = grant_hero_exp(inst, gain)
        tmpl = gd.CATALOG_BY_ID.get(inst["template_id"], {})
        rewards["hero_exp"].append({"instance_id": iid, "name": tmpl.get("name", "?"), "exp": gain,
                                     "levels": levels, "level": inst["level"]})

    # item drops
    inventory = user.get("inventory", {})
    drops = gd.roll_drops(stage.get("chapter", 1), first_clear)
    for iid, qty in drops.items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    rewards["items"] = drops

    # gear drops — battles from Chapter 2 onward can drop gear (long-term loop)
    chapter = stage.get("chapter", 1)
    rewards["gear"] = None
    if chapter >= 2 and len(user.get("gear", [])) < GEAR_INVENTORY_CAP and random.random() < 0.14:
        g = gd.roll_gear(min_tier=1, max_tier=min(1 + chapter // 3, 5), luck=min(0.5, chapter * 0.04))
        user.setdefault("gear", []).append(g)
        rewards["gear"] = gear_public(g)

    if first_clear:
        cleared.append(body.stage_id)
        fc = stage.get("first_clear", {})
        user["ryo"] += fc.get("ryo", 0)
        rewards["ryo"] += fc.get("ryo", 0)
        gems_gained = gd.first_clear_gems(stage.get("chapter", 1))
        user["gems"] = user.get("gems", 0) + gems_gained
        rewards["gems"] = gems_gained
        drop = fc.get("ninja")
        if drop and not any(i["template_id"] == drop for i in ninjas):
            ninjas.append(new_ninja_instance(drop))
            rewards["ninja"] = {"template_id": drop, "name": gd.CATALOG_BY_ID[drop]["name"], "rarity": gd.CATALOG_BY_ID[drop]["rarity"]}

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
    return {"profile": public_user(user), "rewards": rewards, "result": "win", "first_clear": first_clear}


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
            w = weights[t["rarity"]]
            if featured_id and tid == featured_id:
                w = w * FEATURED_RATE_MULT
            out.append((tid, w))
    return out


def _weighted_choice(pool: list) -> str:
    tids = [p[0] for p in pool]
    weights = [p[1] for p in pool]
    return random.choices(tids, weights=weights, k=1)[0]


def _pull_once(user: dict, pity: dict, currency: str = "gems", force_sr_plus: bool = False) -> dict:
    """Executes ONE gacha pull.
    - GEM / TICKET banner: GR (top tier) pity — base rate, soft-pity ramp, hard
      pity guarantee. A natural GR resets the counter. Featured GR is 50/50
      with a guarantee after a loss (state on `pity.featured_guarantee`).
    - GOLD / RYO banner: NO pity and much lower rare rates (via GOLD weights).
    Rate-up is applied multiplicatively inside `_rarity_pool` (never a flat
    chance). Mutates `pity`/`user`; returns the result dict."""
    apply_pity = currency in ("gems", "ticket")
    top = gd.TOP_RARITY
    featured = FEATURED_BANNER["template_id"]
    featured_tmpl = gd.CATALOG_BY_ID.get(featured) if featured else None
    featured_is_top = bool(featured_tmpl and featured_tmpl["rarity"] == top)

    chosen = None
    pity_note = None
    if apply_pity:
        counter = pity.get("gr", pity.get("mythic", 0)) + 1
        if random.random() < gd.gr_chance(counter):
            tops = [tid for tid, t in gd.CATALOG_BY_ID.items() if t["rarity"] == top]
            if featured_is_top:
                if pity.get("featured_guarantee"):
                    chosen = featured; pity["featured_guarantee"] = False; pity_note = "featured_guaranteed"
                elif random.random() < gd.FEATURED_MYTHIC_5050:
                    chosen = featured; pity_note = "featured_5050_won"
                else:
                    others = [m for m in tops if m != featured] or tops
                    chosen = random.choice(others); pity["featured_guarantee"] = True; pity_note = "featured_5050_lost"
            else:
                chosen = random.choice(tops) if tops else None
            pity["gr"] = 0
            if counter >= gd.MYTHIC_HARD_PITY:
                pity_note = pity_note or "hard_pity"
        else:
            pity["gr"] = counter
    if chosen is None:
        pool = _rarity_pool(min_rarity=gd.X10_GUARANTEE_RARITY if force_sr_plus else None,
                            currency=currency, featured_id=featured)
        chosen = _weighted_choice(pool)
    pity["total_pulls"] = pity.get("total_pulls", 0) + 1

    tmpl = gd.CATALOG_BY_ID[chosen]
    hero_shards = user.setdefault("hero_shards", {})
    is_duplicate = any(n["template_id"] == chosen for n in user.get("ninjas", []))
    shards_gained = 0
    if is_duplicate:
        shards_gained = gd.SHARD_YIELD_PER_DUPLICATE[tmpl["rarity"]]
        hero_shards[chosen] = hero_shards.get(chosen, 0) + shards_gained
    else:
        user.setdefault("ninjas", []).append(new_ninja_instance(chosen))
    return {"template_id": chosen, "name": tmpl["name"], "rarity": tmpl["rarity"],
            "element": tmpl["element"], "role": tmpl["role"], "portrait": tmpl["portrait"],
            "duplicate": is_duplicate, "shards_gained": shards_gained, "pity_note": pity_note}


@api_router.post("/game/summon")
async def summon(body: SummonIn, user: dict = Depends(get_current_user)):
    count = 10 if body.count >= 10 else 1
    inventory = user.get("inventory", {})
    use_ticket = body.currency == "ticket"
    use_gems = body.currency == "gems"
    if use_ticket:
        if inventory.get("summon_ticket", 0) < count:
            raise HTTPException(status_code=400, detail=f"Need {count} summon tickets")
    elif use_gems:
        if user.get("gems", 0) < gd.GEM_SUMMON_COST * count:
            raise HTTPException(status_code=400, detail=f"Not enough Gems — need {gd.GEM_SUMMON_COST * count}")
    elif user.get("ryo", 0) < gd.SUMMON_COST * count:
        raise HTTPException(status_code=400, detail=f"Not enough Ryo — need {gd.SUMMON_COST * count}")

    pity = user.get("pity") or gd.fresh_pity_state()
    currency = "ticket" if use_ticket else ("gems" if use_gems else "ryo")
    results = []
    for i in range(count):
        force = (count == 10 and i == 9 and
                 not any(gd.RARITY_ORDER[r["rarity"]] >= gd.RARITY_ORDER[gd.X10_GUARANTEE_RARITY] for r in results))
        results.append(_pull_once(user, pity, currency=currency, force_sr_plus=force))

    if use_ticket:
        inventory["summon_ticket"] -= count
        user["inventory"] = inventory
    elif use_gems:
        user["gems"] = user.get("gems", 0) - gd.GEM_SUMMON_COST * count
    else:
        user["ryo"] -= gd.SUMMON_COST * count
    user["pity"] = pity
    bump_mission(user, "summon", count)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"], "inventory": inventory,
        "daily": user["daily"], "hero_shards": user.get("hero_shards", {}), "pity": pity,
    }})
    return {"profile": public_user(user), "results": results, "pity": pity,
            # legacy single-pull field kept for backward compatibility
            "summoned": results[0] if count == 1 else None}


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
    if stars >= gd.STAR_LEVEL_MAX:
        raise HTTPException(status_code=400, detail="This hero is already at maximum evolution")
    cost = gd.evolution_cost(tmpl["rarity"], stars)
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
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"], "inventory": inventory}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"], "stars": inst["stars"]}


@api_router.post("/game/hero/evolve")
async def evolve_hero(body: EvolveIn, user: dict = Depends(get_current_user)):
    return await _do_evolve(body.instance_id, user)


@api_router.post("/game/hero/star-up")
async def star_up(body: StarUpIn, user: dict = Depends(get_current_user)):
    """Legacy route — kept for compatibility; now runs the Evolution system."""
    return await _do_evolve(body.instance_id, user)


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
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"ninjas": user["ninjas"], "inventory": inventory, "ryo": user["ryo"]}})
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
    unlocked_passive = (rank + 1) == gd.PASSIVE_UNLOCK_RANK
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ninjas": user["ninjas"], "hero_shards": hero_shards, "ryo": user["ryo"]}})
    return {"profile": public_user(user), "instance_id": inst["instance_id"],
            "skill_rank": inst["skill_rank"], "unlocked_passive": unlocked_passive}


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
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"gear": user["gear"]}})
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
        rarity = "epic" if force_epic else random.choices(
            list(gd.GEAR_SUMMON_RATES.keys()), weights=list(gd.GEAR_SUMMON_RATES.values()), k=1)[0]
        tier = gd.GEAR_RARITY_META[rarity]["tier"]
        g = gd.roll_gear(min_tier=tier, max_tier=tier)
        user.setdefault("gear", []).append(g)
        results.append(gear_public(g))
    user["inventory"] = inventory
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "gear": user["gear"], "gems": user.get("gems", 0), "inventory": inventory}})
    return {"profile": public_user(user), "results": results}


@api_router.post("/game/spire/complete")
async def spire_complete(body: SpireCompleteIn, user: dict = Depends(get_current_user)):
    floor = body.floor
    if floor < 1:
        raise HTTPException(status_code=400, detail="Invalid floor")
    current = user.get("spire_floor", 0)
    if body.result != "win":
        return {"profile": public_user(user), "rewards": None, "result": "lose", "floor": floor}
    advancing = floor == current + 1
    r = gd.spire_rewards(floor, advancing)
    user["ryo"] = user.get("ryo", 0) + r["ryo"]
    gems_gained = 0
    if advancing and floor % gd.SPIRE_FLOOR_MILESTONE_EVERY == 0:
        gems_gained = gd.SPIRE_FLOOR_MILESTONE_GEMS_BASE + floor
        user["gems"] = user.get("gems", 0) + gems_gained
    hero_exp = distribute_hero_exp(user, body.participants or list(user.get("team", [])), body.survivors, r["hero_exp_base"])
    inventory = user.get("inventory", {})
    for iid, qty in r["items"].items():
        inventory[iid] = inventory.get(iid, 0) + qty
    user["inventory"] = inventory
    if advancing:
        user["spire_floor"] = floor
    bump_mission(user, "spire_win")
    bump_mission(user, "any_win")
    total_levels = sum(h["levels"] for h in hero_exp)
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "ninjas": user["ninjas"], "inventory": inventory,
        "spire_floor": user.get("spire_floor", current), "daily": user["daily"]}})
    rewards = {"ryo": r["ryo"], "gems": gems_gained, "items": r["items"], "hero_exp": hero_exp, "boss": r["boss"], "advancing": advancing}
    return {"profile": public_user(user), "rewards": rewards, "result": "win", "floor": floor, "advancing": advancing}


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
    if bp_chance and random.random() < bp_chance:
        bp = f"blueprint_{random.choice(gd.GEAR_SLOTS)}"
        inventory[bp] = inventory.get(bp, 0) + 1
        blueprint_reward = bp

    user["inventory"] = inventory
    bump_mission(user, "trial_win")
    bump_mission(user, "any_win")
    await grant_player_exp(user, rw.get("hero_exp", 40))
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
            "result": "win"}


@api_router.get("/game/tsukuyomi")
async def tsukuyomi_list(user: dict = Depends(get_current_user)):
    """The Infinite Nightmare — 25 escalating bosses with basic + rare (gear-set)
    drops and a difficulty selector. Progress is tracked per boss + difficulty."""
    progress = user.get("tsukuyomi") or {}
    return {
        "bosses": [gd.tsukuyomi_boss_public(b) for b in gd.TSUKUYOMI_BOSSES],
        "difficulties": gd.TSUKUYOMI_DIFFICULTIES,
        "progress": progress,
        "first_clears": user.get("tsukuyomi_fc") or {},
        "energy_cost": gd.ENERGY_COST["tsukuyomi"],
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

    # RARE drop — a single random piece of the boss's signature gear set.
    gear_reward = None
    rare_hit = random.random() < r["rare_chance"]
    if rare_hit and len(user.get("gear", [])) < GEAR_INVENTORY_CAP:
        g = gd.tsukuyomi_gear_drop(boss, body.difficulty)
        user.setdefault("gear", []).append(g)
        gear_reward = gear_public(g)

    # progress: remember the highest difficulty cleared per boss
    tsuku = user.get("tsukuyomi") or {}
    order = {"normal": 1, "hard": 2, "nightmare": 3}
    prev = tsuku.get(body.boss_id)
    if not prev or order.get(body.difficulty, 0) > order.get(prev, 0):
        tsuku[body.boss_id] = body.difficulty
    user["tsukuyomi"] = tsuku

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
    await grant_player_exp(user, r["hero_exp"])
    total_levels = sum(h["levels"] for h in hero_exp)
    if total_levels:
        bump_mission(user, "hero_levelup", total_levels)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "ryo": user["ryo"], "gems": user.get("gems", 0), "wins": user["wins"], "ninjas": user["ninjas"], "inventory": inventory,
        "gear": user.get("gear", []), "daily": user["daily"], "tsukuyomi": tsuku, "tsukuyomi_fc": fc,
        "level": user["level"], "exp": user["exp"]}})
    return {"profile": public_user(user), "result": "win",
            "rewards": {"ryo": r["ryo"], "items": r["items"], "hero_exp": hero_exp,
                        "gear": gear_reward, "rare_hit": rare_hit, "rare_chance": r["rare_chance"],
                        "gear_set_name": boss["gear_set_name"], "first_clear_bonus": first_clear_bonus}}


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
    """Load admin-created heroes + portrait overrides from Mongo into the live catalog."""
    try:
        cfg = await db.game_config.find_one({"_id": "catalog"})
        custom = (cfg or {}).get("custom_heroes", [])
        overrides = (cfg or {}).get("portrait_overrides", {})
        gd.load_dynamic(custom, overrides)
    except Exception as e:
        logger.warning("Could not load dynamic catalog config (%s); using static catalog", e)


async def persist_catalog_config():
    await db.game_config.update_one(
        {"_id": "catalog"},
        {"$set": {"custom_heroes": gd._CUSTOM_HEROES, "portrait_overrides": gd._PORTRAIT_OVERRIDES}},
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
