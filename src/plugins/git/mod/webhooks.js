// Panel-local reader of the chrome-owned stream. Hiding this reader never closes transport.
import { checking } from './host.js';
import { relayEvents, requestRelayRetry } from './plugins/git/relay-events.js';
export class GitWebhooks {
  stop() { this.scope = null; this.mark = null; }
  sync(cx, { enabled, scope, onChange }) {
    if (!enabled || checking()) { this.stop(); return; }
    const value = relayEvents();
    if (value?.version !== 1 || !value.active || !value.connected) return;
    let repository;
    try { repository = JSON.parse(scope)[1]?.toLowerCase(); } catch { return; }
    const mark = JSON.stringify([value.generation, value.ready, value.repositories?.[repository]?.sequence || 0]);
    if (scope === this.scope && mark === this.mark) return;
    const initial = scope !== this.scope;
    this.scope = scope; this.mark = mark;
    // The existing panel queue still owns visibility, repository and request guards.
    onChange(initial ? null : { repository }, cx);
  }
  retryNow() { requestRelayRetry(); }
}
