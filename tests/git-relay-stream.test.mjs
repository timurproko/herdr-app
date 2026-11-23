// Native sockets, chrome lifecycle and the actual panel queue/flush, without a live home/network.
import assert from 'node:assert/strict';
import { loadMod } from '../tools/plugin-harness.mjs';
let clock = 100000, enabled = true, relay = 'https://relay.test', visible = true, eager = false;
let keys = JSON.stringify({ token: 'a'.repeat(64), secret: 'b'.repeat(64) });
let keyGate = null, connectGate = null, keyReads = 0, holdCloseRead = false;
class Clock extends Date { static now() { return clock; } }
const state = new Map(), sockets = [], jobs = [], timers = [], calls = [];
const tick = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const noop = () => {};
const cx = { notify: noop, spawn(fn) { const task = fn(cx); jobs.push(task); }, timer: { after(ms, fn) { timers.push({ at: clock + ms, fn }); } } };
const owner = {}, context = () => ({ owner, cx, enabled, setting: name => name === 'relay' ? relay : false });
const target = { cwd: '/fixture/repo', on: null };
let facts = 0;
const host = {
  appHome: () => '/fixture', checking: () => eager,
  readTextFile: async () => { keyReads++; return keyGate || keys; },
  shared: key => key === 'custom.plugins' ? { git: { enabled } } : state.get(key),
  setShared: (key, value) => state.set(key, JSON.parse(JSON.stringify(value))),
  layout: () => ({ id: 'panel', hidden: !visible, children: [{ id: 'panel-body', active: 'changes' }] }),
  exec: async (program, args) => {
    calls.push({ program, args }); assert.equal(program, 'gh');
    const query = args.find(arg => arg.startsWith('query='));
    if (query.includes('pullRequests(first:')) {
      const closed = query.includes('[CLOSED,MERGED]'), second = args.includes('after=next');
      const start = closed ? 100 : second ? 10 : 0;
      const nodes = Array.from({ length: 10 }, (_, i) => ({ number: start + i + 1, title: `Fact ${facts}`, state: closed ? 'CLOSED' : 'OPEN',
        url: `https://github.com/owner/repo/pull/${start + i + 1}`, body: '', author: { login: 'fixture' } }));
      return { code: 0, stdout: JSON.stringify({ data: { repository: { pullRequests: { nodes, totalCount: closed ? 10 : 20,
        pageInfo: { endCursor: !closed && !second ? 'next' : 'end', hasNextPage: !closed && !second } } } } }) };
    }
    return { code: 0, stdout: JSON.stringify({ data: { repository: { open: { totalCount: 20 }, closed: { totalCount: 10 } } } }) };
  },
  hc: noop, theme: noop, run: noop, openOverlay: noop, closeOverlay: noop, props: noop, notify: noop, nextCommand: noop, window: noop, settings: noop, updates: noop,
};
const uiNames = ['headerTools', 'reveal', 'subtleActionFill', 'refreshButton', 'slot', 'interactionFill', 'menuSurface'];
async function loadFixture() {
let api;
api = await loadMod({ host, mod: 'custom-changes', globals: { Date: Clock, URL }, modules: {
  websocket: { WebSocket: { async connect(url) {
    const socket = { url, closed: false, write: async () => {}, read: () => new Promise((resolve, reject) => { socket.resolve = resolve; socket.reject = reject; }),
      async close() { socket.closed = true; if (!holdCloseRead) socket.reject?.(Error('closed')); } };
    sockets.push(socket); if (connectGate) await connectGate; return socket;
  } } },
  'chrome-main.js': 'src/features/workspace-chrome/main.js',
  'sidebar-footer.js': { FOOTER_ITEMS: [], footerItems: () => [], footerVisible: () => false, moveFooter: noop },
  'look.js': { enterCustom: noop }, 'startup.js': { restoreFrames: noop },
  'reorder.js': { reorder: noop, groupedInsertion: noop },
  'customization-updates.js': { initCustomizationUpdates: noop, customizationUpdateAvailable: () => false, syncCustomizationUpdateHints: noop },
  'panel-main.js': 'src/plugins/git/mod/main.js', 'webhooks.js': 'src/plugins/git/mod/webhooks.js', 'pulls.js': 'src/plugins/git/mod/pulls.js',
  'gpui-kit': { View: class {}, div: noop, svg: noop, image: noop, PathBuilder: {} }, 'gpui-base': { v_flex: noop, h_flex: noop },
  'ui.js': { U: {}, ...Object.fromEntries(uiNames.map(name => [name, noop])) },
  'location.js': { location: () => target }, 'agent-links.js': { AgentLinks: class {} },
  'space-color-state.js': { currentSpaceColor: noop }, 'settings-dialog.js': { openSettings: noop },
  'notices.js': { GitNotices: class {} }, 'pin-swap.js': { PinSwap: class { cancel() {} }, PIN_SWAP_MS: 320 },
  'panel-pin.js': { panelPin: noop }, 'panel-state.js': { changePanel: noop }, 'sidebar-title.js': { sidebarTitle: noop },
  'panel-kit.js': { headerTool: noop, contextMenu: noop, tag: noop, panelMessage: noop },
  'plugins.js': { sidebarPanelEnabled: () => enabled, pluginIsEnabled: () => enabled,
    pluginEvent(name, event) { api.git.lifecycle[name]?.({ ...event, enabled, setting: context().setting }); } },
}, entry: `export {syncRelay} from './plugins/git/relay-stream.js';
export {relayEvents,nextRelayEvent,RELAY_EVENTS,requestRelayRetry} from './plugins/git/relay-events.js';
export {default as git} from './plugins/git/plugin.js';
export {default as Chrome} from './chrome-main.js';
export {default as Changes} from './panel-main.js';` });
return api;
}
const api = await loadFixture();
const sync = async () => { api.syncRelay(context()); await tick(); };
const panel = new api.Changes(); panel.resetRepository();
panel.context = JSON.stringify([target.cwd, target.on]); panel.root = target.cwd;
panel.repo = { name: 'owner/repo', owner: 'owner', url: 'https://github.com/owner/repo' };
panel.pulls.open = Array.from({ length: 20 }, (_, i) => ({ number: i + 1 })); panel.pulls.closed = [];
panel.pages.open.expanded = true; panel.pages.open.cursor = 'kept';
const panelSync = async () => { panel.syncWebhooks(cx); await tick(); };
const message = async (event, repository = 'owner/repo', delivery = `delivery-${++facts}`) => {
  sockets.at(-1).resolve(JSON.stringify({ type: 'github', event, repository, delivery, revision: 'untrusted', url: 'untrusted' })); await tick();
};
await sync(); assert.equal(sockets.length, 1);
sockets[0].resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
await panelSync(); assert.equal(calls.length, 4, 'Actual panel catch-up reloads two open pages, closed and counts');
assert.equal(panel.pulls.open.length, 20); assert.equal(panel.pages.open.expanded, true);
const before = calls.length;
await message('workflow_run'); await panelSync(); assert.equal(calls.length, before + 4);
assert.equal(panel.pulls.open[0].title, `Fact ${facts}`, 'Visible panel reacts to the actual shared notice');
await message('push', 'other/repo'); await panelSync(); assert.equal(calls.length, before + 4, 'Unrelated repo does not refresh the panel');
visible = false; await panelSync(); const hiddenCalls = calls.length;
await message('push'); await panelSync(); await sync();
assert.equal(calls.length, hiddenCalls, 'Hidden panel performs no GitHub reads');
assert.equal(sockets.length, 1); assert.equal(sockets[0].closed, false, 'Hiding the panel does NOT close shared transport');
visible = true; await panelSync();
assert.equal(calls.length, hiddenCalls + 4, 'Showing the real panel again catches up all loaded pages');
assert.equal(panel.pulls.open[0].title, `Fact ${facts}`); assert.equal(panel.pages.open.expanded, true);
await message('check_run'); await panelSync(); assert.equal(calls.length, hiddenCalls + 8, 'Shown-again panel reacts to later notices too');
assert.equal(sockets.length, 1, 'The panel never opens a second connection');
await message('push', 'timurproko/herdr-app', 'duplicate');
await message('workflow_run', 'timurproko/herdr-app');
const pushed = api.relayEvents().repositories['timurproko/herdr-app'].push;
assert.ok(pushed > 0, 'A later CI notice cannot erase the push hint');
sockets[0].reject(Error('offline')); await tick(); await sync(); assert.equal(sockets.length, 1, 'Render cannot bypass transport backoff');
const retry = timers.find(timer => timer.at === clock + 1000); assert.ok(retry); retry.fn(cx); await sync();
assert.equal(sockets.length, 2); sockets[1].resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
const seq = api.relayEvents().sequence;
await message('push', 'timurproko/herdr-app', 'duplicate'); assert.equal(api.relayEvents().sequence, seq, 'Delivery dedup survives reconnect');
await panelSync(); assert.equal(calls.length, hiddenCalls + 12, 'Reconnect still catches up the visible panel');
const publicText = JSON.stringify(api.relayEvents());
assert.ok(!publicText.includes('untrusted')); assert.ok(!publicText.includes('a'.repeat(64))); assert.ok(!publicText.includes('b'.repeat(64)));
let bounded = api.relayEvents();
for (let i = 0; i < 140; i++) bounded = api.nextRelayEvent(bounded, { repository: `owner/repo${i}`, event: 'push' });
assert.equal(Object.keys(bounded.repositories).length, 128);
enabled = false; await sync(); assert.equal(sockets[1].closed, true, 'Disabling the transport owner closes the socket');
assert.equal(api.relayEvents().active, false); const stopped = JSON.stringify(api.relayEvents());
sockets[1].resolve(JSON.stringify({ type: 'github', repository: 'owner/repo', event: 'push', delivery: 'late' })); await tick();
assert.equal(JSON.stringify(api.relayEvents()), stopped, 'Late disabled-generation replies cannot publish');
enabled = true; relay = ''; await sync(); assert.equal(sockets.length, 2, 'Unconfigured Git silently stays disconnected');
relay = 'https://relay.test'; keys = 'invalid'; await sync(); await sync(); assert.equal(sockets.length, 2);
keys = JSON.stringify({ token: 'a'.repeat(64), secret: 'b'.repeat(64) });
api.requestRelayRetry(); await sync(); assert.equal(sockets.length, 3, 'Manual retry reaches only the chrome owner');
eager = true; await sync(); assert.equal(sockets[2].closed, true, 'Eager checking stops the owner');
// Separate windows have separate chrome owners, but share one configuration
// generation and merge counters. Unrelated CI must not look like a reconnect.
eager = false; await sync(); const firstWindow = sockets.at(-1);
firstWindow.resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
const generation = api.relayEvents().generation, otherOwner = {};
api.syncRelay({ ...context(), owner: otherOwner }); await tick(); const secondWindow = sockets.at(-1);
secondWindow.resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
const readyCount = api.relayEvents().ready;
firstWindow.resolve(JSON.stringify({ type: 'github', event: 'push', repository: 'timurproko/herdr-app', delivery: 'window-one' })); await tick();
const latchedPush = api.relayEvents().repositories['timurproko/herdr-app'].push;
secondWindow.resolve(JSON.stringify({ type: 'github', event: 'workflow_run', repository: 'other/repo', delivery: 'window-two' })); await tick();
assert.equal(api.relayEvents().generation, generation, 'Two windows cannot alternate public generations');
assert.equal(api.relayEvents().ready, readyCount, 'Unrelated notice in the other window is not a reconnect');
assert.equal(api.relayEvents().repositories['timurproko/herdr-app'].push, latchedPush, 'Other window preserves a latched target push');
enabled = false; await sync(); api.syncRelay({ ...context(), owner: otherOwner }); await tick();
assert.equal(firstWindow.closed, true); assert.equal(secondWindow.closed, true);
// Actual WorkspaceChrome.close -> Git declaration lifecycle cleanup, including
// callbacks created in the old module graph during customization replacement.
enabled = true;
const startChrome = (graph, chrome, at = cx) => graph.git.lifecycle['sidebar.sync']({ ...context(), owner: chrome, cx: at });
const queued = new api.Chrome(), beforeQueued = sockets.length;
startChrome(api, queued); queued.close(); await tick();
assert.equal(sockets.length, beforeQueued, 'Teardown during the queued yield cannot start transport');
assert.equal(queued.gitRelaySocket, undefined);
const queuedTasks = [], queuedCx = { ...cx, spawn: fn => queuedTasks.push(fn) };
const notStarted = new api.Chrome(); startChrome(api, notStarted, queuedCx); notStarted.close();
await queuedTasks.shift()(queuedCx); await tick();
assert.equal(sockets.length, beforeQueued, 'Teardown before the queued callback starts is also guarded');
const socketQueued = new api.Chrome(); startChrome(api, socketQueued, queuedCx);
await queuedTasks.shift()(queuedCx); await tick();
assert.equal(queuedTasks.length, 1); const readsBeforeClose = keyReads;
socketQueued.close(); await queuedTasks.shift()(queuedCx); await tick();
assert.equal(keyReads, readsBeforeClose, 'A queued socket task cannot even read credentials after owner teardown');
let resolveKeys; keyGate = new Promise(resolve => { resolveKeys = resolve; });
const reading = new api.Chrome(); startChrome(api, reading); await tick(); reading.close();
resolveKeys(keys); keyGate = null; await tick();
assert.equal(sockets.length, beforeQueued, 'Teardown while credentials are pending cannot connect afterward');
const mounted = new api.Chrome(); startChrome(api, mounted); await tick(); const oldSocket = sockets.at(-1);
oldSocket.resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
mounted.customUpdateHint = { enabled: true, pending: 'hint', timer: {} };
const beforeClose = JSON.stringify(api.relayEvents()), timerCount = timers.length;
holdCloseRead = true; mounted.close();
assert.equal(oldSocket.closed, true, 'Authenticated chrome teardown closes the socket immediately');
assert.equal(mounted.customUpdateClosed, true); assert.equal(mounted.customUpdateHint.pending, null); assert.equal(mounted.customUpdateHint.timer, null);
oldSocket.resolve(JSON.stringify({ type: 'github', event: 'push', repository: 'timurproko/herdr-app', delivery: 'after-close' })); await tick();
holdCloseRead = false;
assert.equal(JSON.stringify(api.relayEvents()), beforeClose, 'A buffered push after owner teardown cannot publish');
assert.equal(timers.length, timerCount, 'Teardown does not schedule transport retries');
startChrome(api, mounted); await tick(); assert.equal(sockets.filter(socket => !socket.closed).length, 0, 'A closed chrome owner cannot restart');
const replacementGraph = await loadFixture(), replacement = new replacementGraph.Chrome();
startChrome(replacementGraph, replacement); await tick(); const replacementSocket = sockets.at(-1);
replacementSocket.resolve(JSON.stringify({ type: 'ready', protocol: 1 })); await tick();
assert.equal(sockets.filter(socket => !socket.closed).length, 1, 'Mod replacement leaves exactly one live socket');
const replacementSequence = replacementGraph.relayEvents().sequence;
replacementSocket.resolve(JSON.stringify({ type: 'github', event: 'push', repository: 'timurproko/herdr-app', delivery: 'replacement-push' })); await tick();
assert.equal(replacementGraph.relayEvents().sequence, replacementSequence + 1, 'Only the replacement graph publishes new notices');
enabled = false; replacement.close(); await tick();
assert.equal(replacementSocket.closed, true, 'Disabled Git still receives chrome lifecycle cleanup');
enabled = true;
// A connect promise already dispatched before close must close on resolution too.
let resolveConnect; connectGate = new Promise(resolve => { resolveConnect = resolve; });
const connecting = new api.Chrome(); startChrome(api, connecting); await tick(); const pendingSocket = sockets.at(-1);
connecting.close(); resolveConnect(); connectGate = null; await tick();
assert.equal(pendingSocket.closed, true, 'Late connection resolution cannot leak a socket after teardown');
assert.equal(sockets.filter(socket => !socket.closed).length, 0);
await Promise.all(jobs);
console.log('PASS: actual chrome teardown before/after async startup and authentication, one live replacement socket, visible/hidden/shown panel refresh, bounded shared hints and two-window merging');
