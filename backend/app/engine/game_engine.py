from __future__ import annotations

from .types import (
    BOARD_SIZE,
    SHIP_DEFINITIONS,
    GameState,
    MoveResult,
    PlayerState,
    Ship,
)


def validate_placement(ships: list[Ship]) -> tuple[bool, str]:
    """Validate that ship placement follows all rules.

    Returns (is_valid, error_message).
    """
    # Check correct number and types of ships
    type_counts: dict[str, int] = {}
    for ship in ships:
        type_counts[ship.type] = type_counts.get(ship.type, 0) + 1

    if set(type_counts.keys()) != set(SHIP_DEFINITIONS.keys()):
        return False, "Must place exactly one of each ship type"

    for ship_type, count in type_counts.items():
        if count != 1:
            return False, f"Duplicate ship type: {ship_type}"

    all_cells: set[tuple[int, int]] = set()

    for ship in ships:
        expected_length = SHIP_DEFINITIONS.get(ship.type)
        if expected_length is None:
            return False, f"Unknown ship type: {ship.type}"

        # Check length
        if len(ship.cells) != expected_length:
            return False, f"{ship.type} must have {expected_length} cells, got {len(ship.cells)}"

        # Check bounds
        for r, c in ship.cells:
            if not (0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE):
                return False, f"Cell ({r}, {c}) is out of bounds"

        # Check straight line (all same row or all same column)
        rows = {r for r, c in ship.cells}
        cols = {c for r, c in ship.cells}

        if len(rows) == 1:
            # Horizontal ship — columns must be contiguous
            sorted_cols = sorted(cols)
            if sorted_cols != list(range(sorted_cols[0], sorted_cols[0] + len(sorted_cols))):
                return False, f"{ship.type} cells are not contiguous"
        elif len(cols) == 1:
            # Vertical ship — rows must be contiguous
            sorted_rows = sorted(rows)
            if sorted_rows != list(range(sorted_rows[0], sorted_rows[0] + len(sorted_rows))):
                return False, f"{ship.type} cells are not contiguous"
        else:
            return False, f"{ship.type} is not in a straight line"

        # Check overlap
        for cell in ship.cells:
            if cell in all_cells:
                return False, f"Overlapping cell at ({cell[0]}, {cell[1]})"
            all_cells.add(cell)

    return True, ""


def apply_move(
    state: GameState, attacker_id: str, row: int, col: int
) -> MoveResult:
    """Apply a move and return the result. Mutates state in place."""
    if state.phase != "active":
        raise ValueError(f"Game is not active (phase={state.phase})")

    if state.current_turn != attacker_id:
        raise ValueError("Not your turn")

    if not (0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE):
        raise ValueError(f"Cell ({row}, {col}) is out of bounds")

    attacker = state.players[attacker_id]
    if (row, col) in attacker.shots_fired:
        raise ValueError(f"Already fired at ({row}, {col})")

    # Find defender
    defender_id = _get_opponent_id(state, attacker_id)
    defender = state.players[defender_id]

    # Record the shot
    attacker.shots_fired.add((row, col))
    defender.shots_received.add((row, col))

    # Check hit
    hit_ship: Ship | None = None
    for ship in defender.ships:
        if (row, col) in ship.cells:
            hit_ship = ship
            break

    if hit_ship is None:
        # Miss — switch turns
        result = MoveResult(
            result="miss",
            row=row,
            col=col,
            next_turn=defender_id,
        )
        state.current_turn = defender_id
        return result

    # Hit
    hit_ship.hits.append((row, col))

    if hit_ship.is_sunk:
        # Check win
        winner = check_win(state)
        if winner:
            state.phase = "finished"
            state.winner = winner
            state.current_turn = None
            return MoveResult(
                result="sunk",
                row=row,
                col=col,
                sunk_ship=hit_ship.type,
                winner=winner,
            )
        # Sunk but game continues
        state.current_turn = defender_id
        return MoveResult(
            result="sunk",
            row=row,
            col=col,
            sunk_ship=hit_ship.type,
            next_turn=defender_id,
        )

    # Hit but not sunk — switch turns
    state.current_turn = defender_id
    return MoveResult(
        result="hit",
        row=row,
        col=col,
        next_turn=defender_id,
    )


def check_win(state: GameState) -> str | None:
    """Check if any player has won (all opponent ships sunk)."""
    for player_id, player in state.players.items():
        opponent_id = _get_opponent_id(state, player_id)
        opponent = state.players[opponent_id]
        if all(ship.is_sunk for ship in opponent.ships):
            return player_id
    return None


def get_player_view(state: GameState, player_id: str) -> dict:
    """Get the game state visible to a specific player.

    Own board: full info (ships + incoming shots).
    Opponent board: only shots fired by this player + results.
    """
    player = state.players[player_id]
    opponent_id = _get_opponent_id(state, player_id)
    opponent = state.players[opponent_id]

    # Own board: show ships and where opponent has shot
    own_ships = []
    for ship in player.ships:
        own_ships.append({
            "type": ship.type,
            "cells": ship.cells,
            "hits": ship.hits,
            "is_sunk": ship.is_sunk,
        })

    # Opponent board: only show what we've fired and results
    opponent_grid: list[dict] = []
    for r, c in player.shots_fired:
        hit = False
        sunk_ship_type = None
        for ship in opponent.ships:
            if (r, c) in ship.cells:
                hit = True
                if ship.is_sunk:
                    sunk_ship_type = ship.type
                break
        opponent_grid.append({
            "row": r,
            "col": c,
            "result": "hit" if hit else "miss",
            "sunk_ship": sunk_ship_type,
        })

    # Reveal sunk ship cells on opponent board
    opponent_sunk_ships = []
    for ship in opponent.ships:
        if ship.is_sunk:
            opponent_sunk_ships.append({
                "type": ship.type,
                "cells": ship.cells,
            })

    return {
        "phase": state.phase,
        "current_turn": state.current_turn,
        "winner": state.winner,
        "my_board": {
            "ships": own_ships,
            "shots_received": [list(s) for s in player.shots_received],
        },
        "opponent_board": {
            "shots": opponent_grid,
            "sunk_ships": opponent_sunk_ships,
        },
    }


def _get_opponent_id(state: GameState, player_id: str) -> str:
    ids = list(state.players.keys())
    if len(ids) != 2:
        raise ValueError("Game must have exactly 2 players")
    return ids[1] if ids[0] == player_id else ids[0]
