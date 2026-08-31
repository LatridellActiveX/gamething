import type { FacilityId, GameState, ResourceDefinition, ResourceId } from "./types";

export const RESOURCE_DEFINITIONS: Record<ResourceId, ResourceDefinition> = {
  power: { name: "Power", unit: "MW", baseValue: 4, category: "energy" },
  coal: { name: "Coal", unit: "t", baseValue: 12, category: "raw" },
  ironOre: { name: "Iron Ore", unit: "t", baseValue: 18, category: "raw" },
  ironIngot: { name: "Iron Ingot", unit: "t", baseValue: 42, category: "refined" },
  steelPlate: { name: "Steel Plate", unit: "t", baseValue: 75, category: "refined" },
  quicklime: { name: "Quicklime", unit: "t", baseValue: 20, category: "construction" },
  water: { name: "Water", unit: "kL", baseValue: 2, category: "construction" },
  concrete: { name: "Concrete", unit: "t", baseValue: 30, category: "construction" },
};

// This file is the player's starting blueprint for the game.
// It defines the resources, the facilities, and the initial economy, so a
// beginner can see exactly what the first production loop looks like.
const facility = (
  id: FacilityId,
  name: string,
  inputRate: Record<string, number>,
  outputRate: Record<string, number>,
  powerConsumption: number,
  cash: number,
  materials: Record<string, number> = {},
  unlockRequirements?: Array<{ facilityId: FacilityId; level: number }>,
  unlocked = true,
  baseUpkeep = 0,
  workersNeeded = 0,
) => ({
  id,
  name,
  level: 0,
  enabled: false,
  active: false,
  status: "online" as const,
  inputRate,
  outputRate,
  powerConsumption,
  baseUpkeep,
  workersNeeded,
  unlocked,
  unlockRequirements,
  upgrade: { base: { cash, materials }, growth: 1.75 },
});

export const INITIAL_GAME_STATE: GameState = {
  schemaVersion: 1,
  cash: 25_000,
  power: {
    available: 0,
    productionPerSecond: 0,
    consumptionPerSecond: 0,
  },
  workforce: { capacity: 20, activeDemand: 0 },
  cashFlow: { upkeep: 0, wages: 0, net: 0 },
  warehouses: {
    central: {
      capacity: 20000,
      inventory: {
        power: { amount: 0, reserved: 0 },
        coal: { amount: 2000, reserved: 0 },
        ironOre: { amount: 80, reserved: 0 },
        ironIngot: { amount: 0, reserved: 0 },
        steelPlate: { amount: 100, reserved: 0 },
        quicklime: { amount: 40, reserved: 0 },
        water: { amount: 100, reserved: 0 },
        concrete: { amount: 100, reserved: 0 },
      },
    },
    energy: {
      capacity: 250,
      inventory: { power: { amount: 50, reserved: 0 } },
    },
  },
  facilities: {
    warehouse: facility("warehouse", "Warehouse", {}, {}, 0, 1_200, { concrete: 15 }, undefined, true, 1, 0),
    energyWarehouse: facility("energyWarehouse", "Energy Storage", {}, {}, 0, 1_500, { steelPlate: 6, concrete: 10 }, undefined, true, 1, 0),
    coalGenerator: facility("coalGenerator", "Coal Generator", { coal: 2 }, { power: 5 }, 0, 650, { steelPlate: 5 }, undefined, true, 3, 1),
    ironOreMine: facility("ironOreMine", "Iron Ore Mine", {}, { ironOre: 1.5 }, 1, 900, { concrete: 10 }, undefined, true, 2, 2),
    coalExcavator: facility("coalExcavator", "Coal Excavator", {}, { coal: 1.25 }, 1, 900, { concrete: 10 }, undefined, true, 2, 2),
    blastFurnace: facility("blastFurnace", "Blast Furnace", { ironOre: 1, coal: 1 }, { ironIngot: 1 }, 2, 1_500, { steelPlate: 8 }, [{ facilityId: "ironOreMine", level: 2 }, { facilityId: "coalExcavator", level: 2 }], false, 5, 5),
    rollingMill: facility("rollingMill", "Rolling Mill", { ironIngot: 1, coal: 0.5 }, { steelPlate: 1 }, 2, 2_200, { concrete: 15 }, [{ facilityId: "blastFurnace", level: 2 }], false, 6, 4),
    concreteBatchPlant: facility("concreteBatchPlant", "Concrete Batch Plant", { quicklime: 1, water: 2 }, { concrete: 1 }, 1, 1_200, { steelPlate: 5 }, undefined, true, 3, 2),
    waterPump: facility("waterPump", "Water Pump", {}, { water: 4 }, 1, 850, { concrete: 8 }, undefined, true, 2, 2),
    quicklimeHarvester: facility("quicklimeHarvester", "Quicklime Harvester", { water: 1 }, { quicklime: 1 }, 1, 1_100, { concrete: 10, steelPlate: 3 }, undefined, true, 2, 2),
    solarPanels: facility("solarPanels", "Solar Panels", {}, { power: 6 }, 0, 1_800, { steelPlate: 6, concrete: 8 }, undefined, true, 0, 0),
    windTurbines: facility("windTurbines", "Wind Turbines", {}, { power: 4 }, 0, 2_400, { steelPlate: 10, concrete: 12 }, [{ facilityId: "rollingMill", level: 2 }], false, 0, 0),
    workerHousing: facility("workerHousing", "Worker Housing", {}, {}, 1, 1_000, { concrete: 12, steelPlate: 4 }, undefined, true, 2, 0),
  },
  lastTickTimestamp: 0,
  lastSavedTimestamp: 0,
};
