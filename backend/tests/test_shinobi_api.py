"""Backend pytest suite for Shinobi Clash API (iteration 3).

Covers: auth, catalog/stages (38 chars + items + trials), profile (level_cap/asc/
inventory/spire_floor), battle rewards (hero_exp, items), summon (ryo+ticket),
use-exp items, ascension, spire (advance/farm/non-sequential/lose), trial
(win/lose/invalid), leaderboard.
"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or
            open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
API = f"{BASE_URL}/api"

# Admin/test credentials are sourced from env vars (falling back to the same
# defaults the backend seeds on startup, see server.py `startup()`), so no
# secret needs to live in source. Override via env vars in CI if desired.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@shinobi.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
TEST_USER_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "pass1234")


# --------------------------- Fixtures ---------------------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="function")
def new_user_session():
    s = requests.Session()
    email = f"test_user_{uuid.uuid4().hex[:10]}@shinobiclash.io"
    r = s.post(f"{API}/auth/register", json={"name": "TestNinja", "email": email, "password": TEST_USER_PASSWORD})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email
    s.password = TEST_USER_PASSWORD
    return s


# --------------------------- Auth ---------------------------
class TestAuth:
    def test_login_admin(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert "access_token" in s.cookies

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_returns_profile_with_starters(self):
        s = requests.Session()
        email = f"test_reg_{uuid.uuid4().hex[:8]}@shinobiclash.io"
        r = s.post(f"{API}/auth/register", json={"name": "Reg", "email": email, "password": "abcd"})
        assert r.status_code == 200
        data = r.json()
        assert data["ryo"] == 500
        assert len(data["ninjas"]) == 3
        # New: profile should have inventory map
        assert "inventory" in data and isinstance(data["inventory"], dict)
        # Each owned ninja now has level_cap, ascension, exp_to_next, power, stats
        for n in data["ninjas"]:
            for k in ("level", "exp", "ascension", "exp_to_next", "level_cap", "ascension_max", "max_level", "power", "stats"):
                assert k in n, f"missing {k}"

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# --------------------------- Catalog ---------------------------
class TestCatalog:
    def test_catalog_returns_38_chars_with_items_and_cost(self):
        r = requests.get(f"{API}/game/catalog")
        assert r.status_code == 200
        data = r.json()
        assert len(data["ninjas"]) == 38
        assert "items" in data and len(data["items"]) == 5
        for k in ("exp_tome_minor", "exp_tome_greater", "exp_tome_ancient",
                  "ascension_crystal", "summon_ticket"):
            assert k in data["items"]
        assert data["summon_cost"] == 300
        # Trials array (new iteration 3)
        assert "trials" in data
        trial_ids = {t["id"] for t in data["trials"]}
        assert {"t_scroll", "t_crystal", "t_gold"}.issubset(trial_ids)
        # Heroes have LR rarity
        rarities = {n["rarity"] for n in data["ninjas"]}
        assert "LR" in rarities
        # Original ninjas use /ninjas/, heroes use /heroes/
        for n in data["ninjas"]:
            assert n["portrait"].startswith("/ninjas/") or n["portrait"].startswith("/heroes/")
            assert n["jutsus"] and len(n["jutsus"]) >= 1

    def test_portrait_images_return_200(self):
        # Sample 6 portraits (3 ninjas + 3 heroes) to keep test quick
        r = requests.get(f"{API}/game/catalog")
        ninjas = r.json()["ninjas"]
        # Get 3 of each type
        ninja_ids = [n for n in ninjas if n["portrait"].startswith("/ninjas/")][:3]
        hero_ids = [n for n in ninjas if n["portrait"].startswith("/heroes/")][:3]
        for n in ninja_ids + hero_ids:
            url = f"{BASE_URL}{n['portrait']}"
            resp = requests.get(url, timeout=10)
            assert resp.status_code == 200, f"{url} -> {resp.status_code}"

    def test_stages_returns_12(self):
        r = requests.get(f"{API}/game/stages")
        stages = r.json()["stages"]
        assert len(stages) == 12


# --------------------------- Profile/Team ---------------------------
class TestProfile:
    def test_admin_seed_has_capped_blaze_and_inventory(self, admin_session):
        r = admin_session.get(f"{API}/game/profile")
        assert r.status_code == 200
        d = r.json()
        assert d["ryo"] >= 50000 - 5000  # may have decreased from prior tests but should still be seeded high
        inv = d["inventory"]
        assert inv.get("ascension_crystal", 0) >= 1
        assert inv.get("exp_tome_minor", 0) >= 1
        blaze = next((n for n in d["ninjas"] if n["template_id"] == "blaze"), None)
        assert blaze is not None
        # blaze should be at its cap (20) with asc=0 (or already ascended from a previous test run)
        assert blaze["level"] >= 20

    def test_set_team_valid_persists(self, new_user_session):
        prof = new_user_session.get(f"{API}/game/profile").json()
        instance_ids = [n["instance_id"] for n in prof["ninjas"][:2]]
        r = new_user_session.put(f"{API}/game/team", json={"team": instance_ids})
        assert r.status_code == 200
        assert r.json()["team"] == instance_ids

    def test_set_team_empty_rejected(self, new_user_session):
        r = new_user_session.put(f"{API}/game/team", json={"team": []})
        assert r.status_code == 400


# --------------------------- Battle ---------------------------
class TestBattle:
    def test_win_grants_hero_exp_and_items_and_persists(self, new_user_session):
        before = new_user_session.get(f"{API}/game/profile").json()
        team_ids = before["team"]
        body = {"stage_id": "s1", "result": "win",
                "participants": team_ids, "survivors": team_ids}
        r = new_user_session.post(f"{API}/game/battle/complete", json=body)
        assert r.status_code == 200
        data = r.json()
        assert data["result"] == "win"
        rew = data["rewards"]
        assert rew["ryo"] == 350  # 150 + 200 first_clear
        # hero_exp: per participant
        assert isinstance(rew["hero_exp"], list) and len(rew["hero_exp"]) == len(team_ids)
        for h in rew["hero_exp"]:
            for k in ("instance_id", "name", "exp", "levels", "level"):
                assert k in h
            assert h["exp"] > 0
        # items dropped (always at least 1 roll)
        assert isinstance(rew["items"], dict) and len(rew["items"]) >= 1
        # profile inventory increased
        prof = data["profile"]
        for iid, qty in rew["items"].items():
            assert prof["inventory"].get(iid, 0) >= qty
        # heroes leveled (exp increased)
        for n in prof["ninjas"]:
            if n["instance_id"] in team_ids:
                assert n["exp"] > 0 or n["level"] > 1
        # persistence
        s2 = requests.Session()
        s2.post(f"{API}/auth/login", json={"email": new_user_session.email, "password": new_user_session.password})
        p2 = s2.get(f"{API}/game/profile").json()
        assert "s1" in p2["cleared_stages"]

    def test_lose_no_rewards_increments_losses(self, new_user_session):
        before = new_user_session.get(f"{API}/game/profile").json()
        r = new_user_session.post(f"{API}/game/battle/complete",
                                  json={"stage_id": "s1", "result": "lose", "participants": before["team"], "survivors": []})
        assert r.status_code == 200
        d = r.json()
        assert d["rewards"] is None
        assert d["profile"]["losses"] == before["losses"] + 1
        assert d["profile"]["ryo"] == before["ryo"]


# --------------------------- Summon ---------------------------
class TestSummon:
    def test_summon_with_ryo(self, new_user_session):
        before = new_user_session.get(f"{API}/game/profile").json()
        r = new_user_session.post(f"{API}/game/summon", json={"currency": "ryo"})
        assert r.status_code == 200
        d = r.json()
        assert d["profile"]["ryo"] == before["ryo"] - 300
        sm = d["summoned"]
        for k in ("template_id", "name", "rarity", "element", "role", "portrait"):
            assert k in sm
        assert len(d["profile"]["ninjas"]) == len(before["ninjas"]) + 1

    def test_summon_with_ticket(self, admin_session):
        before = admin_session.get(f"{API}/game/profile").json()
        tickets = before["inventory"].get("summon_ticket", 0)
        if tickets < 1:
            pytest.skip("admin has no tickets left")
        before_ryo = before["ryo"]
        r = admin_session.post(f"{API}/game/summon", json={"currency": "ticket"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["profile"]["ryo"] == before_ryo  # ryo unchanged
        assert d["profile"]["inventory"].get("summon_ticket", 0) == tickets - 1

    def test_summon_ticket_fails_without_tickets(self, new_user_session):
        # consume the 1 starter welcome ticket first, then expect failure
        new_user_session.post(f"{API}/game/summon", json={"currency": "ticket"})
        r = new_user_session.post(f"{API}/game/summon", json={"currency": "ticket"})
        assert r.status_code == 400

    def test_summon_fails_when_low_ryo(self, new_user_session):
        r = new_user_session.post(f"{API}/game/summon", json={"currency": "ryo"})
        assert r.status_code == 200
        r2 = new_user_session.post(f"{API}/game/summon", json={"currency": "ryo"})
        assert r2.status_code == 400


# --------------------------- Use EXP item ---------------------------
class TestUseExp:
    def test_use_exp_tome_adds_exp_and_decrements_inventory(self, admin_session):
        prof = admin_session.get(f"{API}/game/profile").json()
        # find a non-capped owned hero (NOT blaze which is at cap 20)
        target = next((n for n in prof["ninjas"]
                       if n["level"] < n["level_cap"] and n["template_id"] != "blaze"), None)
        if not target:
            pytest.skip("no non-capped hero to test EXP tome")
        before_exp = target["exp"]
        before_count = prof["inventory"].get("exp_tome_minor", 0)
        if before_count < 1:
            pytest.skip("no exp_tome_minor in admin inventory")
        r = admin_session.post(f"{API}/game/hero/use-exp",
                                json={"instance_id": target["instance_id"], "item_id": "exp_tome_minor", "qty": 1})
        assert r.status_code == 200, r.text
        d = r.json()
        new_t = next(n for n in d["profile"]["ninjas"] if n["instance_id"] == target["instance_id"])
        # either exp went up OR level went up
        assert new_t["level"] > target["level"] or new_t["exp"] > before_exp
        assert d["profile"]["inventory"].get("exp_tome_minor", 0) == before_count - 1

    def test_use_exp_on_capped_hero_fails(self, admin_session):
        prof = admin_session.get(f"{API}/game/profile").json()
        blaze = next((n for n in prof["ninjas"] if n["template_id"] == "blaze"), None)
        if not blaze or blaze["level"] < blaze["level_cap"]:
            pytest.skip("blaze not at cap (already ascended in prior run)")
        r = admin_session.post(f"{API}/game/hero/use-exp",
                                json={"instance_id": blaze["instance_id"], "item_id": "exp_tome_minor", "qty": 1})
        assert r.status_code == 400

    def test_use_exp_insufficient_count(self, new_user_session):
        prof = new_user_session.get(f"{API}/game/profile").json()
        inst = prof["ninjas"][0]
        # new user has 5 exp_tome_minor — ask for far more than they own
        r = new_user_session.post(f"{API}/game/hero/use-exp",
                                   json={"instance_id": inst["instance_id"], "item_id": "exp_tome_minor", "qty": 999})
        assert r.status_code == 400


# --------------------------- Ascend ---------------------------
class TestAscend:
    def test_ascend_blaze_at_cap_succeeds_or_skip_if_done(self, admin_session):
        prof = admin_session.get(f"{API}/game/profile").json()
        blaze = next((n for n in prof["ninjas"] if n["template_id"] == "blaze"), None)
        assert blaze is not None
        if blaze["ascension"] >= blaze["ascension_max"]:
            pytest.skip("blaze already fully ascended in prior run")
        if blaze["level"] < blaze["level_cap"]:
            pytest.skip("blaze not at cap (was ascended earlier without level-up)")
        crystals_needed = 5 + blaze["ascension"] * 5 + 0 * 3  # R has ri=0
        if prof["inventory"].get("ascension_crystal", 0) < crystals_needed:
            pytest.skip("not enough crystals for ascension test")
        before_asc = blaze["ascension"]
        before_cap = blaze["level_cap"]
        before_ryo = prof["ryo"]
        before_crystals = prof["inventory"]["ascension_crystal"]
        r = admin_session.post(f"{API}/game/hero/ascend", json={"instance_id": blaze["instance_id"]})
        assert r.status_code == 200, r.text
        d = r.json()
        new_blaze = next(n for n in d["ninjas"] if n["instance_id"] == blaze["instance_id"])
        assert new_blaze["ascension"] == before_asc + 1
        assert new_blaze["level_cap"] == before_cap + 10
        assert d["ryo"] < before_ryo
        assert d["inventory"]["ascension_crystal"] < before_crystals

    def test_ascend_not_at_cap_fails(self, new_user_session):
        prof = new_user_session.get(f"{API}/game/profile").json()
        inst = prof["ninjas"][0]  # level 1, cap 20
        r = new_user_session.post(f"{API}/game/hero/ascend", json={"instance_id": inst["instance_id"]})
        assert r.status_code == 400

    def test_ascend_invalid_instance(self, admin_session):
        r = admin_session.post(f"{API}/game/hero/ascend", json={"instance_id": "bogus"})
        assert r.status_code == 404


# --------------------------- Old endpoint removed ---------------------------
class TestRemovedEndpoint:
    def test_old_levelup_endpoint_is_gone(self, admin_session):
        r = admin_session.post(f"{API}/game/levelup", json={"instance_id": "x"})
        # Should be 404 (no route) — previous endpoint removed
        assert r.status_code in (404, 405)


# --------------------------- Spire ---------------------------
class TestSpire:
    def test_profile_has_spire_floor(self, new_user_session):
        p = new_user_session.get(f"{API}/game/profile").json()
        assert "spire_floor" in p
        assert isinstance(p["spire_floor"], int)
        assert p["spire_floor"] == 0

    def test_spire_win_floor1_advances(self, new_user_session):
        p = new_user_session.get(f"{API}/game/profile").json()
        team = p["team"]
        body = {"floor": 1, "result": "win", "participants": team, "survivors": team}
        r = new_user_session.post(f"{API}/game/spire/complete", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["advancing"] is True
        assert d["floor"] == 1
        rw = d["rewards"]
        assert rw["advancing"] is True
        assert rw["ryo"] > 0
        assert isinstance(rw["items"], dict)
        assert isinstance(rw["hero_exp"], list) and len(rw["hero_exp"]) == len(team)
        assert d["profile"]["spire_floor"] == 1

    def test_spire_replay_same_floor_does_not_advance(self, new_user_session):
        team = new_user_session.get(f"{API}/game/profile").json()["team"]
        # First win → advance to floor 1
        new_user_session.post(f"{API}/game/spire/complete",
                              json={"floor": 1, "result": "win", "participants": team, "survivors": team})
        # Replay floor 1
        r = new_user_session.post(f"{API}/game/spire/complete",
                                  json={"floor": 1, "result": "win", "participants": team, "survivors": team})
        d = r.json()
        assert d["advancing"] is False
        assert d["rewards"]["advancing"] is False
        # Reduced rewards: spire_rewards floor=1 advancing=True → ryo 155, non-advancing → round(155*0.4)=62
        assert d["rewards"]["ryo"] == 62
        assert d["profile"]["spire_floor"] == 1

    def test_spire_skip_floor_not_allowed(self, new_user_session):
        team = new_user_session.get(f"{API}/game/profile").json()["team"]
        # Try floor 5 when spire_floor=0
        r = new_user_session.post(f"{API}/game/spire/complete",
                                  json={"floor": 5, "result": "win", "participants": team, "survivors": team})
        assert r.status_code == 200
        d = r.json()
        assert d["advancing"] is False
        assert d["rewards"]["advancing"] is False
        assert d["profile"]["spire_floor"] == 0  # unchanged

    def test_spire_lose_returns_null_rewards(self, new_user_session):
        team = new_user_session.get(f"{API}/game/profile").json()["team"]
        r = new_user_session.post(f"{API}/game/spire/complete",
                                  json={"floor": 1, "result": "lose", "participants": team, "survivors": []})
        assert r.status_code == 200
        d = r.json()
        assert d["rewards"] is None
        assert d["result"] == "lose"


# --------------------------- Trials ---------------------------
class TestTrials:
    def test_trial_crystal_win_grants_rewards_and_inventory(self, new_user_session):
        before = new_user_session.get(f"{API}/game/profile").json()
        before_crystals = before["inventory"].get("ascension_crystal", 0)
        before_ryo = before["ryo"]
        team = before["team"]
        r = new_user_session.post(f"{API}/game/trial/complete",
                                  json={"trial_id": "t_crystal", "result": "win",
                                        "participants": team, "survivors": team})
        assert r.status_code == 200, r.text
        d = r.json()
        rw = d["rewards"]
        assert rw["items"].get("ascension_crystal") == 3
        assert rw["ryo"] == 140
        assert isinstance(rw["hero_exp"], list) and len(rw["hero_exp"]) == len(team)
        prof = d["profile"]
        assert prof["inventory"].get("ascension_crystal", 0) == before_crystals + 3
        assert prof["ryo"] == before_ryo + 140

    def test_trial_invalid_id_404(self, new_user_session):
        r = new_user_session.post(f"{API}/game/trial/complete",
                                  json={"trial_id": "bogus_trial", "result": "win",
                                        "participants": [], "survivors": []})
        assert r.status_code == 404

    def test_trial_lose_returns_null_rewards(self, new_user_session):
        r = new_user_session.post(f"{API}/game/trial/complete",
                                  json={"trial_id": "t_scroll", "result": "lose",
                                        "participants": [], "survivors": []})
        assert r.status_code == 200
        d = r.json()
        assert d["rewards"] is None
        assert d["result"] == "lose"


# --------------------------- Leaderboard ---------------------------
class TestLeaderboard:
    def test_leaderboard_returns_rows(self):
        r = requests.get(f"{API}/game/leaderboard")
        assert r.status_code == 200
        rows = r.json()["leaderboard"]
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert all("team_power" in row and "name" in row for row in rows)
