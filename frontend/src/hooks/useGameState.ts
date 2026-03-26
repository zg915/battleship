"use client";

import { useState, useCallback, useEffect } from "react";
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
    setState(newState);
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
      setError(null);
      setLastMessage(null);
      try {
        if (mode === "human") {
          send({ type: "fire", row, col });
        } else {
          const result = await fireShot(gameId, token, row, col);
          setState(result.game_state);

          // Build message
          let msg = `You fired at ${String.fromCharCode(65 + col)}${row + 1}: ${result.result}`;
          if (result.sunk_ship) msg += ` — Sunk ${result.sunk_ship}!`;
          if (result.winner) {
            msg = result.winner === state?.my_player_id ? "Victory!" : "Defeat!";
          }
          setLastMessage(msg);
        }
      } catch (e: any) {
        setError(e.message);
      }
    },
    [gameId, token, mode, send, state?.my_player_id]
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
    placeShips,
    fire,
    refreshState,
  };
}
