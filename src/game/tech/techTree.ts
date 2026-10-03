// Static tech-tree data: every facility's category, era and short "why build this" blurb.
// Derived from the facility definitions in initialState.ts so the two never drift apart.
import { INITIAL_GAME_STATE, RESOURCE_DEFINITIONS } from "../state/initialState";
import type { FacilityId, ResourceId } from "../state/types";

export type TechCategory = "power" | "extraction" | "refining" | "components" | "advanced" | "storage";

export const CATEGORY_ORDER: TechCategory[] = ["power", "extraction", "refining", "components", "advanced", "storage"];

export const CATEGORY_META: Record<TechCategory, { label: string; short: string; blurb: string; icon: string }> = {
  power: { label: "Power", short: "Power", blurb: "Every machine needs power. If the grid runs short, machines shut off.", icon: "power" },
  extraction: { label: "Extraction", short: "Extract", blurb: "Mines, wells and pumps. These need power to run.", icon: "ironOre" },
  refining: { label: "Refining", short: "Refine", blurb: "Turns raw ore into ingots, concrete, fuel and other basic materials.", icon: "ironIngot" },
  components: { label: "Components", short: "Parts", blurb: "Turns basic materials into parts like beams, wire, motors and circuits.", icon: "gearbox" },
  advanced: { label: "Advanced", short: "Advanced", blurb: "High-value systems, consumer goods and frontier projects.", icon: "microprocessor" },
  storage: { label: "Storage & housing", short: "Storage", blurb: "More workers and more storage space for your factory.", icon: "warehouse" },
};

export interface EraDefinition {
  id: number;
  numeral: string;
  name: string;
}

export const ERAS: EraDefinition[] = [
  { id: 1, numeral: "I", name: "Ignition" },
  { id: 2, numeral: "II", name: "Groundworks" },
  { id: 3, numeral: "III", name: "Smelt & Forge" },
  { id: 4, numeral: "IV", name: "Steelworks" },
  { id: 5, numeral: "V", name: "Fabrication" },
  { id: 6, numeral: "VI", name: "Assembly" },
  { id: 7, numeral: "VII", name: "High Tech" },
  { id: 8, numeral: "VIII", name: "Frontier" },
];

/** Hand-placed era for each facility. A facility is always bumped to at least the era of its prerequisites. */
const BASE_ERA: Record<FacilityId, number> = {
  coalGenerator: 1, workerHousing: 1, coalExcavator: 1, ironOreMine: 1,
  solarPanels: 2, warehouse: 2, waterPump: 2, quicklimeHarvester: 2, concreteBatchPlant: 2, limestoneQuarry: 2, oreSilo: 2, liquidStorageTank: 2, sandDredge: 2, biomassHarvester: 2,
  blastFurnace: 3, cokeOven: 3, copperMine: 3, silicaQuarry: 3, limeKiln: 3, waterPurificationPlant: 3, bauxiteMine: 3, copperFoundry: 3, aluminumSmelter: 3,
  rollingMill: 4, windTurbines: 4, wireMill: 4, glassworks: 4, quartzPurifier: 4, oilRig: 4, oilRefinery: 4, sulfurExtractor: 4, biofuelPlant: 4, glassPanePlant: 4, gasExtractionPlant: 4, gasGasholder: 4,
  steelBeamMill: 5, hardwarePress: 5, titaniumMine: 5, titaniumSmelter: 5, pipeMill: 5, polymerPlant: 5, acidPlant: 5, gasCracker: 5, rubberVulcanizer: 5, circuitShop: 5, electronicsAssembler: 5, phoneFactory: 5, lithiumWell: 5, lithiumProcessor: 5, hazardousVault: 5,
  motorFactory: 6, machiningShop: 6, solarCellPlant: 6, batteryFactory: 6, cableInsulationPlant: 6, fiberglassMill: 6, coolantFactory: 6, goldMine: 6, silverMine: 6, preciousMetalRefinery: 6, tungstenMine: 6, tungstenProcessor: 6, highSecurityVault: 6, transformerPlant: 6, valveWorkshop: 6, pumpAssembler: 6, engineWorks: 6, fuelCellPlant: 6,
  alloyFoundry: 7, chassisAssembly: 7, semiconductorCleanroom: 7, batteryPackPlant: 7, fiberOpticsWorks: 7, pcbAssemblyLine: 7, rareEarthMine: 7, rareEarthSeparator: 7, superconductorLab: 7, sensorCleanroom: 7, radiatorWorks: 7, controlSystemFacility: 7, uraniumMine: 7, centrifuge: 7, radioactiveVault: 7, glacierIceMine: 7, cryogenicStorageTank: 7, roboticsFactory: 7, vesselFabricationYard: 7, powerElectronicsPlant: 7, fuelInjectorLine: 7, compositeFoundry: 7,
  quantumComputerLab: 8, matrixIntegrationPlant: 8, rocketEngineFacility: 8, satelliteHangar: 8, nuclearFuelFabricator: 8, orbitalHullFabricator: 8, ionPropulsionLab: 8, avionicsWorkshop: 8, lifeSupportWorks: 8, megaWarehouseArray: 8,
};

const STORAGE_FACILITIES = new Set<FacilityId>(["warehouse", "workerHousing", "oreSilo", "liquidStorageTank", "gasGasholder", "hazardousVault", "highSecurityVault", "radioactiveVault", "cryogenicStorageTank", "megaWarehouseArray"]);

/** Hand-written reasons for the early buildings; everything else gets a generated line. */
const WHY: Partial<Record<FacilityId, string>> = {
  coalGenerator: "Start here. Every mine and factory needs power, and this is the cheapest way to get it.",
  workerHousing: "Every building needs workers. Housing adds 15 workers per level.",
  coalExcavator: "Coal fuels your Coal Generators and Blast Furnaces. Keep it flowing.",
  ironOreMine: "Iron Ore is the start of the steel chain that every building needs.",
  solarPanels: "Power with no fuel and no workers. Pricier, but it never runs dry.",
  warehouse: "More storage space, so production doesn't stop when storage is full.",
  waterPump: "Water feeds concrete, glass and many later chemical plants.",
  quicklimeHarvester: "Quicklime and Water make Concrete, which almost every building costs.",
  concreteBatchPlant: "Makes your own Concrete, so you stop running out of building material.",
  blastFurnace: "Turns Iron Ore + Coal into Iron Ingots, the first step toward making your own Steel Plate.",
  rollingMill: "Makes Steel Plate, the material almost every building costs.",
  copperMine: "Copper Ore leads to Copper Wire and electronics.",
  silicaQuarry: "Silica leads to glass and silicon wafers.",
  wireMill: "Copper Wire goes into electronics, motors and circuits.",
  glassworks: "Glass is needed for electronics and later optics.",
  electronicsAssembler: "Electronics lead to Phones, your first big money maker.",
  phoneFactory: "Phones are sold automatically for cash as soon as they are made.",
  windTurbines: "More power with no fuel cost.",
};

export interface TechNode {
  id: FacilityId;
  category: TechCategory;
  era: number;
  prerequisites: FacilityId[];
  why: string;
}

const facilities = INITIAL_GAME_STATE.facilities;
const materialKeys = (rates: Partial<Record<ResourceId, number>>) => (Object.keys(rates) as ResourceId[]).filter((id) => id !== "power");
const listNames = (ids: ResourceId[]) => ids.map((id) => RESOURCE_DEFINITIONS[id].name).join(" + ");

function categorize(id: FacilityId): TechCategory {
  const facility = facilities[id];
  if (STORAGE_FACILITIES.has(id)) return "storage";
  const outputs = materialKeys(facility.outputRate);
  if ((facility.outputRate.power ?? 0) > 0 && outputs.length === 0) return "power";
  if (materialKeys(facility.inputRate).length === 0) return "extraction";
  // Classify by the main (first) output.
  const category = RESOURCE_DEFINITIONS[outputs[0]].category;
  if (category === "advanced" || category === "hightech" || category === "consumer") return "advanced";
  if (category === "component") return "components";
  return "refining";
}

function describe(id: FacilityId): string {
  const facility = facilities[id];
  const outputs = materialKeys(facility.outputRate);
  const inputs = materialKeys(facility.inputRate);
  if (outputs.length === 0) return (facility.outputRate.power ?? 0) > 0 ? `Adds ${facility.outputRate.power} MW of power.` : "Support building for your factory.";
  if (inputs.length === 0) return `Produces ${listNames(outputs)} from the ground.`;
  return `Turns ${listNames(inputs)} into ${listNames(outputs)}.`;
}

const ERA_CACHE = new Map<FacilityId, number>();
function resolveEra(id: FacilityId): number {
  const cached = ERA_CACHE.get(id);
  if (cached !== undefined) return cached;
  const prerequisiteEra = facilities[id].unlockRequirements.reduce((max, requirement) => Math.max(max, resolveEra(requirement.facilityId)), 1);
  const era = Math.max(BASE_ERA[id] ?? 1, prerequisiteEra);
  ERA_CACHE.set(id, era);
  return era;
}

export const TECH_NODES: Record<FacilityId, TechNode> = Object.fromEntries(
  (Object.keys(facilities) as FacilityId[]).map((id) => [id, {
    id,
    category: categorize(id),
    era: resolveEra(id),
    prerequisites: facilities[id].unlockRequirements.map((requirement) => requirement.facilityId),
    why: WHY[id] ?? describe(id),
  } satisfies TechNode]),
) as Record<FacilityId, TechNode>;

/** Facilities that list `id` as a direct prerequisite. */
export const TECH_DEPENDENTS: Record<FacilityId, FacilityId[]> = Object.fromEntries(
  (Object.keys(facilities) as FacilityId[]).map((id) => [id, (Object.keys(facilities) as FacilityId[]).filter((other) => TECH_NODES[other].prerequisites.includes(id))]),
) as Record<FacilityId, FacilityId[]>;

export const getEra = (era: number) => ERAS[Math.min(ERAS.length, Math.max(1, era)) - 1];

/** Cosmetic tier shown on the map (T1–T5), derived from the era: I–II → 1, III–IV → 2, V–VI → 3, VII → 4, VIII → 5. */
export function tierForEra(era: number): number {
  return era <= 2 ? 1 : era <= 4 ? 2 : era <= 6 ? 3 : era === 7 ? 4 : 5;
}
