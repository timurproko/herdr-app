// Backward-compatible palette CLI/API; all file logic is registry-driven.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { bundle } from './frame-registry.mjs';
import { framePatch as patch } from './frame-patch.mjs';
export const framePatch = (action, home, root = bundle, frame = 'palette') => patch(action, home, root, frame);
export const framePalette = (action, home, root = bundle) => patch(action, home, root, 'palette');
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const home = process.argv[3] || process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE, '.config/herdr-app');
  try { console.log(framePalette(process.argv[2] ?? 'check', home)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
