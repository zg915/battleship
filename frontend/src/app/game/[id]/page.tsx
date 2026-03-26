"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { joinGame } from "@/lib/api";
import { useGameState } from "@/hooks/useGameState";
import Board from "@/components/Board";
import ShipPlacer from "@/components/ShipPlacer";
import GameStatus from "@/components/GameStatus";
import ShipTracker from "@/components/ShipTracker";
import type { ShipPlacement, ShipView } from "@/lib/types";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState("ai");
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(`game_${gameId}_token`);
    const m = localStorage.getItem(`game_${gameId}_mode`) || "human";
    const savedName = localStorage.getItem("battleship_name") || "";
    setToken(t);
    setMode(m);
    setJoinName(savedName);
    setInitialized(true);
  }, [gameId]);

  const handleJoin = async () => {
    const name = joinName.trim() || "Player";
    setJoining(true);
    setJoinError(null);
    try {
      localStorage.setItem("battleship_name", name);
      const res = await joinGame(gameId, name);
      localStorage.setItem(`game_${gameId}_token`, res.player_token);
      localStorage.setItem(`game_${gameId}_player_id`, res.player_id);
      localStorage.setItem(`game_${gameId}_mode`, "human");
      setToken(res.player_token);
      setMode("human");
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  };

  const { state, loading, error, lastMessage, myLastShot, opponentLastShot, fire, placeShips, refreshState } =
    useGameState({ gameId, token: token || "", mode });

  if (!initialized) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-foreground/60 text-lg font-heading">Loading...</div>
      </main>
    );
  }

  // No token — show join screen with name entry
  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-bold font-heading text-foreground">Battleship</h1>
          <p className="text-foreground/60">You've been invited to a game!</p>

          <div className="text-left">
            <label className="block text-sm text-foreground/60 mb-1 font-heading">Your Name</label>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          {joinError && <div className="text-error text-sm">{joinError}</div>}

          <button
            onClick={handleJoin}
            disabled={joining || !joinName.trim()}
            className="w-full py-3 bg-tertiary rounded-lg hover:bg-tertiary-hover disabled:opacity-40 font-semibold font-heading text-lg text-white shadow-sm transition-colors"
          >
            {joining ? "Joining..." : "Join & Play"}
          </button>
        </div>
      </main>
    );
  }

  if (loading || !state) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-foreground/60 text-lg font-heading">Loading game...</div>
      </main>
    );
  }

  const handlePlacement = async (ships: ShipPlacement[]) => {
    await placeShips(ships);
    setReady(true);
  };

  const handleFire = (row: number, col: number) => {
    if (state.phase !== "active") return;
    if (state.current_turn !== state.my_player_id) return;
    fire(row, col);
  };

  const isMyTurn = state.current_turn === state.my_player_id;

  return (
    <main className="flex-1 flex flex-col items-center p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          &larr; Home
        </button>
        <h1 className="text-2xl font-bold font-heading text-foreground">Battleship</h1>
        {mode === "human" && (
          <div className="text-xs text-foreground/60 font-mono">
            Game ID: {gameId}
          </div>
        )}
      </div>

      {/* Game status — fixed height to prevent layout shift */}
      <div className="min-h-[4.5rem] flex flex-col items-center justify-center">
        <GameStatus state={state} />
        {error && <div className="text-error text-sm">{error}</div>}
        <div className={`text-accent text-sm font-medium ${lastMessage ? "visible" : "invisible"}`}>
          {lastMessage || "\u00A0"}
        </div>
      </div>

      {/* Waiting phase */}
      {state.phase === "waiting" && (
        <div className="text-center space-y-4">
          <p className="text-foreground/70">
            Share this link with your opponent:
          </p>
          <code className="block bg-card-dark p-3 rounded-lg text-sm text-secondary select-all border border-border">
            {typeof window !== "undefined" ? window.location.href : ""}
          </code>
        </div>
      )}

      {/* Placement phase */}
      {state.phase === "placement" && !state.my_board?.ships?.length && !ready && (
        <ShipPlacer onSubmit={handlePlacement} />
      )}

      {state.phase === "placement" && (state.my_board?.ships?.length || ready) && (
        <div className="text-center">
          <p className="text-tertiary mb-4 font-heading font-semibold">Ships placed! Waiting for opponent...</p>
          {state.my_board && (
            <Board
              label="Your Board"
              ships={state.my_board.ships as ShipView[]}
              shotsReceived={state.my_board.shots_received}
            />
          )}
        </div>
      )}

      {/* Active / Finished phase — show both boards */}
      {(state.phase === "active" || state.phase === "finished") && (
        <div className="flex flex-wrap justify-center gap-8">
          {/* My board */}
          {state.my_board && (
            <Board
              label="Your Board"
              ships={state.my_board.ships as ShipView[]}
              shotsReceived={state.my_board.shots_received}
              lastShot={opponentLastShot}
            />
          )}

          {/* Opponent board + ship tracker */}
          {state.opponent_board && (
            <div className="flex gap-4 items-start">
              <Board
                label="Opponent Board"
                shots={state.opponent_board.shots}
                sunkShips={state.opponent_board.sunk_ships}
                onClick={handleFire}
                disabled={!isMyTurn || state.phase === "finished"}
                lastShot={myLastShot}
              />
              <ShipTracker sunkShips={state.opponent_board.sunk_ships} />
            </div>
          )}
        </div>
      )}

      {/* Finished — action buttons */}
      {state.phase === "finished" && (
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-card-dark rounded-lg hover:bg-[#2a2a29] text-white font-heading font-medium shadow-sm transition-colors"
          >
            New Game
          </button>
          <button
            onClick={() => router.push(`/replay/${gameId}`)}
            className="px-6 py-2.5 bg-accent rounded-lg hover:bg-accent-hover text-white font-heading font-medium shadow-sm transition-colors"
          >
            Watch Replay
          </button>
        </div>
      )}
    </main>
  );
}
