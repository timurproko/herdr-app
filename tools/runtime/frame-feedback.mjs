// Explicit Feedback UI patch; the app-owned frame and protected APIs stay intact.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { framePatch } from './frame-palette.mjs';
export function frameFeedback(action, home, root) {
  try { return framePatch(action, home, root, 'feedback').replace(/palette/gi, 'feedback'); }
  catch (e) { throw new Error(e.message.replace(/palette/gi, 'feedback')); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const home = process.argv[3] || process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE, '.config/herdr-app');
  try { console.log(frameFeedback(process.argv[2] ?? 'check', home)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
