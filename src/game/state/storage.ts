import { INITIAL_GAME_STATE } from "./initialState";
import type { FacilityId, GameState, ResourceId } from "./types";
import { isUnlockedByRules } from "../tech/unlocks";

export const SAVE_KEY = "industrial-frontier-save-v1";

const STORAGE_FACILITY_CAPACITY_BONUS: Partial<Record<FacilityId, number>> = {
  warehouse: 200,
  oreSilo: 300,
  liquidStorageTank: 300,
  gasGasholder: 300,
  hazardousVault: 200,
  highSecurityVault: 200,
  radioactiveVault: 200,
  cryogenicStorageTank: 200,
  megaWarehouseArray: 1000,
};

export function saveGame(state: GameState): void {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ ...state, lastSavedTimestamp: Date.now() }),
  );
}

export function loadGame(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return structuredClone(INITIAL_GAME_STATE);

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) throw new Error("The stored save is invalid or incompatible.");

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
  if (!isGameState(parsed)) throw new Error("The imported save is invalid or incompatible.");
  return normalizeSave(parsed);
}

export function resetSave(): GameState {
  localStorage.removeItem(SAVE_KEY);
  return structuredClone(INITIAL_GAME_STATE);
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  const version = (candidate as { schemaVersion?: number }).schemaVersion;
  return (version === 1 || version === 2)
    && typeof candidate.cash === "number"
    && typeof candidate.lastSavedTimestamp === "number"
    && typeof candidate.lastTickTimestamp === "number"
    && Boolean(candidate.warehouses?.central)
    && Boolean(candidate.facilities);
}

function normalizeSave(state: GameState): GameState {
  const starter = structuredClone(INITIAL_GAME_STATE);
  const legacy = state as GameState & {
    warehouses: GameState["warehouses"] & { energy?: GameState["warehouses"]["energy"] };
  };

  if (!legacy.warehouses.energy) {
    legacy.warehouses.energy = structuredClone(starter.warehouses.energy);
    legacy.warehouses.energy.inventory.power.amount = legacy.warehouses.central.inventory.power?.amount ?? 0;
  }
  legacy.warehouses.energy.inventory.power.reserved ??= starter.warehouses.energy.inventory.power.reserved;
  legacy.warehouses.energy.inventory.power.autoSell ??= structuredClone(starter.warehouses.energy.inventory.power.autoSell);
  for (const [resourceId, starterEntry] of Object.entries(starter.warehouses.central.inventory)) {
    const inventoryEntry = legacy.warehouses.central.inventory[resourceId as keyof typeof legacy.warehouses.central.inventory];
    if (!inventoryEntry) {
      legacy.warehouses.central.inventory[resourceId as keyof typeof legacy.warehouses.central.inventory] = structuredClone(starterEntry);
      continue;
    }
    inventoryEntry.reserved ??= starterEntry.reserved;
    inventoryEntry.autoSell ??= structuredClone(starterEntry.autoSell);
    inventoryEntry.autoSell.enabled ??= starterEntry.autoSell.enabled;
    inventoryEntry.autoSell.amount ??= starterEntry.autoSell.amount;
  }

  for (const [facilityId, starterFacility] of Object.entries(starter.facilities)) {
    const key = facilityId as FacilityId;
    legacy.facilities[key] ??= structuredClone(starterFacility);
  }

  delete (legacy.facilities as Record<string, unknown>).energyWarehouse;

  for (const facility of Object.values(legacy.facilities)) {
    const definition = starter.facilities[facility.id];
    facility.name = definition.name;
    facility.inputRate = structuredClone(definition.inputRate);
    facility.outputRate = structuredClone(definition.outputRate);
    facility.powerConsumption = definition.powerConsumption;
    facility.baseUpkeep = definition.baseUpkeep;
    facility.workersNeeded = definition.workersNeeded;
    facility.tier = definition.tier;
    facility.upgrade = structuredClone(definition.upgrade);
    facility.active ??= facility.enabled;
    facility.enabled = facility.active;
    facility.unlockRequirements = structuredClone(definition.unlockRequirements);
  }

  // Progression (schema v2). Old saves have no progress block: everything they had unlocked or built
  // is recorded as a permanent unlock, so no later rule change can lock it again.
  const progress = (legacy as Partial<GameState>).progress;
  legacy.progress = {
    unlocked: Array.isArray(progress?.unlocked) ? progress.unlocked.filter((id) => id in starter.facilities) : [],
    researchPoints: typeof progress?.researchPoints === "number" && Number.isFinite(progress.researchPoints) ? progress.researchPoints : 0,
    milestones: Array.isArray(progress?.milestones) ? [...progress.milestones] : [],
    produced: progress?.produced && typeof progress.produced === "object" ? { ...progress.produced } : {},
    guideDismissed: progress?.guideDismissed === true,
  };
  const sticky = new Set<FacilityId>(legacy.progress.unlocked);
  for (const facility of Object.values(legacy.facilities)) {
    const keep = facility.unlocked === true || facility.level > 0 || sticky.has(facility.id) || isUnlockedByRules(legacy, facility.id);
    facility.unlocked = keep;
    if (keep) sticky.add(facility.id);
  }
  legacy.progress.unlocked = [...sticky];
  legacy.schemaVersion = 2;

  legacy.workforce ??= structuredClone(starter.workforce);
  legacy.cashFlow ??= structuredClone(starter.cashFlow);
  // Older saves stored total running costs under the misleading name `cashFlow.net`.
  const legacyCashFlow = legacy.cashFlow as GameState["cashFlow"] & { net?: number };
  if (typeof legacyCashFlow.totalCost !== "number") {
    legacyCashFlow.totalCost = typeof legacyCashFlow.net === "number"
      ? legacyCashFlow.net
      : (legacyCashFlow.upkeep ?? 0) + (legacyCashFlow.wages ?? 0);
  }
  delete legacyCashFlow.net;
  legacy.workforce.capacity = 20 + (legacy.facilities.workerHousing?.level ?? 0) * 15;
  legacy.warehouses.central.capacity = computeWarehouseCapacity(legacy);
  return legacy;
}

function computeWarehouseCapacity(state: GameState): number {
  return 20_000 + Object.entries(STORAGE_FACILITY_CAPACITY_BONUS).reduce((total, [facilityId, bonus]) => {
    const level = state.facilities[facilityId as FacilityId]?.level ?? 0;
    return total + level * (bonus ?? 0);
  }, 0);
}
