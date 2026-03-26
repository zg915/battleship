from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

BOARD_SIZE = 10

SHIP_DEFINITIONS: dict[str, int] = {
    "carrier": 5,
    "battleship": 4,
    "cruiser": 3,
    "submarine": 3,
    "destroyer": 2,
}


@dataclass
class Ship:
    type: str
    cells: list[tuple[int, int]]
    hits: list[tuple[int, int]] = field(default_factory=list)

    @property
    def is_sunk(self) -> bool:
        return set(self.hits) == set(self.cells)


@dataclass
class PlayerState:
    player_id: str
    ships: list[Ship] = field(default_factory=list)
    shots_received: set[tuple[int, int]] = field(default_factory=set)
    shots_fired: set[tuple[int, int]] = field(default_factory=set)


@dataclass
class GameState:
    phase: Literal["placement", "active", "finished"]
    players: dict[str, PlayerState]
    current_turn: str | None = None
    winner: str | None = None


@dataclass
class MoveResult:
    result: Literal["hit", "miss", "sunk"]
    row: int
    col: int
    sunk_ship: str | None = None
    winner: str | None = None
    next_turn: str | None = None
