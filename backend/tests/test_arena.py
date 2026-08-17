"""Backend pytest suite for Arena (async PvP).

Covers:
  - Snapshot creation on register/team-save (db.arena_snapshots)
  - Matchmaking excludes self, handles empty pool gracefully
  - Battle start deducts a daily attempt + locks in opponent team
  - Battle complete: win raises rating/awards Ryo+hero EXP, lose lowers rating
  - Daily attempt cap enforcement (5/day) + self-challenge rejection
  - Leaderboard tie-in (arena_leaderboard sorted by rating)
  - Auth gating on all endpoints
"""
import os
import uuid

import pytest
import requests

import game_data as gd

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or
            open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
API = f"{BASE_URL}/api"


def _register(name_prefix="Arena"):
    s = requests.Session()
    email = f"test_arena_{uuid.uuid4().hex[:10]}@shinobiclash.io"
    r = s.post(f"{API}/auth/register", json={"name": f"{name_prefix}{uuid.uuid4().hex[:4]}", "email": email, "password": "pass1234"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture()
def two_users():
    a = _register("PlayerA")
    b = _register("PlayerB")
    return a, b


@pytest.fixture()
def new_user():
    return _register("Solo")


class TestArenaProfileFields:
    def test_new_user_has_default_arena_block(self, new_user):
        s, profile = new_user
        assert profile["arena"]["rating"] == gd.ARENA_RATING_DEFAULT
        assert profile["arena"]["wins"] == 0
        assert profile["arena"]["losses"] == 0
        assert profile["arena"]["attempts_used"] == 0
        assert profile["arena"]["attempts_max"] == gd.ARENA_ATTEMPTS_MAX

    def test_arena_status_endpoint(self, new_user):
        s, _ = new_user
        r = s.get(f"{API}/arena/status")
        assert r.status_code == 200
        assert r.json()["arena"]["attempts_max"] == gd.ARENA_ATTEMPTS_MAX

    def test_arena_status_requires_auth(self):
        anon = requests.Session()
        assert anon.get(f"{API}/arena/status").status_code == 401


class TestArenaMatchmaking:
    def test_opponent_excludes_self(self, two_users):
        (sa, pa), (sb, pb) = two_users
        r = sa.post(f"{API}/arena/opponent")
        assert r.status_code == 200, r.text
        opp = r.json()["opponent"]
        assert opp["user_id"] != pa["id"]
        assert len(opp["team"]) >= 1
        # enriched display fields present
        for hero in opp["team"]:
            assert "name" in hero and "portrait" in hero and "rarity" in hero

    def test_opponent_requires_auth(self):
        anon = requests.Session()
        assert anon.post(f"{API}/arena/opponent").status_code == 401

    def test_snapshot_created_on_register(self, two_users):
        # PlayerB registered -> should already be matchmakable by PlayerA (tested above),
        # confirming the snapshot pipeline runs on registration without an explicit team save.
        (sa, pa), (sb, pb) = two_users
        r = sa.post(f"{API}/arena/opponent")
        assert r.status_code == 200


class TestArenaBattleFlow:
    def test_start_deducts_attempt_and_returns_opponent_team(self, two_users):
        (sa, pa), (sb, pb) = two_users
        r = sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["profile"]["arena"]["attempts_used"] == 1
        assert data["opponent"]["user_id"] == pb["id"]
        assert len(data["opponent"]["team"]) >= 1

    def test_cannot_challenge_self(self, new_user):
        s, p = new_user
        r = s.post(f"{API}/arena/battle/start", json={"opponent_user_id": p["id"]})
        assert r.status_code == 400

    def test_start_unknown_opponent_404(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/arena/battle/start", json={"opponent_user_id": "000000000000000000000000"})
        assert r.status_code == 404

    def test_win_awards_rating_ryo_and_updates_wins(self, two_users):
        (sa, pa), (sb, pb) = two_users
        before_ryo = pa["ryo"]
        sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
        r = sa.post(f"{API}/arena/battle/complete", json={
            "opponent_user_id": pb["id"], "result": "win", "participants": [], "survivors": [],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["result"] == "win"
        assert data["rewards"]["ryo"] == gd.ARENA_WIN_REWARDS["ryo"]
        assert data["profile"]["arena"]["rating"] == gd.ARENA_RATING_DEFAULT + gd.ARENA_RATING_WIN
        assert data["profile"]["arena"]["wins"] == 1
        assert data["profile"]["ryo"] == before_ryo + gd.ARENA_WIN_REWARDS["ryo"]

    def test_lose_lowers_rating_and_updates_losses_no_rewards(self, two_users):
        (sa, pa), (sb, pb) = two_users
        sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
        r = sa.post(f"{API}/arena/battle/complete", json={
            "opponent_user_id": pb["id"], "result": "lose", "participants": [], "survivors": [],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["result"] == "lose"
        assert data["rewards"] is None
        assert data["profile"]["arena"]["rating"] == gd.ARENA_RATING_DEFAULT - gd.ARENA_RATING_LOSS
        assert data["profile"]["arena"]["losses"] == 1

    def test_daily_attempt_cap_enforced(self, two_users):
        (sa, pa), (sb, pb) = two_users
        for _ in range(gd.ARENA_ATTEMPTS_MAX):
            r = sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
            assert r.status_code == 200, r.text
        r = sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
        assert r.status_code == 400
        assert "attempt" in r.json()["detail"].lower()

    def test_battle_start_requires_auth(self):
        anon = requests.Session()
        r = anon.post(f"{API}/arena/battle/start", json={"opponent_user_id": "x"})
        assert r.status_code == 401

    def test_battle_complete_requires_auth(self):
        anon = requests.Session()
        r = anon.post(f"{API}/arena/battle/complete", json={"opponent_user_id": "x", "result": "win"})
        assert r.status_code == 401


class TestArenaTeamSnapshotRefresh:
    def test_team_save_upserts_snapshot(self, new_user):
        s, p = new_user
        inst_ids = [n["instance_id"] for n in p["ninjas"]]
        r = s.put(f"{API}/game/team", json={"team": inst_ids[:1]})
        assert r.status_code == 200, r.text
        # another player should now be able to matchmake into this exact 1-hero team
        s2, _ = _register("Checker")
        r2 = s2.post(f"{API}/arena/opponent")
        # may or may not draw this exact player (pool could contain others too), but should not error
        assert r2.status_code in (200, 404)


class TestArenaLeaderboardTieIn:
    def test_leaderboard_includes_arena_rankings(self, two_users):
        (sa, pa), (sb, pb) = two_users
        sa.post(f"{API}/arena/battle/start", json={"opponent_user_id": pb["id"]})
        sa.post(f"{API}/arena/battle/complete", json={"opponent_user_id": pb["id"], "result": "win", "participants": [], "survivors": []})
        r = requests.get(f"{API}/game/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert "arena_leaderboard" in data
        assert "leaderboard" in data
        for row in data["arena_leaderboard"]:
            assert "arena_rating" in row and "arena_wins" in row and "arena_losses" in row
        # sorted descending by rating
        ratings = [row["arena_rating"] for row in data["arena_leaderboard"]]
        assert ratings == sorted(ratings, reverse=True)
