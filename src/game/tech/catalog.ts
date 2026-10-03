// Pure helpers behind the Build tab: per-facility state, affordability, unlock distance and the
// "recommended next" pick. Nothing here mutates game state.
import { getFacilityUpgradeCost, getNetResourceRate } from "../engine";
import { RESOURCE_DEFINITIONS } from "../state/initialState";
import type { FacilityId, GameState, ResourceId } from "../state/types";
import { getNextMilestone, getResearchCost, isResearchable } from "./research";
import { TECH_NODES } from "./techTree";

export type CatalogState = "built" | "recommended" | "available" | "unaffordable" | "researchable" | "locked";

export function getMissingMaterials(state: GameState, facilityId: FacilityId): Array<{ resourceId: ResourceId; need: number; have: number }> {
  const cost = getFacilityUpgradeCost(state.facilities[facilityId]);
  return (Object.entries(cost.materials) as Array<[ResourceId, number]>)
    .map(([resourceId, need]) => ({ resourceId, need, have: state.warehouses.central.inventory[resourceId]?.amount ?? 0 }))
    .filter((entry) => entry.have < entry.need);
}

export function canAffordFacility(state: GameState, facilityId: FacilityId): boolean {
  const cost = getFacilityUpgradeCost(state.facilities[facilityId]);
  return state.cash >= cost.cash && getMissingMaterials(state, facilityId).length === 0;
}

/** What blocks the build/upgrade button, as a short label ("Need Concrete", "Need cash"), or null. */
export function getShortfallLabel(state: GameState, facilityId: FacilityId): string | null {
  const missing = getMissingMaterials(state, facilityId);
  if (missing.length > 0) return `Need ${RESOURCE_DEFINITIONS[missing[0].resourceId].name}`;
  if (state.cash < getFacilityUpgradeCost(state.facilities[facilityId]).cash) return "Need cash";
  return null;
}

/** How many unlock steps away a locked facility is (0 when already unlocked). */
export function getStepsAway(state: GameState, facilityId: FacilityId, trail = new Set<FacilityId>()): number {
  const facility = state.facilities[facilityId];
  if (facility.unlocked || trail.has(facilityId)) return 0;
  trail.add(facilityId);
  const unmet = facility.unlockRequirements.filter((requirement) => (state.facilities[requirement.facilityId]?.level ?? 0) < requirement.level);
  const deepest = unmet.reduce((max, requirement) => Math.max(max, getStepsAway(state, requirement.facilityId, trail)), 0);
  trail.delete(facilityId);
  return 1 + deepest;
}

export interface Recommendation {
  facilityId: FacilityId;
  title: string;
  reason: string;
}

const powerOf = (state: GameState) => ({ production: state.power.productionPerSecond, consumption: state.power.consumptionPerSecond });
const level = (state: GameState, id: FacilityId) => state.facilities[id].level;
const stock = (state: GameState, id: ResourceId) => state.warehouses.central.inventory[id]?.amount ?? 0;

/** The opening build order. Each goal is "get this facility to this level"; the first unmet, unlocked goal wins. */
export const OPENING_GOALS: Array<{ facilityId: FacilityId; level: number; reason: string }> = [
  { facilityId: "coalGenerator", level: 1, reason: "Every mine and factory needs power. Start with a Coal Generator." },
  { facilityId: "coalExcavator", level: 1, reason: "Your generator burns coal. Mine more so it never runs dry." },
  { facilityId: "ironOreMine", level: 1, reason: "Iron Ore is the start of the steel chain every building needs." },
  { facilityId: "workerHousing", level: 1, reason: "More buildings need more workers. Housing adds 15 per level." },
  { facilityId: "coalExcavator", level: 2, reason: "Level 2 coal and iron mines unlock the Blast Furnace." },
  { facilityId: "ironOreMine", level: 2, reason: "Level 2 coal and iron mines unlock the Blast Furnace." },
  { facilityId: "blastFurnace", level: 1, reason: "Smelt Iron Ore + Coal into Iron Ingots, the first step toward making your own Steel Plate." },
  { facilityId: "blastFurnace", level: 2, reason: "A level 2 Blast Furnace unlocks the Rolling Mill." },
  { facilityId: "rollingMill", level: 1, reason: "Make your own Steel Plate, the material almost every building costs." },
  { facilityId: "waterPump", level: 1, reason: "Water is needed for Quicklime and Concrete." },
  { facilityId: "quicklimeHarvester", level: 1, reason: "Quicklime + Water make Concrete." },
  { facilityId: "concreteBatchPlant", level: 1, reason: "Make your own Concrete so you stop running out of building material." },
  { facilityId: "copperMine", level: 1, reason: "Copper Ore leads to Copper Wire and electronics." },
  { facilityId: "silicaQuarry", level: 1, reason: "Silica leads to Glass and electronics." },
  { facilityId: "copperMine", level: 2, reason: "A level 2 Copper Mine unlocks the Wire Mill." },
  { facilityId: "silicaQuarry", level: 2, reason: "A level 2 Silica Quarry unlocks Glassworks." },
  { facilityId: "wireMill", level: 1, reason: "Copper Wire goes into electronics." },
  { facilityId: "glassworks", level: 1, reason: "Glass goes into electronics." },
  { facilityId: "wireMill", level: 2, reason: "Level 2 Wire Mill and Glassworks unlock the Electronics Assembler." },
  { facilityId: "glassworks", level: 2, reason: "Level 2 Wire Mill and Glassworks unlock the Electronics Assembler." },
  { facilityId: "electronicsAssembler", level: 1, reason: "Electronics lead to Phones, your first big money maker." },
  { facilityId: "electronicsAssembler", level: 2, reason: "A level 2 Electronics Assembler unlocks the Phone Factory." },
  { facilityId: "phoneFactory", level: 1, reason: "Phones sell for cash automatically as soon as they are made." },
];

export function getRecommendation(state: GameState): Recommendation | null {
  const facilities = state.facilities;
  const make = (facilityId: FacilityId, reason: string): Recommendation => {
    const research = !facilities[facilityId].unlocked;
    return {
      facilityId,
      title: research ? `Research & build a ${facilities[facilityId].name}` : `${level(state, facilityId) > 0 ? "Upgrade" : "Build"} ${level(state, facilityId) > 0 ? `${facilities[facilityId].name} to Lv ${level(state, facilityId) + 1}` : `a ${facilities[facilityId].name}`}`,
      reason: research ? `${reason} Unlock it for ${getResearchCost(facilityId)} RP.` : reason,
    };
  };
  const reachable = (facilityId: FacilityId) => facilities[facilityId].unlocked || isResearchable(state, facilityId);
  const power = powerOf(state);
  const anyBuilt = Object.values(facilities).some((facility) => facility.level > 0 && facility.id !== "coalGenerator");
  if (level(state, "coalGenerator") > 0 || anyBuilt) {
    // Needs first: a short grid or a full workforce blocks everything else.
    if (power.consumption > power.production * 0.85 && power.consumption > 0) {
      // Cheapest reachable power source; fuel-free ones win once coal is in deficit.
      const coalShort = getNetResourceRate(state, "coal") < 0;
      const sources = (["solarPanels", "windTurbines", "coalGenerator"] as FacilityId[])
        .filter((id) => reachable(id) && !(id === "coalGenerator" && coalShort && (reachable("solarPanels") || reachable("windTurbines"))))
        .sort((a, b) => getFacilityUpgradeCost(facilities[a]).cash / (facilities[a].outputRate.power ?? 1) - getFacilityUpgradeCost(facilities[b]).cash / (facilities[b].outputRate.power ?? 1));
      const option = sources[0] ?? "coalGenerator";
      return make(option, `Your grid is at ${Math.round((power.consumption / Math.max(1, power.production)) * 100)}% load. Add power before building more machines, or they will shut off.`);
    }
    if (state.workforce.activeDemand >= state.workforce.capacity - 2 && facilities.workerHousing.unlocked) {
      return make("workerHousing", `You're using ${state.workforce.activeDemand} of ${state.workforce.capacity} workers. Add housing so new buildings can run.`);
    }
    if (level(state, "coalGenerator") > 0 && level(state, "coalExcavator") > 0 && level(state, "coalExcavator") < 8 && getNetResourceRate(state, "coal") < 0 && stock(state, "coal") < 300) {
      return make("coalExcavator", `Coal is running low (${Math.round(stock(state, "coal"))} left) and you burn more than you mine.`);
    }
  }
  const goal = OPENING_GOALS.find((entry) => reachable(entry.facilityId) && level(state, entry.facilityId) < entry.level);
  if (goal) return make(goal.facilityId, goal.reason);
  // Then work toward the next milestone: build its key facility, or the next step on the way to it.
  const milestone = getNextMilestone(state);
  if (milestone) {
    const step = stepToward(state, milestone.icon, 1, new Set());
    if (step) return make(step, step === milestone.icon ? `Needed for the "${milestone.name}" milestone: ${milestone.goal.toLowerCase()}.` : `A step toward ${facilities[milestone.icon].name}, for the "${milestone.name}" milestone.`);
  }
  // After the opening: the cheapest unbuilt facility you can build, from the earliest era.
  const options = Object.values(facilities)
    .filter((facility) => reachable(facility.id) && facility.level === 0)
    .sort((a, b) => TECH_NODES[a.id].era - TECH_NODES[b.id].era || Number(b.unlocked) - Number(a.unlocked) || Number(canAffordFacility(state, b.id)) - Number(canAffordFacility(state, a.id)) || a.upgrade.base.cash - b.upgrade.base.cash);
  const next = options[0];
  if (next) return make(next.id, TECH_NODES[next.id].why);
  // Everything reachable is built: upgrade a requirement to open up the next facility.
  const locked = Object.values(facilities).filter((facility) => !facility.unlocked).sort((a, b) => TECH_NODES[a.id].era - TECH_NODES[b.id].era);
  for (const target of locked) {
    const step = stepToward(state, target.id, 1, new Set());
    if (step && step !== target.id) return make(step, `Opens the way to ${target.name}.`);
  }
  return null;
}

/** The next thing to build or upgrade on the way to `target` reaching `wanted` levels, or null if it's done or blocked. */
function stepToward(state: GameState, target: FacilityId, wanted: number, trail: Set<FacilityId>): FacilityId | null {
  const facility = state.facilities[target];
  if (facility.level >= wanted || trail.has(target)) return null;
  trail.add(target);
  for (const requirement of facility.unlockRequirements) {
    const step = stepToward(state, requirement.facilityId, requirement.level, trail);
    if (step) return step;
  }
  return facility.unlocked || isResearchable(state, target) ? target : null;
}

export function getCatalogState(state: GameState, facilityId: FacilityId, recommendedId: FacilityId | null): CatalogState {
  const facility = state.facilities[facilityId];
  const researchable = isResearchable(state, facilityId);
  if (facilityId === recommendedId && (facility.unlocked || researchable)) return "recommended";
  if (!facility.unlocked) return researchable ? "researchable" : "locked";
  if (facility.level > 0) return "built";
  return canAffordFacility(state, facilityId) ? "available" : "unaffordable";
}

/** Resources everything is built from, with a hint when you have no way to make more. */
export const WATCHED_RESOURCES: ResourceId[] = ["steelPlate", "concrete", "coal", "ironOre"];

export function getWatchList(state: GameState) {
  return WATCHED_RESOURCES.map((resourceId) => {
    const rate = getNetResourceRate(state, resourceId);
    const producer = Object.values(state.facilities).find((facility) => facility.level > 0 && (facility.outputRate[resourceId] ?? 0) > 0);
    const amount = stock(state, resourceId);
    const warn = !producer ? "no producer" : rate < 0 && amount < 200 ? "running low" : null;
    return { resourceId, name: RESOURCE_DEFINITIONS[resourceId].name, amount, rate, warn };
  });
}

/** The era the player is working in: the furthest era with something built, or the era of the recommended build. */
export function getCurrentEra(state: GameState, recommendedId: FacilityId | null): number {
  const builtEra = Math.max(1, ...Object.values(state.facilities).filter((facility) => facility.level > 0).map((facility) => TECH_NODES[facility.id].era));
  return Math.max(builtEra, recommendedId ? TECH_NODES[recommendedId].era : 1);
}
