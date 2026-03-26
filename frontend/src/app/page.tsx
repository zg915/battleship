"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGame, getRecentGames } from "@/lib/api";
import type { GameListItem } from "@/lib/types";

type View = "menu" | "replays";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("menu");
  const [finishedGames, setFinishedGames] = useState<GameListItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("battleship_name");
    if (saved) setName(saved);
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

  const openReplays = () => {
    setView("replays");
    getRecentGames().then(setFinishedGames).catch(() => {});
  };

  if (view === "replays") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <h1 className="text-5xl font-bold font-heading tracking-tight text-foreground">Battleship</h1>

        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-heading text-foreground">Finished Games</h2>
            <button
              onClick={() => setView("menu")}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              &larr; Back
            </button>
          </div>

          {finishedGames.length === 0 ? (
            <p className="text-foreground/50 text-center py-8">No finished games yet.</p>
          ) : (
            <div className="space-y-2">
              {finishedGames.map((g) => (
                <div
                  key={g.game_id}
                  className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm"
                >
                  <div className="text-sm">
                    <span className="text-foreground">
                      {g.players.map((p) => p.display_name).join(" vs ")}
                    </span>
                    <span className="text-foreground/40 mx-2">&middot;</span>
                    <span className="text-foreground/50">{g.mode.toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/replay/${g.game_id}`)}
                    className="px-4 py-1.5 bg-accent rounded-md hover:bg-accent-hover text-sm font-semibold text-white transition-colors"
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
      <h1 className="text-5xl font-bold font-heading tracking-tight text-foreground">Battleship</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-sm text-foreground/60 mb-1 font-heading">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        {error && <div className="text-error text-sm">{error}</div>}

        {/* Three main buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleCreate("ai")}
            disabled={loading}
            className="w-full py-3 bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-40 font-semibold font-heading text-lg text-white shadow-sm transition-colors"
          >
            vs AI
          </button>
          <button
            onClick={() => handleCreate("human")}
            disabled={loading}
            className="w-full py-3 bg-tertiary rounded-lg hover:bg-tertiary-hover disabled:opacity-40 font-semibold font-heading text-lg text-white shadow-sm transition-colors"
          >
            vs Human
          </button>
          <button
            onClick={openReplays}
            className="w-full py-3 bg-card-dark rounded-lg hover:bg-[#2a2a29] font-semibold font-heading text-lg text-white shadow-sm transition-colors"
          >
            Watch Replay
          </button>
        </div>
      </div>
    </main>
  );
}
