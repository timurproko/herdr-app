import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const h=await formsHarness();let focused;
h.cx.focus_handle=()=>{const f={focus(){focused=f;},is_focused:()=>focused===f};return f;};
h.ui.initPlugins(h.view,h.cx,'crew');
const plugin=h.registry.PLUGINS.find(p=>p.id==='crew'),projects=plugin.prerequisites.find(p=>p.id==='projects');
h.registry.setPluginEnabled(plugin,true);
h.view.pluginChecks.crew={items:[{...projects,status:'ready',usable:true,rows:[]}]};h.view.pluginOpen['crew-projects']=true;
const id='st-plugin-list-crew-projects-about';
let card=find(h.render(),id+'-hint');assert.ok(card);assert.equal(card.attrs.open_delay[0],400);
const trigger=card.attrs.trigger[0],body=card.attrs.content[0];
assert.equal(trigger.attrs.on_click,undefined);assert.equal(trigger.attrs.underline,undefined);
assert.ok(trigger.kids[0].attrs.border_dashed);assert.equal(trigger.attrs.tab_index[0],0);
const entries = [
  ['Plain', 'The worker codes right away; Crew opens the pull request and reviews it.'],
  ['Delivery', 'The worker plans in a draft pull request and codes after approval; Crew reviews.'],
  ['Gate', 'The gate tool reviews, tests and opens the pull request.'],
];
assert.deepEqual(words(body), entries.flatMap(([name, sentence]) => [`${name} —`, sentence]));
assert.equal(body.kids.length, 3, 'Exactly one explanation per kind, without headers');
assert.equal(body.attrs.w[0], 440); assert.equal(body.attrs.gap[0], 8);
assert.equal(body.attrs.line_height[0], '18px');
for (const row of body.kids) {
  assert.ok(row.kids[0].attrs.font_bold, 'Kind names are bold');
  assert.ok(row.kids[1].attrs.whitespace_normal, 'Sentences wrap without fixed row heights');
  assert.equal(row.attrs.h, undefined);
  assert.equal(row.attrs.on_click, undefined);
}
assert.ok(words(h.render()).includes('Git folders crew may work in on this machine.'));
trigger.attrs.track_focus[0].focus();card=find(h.render(),id+'-focus-hint');assert.ok(card,'Keyboard focus shows the same passive explanations');
assert.deepEqual(words(card.attrs.content[0]),words(body));assert.equal(card.attrs.on_click,undefined);
assert.equal(h.jobs.length,0,'Hint starts no worker or machine reads');
// Other callers may still use the existing Usage-style table declaration.
const {loadMod} = await import('../tools/plugin-harness.mjs');
const {element} = await import('./support/plugin-forms.mjs');
const {descriptionHint} = await loadMod({host: {settings: () => ({})}, modules: {
  'settings-kit.js': 'src/ui/settings-kit.js',
  'panel-kit.js': {hintTable: (_t, rows) => element().children(rows.flat())},
  'gpui-kit': {div: element, svg: element},
  'gpui-base': {h_flex: element, v_flex: element, HoverCard: {new: id => element().id(id)}, Popup: {new: id => element().id(id)}},
  'ui.js': {U: {meta: 12}, ...Object.fromEntries(['button','control','spinner','itemHover','description','dropdown','menuSurface','menuRow','collapsible'].map(key => [key, element]))},
}, entry: "export {descriptionHint} from './settings-kit.js';"});
const table = descriptionHint({}, 'table', {label: 'Other hint', columns: ['Heading'], rows: [['Value']]});
assert.deepEqual(words(table.attrs.content[0]), ['Heading', 'Value']);
console.log('PASS three bold-name wrapped explanations, passive hover/focus, no reads and legacy hint table support');
