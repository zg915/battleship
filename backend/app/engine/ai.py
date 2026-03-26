from __future__ import annotations

import random

from .types import BOARD_SIZE, GameState


def generate_ai_move(state: GameState, ai_id: str) -> tuple[int, int]:
    """Generate an AI move using hunt/target strategy.

    Hunt mode: fire at random unfired cells with parity optimization.
    Target mode: probe adjacent cells after a hit on an unsunk ship.
    """
    #TODO: in target mode, we need more clever since ships are all one direction
    ai_player = state.players[ai_id]
    opponent_id = _get_opponent_id(state, ai_id)
    opponent = state.players[opponent_id]

    fired = ai_player.shots_fired

    # Target mode: find hits on unsunk ships and probe neighbors
    targets = _get_target_cells(opponent, fired)
    if targets:
        return random.choice(targets)

    # Hunt mode: parity-based random selection
    # Only target cells where (row + col) % 2 == 0 (checkerboard pattern)
    # This is optimal since the smallest ship is length 2
    candidates = []
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            if (r, c) not in fired and (r + c) % 2 == 0:
                candidates.append((r, c))

    # If all parity cells exhausted, use remaining cells
    if not candidates:
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if (r, c) not in fired:
                    candidates.append((r, c))

    if not candidates:
        raise ValueError("No valid moves remaining")

    return random.choice(candidates)


def generate_ai_placement(ships_config: dict[str, int]) -> list[dict]:
    """Generate a random valid ship placement for the AI.

    Returns list of {type, cells} dicts.
    """
    occupied: set[tuple[int, int]] = set()
    placements = []

    for ship_type, length in ships_config.items():
        for _ in range(200):  # max attempts
            horizontal = random.choice([True, False])
            if horizontal:
                r = random.randint(0, BOARD_SIZE - 1)
                c = random.randint(0, BOARD_SIZE - length)
                cells = [(r, c + i) for i in range(length)]
            else:
                r = random.randint(0, BOARD_SIZE - length)
                c = random.randint(0, BOARD_SIZE - 1)
                cells = [(r + i, c) for i in range(length)]

            if not any(cell in occupied for cell in cells):
                occupied.update(cells)
                placements.append({"type": ship_type, "cells": cells})
                break
        else:
            #TODO: we do not want failed placement
            raise RuntimeError(f"Failed to place {ship_type} after 200 attempts")

    return placements


def _get_target_cells(
    opponent, fired: set[tuple[int, int]]
) -> list[tuple[int, int]]:
    """Find cells adjacent to hits on unsunk ships."""
    targets = []

    for ship in opponent.ships:
        if ship.is_sunk:
            continue
        # Find hits on this ship
        hits_on_ship = [cell for cell in ship.hits]
        if not hits_on_ship:
            continue

        # If multiple hits, infer direction and extend in that direction
        if len(hits_on_ship) >= 2:
            rows = [r for r, c in hits_on_ship]
            cols = [c for r, c in hits_on_ship]

            if len(set(rows)) == 1:
                # Horizontal — extend left and right
                r = rows[0]
                min_c, max_c = min(cols), max(cols)
                candidates = [(r, min_c - 1), (r, max_c + 1)]
            else:
                # Vertical — extend up and down
                c = cols[0]
                min_r, max_r = min(rows), max(rows)
                candidates = [(min_r - 1, c), (max_r + 1, c)]

            for cell in candidates:
                if _is_valid_target(cell, fired):
                    targets.append(cell)
        else:
            # Single hit — try all 4 neighbors
            r, c = hits_on_ship[0]
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                cell = (r + dr, c + dc)
                if _is_valid_target(cell, fired):
                    targets.append(cell)

    return targets


def _is_valid_target(
    cell: tuple[int, int], fired: set[tuple[int, int]]
) -> bool:
    r, c = cell
    return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and cell not in fired


def _get_opponent_id(state: GameState, player_id: str) -> str:
    ids = list(state.players.keys())
    return ids[1] if ids[0] == player_id else ids[0]
