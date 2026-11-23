// Public invalidations, not a webhook body or an instruction. Never export credentials.
import { shared, setShared } from '../api.js';
export const RELAY_EVENTS = 'custom.git.webhook-events';
export const RELAY_RETRY = 'custom.git.webhook-retry';
export const relayEvents = () => shared(RELAY_EVENTS);
export function nextRelayEvent(record, event) {
  if (!event) return { ...record, connected: true, ready: record.ready + 1 };
  const name = event.repository.toLowerCase(), sequence = record.sequence + 1;
  const repositories = { ...record.repositories };
  const previous = repositories[name];
  delete repositories[name]; // insertion order is the bounded least-recently-noticed order
  repositories[name] = { sequence, push: event.event === 'push' ? sequence : previous?.push || 0 };
  const names = Object.keys(repositories);
  if (names.length > 128) delete repositories[names[0]];
  return { ...record, connected: true, sequence, repositories };
}
export function requestRelayRetry() {
  const record = relayEvents();
  if (record?.version !== 1 || !record.active || record.connected) return;
  const previous = shared(RELAY_RETRY);
  if (previous?.generation === record.generation && Date.now() - previous.at < 10000) return;
  setShared(RELAY_RETRY, { generation: record.generation, at: Date.now() });
}
