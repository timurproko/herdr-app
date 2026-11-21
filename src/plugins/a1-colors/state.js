// A1 color-matching preference and in-flight synchronization generation.
import { shared, setShared } from '../api.js';

export const MATCH_AGENT_KEY = 'custom.match-agent-session-color';
// Bumped on every switch, so a sync started before it is ignored afterwards.
export const AGENT_COLOR_EPOCH_KEY = 'custom.agent-space-color-epoch';
const saved = () => shared('custom.plugins')?.['a1-colors'];
export const legacyColorPreference = () => shared(MATCH_AGENT_KEY) === true;
export const a1Enabled = () => typeof saved()?.enabled === 'boolean' ? saved().enabled : legacyColorPreference();
const toggle = (key, fallback) => typeof saved()?.settings?.[key] === 'boolean' ? saved().settings[key] : fallback;
export const matchAgentSessionColor = () => a1Enabled() && toggle('matchSpaceColor', legacyColorPreference());
export function invalidateColorSync() {
  setShared(AGENT_COLOR_EPOCH_KEY, Number(shared(AGENT_COLOR_EPOCH_KEY) ?? 0) + 1);
}
export function setA1Enabled(enabled) {
  const all = shared('custom.plugins') ?? {};
  setShared('custom.plugins', { ...all, 'a1-colors': { ...saved(), enabled: enabled === true } });
  invalidateColorSync();
}
export function setMatchAgentSessionColor(enabled) {
  invalidateColorSync();
  setShared(MATCH_AGENT_KEY, enabled === true);
}
