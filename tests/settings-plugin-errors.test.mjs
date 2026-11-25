// Actual Settings header callback; unrelated page bodies and host IO are stubbed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/features/settings/main.js', import.meta.url), 'utf8');
const context = vm.createContext({});
const noop = () => {};
const overrides = {
  View: class {},
  window: () => ({ platform: 'windows' }),
  settingsSections: () => [],
  cachedProfiles: () => [],
  composeProfiles: () => [],
  followSettingsMachine: () => [],
  machinePicker: (_theme, options) => options,
};
const imports = new Map();
for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
  imports.set(match[2], match[1].split(',').map(binding => binding.trim().split(/\s+as\s+/)[0]));
}
const main = new vm.SourceTextModule(source, { context });
await main.link(name => {
  const names = imports.get(name);
  return new vm.SyntheticModule(names, function () {
    for (const key of names) this.setExport(key, overrides[key] ?? noop);
  }, { context });
});
await main.evaluate();
const view = new main.namespace.default();
Object.assign(view, { section: 'plugins', settingsMachine: 'pc2', profileSerial: 0, pluginFixError: {} });
const cx = { notify() {} };
const select = machine => view.machinePicker({}).onSelect(machine, cx);
const keys = ['crew:projects', 'git:repository', 'firstmate:node'];
const fail = machine => {
  for (const key of keys) view.pluginFixError[key] = `${machine}: action refused (${key})`;
};
const cleared = () => assert.equal(Object.keys(view.pluginFixError).length, 0, 'All plugin action errors are discarded');

fail('pc2');
select('pc2');
assert.equal(Object.keys(view.pluginFixError).length, keys.length, 'Selecting the same machine preserves its errors');
select(null);
cleared();
select('pc2');
cleared(); // Returning must not resurrect pc2's old error.
select(null);
fail('This computer');
assert.ok(Object.values(view.pluginFixError).every(error => error.startsWith('This computer:')), 'A new error is shown on its own machine');
select('pc2');
cleared();
select(null);
cleared();

// Switching in another Settings section cannot carry plugin errors back later.
fail('This computer');
view.section = 'profiles';
select('pc2');
cleared();
view.section = 'plugins';
fail('pc2');
view.pluginFixing = 'crew:projects';
select(null);
assert.equal(view.settingsMachine, 'pc2', 'An in-flight action still blocks switching');
assert.equal(Object.keys(view.pluginFixError).length, keys.length, 'A refused switch does not clear errors');
console.log('PASS: header machine switches clear every plugin action error without resurrection or suppressing new errors');
