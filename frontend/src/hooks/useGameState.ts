"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getGameState, submitPlacement, fireShot } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import type { GameState, ShipPlacement } from "@/lib/types";

interface UseGameStateOptions {
  gameId: string;
  token: string;
  mode: string;
}

export function useGameState({ gameId, token, mode }: UseGameStateOptions) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [myLastShot, setMyLastShot] = useState<[number, number] | null>(null);
  const [opponentLastShot, setOpponentLastShot] = useState<[number, number] | null>(null);
  // Use refs for values needed inside fire() to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;
  const firingRef = useRef(false);

  // Fetch initial state
  useEffect(() => {
    if (!gameId || !token) return;
    setLoading(true);
    getGameState(gameId, token)
      .then((s) => {
        setState(s);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [gameId, token]);

  // WebSocket for multiplayer
  const handleWsUpdate = useCallback((newState: GameState) => {
    setState((prev) => {
      // Diff shots_received to find the opponent's new shot (order is not guaranteed)
      const prevSet = new Set(
        (prev?.my_board?.shots_received ?? []).map(([r, c]) => `${r},${c}`)
      );
      const newReceived = newState.my_board?.shots_received;
      if (newReceived) {
        const newShot = newReceived.find(([r, c]) => !prevSet.has(`${r},${c}`));
        if (newShot) setOpponentLastShot(newShot);
      }
      return newState;
    });
  }, []);

  const handleWsError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const { connected, send } = useWebSocket({
    gameId,
    token,
    onGameUpdate: handleWsUpdate,
    onError: handleWsError,
    enabled: mode === "human",
  });

  const placeShips = useCallback(
    async (ships: ShipPlacement[]) => {
      setError(null);
      try {
        if (mode === "human") {
          send({ type: "placement", ships });
        } else {
          await submitPlacement(gameId, token, ships);
          const newState = await getGameState(gameId, token);
          setState(newState);
        }
      } catch (e: any) {
        setError(e.message);
      }
    },
    [gameId, token, mode, send]
  );

  const fire = useCallback(
    async (row: number, col: number) => {
      if (firingRef.current) return;

      setError(null);
      setMyLastShot([row, col]);

      try {
        if (mode === "human") {
          send({ type: "fire", row, col });
          return;
        }

        firingRef.current = true;

        // Snapshot current shots as a set before firing
        const prevReceived = new Set(
          (stateRef.current?.my_board?.shots_received ?? []).map(([r, c]) => `${r},${c}`)
        );
        const result = await fireShot(gameId, token, row, col);

        // Find the AI's new shot by diffing (order is not guaranteed from backend)
        const newReceived = result.game_state.my_board?.shots_received;
        const aiShot = newReceived?.find(([r, c]) => !prevReceived.has(`${r},${c}`));

        // Step 1: Update only the opponent board — keep my_board unchanged
        setState((prev) => {
          if (!prev) return result.game_state;
          return {
            ...prev,
            opponent_board: result.game_state.opponent_board,
            phase: result.game_state.phase,
            winner: result.game_state.winner,
          };
        });

        let msg = `You fired at ${String.fromCharCode(65 + col)}${row + 1}: ${result.result}`;
        if (result.sunk_ship) msg += ` — Sunk ${result.sunk_ship}!`;
        if (result.winner) {
          const myId = stateRef.current?.my_player_id;
          msg = result.winner === myId ? "Victory!" : "Defeat!";
        }
        setLastMessage(msg);

        // Step 2: After a short delay, apply my_board + turn change (AI's counter-shot)
        if (aiShot) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setOpponentLastShot(aiShot);
          setState(result.game_state);
        } else {
          setState(result.game_state);
        }

        firingRef.current = false;
      } catch (e: any) {
        setError(e.message);
        firingRef.current = false;
      }
    },
    [gameId, token, mode, send]
  );

  const refreshState = useCallback(async () => {
    try {
      const newState = await getGameState(gameId, token);
      setState(newState);
    } catch (e: any) {
      setError(e.message);
    }
  }, [gameId, token]);

  return {
    state,
    loading,
    error,
    lastMessage,
    connected,
    myLastShot,
    opponentLastShot,
    placeShips,
    fire,
    refreshState,
  };
}
