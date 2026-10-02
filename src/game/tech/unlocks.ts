// Unlock rules. Unlocks are sticky: once a facility is unlocked (or built) it stays unlocked
// forever, recorded in state.progress.unlocked, so rule changes can never take access away.
import type { FacilityId, GameState } from "../state/types";

export function meetsRequirements(state: GameState, facilityId: FacilityId): boolean {
  return state.facilities[facilityId].unlockRequirements.every((requirement) => (state.facilities[requirement.facilityId]?.level ?? 0) >= requirement.level);
}

/** Whether the current rules unlock this facility automatically (without any player action). */
export function isUnlockedByRules(state: GameState, facilityId: FacilityId): boolean {
  return meetsRequirements(state, facilityId);
}

export function markUnlocked(state: GameState, facilityId: FacilityId) {
  const facility = state.facilities[facilityId];
  if (!facility.unlocked) {
    facility.unlocked = true;
    if (facility.level === 0) facility.status = "offline";
  }
  if (!state.progress.unlocked.includes(facilityId)) state.progress.unlocked.push(facilityId);
}

/** Re-applies sticky unlocks and unlocks anything the rules now allow. Never locks anything. */
export function syncUnlocks(state: GameState): GameState {
  const sticky = new Set(state.progress.unlocked);
  for (const facility of Object.values(state.facilities)) {
    if (facility.unlocked || facility.level > 0 || sticky.has(facility.id) || isUnlockedByRules(state, facility.id)) markUnlocked(state, facility.id);
  }
  return state;
}
