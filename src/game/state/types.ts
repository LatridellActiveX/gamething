export type ResourceId =
  | "power"
  | "coal"
  | "ironOre"
  | "ironIngot"
  | "steelPlate"
  | "quicklime"
  | "water"
  | "concrete";

export type FacilityId =
  | "warehouse"
  | "coalGenerator"
  | "ironOreMine"
  | "coalExcavator"
  | "blastFurnace"
  | "rollingMill"
  | "concreteBatchPlant"
  | "waterPump"
  | "quicklimeHarvester"
  | "workerHousing"
  | "solarPanels"
  | "windTurbines"
  | "energyWarehouse";

export type FacilityStatus = "online" | "starved" | "storage-full" | "offline";
export type MaterialResourceId = Exclude<ResourceId, "power">;

// Learning note:
// This file is the contract for the whole game state. If a new feature (like
// workers, build queues, or new resources) is added, it usually starts here.
// Keeping the schema explicit makes the rest of the game easier to reason about.
export interface ResourceDefinition {
  name: string;
  unit: string;
  baseValue: number;
  category: "energy" | "raw" | "refined" | "construction";
}

export interface InventoryEntry {
  amount: number;
  reserved: number;
}

export interface WarehouseState {
  capacity: number;
  inventory: Record<ResourceId, InventoryEntry>;
}

export interface EnergyWarehouseState {
  capacity: number;
  inventory: {
    power: InventoryEntry;
  };
}

export interface UpgradeCost {
  cash: number;
  materials: Partial<Record<ResourceId, number>>;
}

export interface FacilityState {
  id: FacilityId;
  name: string;
  level: number;
  enabled: boolean;
  active: boolean;
  status: FacilityStatus;
  inputRate: Partial<Record<ResourceId, number>>;
  outputRate: Partial<Record<ResourceId, number>>;
  powerConsumption: number;
  baseUpkeep: number;
  workersNeeded: number;
  unlocked: boolean;
  unlockRequirements?: Array<{
    facilityId: FacilityId;
    level: number;
  }>;
  upgrade: {
    base: UpgradeCost;
    growth: number;
  };
}

export interface GameState {
  schemaVersion: 1;
  cash: number;
  power: {
    available: number;
    productionPerSecond: number;
    consumptionPerSecond: number;
  };
  workforce: {
    capacity: number;
    activeDemand: number;
  };
  cashFlow: {
    upkeep: number;
    wages: number;
    net: number;
  };
  warehouses: {
    central: WarehouseState;
    energy: EnergyWarehouseState;
  };
  facilities: Record<FacilityId, FacilityState>;
  lastTickTimestamp: number;
  lastSavedTimestamp: number;
}
