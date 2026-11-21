// Personal padding is stored separately; the native layout is its live projection.
import { appHome, readTextFile, writeTextFile, settings, shared } from './host.js';
export const DEFAULT_TERMINAL_SPACING = 12;
const clamp = n => Math.max(0, Math.min(48, Math.round(n)));
const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const custom = () => String(shared('layout') ?? '').toLowerCase() === 'custom';
export function terminalSpacingLabel() {
  const p = settings().terminal_padding;
  if (!Array.isArray(p) || p.length !== 2 || !p.every(valid)) return '12 px';
  return p[0] === p[1] ? `${p[0]} px` : `${p[0]} × ${p[1]}`;
}
let pending = Promise.resolve();
export function changeTerminalSpacing(delta = null) {
  // Serialize rapid clicks; every increment reads the last committed value.
  const job = pending.catch(() => {}).then(async () => {
    if (!custom()) throw Error('Switch to Custom to change terminal spacing.');
    const file = `${appHome()}/layouts/${shared('layout')}.json`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await readTextFile(file);
      if (raw === null) throw Error('The Custom layout is missing.');
      const layout = JSON.parse(raw);
      if (!layout || typeof layout !== 'object' || Array.isArray(layout) || layout.id !== 'root') throw Error('The Custom layout is invalid.');
      if (!custom()) throw Error('Switch to Custom to change terminal spacing.');
      const previous = layout.terminal_padding;
      const current = Array.isArray(previous) && valid(previous[0]) ? previous[0] : DEFAULT_TERMINAL_SPACING;
      const next = delta === null ? DEFAULT_TERMINAL_SPACING : clamp(current + delta);
      if (previous?.[0] === next && previous?.[1] === next) return;
      layout.terminal_padding = [next, next];
      try {
        const preferenceFile = `${appHome()}/.customizations/layout-preferences.json`;
        const preferenceRaw = await readTextFile(preferenceFile);
        const preferences = preferenceRaw === null ? { version: 1, overrides: {} } : JSON.parse(preferenceRaw);
        if (preferences.version !== 1 || !preferences.overrides || Array.isArray(preferences.overrides)) throw Error('Unsupported layout preferences');
        preferences.overrides.terminal_padding = [next, next];
        // Record intent first. A failed projection can be recovered by Deploy; no defaults are lost.
        await writeTextFile(preferenceFile, JSON.stringify(preferences, null, 2) + '\n', preferenceRaw);
        if (!custom()) throw Error('Switch to Custom to change terminal spacing.');
        await writeTextFile(file, JSON.stringify(layout, null, 2) + '\n', raw);
        return;
      } catch (error) {
        if (attempt === 2) throw Error(`Could not save terminal spacing: ${error.message ?? error}`);
      }
    }
  });
  pending = job;
  return job;
}
