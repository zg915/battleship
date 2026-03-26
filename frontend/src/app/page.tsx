"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGame, getRecentGames, getWaitingGames, joinGame } from "@/lib/api";
import type { GameListItem } from "@/lib/types";

type View = "menu" | "replays";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("menu");
  const [finishedGames, setFinishedGames] = useState<GameListItem[]>([]);
  const [waitingGames, setWaitingGames] = useState<GameListItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("battleship_name");
    if (saved) setName(saved);

    getWaitingGames().then(setWaitingGames).catch(() => {});
  }, []);

  const saveName = (n: string) => {
    setName(n);
    localStorage.setItem("battleship_name", n);
  };

  const handleCreate = async (mode: "ai" | "human") => {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createGame(mode, name.trim());
      localStorage.setItem(`game_${res.game_id}_token`, res.player_token);
      localStorage.setItem(`game_${res.game_id}_player_id`, res.player_id);
      localStorage.setItem(`game_${res.game_id}_mode`, mode);
      router.push(`/game/${res.game_id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (gameId: string) => {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await joinGame(gameId, name.trim());
      localStorage.setItem(`game_${gameId}_token`, res.player_token);
      localStorage.setItem(`game_${gameId}_player_id`, res.player_id);
      localStorage.setItem(`game_${gameId}_mode`, "human");
      router.push(`/game/${gameId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openReplays = () => {
    setView("replays");
    getRecentGames().then(setFinishedGames).catch(() => {});
  };

  if (view === "replays") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <h1 className="text-5xl font-bold tracking-tight">Battleship</h1>

        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-300">Finished Games</h2>
            <button
              onClick={() => setView("menu")}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              &larr; Back
            </button>
          </div>

          {finishedGames.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No finished games yet.</p>
          ) : (
            <div className="space-y-2">
              {finishedGames.map((g) => (
                <div
                  key={g.game_id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
                >
                  <div className="text-sm">
                    <span className="text-slate-300">
                      {g.players.map((p) => p.display_name).join(" vs ")}
                    </span>
                    <span className="text-slate-500 mx-2">&middot;</span>
                    <span className="text-slate-500">{g.mode.toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/replay/${g.game_id}`)}
                    className="px-4 py-1 bg-blue-600 rounded hover:bg-blue-500 text-sm font-semibold"
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <h1 className="text-5xl font-bold tracking-tight">Battleship</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {/* Three main buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleCreate("ai")}
            disabled={loading}
            className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 font-semibold text-lg"
          >
            vs AI
          </button>
          <button
            onClick={() => handleCreate("human")}
            disabled={loading}
            className="w-full py-3 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-40 font-semibold text-lg"
          >
            vs Human
          </button>
          <button
            onClick={openReplays}
            className="w-full py-3 bg-slate-700 rounded-lg hover:bg-slate-600 font-semibold text-lg"
          >
            Watch Replay
          </button>
        </div>

        {/* Waiting games */}
        {waitingGames.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Open Games</h2>
            <div className="space-y-2">
              {waitingGames.map((g) => (
                <div
                  key={g.game_id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
                >
                  <div>
                    <span className="text-slate-200">
                      {g.players[0]?.display_name || "Player"}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">waiting...</span>
                  </div>
                  <button
                    onClick={() => handleJoin(g.game_id)}
                    disabled={loading}
                    className="px-4 py-1 bg-green-600 rounded hover:bg-green-500 disabled:opacity-40 text-sm font-semibold"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
