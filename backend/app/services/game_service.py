from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..engine.ai import generate_ai_move, generate_ai_placement
from ..engine.game_engine import apply_move, get_player_view, validate_placement
from ..engine.types import SHIP_DEFINITIONS, GameState, MoveResult, PlayerState, Ship
from ..models import Game, Move, Player


async def create_game(db: AsyncSession, mode: str, display_name: str) -> dict:
    """Create a new game and the first player."""
    game = Game(mode=mode, status="placement" if mode == "ai" else "waiting")
    db.add(game)
    await db.flush()

    player_token = str(uuid.uuid4())
    player1 = Player(
        game_id=game.id,
        seat="player1",
        player_token=player_token,
        display_name=display_name,
    )
    db.add(player1)

    if mode == "ai":
        ai_placement = generate_ai_placement(SHIP_DEFINITIONS)
        ai_token = str(uuid.uuid4())
        ai_player = Player(
            game_id=game.id,
            seat="ai",
            player_token=ai_token,
            display_name="AI",
            ready=True,
            board=ai_placement,
        )
        db.add(ai_player)

    await db.commit()
    await db.refresh(game)
    await db.refresh(player1)

    return {
        "game_id": str(game.id),
        "player_token": player_token,
        "player_id": str(player1.id),
    }


async def join_game(db: AsyncSession, game_id: str, display_name: str) -> dict:
    """Join an existing game as player2."""
    game = await _get_game_with_players(db, game_id)
    if game is None:
        raise ValueError("Game not found")
    if game.mode != "human":
        raise ValueError("Cannot join AI game")
    if game.status != "waiting":
        raise ValueError("Game is not accepting players")
    if len(game.players) >= 2:
        raise ValueError("Game is full")

    player_token = str(uuid.uuid4())
    player2 = Player(
        game_id=game.id,
        seat="player2",
        player_token=player_token,
        display_name=display_name,
    )
    db.add(player2)
    game.status = "placement"
    await db.commit()
    await db.refresh(player2)

    return {
        "player_token": player_token,
        "player_id": str(player2.id),
    }


async def submit_placement(
    db: AsyncSession, game_id: str, token: str, ships_data: list[dict]
) -> dict:
    """Submit ship placement for a player."""
    game = await _get_game_with_players(db, game_id)
    if game is None:
        raise ValueError("Game not found")

    player = _find_player_by_token(game, token)
    if player is None:
        raise ValueError("Invalid token")

    if player.ready:
        raise ValueError("Already placed ships")

    if game.status != "placement":
        raise ValueError("Game is not in placement phase")

    ships = []
    for s in ships_data:
        cells = [tuple(c) for c in s["cells"]]
        ships.append(Ship(type=s["type"], cells=cells))

    valid, msg = validate_placement(ships)
    if not valid:
        raise ValueError(f"Invalid placement: {msg}")

    player.board = ships_data
    player.ready = True

    all_ready = all(p.ready for p in game.players)
    if all_ready:
        game.status = "active"
        p1 = next(p for p in game.players if p.seat == "player1")
        game.current_turn_player_id = p1.id

    await db.commit()

    return {"ready": True, "game_started": all_ready}


async def get_game_state(db: AsyncSession, game_id: str, token: str) -> dict:
    """Get the current game state from the player's perspective."""
    game = await _get_game_with_players(db, game_id)
    if game is None:
        raise ValueError("Game not found")

    player = _find_player_by_token(game, token)
    if player is None:
        raise ValueError("Invalid token")

    if game.status in ("waiting", "placement"):
        players_info = [
            {
                "player_id": str(p.id),
                "display_name": p.display_name,
                "seat": p.seat,
                "ready": p.ready,
            }
            for p in game.players
            if p.seat != "ai"
        ]
        own_board = None
        if player.board:
            own_board = {"ships": player.board, "shots_received": []}

        return {
            "game_id": str(game.id),
            "mode": game.mode,
            "phase": game.status,
            "current_turn": None,
            "winner": None,
            "my_player_id": str(player.id),
            "my_board": own_board,
            "opponent_board": None,
            "players": players_info,
        }

    # Build engine state from DB moves
    engine_state = await _build_engine_state(db, game)
    return _build_state_response(game, engine_state, player)


async def fire(
    db: AsyncSession, game_id: str, token: str, row: int, col: int
) -> dict:
    """Process a fire action. For AI mode, also generates AI response."""
    game = await _get_game_with_players(db, game_id)
    if game is None:
        raise ValueError("Game not found")

    player = _find_player_by_token(game, token)
    if player is None:
        raise ValueError("Invalid token")

    if game.status != "active":
        raise ValueError("Game is not active")

    if game.current_turn_player_id != player.id:
        raise ValueError("Not your turn")

    # Build engine state from committed moves
    engine_state = await _build_engine_state(db, game)

    # Apply the player's move
    result = apply_move(engine_state, str(player.id), row, col)

    move_count = await _count_moves(db, game.id)
    turn_number = move_count + 1

    move = Move(
        game_id=game.id,
        turn_number=turn_number,
        attacker_player_id=player.id,
        row=row,
        col=col,
        result=result.result,
        sunk_ship=result.sunk_ship,
    )
    db.add(move)

    # Update game state in DB
    if result.winner:
        game.status = "finished"
        game.winner_player_id = player.id
        game.finished_at = datetime.now(timezone.utc)
        game.current_turn_player_id = None
    else:
        game.current_turn_player_id = uuid.UUID(result.next_turn)

    await db.flush()

    # AI response if it's AI's turn and game isn't finished
    ai_move_result = None
    if game.mode == "ai" and game.status == "active":
        ai_player = next((p for p in game.players if p.seat == "ai"), None)
        if ai_player and game.current_turn_player_id == ai_player.id:
            ai_move_result = await _execute_ai_turn(db, game, engine_state, ai_player)

    # Commit all moves (player + AI) to DB
    await db.commit()

    # Build response from the in-memory engine state (already has all moves applied)
    state_response = _build_state_response(game, engine_state, player)

    return {
        "result": result.result,
        "row": row,
        "col": col,
        "sunk_ship": result.sunk_ship,
        "winner": str(result.winner) if result.winner else (
            str(ai_move_result.winner) if ai_move_result and ai_move_result.winner else None
        ),
        "game_state": state_response,
    }


async def get_replay(db: AsyncSession, game_id: str) -> dict:
    """Get replay data for a finished game."""
    game = await _get_game_with_players(db, game_id)
    if game is None:
        raise ValueError("Game not found")

    result = await db.execute(
        select(Move).where(Move.game_id == game.id).order_by(Move.turn_number)
    )
    moves = result.scalars().all()

    players_info = [
        {
            "player_id": str(p.id),
            "display_name": p.display_name,
            "seat": p.seat,
            "ready": p.ready,
        }
        for p in game.players
    ]

    initial_boards = {}
    for p in game.players:
        if p.board:
            initial_boards[str(p.id)] = p.board

    return {
        "game_id": str(game.id),
        "mode": game.mode,
        "players": players_info,
        "initial_boards": initial_boards,
        "moves": [
            {
                "turn_number": m.turn_number,
                "attacker_id": str(m.attacker_player_id),
                "row": m.row,
                "col": m.col,
                "result": m.result,
                "sunk_ship": m.sunk_ship,
            }
            for m in moves
        ],
        "winner": str(game.winner_player_id) if game.winner_player_id else None,
    }


async def get_recent_games(db: AsyncSession) -> list[dict]:
    """Get list of finished games (for replay)."""
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.players))
        .where(Game.status == "finished")
        .order_by(Game.finished_at.desc())
        .limit(20)
    )
    games = result.scalars().all()

    items = []
    for g in games:
        items.append({
            "game_id": str(g.id),
            "mode": g.mode,
            "status": g.status,
            "created_at": g.created_at.isoformat(),
            "players": [
                {
                    "player_id": str(p.id),
                    "display_name": p.display_name,
                    "seat": p.seat,
                    "ready": p.ready,
                }
                for p in g.players
                if p.seat != "ai"
            ],
            "winner": str(g.winner_player_id) if g.winner_player_id else None,
        })
    return items


async def get_waiting_games(db: AsyncSession) -> list[dict]:
    """Get games waiting for a second player."""
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.players))
        .where(Game.status == "waiting", Game.mode == "human")
        .order_by(Game.created_at.desc())
        .limit(10)
    )
    games = result.scalars().all()

    return [
        {
            "game_id": str(g.id),
            "mode": g.mode,
            "status": g.status,
            "created_at": g.created_at.isoformat(),
            "players": [
                {
                    "player_id": str(p.id),
                    "display_name": p.display_name,
                    "seat": p.seat,
                    "ready": p.ready,
                }
                for p in g.players
            ],
        }
        for g in games
    ]


# --- Internal helpers ---

async def _get_game_with_players(db: AsyncSession, game_id: str) -> Game | None:
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.players))
        .where(Game.id == uuid.UUID(game_id))
    )
    return result.scalar_one_or_none()


def _find_player_by_token(game: Game, token: str) -> Player | None:
    for p in game.players:
        if p.player_token == token:
            return p
    return None


def _build_state_response(game: Game, engine_state: GameState, player: Player) -> dict:
    """Build the API response from in-memory engine state."""
    view = get_player_view(engine_state, str(player.id))

    players_info = [
        {
            "player_id": str(p.id),
            "display_name": p.display_name,
            "seat": p.seat,
            "ready": p.ready,
        }
        for p in game.players
    ]

    return {
        "game_id": str(game.id),
        "mode": game.mode,
        "phase": view["phase"],
        "current_turn": str(view["current_turn"]) if view["current_turn"] else None,
        "winner": str(view["winner"]) if view["winner"] else None,
        "my_player_id": str(player.id),
        "my_board": view["my_board"],
        "opponent_board": view["opponent_board"],
        "players": players_info,
    }


async def _build_engine_state(db: AsyncSession, game: Game) -> GameState:
    """Reconstruct engine GameState from DB."""
    result = await db.execute(
        select(Move).where(Move.game_id == game.id).order_by(Move.turn_number)
    )
    moves = result.scalars().all()

    players: dict[str, PlayerState] = {}
    for p in game.players:
        ships = []
        if p.board:
            for s in p.board:
                cells = [tuple(c) for c in s["cells"]]
                ships.append(Ship(type=s["type"], cells=cells))
        players[str(p.id)] = PlayerState(player_id=str(p.id), ships=ships)

    player_ids = list(players.keys())
    for m in moves:
        attacker_id = str(m.attacker_player_id)
        defender_id = player_ids[1] if player_ids[0] == attacker_id else player_ids[0]
        attacker = players[attacker_id]
        defender = players[defender_id]

        attacker.shots_fired.add((m.row, m.col))
        defender.shots_received.add((m.row, m.col))

        for ship in defender.ships:
            if (m.row, m.col) in ship.cells:
                ship.hits.append((m.row, m.col))
                break

    phase = game.status if game.status in ("active", "finished") else game.status
    current_turn = str(game.current_turn_player_id) if game.current_turn_player_id else None
    winner = str(game.winner_player_id) if game.winner_player_id else None

    return GameState(
        phase=phase,
        players=players,
        current_turn=current_turn,
        winner=winner,
    )


async def _count_moves(db: AsyncSession, game_id: uuid.UUID) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).select_from(Move).where(Move.game_id == game_id)
    )
    return result.scalar_one()


async def _execute_ai_turn(
    db: AsyncSession, game: Game, engine_state: GameState, ai_player: Player
) -> MoveResult:
    """Execute the AI's turn."""
    ai_id = str(ai_player.id)
    row, col = generate_ai_move(engine_state, ai_id)
    result = apply_move(engine_state, ai_id, row, col)

    move_count = await _count_moves(db, game.id)
    move = Move(
        game_id=game.id,
        turn_number=move_count + 1,
        attacker_player_id=ai_player.id,
        row=row,
        col=col,
        result=result.result,
        sunk_ship=result.sunk_ship,
    )
    db.add(move)

    if result.winner:
        game.status = "finished"
        game.winner_player_id = ai_player.id
        game.finished_at = datetime.now(timezone.utc)
        game.current_turn_player_id = None
    else:
        game.current_turn_player_id = uuid.UUID(result.next_turn)

    await db.flush()
    return result
