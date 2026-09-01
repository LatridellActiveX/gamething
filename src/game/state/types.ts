export type ResourceId =
  | "power"
  | "coal"
  | "ironOre"
  | "copperOre"
  | "bauxite"
  | "silica"
  | "crudeOil"
  | "water"
  | "limestone"
  | "titaniumOre"
  | "uraniumOre"
  | "naturalGas"
  | "lithiumOre"
  | "goldOre"
  | "silverOre"
  | "sulfur"
  | "rareEarth"
  | "biomass"
  | "sand"
  | "tungstenOre"
  | "ice"
  | "ironIngot"
  | "copperIngot"
  | "aluminumIngot"
  | "coke"
  | "siliconWafer"
  | "refinedFuel"
  | "purifiedWater"
  | "quicklime"
  | "titaniumIngot"
  | "enrichedUranium"
  | "methane"
  | "lithiumCarbonate"
  | "goldBar"
  | "silverBar"
  | "sulfuricAcid"
  | "neodymium"
  | "bioFuel"
  | "glass"
  | "hydrogen"
  | "tungstenCarbide"
  | "steelPlate"
  | "copperWire"
  | "steelBeam"
  | "plasticSheet"
  | "basicCircuit"
  | "concrete"
  | "titaniumPipe"
  | "reinforcedGlass"
  | "rubber"
  | "fasteners"
  | "electricMotor"
  | "hydraulicPump"
  | "batteryCell"
  | "fiberglass"
  | "coolantContainer"
  | "solarCell"
  | "gearbox"
  | "insulatedCable"
  | "combustionEngine"
  | "fuelCell"
  | "microprocessor"
  | "advancedAlloyPlate"
  | "highCapacityBatteryPack"
  | "optoelectronicCable"
  | "servoMechanism"
  | "controlModule"
  | "industrialRobotArm"
  | "pressureVessel"
  | "pcb"
  | "syntheticFiber"
  | "pneumaticValve"
  | "sensorArray"
  | "superconductorAssembly"
  | "fuelInjector"
  | "radiatorPanel"
  | "transformer"
  | "reinforcedChassis"
  | "heatShieldTile"
  | "nuclearFuelRod"
  | "powerInverter"
  | "quantumProcessor"
  | "compositeArmorPlate"
  | "fusionCoreMatrix"
  | "rocketThruster"
  | "satelliteBus"
  | "lifeSupportAssembly"
  | "avionicsSuite"
  | "orbitalHullSegment"
  | "ionEngine"
  | "electronics"
  | "cryogenicTank"
  | "photovoltaicArray"
  | "navigationModule"
  | "reinforcedContainer"
  | "plasmaConduit"
  | "electromagneticRail"
  | "payloadBay"
  | "telemetryArray"
  | "phone";

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
  | "copperMine"
  | "wireMill"
  | "silicaQuarry"
  | "glassworks"
  | "electronicsAssembler"
  | "phoneFactory"
  | "bauxiteMine"
  | "oilRig"
  | "limestoneQuarry"
  | "titaniumMine"
  | "uraniumMine"
  | "gasExtractionPlant"
  | "lithiumWell"
  | "goldMine"
  | "silverMine"
  | "sulfurExtractor"
  | "rareEarthMine"
  | "biomassHarvester"
  | "sandDredge"
  | "glacierIceMine"
  | "tungstenMine"
  | "copperFoundry"
  | "aluminumSmelter"
  | "cokeOven"
  | "quartzPurifier"
  | "oilRefinery"
  | "waterPurificationPlant"
  | "limeKiln"
  | "titaniumSmelter"
  | "centrifuge"
  | "gasCracker"
  | "lithiumProcessor"
  | "preciousMetalRefinery"
  | "acidPlant"
  | "rareEarthSeparator"
  | "biofuelPlant"
  | "glassPanePlant"
  | "tungstenProcessor"
  | "steelBeamMill"
  | "polymerPlant"
  | "circuitShop"
  | "pipeMill"
  | "rubberVulcanizer"
  | "hardwarePress"
  | "motorFactory"
  | "pumpAssembler"
  | "batteryFactory"
  | "fiberglassMill"
  | "coolantFactory"
  | "solarCellPlant"
  | "machiningShop"
  | "cableInsulationPlant"
  | "engineWorks"
  | "fuelCellPlant"
  | "alloyFoundry"
  | "valveWorkshop"
  | "transformerPlant"
  | "chassisAssembly"
  | "semiconductorCleanroom"
  | "batteryPackPlant"
  | "fiberOpticsWorks"
  | "roboticsFactory"
  | "controlSystemFacility"
  | "vesselFabricationYard"
  | "pcbAssemblyLine"
  | "superconductorLab"
  | "sensorCleanroom"
  | "fuelInjectorLine"
  | "radiatorWorks"
  | "powerElectronicsPlant"
  | "quantumComputerLab"
  | "compositeFoundry"
  | "matrixIntegrationPlant"
  | "rocketEngineFacility"
  | "satelliteHangar"
  | "nuclearFuelFabricator"
  | "orbitalHullFabricator"
  | "ionPropulsionLab"
  | "avionicsWorkshop"
  | "lifeSupportWorks"
  | "oreSilo"
  | "liquidStorageTank"
  | "gasGasholder"
  | "hazardousVault"
  | "highSecurityVault"
  | "radioactiveVault"
  | "cryogenicStorageTank"
  | "megaWarehouseArray";

export type StoragePoolId =
  | "ore"
  | "liquid"
  | "gas"
  | "cold"
  | "hazardous"
  | "secure"
  | "radioactive"
  | "cryogenic"
  | "general";

export type FacilityStatus = "online" | "starved" | "storage-full" | "offline";
export type MaterialResourceId = Exclude<ResourceId, "power">;

export interface ResourceDefinition {
  name: string;
  unit: string;
  baseValue: number;
  category: "energy" | "raw" | "refined" | "component" | "advanced" | "hightech" | "consumer" | "construction";
  poolId?: StoragePoolId;
}

export interface InventoryEntry {
  amount: number;
  reserved: number;
  autoSell: {
    enabled: boolean;
    amount: number;
  };
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

export interface FacilityUnlockRequirement {
  facilityId: FacilityId;
  level: number;
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
  tier: number;
  unlocked: boolean;
  unlockRequirements: FacilityUnlockRequirement[];
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
