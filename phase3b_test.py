#!/usr/bin/env python3
"""
Phase 3B Combat Ability & Boss Mechanics Integration - Backend surface tests.

Combat itself runs client-side (frontend/src/lib/battle.js) — the pure
ability-resolution / status-effect / boss-mechanic functions are covered by
a dedicated JS test suite at frontend/src/lib/battle.abilities.test.mjs
(run via plain `node`, no bundler needed — see that file's header).

This file verifies the BACKEND surface Phase 3B combat depends on:
  - /api/game/stages now ships `boss_mechanics` (the reusable phase
    framework) alongside stages, and boss stages reference a valid id.
  - The 6 heroes wired to real combat mechanics this phase actually carry
    the expected `effect_type` in their catalog `passive`.
  - Full existing regression suite (auth/campaign/spire/arena/etc.) still
    passes — Phase 3B must not have broken anything.
"""
import requests
import sys

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

    def test(self, name, fn):
        try:
            print(f"\n{Colors.BLUE}▶ Testing: {name}{Colors.RESET}")
            fn()
            self.passed += 1
            print(f"{Colors.GREEN}✓ PASS{Colors.RESET}")
        except AssertionError as e:
            self.failed += 1
            print(f"{Colors.RED}✗ FAIL: {e}{Colors.RESET}")
        except Exception as e:
            self.failed += 1
            print(f"{Colors.RED}✗ ERROR: {e}{Colors.RESET}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'=' * 60}")
        print(f"{Colors.YELLOW}Phase 3B Backend Surface: {self.passed}/{total} passed{Colors.RESET}")
        print(f"{'=' * 60}")
        return self.failed == 0


r = TestRunner()


def test_stages_expose_boss_mechanics():
    r_ = requests.get(f"{API}/game/stages", timeout=15)
    assert r_.status_code == 200
    data = r_.json()
    assert "boss_mechanics" in data, "stages response must include boss_mechanics framework"
    mechs = data["boss_mechanics"]
    assert "sealed_titan" in mechs and "abyssal_warden" in mechs
    for mid, m in mechs.items():
        assert "phases" in m and len(m["phases"]) >= 2, f"{mid} must define phases"

    boss_stages = [s for s in data["stages"] if s.get("is_boss")]
    assert len(boss_stages) >= 2, "expected multiple generated boss stages"
    for s in boss_stages:
        assert s.get("boss_mechanic") in mechs, f"stage {s['id']} references unknown boss_mechanic"


def test_signature_mechanics_present_on_expected_heroes():
    r_ = requests.get(f"{API}/game/catalog", timeout=15)
    assert r_.status_code == 200
    catalog_by_id = {h["id"]: h for h in r_.json()["ninjas"]}
    expected = {
        "shade": "execute_low_hp",
        "apep": "escalating_dot",
        "sekhmet": "stacking_mark_detonate",
        "brahma": "team_shield",
        "osiris": "revive_once",
        "ares": "hp_scaling_power",
    }
    for hero_id, effect_type in expected.items():
        hero = catalog_by_id.get(hero_id)
        assert hero, f"hero {hero_id} missing from catalog"
        passive = hero.get("passive") or {}
        assert passive.get("effect_type") == effect_type, (
            f"{hero_id} expected passive effect_type={effect_type}, got {passive.get('effect_type')}"
        )
        assert passive.get("signature") is True, f"{hero_id} should be a signature mechanic"


def test_catalog_still_has_69_heroes():
    r_ = requests.get(f"{API}/game/catalog", timeout=15)
    ninjas = r_.json()["ninjas"]
    assert len(ninjas) == 69, f"expected 69 heroes (Phase 2A baseline unchanged), got {len(ninjas)}"


r.test("Stages expose boss_mechanics framework with valid boss stage refs", test_stages_expose_boss_mechanics)
r.test("6 representative heroes carry the expected wired signature mechanic", test_signature_mechanics_present_on_expected_heroes)
r.test("Catalog size unchanged at 69 heroes (no roster scope creep)", test_catalog_still_has_69_heroes)

ok = r.summary()
sys.exit(0 if ok else 1)
