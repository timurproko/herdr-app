// The plugin API: everything a plugin may use from the app. A plugin imports only this
// file and files in its own folder; tests/architecture.test.mjs enforces that. Packaged
// as mods/<mod>/plugins/api.js, beside the plugin folders. Node workers instead
// use ../api.cjs (shared A1 client), explicitly bundled by plugins.nodeWorkers.
import { appHome, exec, checking } from '../host.js';
import { currentSpaceColor } from '../space-color-state.js';
import { MOD } from './where.js';
import { WebSocket } from 'websocket';
export const pluginMod = MOD;

// Herdr, through the one facade every mod uses.
export { exec, hc, window, spaces, panes, terminals, machines, shared, setShared, appHome, readTextFile, writeTextFile, notify, layout, run, checking } from '../host.js';

export { FLEET_DISPLAY_KEY, fleetDisplayChangeAllowed, updateFleetDisplay } from '../fleet-display.js';

// Declaration discovery never connects. Only a mounted, enabled integration
// calls this supported native transport; fixtures inject a connection factory.
export const connectWebSocket = url => WebSocket.connect(url);

// Explicit private action through a local capability bridge. The installed bridge accepts an allowlisted
// target, receives the payload in memory, then pipes it to its worker's stdin.
// Never put payload, an authenticated URL or a credential in exec arguments.
export async function privateAction(target, payload, context = {}) {
  if (checking() || context.isCurrent?.() === false) throw Error('Private action unavailable');
  let socket, cancelled = false;
  context.onCancel?.(() => { cancelled = true; if (socket) Promise.resolve(socket.close()).catch(() => {}); });
  const current = () => !cancelled && context.isCurrent?.() !== false;
  try {
    const result = await exec('node', [`${appHome()}/.customizations/runtime/lib/private-actions/bridge.cjs`, '--start', appHome(), target, JSON.stringify({machine: context.machine ?? null, ...(context.privateDestination ? {binding: context.privateDestination} : {})})], { timeout: 10000 });
    if (!current() || result.code !== 0) throw Error('Private action unavailable');
    const address = JSON.parse(result.stdout);
    if (!Number.isInteger(address.port) || address.port < 1 || address.port > 65535 || !/^[a-f0-9]{64}$/.test(address.session) || !(address.expires > Date.now() && address.expires <= Date.now() + 60000)) throw Error('Private action unavailable');
    socket = await connectWebSocket(`ws://127.0.0.1:${address.port}/`);
    if (!current()) throw Error('Private action retired');
    await socket.write(JSON.stringify({ session: address.session, payload }));
    const text = await socket.read();
    if (!current() || typeof text !== 'string' || text.length > 2097152) throw Error('Private action unavailable');
    return JSON.parse(text);
  } catch { throw Error('Private setup did not finish. Check the selected machine before trying again.'); }
  finally { if (socket) await Promise.resolve(socket.close()).catch(() => {}); }
}

// A space's color as the Spaces feature shows it (a theme color name or #rrggbb).
export const spaceColor = id => currentSpaceColor(id);

// The absolute path of a file shipped in a plugin's own folder (for readTextFile, or a
// worker run with exec). Every plugin mod carries the plugin, so this copy's is used.
export function pluginFile(id, name) {
  if (!/^[a-z0-9-]+$/.test(id) || !/^[A-Za-z0-9._-]+$/.test(name)) throw Error('Invalid plugin file name.');
  return `${appHome()}/mods/${MOD}/plugins/${id}/${name}`;
}
