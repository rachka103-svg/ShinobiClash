#!/usr/bin/env python3
"""
Test suite for specific session changes:
1. Dungeons: Verify only Gold Vault and EXP Temple exist (no Gear Foundry)
2. Shop: Verify Blueprint items are present
3. Backend APIs work correctly
"""

import requests
import sys
import json
from datetime import datetime

BASE_URL = "https://energy-missions-plus.preview.emergentagent.com/api"

class SessionChangesTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []
        self.cookies = None

    def log(self, msg, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {msg}")

    def test(self, name, condition, details=""):
        self.tests_run += 1
        if condition:
            self.tests_passed += 1
            self.log(f"✅ {name}", "PASS")
            return True
        else:
            self.failures.append({"test": name, "details": details})
            self.log(f"❌ {name} - {details}", "FAIL")
            return False

    def test_login(self):
        """Test login endpoint"""
        self.log("=== TESTING LOGIN ===")
        try:
            resp = requests.post(f"{BASE_URL}/auth/login", json={
                "email": "admin@shinobi.com",
                "password": "admin123"
            }, timeout=10)
            
            success = self.test(
                "Login with admin credentials",
                resp.status_code == 200,
                f"Status: {resp.status_code}"
            )
            
            if success:
                data = resp.json()
                self.log(f"   Logged in as {data.get('name')} (Level {data.get('level')})")
                # Store cookies for authenticated requests
                self.cookies = resp.cookies
                return True
            return False
        except Exception as e:
            self.test("Login with admin credentials", False, str(e))
            return False

    def test_dungeons(self):
        """Test dungeons catalog - verify Gear Foundry removed"""
        self.log("\n=== TESTING RESOURCE DUNGEONS ===")
        try:
            resp = requests.get(f"{BASE_URL}/game/catalog", timeout=10)
            if resp.status_code != 200:
                self.test("Get game catalog", False, f"Status: {resp.status_code}")
                return False
            
            data = resp.json()
            dungeons = data.get('dungeons', [])
            
            self.log(f"   Found {len(dungeons)} dungeons in catalog")
            
            # List all dungeon IDs
            dungeon_ids = [d.get('id') for d in dungeons]
            dungeon_names = [d.get('name') for d in dungeons]
            self.log(f"   Dungeon IDs: {dungeon_ids}")
            self.log(f"   Dungeon Names: {dungeon_names}")
            
            # Test 1: Verify exactly 2 dungeons
            self.test(
                "Exactly 2 dungeons present",
                len(dungeons) == 2,
                f"Found {len(dungeons)} dungeons, expected 2"
            )
            
            # Test 2: Verify Gold Vault exists
            gold_vault = any(d.get('id') == 'gold_vault' for d in dungeons)
            self.test(
                "Gold Vault dungeon present",
                gold_vault,
                "gold_vault not found in dungeons"
            )
            
            # Test 3: Verify EXP Temple exists
            exp_temple = any(d.get('id') == 'exp_temple' for d in dungeons)
            self.test(
                "EXP Temple dungeon present",
                exp_temple,
                "exp_temple not found in dungeons"
            )
            
            # Test 4: Verify Gear Foundry does NOT exist
            gear_foundry = any(d.get('id') == 'gear_foundry' for d in dungeons)
            self.test(
                "Gear Foundry dungeon removed",
                not gear_foundry,
                "gear_foundry still present in dungeons"
            )
            
            # Test 5: Verify trials list (backend compatibility)
            trials = data.get('trials', [])
            self.log(f"   Found {len(trials)} trials")
            trial_ids = [t.get('id') for t in trials]
            self.log(f"   Trial IDs: {trial_ids}")
            
            # Check that gear_foundry trials are not present
            gear_foundry_trials = [t for t in trials if 'gear' in t.get('id', '').lower() and 'foundry' in t.get('id', '').lower()]
            self.test(
                "No Gear Foundry trials present",
                len(gear_foundry_trials) == 0,
                f"Found {len(gear_foundry_trials)} gear foundry trials"
            )
            
            return True
            
        except Exception as e:
            self.test("Get dungeons catalog", False, str(e))
            return False

    def test_shop_blueprints(self):
        """Test shop for blueprint items"""
        self.log("\n=== TESTING ITEM SHOP BLUEPRINTS ===")
        try:
            resp = requests.get(f"{BASE_URL}/game/shop", cookies=self.cookies, timeout=10)
            if resp.status_code != 200:
                self.test("Get shop items", False, f"Status: {resp.status_code}")
                return False
            
            data = resp.json()
            items = data.get('items', [])
            
            self.log(f"   Found {len(items)} items in shop")
            
            # List all shop item IDs
            shop_ids = [item.get('id') for item in items]
            self.log(f"   Shop item IDs: {shop_ids}")
            
            # Test for each blueprint
            blueprint_items = {
                'shop_blueprint_weapon': 'Weapon Blueprint',
                'shop_blueprint_armor': 'Armor Blueprint',
                'shop_blueprint_accessory': 'Accessory Blueprint',
                'shop_blueprint_relic': 'Relic Blueprint'
            }
            
            for bp_id, bp_name in blueprint_items.items():
                found = any(item.get('id') == bp_id for item in items)
                self.test(
                    f"{bp_name} in shop",
                    found,
                    f"{bp_id} not found in shop items"
                )
                
                if found:
                    bp_item = next(item for item in items if item.get('id') == bp_id)
                    self.log(f"      {bp_name}: {bp_item.get('price')} {bp_item.get('currency')}")
            
            return True
            
        except Exception as e:
            self.test("Get shop blueprints", False, str(e))
            return False

    def test_dungeon_trial_battle(self):
        """Test that dungeon trials can be started"""
        self.log("\n=== TESTING DUNGEON TRIAL BATTLES ===")
        try:
            # Get catalog to find trial IDs
            resp = requests.get(f"{BASE_URL}/game/catalog", timeout=10)
            if resp.status_code != 200:
                self.test("Get catalog for trials", False, f"Status: {resp.status_code}")
                return False
            
            data = resp.json()
            trials = data.get('trials', [])
            
            # Find gold_vault and exp_temple trials
            gold_trials = [t for t in trials if t.get('dungeon_id') == 'gold_vault']
            exp_trials = [t for t in trials if t.get('dungeon_id') == 'exp_temple']
            
            self.log(f"   Gold Vault trials: {len(gold_trials)}")
            self.log(f"   EXP Temple trials: {len(exp_trials)}")
            
            self.test(
                "Gold Vault has trial tiers",
                len(gold_trials) > 0,
                f"Found {len(gold_trials)} gold vault trials"
            )
            
            self.test(
                "EXP Temple has trial tiers",
                len(exp_trials) > 0,
                f"Found {len(exp_trials)} exp temple trials"
            )
            
            # Verify trial structure
            if gold_trials:
                trial = gold_trials[0]
                has_enemies = 'enemies' in trial
                has_rewards = 'rewards' in trial
                self.test(
                    "Trial has enemies and rewards",
                    has_enemies and has_rewards,
                    f"enemies: {has_enemies}, rewards: {has_rewards}"
                )
            
            return True
            
        except Exception as e:
            self.test("Test dungeon trials", False, str(e))
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("SESSION CHANGES TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failures:
            print("\n" + "="*70)
            print("FAILURES:")
            print("="*70)
            for i, failure in enumerate(self.failures, 1):
                print(f"\n{i}. {failure['test']}")
                print(f"   {failure['details']}")
        
        print("\n" + "="*70)
        return 0 if self.tests_run == self.tests_passed else 1

def main():
    tester = SessionChangesTester()
    
    print("="*70)
    print("SHINOBI CLASH - SESSION CHANGES TEST")
    print("="*70)
    print("Testing:")
    print("  1. Gear Foundry removal")
    print("  2. Blueprint items in shop")
    print("  3. Dungeon trial structure")
    print("="*70)
    
    # Run tests
    tester.test_login()
    tester.test_dungeons()
    tester.test_shop_blueprints()
    tester.test_dungeon_trial_battle()
    
    # Print summary
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
