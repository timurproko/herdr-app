// Consumer only: mounted chrome owns the one authenticated relay socket.
import { shared, setShared, checking } from './host.js';
import { pluginById, pluginSetting, sidebarPanelEnabled } from './plugins.js';
import { relayURL } from './plugins/git/relay-config.js';
import { RELAY_STATE, RELAY_RETRY, relayRevision } from './plugins/git/relay-state.js';
export class GitWebhooks {
  constructor({debounce=2000}={}) { this.state = 'idle'; this.status = ''; this.debounce=debounce; }
  stop() { this.scope = null; this.revision = null; this.pending = null; this.delivery = null; this.revisions=null; }
  sync(cx, { enabled, scope, repository, repositories, catchup=true, onChange, isCurrent = () => true }) {
    if (!enabled || checking()) { this.stop(); return; }
    const relay = relayURL(pluginSetting(pluginById('git'), 'relay'));
    if (!relay) { this.stop(); this.state = 'setup'; this.status = 'Live CI: configure webhooks in Settings › Plugins › Git'; return; }
    const state = shared(RELAY_STATE);
    this.state = state?.status || 'connecting';
    this.status = this.state === 'connected' ? '' : this.state === 'setup'
      ? 'Live CI: create credentials in Settings › Plugins › Git' : 'Live CI disconnected · reconnecting (manual Refresh remains available)';
    const names = repositories || [repository];
    const revisions=new Map(names.map(name=>[name,relayRevision(state,name)]));
    const revision = JSON.stringify([...revisions]);
    if (scope === this.scope && revision === this.revision) return;
    const changedScope = scope !== this.scope;
    const changed=names.filter(name=>changedScope || this.revisions?.get(name)!==revisions.get(name));
    if (changedScope) this.stop();
    this.scope = scope; this.revision = revision;this.revisions=revisions;
    if ((changedScope && !catchup) || (!changedScope && !state?.ready)) return;
    // sync runs during native rendering. cx.spawn may begin immediately, so
    // explicitly yield before calling consumers that can notify or start reads.
    // One pending delivery coalesces revisions in the same view scope.
    this.pending = { scope, revision, relay, transportScope:state?.scope, onChange, isCurrent,
      repositories:new Set([...(this.pending?.repositories??[]),...changed]) };
    if (this.delivery) return;
    const delivery = this.delivery = {};
    const deliver=async cx=>{
      await Promise.resolve();
      if (this.delivery !== delivery) return;
      const pending = this.pending; this.delivery = null; this.pending = null;
      if (!pending || checking() || !sidebarPanelEnabled('changes') || !pending.isCurrent() || this.scope !== pending.scope || this.revision !== pending.revision
          || relayURL(pluginSetting(pluginById('git'), 'relay')) !== pending.relay || shared(RELAY_STATE)?.scope !== pending.transportScope) {
        this.stop(); return;
      }
      for(const repository of pending.repositories)pending.onChange({repository}, cx);
    };
    cx.spawn(async view=>{
      await Promise.resolve();
      if(this.delivery!==delivery)return;
      if(this.debounce>0 && view.timer?.after)view.timer.after(this.debounce,next=>next.spawn(deliver));
      else await deliver(view);
    });
  }
  retryNow() { this.stop(); setShared(RELAY_RETRY, (shared(RELAY_RETRY) || 0) + 1); }
}
