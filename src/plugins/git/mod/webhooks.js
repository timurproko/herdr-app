// Consumer only: mounted chrome owns the one authenticated relay socket.
import { shared, setShared, checking } from './host.js';
import { pluginById, pluginSetting, sidebarPanelEnabled } from './plugins.js';
import { relayURL } from './plugins/git/relay-config.js';
import { RELAY_STATE, RELAY_RETRY, relayRevision } from './plugins/git/relay-state.js';
export class GitWebhooks {
  constructor() { this.state = 'idle'; this.status = ''; }
  stop() { this.scope = null; this.revision = null; this.pending = null; this.delivery = null; }
  sync(cx, { enabled, scope, repository, repositories, onChange, isCurrent = () => true }) {
    if (!enabled || checking()) { this.stop(); return; }
    const relay = relayURL(pluginSetting(pluginById('git'), 'relay'));
    if (!relay) { this.stop(); this.state = 'setup'; this.status = 'Live CI: configure webhooks in Settings › Plugins › Git'; return; }
    const state = shared(RELAY_STATE);
    this.state = state?.status || 'connecting';
    this.status = this.state === 'connected' ? '' : this.state === 'setup'
      ? 'Live CI: create credentials in Settings › Plugins › Git' : 'Live CI disconnected · reconnecting (manual Refresh remains available)';
    const names = repositories || [repository];
    const revision = JSON.stringify(names.map(name => relayRevision(state, name)));
    if (scope === this.scope && revision === this.revision) return;
    const changedScope = scope !== this.scope;
    if (changedScope) this.stop();
    this.scope = scope; this.revision = revision;
    if (!changedScope && !state?.ready) return;
    // sync runs during native rendering. cx.spawn may begin immediately, so
    // explicitly yield before calling consumers that can notify or start reads.
    // One pending delivery coalesces revisions in the same view scope.
    this.pending = { scope, revision, relay, transportScope:state?.scope, onChange, isCurrent };
    if (this.delivery) return;
    const delivery = this.delivery = {};
    cx.spawn(async cx => {
      await Promise.resolve();
      if (this.delivery !== delivery) return;
      const pending = this.pending; this.delivery = null; this.pending = null;
      if (!pending || checking() || !sidebarPanelEnabled('changes') || !pending.isCurrent() || this.scope !== pending.scope || this.revision !== pending.revision
          || relayURL(pluginSetting(pluginById('git'), 'relay')) !== pending.relay || shared(RELAY_STATE)?.scope !== pending.transportScope) {
        this.stop(); return;
      }
      pending.onChange(null, cx);
    });
  }
  retryNow() { this.stop(); setShared(RELAY_RETRY, (shared(RELAY_RETRY) || 0) + 1); }
}
