from __future__ import annotations

from pydantic import BaseModel


# --- Request schemas ---

class CreateGameRequest(BaseModel):
    mode: str  # 'ai' | 'human'
    display_name: str = "Player"


class JoinGameRequest(BaseModel):
    display_name: str = "Player"


class PlacementRequest(BaseModel):
    token: str
    ships: list[ShipPlacement]


class ShipPlacement(BaseModel):
    type: str
    cells: list[list[int]]  # [[row, col], ...]


class FireRequest(BaseModel):
    token: str
    row: int
    col: int


# --- Response schemas ---

class CreateGameResponse(BaseModel):
    game_id: str
    player_token: str
    player_id: str


class JoinGameResponse(BaseModel):
    player_token: str
    player_id: str


class GameStateResponse(BaseModel):
    game_id: str
    mode: str
    phase: str
    current_turn: str | None
    winner: str | None
    my_player_id: str
    my_board: dict | None
    opponent_board: dict | None
    players: list[PlayerInfo]


class PlayerInfo(BaseModel):
    player_id: str
    display_name: str
    seat: str
    ready: bool


class MoveResponse(BaseModel):
    result: str  # 'hit' | 'miss' | 'sunk'
    row: int
    col: int
    sunk_ship: str | None = None
    winner: str | None = None
    game_state: GameStateResponse


class ReplayResponse(BaseModel):
    game_id: str
    mode: str
    players: list[PlayerInfo]
    initial_boards: dict  # player_id -> ships
    moves: list[ReplayMove]
    winner: str | None


class ReplayMove(BaseModel):
    turn_number: int
    attacker_id: str
    row: int
    col: int
    result: str
    sunk_ship: str | None = None


class GameListItem(BaseModel):
    game_id: str
    mode: str
    status: str
    created_at: str
    players: list[PlayerInfo]
    winner: str | None = None


# Fix forward references
PlacementRequest.model_rebuild()
