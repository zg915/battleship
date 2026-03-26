"use client";

import { useState } from "react";

export default function RulesButton() {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      {/* Rules button — fixed bottom right */}
      <button
        onClick={() => setShowRules(true)}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-card-dark text-white font-heading font-bold text-lg shadow-md hover:bg-[#2a2a29] transition-colors flex items-center justify-center"
        aria-label="Show rules"
      >
        ?
      </button>

      {/* Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRules(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-lg max-w-md w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-heading text-foreground">How to Play</h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-foreground/40 hover:text-foreground text-xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3 text-sm text-foreground/80 font-body leading-relaxed">
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">Setup</h3>
                <p>Each player places 5 ships on their 10&times;10 grid. Ships cannot overlap or go out of bounds.</p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">Ships</h3>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Carrier &mdash; 5 cells</li>
                  <li>Battleship &mdash; 4 cells</li>
                  <li>Cruiser &mdash; 3 cells</li>
                  <li>Submarine &mdash; 3 cells</li>
                  <li>Destroyer &mdash; 2 cells</li>
                </ul>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">Gameplay</h3>
                <p>Players take turns firing at the opponent&apos;s board. Click a cell on the opponent board to fire.</p>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">Results</h3>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><span className="font-semibold text-miss">&#x2022;</span> Miss &mdash; no ship at that cell, turn passes</li>
                  <li><span className="font-semibold text-hit">&#x2715;</span> Hit &mdash; ship found, turn passes</li>
                  <li><span className="font-semibold text-sunk">Sunk</span> &mdash; all cells of a ship hit</li>
                </ul>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">Winning</h3>
                <p>The first player to sink all 5 of the opponent&apos;s ships wins the game.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
