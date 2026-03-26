from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from ..database import async_session
from ..models import Player
from ..services import game_service
from ..services.ws_manager import manager, notify_game_state

router = APIRouter()


@router.websocket("/ws/games/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, token: str):
    """WebSocket endpoint for real-time multiplayer games."""
    # Authenticate
    async with async_session() as db:
        result = await db.execute(
            select(Player).where(Player.player_token == token)
        )
        player = result.scalar_one_or_none()
        if player is None or str(player.game_id) != game_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        player_id = str(player.id)

    await manager.connect(game_id, player_id, websocket)

    try:
        # Send initial state
        async with async_session() as db:
            state = await game_service.get_game_state(db, game_id, token)
            await websocket.send_json({"type": "game_update", "state": state})

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "fire":
                await _handle_fire(game_id, token, player_id, data)
            elif msg_type == "placement":
                await _handle_placement(game_id, token, player_id, data)

    except WebSocketDisconnect:
        manager.disconnect(game_id, player_id)
    except Exception:
        manager.disconnect(game_id, player_id)


async def _handle_fire(game_id: str, token: str, player_id: str, data: dict):
    row = data.get("row")
    col = data.get("col")

    async with async_session() as db:
        try:
            await game_service.fire(db, game_id, token, row, col)
        except ValueError as e:
            await manager.send_to_player(
                game_id, player_id, {"type": "error", "message": str(e)}
            )
            return

    # Notify all players with fresh state from a new session
    await notify_game_state(game_id)


async def _handle_placement(game_id: str, token: str, player_id: str, data: dict):
    ships = data.get("ships", [])
    ships_data = [{"type": s["type"], "cells": s["cells"]} for s in ships]

    async with async_session() as db:
        try:
            await game_service.submit_placement(db, game_id, token, ships_data)
        except ValueError as e:
            await manager.send_to_player(
                game_id, player_id, {"type": "error", "message": str(e)}
            )
            return

    # Notify all players with fresh state
    await notify_game_state(game_id)
