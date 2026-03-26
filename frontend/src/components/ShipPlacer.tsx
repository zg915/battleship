"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BOARD_SIZE, SHIP_DEFINITIONS, SHIP_ORDER } from "@/lib/constants";
import type { ShipPlacement } from "@/lib/types";
import Board from "./Board";

interface ShipPlacerProps {
  onSubmit: (ships: ShipPlacement[]) => void;
  disabled?: boolean;
}

export default function ShipPlacer({ onSubmit, disabled }: ShipPlacerProps) {
  const [placedShips, setPlacedShips] = useState<ShipPlacement[]>([]);
  const [selectedShip, setSelectedShip] = useState<string | null>(null);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const dragShipRef = useRef<string | null>(null);

  const placedTypes = new Set(placedShips.map((s) => s.type));
  const allPlaced = placedShips.length === SHIP_ORDER.length;

  // Auto-select first unplaced ship
  useEffect(() => {
    if (!selectedShip || placedTypes.has(selectedShip)) {
      const next = SHIP_ORDER.find((s) => !placedTypes.has(s));
      setSelectedShip(next || null);
    }
  }, [placedShips, selectedShip, placedTypes]);

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
    (row: number, col: number, shipType: string | null): [number, number][] => {
      if (!shipType) return [];
      const length = SHIP_DEFINITIONS[shipType];
      if (!length) return [];
      const cells: [number, number][] = [];
      for (let i = 0; i < length; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        cells.push([r, c]);
      }
      return cells;
    },
    [horizontal]
  );

  const isValidPlacement = useCallback(
    (cells: [number, number][], excludeType?: string): boolean => {
      const occupiedCells = new Set<string>();
      for (const ship of placedShips) {
        if (excludeType && ship.type === excludeType) continue;
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

  const placeShip = (shipType: string, row: number, col: number) => {
    if (disabled) return;
    const cells = getPreviewCells(row, col, shipType);
    if (!isValidPlacement(cells)) return;

    const newPlacement: ShipPlacement = { type: shipType, cells };
    setPlacedShips((prev) => [...prev.filter((s) => s.type !== shipType), newPlacement]);
    setHoverCell(null);
  };

  const removeShip = (shipType: string) => {
    setPlacedShips((prev) => prev.filter((s) => s.type !== shipType));
    setSelectedShip(shipType);
  };

  const handleBoardClick = (row: number, col: number) => {
    if (allPlaced || disabled) return;

    // Check if clicking on a placed ship to remove it
    const clickedShip = placedShips.find((s) =>
      s.cells.some(([r, c]) => r === row && c === col)
    );
    if (clickedShip) {
      removeShip(clickedShip.type);
      return;
    }

    // Place the selected ship
    if (selectedShip && !placedTypes.has(selectedShip)) {
      placeShip(selectedShip, row, col);
    }
  };

  const handleUndo = () => {
    if (placedShips.length === 0) return;
    const last = placedShips[placedShips.length - 1];
    setPlacedShips(placedShips.slice(0, -1));
    setSelectedShip(last.type);
  };

  const handleSubmit = () => {
    if (allPlaced) {
      onSubmit(placedShips);
    }
  };

  // Drag handlers
  const handleDragStart = (shipType: string) => {
    dragShipRef.current = shipType;
    setSelectedShip(shipType);
  };

  const handleCellDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setHoverCell([row, col]);
  };

  const handleCellDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const shipType = dragShipRef.current;
    if (shipType && !placedTypes.has(shipType)) {
      placeShip(shipType, row, col);
    }
    dragShipRef.current = null;
  };

  // Build ships for board display
  const boardShips = placedShips.map((s) => ({
    type: s.type,
    cells: s.cells,
    hits: [] as [number, number][],
    is_sunk: false,
  }));

  // Preview: show for hover when a ship is selected (and not yet placed)
  const activeShip = selectedShip && !placedTypes.has(selectedShip) ? selectedShip : null;
  const previewCells = hoverCell && activeShip
    ? getPreviewCells(hoverCell[0], hoverCell[1], activeShip)
    : undefined;
  const previewValid = previewCells ? isValidPlacement(previewCells) : false;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-lg font-semibold font-heading text-foreground">
        {allPlaced
          ? "All ships placed! Click Submit."
          : "Drag ships onto the board"}
      </div>

      <div className="flex gap-8 items-start">
        {/* Ship Dock */}
        <div className="flex flex-col gap-2 min-w-[160px]">
          <div className="text-sm font-heading text-foreground/60 uppercase tracking-wide mb-1">Ship Dock</div>
          {SHIP_ORDER.map((type) => {
            const length = SHIP_DEFINITIONS[type];
            const isPlaced = placedTypes.has(type);
            const isSelected = selectedShip === type && !isPlaced;

            return (
              <div
                key={type}
                draggable={!isPlaced && !disabled}
                onDragStart={() => handleDragStart(type)}
                onClick={() => {
                  if (isPlaced) {
                    removeShip(type);
                  } else {
                    setSelectedShip(type);
                  }
                }}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none
                  ${isPlaced
                    ? "border-border bg-card opacity-50"
                    : isSelected
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-border bg-card hover:border-accent/50"
                  }
                `}
              >
                {/* Visual ship blocks */}
                <div className="flex gap-0.5">
                  {Array.from({ length }, (_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-sm ${isPlaced ? "bg-border" : "bg-ship"}`}
                    />
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-heading font-medium capitalize ${isPlaced ? "text-foreground/40 line-through" : "text-foreground"}`}>
                    {type}
                  </span>
                  <span className="text-[10px] text-foreground/50">{length} cells</span>
                </div>
                {isPlaced && (
                  <span className="ml-auto text-tertiary text-sm" title="Click to remove">
                    &#10003;
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Board */}
        <div
          onMouseLeave={() => setHoverCell(null)}
          onDragLeave={() => setHoverCell(null)}
        >
          <Board
            label="Your Board"
            ships={boardShips}
            shotsReceived={[]}
            previewCells={previewCells}
            previewValid={previewValid}
            onClick={handleBoardClick}
            disabled={disabled}
            onCellDragOver={handleCellDragOver}
            onCellDrop={handleCellDrop}
          />
          {/* Invisible overlay to track hover for click-to-place mode */}
          {activeShip && (
            <div
              className="relative"
              style={{
                marginTop: `${-(BOARD_SIZE * 40)}px`,
                marginLeft: "2.5rem",
                width: `${BOARD_SIZE * 40}px`,
                height: `${BOARD_SIZE * 40}px`,
              }}
            >
              {Array.from({ length: BOARD_SIZE }, (_, row) =>
                Array.from({ length: BOARD_SIZE }, (_, col) => (
                  <div
                    key={`${row},${col}`}
                    className="absolute"
                    style={{
                      top: `${row * 40}px`,
                      left: `${col * 40}px`,
                      width: "40px",
                      height: "40px",
                    }}
                    onMouseEnter={() => setHoverCell([row, col])}
                    onClick={() => handleBoardClick(row, col)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center text-sm text-foreground/60">
        <span>
          Orientation: <strong className="text-foreground">{horizontal ? "Horizontal" : "Vertical"}</strong>
        </span>
        <button
          onClick={() => setHorizontal(!horizontal)}
          className="px-3 py-1.5 bg-card border border-border rounded-md hover:bg-border text-foreground transition-colors"
        >
          Rotate (R)
        </button>
        <button
          onClick={handleUndo}
          disabled={placedShips.length === 0 || disabled}
          className="px-4 py-1.5 bg-card border border-border rounded-md hover:bg-border disabled:opacity-40 text-foreground transition-colors"
        >
          Undo
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allPlaced || disabled}
          className="px-6 py-1.5 bg-accent rounded-md hover:bg-accent-hover disabled:opacity-40 font-semibold font-heading text-white shadow-sm transition-colors"
        >
          Submit Placement
        </button>
      </div>
    </div>
  );
}
