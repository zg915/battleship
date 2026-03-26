import type { ShotResult, SunkShip } from "@/lib/types";

export type AssistMode = "hunt" | "target";

export interface HitCluster {
  cells: [number, number][];
  orientation: "single" | "horizontal" | "vertical";
}

export interface StrategyResult {
  scores: Map<string, number>;
  recommended: [number, number][];
  impossible: [number, number][];
  mode: AssistMode;
  explanation: string;
  maxScore: number;
}

// --- Board state derivation ---

interface BoardState {
  missSet: Set<string>;
  sunkSet: Set<string>;
  unresolvedHits: Set<string>;
  shotSet: Set<string>;
}

function buildBoardState(
  shots: ShotResult[],
  sunkShips: SunkShip[],
): BoardState {
  const missSet = new Set<string>();
  const hitSet = new Set<string>();
  const shotSet = new Set<string>();

  for (const shot of shots) {
    const key = `${shot.row},${shot.col}`;
    shotSet.add(key);
    if (shot.result === "miss") {
      missSet.add(key);
    } else {
      hitSet.add(key);
    }
  }

  const sunkSet = new Set<string>();
  for (const ship of sunkShips) {
    for (const [r, c] of ship.cells) {
      sunkSet.add(`${r},${c}`);
    }
  }

  const unresolvedHits = new Set<string>();
  for (const key of hitSet) {
    if (!sunkSet.has(key)) {
      unresolvedHits.add(key);
    }
  }

  return { missSet, sunkSet, unresolvedHits, shotSet };
}

// --- Hit cluster detection (BFS) ---

function findHitClusters(unresolvedHits: Set<string>): HitCluster[] {
  const visited = new Set<string>();
  const clusters: HitCluster[] = [];

  for (const key of unresolvedHits) {
    if (visited.has(key)) continue;

    // BFS from this cell
    const clusterKeys: string[] = [];
    const queue = [key];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      clusterKeys.push(current);
      const [r, c] = current.split(",").map(Number);

      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const neighbor = `${r + dr},${c + dc}`;
        if (unresolvedHits.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const cells = clusterKeys.map(
      (k) => k.split(",").map(Number) as [number, number],
    );

    let orientation: HitCluster["orientation"];
    if (cells.length === 1) {
      orientation = "single";
    } else {
      const allSameRow = cells.every((c) => c[0] === cells[0][0]);
      const allSameCol = cells.every((c) => c[1] === cells[0][1]);
      if (allSameRow) {
        orientation = "horizontal";
      } else if (allSameCol) {
        orientation = "vertical";
      } else {
        // Non-linear cluster — degrade gracefully by treating as single cells
        orientation = "single";
      }
    }

    clusters.push({ cells, orientation });
  }

  return clusters;
}

// --- Placement enumeration ---

function enumeratePlacements(
  length: number,
  boardSize: number,
): [number, number][][] {
  const placements: [number, number][][] = [];

  // Horizontal
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c <= boardSize - length; c++) {
      const cells: [number, number][] = [];
      for (let i = 0; i < length; i++) {
        cells.push([r, c + i]);
      }
      placements.push(cells);
    }
  }

  // Vertical
  for (let c = 0; c < boardSize; c++) {
    for (let r = 0; r <= boardSize - length; r++) {
      const cells: [number, number][] = [];
      for (let i = 0; i < length; i++) {
        cells.push([r + i, c]);
      }
      placements.push(cells);
    }
  }

  return placements;
}

// --- Validation ---

function isPlacementValid(
  cells: [number, number][],
  missSet: Set<string>,
  sunkSet: Set<string>,
): boolean {
  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    if (missSet.has(key) || sunkSet.has(key)) return false;
  }
  return true;
}

// --- Cluster compatibility (Target Mode) ---

function isPlacementCompatibleWithCluster(
  cells: [number, number][],
  cluster: HitCluster,
): boolean {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  if (cluster.orientation === "single") {
    // Placement must include the single hit cell
    const [r, c] = cluster.cells[0];
    return cellSet.has(`${r},${c}`);
  }

  if (cluster.orientation === "horizontal") {
    // Placement must be horizontal (all same row) and include all cluster cells
    const allSameRow = cells.every((c) => c[0] === cells[0][0]);
    if (!allSameRow) return false;
    return cluster.cells.every(([r, c]) => cellSet.has(`${r},${c}`));
  }

  if (cluster.orientation === "vertical") {
    // Placement must be vertical (all same col) and include all cluster cells
    const allSameCol = cells.every((c) => c[1] === cells[0][1]);
    if (!allSameCol) return false;
    return cluster.cells.every(([r, c]) => cellSet.has(`${r},${c}`));
  }

  return false;
}

function isPlacementCompatibleWithAnyClusters(
  cells: [number, number][],
  clusters: HitCluster[],
): boolean {
  for (const cluster of clusters) {
    // Skip clusters larger than the ship — can't cover them
    if (cluster.cells.length > cells.length) continue;
    if (isPlacementCompatibleWithCluster(cells, cluster)) return true;
  }
  return false;
}

// --- Main entry point ---

export function computeStrategy(
  shots: ShotResult[],
  sunkShips: SunkShip[],
  shipDefinitions: Record<string, number>,
  boardSize: number,
): StrategyResult {
  const { missSet, sunkSet, unresolvedHits, shotSet } = buildBoardState(
    shots,
    sunkShips,
  );

  // Determine remaining ships (exclude sunk types)
  const sunkTypes = new Set(sunkShips.map((s) => s.type));
  const remainingShips = Object.entries(shipDefinitions).filter(
    ([type]) => !sunkTypes.has(type),
  );

  // Determine mode
  const mode: AssistMode = unresolvedHits.size > 0 ? "target" : "hunt";

  // Build clusters for target mode
  const clusters = mode === "target" ? findHitClusters(unresolvedHits) : [];

  // Initialize scores for all unknown cells
  const scores = new Map<string, number>();
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const key = `${r},${c}`;
      if (!shotSet.has(key)) {
        scores.set(key, 0);
      }
    }
  }

  // No unknown cells left
  if (scores.size === 0) {
    return {
      scores,
      recommended: [],
      impossible: [],
      mode,
      explanation: "No available cells remaining.",
      maxScore: 0,
    };
  }

  // Score each remaining ship's valid placements
  for (const [, length] of remainingShips) {
    const placements = enumeratePlacements(length, boardSize);

    for (const cells of placements) {
      if (!isPlacementValid(cells, missSet, sunkSet)) continue;

      if (
        mode === "target" &&
        !isPlacementCompatibleWithAnyClusters(cells, clusters)
      ) {
        continue;
      }

      for (const [r, c] of cells) {
        const key = `${r},${c}`;
        if (scores.has(key)) {
          scores.set(key, scores.get(key)! + 1);
        }
      }
    }
  }

  // Find max score, recommended, and impossible cells
  let maxScore = 0;
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score;
  }

  const recommended: [number, number][] = [];
  const impossible: [number, number][] = [];

  for (const [key, score] of scores) {
    const [r, c] = key.split(",").map(Number) as [number, number];
    if (maxScore > 0 && score === maxScore) {
      recommended.push([r, c]);
    }
    if (score === 0) {
      impossible.push([r, c]);
    }
  }

  // Build explanation
  let explanation: string;
  if (mode === "hunt") {
    explanation = `Hunt mode \u2014 ${remainingShips.length} ships remaining, ${scores.size} unknown cells`;
  } else {
    const clusterWord = clusters.length === 1 ? "cluster" : "clusters";
    explanation = `Target mode \u2014 ${unresolvedHits.size} unresolved hit${unresolvedHits.size > 1 ? "s" : ""}, ${clusters.length} ${clusterWord}`;
  }

  return { scores, recommended, impossible, mode, explanation, maxScore };
}
