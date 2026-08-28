import { INITIAL_GAME_STATE } from "./initialState";
import type { GameState } from "./types";

export const SAVE_KEY = "industrial-frontier-save-v1";

export function saveGame(state: GameState): void {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ ...state, lastSavedTimestamp: Date.now() }),
  );
}

export function loadGame(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return structuredClone(INITIAL_GAME_STATE);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) {
      throw new Error("The stored save is invalid or incompatible.");
    }

    const normalized = normalizeSave(parsed);
    if (normalized !== parsed) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    return parsed;
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return structuredClone(INITIAL_GAME_STATE);
  }
}

export function exportSave(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function importSave(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isGameState(parsed)) {
    throw new Error("The imported save is invalid or incompatible.");
  }
  return parsed;
}

export function resetSave(): GameState {
  localStorage.removeItem(SAVE_KEY);
  return structuredClone(INITIAL_GAME_STATE);
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  return candidate.schemaVersion === 1
    && typeof candidate.cash === "number"
    && typeof candidate.lastSavedTimestamp === "number"
    && typeof candidate.lastTickTimestamp === "number"
    && Boolean(candidate.warehouses?.central)
    && Boolean(candidate.facilities);
}

function normalizeSave(state: GameState): GameState {
  const starter = structuredClone(INITIAL_GAME_STATE);
  const hasLegacyStarter =
    state.warehouses.central.capacity < starter.warehouses.central.capacity
    || state.warehouses.central.inventory.coal.amount < starter.warehouses.central.inventory.coal.amount
    || state.power.available < starter.power.available;

  return hasLegacyStarter ? starter : state;
}
