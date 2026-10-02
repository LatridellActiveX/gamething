// The six-step guided start. Every step is derived from the current game state, so existing
// saves automatically skip what they've already done and nothing new needs to be stored
// (except the "dismissed" flag).
import type { FacilityId, GameState } from "../state/types";

export interface GuideStep {
  id: string;
  label: string;
  hint: string;
  icon: FacilityId | "market";
  done: (state: GameState) => boolean;
}

const built = (state: GameState, id: FacilityId) => state.facilities[id].level > 0;

export const GUIDE_STEPS: GuideStep[] = [
  { id: "power", label: "Build a Coal Generator", hint: "Power comes first", icon: "coalGenerator", done: (state) => built(state, "coalGenerator") || built(state, "solarPanels") },
  { id: "mine", label: "Mine Coal and Iron Ore", hint: "Coal Excavator + Iron Ore Mine", icon: "coalExcavator", done: (state) => built(state, "coalExcavator") && built(state, "ironOreMine") },
  { id: "workers", label: "Add Worker Housing", hint: "+15 workers per level", icon: "workerHousing", done: (state) => built(state, "workerHousing") },
  { id: "smelt", label: "Smelt Iron Ingots", hint: "Mines to Lv 2, then a Blast Furnace", icon: "blastFurnace", done: (state) => built(state, "blastFurnace") },
  { id: "steel", label: "Make your own Steel Plate", hint: "Blast Furnace Lv 2, then a Rolling Mill", icon: "rollingMill", done: (state) => built(state, "rollingMill") },
  { id: "sell", label: "Sell your first goods", hint: "Cargo tab: turn on auto-sell", icon: "market", done: (state) => Object.values(state.warehouses.central.inventory).some((entry) => entry.autoSell.enabled && entry.autoSell.amount > 0) },
];

export function getGuideProgress(state: GameState) {
  const steps = GUIDE_STEPS.map((step) => ({ ...step, complete: step.done(state) }));
  const currentIndex = steps.findIndex((step) => !step.complete);
  const doneCount = steps.filter((step) => step.complete).length;
  return {
    steps,
    currentIndex,
    doneCount,
    finished: currentIndex === -1,
    /** Show the guide until it's finished or the player hides it. */
    active: currentIndex !== -1 && !state.progress.guideDismissed,
  };
}
