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
  // Last shot highlight
  lastShot?: [number, number] | null;
  // Drag-and-drop
  onCellDragOver?: (e: React.DragEvent, row: number, col: number) => void;
  onCellDrop?: (e: React.DragEvent, row: number, col: number) => void;
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
  lastShot,
  onCellDragOver,
  onCellDrop,
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

  const lastShotKey = lastShot ? `${lastShot[0]},${lastShot[1]}` : null;

  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  const rowLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String(i + 1));

  function getCellStyle(row: number, col: number): string {
    const key = `${row},${col}`;
    const isLastShot = key === lastShotKey;
    const base = "w-10 h-10 rounded-sm transition-colors duration-100 border-2 "
      + (isLastShot ? "border-foreground " : "border-border ");

    // Preview cells (ship placement)
    if (previewSet.has(key)) {
      return base + (previewValid ? "bg-preview-valid" : "bg-preview-invalid");
    }

    // Own board
    if (ships) {
      const ship = shipCellMap.get(key);
      const wasHit = receivedSet.has(key);

      if (ship && wasHit) {
        return base + (ship.is_sunk ? "bg-sunk" : "bg-hit");
      }
      if (wasHit) {
        return base + "bg-miss"; // miss on our board
      }
      if (ship) {
        return base + "bg-ship"; // ship, not hit
      }
      return base + "bg-water"; // water
    }

    // Opponent board
    if (shots) {
      const shot = shotMap.get(key);
      if (shot) {
        if (sunkCellSet.has(key)) {
          return base + "bg-sunk"; // sunk
        }
        if (shot.result === "hit") {
          return base + "bg-hit"; // hit
        }
        return base + "bg-miss"; // miss
      }
    }

    // Empty water
    return base + (onClick && !disabled ? "bg-water hover:bg-water-hover cursor-pointer" : "bg-water");
  }

  function getCellContent(row: number, col: number): string {
    const key = `${row},${col}`;

    if (ships) {
      const wasHit = receivedSet.has(key);
      const ship = shipCellMap.get(key);
      if (wasHit && ship) return "\u2715";
      if (wasHit) return "\u2022";
    }

    if (shots) {
      const shot = shotMap.get(key);
      if (shot) {
        return shot.result === "hit" ? "\u2715" : "\u2022";
      }
    }

    return "";
  }

  return (
    <div className="inline-block">
      <div className="text-base font-semibold font-heading text-center mb-1.5 text-foreground">{label}</div>
      <div className="inline-grid" style={{ gridTemplateColumns: `2.5rem repeat(${BOARD_SIZE}, 2.5rem)` }}>
        {/* Corner */}
        <div className="w-10 h-10" />
        {/* Column headers */}
        {colLabels.map((l) => (
          <div key={l} className="w-10 h-10 flex items-center justify-center text-sm text-foreground/50 font-mono">
            {l}
          </div>
        ))}

        {/* Rows */}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} className="contents">
            <div className="w-10 h-10 flex items-center justify-center text-sm text-foreground/50 font-mono">
              {rowLabels[row]}
            </div>
            {Array.from({ length: BOARD_SIZE }, (_, col) => (
              <div
                key={col}
                className={getCellStyle(row, col)}
                onClick={() => onClick && !disabled && onClick(row, col)}
                onDragOver={onCellDragOver ? (e) => onCellDragOver(e, row, col) : undefined}
                onDrop={onCellDrop ? (e) => onCellDrop(e, row, col) : undefined}
              >
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]">
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
