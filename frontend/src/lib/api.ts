import { API_BASE } from "./constants";
import type {
  CreateGameResponse,
  FireResponse,
  GameListItem,
  GameState,
  JoinGameResponse,
  ReplayData,
  ShipPlacement,
} from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Request failed");
  }
  return res.json();
}

export async function createGame(mode: string, displayName: string): Promise<CreateGameResponse> {
  return request("/games", {
    method: "POST",
    body: JSON.stringify({ mode, display_name: displayName }),
  });
}

export async function joinGame(gameId: string, displayName: string): Promise<JoinGameResponse> {
  return request(`/games/${gameId}/join`, {
    method: "POST",
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function getGameState(gameId: string, token: string): Promise<GameState> {
  return request(`/games/${gameId}/state?token=${token}`);
}

export async function submitPlacement(
  gameId: string,
  token: string,
  ships: ShipPlacement[]
): Promise<{ ready: boolean; game_started: boolean }> {
  return request(`/games/${gameId}/placement`, {
    method: "POST",
    body: JSON.stringify({ token, ships }),
  });
}

export async function fireShot(
  gameId: string,
  token: string,
  row: number,
  col: number
): Promise<FireResponse> {
  return request(`/games/${gameId}/fire`, {
    method: "POST",
    body: JSON.stringify({ token, row, col }),
  });
}

export async function getReplay(gameId: string): Promise<ReplayData> {
  return request(`/games/${gameId}/replay`);
}

export async function getRecentGames(): Promise<GameListItem[]> {
  return request("/games");
}

export async function getWaitingGames(): Promise<GameListItem[]> {
  return request("/games/waiting");
}
