import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Game(Base):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mode: Mapped[str] = mapped_column(Text, nullable=False)  # 'ai' | 'human'
    status: Mapped[str] = mapped_column(Text, nullable=False, default="waiting")  # waiting | placement | active | finished
    current_turn_player_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    winner_player_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    players: Mapped[list["Player"]] = relationship("Player", back_populates="game", cascade="all, delete-orphan")
    moves: Mapped[list["Move"]] = relationship("Move", back_populates="game", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    seat: Mapped[str] = mapped_column(Text, nullable=False)  # 'player1' | 'player2' | 'ai'
    player_token: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False, default="Player")
    ready: Mapped[bool] = mapped_column(Boolean, default=False)
    board: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ships placement as JSON

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    game: Mapped["Game"] = relationship("Game", back_populates="players")


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    attacker_player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    row: Mapped[int] = mapped_column(Integer, nullable=False)
    col: Mapped[int] = mapped_column(Integer, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)  # 'hit' | 'miss' | 'sunk'
    sunk_ship: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    game: Mapped["Game"] = relationship("Game", back_populates="moves")
