from __future__ import annotations

import json

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections per game room."""

    def __init__(self):
        # game_id -> {player_id: websocket}
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, game_id: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.rooms:
            self.rooms[game_id] = {}
        self.rooms[game_id][player_id] = websocket

    def disconnect(self, game_id: str, player_id: str):
        if game_id in self.rooms:
            self.rooms[game_id].pop(player_id, None)
            if not self.rooms[game_id]:
                del self.rooms[game_id]

    async def send_to_player(self, game_id: str, player_id: str, data: dict):
        room = self.rooms.get(game_id)
        if room:
            ws = room.get(player_id)
            if ws:
                await ws.send_json(data)

    async def broadcast_to_game(self, game_id: str, data: dict):
        room = self.rooms.get(game_id)
        if room:
            for ws in room.values():
                await ws.send_json(data)

    async def send_state_to_each(
        self, game_id: str, get_state_fn
    ):
        """Send personalized state to each player in a game room."""
        room = self.rooms.get(game_id)
        if not room:
            return
        for player_id, ws in room.items():
            state = await get_state_fn(player_id)
            await ws.send_json({"type": "game_update", "state": state})


manager = ConnectionManager()


async def notify_game_state(game_id: str):
    """Send personalized game state to all connected players in a game room.

    Opens a fresh DB session so it can be called from REST endpoints.
    """
    room = manager.rooms.get(game_id)
    if not room:
        return

    from ..database import async_session
    from ..models import Player
    from . import game_service
    from sqlalchemy import select

    async with async_session() as db:
        for player_id, ws in list(room.items()):
            try:
                result = await db.execute(
                    select(Player).where(Player.id == player_id)
                )
                player = result.scalar_one_or_none()
                if player:
                    state = await game_service.get_game_state(db, game_id, player.player_token)
                    await ws.send_json({"type": "game_update", "state": state})
            except Exception:
                pass
