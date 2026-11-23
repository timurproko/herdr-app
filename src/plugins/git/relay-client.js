import { appHome, readTextFile, shared, setShared, checking, connectWebSocket } from '../api.js';
import { relayURL, credentials, credentialPath } from './relay-config.js';
import { relayNotice, mainChanged } from './relay-notice.js';
import { RELAY_STATE, RELAY_RETRY, RELAY_LEASE, RELAY_HEARTBEAT, RELAY_HANDOFF, relayMainRevision } from './relay-state.js';

// One owner in mounted chrome, not one socket per consumer or selected repo.
// The small I/O seam is used by fixtures; production never exports credentials.
let instance = 0;
export class RelayClient {
  constructor(io = {}) {
    this.io = { shared, setShared, checking, appHome, readTextFile, connect:connectWebSocket, now:Date.now, random:Math.random, isClosed:()=>false, ...io };
    this.token = `${this.io.now()}-${this.io.random()}-${++instance}`; this.serial = 0; this.retry = 0; this.seen = new Set();
  }
  state() { return this.io.shared(RELAY_STATE); }
  configRevision() { return JSON.stringify([this.io.shared('custom.git.webhook-state')?.revision || 0, this.io.shared(RELAY_RETRY) || 0]); }
  live() {
    return !this.io.isClosed() && !this.io.checking() && this.io.shared('custom.plugins')?.git?.enabled !== false
      && this.options?.enabled && relayURL(this.options.setting('relay')) === this.relay
      && this.configRevision() === this.revision;
  }
  current(serial = this.serial) { return serial === this.serial && this.live() && this.state()?.owner === this.token; }
  publish(change) {
    if (this.current()) this.io.setShared(RELAY_STATE, { ...this.state(), ...change });
  }
  close() {
    this.serial++; this.started = false;
    const socket = this.socket; this.socket = null;
    if (socket) Promise.resolve(socket.close()).catch(() => {});
  }
  stop() {
    this.close(); this.heartbeat = null;
    if (this.state()?.owner === this.token) this.io.setShared(RELAY_STATE, { ...this.state(), owner:null, until:0, status:'idle' });
  }
  sync(cx, options) {
    const relay = relayURL(options.setting('relay'));
    const revision = this.configRevision();
    const scope = JSON.stringify([this.io.appHome(), relay, revision, Boolean(options.enabled && this.io.shared('custom.plugins')?.git?.enabled !== false)]);
    if (scope !== this.scope) { this.stop(); this.scope = scope; this.retry = 0; this.retryAt = 0; this.blocked = false; this.seen.clear(); }
    this.options = options; this.relay = relay; this.revision = revision;
    if (!relay || !this.live()) { this.stop(); return; }
    this.tick(cx);
    if (!this.heartbeat) {
      const token = this.heartbeat = {};
      const beat = cx => {
        if (this.heartbeat !== token) return;
        if (!this.live()) { this.stop(); return; }
        this.tick(cx); cx.timer.after(RELAY_HEARTBEAT, beat);
      };
      cx.timer.after(RELAY_HEARTBEAT, beat);
    }
  }
  tick(cx) {
    const now = this.io.now(), previous = this.state();
    if (previous?.owner !== this.token) {
      if (this.started) this.close();
      if (previous?.owner && previous.until > now && previous.until <= now + RELAY_LEASE) return;
      // Revoke before acquiring; allow a previous live owner's heartbeat to close
      // its socket before opening another. Dead mod contexts own no live reader.
      this.io.setShared(RELAY_STATE, { ...(previous?.scope === this.scope ? previous : { ready:0, sequence:0, repositories:{}, evicted:0 }),
        scope:this.scope, owner:this.token, until:now + RELAY_LEASE, status:'connecting' });
      this.retryAt = now + (previous?.owner ? RELAY_HANDOFF : 0);
    } else if (previous.until - now <= RELAY_LEASE - RELAY_HEARTBEAT) this.publish({ until:now + RELAY_LEASE });
    if (!this.started && !this.blocked && now >= (this.retryAt || 0)) this.connect(cx);
  }
  connect(cx) {
    this.started = true;
    const serial = this.serial, current = () => this.current(serial);
    cx.spawn(async cx => {
      let socket;
      try {
        if (!current()) return;
        let keys;
        try { keys = credentials(await this.io.readTextFile(credentialPath(this.io.appHome()))); } catch { /* Absent/unreadable is setup, not transport retry. */ }
        if (!current()) return;
        if (!keys) { this.blocked = true; this.publish({ status:'setup' }); return; }
        this.publish({ status:'connecting' });
        socket = await this.io.connect(this.relay.replace(/^https:/,'wss:') + '/events');
        if (!current()) { await socket.close(); return; }
        this.socket = socket;
        await socket.write(JSON.stringify({ type:'authenticate', token:keys.token }));
        let ready = false;
        cx.timer.after(10000, () => { if (current() && !ready) Promise.resolve(socket.close()).catch(() => {}); });
        while (current()) {
          const text = await socket.read(); if (!current()) return;
          if (typeof text !== 'string' || text.length > 4096) throw Error('Invalid relay message');
          const message = JSON.parse(text);
          if (!ready) {
            if (message?.type !== 'ready' || message.protocol !== 1) throw Error('Relay authentication failed');
            ready = true; this.retry = 0;
            this.publish({ status:'connected', ready:(this.state()?.ready || 0) + 1 }); cx.notify(); continue;
          }
          const event = relayNotice(message);
          if (!event || this.seen.has(event.delivery)) continue;
          this.seen.add(event.delivery); if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value);
          const state = this.state(), sequence = (state.sequence || 0) + 1, name = event.repository.toLowerCase();
          const repositories = { ...state.repositories };
          repositories[name] = { revision:sequence, main:mainChanged(event, name) ? sequence : repositories[name]?.main || 0 };
          let evicted = state.evicted || 0;
          if (Object.keys(repositories).length > 128) {
            const oldest = Object.keys(repositories).filter(key => key !== 'timurproko/herdr-app').sort((a,b) => repositories[a].revision - repositories[b].revision)[0];
            delete repositories[oldest]; evicted++;
          }
          this.publish({ sequence, repositories, evicted }); cx.notify();
        }
      } catch {
        if (current()) this.publish({ status:'disconnected' });
      } finally {
        if (socket) await Promise.resolve(socket.close()).catch(() => {});
        if (current()) {
          this.socket = null; this.started = false;
          this.retryAt = this.io.now() + Math.min(60000, 1000 * 2 ** Math.min(this.retry++, 6)) * (0.9 + this.io.random() * 0.1);
          cx.notify();
        }
      }
    });
  }
}

export function syncRelay({ owner, cx, enabled, setting }) {
  if (checking() || owner.sidebarClosed || owner.gitRelayClosed) return;
  // Lifecycle calls originate in render. Yield before leases, I/O or publication.
  owner.gitRelayContext = { enabled, setting };
  if (owner.gitRelayQueued) return;
  owner.gitRelayQueued = true;
  cx.spawn(async cx => {
    await Promise.resolve(); owner.gitRelayQueued = false;
    if (owner.sidebarClosed || owner.gitRelayClosed) return;
    owner.gitRelay ??= new RelayClient({isClosed:()=>owner.sidebarClosed || owner.gitRelayClosed});
    owner.gitRelay.sync(cx, owner.gitRelayContext);
  });
}
export function closeRelay({ owner }) {
  if (!owner) return;
  owner.gitRelayClosed = true;
  owner.gitRelay?.stop();
}
export function stopRelay() {
  const state = shared(RELAY_STATE);
  if (state?.owner) setShared(RELAY_STATE, { ...state, owner:null, until:0, status:'idle' });
}
export function watchUpdates({ owner, cx, enabled, setting, repository, onInvalidate }) {
  if (checking() || owner.sidebarClosed || owner.gitRelayClosed || !enabled || !relayURL(setting('relay'))) { owner.gitUpdateSeen = null; return; }
  const state = shared(RELAY_STATE);
  if (!state?.ready) return;
  const relay = relayURL(setting('relay'));
  const revision = relayMainRevision(state, repository);
  if (revision === owner.gitUpdateSeen) return;
  owner.gitUpdateSeen = revision;
  const scope = state.scope;
  const current = () => !checking() && !owner.sidebarClosed && !owner.gitRelayClosed
    && shared('custom.plugins')?.git?.enabled !== false && relayURL(setting('relay')) === relay
    && shared(RELAY_STATE)?.scope === scope && Boolean(shared(RELAY_STATE)?.owner);
  cx.spawn(async cx => {
    await Promise.resolve();
    if (current() && relayMainRevision(shared(RELAY_STATE), repository) === revision) onInvalidate(cx,current);
  });
}
