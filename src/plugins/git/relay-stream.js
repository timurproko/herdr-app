// Only sidebar.sync's non-footer chrome owns transport. Panel/Settings copies only read.
import { shared, setShared, checking } from '../api.js';
import { GitWebhooks } from './relay-socket.js';
import { relayURL } from './relay-config.js';
import { RELAY_EVENTS, RELAY_RETRY, nextRelayEvent } from './relay-events.js';
// Public configuration identity, not authentication or a credential fingerprint.
// All windows must merge into the same generation instead of alternating epochs.
const generationFor = scope => `relay-${[...scope].reduce((hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16)}`;

export function stopRelay({ owner }) {
  if (!owner) return;
  owner.gitRelayClosed = true;
  owner.gitRelayQueued = false;
  owner.gitRelayContext = null;
  owner.gitRelayScope = null;
  owner.gitRelayRecord = null;
  owner.gitRelaySocket?.stop();
  // Do not clear shared counters: another window can still own a live stream.
}

export function syncRelay(context) {
  const { owner, cx } = context;
  if (!owner || owner.sidebarClosed || owner.gitRelayClosed) return;
  if (checking()) { owner.gitRelaySocket?.stop(); owner.gitRelayScope = undefined; return; }
  owner.gitRelayContext = context;
  if (owner.gitRelayQueued) return;
  owner.gitRelayQueued = true;
  cx.spawn(async cx => {
    if (owner.sidebarClosed || owner.gitRelayClosed) return;
    await Promise.resolve(); // shared publication and socket work must yield out of render
    if (owner.sidebarClosed || owner.gitRelayClosed) return;
    owner.gitRelayQueued = false;
    const latest = owner.gitRelayContext;
    const configured = latest.setting('relay'), relay = relayURL(configured);
    const enabled = latest.enabled && shared('custom.plugins')?.git?.enabled !== false;
    const revision = shared('custom.git.webhook-state')?.revision || 0;
    const scope = enabled && relay ? JSON.stringify([relay, revision]) : null;
    const socket = owner.gitRelaySocket ??= new GitWebhooks();
    if (owner.gitRelayScope !== scope) {
      socket.stop();
      owner.gitRelayScope = scope;
      const generation = scope ? generationFor(scope) : 'inactive', previous = shared(RELAY_EVENTS);
      owner.gitRelayRecord = previous?.version === 1 && previous.generation === generation ? previous
        : { version: 1, generation, active: Boolean(scope), connected: false, ready: 0, sequence: 0, repositories: {} };
      if (owner.gitRelayRecord !== previous) setShared(RELAY_EVENTS, owner.gitRelayRecord);
    }
    if (!scope) return;
    const record = owner.gitRelayRecord;
    const current = () => !owner.sidebarClosed && !owner.gitRelayClosed && !checking()
      && owner.gitRelayRecord?.generation === record.generation
      && (shared('custom.git.webhook-state')?.revision || 0) === revision
      && owner.gitRelayScope === scope && shared('custom.plugins')?.git?.enabled !== false
      && owner.gitRelayContext.enabled && owner.gitRelayContext.setting('relay') === configured;
    const publish = patch => {
      if (!current()) return;
      const previous = shared(RELAY_EVENTS);
      owner.gitRelayRecord = patch(previous?.version === 1 && previous.generation === record.generation ? previous : owner.gitRelayRecord);
      setShared(RELAY_EVENTS, owner.gitRelayRecord);
    };
    const retry = shared(RELAY_RETRY);
    if (retry?.generation === record.generation && retry.at !== owner.gitRelayRetry) {
      owner.gitRelayRetry = retry.at;
      if (!record.connected && Date.now() - retry.at >= 0 && Date.now() - retry.at < 10000) socket.retryNow();
    }
    socket.sync(cx, { enabled, scope, relay, isCurrent: current,
      onState: state => publish(value => ({ ...value, connected: state === 'connected' })),
      onChange: event => publish(value => nextRelayEvent(value, event)) });
  });
}
