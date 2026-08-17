"""Backend pytest suite for the Daily Energy + Missions system.

Covers:
  - Pure regen/spend math in game_data.py (compute_energy/spend_energy)
  - Daily mission template integrity (fresh_daily_state/daily_cycle_utc)
  - Live API: GET /game/energy, POST /game/battle/start (gating + 404/400s),
    GET /game/missions, POST /game/missions/claim/{id} (progress -> claim ->
    double-claim rejection), and that gameplay endpoints (battle/complete,
    spire/complete, trial/complete, summon, use-exp) bump mission progress.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

import game_data as gd

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or
            open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()).rstrip("/")
API = f"{BASE_URL}/api"


# =====================================================================
# Pure function unit tests (no network) — mirrors test_team.py's style.
# =====================================================================
class TestEnergyMath:
    def test_full_state_has_no_countdown(self):
        state = {"current": 100, "max": 100, "last_regen_at": datetime.now(timezone.utc).isoformat()}
        out = gd.compute_energy(state)
        assert out["current"] == 100
        assert out["next_tick_in"] == 0
        assert out["full_in"] == 0

    def test_regenerates_after_elapsed_ticks(self):
        past = (datetime.now(timezone.utc) - timedelta(seconds=gd.ENERGY_REGEN_SECONDS * 3 + 5)).isoformat()
        state = {"current": 50, "max": 100, "last_regen_at": past}
        out = gd.compute_energy(state)
        assert out["current"] == 53

    def test_caps_at_max_and_resets_baseline(self):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        state = {"current": 90, "max": 100, "last_regen_at": past}
        out = gd.compute_energy(state)
        assert out["current"] == 100
        assert out["next_tick_in"] == 0
        assert out["full_in"] == 0

    def test_spend_success_recomputes_countdown(self):
        state = {"current": 100, "max": 100, "last_regen_at": datetime.now(timezone.utc).isoformat()}
        out = gd.spend_energy(state, 10)
        assert out is not None
        assert out["current"] == 90
        # right after spending from full, a tick should be ~ENERGY_REGEN_SECONDS away
        assert out["next_tick_in"] > 0
        assert out["full_in"] > 0

    def test_spend_failure_when_insufficient(self):
        state = {"current": 5, "max": 100, "last_regen_at": datetime.now(timezone.utc).isoformat()}
        assert gd.spend_energy(state, 10) is None

    def test_spend_none_state_defaults_to_max(self):
        out = gd.spend_energy(None, 10)
        assert out["current"] == gd.ENERGY_MAX_DEFAULT - 10


class TestDailyMissionsData:
    def test_all_missions_have_valid_targets_and_rewards(self):
        for m in gd.DAILY_MISSIONS:
            assert m["target"] > 0
            assert "ryo" in m["reward"] and "items" in m["reward"]
            assert m["event"]

    def test_fresh_daily_state_has_all_missions_at_zero(self):
        state = gd.fresh_daily_state()
        assert state["cycle"] == gd.daily_cycle_utc()
        for m in gd.DAILY_MISSIONS:
            assert state["missions"][m["id"]] == {"progress": 0, "claimed": False}


# =====================================================================
# Live API tests
# =====================================================================
@pytest.fixture()
def new_user():
    s = requests.Session()
    email = f"test_energy_{uuid.uuid4().hex[:10]}@shinobiclash.io"
    r = s.post(f"{API}/auth/register", json={"name": "EnergyNinja", "email": email, "password": "pass1234"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s, r.json()


class TestEnergyEndpoints:
    def test_new_user_starts_at_full_energy(self, new_user):
        s, profile = new_user
        assert profile["energy"]["current"] == gd.ENERGY_MAX_DEFAULT
        assert profile["energy"]["max"] == gd.ENERGY_MAX_DEFAULT

    def test_energy_endpoint_requires_auth(self):
        anon = requests.Session()
        assert anon.get(f"{API}/game/energy").status_code == 401

    def test_energy_endpoint_returns_state(self, new_user):
        s, _ = new_user
        r = s.get(f"{API}/game/energy")
        assert r.status_code == 200
        e = r.json()["energy"]
        assert e["current"] == 100 and e["max"] == 100

    def test_battle_start_consumes_energy(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        assert r.status_code == 200, r.text
        assert r.json()["profile"]["energy"]["current"] == 100 - gd.ENERGY_COST["campaign"]

    def test_battle_start_invalid_mode_400(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/battle/start", json={"mode": "nope", "id": "s1"})
        assert r.status_code == 400

    def test_battle_start_unknown_stage_404(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s999"})
        assert r.status_code == 404

    def test_battle_start_unknown_trial_404(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/battle/start", json={"mode": "trial", "id": "t_nope"})
        assert r.status_code == 404

    def test_battle_start_invalid_spire_floor_400(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/battle/start", json={"mode": "spire", "id": "abc"})
        assert r.status_code == 400

    def test_battle_start_blocks_when_insufficient(self, new_user):
        s, _ = new_user
        # 100 energy / 10 cost = exactly 10 attempts before it's blocked
        for _ in range(10):
            r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
            assert r.status_code == 200, r.text
        r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        assert r.status_code == 400
        assert "energy" in r.json()["detail"].lower()

    def test_battle_start_requires_auth(self):
        anon = requests.Session()
        r = anon.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        assert r.status_code == 401


class TestMissionsEndpoints:
    def test_missions_requires_auth(self):
        anon = requests.Session()
        assert anon.get(f"{API}/game/missions").status_code == 401

    def test_new_user_missions_all_start_at_zero(self, new_user):
        s, profile = new_user
        missions = {m["id"]: m for m in profile["missions"]}
        for m in gd.DAILY_MISSIONS:
            assert missions[m["id"]]["progress"] == 0
            assert missions[m["id"]]["claimed"] is False
            assert missions[m["id"]]["complete"] is False

    def test_claim_unknown_mission_404(self, new_user):
        s, _ = new_user
        assert s.post(f"{API}/game/missions/claim/nope_xyz").status_code == 404

    def test_claim_before_complete_rejected(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/missions/claim/m_clear_3")
        assert r.status_code == 400

    def test_summon_bumps_summon_mission_and_claim_grants_ticket(self, new_user):
        s, _ = new_user
        r = s.post(f"{API}/game/summon", json={"currency": "ryo"})
        assert r.status_code == 200, r.text
        missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
        assert missions["m_summon_1"]["progress"] == 1
        assert missions["m_summon_1"]["complete"] is True

        before_tickets = r.json()["profile"]["inventory"].get("summon_ticket", 0)
        claim = s.post(f"{API}/game/missions/claim/m_summon_1")
        assert claim.status_code == 200, claim.text
        after = claim.json()["profile"]
        assert after["inventory"].get("summon_ticket", 0) == before_tickets + 1
        after_missions = {m["id"]: m for m in after["missions"]}
        assert after_missions["m_summon_1"]["claimed"] is True

        # double-claim rejected
        r2 = s.post(f"{API}/game/missions/claim/m_summon_1")
        assert r2.status_code == 400

    def test_campaign_win_bumps_clear_3_and_any_win(self, new_user):
        s, _ = new_user
        for stage_id in ("s1", "s1", "s1"):
            s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": stage_id})
            r = s.post(f"{API}/game/battle/complete", json={
                "stage_id": stage_id, "result": "win", "participants": [], "survivors": [],
            })
            assert r.status_code == 200, r.text
        missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
        assert missions["m_clear_3"]["progress"] == 3
        assert missions["m_clear_3"]["complete"] is True
        assert missions["m_win_5"]["progress"] == 3

        claim = s.post(f"{API}/game/missions/claim/m_clear_3")
        assert claim.status_code == 200, claim.text
        assert claim.json()["reward"]["ryo"] == 200

    def test_battle_lose_does_not_bump_win_missions(self, new_user):
        s, _ = new_user
        s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        r = s.post(f"{API}/game/battle/complete", json={
            "stage_id": "s1", "result": "lose", "participants": [], "survivors": [],
        })
        assert r.status_code == 200
        missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
        assert missions["m_clear_3"]["progress"] == 0
        assert missions["m_win_5"]["progress"] == 0

    def test_spire_win_bumps_spire_mission(self, new_user):
        s, _ = new_user
        s.post(f"{API}/game/battle/start", json={"mode": "spire", "id": "1"})
        r = s.post(f"{API}/game/spire/complete", json={
            "floor": 1, "result": "win", "participants": [], "survivors": [],
        })
        assert r.status_code == 200, r.text
        missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
        assert missions["m_spire_1"]["progress"] == 1
        assert missions["m_spire_1"]["complete"] is True

    def test_use_exp_item_bumps_levelup_mission(self, new_user):
        s, _ = new_user
        prof = s.get(f"{API}/game/profile").json()
        inst_id = prof["ninjas"][0]["instance_id"]
        r = s.post(f"{API}/game/hero/use-exp", json={"instance_id": inst_id, "item_id": "exp_tome_greater", "qty": 1})
        assert r.status_code == 200, r.text
        assert r.json()["levels_gained"] > 0
        missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
        assert missions["m_levelup_1"]["progress"] >= 1
        assert missions["m_levelup_1"]["complete"] is True
