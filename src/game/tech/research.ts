// Research Points and milestones (schema v2 `progress`).
// - Era I is free. Every later era opens when its milestone is complete.
// - Inside an open era, a facility whose prerequisites are met costs Research Points to unlock.
// - Running facilities earn RP. Milestones also give a one-off RP reward.
// Unlocks stay sticky (see unlocks.ts), so nothing a save already has is ever taken away.
import type { FacilityId, GameState, ResourceId } from "../state/types";
import { TECH_NODES } from "./techTree";

/** RP needed to research one facility, by era (index = era). */
export const ERA_RP_COST = [0, 0, 10, 25, 45, 70, 100, 150, 220];

export interface Milestone {
  id: string;
  /** The era this milestone opens (null for the final milestone). */
  opensEra: number | null;
  name: string;
  goal: string;
  reward: number;
  icon: FacilityId;
  progress: (state: GameState) => { value: number; target: number };
}

const produced = (state: GameState, id: ResourceId) => state.progress.produced[id] ?? 0;
const extractionLevels = (state: GameState) => Object.values(state.facilities).filter((facility) => TECH_NODES[facility.id].category === "extraction").reduce((total, facility) => total + facility.level, 0);

export const MILESTONES: Milestone[] = [
  { id: "gridOnline", opensEra: 2, name: "Grid Online", goal: "Run 5 MW of power", reward: 10, icon: "coalGenerator", progress: (state) => ({ value: state.power.productionPerSecond, target: 5 }) },
  { id: "breakingGround", opensEra: 3, name: "Breaking Ground", goal: "Reach 4 total levels of mines and pumps", reward: 25, icon: "ironOreMine", progress: (state) => ({ value: extractionLevels(state), target: 4 }) },
  { id: "firstIngot", opensEra: 4, name: "First Ingot", goal: "Smelt 100 Iron Ingots", reward: 50, icon: "blastFurnace", progress: (state) => ({ value: produced(state, "ironIngot"), target: 100 }) },
  { id: "steelIndependence", opensEra: 5, name: "Steel Independence", goal: "Roll 100 Steel Plates", reward: 80, icon: "rollingMill", progress: (state) => ({ value: produced(state, "steelPlate"), target: 100 }) },
  { id: "firstPhone", opensEra: 6, name: "First Phone Sold", goal: "Make and sell 10 Phones", reward: 120, icon: "phoneFactory", progress: (state) => ({ value: produced(state, "phone"), target: 10 }) },
  { id: "motorWorks", opensEra: 7, name: "Motor Works", goal: "Build 20 Electric Motors", reward: 180, icon: "motorFactory", progress: (state) => ({ value: produced(state, "electricMotor"), target: 20 }) },
  { id: "siliconAge", opensEra: 8, name: "Silicon Age", goal: "Fabricate 10 Microprocessors", reward: 250, icon: "semiconductorCleanroom", progress: (state) => ({ value: produced(state, "microprocessor"), target: 10 }) },
  { id: "orbit", opensEra: null, name: "Orbit", goal: "Build 1 Satellite Bus", reward: 400, icon: "satelliteHangar", progress: (state) => ({ value: produced(state, "satelliteBus"), target: 1 }) },
];

/** The next milestone still to complete, or null when all are done. */
export function getNextMilestone(state: GameState): Milestone | null {
  return MILESTONES.find((milestone) => !state.progress.milestones.includes(milestone.id)) ?? null;
}

export function isMilestoneDone(state: GameState, id: string) {
  return state.progress.milestones.includes(id);
}

export function getEraMilestone(era: number): Milestone | undefined {
  return MILESTONES.find((milestone) => milestone.opensEra === era);
}

export function isEraOpen(state: GameState, era: number): boolean {
  if (era <= 1) return true;
  const milestone = getEraMilestone(era);
  return !milestone || isMilestoneDone(state, milestone.id);
}

export function getResearchCost(facilityId: FacilityId): number {
  return ERA_RP_COST[TECH_NODES[facilityId].era] ?? 0;
}

export function prerequisitesMet(state: GameState, facilityId: FacilityId): boolean {
  return state.facilities[facilityId].unlockRequirements.every((requirement) => (state.facilities[requirement.facilityId]?.level ?? 0) >= requirement.level);
}

/** Era open and prerequisites met: the player can unlock it with RP (whether or not they have enough yet). */
export function isResearchable(state: GameState, facilityId: FacilityId): boolean {
  const facility = state.facilities[facilityId];
  return !facility.unlocked && isEraOpen(state, TECH_NODES[facilityId].era) && prerequisitesMet(state, facilityId);
}

export function canResearch(state: GameState, facilityId: FacilityId): boolean {
  return isResearchable(state, facilityId) && state.progress.researchPoints >= getResearchCost(facilityId);
}

/** Why a locked facility can't be researched yet, in plain English, or null when it can. */
export function getLockReason(state: GameState, facilityId: FacilityId): string | null {
  const facility = state.facilities[facilityId];
  if (facility.unlocked) return null;
  const era = TECH_NODES[facilityId].era;
  if (!isEraOpen(state, era)) {
    const milestone = getEraMilestone(era);
    return milestone ? `Era opens with the "${milestone.name}" milestone: ${milestone.goal.toLowerCase()}.` : "Era not open yet.";
  }
  if (!prerequisitesMet(state, facilityId)) return "Needs its requirements first.";
  const cost = getResearchCost(facilityId);
  if (state.progress.researchPoints < cost) return `Needs ${cost} RP (you have ${Math.floor(state.progress.researchPoints)}).`;
  return null;
}

/** Spends RP to unlock a facility. Returns true when it was researched. */
export function researchFacility(state: GameState, facilityId: FacilityId): boolean {
  if (!canResearch(state, facilityId)) return false;
  state.progress.researchPoints -= getResearchCost(facilityId);
  const facility = state.facilities[facilityId];
  facility.unlocked = true;
  if (facility.level === 0) facility.status = "offline";
  if (!state.progress.unlocked.includes(facilityId)) state.progress.unlocked.push(facilityId);
  return true;
}

/** RP earned per second: each running facility earns 0.01 RP per level, times (1 + its era). */
export const RP_PER_LEVEL = 0.01;

export function getResearchRate(state: GameState): number {
  return Object.values(state.facilities).reduce((total, facility) => (facility.status === "online" && facility.level > 0 ? total + RP_PER_LEVEL * facility.level * (1 + TECH_NODES[facility.id].era) : total), 0);
}

/** Completes any milestone whose goal is met and grants its reward. Returns the ids completed now. */
export function checkMilestones(state: GameState): string[] {
  const completed: string[] = [];
  for (const milestone of MILESTONES) {
    if (isMilestoneDone(state, milestone.id)) continue;
    const { value, target } = milestone.progress(state);
    if (value + 1e-9 < target) continue;
    state.progress.milestones.push(milestone.id);
    state.progress.researchPoints += milestone.reward;
    completed.push(milestone.id);
  }
  return completed;
}

/** Old saves: any era the player has already built in counts as reached, so its milestones are marked done (with rewards). */
export function backfillMilestones(state: GameState): string[] {
  const builtEra = Math.max(1, ...Object.values(state.facilities).filter((facility) => facility.level > 0).map((facility) => TECH_NODES[facility.id].era));
  const completed: string[] = [];
  for (const milestone of MILESTONES) {
    if (milestone.opensEra === null || milestone.opensEra > builtEra || isMilestoneDone(state, milestone.id)) continue;
    state.progress.milestones.push(milestone.id);
    state.progress.researchPoints += milestone.reward;
    completed.push(milestone.id);
  }
  return completed;
}
