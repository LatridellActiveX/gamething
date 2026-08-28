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

const facility = (
  id: FacilityId,
  name: string,
  inputRate: Record<string, number>,
  outputRate: Record<string, number>,
  powerConsumption: number,
  cash: number,
  materials: Record<string, number> = {},
  unlockRequirement?: { facilityId: FacilityId; level: number },
  unlocked = true,
) => ({
  id,
  name,
  level: 1,
  enabled: true,
  status: "online" as const,
  inputRate,
  outputRate,
  powerConsumption,
  unlocked,
  unlockRequirement,
  upgrade: { base: { cash, materials }, growth: 1.75 },
});

export const INITIAL_GAME_STATE: GameState = {
  schemaVersion: 1,
  cash: 10_000,
  power: {
    available: 50,
    productionPerSecond: 5,
    consumptionPerSecond: 0,
  },
  warehouses: {
    central: {
      capacity: 20000,
      inventory: {
        power: { amount: 0, reserved: 0 },
        coal: { amount: 2000, reserved: 0 },
        ironOre: { amount: 80, reserved: 0 },
        ironIngot: { amount: 0, reserved: 0 },
        steelPlate: { amount: 0, reserved: 0 },
        quicklime: { amount: 40, reserved: 0 },
        water: { amount: 100, reserved: 0 },
        concrete: { amount: 0, reserved: 0 },
      },
    },
    energy: {
      capacity: 250,
      inventory: { power: { amount: 50, reserved: 0 } },
    },
  },
  facilities: {
    warehouse: facility("warehouse", "Warehouse", {}, {}, 0, 1_200, { concrete: 15 }),
    energyWarehouse: facility("energyWarehouse", "Energy Storage", {}, {}, 0, 1_500, { steelPlate: 6, concrete: 10 }),
    coalGenerator: facility("coalGenerator", "Coal Generator", { coal: 2 }, { power: 5 }, 0, 650, { steelPlate: 5 }),
    ironOreMine: facility("ironOreMine", "Iron Ore Mine", {}, { ironOre: 1.5 }, 1, 900, { concrete: 10 }),
    coalExcavator: facility("coalExcavator", "Coal Excavator", {}, { coal: 1.25 }, 1, 900, { concrete: 10 }),
    blastFurnace: facility("blastFurnace", "Blast Furnace", { ironOre: 1, coal: 1 }, { ironIngot: 1 }, 2, 1_500, { steelPlate: 8 }),
    rollingMill: facility("rollingMill", "Rolling Mill", { ironIngot: 1, coal: 0.5 }, { steelPlate: 1 }, 2, 2_200, { concrete: 15 }),
    concreteBatchPlant: facility("concreteBatchPlant", "Concrete Batch Plant", { quicklime: 1, water: 2 }, { concrete: 1 }, 1, 1_200, { steelPlate: 5 }),
    solarPanels: facility("solarPanels", "Solar Panels", {}, { power: 3 }, 0, 1_800, { steelPlate: 6, concrete: 8 }, { facilityId: "blastFurnace", level: 2 }, false),
    windTurbines: facility("windTurbines", "Wind Turbines", {}, { power: 4 }, 0, 2_400, { steelPlate: 10, concrete: 12 }, { facilityId: "rollingMill", level: 2 }, false),
  },
  lastTickTimestamp: 0,
  lastSavedTimestamp: 0,
};
