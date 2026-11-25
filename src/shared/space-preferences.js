// User preferences only; no space IDs, terminals or lifecycle state are persisted here.
import { shared, setShared } from './host.js';
export const SPACE_PREFERENCES = 'custom.spaces.preferences';
export function spacePreferences() {
  const value = shared(SPACE_PREFERENCES);
  return { version: 1, confirmLastTab: value?.confirmLastTab === true, closeOnLastTab: value?.closeOnLastTab !== false, connectFleetToCoordinator: value?.connectFleetToCoordinator === true };
}
export function updateSpacePreferences(change) {
  const next = spacePreferences();
  for (const key of ['confirmLastTab', 'closeOnLastTab', 'connectFleetToCoordinator']) if (typeof change[key] === 'boolean') next[key] = change[key];
  if (next.connectFleetToCoordinator !== spacePreferences().connectFleetToCoordinator) {
    setShared('custom.fleet.generation', (shared('custom.fleet.generation') ?? 0) + 1);
    setShared('custom.fleet.links', null);
    setShared('custom.fleet.reads', {});
  }
  // Keep last-verified identity for instant on; off only revokes visibility/authority.
  setShared(SPACE_PREFERENCES, next);
}
