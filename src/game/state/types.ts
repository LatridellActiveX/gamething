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
  | "solarPanels"
  | "windTurbines"
  | "energyWarehouse";

export type FacilityStatus = "online" | "starved" | "storage-full" | "offline";
export type MaterialResourceId = Exclude<ResourceId, "power">;

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
  status: FacilityStatus;
  inputRate: Partial<Record<ResourceId, number>>;
  outputRate: Partial<Record<ResourceId, number>>;
  powerConsumption: number;
  unlocked: boolean;
  unlockRequirement?: {
    facilityId: FacilityId;
    level: number;
  };
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
  warehouses: {
    central: WarehouseState;
    energy: EnergyWarehouseState;
  };
  facilities: Record<FacilityId, FacilityState>;
  lastTickTimestamp: number;
  lastSavedTimestamp: number;
}
