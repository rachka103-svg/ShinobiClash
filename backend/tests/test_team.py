"""Unit tests for level-gated squad capacity."""
import game_data as gd


def test_max_team_size_thresholds():
    assert gd.max_team_size(1) == 3
    assert gd.max_team_size(99) == 3
    assert gd.max_team_size(100) == 4
    assert gd.max_team_size(199) == 4
    assert gd.max_team_size(200) == 5
    assert gd.max_team_size(500) == 5  # capped at 5


def test_next_slot_level():
    assert gd.next_slot_level(1) == 100
    assert gd.next_slot_level(99) == 100
    assert gd.next_slot_level(100) == 200
    assert gd.next_slot_level(199) == 200
    assert gd.next_slot_level(200) is None
    assert gd.next_slot_level(500) is None
