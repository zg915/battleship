export const BOARD_SIZE = 10;

export const SHIP_DEFINITIONS: Record<string, number> = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  destroyer: 2,
};

export const SHIP_ORDER = ["carrier", "battleship", "cruiser", "submarine", "destroyer"];

export const SHIP_COLORS: Record<string, string> = {
  carrier: "bg-gray-500",
  battleship: "bg-gray-600",
  cruiser: "bg-gray-700",
  submarine: "bg-gray-400",
  destroyer: "bg-gray-500",
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
