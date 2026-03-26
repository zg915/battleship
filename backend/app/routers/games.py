from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import (
    CreateGameRequest,
    CreateGameResponse,
    FireRequest,
    JoinGameRequest,
    JoinGameResponse,
    PlacementRequest,
)
from ..services import game_service
from ..services.ws_manager import notify_game_state

router = APIRouter(prefix="/games", tags=["games"])


@router.get("")
async def get_recent_games(db: AsyncSession = Depends(get_db)):
    return await game_service.get_recent_games(db)


@router.get("/waiting")
async def get_waiting_games(db: AsyncSession = Depends(get_db)):
    return await game_service.get_waiting_games(db)


@router.post("", response_model=CreateGameResponse)
async def create_game(req: CreateGameRequest, db: AsyncSession = Depends(get_db)):
    if req.mode not in ("ai", "human"):
        raise HTTPException(400, "mode must be 'ai' or 'human'")
    result = await game_service.create_game(db, req.mode, req.display_name)
    return result


@router.post("/{game_id}/join", response_model=JoinGameResponse)
async def join_game(game_id: str, req: JoinGameRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await game_service.join_game(db, game_id, req.display_name)
        # Notify player 1 via WebSocket that someone joined
        await notify_game_state(game_id)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{game_id}/state")
async def get_state(game_id: str, token: str, db: AsyncSession = Depends(get_db)):
    try:
        return await game_service.get_game_state(db, game_id, token)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{game_id}/placement")
async def submit_placement(game_id: str, req: PlacementRequest, db: AsyncSession = Depends(get_db)):
    try:
        ships_data = [{"type": s.type, "cells": s.cells} for s in req.ships]
        return await game_service.submit_placement(db, game_id, req.token, ships_data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{game_id}/fire")
async def fire(game_id: str, req: FireRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await game_service.fire(db, game_id, req.token, req.row, req.col)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{game_id}/replay")
async def get_replay(game_id: str, db: AsyncSession = Depends(get_db)):
    try:
        return await game_service.get_replay(db, game_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
