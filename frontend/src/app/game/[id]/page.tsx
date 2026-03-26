"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { joinGame } from "@/lib/api";
import { useGameState } from "@/hooks/useGameState";
import Board from "@/components/Board";
import ShipPlacer from "@/components/ShipPlacer";
import GameStatus from "@/components/GameStatus";
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

  const { state, loading, error, lastMessage, fire, placeShips, refreshState } =
    useGameState({ gameId, token: token || "", mode });

  if (!initialized) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </main>
    );
  }

  // No token — show join screen with name entry
  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-4xl font-bold">Battleship</h1>
          <p className="text-slate-400">You've been invited to a game!</p>

          <div className="text-left">
            <label className="block text-sm text-slate-400 mb-1">Your Name</label>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {joinError && <div className="text-red-400 text-sm">{joinError}</div>}

          <button
            onClick={handleJoin}
            disabled={joining || !joinName.trim()}
            className="w-full py-3 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-40 font-semibold text-lg"
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
        <div className="text-slate-400 text-lg">Loading game...</div>
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
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          &larr; Home
        </button>
        <h1 className="text-2xl font-bold">Battleship</h1>
        {mode === "human" && (
          <div className="text-xs text-slate-500">
            Game ID: {gameId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Game status */}
      <GameStatus state={state} />

      {error && <div className="text-red-400 text-sm">{error}</div>}
      {lastMessage && <div className="text-yellow-300 text-sm">{lastMessage}</div>}

      {/* Waiting phase */}
      {state.phase === "waiting" && (
        <div className="text-center space-y-4">
          <p className="text-slate-400">
            Share this link with your opponent:
          </p>
          <code className="block bg-slate-800 p-3 rounded text-sm text-blue-400 select-all">
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
          <p className="text-green-400 mb-4">Ships placed! Waiting for opponent...</p>
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
            />
          )}

          {/* Opponent board */}
          {state.opponent_board && (
            <Board
              label="Opponent Board"
              shots={state.opponent_board.shots}
              sunkShips={state.opponent_board.sunk_ships}
              onClick={handleFire}
              disabled={!isMyTurn || state.phase === "finished"}
            />
          )}
        </div>
      )}

      {/* Finished — action buttons */}
      {state.phase === "finished" && (
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-slate-700 rounded hover:bg-slate-600"
          >
            New Game
          </button>
          <button
            onClick={() => router.push(`/replay/${gameId}`)}
            className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            Watch Replay
          </button>
        </div>
      )}
    </main>
  );
}
