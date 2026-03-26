"use client";

import { BOARD_SIZE } from "@/lib/constants";
import type { ShipView, ShotResult, SunkShip } from "@/lib/types";

interface BoardProps {
  // For own board
  ships?: ShipView[];
  shotsReceived?: [number, number][];
  // For opponent board
  shots?: ShotResult[];
  sunkShips?: SunkShip[];
  // Interaction
  onClick?: (row: number, col: number) => void;
  disabled?: boolean;
  label: string;
  // Placement preview
  previewCells?: [number, number][];
  previewValid?: boolean;
}

export default function Board({
  ships,
  shotsReceived,
  shots,
  sunkShips,
  onClick,
  disabled,
  label,
  previewCells,
  previewValid,
}: BoardProps) {
  // Build cell lookup maps
  const shipCellMap = new Map<string, ShipView>();
  if (ships) {
    for (const ship of ships) {
      for (const [r, c] of ship.cells) {
        shipCellMap.set(`${r},${c}`, ship);
      }
    }
  }

  const shotMap = new Map<string, ShotResult>();
  if (shots) {
    for (const shot of shots) {
      shotMap.set(`${shot.row},${shot.col}`, shot);
    }
  }

  const receivedSet = new Set<string>();
  if (shotsReceived) {
    for (const [r, c] of shotsReceived) {
      receivedSet.add(`${r},${c}`);
    }
  }

  const sunkCellSet = new Set<string>();
  if (sunkShips) {
    for (const ship of sunkShips) {
      for (const [r, c] of ship.cells) {
        sunkCellSet.add(`${r},${c}`);
      }
    }
  }

  const previewSet = new Set<string>();
  if (previewCells) {
    for (const [r, c] of previewCells) {
      previewSet.add(`${r},${c}`);
    }
  }

  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  const rowLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String(i + 1));

  function getCellStyle(row: number, col: number): string {
    const key = `${row},${col}`;
    const base = "w-8 h-8 border border-slate-600 transition-colors duration-100 ";

    // Preview cells (ship placement)
    if (previewSet.has(key)) {
      return base + (previewValid ? "bg-green-400/60" : "bg-red-400/60");
    }

    // Own board
    if (ships) {
      const ship = shipCellMap.get(key);
      const wasHit = receivedSet.has(key);

      if (ship && wasHit) {
        return base + (ship.is_sunk ? "bg-red-800" : "bg-red-500");
      }
      if (wasHit) {
        return base + "bg-blue-300"; // miss on our board
      }
      if (ship) {
        return base + "bg-slate-400"; // ship, not hit
      }
      return base + "bg-sky-900/40"; // water
    }

    // Opponent board
    if (shots) {
      const shot = shotMap.get(key);
      if (shot) {
        if (sunkCellSet.has(key)) {
          return base + "bg-red-800"; // sunk
        }
        if (shot.result === "hit") {
          return base + "bg-red-500"; // hit
        }
        return base + "bg-blue-300"; // miss
      }
    }

    // Empty water
    return base + (onClick && !disabled ? "bg-sky-900/40 hover:bg-sky-700/60 cursor-pointer" : "bg-sky-900/40");
  }

  function getCellContent(row: number, col: number): string {
    const key = `${row},${col}`;

    if (ships) {
      const wasHit = receivedSet.has(key);
      const ship = shipCellMap.get(key);
      if (wasHit && ship) return "✕";
      if (wasHit) return "•";
    }

    if (shots) {
      const shot = shotMap.get(key);
      if (shot) {
        return shot.result === "hit" ? "✕" : "•";
      }
    }

    return "";
  }

  return (
    <div className="inline-block">
      <div className="text-sm font-semibold text-center mb-1 text-slate-300">{label}</div>
      <div className="inline-grid" style={{ gridTemplateColumns: `2rem repeat(${BOARD_SIZE}, 2rem)` }}>
        {/* Corner */}
        <div className="w-8 h-8" />
        {/* Column headers */}
        {colLabels.map((l) => (
          <div key={l} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 font-mono">
            {l}
          </div>
        ))}

        {/* Rows */}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} className="contents">
            <div className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 font-mono">
              {rowLabels[row]}
            </div>
            {Array.from({ length: BOARD_SIZE }, (_, col) => (
              <div
                key={col}
                className={getCellStyle(row, col)}
                onClick={() => onClick && !disabled && onClick(row, col)}
              >
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                  {getCellContent(row, col)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
