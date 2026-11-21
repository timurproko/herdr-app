// Native UI selection uses Look's muted accent tint without changing preferences.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildTheme, DEFAULT_PALETTE, contrast, mix } from '../src/features/settings/palette.js';

const defaultTheme = JSON.parse(fs.readFileSync(new URL('../src/appearance/themes/Custom.json', import.meta.url), 'utf8'));
const tintedTheme = () => buildTheme(defaultTheme, { ...DEFAULT_PALETTE, accent: catalogAccent });
const expectedSelection = colors => mix(colors.selection, colors.accent, 0.25);
let appearance = 'dark', catalogAccent = '#8b5cf6', refreshes = 0;
const state = { layout: 'Custom' }, applied = [], timers = [];
const scoped = Object.freeze({ accent: '#f43f5e', selection: '#505050' });
const catalog = () => [{ name: 'Custom', colors: defaultTheme.colors },
  { name: 'custom-palette', colors: tintedTheme().colors }];
const forbidden = () => { throw Error('Selection projection must not write preferences or run commands'); };
const host = {
  shared: key => state[key], setShared: forbidden,
  settings: () => ({ appearance }), theme: () => scoped, themes: catalog,
  run: forbidden, window: () => ({ active: true }), appHome: forbidden, readTextFile: forbidden,
};
const context = vm.createContext({ window: { refresh: () => refreshes++ } });
const source = new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/look.js', import.meta.url), 'utf8'), { context });
const identity = new vm.SourceTextModule(fs.readFileSync(new URL('../src/integration/herdr/identity.js', import.meta.url), 'utf8'), { context });
function synthetic(name, values) {
  return new vm.SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context, identifier: name });
}
await source.link(name => {
  if (name === './host.js') return synthetic(name, host);
  if (name === './identity.js') return identity;
  if (name === 'gpui-base') return synthetic(name, { set_theme: value => applied.push(value) });
  throw Error(`Unexpected dependency: ${name}`);
});
await source.evaluate();
const { ensureNativeSelection, refreshLook } = source.namespace;
let base = { appearance, colors: { selection: '#2563eb', accent: '#00ffff',
  foreground: '#fafafa', background: '#181818', input: '#282828' },
  spacing: { sm: 8 }, radius: { md: 6 }, typography: { sans: 'Geist' } };
const cx = { theme: () => base, timer: { after(ms, fn) {
  const timer = { ms, fn, cancelled: false, cancel() { this.cancelled = true; } };
  timers.push(timer); return timer;
} } };

assert.equal(ensureNativeSelection(cx), true);
assert.equal(applied.at(-1).tokens.colors.selection, expectedSelection(defaultTheme.colors), 'Default Look uses its enriched neutral selection');
state['custom.applied-theme'] = 'custom-palette';
for (const [mode, accent] of [['dark', '#8b5cf6'], ['light', '#f59e0b'], ['dark', '#14b8a6'], ['dark', '#123456'], ['dark', '#ff00ff']]) {
  appearance = mode; catalogAccent = accent; base = { ...base, appearance };
  const before = JSON.stringify(base), paletteBefore = JSON.stringify(catalog());
  assert.equal(ensureNativeSelection(cx), true);
  const projected = applied.at(-1);
  assert.equal(projected.appearance, mode);
  const selection = expectedSelection(tintedTheme().colors);
  assert.equal(projected.tokens.colors.selection, selection, 'Use the current catalog tint, not stale overlay/native accents');
  assert.notEqual(selection, accent, 'Selection is never the vivid raw accent');
  assert.notEqual(selection, tintedTheme().colors.selection, 'Add more accent than the subdued terminal/theme selection');
  assert.ok(contrast(selection, DEFAULT_PALETTE.foreground) >= 4.5, 'Keep the muted selection readable with ordinary field text');
  assert.deepEqual({ ...projected.tokens.colors, selection: base.colors.selection }, base.colors);
  assert.deepEqual(projected.tokens.spacing, base.spacing);
  assert.deepEqual(projected.tokens.radius, base.radius);
  assert.equal(projected.tokens.typography, undefined, 'Retain native typography');
  assert.equal(JSON.stringify(base), before, 'Do not mutate the source native theme');
  assert.equal(JSON.stringify(catalog()), paletteBefore, 'Do not change terminal/saved selection');
  base = { ...base, colors: { ...base.colors, selection } };
  const count = applied.length;
  assert.equal(ensureNativeSelection(cx), false, 'Repeated focus is idempotent');
  assert.equal(applied.length, count);
}

// Resolve at refresh time, so an already-open dialog picks up the latest accent.
const owner = {};
refreshLook(owner, cx);
refreshLook(owner, cx);
assert.equal(timers[0].cancelled, true);
catalogAccent = '#84cc16';
assert.equal(timers[1].ms, 80);
timers[1].fn(cx);
assert.equal(applied.at(-1).tokens.colors.selection, expectedSelection(tintedTheme().colors));
assert.equal(refreshes, 1);
assert.equal(owner.lookRefresh, null);

const count = applied.length;
state.layout = 'main';
assert.equal(ensureNativeSelection(cx), false, 'Do not override other layouts');
state.layout = 'Custom';
assert.equal(ensureNativeSelection({}), false);
assert.equal(ensureNativeSelection(null), false);
assert.equal(applied.length, count);
console.log('PASS: 25% accent-enriched selection (including vivid magenta), readable contrast, default/custom colors, light/dark, stale overlays, refresh, idempotence and terminal/theme isolation');
