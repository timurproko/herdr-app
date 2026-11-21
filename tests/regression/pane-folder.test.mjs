import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import nodeFs from 'node:fs';
// The real ui.js basics (dist/lib/ui.js) on this test's element: shared rows/buttons as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const source = readFileSync(new URL('../mods/custom-pane/main.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export default class Pane', 'class Pane') + '\nglobalThis.Pane = Pane;';
function element(kind = 'div') {
  const node = { kind, kids: [], style: {} }; let el;
  el = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'when') return (value, fn) => value ? fn(el) : el;
    if (key === 'child') return child => { o.kids.push(child); return el; };
    return (...args) => { o.style[key] = args; return el; };
  } }); return el;
}
const nodes = (n, out = []) => { if (n && typeof n === 'object') { out.push(n); for (const child of n.kids ?? []) nodes(child, out); } return out; };
let pane, directory, progress = null, headerTerminal = null;
const context = {
  View: class {}, div: () => element(), h_flex: () => element('hflex'), svg: () => element('svg'), image: () => element('image'),
  panes: () => [pane], props: () => ({ pane: pane.pane, ...(headerTerminal ? {terminal:headerTerminal} : {}) }), theme: () => ({accent:'#88bbff'}), shared: key => key === `custom.shell-switch:${pane.pane}` ? progress : null,
  spaces: () => [{ id: 'space', tabs: [{ id: pane.tab, name: 'C:/work/file.json' }] }],
  paneDirectory: () => directory,
  spaceDirectory: space => { assert.equal(space.id, 'space'); return directory; },
  fileHeader: (_tab, name) => name, fileIconAsset: () => 'file.svg',
  programIcon: () => element('icon'), slot: el => el, subtleActionFill: () => '#ffffff0a',
  fileReloadPending: () => false, refreshButton: () => element(),
  terminals: () => [], rolePill: () => element('pill'),
  reveal: el => el, headerTools: el => el, U: { gutter: 12, gap: 8, insetControl: 24, control: 28, radius: 6, meta: 12 },
};
{const real=uiReal(()=>element(),()=>element('svg'));for(const name of ['iconButton','panelTitle','tag','statusBulb'])if(!(name in context))context[name]=real[name];}
vm.runInNewContext(source, context);
const view = new context.Pane();
for (const terminal of ['t1', 'pc2/t1']) {
  for (const cwd of ['D:/Git/a1', 'C:/folder with spaces/a1', '/home/user/project']) {
    pane = { pane: 'pane', tab: 'tab', terminal, program: { shell: true, name: 'Bash' }, focused: true };
    directory = { cwd, name: cwd.split('/').at(-1) };
    const rendered = nodes(view.render({})), byId = id => rendered.find(n => n.style.id?.[0] === id);
    const folder = byId('pane-folder'), slot = byId('pane-folder-slot');
    assert.equal(slot.kind, 'hflex'); assert.ok(slot.style.flex_1); assert.ok(slot.style.items_center);
    assert.equal(slot.style.tooltip, undefined, 'The fill-width slot must not own a tooltip.');
    assert.equal(folder.style.tooltip[0], cwd); assert.equal(folder.kids[0], directory.name);
    assert.equal(folder.style.flex_1, undefined, 'Folder hitbox must not grow into empty header space.');
    assert.equal(folder.style.flex_shrink[0], 1); assert.ok(folder.style.min_w); assert.ok(folder.style.max_w_full); assert.ok(folder.style.truncate);
    assert.equal(byId('pane-name').style.tooltip, undefined, 'Shell title must not own the folder tooltip.');
    assert.equal(byId('pane-head-pane').style.tooltip, undefined);
  }
}
for (const [cwd, name] of [['D:/Git/a1', 'a1'], ['C:/Users/test', '~'], ['/home/remote/project', 'project'], [null, '']]) {
  pane = { pane: 'start-pane', tab: 'tab', terminal: null, mod: 'custom-space-start' };
  directory = { cwd, name };
  const rendered = nodes(view.render({})), byId = id => rendered.find(n => n.style.id?.[0] === id);
  assert.equal(byId('pane-name').kids[0], 'Start');
  assert.equal(byId('pane-folder').kids[0], name, 'Start uses the containing space directory without a terminal');
  assert.equal(byId('pane-folder').style.tooltip?.[0], cwd ?? undefined);
  assert.ok(byId('pane-folder').style.truncate);
  assert.equal(byId('pane-folder-slot').style.pl[0], 8, 'Start matches agent folder spacing');
}
const gaps = [];
for (const program of [{shell:true,name:'Bash'},{agent:true,name:'a1'},{name:'Editor'}]) {
  pane={pane:'pane',tab:'tab',terminal:'t1',program,focused:true};directory={cwd:'C:/work',name:'work'};
  const rendered=nodes(view.render({})),byId=id=>rendered.find(n=>n.style.id?.[0]===id);
  gaps.push(byId('pane-head-pane').style.gap[0]+(byId('pane-title-slot').style.px?.[0]??0)+(byId('pane-folder-slot').style.pl?.[0]??0));
}
assert.deepEqual(gaps,[16,16,16],'Shell, agent and other program names have the same folder spacing');
pane={pane:'pane',tab:'tab',terminal:'t1',program:{shell:true,name:'Bash'},focused:true};
directory={cwd:'C:/work',name:'work'};
for(const phase of ['queued','preparing','ready','committing','done','failed']){
  progress={phase,terminal:'t1',name:'Git Bash',expiresAt:Date.now()+10000};
  const rendered=nodes(view.render({}));
  assert.equal(rendered.find(n=>n.style.id?.[0]==='pane-shell-progress'),undefined,'Retired queued handoffs cannot show replacement progress');
  const title=rendered.find(n=>n.style.id?.[0]==='pane-title-slot');
  assert.equal(title.style.accessibility_label[0],'Open tab');
  assert.equal(title.style.tooltip,undefined,'The shell title button has no tooltip');assert.equal(title.style.accessibility_label[0],'Open tab');
}
progress=null;
pane = { pane: 'file-pane', tab: 'tab', mod: 'custom-files' }; directory = { cwd: null, name: '' };
const rendered = nodes(view.render({}));
assert.equal(rendered.find(n => n.style.id?.[0] === 'pane-folder'), undefined);
assert.equal(rendered.find(n => n.style.id?.[0] === 'pane-name').style.tooltip[0], 'C:/work/file.json', 'File-pane path tooltip remains unchanged.');
// Exercise the real shared resolver too: Start has no terminal of its own.
const history = {};
Object.assign(context, {
  terminals: () => [], focused: () => ({}), home: () => 'C:/Users/test',
  shared: key => key === 'custom.spaces.last-directory' ? history : null,
  setShared: () => { throw Error('Rendering a Start header must not write state'); },
  reportedLabels: () => ({}),
});
const directorySource = readFileSync(new URL('../mods/custom-pane/directory.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export (async )?function /g, '$1function ');
vm.runInNewContext(directorySource, context);
for (const machine of [null, 'pc2']) {
  const space = { id: 'space', machine, folder: machine ? '/home/remote' : 'C:/Users/test', tabs: [{ id: 'tab' }] };
  context.spaces = () => [space];
  pane = { pane: 'start-pane', tab: 'tab', terminal: null, mod: 'custom-space-start' };
  history.space = { machine, cwd: 'D:/Git/remembered-project', name: 'remembered-project' };
  let folder = nodes(view.render({})).find(n => n.style.id?.[0] === 'pane-folder');
  assert.equal(folder.kids[0], 'remembered-project');
  assert.equal(folder.style.tooltip[0], 'D:/Git/remembered-project');
  history.space.machine = 'another-machine';
  folder = nodes(view.render({})).find(n => n.style.id?.[0] === 'pane-folder');
  assert.equal(folder.kids[0], machine ? 'remote' : '~', 'Wrong-machine history falls back to the space folder');
}
console.log('PASS: intrinsic folder tooltips, truncation, local/remote terminal-free Start remembered directories and machine-safe fallbacks, unchanged file-pane headers.');
