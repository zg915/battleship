"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { getReplay } from "@/lib/api";
import Board from "@/components/Board";
import ReplayControls from "@/components/ReplayControls";
import type { ReplayData, ShipView, ShotResult, SunkShip } from "@/lib/types";

interface ReplayBoardState {
  ships: ShipView[];
  shotsReceived: [number, number][];
  shotsFired: ShotResult[];
  sunkShips: SunkShip[];
}

function buildReplayState(
  data: ReplayData,
  upToStep: number
): Record<string, ReplayBoardState> {
  const states: Record<string, ReplayBoardState> = {};

  // Initialize from boards
  for (const [playerId, ships] of Object.entries(data.initial_boards)) {
    states[playerId] = {
      ships: ships.map((s) => ({
        type: s.type,
        cells: s.cells,
        hits: [],
        is_sunk: false,
      })),
      shotsReceived: [],
      shotsFired: [],
      sunkShips: [],
    };
  }

  // Apply moves up to step
  const playerIds = Object.keys(states);
  for (let i = 0; i < upToStep && i < data.moves.length; i++) {
    const move = data.moves[i];
    const attackerId = move.attacker_id;
    const defenderId = playerIds.find((id) => id !== attackerId)!;

    const attacker = states[attackerId];
    const defender = states[defenderId];

    if (!attacker || !defender) continue;

    // Record shot on defender
    defender.shotsReceived.push([move.row, move.col]);

    // Record fired shot for attacker
    const isHit = move.result === "hit" || move.result === "sunk";
    attacker.shotsFired.push({
      row: move.row,
      col: move.col,
      result: isHit ? "hit" : "miss",
      sunk_ship: move.sunk_ship || null,
    });

    // Apply hit to ship
    if (isHit) {
      for (const ship of defender.ships) {
        const cellMatch = ship.cells.find(
          ([r, c]) => r === move.row && c === move.col
        );
        if (cellMatch) {
          ship.hits.push([move.row, move.col]);
          if (move.result === "sunk") {
            ship.is_sunk = true;
            attacker.sunkShips.push({
              type: ship.type,
              cells: ship.cells,
            });
          }
          break;
        }
      }
    }
  }

  return states;
}

export default function ReplayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [data, setData] = useState<ReplayData | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getReplay(gameId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [gameId]);

  // Auto-play
  useEffect(() => {
    if (playing && data) {
      intervalRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= data.moves.length) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, data]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading replay...</div>
      </main>
    );
  }

  const playerIds = Object.keys(data.initial_boards);
  const states = buildReplayState(data, step);
  const currentMove = step > 0 ? data.moves[step - 1] : null;

  // Build move description
  let moveDesc = "";
  if (currentMove) {
    const attackerName =
      data.players.find((p) => p.player_id === currentMove.attacker_id)?.display_name || "?";
    const cell = `${String.fromCharCode(65 + currentMove.col)}${currentMove.row + 1}`;
    moveDesc = `${attackerName} fires at ${cell}: ${currentMove.result}`;
    if (currentMove.sunk_ship) {
      moveDesc += ` — Sunk ${currentMove.sunk_ship}!`;
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center p-6 gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          &larr; Home
        </button>
        <h1 className="text-2xl font-bold">Replay</h1>
      </div>

      {/* Player names */}
      <div className="flex gap-8 text-sm text-slate-400">
        {data.players.map((p) => (
          <span key={p.player_id} className={p.player_id === data.winner ? "text-green-400 font-semibold" : ""}>
            {p.display_name} {p.player_id === data.winner ? "(Winner)" : ""}
          </span>
        ))}
      </div>

      {/* Boards */}
      <div className="flex flex-wrap justify-center gap-8">
        {playerIds.map((pid) => {
          const playerName = data.players.find((p) => p.player_id === pid)?.display_name || "Player";
          const st = states[pid];
          if (!st) return null;
          return (
            <Board
              key={pid}
              label={`${playerName}'s Board`}
              ships={st.ships}
              shotsReceived={st.shotsReceived}
            />
          );
        })}
      </div>

      {/* Move description */}
      {moveDesc && (
        <div className="text-sm text-yellow-300 min-h-[1.5rem]">{moveDesc}</div>
      )}

      {/* Controls */}
      <ReplayControls
        step={step}
        totalSteps={data.moves.length}
        onStepChange={(s) => {
          setStep(s);
          setPlaying(false);
        }}
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
      />
    </main>
  );
}
