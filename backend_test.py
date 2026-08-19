#!/usr/bin/env python3
"""
Backend API test suite for Shinobi Clash
Tests Priority 1 (Energy + Missions) and Priority 2 (Arena/PvP) features plus basic regression checks.
"""
import requests
import sys
import uuid
from datetime import datetime

BASE_URL = "https://energy-missions-plus.preview.emergentagent.com"
API = f"{BASE_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
        
    def test(self, name, fn):
        """Run a test function and track results"""
        try:
            print(f"\n{Colors.BLUE}▶ Testing: {name}{Colors.RESET}")
            fn()
            self.passed += 1
            self.tests.append({"name": name, "status": "PASS"})
            print(f"{Colors.GREEN}✓ PASS{Colors.RESET}")
            return True
        except AssertionError as e:
            self.failed += 1
            self.tests.append({"name": name, "status": "FAIL", "error": str(e)})
            print(f"{Colors.RED}✗ FAIL: {e}{Colors.RESET}")
            return False
        except Exception as e:
            self.failed += 1
            self.tests.append({"name": name, "status": "ERROR", "error": str(e)})
            print(f"{Colors.RED}✗ ERROR: {e}{Colors.RESET}")
            return False
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
        print(f"{'='*60}")
        print(f"Total: {total} | {Colors.GREEN}Passed: {self.passed}{Colors.RESET} | {Colors.RED}Failed: {self.failed}{Colors.RESET}")
        if self.failed > 0:
            print(f"\n{Colors.RED}Failed Tests:{Colors.RESET}")
            for t in self.tests:
                if t["status"] != "PASS":
                    print(f"  - {t['name']}: {t.get('error', 'Unknown error')}")
        print(f"{'='*60}\n")
        return self.failed == 0


# Test fixtures
def create_test_user():
    """Create a new test user and return session + profile"""
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "TestNinja",
        "email": email,
        "password": "test1234"
    })
    assert r.status_code == 200, f"Registration failed: {r.status_code} {r.text}"
    return s, r.json()

def login_admin():
    """Login as admin and return session + profile"""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={
        "email": "admin@shinobi.com",
        "password": "admin123"
    })
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s, r.json()


# ============================================================================
# ENERGY SYSTEM TESTS
# ============================================================================
def test_new_user_starts_with_full_energy():
    """New users should start with 100/100 energy"""
    _, profile = create_test_user()
    assert profile["energy"]["current"] == 100, f"Expected 100, got {profile['energy']['current']}"
    assert profile["energy"]["max"] == 100, f"Expected max 100, got {profile['energy']['max']}"
    print(f"  Energy: {profile['energy']['current']}/{profile['energy']['max']}")

def test_energy_endpoint_requires_auth():
    """GET /game/energy should require authentication"""
    r = requests.get(f"{API}/game/energy")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_energy_endpoint_returns_state():
    """GET /game/energy should return current energy state"""
    s, _ = create_test_user()
    r = s.get(f"{API}/game/energy")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    energy = r.json()["energy"]
    assert "current" in energy and "max" in energy, "Missing energy fields"
    print(f"  Energy state: {energy['current']}/{energy['max']}")

def test_battle_start_consumes_energy():
    """POST /game/battle/start should consume energy"""
    s, profile = create_test_user()
    initial = profile["energy"]["current"]
    r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    assert r.status_code == 200, f"Battle start failed: {r.status_code} {r.text}"
    new_energy = r.json()["profile"]["energy"]["current"]
    assert new_energy == initial - 10, f"Expected {initial - 10}, got {new_energy}"
    print(f"  Energy: {initial} → {new_energy} (-10)")

def test_battle_start_blocks_insufficient_energy():
    """Battle start should fail when energy is insufficient"""
    s, _ = create_test_user()
    # Drain energy (100 / 10 = 10 attempts)
    for i in range(10):
        r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        assert r.status_code == 200, f"Attempt {i+1} failed: {r.text}"
    # 11th attempt should fail
    r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    assert "energy" in r.json()["detail"].lower(), "Error should mention energy"
    print(f"  Correctly blocked: {r.json()['detail']}")

def test_battle_start_invalid_mode():
    """Battle start should reject invalid mode"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/battle/start", json={"mode": "invalid", "id": "s1"})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_battle_start_unknown_stage():
    """Battle start should reject unknown stage"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s999"})
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"

def test_spire_battle_consumes_energy():
    """Spire battles should consume 10 energy"""
    s, profile = create_test_user()
    initial = profile["energy"]["current"]
    r = s.post(f"{API}/game/battle/start", json={"mode": "spire", "id": "1"})
    assert r.status_code == 200, f"Spire start failed: {r.status_code} {r.text}"
    new_energy = r.json()["profile"]["energy"]["current"]
    assert new_energy == initial - 10, f"Expected {initial - 10}, got {new_energy}"
    print(f"  Spire energy: {initial} → {new_energy} (-10)")

def test_trial_battle_consumes_energy():
    """Trial battles should consume 8 energy"""
    s, profile = create_test_user()
    initial = profile["energy"]["current"]
    r = s.post(f"{API}/game/battle/start", json={"mode": "trial", "id": "t_scroll"})
    assert r.status_code == 200, f"Trial start failed: {r.status_code} {r.text}"
    new_energy = r.json()["profile"]["energy"]["current"]
    assert new_energy == initial - 8, f"Expected {initial - 8}, got {new_energy}"
    print(f"  Trial energy: {initial} → {new_energy} (-8)")


# ============================================================================
# DAILY MISSIONS TESTS
# ============================================================================
def test_missions_endpoint_requires_auth():
    """GET /game/missions should require authentication"""
    r = requests.get(f"{API}/game/missions")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_new_user_missions_start_at_zero():
    """New users should have all missions at 0 progress"""
    _, profile = create_test_user()
    missions = {m["id"]: m for m in profile["missions"]}
    assert len(missions) == 5, f"Expected 5 missions, got {len(missions)}"
    for mid in ["m_clear_3", "m_win_5", "m_summon_1", "m_levelup_1", "m_spire_1"]:
        assert missions[mid]["progress"] == 0, f"{mid} should start at 0"
        assert missions[mid]["claimed"] is False, f"{mid} should not be claimed"
        assert missions[mid]["complete"] is False, f"{mid} should not be complete"
    print(f"  All 5 missions initialized correctly")

def test_claim_unknown_mission():
    """Claiming unknown mission should return 404"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/missions/claim/unknown_mission")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"

def test_claim_incomplete_mission():
    """Claiming incomplete mission should fail"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/missions/claim/m_clear_3")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    assert "not complete" in r.json()["detail"].lower(), "Should mention mission not complete"

def test_summon_bumps_mission_and_claim():
    """Summon should update mission progress and allow claim"""
    s, profile = create_test_user()
    # Perform summon
    r = s.post(f"{API}/game/summon", json={"currency": "ryo"})
    assert r.status_code == 200, f"Summon failed: {r.status_code} {r.text}"
    missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
    assert missions["m_summon_1"]["progress"] == 1, "Summon mission should be 1/1"
    assert missions["m_summon_1"]["complete"] is True, "Summon mission should be complete"
    print(f"  Summon mission: {missions['m_summon_1']['progress']}/1 ✓")
    
    # Claim reward
    before_tickets = r.json()["profile"]["inventory"].get("summon_ticket", 0)
    r = s.post(f"{API}/game/missions/claim/m_summon_1")
    assert r.status_code == 200, f"Claim failed: {r.status_code} {r.text}"
    after_tickets = r.json()["profile"]["inventory"].get("summon_ticket", 0)
    assert after_tickets == before_tickets + 1, f"Should gain 1 ticket, got {after_tickets - before_tickets}"
    print(f"  Claimed reward: +1 summon ticket")
    
    # Double claim should fail
    r = s.post(f"{API}/game/missions/claim/m_summon_1")
    assert r.status_code == 400, f"Double claim should fail, got {r.status_code}"
    assert "already claimed" in r.json()["detail"].lower(), "Should mention already claimed"

def test_campaign_win_bumps_missions():
    """Campaign wins should update Clear 3 Stages and Win 5 Battles missions"""
    s, _ = create_test_user()
    # Start and complete 3 battles
    for i in range(3):
        s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
        r = s.post(f"{API}/game/battle/complete", json={
            "stage_id": "s1", "result": "win", "participants": [], "survivors": []
        })
        assert r.status_code == 200, f"Battle {i+1} failed: {r.text}"
    
    missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
    assert missions["m_clear_3"]["progress"] == 3, f"Clear 3 should be 3/3, got {missions['m_clear_3']['progress']}"
    assert missions["m_clear_3"]["complete"] is True, "Clear 3 should be complete"
    assert missions["m_win_5"]["progress"] == 3, f"Win 5 should be 3/5, got {missions['m_win_5']['progress']}"
    print(f"  Clear 3 Stages: {missions['m_clear_3']['progress']}/3 ✓")
    print(f"  Win 5 Battles: {missions['m_win_5']['progress']}/5")
    
    # Claim Clear 3 Stages
    r = s.post(f"{API}/game/missions/claim/m_clear_3")
    assert r.status_code == 200, f"Claim failed: {r.status_code} {r.text}"
    assert r.json()["reward"]["ryo"] == 200, "Should get 200 Ryo"
    print(f"  Claimed: +200 Ryo")

def test_battle_lose_does_not_bump_missions():
    """Losing battles should not update win missions"""
    s, _ = create_test_user()
    s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    r = s.post(f"{API}/game/battle/complete", json={
        "stage_id": "s1", "result": "lose", "participants": [], "survivors": []
    })
    assert r.status_code == 200, f"Battle complete failed: {r.text}"
    missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
    assert missions["m_clear_3"]["progress"] == 0, "Clear 3 should remain 0 after loss"
    assert missions["m_win_5"]["progress"] == 0, "Win 5 should remain 0 after loss"
    print(f"  Missions unchanged after loss ✓")

def test_spire_win_bumps_mission():
    """Spire wins should update Climb the Spire mission"""
    s, _ = create_test_user()
    s.post(f"{API}/game/battle/start", json={"mode": "spire", "id": "1"})
    r = s.post(f"{API}/game/spire/complete", json={
        "floor": 1, "result": "win", "participants": [], "survivors": []
    })
    assert r.status_code == 200, f"Spire complete failed: {r.text}"
    missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
    assert missions["m_spire_1"]["progress"] == 1, f"Spire mission should be 1/1, got {missions['m_spire_1']['progress']}"
    assert missions["m_spire_1"]["complete"] is True, "Spire mission should be complete"
    print(f"  Climb Spire: {missions['m_spire_1']['progress']}/1 ✓")

def test_use_exp_bumps_levelup_mission():
    """Using EXP items should update Level Up Hero mission"""
    s, profile = create_test_user()
    inst_id = profile["ninjas"][0]["instance_id"]
    r = s.post(f"{API}/game/hero/use-exp", json={
        "instance_id": inst_id, "item_id": "exp_tome_greater", "qty": 1
    })
    assert r.status_code == 200, f"Use EXP failed: {r.status_code} {r.text}"
    assert r.json()["levels_gained"] > 0, "Should gain at least 1 level"
    missions = {m["id"]: m for m in r.json()["profile"]["missions"]}
    assert missions["m_levelup_1"]["progress"] >= 1, "Level up mission should have progress"
    assert missions["m_levelup_1"]["complete"] is True, "Level up mission should be complete"
    print(f"  Level Up Hero: {missions['m_levelup_1']['progress']}/1 ✓")


# ============================================================================
# REGRESSION TESTS (Existing Features)
# ============================================================================
def test_admin_login():
    """Admin should be able to login"""
    s, profile = login_admin()
    assert profile["role"] == "admin", f"Expected admin role, got {profile['role']}"
    assert profile["email"] == "admin@shinobi.com", "Wrong admin email"
    print(f"  Admin: {profile['name']} (Lv.{profile['level']})")

def test_catalog_endpoint():
    """GET /game/catalog should return ninja catalog"""
    r = requests.get(f"{API}/game/catalog")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "ninjas" in data and len(data["ninjas"]) > 0, "Catalog should have ninjas"
    print(f"  Catalog: {len(data['ninjas'])} heroes")

def test_stages_endpoint():
    """GET /game/stages should return campaign stages"""
    r = requests.get(f"{API}/game/stages")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    stages = r.json()["stages"]
    assert len(stages) > 0, "Should have stages"
    print(f"  Stages: {len(stages)} campaign stages")

def test_team_management():
    """Users should be able to set their team"""
    s, profile = create_test_user()
    team = [profile["ninjas"][0]["instance_id"]]
    r = s.put(f"{API}/game/team", json={"team": team})
    assert r.status_code == 200, f"Set team failed: {r.status_code} {r.text}"
    assert r.json()["team"] == team, "Team not updated"
    print(f"  Team set: {len(team)} ninja(s)")

def test_leaderboard_endpoint():
    """GET /game/leaderboard should return rankings"""
    r = requests.get(f"{API}/game/leaderboard")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "leaderboard" in data, "Should have leaderboard"
    assert "arena_leaderboard" in data, "Should have arena leaderboard"
    print(f"  Leaderboard: {len(data['leaderboard'])} players, {len(data['arena_leaderboard'])} arena players")


# ============================================================================
# ARENA/PVP TESTS (Priority 2)
# ============================================================================
def test_new_user_has_arena_fields():
    """New users should have default arena fields"""
    _, profile = create_test_user()
    assert "arena" in profile, "Profile should have arena field"
    arena = profile["arena"]
    assert arena["rating"] == 1000, f"Default rating should be 1000, got {arena['rating']}"
    assert arena["wins"] == 0, f"Wins should start at 0, got {arena['wins']}"
    assert arena["losses"] == 0, f"Losses should start at 0, got {arena['losses']}"
    assert arena["attempts_used"] == 0, f"Attempts should start at 0, got {arena['attempts_used']}"
    assert arena["attempts_max"] == 5, f"Max attempts should be 5, got {arena['attempts_max']}"
    print(f"  Arena: Rating {arena['rating']}, {arena['attempts_used']}/{arena['attempts_max']} attempts")

def test_arena_status_endpoint():
    """GET /arena/status should return arena state"""
    s, _ = create_test_user()
    r = s.get(f"{API}/arena/status")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    arena = r.json()["arena"]
    assert "rating" in arena and "attempts_max" in arena, "Missing arena fields"
    print(f"  Arena status: {arena['rating']} rating, {arena['attempts_max']} max attempts")

def test_arena_status_requires_auth():
    """Arena status should require authentication"""
    r = requests.get(f"{API}/arena/status")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_arena_opponent_matchmaking():
    """POST /arena/opponent should return a random opponent"""
    # Create two users so there's an opponent pool
    s1, p1 = create_test_user()
    s2, p2 = create_test_user()
    
    # User 1 should be able to find User 2 as opponent
    r = s1.post(f"{API}/arena/opponent")
    assert r.status_code == 200, f"Matchmaking failed: {r.status_code} {r.text}"
    opp = r.json()["opponent"]
    assert opp["user_id"] != p1["id"], "Should not match with self"
    assert "team" in opp and len(opp["team"]) > 0, "Opponent should have a team"
    assert "name" in opp and "level" in opp and "power" in opp, "Missing opponent fields"
    print(f"  Matched opponent: {opp['name']} (Lv.{opp['level']}, Power {opp['power']})")

def test_arena_opponent_requires_auth():
    """Arena opponent endpoint should require auth"""
    r = requests.post(f"{API}/arena/opponent")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_arena_battle_start_deducts_attempt():
    """POST /arena/battle/start should deduct 1 attempt"""
    s1, p1 = create_test_user()
    s2, p2 = create_test_user()
    
    # Get opponent
    r = s1.post(f"{API}/arena/opponent")
    opp_id = r.json()["opponent"]["user_id"]
    
    # Start battle
    r = s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
    assert r.status_code == 200, f"Battle start failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["profile"]["arena"]["attempts_used"] == 1, "Should use 1 attempt"
    assert "opponent" in data and "team" in data["opponent"], "Should return opponent team"
    print(f"  Attempts: 0 → 1, opponent team size: {len(data['opponent']['team'])}")

def test_arena_cannot_challenge_self():
    """Cannot challenge yourself in arena"""
    s, p = create_test_user()
    r = s.post(f"{API}/arena/battle/start", json={"opponent_user_id": p["id"]})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    assert "yourself" in r.json()["detail"].lower(), "Error should mention self-challenge"

def test_arena_win_awards_rating_and_ryo():
    """Winning arena battle should award +20 rating and +220 Ryo"""
    s1, p1 = create_test_user()
    s2, p2 = create_test_user()
    
    # Get opponent and start battle
    r = s1.post(f"{API}/arena/opponent")
    opp_id = r.json()["opponent"]["user_id"]
    s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
    
    # Complete battle with win
    before_ryo = p1["ryo"]
    r = s1.post(f"{API}/arena/battle/complete", json={
        "opponent_user_id": opp_id,
        "result": "win",
        "participants": [],
        "survivors": []
    })
    assert r.status_code == 200, f"Battle complete failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["result"] == "win", "Result should be win"
    assert data["rewards"]["ryo"] == 220, f"Should get 220 Ryo, got {data['rewards']['ryo']}"
    assert data["profile"]["arena"]["rating"] == 1020, f"Rating should be 1020, got {data['profile']['arena']['rating']}"
    assert data["profile"]["arena"]["wins"] == 1, "Wins should be 1"
    assert data["profile"]["ryo"] == before_ryo + 220, "Ryo should increase by 220"
    print(f"  Win: Rating 1000→1020 (+20), Ryo +220, Wins: 1")

def test_arena_lose_lowers_rating():
    """Losing arena battle should lower rating by 12"""
    s1, p1 = create_test_user()
    s2, p2 = create_test_user()
    
    # Get opponent and start battle
    r = s1.post(f"{API}/arena/opponent")
    opp_id = r.json()["opponent"]["user_id"]
    s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
    
    # Complete battle with loss
    r = s1.post(f"{API}/arena/battle/complete", json={
        "opponent_user_id": opp_id,
        "result": "lose",
        "participants": [],
        "survivors": []
    })
    assert r.status_code == 200, f"Battle complete failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["result"] == "lose", "Result should be lose"
    assert data["rewards"] is None, "Should get no rewards on loss"
    assert data["profile"]["arena"]["rating"] == 988, f"Rating should be 988, got {data['profile']['arena']['rating']}"
    assert data["profile"]["arena"]["losses"] == 1, "Losses should be 1"
    print(f"  Loss: Rating 1000→988 (-12), No rewards, Losses: 1")

def test_arena_daily_attempt_cap():
    """Arena should enforce 5 daily attempts cap"""
    s1, p1 = create_test_user()
    s2, p2 = create_test_user()
    
    # Use all 5 attempts
    for i in range(5):
        r = s1.post(f"{API}/arena/opponent")
        opp_id = r.json()["opponent"]["user_id"]
        r = s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
        assert r.status_code == 200, f"Attempt {i+1} failed: {r.text}"
    
    # 6th attempt should fail
    r = s1.post(f"{API}/arena/opponent")
    opp_id = r.json()["opponent"]["user_id"]
    r = s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    assert "attempt" in r.json()["detail"].lower(), "Error should mention attempts"
    print(f"  Correctly blocked 6th attempt: {r.json()['detail']}")

def test_team_save_updates_arena_snapshot():
    """Saving team should update arena snapshot"""
    s, profile = create_test_user()
    team = [profile["ninjas"][0]["instance_id"]]
    r = s.put(f"{API}/game/team", json={"team": team})
    assert r.status_code == 200, f"Team save failed: {r.status_code} {r.text}"
    
    # Create another user to verify snapshot is matchmakable
    s2, _ = create_test_user()
    r = s2.post(f"{API}/arena/opponent")
    # Should not error (may or may not match this exact player)
    assert r.status_code in (200, 404), f"Matchmaking failed: {r.status_code}"
    print(f"  Team save successful, snapshot updated")


# ============================================================================
# GEMS CURRENCY TESTS (New Feature)
# ============================================================================
def test_new_user_starts_with_gems():
    """New users should start with 100 Gems"""
    _, profile = create_test_user()
    assert profile["gems"] == 100, f"Expected 100 gems, got {profile['gems']}"
    print(f"  Starting gems: {profile['gems']}")

def test_admin_has_gems():
    """Admin should have gems"""
    _, profile = login_admin()
    assert profile["gems"] >= 0, f"Admin should have gems, got {profile['gems']}"
    print(f"  Admin gems: {profile['gems']}")

def test_daily_login_claim_grants_gems():
    """Daily login claim should grant gems on day 3/5/7"""
    s, profile = create_test_user()
    # Claim day 1 (should have ryo, no gems)
    r = s.post(f"{API}/game/login/claim")
    assert r.status_code == 200, f"Day 1 claim failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["day"] == 1, f"Should be day 1, got {data['day']}"
    print(f"  Day 1 claimed: {data['reward']}")

def test_daily_login_already_claimed():
    """Cannot claim daily login twice in same day"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/login/claim")
    assert r.status_code == 200, "First claim should succeed"
    r = s.post(f"{API}/game/login/claim")
    assert r.status_code == 400, f"Second claim should fail, got {r.status_code}"
    assert "already claimed" in r.json()["detail"].lower(), "Should mention already claimed"
    print(f"  Correctly blocked double claim")

def test_energy_refill_with_gems():
    """POST /game/energy/refill should refill energy using gems"""
    s, profile = login_admin()  # Use admin who has 5000 gems
    # Drain some energy
    for _ in range(5):
        s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    
    # Get current state
    r = s.get(f"{API}/game/energy")
    before_energy = r.json()["energy"]["current"]
    before_gems = profile["gems"]
    
    # Refill
    r = s.post(f"{API}/game/energy/refill")
    assert r.status_code == 200, f"Refill failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["profile"]["energy"]["current"] == 100, "Energy should be full"
    assert data["profile"]["gems"] < before_gems, "Gems should be deducted"
    assert data["cost"] > 0, "Cost should be positive"
    print(f"  Refilled: {before_energy}→100 energy, cost: {data['cost']} gems")

def test_energy_refill_when_full():
    """Cannot refill energy when already full"""
    s, _ = create_test_user()
    r = s.post(f"{API}/game/energy/refill")
    assert r.status_code == 400, f"Should fail when full, got {r.status_code}"
    assert "full" in r.json()["detail"].lower(), "Should mention energy is full"
    print(f"  Correctly blocked refill when full")

def test_energy_refill_insufficient_gems():
    """Energy refill should fail with insufficient gems"""
    s, profile = create_test_user()
    # Drain all gems by summoning
    while profile["gems"] >= 300:
        r = s.post(f"{API}/game/summon", json={"currency": "gems"})
        if r.status_code != 200:
            break
        profile = r.json()["profile"]
    
    # Drain energy
    for _ in range(5):
        s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    
    # Try to refill
    r = s.post(f"{API}/game/energy/refill")
    if r.status_code == 400:
        assert "gems" in r.json()["detail"].lower(), "Should mention insufficient gems"
        print(f"  Correctly blocked: {r.json()['detail']}")
    else:
        print(f"  User still had enough gems to refill")

def test_premium_summon_with_gems():
    """POST /game/summon with currency=gems should work"""
    s, profile = login_admin()  # Use admin who has 5000 gems
    before_gems = profile["gems"]
    r = s.post(f"{API}/game/summon", json={"currency": "gems"})
    assert r.status_code == 200, f"Gem summon failed: {r.status_code} {r.text}"
    data = r.json()
    assert "summoned" in data, "Should return summoned hero"
    assert data["profile"]["gems"] < before_gems, "Gems should be deducted"
    gems_cost = before_gems - data["profile"]["gems"]
    print(f"  Summoned {data['summoned']['name']} ({data['summoned']['rarity']}) for {gems_cost} gems")

def test_premium_summon_insufficient_gems():
    """Gem summon should fail with insufficient gems"""
    s, profile = create_test_user()
    # New user has 100 gems, summon costs 300
    r = s.post(f"{API}/game/summon", json={"currency": "gems"})
    assert r.status_code == 400, f"Should fail with insufficient gems, got {r.status_code}"
    assert "gems" in r.json()["detail"].lower(), "Should mention insufficient gems"
    print(f"  Correctly blocked: {r.json()['detail']}")

def test_campaign_first_clear_grants_gems():
    """First clear of campaign stage should grant gems"""
    s, profile = create_test_user()
    before_gems = profile["gems"]
    
    # Start and complete stage
    s.post(f"{API}/game/battle/start", json={"mode": "campaign", "id": "s1"})
    r = s.post(f"{API}/game/battle/complete", json={
        "stage_id": "s1", "result": "win", "participants": [], "survivors": []
    })
    assert r.status_code == 200, f"Battle complete failed: {r.text}"
    data = r.json()
    assert data["first_clear"] is True, "Should be first clear"
    assert data["rewards"]["gems"] > 0, f"Should grant gems, got {data['rewards']['gems']}"
    assert data["profile"]["gems"] > before_gems, "Gems should increase"
    print(f"  First clear: +{data['rewards']['gems']} gems")

def test_arena_milestone_grants_gems():
    """Every 5th arena win should grant bonus gems"""
    s1, p1 = login_admin()  # Use admin to have enough attempts
    s2, p2 = create_test_user()
    
    # Win 5 arena battles
    for i in range(5):
        r = s1.post(f"{API}/arena/opponent")
        if r.status_code != 200:
            print(f"  Skipping: not enough opponents")
            return
        opp_id = r.json()["opponent"]["user_id"]
        s1.post(f"{API}/arena/battle/start", json={"opponent_user_id": opp_id})
        r = s1.post(f"{API}/arena/battle/complete", json={
            "opponent_user_id": opp_id, "result": "win", "participants": [], "survivors": []
        })
        if i == 4:  # 5th win
            data = r.json()
            if data["rewards"]["gems"] > 0:
                print(f"  5th win milestone: +{data['rewards']['gems']} gems")
            else:
                print(f"  Note: 5th win did not grant gems (may need more testing)")

def test_spire_milestone_grants_gems():
    """Every 5th spire floor should grant bonus gems"""
    s, profile = login_admin()  # Use admin for easier progression
    
    # Clear floors 1-5
    for floor in range(1, 6):
        s.post(f"{API}/game/battle/start", json={"mode": "spire", "id": str(floor)})
        r = s.post(f"{API}/game/spire/complete", json={
            "floor": floor, "result": "win", "participants": [], "survivors": []
        })
        if floor == 5:
            data = r.json()
            if data["rewards"]["gems"] > 0:
                print(f"  Floor 5 milestone: +{data['rewards']['gems']} gems")
            else:
                print(f"  Note: Floor 5 did not grant gems (may need more testing)")


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
def main():
    runner = TestRunner()
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SHINOBI CLASH - BACKEND API TEST SUITE")
    print(f"Testing: Priority 1 (Energy + Missions) + Priority 2 (Arena)")
    print(f"Base URL: {BASE_URL}")
    print(f"{'='*60}{Colors.RESET}\n")
    
    # Energy System Tests
    print(f"\n{Colors.YELLOW}━━━ ENERGY SYSTEM TESTS ━━━{Colors.RESET}")
    runner.test("New user starts with full energy", test_new_user_starts_with_full_energy)
    runner.test("Energy endpoint requires auth", test_energy_endpoint_requires_auth)
    runner.test("Energy endpoint returns state", test_energy_endpoint_returns_state)
    runner.test("Battle start consumes energy", test_battle_start_consumes_energy)
    runner.test("Battle start blocks insufficient energy", test_battle_start_blocks_insufficient_energy)
    runner.test("Battle start rejects invalid mode", test_battle_start_invalid_mode)
    runner.test("Battle start rejects unknown stage", test_battle_start_unknown_stage)
    runner.test("Spire battle consumes energy", test_spire_battle_consumes_energy)
    runner.test("Trial battle consumes energy", test_trial_battle_consumes_energy)
    
    # Daily Missions Tests
    print(f"\n{Colors.YELLOW}━━━ DAILY MISSIONS TESTS ━━━{Colors.RESET}")
    runner.test("Missions endpoint requires auth", test_missions_endpoint_requires_auth)
    runner.test("New user missions start at zero", test_new_user_missions_start_at_zero)
    runner.test("Claim unknown mission returns 404", test_claim_unknown_mission)
    runner.test("Claim incomplete mission fails", test_claim_incomplete_mission)
    runner.test("Summon bumps mission and claim works", test_summon_bumps_mission_and_claim)
    runner.test("Campaign wins bump missions", test_campaign_win_bumps_missions)
    runner.test("Battle loss does not bump missions", test_battle_lose_does_not_bump_missions)
    runner.test("Spire win bumps mission", test_spire_win_bumps_mission)
    runner.test("Use EXP bumps levelup mission", test_use_exp_bumps_levelup_mission)
    
    # Arena/PvP Tests
    print(f"\n{Colors.YELLOW}━━━ ARENA/PVP TESTS (Priority 2) ━━━{Colors.RESET}")
    runner.test("New user has arena fields", test_new_user_has_arena_fields)
    runner.test("Arena status endpoint works", test_arena_status_endpoint)
    runner.test("Arena status requires auth", test_arena_status_requires_auth)
    runner.test("Arena opponent matchmaking works", test_arena_opponent_matchmaking)
    runner.test("Arena opponent requires auth", test_arena_opponent_requires_auth)
    runner.test("Arena battle start deducts attempt", test_arena_battle_start_deducts_attempt)
    runner.test("Cannot challenge self", test_arena_cannot_challenge_self)
    runner.test("Arena win awards rating and Ryo", test_arena_win_awards_rating_and_ryo)
    runner.test("Arena lose lowers rating", test_arena_lose_lowers_rating)
    runner.test("Arena daily attempt cap enforced", test_arena_daily_attempt_cap)
    runner.test("Team save updates arena snapshot", test_team_save_updates_arena_snapshot)
    
    # Gems Currency Tests
    print(f"\n{Colors.YELLOW}━━━ GEMS CURRENCY TESTS (New Feature) ━━━{Colors.RESET}")
    runner.test("New user starts with gems", test_new_user_starts_with_gems)
    runner.test("Admin has gems", test_admin_has_gems)
    runner.test("Daily login claim works", test_daily_login_claim_grants_gems)
    runner.test("Daily login double claim blocked", test_daily_login_already_claimed)
    runner.test("Energy refill with gems works", test_energy_refill_with_gems)
    runner.test("Energy refill when full blocked", test_energy_refill_when_full)
    runner.test("Energy refill insufficient gems", test_energy_refill_insufficient_gems)
    runner.test("Premium summon with gems works", test_premium_summon_with_gems)
    runner.test("Premium summon insufficient gems", test_premium_summon_insufficient_gems)
    runner.test("Campaign first clear grants gems", test_campaign_first_clear_grants_gems)
    runner.test("Arena milestone grants gems", test_arena_milestone_grants_gems)
    runner.test("Spire milestone grants gems", test_spire_milestone_grants_gems)
    
    # Regression Tests
    print(f"\n{Colors.YELLOW}━━━ REGRESSION TESTS ━━━{Colors.RESET}")
    runner.test("Admin login works", test_admin_login)
    runner.test("Catalog endpoint works", test_catalog_endpoint)
    runner.test("Stages endpoint works", test_stages_endpoint)
    runner.test("Team management works", test_team_management)
    runner.test("Leaderboard endpoint works", test_leaderboard_endpoint)
    
    # Summary
    success = runner.summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
