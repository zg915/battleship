"use client";

import type { GameState, PlayerInfo } from "@/lib/types";

interface GameStatusProps {
  state: GameState;
}

export default function GameStatus({ state }: GameStatusProps) {
  const myPlayer = state.players.find((p) => p.player_id === state.my_player_id);
  const opponent = state.players.find((p) => p.player_id !== state.my_player_id && p.seat !== "ai");
  const isMyTurn = state.current_turn === state.my_player_id;

  if (state.phase === "waiting") {
    return (
      <div className="text-center p-4">
        <div className="text-xl font-semibold font-heading text-accent">Waiting for opponent to join...</div>
        <div className="text-sm text-foreground/70 mt-2">
          Share the game URL with your opponent
        </div>
      </div>
    );
  }

  if (state.phase === "placement") {
    const readyPlayers = state.players.filter((p) => p.ready && p.seat !== "ai");
    return (
      <div className="text-center p-4">
        <div className="text-xl font-semibold font-heading text-secondary">Ship Placement Phase</div>
        <div className="text-sm text-foreground/60 mt-1">
          {readyPlayers.length}/{state.players.filter((p) => p.seat !== "ai").length} players ready
        </div>
      </div>
    );
  }

  if (state.phase === "finished") {
    const isWinner = state.winner === state.my_player_id;
    return (
      <div className="text-center p-4">
        <div className={`text-2xl font-bold font-heading ${isWinner ? "text-tertiary" : "text-error"}`}>
          {isWinner ? "Victory!" : "Defeat!"}
        </div>
        <div className="text-sm text-foreground/60 mt-1">
          {isWinner ? "You sank all enemy ships!" : "Your fleet has been destroyed."}
        </div>
      </div>
    );
  }

  // Active phase
  return (
    <div className="text-center p-4">
      <div className={`text-xl font-semibold font-heading ${isMyTurn ? "text-tertiary" : "text-accent"}`}>
        {isMyTurn ? "Your Turn — Fire!" : "Opponent's Turn..."}
      </div>
      <div className="text-sm text-foreground/60 mt-1">
        {myPlayer?.display_name} vs {opponent?.display_name || "AI"}
      </div>
    </div>
  );
}
