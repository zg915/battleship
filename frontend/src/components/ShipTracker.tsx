"use client";

import { SHIP_DEFINITIONS, SHIP_ORDER } from "@/lib/constants";
import type { SunkShip } from "@/lib/types";

interface ShipTrackerProps {
  sunkShips: SunkShip[];
}

export default function ShipTracker({ sunkShips }: ShipTrackerProps) {
  const sunkTypes = new Set(sunkShips.map((s) => s.type));

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-heading text-foreground/60 uppercase tracking-wide mb-1">Enemy Fleet</div>
      {SHIP_ORDER.map((type) => {
        const length = SHIP_DEFINITIONS[type];
        const isSunk = sunkTypes.has(type);

        return (
          <div key={type} className="flex items-center gap-2.5">
            <div className="flex gap-0.5">
              {Array.from({ length }, (_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm ${isSunk ? "bg-sunk" : "bg-ship"}`}
                />
              ))}
            </div>
            <span className={`text-sm capitalize ${isSunk ? "text-foreground/40 line-through" : "text-foreground"}`}>
              {type}
            </span>
            {isSunk && <span className="text-sm text-sunk font-medium">Sunk</span>}
          </div>
        );
      })}
      <div className="text-sm text-foreground/60 mt-1">
        {sunkShips.length}/{SHIP_ORDER.length} sunk
      </div>
    </div>
  );
}
