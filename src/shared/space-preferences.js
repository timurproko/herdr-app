// User preferences only; no space IDs, terminals or lifecycle state are persisted here.
import { shared, setShared } from './host.js';
export const SPACE_PREFERENCES = 'custom.spaces.preferences';
export function spacePreferences() {
  const value = shared(SPACE_PREFERENCES);
  return { version: 1, confirmLastTab: value?.confirmLastTab === true, closeOnLastTab: value?.closeOnLastTab !== false };
}
export function updateSpacePreferences(change) {
  const next = spacePreferences();
  for (const key of ['confirmLastTab', 'closeOnLastTab']) if (typeof change[key] === 'boolean') next[key] = change[key];
  setShared(SPACE_PREFERENCES, next);
}
