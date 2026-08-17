"""Unit tests for level-gated squad capacity."""
import game_data as gd


def test_max_team_size_thresholds():
    assert gd.max_team_size(1) == 3
    assert gd.max_team_size(9) == 3
    assert gd.max_team_size(10) == 4
    assert gd.max_team_size(19) == 4
    assert gd.max_team_size(20) == 5
    assert gd.max_team_size(99) == 5  # capped at 5


def test_next_slot_level():
    assert gd.next_slot_level(1) == 10
    assert gd.next_slot_level(9) == 10
    assert gd.next_slot_level(10) == 20
    assert gd.next_slot_level(19) == 20
    assert gd.next_slot_level(20) is None
    assert gd.next_slot_level(50) is None
