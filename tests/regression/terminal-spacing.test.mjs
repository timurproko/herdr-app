import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'mods/custom-settings/terminal-spacing.js'), 'utf8');
let layout = 'Custom', padding = [12, 12], writes = 0, conflicts = 0, brokenWrite = false, preferenceRaw = null;
let raw = JSON.stringify({ id: 'root', type: 'row', terminal_padding: padding, children: [{ id: 'kept', hidden: false }], unknown: { preserve: true } });
const original = JSON.parse(raw);
const context = vm.createContext({});
const api = {
  appHome: () => '/home', shared: key => key === 'layout' ? layout : undefined,
  settings: () => ({ terminal_padding: padding, zoom: 1.3 }),
  readTextFile: async file => { if (file === '/home/.customizations/layout-preferences.json') return preferenceRaw; assert.equal(file, '/home/layouts/Custom.json'); return raw; },
  writeTextFile: async (file, next, expected) => {
    if (brokenWrite) throw Error('disk unavailable');
    if (file === '/home/.customizations/layout-preferences.json') { assert.equal(expected, preferenceRaw); preferenceRaw = next; return; }
    assert.equal(file, '/home/layouts/Custom.json');
    if (conflicts > 0) { conflicts--; const concurrent = JSON.parse(raw); concurrent.children[0].hidden = true; raw = JSON.stringify(concurrent); throw Error('changed concurrently'); }
    assert.equal(expected, raw, 'Writes compare against the latest layout contents');
    raw = next; padding = JSON.parse(raw).terminal_padding; writes++;
  },
};
const dependency = new vm.SyntheticModule(Object.keys(api), function () { for (const [k, v] of Object.entries(api)) this.setExport(k, v); }, { context });
const mod = new vm.SourceTextModule(source, { context });
await mod.link(name => { assert.equal(name, './host.js'); return dependency; }); await mod.evaluate();
const p = mod.namespace;
assert.equal(p.terminalSpacingLabel(), '12 px'); assert.equal(writes, 0, 'Opening Settings does not write defaults');
await Promise.all([p.changeTerminalSpacing(1), p.changeTerminalSpacing(1), p.changeTerminalSpacing(1)]);
assert.deepEqual(padding, [15, 15], 'Rapid clicks accumulate without zoom multiplication');
assert.equal(p.terminalSpacingLabel(), '15 px');
assert.deepEqual(JSON.parse(preferenceRaw).overrides.terminal_padding, [15, 15], 'Personal padding has an independent durable record');
assert.deepEqual(JSON.parse(raw).unknown, original.unknown); assert.deepEqual(JSON.parse(raw).children, original.children);
conflicts = 1; await p.changeTerminalSpacing(-1);
assert.deepEqual(padding, [14, 14]); assert.equal(JSON.parse(raw).children[0].hidden, true, 'Concurrent unrelated changes survive retry');
await p.changeTerminalSpacing(100); assert.deepEqual(padding, [48, 48]);
await p.changeTerminalSpacing(-100); assert.deepEqual(padding, [0, 0]);
await p.changeTerminalSpacing(); assert.deepEqual(padding, [12, 12]);
const before = writes; await p.changeTerminalSpacing(null); assert.equal(writes, before, 'Reset at default does not rewrite the layout');
layout = 'main'; await assert.rejects(p.changeTerminalSpacing(1), /Switch to Custom/); assert.equal(writes, before);
layout = 'Custom'; brokenWrite = true; await assert.rejects(p.changeTerminalSpacing(1), /Could not save.*disk unavailable/);
brokenWrite = false; await p.changeTerminalSpacing(1); assert.deepEqual(padding, [13, 13], 'A failed save does not poison later requests');
const good = raw; raw = '{broken'; await assert.rejects(p.changeTerminalSpacing(1)); assert.equal(raw, '{broken'); raw = good;
raw = null; await assert.rejects(p.changeTerminalSpacing(1), /missing/); raw = good;
padding = [12, 8]; assert.equal(p.terminalSpacingLabel(), '12 × 8');
padding = undefined; assert.equal(p.terminalSpacingLabel(), '12 px');
const main = fs.readFileSync(path.join(root, 'mods/custom-settings/main.js'), 'utf8');
assert.match(main, /st-terminal-spacing-reset/); assert.match(main, /this\.changeTerminalSpacing\(-1, cx\)/); assert.match(main, /this\.changeTerminalSpacing\(1, cx\)/);
assert.match(main, /this\.row\(t, "Padding", null,/);
assert.ok(main.indexOf('this.heading(t, "Size")') < main.indexOf('"st-terminal-spacing"'));
assert.ok(main.indexOf('"st-terminal-spacing"') < main.indexOf('this.heading(t, "Fonts")'));
assert.doesNotMatch(main, /Size and fonts|this\.heading\(t, "Terminal spacing"\)/);
console.log('PASS: terminal spacing defaults, bounds, reset, rapid clicks, CAS retries, failure recovery, layout isolation and unrelated-field preservation');
