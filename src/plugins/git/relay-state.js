// Bounded public invalidation revisions; never credentials, payloads or jobs.
export const RELAY_STATE = 'custom.git.relay-runtime';
export const RELAY_RETRY = 'custom.git.relay-retry';
export const RELAY_LEASE = 5000, RELAY_HEARTBEAT = 1000, RELAY_HANDOFF = 1500;
export function relayRevision(state, repository) {
  const row = state?.repositories?.[repository?.toLowerCase()];
  return [state?.scope || '', state?.ready || 0, state?.evicted || 0, row?.revision || 0].join(':');
}
export function relayMainRevision(state, repository) {
  const row = state?.repositories?.[repository.toLowerCase()];
  return [state?.scope || '', state?.ready || 0, row?.main || 0].join(':');
}
