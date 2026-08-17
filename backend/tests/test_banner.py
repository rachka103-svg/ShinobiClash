"""Backend tests for the rate-up Summon banner. Self-cleaning (clears the banner)."""
import os
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://shinobi-combat-zone.preview.emergentagent.com"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@shinobi.com", "password": "admin123"}, timeout=20)
    assert r.status_code == 200, r.text
    return s


def _catalog_banner():
    return requests.get(f"{BASE_URL}/api/game/catalog", timeout=15).json().get("banner")


def test_banner_set_reject_and_clear(admin_client):
    try:
        # Reject base-rarity hero (blaze is R)
        r = admin_client.post(f"{BASE_URL}/api/admin/banner", json={"template_id": "blaze"}, timeout=15)
        assert r.status_code == 400

        # Unknown hero -> 404
        r = admin_client.post(f"{BASE_URL}/api/admin/banner", json={"template_id": "nope_xyz"}, timeout=15)
        assert r.status_code == 404

        # Feature an SSR hero (gale)
        r = admin_client.post(f"{BASE_URL}/api/admin/banner", json={"template_id": "gale"}, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()["banner"]
        assert b["template_id"] == "gale" and b["rarity"] == "SSR"
        assert 0 < b["rate_up_chance"] <= 1

        # Public catalog reflects the banner
        cb = _catalog_banner()
        assert cb and cb["template_id"] == "gale"
    finally:
        admin_client.delete(f"{BASE_URL}/api/admin/banner", timeout=15)
    assert _catalog_banner() is None


def test_banner_requires_admin():
    anon = requests.Session()
    assert anon.post(f"{BASE_URL}/api/admin/banner", json={"template_id": "gale"}, timeout=15).status_code == 401
