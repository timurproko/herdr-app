// Consumer only: mounted chrome owns the one authenticated relay socket.
import { shared, setShared, checking } from './host.js';
import { pluginById, pluginSetting } from './plugins.js';
import { relayURL } from './plugins/git/relay-config.js';
import { RELAY_STATE, RELAY_RETRY, relayRevision } from './plugins/git/relay-state.js';
export class GitWebhooks {
  constructor() { this.state = 'idle'; this.status = ''; }
  stop() { this.scope = null; this.revision = null; }
  sync(cx, { enabled, scope, repository, repositories, onChange }) {
    if (!enabled || checking()) { this.stop(); return; }
    const relay = relayURL(pluginSetting(pluginById('git'), 'relay'));
    if (!relay) { this.state = 'setup'; this.status = 'Live CI: configure webhooks in Settings › Plugins › Git'; return; }
    const state = shared(RELAY_STATE);
    this.state = state?.status || 'connecting';
    this.status = this.state === 'connected' ? '' : this.state === 'setup'
      ? 'Live CI: create credentials in Settings › Plugins › Git' : 'Live CI disconnected · reconnecting (manual Refresh remains available)';
    const names = repositories || [repository];
    const revision = JSON.stringify(names.map(name => relayRevision(state, name)));
    if (scope === this.scope && revision === this.revision) return;
    const changedScope = scope !== this.scope;
    this.scope = scope; this.revision = revision;
    if (changedScope || state?.ready) onChange(null, cx);
  }
  retryNow() { this.stop(); setShared(RELAY_RETRY, (shared(RELAY_RETRY) || 0) + 1); }
}
