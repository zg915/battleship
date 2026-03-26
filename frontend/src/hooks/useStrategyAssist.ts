"use client";

import { useState, useMemo } from "react";
import { computeStrategy, type StrategyResult } from "@/lib/strategyAssist";
import { BOARD_SIZE, SHIP_DEFINITIONS } from "@/lib/constants";
import type { ShotResult, SunkShip } from "@/lib/types";

interface UseStrategyAssistOptions {
  shots: ShotResult[];
  sunkShips: SunkShip[];
  enabled: boolean;
}

export function useStrategyAssist({
  shots,
  sunkShips,
  enabled,
}: UseStrategyAssistOptions) {
  const [isOn, setIsOn] = useState(false);

  const toggle = () => setIsOn((prev) => !prev);

  const result = useMemo<StrategyResult | null>(() => {
    if (!isOn || !enabled) return null;
    return computeStrategy(shots, sunkShips, SHIP_DEFINITIONS, BOARD_SIZE);
  }, [isOn, enabled, shots, sunkShips]);

  return { isOn, toggle, result };
}
