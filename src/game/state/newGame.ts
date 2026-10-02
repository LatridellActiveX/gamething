// A brand-new game: only Era I starts unlocked; everything else is researched with RP.
import { TECH_NODES } from "../tech/techTree";
import { INITIAL_GAME_STATE } from "./initialState";
import type { GameState } from "./types";

export function createNewGame(): GameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  for (const facility of Object.values(state.facilities)) {
    facility.unlocked = TECH_NODES[facility.id].era === 1 && facility.unlockRequirements.length === 0;
  }
  state.progress.unlocked = Object.values(state.facilities).filter((facility) => facility.unlocked).map((facility) => facility.id);
  return state;
}
