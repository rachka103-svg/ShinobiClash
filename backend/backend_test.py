#!/usr/bin/env python3
"""
Comprehensive backend API test suite for Shinobi Clash Phase J1 expansion.
Tests: auth, energy, missions, campaign, spire, arena, ascend, summon, evolve,
leveling, gear, crafting, fusion, dungeons.
"""
import requests
import sys
import json
from datetime import datetime

BASE_URL = "https://energy-missions-plus.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()  # Use session to maintain cookies
        self.user_id = None
        self.profile = None
        
    def log(self, msg, status="info"):
        prefix = {"info": "ℹ️", "pass": "✅", "fail": "❌", "warn": "⚠️"}[status]
        print(f"{prefix} {msg}")
    
    def test(self, name, method, endpoint, expected_status, data=None, check_fn=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        self.log(f"Testing {name}...", "info")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            status_ok = response.status_code == expected_status
            if not status_ok:
                self.log(f"FAIL {name} - Expected {expected_status}, got {response.status_code}: {response.text[:200]}", "fail")
                return False, {}
            
            # Additional checks
            if check_fn:
                result = response.json() if response.text else {}
                if not check_fn(result):
                    self.log(f"FAIL {name} - Check function failed", "fail")
                    return False, result
            
            self.tests_passed += 1
            self.log(f"PASS {name}", "pass")
            return True, response.json() if response.text else {}
            
        except Exception as e:
            self.log(f"FAIL {name} - Exception: {str(e)}", "fail")
            return False, {}
    
    def run_all_tests(self):
        """Execute full test suite"""
        self.log("=" * 60, "info")
        self.log("SHINOBI CLASH BACKEND TEST SUITE - Phase J1", "info")
        self.log("=" * 60, "info")
        
        # ===== AUTH & PROFILE =====
        self.log("\n[AUTH & PROFILE]", "info")
        
        # Register new test user
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        success, data = self.test(
            "Register new user",
            "POST", "auth/register",
            200,
            {"email": test_email, "password": "test123", "name": "TestUser"},
            lambda r: "id" in r and "ninjas" in r and len(r["ninjas"]) == 3
        )
        if success:
            self.profile = data
            self.user_id = data["id"]
        
        # Login with admin
        success, data = self.test(
            "Login admin",
            "POST", "auth/login",
            200,
            {"email": "admin@shinobi.com", "password": "admin123"},
            lambda r: "id" in r and "ryo" in r
        )
        if success:
            self.profile = data
            self.user_id = data["id"]
            # Extract token from cookies (not returned in body for cookie-based auth)
            # For testing, we'll use the profile data
        
        # Get profile
        self.test(
            "Get profile",
            "GET", "game/profile",
            200,
            check_fn=lambda r: "ninjas" in r and "energy" in r
        )
        
        # ===== CATALOG =====
        self.log("\n[CATALOG & CONFIG]", "info")
        
        success, catalog = self.test(
            "Get catalog",
            "GET", "game/catalog",
            200,
            check_fn=lambda r: all(k in r for k in [
                "ninjas", "summon_rates", "pity_config", "gear_config",
                "craft_recipes", "fusion_recipes", "exp_tome_gold_cost", "dungeons"
            ])
        )
        
        if success:
            # Verify pity config
            if "pity_config" in catalog:
                pc = catalog["pity_config"]
                if pc.get("hard_pity") == 150 and pc.get("soft_pity_start") == 100:
                    self.log("Pity config correct (soft 100, hard 150)", "pass")
                    self.tests_passed += 1
                else:
                    self.log(f"Pity config incorrect: {pc}", "fail")
                self.tests_run += 1
            
            # Verify dungeons have 5 tiers each
            if "dungeons" in catalog:
                for d in catalog["dungeons"]:
                    if len(d.get("tiers", [])) == 5:
                        self.log(f"Dungeon {d['id']} has 5 tiers", "pass")
                        self.tests_passed += 1
                    else:
                        self.log(f"Dungeon {d['id']} has {len(d.get('tiers', []))} tiers (expected 5)", "fail")
                    self.tests_run += 1
        
        # ===== ENERGY =====
        self.log("\n[ENERGY SYSTEM]", "info")
        
        self.test(
            "Get energy",
            "GET", "game/energy",
            200,
            check_fn=lambda r: "energy" in r and "current" in r["energy"]
        )
        
        # ===== MISSIONS =====
        self.log("\n[DAILY MISSIONS]", "info")
        
        self.test(
            "Get missions",
            "GET", "game/missions",
            200,
            check_fn=lambda r: "missions" in r and isinstance(r["missions"], list)
        )
        
        # ===== SUMMON SYSTEM =====
        self.log("\n[SUMMON & PITY]", "info")
        
        # Single summon
        success, data = self.test(
            "Summon x1 (ryo)",
            "POST", "game/summon",
            200,
            {"currency": "ryo", "count": 1},
            lambda r: "results" in r and len(r["results"]) == 1 and "summoned" in r
        )
        
        # x10 summon
        success, data = self.test(
            "Summon x10 (ryo)",
            "POST", "game/summon",
            200,
            {"currency": "ryo", "count": 10},
            lambda r: "results" in r and len(r["results"]) == 10 and "pity" in r
        )
        
        if success:
            # Check x10 guarantee (at least one SR+)
            results = data.get("results", [])
            sr_plus = ["SR", "SSR", "UR", "GR", "LR", "MYTHIC"]
            has_sr_plus = any(r.get("rarity") in sr_plus for r in results)
            if has_sr_plus:
                self.log("x10 guarantee: at least one SR+ found", "pass")
                self.tests_passed += 1
            else:
                self.log("x10 guarantee: NO SR+ found (should have at least one)", "fail")
            self.tests_run += 1
        
        # ===== HERO PROGRESSION =====
        self.log("\n[HERO LEVELING & EVOLUTION]", "info")
        
        # Get a hero instance
        success, profile = self.test("Get profile for hero", "GET", "game/profile", 200)
        if success and profile.get("ninjas"):
            hero = profile["ninjas"][0]
            instance_id = hero["instance_id"]
            
            # Use EXP tome with qty
            success, data = self.test(
                "Use EXP tome (qty=1)",
                "POST", "game/hero/use-exp",
                200,
                {"instance_id": instance_id, "item_id": "exp_tome_minor", "qty": 1},
                lambda r: "gold_spent" in r
            )
            
            if success and data.get("gold_spent", 0) > 0:
                self.log(f"Gold charged: {data['gold_spent']} ryo", "pass")
                self.tests_passed += 1
            else:
                self.log("Gold not charged for EXP tome", "fail")
            self.tests_run += 1
            
            # Try bulk qty
            self.test(
                "Use EXP tome (qty=5)",
                "POST", "game/hero/use-exp",
                200,
                {"instance_id": instance_id, "item_id": "exp_tome_minor", "qty": 5},
                lambda r: "gold_spent" in r and r["gold_spent"] > 0
            )
            
            # Evolution (will likely fail due to insufficient shards, but test endpoint)
            self.test(
                "Evolve hero (expect 400 - insufficient shards)",
                "POST", "game/hero/evolve",
                400,
                {"instance_id": instance_id}
            )
        
        # ===== GEAR SYSTEM =====
        self.log("\n[GEAR SYSTEM]", "info")
        
        # Gear summon
        success, data = self.test(
            "Gear summon x1 (gems)",
            "POST", "game/gear/summon",
            200,
            {"currency": "gems", "count": 1},
            lambda r: "results" in r and len(r["results"]) == 1
        )
        
        # Get profile to check gear
        success, profile = self.test("Get profile for gear", "GET", "game/profile", 200)
        if success and profile.get("gear") and profile.get("ninjas"):
            gear = profile["gear"][0]
            hero = profile["ninjas"][0]
            gear_id = gear["gear_id"]
            instance_id = hero["instance_id"]
            
            # Equip gear
            success, data = self.test(
                "Equip gear",
                "POST", "game/gear/equip",
                200,
                {"gear_id": gear_id, "instance_id": instance_id},
                lambda r: "profile" in r
            )
            
            # Verify stats increased
            if success:
                new_profile = data.get("profile", {})
                new_hero = next((h for h in new_profile.get("ninjas", []) if h["instance_id"] == instance_id), None)
                if new_hero and new_hero.get("gear_score", 0) > 0:
                    self.log(f"Hero gear_score: {new_hero['gear_score']}", "pass")
                    self.tests_passed += 1
                else:
                    self.log("Hero gear_score not updated", "fail")
                self.tests_run += 1
            
            # Enhance gear
            self.test(
                "Enhance gear +1",
                "POST", "game/gear/enhance",
                200,
                {"gear_id": gear_id},
                lambda r: "gear" in r and r["gear"].get("plus", 0) >= 1
            )
            
            # Unequip gear
            self.test(
                "Unequip gear",
                "POST", "game/gear/unequip",
                200,
                {"gear_id": gear_id}
            )
        
        # ===== CRAFTING & FUSION =====
        self.log("\n[CRAFTING & FUSION]", "info")
        
        # Craft (expect 400 - insufficient materials)
        self.test(
            "Craft weapon (expect 400 - no blueprint)",
            "POST", "game/gear/craft",
            400,
            {"slot": "weapon"}
        )
        
        # Fusion (expect 400 - insufficient materials)
        self.test(
            "Fuse forge_steel (expect 400 - no scrap_iron)",
            "POST", "game/material/fuse",
            400,
            {"target_id": "forge_steel", "qty": 1}
        )
        
        # ===== DUNGEONS =====
        self.log("\n[RESOURCE DUNGEONS]", "info")
        
        # Start dungeon battle
        success, data = self.test(
            "Start dungeon battle (gold_vault T1)",
            "POST", "game/battle/start",
            200,
            {"mode": "trial", "id": "d_gold_vault_t1"},
            lambda r: "cost" in r and r["cost"] == 8
        )
        
        # Complete dungeon (win)
        success, data = self.test(
            "Complete dungeon (win)",
            "POST", "game/trial/complete",
            200,
            {"trial_id": "d_gold_vault_t1", "result": "win", "participants": [], "survivors": []},
            lambda r: "rewards" in r and "ryo" in r["rewards"]
        )
        
        if success:
            rewards = data.get("rewards", {})
            if rewards.get("ryo", 0) > 0:
                self.log(f"Dungeon rewards: {rewards['ryo']} ryo", "pass")
                self.tests_passed += 1
            self.tests_run += 1
        
        # ===== CAMPAIGN REGRESSION =====
        self.log("\n[CAMPAIGN REGRESSION]", "info")
        
        self.test(
            "Get stages",
            "GET", "game/stages",
            200,
            check_fn=lambda r: "stages" in r and len(r["stages"]) > 0
        )
        
        self.test(
            "Start campaign battle",
            "POST", "game/battle/start",
            200,
            {"mode": "campaign", "id": "s1"}
        )
        
        self.test(
            "Complete campaign battle",
            "POST", "game/battle/complete",
            200,
            {"stage_id": "s1", "result": "win", "participants": [], "survivors": []},
            lambda r: "rewards" in r
        )
        
        # ===== SPIRE REGRESSION =====
        self.log("\n[SPIRE REGRESSION]", "info")
        
        self.test(
            "Start spire battle",
            "POST", "game/battle/start",
            200,
            {"mode": "spire", "id": "1"}
        )
        
        self.test(
            "Complete spire battle",
            "POST", "game/spire/complete",
            200,
            {"floor": 1, "result": "win", "participants": [], "survivors": []},
            lambda r: "rewards" in r
        )
        
        # ===== ARENA REGRESSION =====
        self.log("\n[ARENA REGRESSION]", "info")
        
        self.test(
            "Get arena status",
            "GET", "arena/status",
            200,
            check_fn=lambda r: "arena" in r
        )
        
        # ===== ASCENSION REGRESSION =====
        self.log("\n[ASCENSION REGRESSION]", "info")
        
        success, profile = self.test("Get profile for ascension", "GET", "game/profile", 200)
        if success and profile.get("ninjas"):
            hero = profile["ninjas"][0]
            # Will likely fail due to not at cap, but test endpoint
            self.test(
                "Ascend hero (expect 400 - not at cap)",
                "POST", "game/hero/ascend",
                400,
                {"instance_id": hero["instance_id"]}
            )
        
        # ===== SUMMARY =====
        self.log("\n" + "=" * 60, "info")
        self.log(f"TESTS PASSED: {self.tests_passed}/{self.tests_run}", "info")
        self.log("=" * 60, "info")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = APITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
