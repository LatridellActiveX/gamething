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
  copperOre: { name: "Copper Ore", unit: "t", baseValue: 28, category: "raw" },
  copperWire: { name: "Copper Wire", unit: "t", baseValue: 115, category: "refined" },
  silica: { name: "Silica", unit: "t", baseValue: 16, category: "raw" },
  glass: { name: "Glass", unit: "t", baseValue: 85, category: "refined" },
  electronics: { name: "Electronics", unit: "t", baseValue: 240, category: "refined" },
  phone: { name: "Phone", unit: "unit", baseValue: 420, category: "consumer" },
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
  unlockRequirements: Array<{ facilityId: FacilityId; level: number }> = [],
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

const inventoryEntry = (amount: number) => ({
  amount,
  reserved: 0,
  autoSell: {
    enabled: false,
    amount: 0,
  },
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
        power: inventoryEntry(0),
        coal: inventoryEntry(2000),
        ironOre: inventoryEntry(80),
        ironIngot: inventoryEntry(0),
        steelPlate: inventoryEntry(100),
        quicklime: inventoryEntry(40),
        water: inventoryEntry(100),
        concrete: inventoryEntry(100),
        copperOre: inventoryEntry(0),
        copperWire: inventoryEntry(0),
        silica: inventoryEntry(0),
        glass: inventoryEntry(0),
        electronics: inventoryEntry(0),
        phone: inventoryEntry(0),
      },
    },
    energy: {
      capacity: 250,
      inventory: {
        power: inventoryEntry(50),
      },
    },
  },
  facilities: {
    // [] means "available from the start"; the two-level rules below form the
    // production-chain progression for advanced facilities.
    warehouse: facility("warehouse", "Warehouse", {}, {}, 0, 1_200, { concrete: 15 }, [], true, 1, 0),
    coalGenerator: facility("coalGenerator", "Coal Generator", { coal: 2 }, { power: 5 }, 0, 650, { steelPlate: 5 }, [], true, 3, 1),
    ironOreMine: facility("ironOreMine", "Iron Ore Mine", {}, { ironOre: 1.5 }, 1, 900, { concrete: 10 }, [], true, 2, 2),
    coalExcavator: facility("coalExcavator", "Coal Excavator", {}, { coal: 1.25 }, 1, 900, { concrete: 10 }, [], true, 2, 2),
    blastFurnace: facility("blastFurnace", "Blast Furnace", { ironOre: 1, coal: 1 }, { ironIngot: 1 }, 2, 1_500, { steelPlate: 8 }, [{ facilityId: "ironOreMine", level: 2 }, { facilityId: "coalExcavator", level: 2 }], false, 5, 5),
    rollingMill: facility("rollingMill", "Rolling Mill", { ironIngot: 1, coal: 0.5 }, { steelPlate: 1 }, 2, 2_200, { concrete: 15 }, [{ facilityId: "blastFurnace", level: 2 }], false, 6, 4),
    concreteBatchPlant: facility("concreteBatchPlant", "Concrete Batch Plant", { quicklime: 1, water: 2 }, { concrete: 1 }, 1, 1_200, { steelPlate: 5 }, [], true, 3, 2),
    waterPump: facility("waterPump", "Water Pump", {}, { water: 4 }, 1, 850, { concrete: 8 }, [], true, 2, 2),
    quicklimeHarvester: facility("quicklimeHarvester", "Quicklime Harvester", { water: 1 }, { quicklime: 1 }, 1, 1_100, { concrete: 10, steelPlate: 3 }, [], true, 2, 2),
    solarPanels: facility("solarPanels", "Solar Panels", {}, { power: 6 }, 0, 1_800, { steelPlate: 6, concrete: 8 }, [], true, 0, 0),
    windTurbines: facility("windTurbines", "Wind Turbines", {}, { power: 4 }, 0, 2_400, { steelPlate: 10, concrete: 12 }, [{ facilityId: "rollingMill", level: 2 }], false, 0, 0),
    workerHousing: facility("workerHousing", "Worker Housing", {}, {}, 1, 1_000, { concrete: 12, steelPlate: 4 }, [], true, 2, 0),
    copperMine: facility("copperMine", "Copper Mine", {}, { copperOre: 1.2 }, 1, 1_050, { concrete: 12 }, [], true, 2, 2),
    wireMill: facility("wireMill", "Wire Mill", { copperOre: 1 }, { copperWire: 1 }, 2, 1_700, { steelPlate: 8, concrete: 10 }, [{ facilityId: "copperMine", level: 2 }], false, 5, 3),
    silicaQuarry: facility("silicaQuarry", "Silica Quarry", {}, { silica: 1.5 }, 1, 950, { concrete: 10 }, [], true, 2, 2),
    glassworks: facility("glassworks", "Glassworks", { silica: 1, water: 1 }, { glass: 1 }, 2, 1_900, { steelPlate: 8, concrete: 12 }, [{ facilityId: "silicaQuarry", level: 2 }], false, 5, 3),
    electronicsAssembler: facility("electronicsAssembler", "Electronics Assembler", { copperWire: 1, glass: 0.5, steelPlate: 0.25 }, { electronics: 1 }, 3, 2_800, { steelPlate: 12, concrete: 15 }, [{ facilityId: "wireMill", level: 2 }, { facilityId: "glassworks", level: 2 }], false, 8, 5),
    phoneFactory: facility("phoneFactory", "Phone Factory", { electronics: 1, steelPlate: 0.5 }, { phone: 1 }, 4, 4_500, { concrete: 18, steelPlate: 12 }, [{ facilityId: "electronicsAssembler", level: 2 }], false, 10, 6),
  },
  lastTickTimestamp: 0,
  lastSavedTimestamp: 0,
};
