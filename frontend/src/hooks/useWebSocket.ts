"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { WS_BASE } from "@/lib/constants";
import type { GameState } from "@/lib/types";

interface UseWebSocketOptions {
  gameId: string;
  token: string;
  onGameUpdate: (state: GameState) => void;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export function useWebSocket({
  gameId,
  token,
  onGameUpdate,
  onError,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || !gameId || !token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/games/${gameId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_update") {
        onGameUpdate(data.state);
      } else if (data.type === "error") {
        onError?.(data.message);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 2 seconds
      setTimeout(() => connect(), 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [gameId, token, enabled, onGameUpdate, onError]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
