// The plugin API: everything a plugin may use from the app. A plugin imports only this
// file and files in its own folder; tests/architecture.test.mjs enforces that. Packaged
// as mods/<mod>/plugins/api.js, beside the plugin folders. Node workers instead
// use ../api.cjs (shared A1 client), explicitly bundled by plugins.nodeWorkers.
import { appHome } from '../host.js';
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

// A space's color as the Spaces feature shows it (a theme color name or #rrggbb).
export const spaceColor = id => currentSpaceColor(id);

// The absolute path of a file shipped in a plugin's own folder (for readTextFile, or a
// worker run with exec). Every plugin mod carries the plugin, so this copy's is used.
export function pluginFile(id, name) {
  if (!/^[a-z0-9-]+$/.test(id) || !/^[A-Za-z0-9._-]+$/.test(name)) throw Error('Invalid plugin file name.');
  return `${appHome()}/mods/${MOD}/plugins/${id}/${name}`;
}
