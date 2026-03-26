"use client";

import { useState, useCallback, useEffect } from "react";
import { BOARD_SIZE, SHIP_DEFINITIONS, SHIP_ORDER } from "@/lib/constants";
import type { ShipPlacement } from "@/lib/types";
import Board from "./Board";

interface ShipPlacerProps {
  onSubmit: (ships: ShipPlacement[]) => void;
  disabled?: boolean;
}

export default function ShipPlacer({ onSubmit, disabled }: ShipPlacerProps) {
  const [placedShips, setPlacedShips] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  const currentShipType = currentShipIndex < SHIP_ORDER.length ? SHIP_ORDER[currentShipIndex] : null;
  const currentShipLength = currentShipType ? SHIP_DEFINITIONS[currentShipType] : 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setHorizontal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPreviewCells = useCallback(
    (row: number, col: number): [number, number][] => {
      if (!currentShipType) return [];
      const cells: [number, number][] = [];
      for (let i = 0; i < currentShipLength; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        cells.push([r, c]);
      }
      return cells;
    },
    [currentShipType, currentShipLength, horizontal]
  );

  const isValidPlacement = useCallback(
    (cells: [number, number][]): boolean => {
      const occupiedCells = new Set<string>();
      for (const ship of placedShips) {
        for (const [r, c] of ship.cells) {
          occupiedCells.add(`${r},${c}`);
        }
      }
      for (const [r, c] of cells) {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
        if (occupiedCells.has(`${r},${c}`)) return false;
      }
      return true;
    },
    [placedShips]
  );

  const handleCellClick = (row: number, col: number) => {
    if (!currentShipType || disabled) return;
    const cells = getPreviewCells(row, col);
    if (!isValidPlacement(cells)) return;

    const newPlacement: ShipPlacement = { type: currentShipType, cells };
    const updated = [...placedShips, newPlacement];
    setPlacedShips(updated);
    setCurrentShipIndex(currentShipIndex + 1);
    setHoverCell(null);
  };

  const handleUndo = () => {
    if (placedShips.length === 0) return;
    setPlacedShips(placedShips.slice(0, -1));
    setCurrentShipIndex(currentShipIndex - 1);
  };

  const handleSubmit = () => {
    if (placedShips.length === SHIP_ORDER.length) {
      onSubmit(placedShips);
    }
  };

  // Build ships for board display
  const boardShips = placedShips.map((s) => ({
    type: s.type,
    cells: s.cells,
    hits: [] as [number, number][],
    is_sunk: false,
  }));

  const previewCells = hoverCell ? getPreviewCells(hoverCell[0], hoverCell[1]) : undefined;
  const previewValid = previewCells ? isValidPlacement(previewCells) : false;

  const allPlaced = placedShips.length === SHIP_ORDER.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg font-semibold text-slate-200">
        {allPlaced
          ? "All ships placed! Click Submit."
          : `Place your ${currentShipType} (${currentShipLength} cells)`}
      </div>

      <div className="flex gap-4 items-center text-sm text-slate-400">
        <span>
          Orientation: <strong className="text-slate-200">{horizontal ? "Horizontal" : "Vertical"}</strong>
        </span>
        <button
          onClick={() => setHorizontal(!horizontal)}
          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-200"
        >
          Rotate (R)
        </button>
      </div>

      <div
        onMouseLeave={() => setHoverCell(null)}
      >
        <Board
          label="Your Board"
          ships={boardShips}
          shotsReceived={[]}
          previewCells={previewCells}
          previewValid={previewValid}
          onClick={allPlaced ? undefined : (r, c) => {
            handleCellClick(r, c);
          }}
          disabled={allPlaced || disabled}
        />
        {/* Invisible overlay to track hover */}
        {!allPlaced && (
          <div
            className="relative -mt-[320px] ml-8"
            style={{ width: `${BOARD_SIZE * 32}px`, height: `${BOARD_SIZE * 32}px` }}
          >
            {Array.from({ length: BOARD_SIZE }, (_, row) =>
              Array.from({ length: BOARD_SIZE }, (_, col) => (
                <div
                  key={`${row},${col}`}
                  className="absolute"
                  style={{
                    top: `${row * 32}px`,
                    left: `${col * 32}px`,
                    width: "32px",
                    height: "32px",
                  }}
                  onMouseEnter={() => setHoverCell([row, col])}
                  onClick={() => handleCellClick(row, col)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <span className="text-sm text-slate-400">
          Ships: {SHIP_ORDER.map((s, i) => (
            <span key={s} className={i < placedShips.length ? "text-green-400" : "text-slate-600"}>
              {" "}{s}
            </span>
          ))}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleUndo}
          disabled={placedShips.length === 0 || disabled}
          className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40 text-slate-200"
        >
          Undo
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allPlaced || disabled}
          className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-40 font-semibold text-white"
        >
          Submit Placement
        </button>
      </div>
    </div>
  );
}
