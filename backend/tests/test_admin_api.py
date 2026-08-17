"""Backend tests for the Admin Panel + AI Hero Generator feature."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://shinobi-combat-zone.preview.emergentagent.com"
ADMIN_EMAIL = "admin@shinobi.com"
ADMIN_PASSWORD = "admin123"

CREATED_HEROES = []  # cleanup


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def player_client():
    s = requests.Session()
    email = f"TEST_player_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": email, "password": "testpass1", "name": "TestPlayer"},
               timeout=20)
    assert r.status_code == 200, f"register failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def anon_client():
    return requests.Session()


# ----- Admin Auth Gating -----
class TestAdminAuthGating:
    def test_unauth_admin_heroes_returns_401(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/heroes", timeout=15)
        assert r.status_code == 401, f"got {r.status_code} {r.text}"

    def test_non_admin_admin_heroes_returns_403(self, player_client):
        r = player_client.get(f"{BASE_URL}/api/admin/heroes", timeout=15)
        assert r.status_code == 403, f"got {r.status_code} {r.text}"

    def test_unauth_generate_401(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/admin/hero/generate", json={"name": "X"}, timeout=15)
        assert r.status_code == 401

    def test_non_admin_generate_403(self, player_client):
        r = player_client.post(f"{BASE_URL}/api/admin/hero/generate", json={"name": "X"}, timeout=15)
        assert r.status_code == 403

    def test_non_admin_delete_403(self, player_client):
        r = player_client.delete(f"{BASE_URL}/api/admin/hero/blaze", timeout=15)
        assert r.status_code == 403


# ----- Admin Heroes List -----
class TestAdminHeroesList:
    def test_list_heroes_admin_success(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/heroes", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "heroes" in data and "elements" in data and "rarities" in data and "roles" in data
        heroes = data["heroes"]
        # Initial 38 (12 ninjas + 26 imported) — allow >= 38 in case custom heroes already exist
        assert len(heroes) >= 38, f"expected >=38 heroes, got {len(heroes)}"
        for h in heroes:
            assert "is_custom" in h
            assert "id" in h and "name" in h and "base_stats" in h
        assert "Fire" in data["elements"]
        assert "Attacker" in data["roles"]
        assert "SSR" in data["rarities"]


# ----- Public Catalog baseline -----
class TestPublicCatalog:
    def test_catalog_baseline(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "ninjas" in data
        assert len(data["ninjas"]) >= 38


# ----- Hero Save (without AI gen) -----
class TestHeroSaveAndDelete:
    def test_save_invalid_element_400(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/save", json={
            "name": "TEST_BadHero", "title": "x", "element": "Bogus",
            "rarity": "SR", "role": "Attacker", "lore": "x",
            "base_stats": {"hp": 1000, "atk": 150, "def": 80, "spd": 100, "chakra": 110},
        }, timeout=15)
        assert r.status_code == 400

    def test_save_custom_hero_and_appears_in_catalog(self, admin_client, anon_client):
        hero_id = f"test_hero_{uuid.uuid4().hex[:6]}"
        CREATED_HEROES.append(hero_id)
        # Catalog count before
        c0 = anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()
        count_before = len(c0["ninjas"])

        payload = {
            "id": hero_id, "name": "TEST_Hero", "title": "The Test Subject",
            "element": "Fire", "rarity": "SR", "role": "Attacker",
            "lore": "An automated test hero.",
            "base_stats": {"hp": 1000, "atk": 150, "def": 80, "spd": 100, "chakra": 110},
            "portrait": f"/custom/{hero_id}.png",
        }
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/save", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        hero = r.json()["hero"]
        assert hero["id"] == hero_id
        assert hero["is_custom"] is True
        assert hero["element"] == "Fire"
        # clamp_stats should preserve provided in-band stats
        assert hero["base_stats"]["hp"] == 1000
        assert "jutsus" in hero and len(hero["jutsus"]) == 3

        # Verify appears in public catalog
        c1 = anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()
        ids = [n["id"] for n in c1["ninjas"]]
        assert hero_id in ids
        assert len(c1["ninjas"]) == count_before + 1

    def test_save_clamps_out_of_band_stats(self, admin_client):
        hero_id = f"test_clamp_{uuid.uuid4().hex[:6]}"
        CREATED_HEROES.append(hero_id)
        # Provide absurdly high stats — should be clamped
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/save", json={
            "id": hero_id, "name": "TEST_Clamp", "title": "Clamp Tester",
            "element": "Water", "rarity": "SR", "role": "Attacker", "lore": "",
            "base_stats": {"hp": 99999, "atk": 99999, "def": 99999, "spd": 99999, "chakra": 99999},
        }, timeout=20)
        assert r.status_code == 200
        stats = r.json()["hero"]["base_stats"]
        # SR Attacker base hp 980; cap = base*1.5 = 1470
        assert stats["hp"] <= 1500
        assert stats["atk"] <= 240

    def test_delete_static_hero_returns_400(self, admin_client):
        r = admin_client.delete(f"{BASE_URL}/api/admin/hero/blaze", timeout=15)
        assert r.status_code == 400

    def test_delete_custom_hero_success(self, admin_client, anon_client):
        # Create a one-shot custom hero, then delete it
        hero_id = f"test_del_{uuid.uuid4().hex[:6]}"
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/save", json={
            "id": hero_id, "name": "TEST_Del", "title": "Doomed",
            "element": "Wind", "rarity": "R", "role": "Attacker", "lore": "",
            "base_stats": {"hp": 800, "atk": 115, "def": 60, "spd": 95, "chakra": 100},
        }, timeout=20)
        assert r.status_code == 200
        c_before = len(anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()["ninjas"])
        r = admin_client.delete(f"{BASE_URL}/api/admin/hero/{hero_id}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        c_after = len(anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()["ninjas"])
        assert c_after == c_before - 1
        # confirm gone
        ids = [n["id"] for n in anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()["ninjas"]]
        assert hero_id not in ids


# ----- Portrait Override (static hero) -----
# Tiny 1x1 transparent PNG
TINY_PNG_B64 = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YA"
                "AAAASUVORK5CYII=")


class TestPortraitOverride:
    def test_portrait_override_static_hero_blaze(self, admin_client, anon_client):
        try:
            # Use a NON-blaze static hero so we don't disturb blaze art
            target = "boulder"
            r = admin_client.post(f"{BASE_URL}/api/admin/hero/portrait",
                                  json={"template_id": target, "image": TINY_PNG_B64},
                                  timeout=20)
            assert r.status_code == 200, r.text
            hero = r.json()["hero"]
            assert hero["id"] == target
            assert hero["is_custom"] is False
            assert hero["portrait"].startswith(f"/custom/{target}.png")

            # Check public catalog reflects override
            cat = anon_client.get(f"{BASE_URL}/api/game/catalog", timeout=15).json()
            entry = next(n for n in cat["ninjas"] if n["id"] == target)
            assert entry["portrait"].startswith(f"/custom/{target}.png")
        finally:
            # Cleanup: restore the hero's original art via the reset endpoint.
            admin_client.delete(f"{BASE_URL}/api/admin/hero/{target}/portrait", timeout=15)

    def test_portrait_unknown_hero_404(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/portrait",
                              json={"template_id": "nonexistent_xyz", "image": TINY_PNG_B64},
                              timeout=15)
        assert r.status_code == 404


# ----- AI Hero Generate (real LLM call — slow) -----
@pytest.mark.slow
class TestAIHeroGenerate:
    def test_generate_returns_draft(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/hero/generate", json={
            "name": "TEST_Aether", "concept": "An ancient sky-walking shinobi",
            "element": "Wind", "rarity": "SSR", "role": "Attacker",
        }, timeout=180)
        assert r.status_code == 200, r.text
        draft = r.json()["draft"]
        assert draft["element"] == "Wind"
        assert draft["rarity"] == "SSR"
        assert draft["role"] == "Attacker"
        assert "base_stats" in draft
        for k in ("hp", "atk", "def", "spd", "chakra"):
            assert k in draft["base_stats"]
            assert isinstance(draft["base_stats"][k], int)
        # Portrait path under /custom/<id>.png
        assert draft["portrait"].startswith("/custom/")
        # SSR Attacker hp base 1080 — clamped band [648,1620]
        assert 648 <= draft["base_stats"]["hp"] <= 1620


# ----- Cleanup -----
def test_cleanup_created_heroes():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        return
    # Get current catalog and delete any remaining test heroes
    cat = requests.get(f"{BASE_URL}/api/admin/heroes",
                       cookies=s.cookies).json()
    for h in cat.get("heroes", []):
        if h.get("is_custom") and (h["id"].startswith("test_") or h["name"].startswith("TEST_")):
            s.delete(f"{BASE_URL}/api/admin/hero/{h['id']}", timeout=15)
