import { RESOURCE_DEFINITIONS } from "./state/initialState";
import type { FacilityId, GameState, ResourceId } from "./state/types";


/**Resource ID array  */
const RESOURCE_IDS: ResourceId[] = [
  "power",
  "coal",
  "ironOre",
  "ironIngot",
  "steelPlate",
  "quicklime",
  "water",
  "concrete",
  "copperOre",
  "copperWire",
  "silica",
  "glass",
  "electronics",
  "phone",
];
const MATERIAL_RESOURCE_IDS = RESOURCE_IDS.filter((resourceId): resourceId is Exclude<ResourceId, "power"> => resourceId !== "power");

export function computeWarehouseSummary(state: GameState) {
  const inventory = state.warehouses.central.inventory;
  const used = MATERIAL_RESOURCE_IDS.reduce((total, resourceId) => total + inventory[resourceId].amount, 0);
  const capacity = state.warehouses.central.capacity;
  return {
    used,
    capacity,
    percent: capacity === 0 ? 0 : Math.min(100, (used / capacity) * 100),
  };
}

// This function is the heart of the "power grid" model.
// Every tick, we sum all active production and compare it against each active
// facility's power draw. This keeps the simulation deterministic and easy to
// debug in a learning project.
export function computePowerStats(state: GameState) {
  let production = 0;
  let consumption = 0;

  for (const facility of Object.values(state.facilities)) {
    if (!facility.active || !facility.unlocked) continue;
    production += (facility.outputRate.power ?? 0) * facility.level;
    consumption += facility.powerConsumption * facility.level;
  }


  // "Available" is live surplus, not a battery level. Power is generated and
  // consumed in the same tick; nothing is accumulated between ticks.
  state.power.productionPerSecond = production;
  state.power.consumptionPerSecond = consumption;
  state.power.available = production - consumption;
}

export const WAGE_RATE = 1;

export function computeFinancials(state: GameState) {
  const activeFacilities = Object.values(state.facilities).filter((facility) => facility.active && facility.level > 0 && facility.unlocked);
  const upkeep = activeFacilities.reduce((total, facility) => total + facility.baseUpkeep * facility.level, 0);
  const activeDemand = activeFacilities.reduce((total, facility) => total + facility.workersNeeded * facility.level, 0);
  const wages = activeDemand * WAGE_RATE;
  state.workforce.activeDemand = activeDemand;
  state.cashFlow = { upkeep, wages, net: upkeep + wages };
  return state.cashFlow;
}

// Capacity balancing is a safety rule: if workers or power demand exceed
// available capacity, the least valuable active facility is shut down until the
// system becomes stable again.
function stabilizeCapacity(state: GameState) {
  const facilities = Object.values(state.facilities);
  while (true) {
    const active = facilities.filter((facility) => facility.active && facility.level > 0 && facility.unlocked);
    const workers = active.reduce((total, facility) => total + facility.workersNeeded * facility.level, 0);
    const production = active.reduce((total, facility) => total + (facility.outputRate.power ?? 0) * facility.level, 0);
    const demand = active.reduce((total, facility) => total + facility.powerConsumption * facility.level, 0);
    if (workers <= state.workforce.capacity && production >= demand) break;

    const candidate = [...active]
      .filter((facility) => facility.outputRate.power === undefined || facility.powerConsumption > 0 || facility.workersNeeded > 0)
      .reverse()
      .find((facility) => facility.outputRate.power === undefined);
    if (!candidate) break;
    candidate.active = false;
    candidate.status = "offline";
  }
}

export function getNetResourceRate(state: GameState, resourceId: ResourceId): number {
  let total = 0;

  for (const facility of Object.values(state.facilities)) {
    if (!facility.active || !facility.unlocked) continue;
    const outputAmount = (facility.outputRate[resourceId] ?? 0) * facility.level;
    const inputConsumption = (facility.inputRate[resourceId] ?? 0) * facility.level;
    total += outputAmount - inputConsumption;
  }

  return total;
}

export function getFacilityUpgradeCost(facilityState: GameState["facilities"][FacilityId], level = facilityState.level) {
  const base = facilityState.upgrade.base;
  const materialCost: Partial<Record<ResourceId, number>> = {};

  Object.entries(base.materials).forEach(([resourceId, value]) => {
    materialCost[resourceId as ResourceId] = Number(value) * Math.pow(facilityState.upgrade.growth, Math.max(0, level - 1));
  });

  return {
    cash: Math.round(base.cash * Math.pow(facilityState.upgrade.growth, Math.max(0, level - 1))),
    materials: materialCost,
  };
}

// The main tick loop advances the whole economy by one second at a time.
// Production, storage checks, finance, and facility shutdowns are all resolved
// here so the UI only needs to display state instead of calculating rules.
export function tickGameState(state: GameState, seconds: number): GameState {
  const dt = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  updateFacilityUnlocks(state);
  const warehouse = state.warehouses.central;
  const facilityList = Object.values(state.facilities).sort((a, b) => {
    const aIsPower = (a.outputRate.power ?? 0) > 0 ? 1 : 0;
    const bIsPower = (b.outputRate.power ?? 0) > 0 ? 1 : 0;
    return bIsPower - aIsPower;
  });

  for (let step = 0; step < dt; step += 1) {
    stabilizeCapacity(state);
    computePowerStats(state);
    const gridHasCapacity = state.power.productionPerSecond >= state.power.consumptionPerSecond;

    for (const facility of facilityList) {
      if (!facility.active) {
        facility.status = "offline";
        continue;
      }
      if (facility.level <= 0) {
        facility.status = "offline";
        continue;
      }
      if (!facility.unlocked) {
        facility.status = "offline";
        continue;
      }

      const storageUsedBefore = MATERIAL_RESOURCE_IDS.reduce((total, resourceId) => total + warehouse.inventory[resourceId].amount, 0);
      const hasPower = facility.powerConsumption === 0 || gridHasCapacity;

      const missingInputs = Object.entries(facility.inputRate).some(([resourceId, rate]) => {
        const key = resourceId as ResourceId;
        const totalRequired = rate * facility.level;
        return warehouse.inventory[key].amount < totalRequired;
      });

      if (!hasPower || missingInputs) {
        facility.status = "starved";
        continue;
      }

      let canStoreAllOutputs = true;
      for (const [resourceId, outputRate] of Object.entries(facility.outputRate)) {
        if (resourceId === "power") continue;
        if (resourceId === "phone") continue;
        const outputAmount = outputRate * facility.level;
        const futureTotal = storageUsedBefore + outputAmount;
        if (futureTotal > warehouse.capacity) {
          canStoreAllOutputs = false;
          break;
        }
      }

      if (!canStoreAllOutputs) {
        facility.status = "storage-full";
        continue;
      }

      for (const [resourceId, rate] of Object.entries(facility.inputRate)) {
        const key = resourceId as ResourceId;
        warehouse.inventory[key].amount = Math.max(0, warehouse.inventory[key].amount - rate * facility.level);
      }

      for (const [resourceId, rate] of Object.entries(facility.outputRate)) {
        const key = resourceId as ResourceId;
        if (key === "power") continue;
        if (key === "phone") {
          const phoneUnits = rate * facility.level;
          state.cash += Math.round((RESOURCE_DEFINITIONS.phone.baseValue * 0.85) * phoneUnits);
          continue;
        }
        warehouse.inventory[key].amount += rate * facility.level;
      }

      facility.status = "online";
    }

    computePowerStats(state);
    const financials = computeFinancials(state);
    state.cash = Math.max(0, state.cash - financials.net);
    if (state.cash <= 0) {
      for (const facility of Object.values(state.facilities)) {
        if (facility.baseUpkeep > 0 || facility.workersNeeded > 0) {
          facility.active = false;
          facility.status = "offline";
        }
      }
      computePowerStats(state);
      computeFinancials(state);
    }
    state.lastTickTimestamp = Date.now();
  }

  return state;
}

export function applyOfflineProgress(state: GameState, now = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.floor((now - state.lastSavedTimestamp) / 1000));
  if (elapsedSeconds <= 0) {
    state.lastSavedTimestamp = now;
    state.lastTickTimestamp = now;
    computePowerStats(state);
    return state;
  }

  const cappedSeconds = Math.min(elapsedSeconds, 60 * 60 * 8);
  const nextState = structuredClone(state);

  tickGameState(nextState, cappedSeconds);
  nextState.lastSavedTimestamp = now;
  nextState.lastTickTimestamp = now;
  computePowerStats(nextState);

  return nextState;
}

export function toggleFacility(state: GameState, facilityId: FacilityId): GameState {
  const facility = state.facilities[facilityId];
  if (!facility.unlocked) return state;
  facility.active = !facility.active;
  facility.enabled = facility.active;
  facility.status = facility.active ? "online" : "offline";
  stabilizeCapacity(state);
  computePowerStats(state);
  computeFinancials(state);
  return state;
}

export function sellResource(state: GameState, resourceId: ResourceId, requestedAmount: number): GameState {
  const storage = state.warehouses.central.inventory[resourceId];
  const amount = Math.min(Math.max(0, requestedAmount), storage.amount);
  if (amount <= 0) return state;

  const unitValue = RESOURCE_DEFINITIONS[resourceId].baseValue * 0.45;
  state.cash += Number((amount * unitValue).toFixed(2));
  storage.amount -= amount;
  computePowerStats(state);
  return state;
}

export function purchaseResource(state: GameState, resourceId: ResourceId, requestedAmount: number): GameState {
  const inventory = state.warehouses.central.inventory[resourceId];
  const unitPriceCents = Math.round(getResourcePrice(resourceId) * 1.2 * 100);
  const capacity = state.warehouses.central.capacity;
  const usedSpace = RESOURCE_IDS.reduce((total, id) => total + state.warehouses.central.inventory[id].amount, 0);
  const freeSpace = Math.max(0, capacity - usedSpace);
  const affordableAmount = unitPriceCents > 0
    ? Math.floor(Math.max(0, Math.round(state.cash * 100)) / unitPriceCents)
    : 0;
  const requested = Number.isFinite(requestedAmount) ? Math.floor(requestedAmount) : 0;
  const amount = Math.min(
    Math.max(0, requested),
    affordableAmount,
    freeSpace,
  );

  if (amount <= 0) return state;

  const totalCostCents = amount * unitPriceCents;
  state.cash = (Math.round(state.cash * 100) - totalCostCents) / 100;
  inventory.amount += amount;
  computePowerStats(state);
  return state;
}

export function upgradeFacility(state: GameState, facilityId: FacilityId): GameState {
  const facility = state.facilities[facilityId];
  if (!facility.unlocked) return state;
  const cost = getFacilityUpgradeCost(facility, facility.level);

  const canAfford = state.cash >= cost.cash && Object.entries(cost.materials).every(([resourceId, amount]) => {
    const key = resourceId as ResourceId;
    return (state.warehouses.central.inventory[key]?.amount ?? 0) >= (amount ?? 0);
  });

  if (!canAfford) return state;

  state.cash -= cost.cash;
  for (const [resourceId, amount] of Object.entries(cost.materials)) {
    const key = resourceId as ResourceId;
    state.warehouses.central.inventory[key].amount -= amount ?? 0;
  }

  facility.level += 1;
  if (facilityId === "warehouse") {
    state.warehouses.central.capacity += 200;
  }
  facility.active = true;
  facility.enabled = true;
  facility.status = "online";
  if (facilityId === "workerHousing") state.workforce.capacity = 20 + facility.level * 15;
  computePowerStats(state);
  return state;
}

export function updateFacilityUnlocks(state: GameState): GameState {
  for (const facility of Object.values(state.facilities)) {
    const requirements = facility.unlockRequirements;
    if (facility.unlocked || requirements.length === 0) continue;
    if (requirements.every((requirement) => state.facilities[requirement.facilityId].level >= requirement.level)) {
      facility.unlocked = true;
      facility.status = "offline";
    }
  }
  return state;
}

export function getResourcePrice(resourceId: ResourceId) {
  return RESOURCE_DEFINITIONS[resourceId].baseValue * 0.45;
}
