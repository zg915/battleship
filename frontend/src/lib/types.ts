export interface ShipPlacement {
  type: string;
  cells: [number, number][];
}

export interface ShipView {
  type: string;
  cells: [number, number][];
  hits: [number, number][];
  is_sunk: boolean;
}

export interface ShotResult {
  row: number;
  col: number;
  result: "hit" | "miss";
  sunk_ship: string | null;
}

export interface SunkShip {
  type: string;
  cells: [number, number][];
}

export interface MyBoard {
  ships: ShipView[] | ShipPlacement[];
  shots_received: [number, number][];
}

export interface OpponentBoard {
  shots: ShotResult[];
  sunk_ships: SunkShip[];
}

export interface PlayerInfo {
  player_id: string;
  display_name: string;
  seat: string;
  ready: boolean;
}

export interface GameState {
  game_id: string;
  mode: string;
  phase: string;
  current_turn: string | null;
  winner: string | null;
  my_player_id: string;
  my_board: MyBoard | null;
  opponent_board: OpponentBoard | null;
  players: PlayerInfo[];
}

export interface CreateGameResponse {
  game_id: string;
  player_token: string;
  player_id: string;
}

export interface JoinGameResponse {
  player_token: string;
  player_id: string;
}

export interface FireResponse {
  result: string;
  row: number;
  col: number;
  sunk_ship: string | null;
  winner: string | null;
  game_state: GameState;
}

export interface ReplayData {
  game_id: string;
  mode: string;
  players: PlayerInfo[];
  initial_boards: Record<string, ShipPlacement[]>;
  moves: ReplayMove[];
  winner: string | null;
}

export interface ReplayMove {
  turn_number: number;
  attacker_id: string;
  row: number;
  col: number;
  result: string;
  sunk_ship: string | null;
}

export interface GameListItem {
  game_id: string;
  mode: string;
  status: string;
  created_at: string;
  players: PlayerInfo[];
  winner: string | null;
}
