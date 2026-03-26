import pytest

from app.engine.ai import generate_ai_move, generate_ai_placement
from app.engine.game_engine import (
    apply_move,
    check_win,
    get_player_view,
    validate_placement,
)
from app.engine.types import SHIP_DEFINITIONS, GameState, PlayerState, Ship


def _make_ship(ship_type: str, start_row: int, start_col: int, horizontal: bool = True) -> Ship:
    length = SHIP_DEFINITIONS[ship_type]
    if horizontal:
        cells = [(start_row, start_col + i) for i in range(length)]
    else:
        cells = [(start_row + i, start_col) for i in range(length)]
    return Ship(type=ship_type, cells=cells)


def _make_standard_ships() -> list[Ship]:
    """Create a valid standard placement."""
    return [
        _make_ship("carrier", 0, 0),       # 5 cells: (0,0)-(0,4)
        _make_ship("battleship", 1, 0),     # 4 cells: (1,0)-(1,3)
        _make_ship("cruiser", 2, 0),        # 3 cells: (2,0)-(2,2)
        _make_ship("submarine", 3, 0),      # 3 cells: (3,0)-(3,2)
        _make_ship("destroyer", 4, 0),      # 2 cells: (4,0)-(4,1)
    ]


def _make_game_state(p1_id="p1", p2_id="p2") -> GameState:
    """Create an active game with standard ship placements."""
    p1_ships = _make_standard_ships()
    p2_ships = _make_standard_ships()
    return GameState(
        phase="active",
        current_turn=p1_id,
        players={
            p1_id: PlayerState(player_id=p1_id, ships=p1_ships),
            p2_id: PlayerState(player_id=p2_id, ships=p2_ships),
        },
    )


# --- validate_placement tests ---

class TestValidatePlacement:
    def test_valid_placement(self):
        ships = _make_standard_ships()
        valid, msg = validate_placement(ships)
        assert valid is True
        assert msg == ""

    def test_missing_ship(self):
        ships = _make_standard_ships()[:4]  # missing destroyer
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "exactly one of each" in msg.lower() or "ship type" in msg.lower()

    def test_duplicate_ship(self):
        ships = _make_standard_ships()
        ships.append(_make_ship("carrier", 5, 0))
        valid, msg = validate_placement(ships)
        assert valid is False

    def test_wrong_length(self):
        ships = _make_standard_ships()
        ships[0] = Ship(type="carrier", cells=[(0, 0), (0, 1), (0, 2)])  # 3 instead of 5
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "5 cells" in msg

    def test_out_of_bounds(self):
        ships = _make_standard_ships()
        ships[4] = _make_ship("destroyer", 0, 9)  # (0,9) and (0,10) — out of bounds
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "out of bounds" in msg.lower()

    def test_not_straight_line(self):
        ships = _make_standard_ships()
        ships[4] = Ship(type="destroyer", cells=[(5, 0), (6, 1)])  # diagonal
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "straight line" in msg.lower()

    def test_not_contiguous(self):
        ships = _make_standard_ships()
        ships[4] = Ship(type="destroyer", cells=[(5, 0), (5, 2)])  # gap
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "contiguous" in msg.lower()

    def test_overlapping_ships(self):
        ships = [
            _make_ship("carrier", 0, 0),
            _make_ship("battleship", 0, 0),  # overlaps carrier
            _make_ship("cruiser", 2, 0),
            _make_ship("submarine", 3, 0),
            _make_ship("destroyer", 4, 0),
        ]
        valid, msg = validate_placement(ships)
        assert valid is False
        assert "overlapping" in msg.lower()

    def test_vertical_placement(self):
        ships = [
            _make_ship("carrier", 0, 0, horizontal=False),
            _make_ship("battleship", 0, 1, horizontal=False),
            _make_ship("cruiser", 0, 2, horizontal=False),
            _make_ship("submarine", 0, 3, horizontal=False),
            _make_ship("destroyer", 0, 4, horizontal=False),
        ]
        valid, msg = validate_placement(ships)
        assert valid is True


# --- apply_move tests ---

class TestApplyMove:
    def test_miss(self):
        state = _make_game_state()
        result = apply_move(state, "p1", 9, 9)
        assert result.result == "miss"
        assert result.next_turn == "p2"
        assert state.current_turn == "p2"

    def test_hit(self):
        state = _make_game_state()
        result = apply_move(state, "p1", 0, 0)  # p2's carrier at (0,0)
        assert result.result == "hit"
        assert result.next_turn == "p2"

    def test_sunk(self):
        state = _make_game_state()
        # Sink p2's destroyer (2 cells at (4,0) and (4,1))
        apply_move(state, "p1", 4, 0)
        state.current_turn = "p1"  # force turn back for testing
        result = apply_move(state, "p1", 4, 1)
        assert result.result == "sunk"
        assert result.sunk_ship == "destroyer"

    def test_win(self):
        state = _make_game_state()
        # Sink all of p2's ships
        p2 = state.players["p2"]
        all_cells = []
        for ship in p2.ships:
            all_cells.extend(ship.cells)

        for r, c in all_cells[:-1]:
            apply_move(state, "p1", r, c)
            state.current_turn = "p1"

        last_r, last_c = all_cells[-1]
        result = apply_move(state, "p1", last_r, last_c)
        assert result.winner == "p1"
        assert state.phase == "finished"

    def test_wrong_turn(self):
        state = _make_game_state()
        with pytest.raises(ValueError, match="Not your turn"):
            apply_move(state, "p2", 0, 0)

    def test_duplicate_shot(self):
        state = _make_game_state()
        apply_move(state, "p1", 5, 5)
        state.current_turn = "p1"
        with pytest.raises(ValueError, match="Already fired"):
            apply_move(state, "p1", 5, 5)

    def test_out_of_bounds(self):
        state = _make_game_state()
        with pytest.raises(ValueError, match="out of bounds"):
            apply_move(state, "p1", 10, 0)

    def test_not_active(self):
        state = _make_game_state()
        state.phase = "placement"
        with pytest.raises(ValueError, match="not active"):
            apply_move(state, "p1", 0, 0)


# --- check_win tests ---

class TestCheckWin:
    def test_no_winner(self):
        state = _make_game_state()
        assert check_win(state) is None

    def test_winner_found(self):
        state = _make_game_state()
        # Sink all of p2's ships
        for ship in state.players["p2"].ships:
            ship.hits = list(ship.cells)
        assert check_win(state) == "p1"


# --- get_player_view tests ---

class TestGetPlayerView:
    def test_own_ships_visible(self):
        state = _make_game_state()
        view = get_player_view(state, "p1")
        assert len(view["my_board"]["ships"]) == 5
        assert view["my_board"]["ships"][0]["type"] == "carrier"

    def test_opponent_ships_hidden(self):
        state = _make_game_state()
        view = get_player_view(state, "p1")
        # No ship cells should be visible on opponent board before firing
        assert view["opponent_board"]["shots"] == []
        assert view["opponent_board"]["sunk_ships"] == []

    def test_fired_shots_visible(self):
        state = _make_game_state()
        apply_move(state, "p1", 0, 0)  # hit
        state.current_turn = "p1"
        apply_move(state, "p1", 9, 9)  # miss

        view = get_player_view(state, "p1")
        shots = view["opponent_board"]["shots"]
        assert len(shots) == 2

        hit_shot = next(s for s in shots if s["row"] == 0 and s["col"] == 0)
        miss_shot = next(s for s in shots if s["row"] == 9 and s["col"] == 9)
        assert hit_shot["result"] == "hit"
        assert miss_shot["result"] == "miss"

    def test_sunk_ships_revealed(self):
        state = _make_game_state()
        # Sink p2's destroyer
        apply_move(state, "p1", 4, 0)
        state.current_turn = "p1"
        apply_move(state, "p1", 4, 1)

        view = get_player_view(state, "p1")
        assert len(view["opponent_board"]["sunk_ships"]) == 1
        assert view["opponent_board"]["sunk_ships"][0]["type"] == "destroyer"


# --- AI tests ---

class TestAI:
    def test_ai_move_valid(self):
        state = _make_game_state()
        row, col = generate_ai_move(state, "p1")
        assert 0 <= row < 10
        assert 0 <= col < 10

    def test_ai_move_not_duplicate(self):
        state = _make_game_state()
        # Fire at many cells
        for r in range(10):
            for c in range(10):
                if (r + c) % 2 == 0 and len(state.players["p1"].shots_fired) < 49:
                    state.players["p1"].shots_fired.add((r, c))

        row, col = generate_ai_move(state, "p1")
        assert (row, col) not in state.players["p1"].shots_fired

    def test_ai_targets_after_hit(self):
        state = _make_game_state()
        # Simulate a hit on p2's carrier at (0,0)
        state.players["p1"].shots_fired.add((0, 0))
        state.players["p2"].ships[0].hits.append((0, 0))

        row, col = generate_ai_move(state, "p1")
        # Should target adjacent to (0,0)
        assert (row, col) in [(0, 1), (1, 0)]

    def test_ai_placement_valid(self):
        placement = generate_ai_placement(SHIP_DEFINITIONS)
        assert len(placement) == 5
        ships = [Ship(type=p["type"], cells=p["cells"]) for p in placement]
        valid, msg = validate_placement(ships)
        assert valid is True, msg
