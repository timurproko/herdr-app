import assert from 'node:assert/strict';
import {formsHarness, find, words} from './support/plugin-forms.mjs';
let checks = [], ordinary = 0, holdLocal, releaseLocal;
const plugin = {id:'refresh-fixture', name:'Example', version:'1', icon:'code', defaultEnabled:true, machineScoped:true, prerequisites:[
  {id:'account', updates:true, label:'Account', check:async cx => ({status:'ready', update:false, refreshSections:cx.checkReason === 'manual'})},
  {id:'items', label:'Items', section:true, list:{refreshOnOpen:true, scope:{header:true}, picker:{kind:'items'}}, check:async cx => {
    checks.push(cx.refreshList);
    if (holdLocal && !cx.refreshList) await new Promise(resolve => {releaseLocal = resolve;});
    const cached = {status:'ready', statusLabel:'1 added', usable:true, rows:[{id:'a', label:'Cached name'}]};
    cx.publish?.(cached);
    return cached;
  }},
  {id:'ordinary', label:'Ordinary', section:true, list:{scope:{header:true}, picker:{kind:'items'}}, check:async () => {ordinary++; return {status:'ready', rows:[]};}},
]};
const h = await formsHarness({}, [plugin]), {view, ui, cx, click, flush, render} = h;
ui.initPlugins(view, cx, plugin.id); ui.reloadPlugins(view, cx, plugin.id); await flush();
assert.deepEqual(checks, [false]); assert.equal(ordinary, 1);
assert.equal(typeof view.pluginChecks[plugin.id].items.find(item=>item.id==='account').updateRead, 'string', 'The merged check path retains update read tickets');
assert.equal(h.shared['custom.plugin-updates'].rows.find(row=>row.plugin===plugin.id).pending, false, 'Update facts publish alongside ordinary list checks');
click('st-plugin-refresh-fixture-items-toggle'); await flush();
assert.deepEqual(checks, [false,true]); assert.ok(words(render()).includes('Cached name'));
click('st-plugin-refresh-fixture-items-toggle'); await flush();
assert.equal(checks.length, 2, 'Collapse does not refresh');
click('st-plugin-refresh-refresh-fixture-items'); await flush();
assert.deepEqual(checks, [false,true,true], 'Explicit section Check refreshes a closed list');
click('st-plugin-refresh-fixture-ordinary-toggle'); await flush(); assert.equal(ordinary, 1, 'Unopted lists keep their old behavior');
view.pluginOpen['refresh-fixture-requirements'] = true;
click('st-plugin-refresh-fixture-recheck'); await flush();
assert.equal(checks.at(-1), false, 'A Requirements result publication does not duplicate the provider read');
assert.equal(ordinary, 2);

// A local-only check already in progress must not swallow a later opening event.
holdLocal = true; ui.reloadPlugins(view, cx, plugin.id, 'items', {refreshLists:false});
const pending = h.jobs.shift()(cx);
for (let i=0; i<100 && !releaseLocal; i++) await Promise.resolve();
assert.ok(releaseLocal);
click('st-plugin-refresh-fixture-items-toggle'); await flush();
assert.equal(checks.at(-1), true);
releaseLocal(); await pending;
assert.ok(words(render()).includes('Cached name'));

click('st-plugin-refresh-fixture-items-toggle'); // Capture an opening callback, not a no-op close.
const oldToggle = find(render(), 'st-plugin-refresh-fixture-items-toggle').attrs.on_click[0];
view.settingsMachine = 'different-machine'; ui.followSettingsMachine(view);
const before = h.jobs.length;
oldToggle({}, cx);
assert.equal(h.jobs.length, before, 'Retired disclosure callbacks cannot check another target');
console.log('PASS: opt-in list opening/Check refresh, cached publication, pending-open recovery and unchanged ordinary disclosures');
