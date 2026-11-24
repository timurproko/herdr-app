import {githubInvocation} from './support/github-read.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as labelColors from '../src/plugins/git/mod/label-colors.js';
import {fileURLToPath} from 'node:url';
import {loadMod} from '../tools/plugin-harness.mjs';
const pullHelpers=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:"export * from './pulls.js';"});
const checklistTasks=pullHelpers.tasks;
import {PinSwap,PIN_SWAP_MS} from '../src/plugins/git/mod/pin-swap.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function element(asset) {
  const node = {asset, attrs: {}, kids: []};
  let proxy;
  proxy = new Proxy(node, {get(target, key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => { node.kids.push(child); return proxy; };
    if (key === 'children') return children => { node.kids.push(...children); return proxy; };
    return (...args) => { node.attrs[key] = args; return proxy; };
  }});
  return proxy;
}
function find(node, id) {
  if (!node || typeof node !== 'object') return null;
  if (node.attrs?.id?.[0] === id) return node;
  return node.kids?.map(child => find(child, id)).find(Boolean);
}
function state(node, busy, spinning = busy) {
  assert.equal(node.attrs.size[0],24,'Files and Git refresh keep a 24px click target');
  assert.equal(node.kids[0].attrs.size[0],12,'Files and Git refresh use the same 12px glyph, idle or spinning');
  assert.equal(node.attrs.tooltip, undefined, 'Refresh has no hover tooltip');
  assert.ok(node.attrs.accessibility_label[0], 'Refresh retains its accessibility label');
  assert.equal(node.attrs.disabled[0], busy);
  assert.equal(node.attrs.opacity?.[0], busy ? 0.4 : undefined);
  assert.equal(node.kids[0].attrs.spin?.[0], spinning ? 900 : undefined);
  assert.equal(Boolean(node.attrs.cursor_pointer), !busy);
  assert.equal(Boolean(node.attrs.hover), !busy);
}
async function harness(feature, pluginOn = true) {
  const context = vm.createContext({localStorage: {getItem: () => 'changes', setItem() {}}});
  const tasks = [], calls = [], timers = [];
  let notify = 0, gate, rendering = false,gitShown=false;
  const place = {cwd: '/repo', on: null, space: 'space'};
  const host = {
    spaces: () => [{id: 'space', active: true, folder: place.cwd}], panes: () => [], terminals: () => [],
    focused: () => ({pane: null, cwd: place.cwd}), props: () => ({}), home: () => '/home',
    theme: () => ({}), settings: () => ({}), window: () => ({platform: 'linux'}), layout: () => gitShown?({id:'panel',children:[{id:'panel-body',active:'changes'}]}):null,
    run() {}, openOverlay() {}, closeOverlay() {}, nextCommand: () => new Promise(() => {}), hc: async () => ({code:1,stdout:''}), readTextFile: async () => '', writeTextFile: async () => null, notify() {}, watchFolder: () => new Promise(() => {}),
    exec: (cmd, args) => {
      ({command:cmd,args}=githubInvocation(cmd,args,{}));
      calls.push([cmd, args]);
      if (gate?.program === cmd) { const current = gate; gate = null; return current.promise; }
      const stdout = cmd === 'git' && args.includes('--show-toplevel') ? '/repo\n'
        : cmd === 'gh' && args[0] === 'repo' ? '{"nameWithOwner":"owner/repo"}'
        : cmd === 'gh' && args.some(a=>a.includes('pullRequests(first:')) ? JSON.stringify({data:{repository:{pullRequests:{nodes:[],totalCount:0,pageInfo:{hasNextPage:false,endCursor:null}}}}}) : '';
      return Promise.resolve({code: 0, stdout});
    },
  };
  const exports = {
    './label-colors.js':labelColors,
    'gpui-kit': {View: class {}, div: () => element(), svg: asset => element(asset), image: asset => element(asset), PathBuilder: {}},
    'gpui-base': {v_flex: () => element(), h_flex: () => element(), Editor: {}, EditorState: {},
      InputState: {new: () => ({on() {}, set_value() {}})}, Input: {new: () => element()},
      Scrollbar: {vertical: () => element()}, v_virtual_list: () => element(), Popover: {}},
    './host.js': host, './location.js': {location: () => place},
    './agent-links.js': {AgentLinks:class { related(){return null;} refresh(){} }},
    './pin-swap.js': {PinSwap,PIN_SWAP_MS},
    './ci-fix.js':{CIFix:class {sync(){}stop(){}}},
    './enrollment-picker.js':{EnrollmentPicker:class{}},
    './notices.js':{GitNotices:class {sync(){return null;}stop(){}retryNow(){}}},
    './webhooks.js': {GitWebhooks:class {sync(){} stop(){} retryNow(){} }},
    './panel-pin.js': {panelPin:(_t,{id,enabled})=>element().id(id).size(24).disabled(!enabled).child(element().size(14))},
    './panel-state.js': {changePanel(){}},

    './file-icons.js': {fileIconAsset: () => ''},
    './file-header.js': {fullFilePath() {}, fileHeader: (_tab, fallback) => fallback, publishFileHeader() {}, fileReloadStamp() {}, finishFileReload() {}},
    './preview-font.js': {previewFont: () => ({})},
    './plugins.js': {pluginPullContext: () => null, pluginEvent() {}, runPluginHook: async () => false, sidebarPanelEnabled: () => pluginOn},
    './sidebar-title.js': {sidebarTitle: () => element()},
    './delete-entry.js': {deleteEntry() { throw Error('Refresh must never recycle files'); }},
  };
  const mainPath = path.join(root, `src/plugins/${feature === 'files' ? 'files' : 'git'}/mod/main.js`);
  const main = new vm.SourceTextModule(fs.readFileSync(mainPath, 'utf8'), {context});
  await main.link(specifier => {
    if (specifier === './ui.js') return new vm.SourceTextModule(fs.readFileSync(path.join(root, 'src/ui/ui.js'), 'utf8'), {context});
    if (specifier === './panel-kit.js') return new vm.SourceTextModule(fs.readFileSync(path.join(root, 'src/ui/panel-kit.js'), 'utf8'), {context});
    if (specifier === './settings-dialog.js') return new vm.SourceTextModule(fs.readFileSync(path.join(root, 'src/ui/settings-dialog.js'), 'utf8'), {context});
    if (specifier === './aggregate.js') return new vm.SourceTextModule(fs.readFileSync(path.join(root, 'src/plugins/git/mod/aggregate.js'), 'utf8'), {context});
    if (exports[specifier]) return new vm.SyntheticModule(Object.keys(exports[specifier]), function () {
      for (const [key, value] of Object.entries(exports[specifier])) this.setExport(key, value);
    }, {context});
    assert.equal(specifier, './pulls.js');
    return new vm.SyntheticModule(Object.keys(pullHelpers),function(){for(const [k,v] of Object.entries(pullHelpers))this.setExport(k,v);},{context});
  });
  await main.evaluate();
  const view = new main.namespace.default();
  const cx = {spawn: fn => tasks.push(fn(cx)), notify: () => { assert.equal(rendering,false,'Never notify synchronously during native render'); notify++; },
    focus_handle: () => { assert.equal(rendering,false,'Never allocate focus during native render'); return {}; }, timer: {every() {}, after: (ms, fn) => timers.push({ms,fn})}, stop_propagation() {}};
  view.init({}, cx);
  await tasks.shift();
  view.headerHovered = true;
  if (feature === 'changes' && pluginOn) {
    assert.equal(view.view, 'open', 'A remembered Changes tab falls back to Open');
    assert.equal(find(view.render(cx), 'git-view-changes'), undefined);
    assert.equal(find(view.render(cx), 'commit'), undefined);
    assert.equal(calls.filter(([cmd]) => cmd === 'git').length, 2, 'Git resolves only the repository and active branch; no status/diff reads');
  }
  const id = feature === 'files' ? 'files-refresh' : 'git-refresh';
  const render = () => { rendering = true; try { return view.render(cx); } finally { rendering = false; } };
  return {view, cx, tasks, calls, timers, render,
    enablePlugin: value => { pluginOn = value; },
    finishFeedback: () => { while(timers.length) { const timer=timers.shift();assert.equal(timer.ms,600);timer.fn(cx); } },
    get notify() { return notify; },
    changeFolder: cwd => { place.cwd = cwd; },
    linkPull: number => { place.pullNumber = number; },
    showGit: () => { gitShown=true; },
    progress: () => find(render(), feature === 'files' ? 'files-header-progress' : 'git-header-progress'),
    button: () => find(render(), id), close: () => find(render(), feature === 'files' ? 'files-close' : 'git-close'),
    hold(program) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      gate = {program, promise};
      return {resolve, reject};
    }};
}

for (const feature of ['files', 'changes']) {
  const h = await harness(feature);
  for (const fail of [false, true]) {
    state(h.button(), false);
    assert.equal(h.progress(), undefined, 'No header progress line');
    const pending = h.hold(feature === 'files' ? 'sh' : 'git');
    const before = h.notify;
    h.button().attrs.on_click[0]({}, h.cx);
    assert.ok(h.notify > before, 'Refresh requests an immediate busy redraw');
    state(h.button(), true);
    assert.equal(h.progress(), undefined, 'Refresh uses icon rotation only');
    assert.equal(h.close().attrs.disabled[0], false, 'Close stays available during refresh');
    const count = h.calls.length;
    h.button().attrs.on_click[0]({}, h.cx);
    assert.equal(h.calls.length, count, 'Busy refresh does not launch duplicate work');
    if (fail) pending.reject(new Error('read failed'));
    else pending.resolve({code: 0, stdout: feature === 'files' ? '' : '/repo\n'});
    await Promise.all(h.tasks.splice(0));
    state(h.button(), true);
    if(feature==='changes'&&fail) {
      assert.equal(h.view.root,'/repo','An inconclusive same-context failure retains the known repository');
      assert.equal(h.view.error,'Could not read repository; refresh to retry');
    }
    assert.equal(h.view.loading,false,'Real work finishes before the visual minimum');
    h.finishFeedback();
    state(h.button(), false);
    if(feature==='changes'&&fail) assert.ok(h.button().attrs.on_click,'Retained repositories keep explicit Refresh retry available');
    assert.equal(h.progress(), undefined);
  }
  h.view.headerHovered = false;
  const hidden = h.button(), count = h.calls.length;
  if (hidden) {
    assert.equal(hidden.attrs.disabled[0], true);
    hidden.attrs.on_click[0]({}, h.cx);
  } else assert.equal(feature,'changes','Only non-repository Git controls disappear');
  assert.equal(h.calls.length, count, 'Hidden header controls remain inert');
}

// Git refresh covers both independent jobs, including Open and Closed PR reads.
for (const view of ['open', 'closed']) for (const fail of [false, true]) {
  const h = await harness('changes');
  h.showGit();h.button();await Promise.all(h.tasks.splice(0));
  h.view.view = view;
  h.view.pullsAt[view] = Date.now(); // No unrelated automatic TTL fetch.
  const pending = h.hold('gh');
  h.button().attrs.on_click[0]({}, h.cx);
  state(h.button(), true);
  await h.tasks.shift(); // Local git is done; GitHub is still pending.
  assert.equal(h.view.loading, false);
  assert.equal(h.view.pullLoading, true);
  state(h.button(), true);
  const count = h.calls.length;
  h.button().attrs.on_click[0]({}, h.cx);
  assert.equal(h.calls.length, count);
  if (fail) pending.reject(new Error('network failed'));
  else pending.resolve({code: 0, stdout: '{"nameWithOwner":"owner/repo"}'});
  await h.tasks.shift();
  state(h.button(), true);h.finishFeedback();state(h.button(), false);
  if (fail) assert.ok(h.view.pullError);
  else assert.ok(h.calls.some(([cmd, args]) => cmd === 'gh' && args.some(a=>a.includes(`states:${view === 'closed' ? '[CLOSED,MERGED]' : '[OPEN]'}`))));
}
// Context changes and automatic TTL loads may begin inside render, where native
// GPUI prohibits cx.notify(). Event/timer starts still redraw immediately.
for (const feature of ['files','changes']) {
  const h=await harness(feature);h.changeFolder('/another-repo');h.button();
  await Promise.all(h.tasks.splice(0));
  if(feature==='changes'){h.showGit();h.button();await Promise.all(h.tasks.splice(0));}
}
// Non-click opening/context reads remain visually quiet.
const files=await harness('files');
assert.deepEqual(find(files.render(),'files-actions').kids.map(node=>node.attrs.id[0]),['files-refresh','files-pin','files-close'],'Files matches Git header tool order');
for(let i=0;i<3;i++) {
  const pending=files.hold('sh');files.view.refresh(files.cx);
  state(files.button(),true,false);
  pending.resolve({code:0,stdout:''});await Promise.all(files.tasks.splice(0));
  state(files.button(),false);
}
// Non-repository tools are hidden, including guarding a stale enabled callback.
const git=await harness('changes'),oldClick=git.button().attrs.on_click[0];
const missing=git.hold('git');git.changeFolder('/not-a-repo');git.button();
missing.resolve({code:128,stdout:'',stderr:'fatal: not a git repository (or any of the parent directories): .git'});await Promise.all(git.tasks.splice(0));
const before=git.calls.length;
assert.equal(git.button(),undefined,'Non-repositories have no Refresh tool');
assert.equal(find(git.render(),'git-repo'),undefined,'Non-repositories have no PR link tool');
assert.equal(git.close().attrs.disabled[0],false,'The Close tool remains available');
oldClick({},git.cx);
assert.equal(git.calls.length,before,'Non-repository refresh never runs git or gh');
const valid=git.hold('git');git.changeFolder('/valid-repo');git.button();
valid.resolve({code:0,stdout:'/valid-repo\\n'});await Promise.all(git.tasks.splice(0));state(git.button(),false);
// Refresh, Pin and Close share a right-aligned, hover-revealed tool group and sizes.
const tools = await harness('changes');
tools.view.repo = {name:'owner/repo',url:'https://github.com/owner/repo'};
for (const hovered of [true,false]) {
  tools.view.headerHovered = hovered;
  const tree = tools.render(), group = find(tree,'git-actions');
  assert.deepEqual(group.kids.map(node=>node.attrs.id[0]),['git-refresh','git-pin','git-close']);
  assert.equal(group.attrs.opacity[0],hovered ? 1 : 0);
  assert.equal(group.attrs.right[0],8);
  for (const id of ['git-pin','git-refresh','git-close']) {
    const tool = find(group,id);
    assert.equal(tool.attrs.size[0],24,'All header tools have identical targets');
    assert.equal(tool.kids[0].attrs.size[0],id === 'git-refresh' ? 12 : 14,'Refresh matches Files; Pin and Close retain their glyph sizes');
    assert.equal(tool.attrs.disabled[0],!hovered,'Hidden tools cannot be clicked');
  }
}
tools.view.headerHovered = true; tools.view.repo = null;
assert.deepEqual(find(tools.render(),'git-actions').kids.map(node=>node.attrs.id[0]),['git-refresh','git-pin','git-close'],'Git without GitHub retains Refresh, Pin and Close');
tools.view.root = null;
assert.deepEqual(find(tools.render(),'git-actions').kids.map(node=>node.attrs.id[0]),['git-pin','git-close'],'Pin and Close remain outside repositories');
// Body task progress is independent of CI checks. Untouched lists use a muted
// checklist, partial lists a progress ring, and completed lists a purple check.
const taskPanel = await harness('changes');
const colors = {muted: 'muted', ansi5: 'purple'};
const rings = [];
taskPanel.view.taskRing = (_t, done, total) => { rings.push([done,total]); return element('progress-ring'); };
function descendants(node) {
  return node && typeof node === 'object' ? [node,...(node.kids ?? []).flatMap(descendants)] : [node];
}
for (const [body,label,asset,color] of [
  ['- [ ] a','1 task','checklist.svg','muted'],
  ['- [ ] a\n- [ ] b','2 tasks','checklist.svg','muted'],
  ['- [x] a\n- [ ] b','1 of 2 tasks','progress-ring',undefined],
  ['- [x] a\n- [x] b','2 tasks done','circle-check.svg','purple'],
]) {
  const pr = {number:1,title:'Example',meta:'#1',state:'draft',tasks:checklistTasks(body)};
  const row = taskPanel.view.pullRow(colors,pr), nodes = descendants(row);
  assert.ok(descendants(find(row,'pr-tasks-1')).includes(label),'Visible task wording stays full before overflow is measured; hidden compact probes are not display evidence');
  assert.equal(find(row,'pr-tasks-1').attrs.tooltip[0],label,'Full GitHub wording remains on hover');
  const icon = nodes.find(node => typeof node === 'object' && node?.asset?.endsWith(asset));
  assert.ok(icon,`${label} uses ${asset}`);
  if (color) assert.equal(icon.attrs.text_color[0],color);
}
assert.deepEqual(rings,[[1,2]],'Only partially completed task lists draw a progress ring');
const noTasks = descendants(taskPanel.view.pullRow(colors,{number:2,state:'draft',tasks:null}));
assert.ok(!noTasks.some(node => node?.asset?.endsWith('checklist.svg')));
// Selection follows the terminal's exact branch in either list, never a
// similarly named PR, PR number in the agent title, or a missing branch.
const selectionColors = {selected:'selected',hover:'hover',accent:'accent',border:'border'};
const selection = taskPanel.view;
selection.pulls = {open:[{number:907,headRefName:'fix/907'}, {number:906,headRefName:'fix/906'}, {number:908}],closed:[{number:900,headRefName:'fix/907'}]};
for (const state of ['open','closed']) {
  selection.view = state;
  for (const branch of ['fix/907','fix/906','fix/90',null]) {
    selection.branch = branch;
    const list = selection.renderPulls(selectionColors);
    for (const pr of selection.pulls[state]) {
      const row = find(list,`pr-${pr.number}`);
      const selected = Boolean(branch && pr.headRefName === branch);
      assert.equal(row.attrs.bg,undefined,'Active and regular rows have no special background');
      const pinned = find(list,'active-pull');
      assert.equal(Boolean(pinned && find(pinned,`pr-${pr.number}`)),selected);
      const hover = element(); row.attrs.hover[0](hover);
      assert.equal(hover.attrs.bg[0],'hover','Every PR uses the normal hover background');
    }
  }
}
// Live regression: the A1 tab says 906, but its parent shell remains on
// develop (or even another PR's branch). Explicit PR linkage wins.
selection.view = 'open';
for (const branch of ['develop','fix/907',null]) {
  selection.branch = branch;
  for (const number of [906,907,999]) {
    taskPanel.linkPull(number);
    const list = selection.renderPulls(selectionColors);
    for (const pr of selection.pulls.open) {
      const pinned = find(list,'active-pull');
      assert.equal(Boolean(pinned && find(pinned,`pr-${pr.number}`)),pr.number === number);
      assert.equal(find(list,`pr-${pr.number}`).attrs.bg,undefined);
    }
  }
}
selection.agentPull = 908; taskPanel.linkPull(906); selection.branch = 'fix/907';
const sessionList = selection.renderPulls(selectionColors);
for (const pr of selection.pulls.open) {
  assert.equal(Boolean(find(find(sessionList,'active-pull'),`pr-${pr.number}`)),pr.number === 908,
    'The live session PR wins over a stale tab name and parent shell branch');
  assert.equal(find(sessionList,`pr-${pr.number}`).attrs.bg,undefined);
}
// Pinning is structural: the active row must be outside the scrolling list,
// not merely sorted first. Even a lone matching PR keeps its pinned markers.
for (const state of ['open','closed']) for (const count of [0,1,2,50]) {
  selection.view = state;
  const prs = Array.from({length:count},(_,i)=>({number:i === count - 1 ? 908 : 1000 + i}));
  selection.pulls[state] = prs;
  for (const match of [true,false]) {
    selection.agentPull = match ? 908 : 9999;
    const body = selection.renderPulls(selectionColors);
    const pinned = find(body,'active-pull'), divider = find(body,'active-pull-divider');
    const scroll = find(body,`pulls-list-${state}`);
    const shouldPin = match && count > 0;
    assert.equal(Boolean(pinned),shouldPin);
    assert.equal(Boolean(divider),shouldPin,'Every active PR has a divider, including a lone PR');
    assert.ok(scroll.attrs.overflow_y_scrollbar,'Other PRs retain their scroll container');
    assert.equal(body.attrs.overflow_y_scrollbar,undefined,'The pinned area does not scroll');
    if (shouldPin) {
      assert.ok(pinned.attrs.flex_none,'The pinned area cannot shrink into the scroll list');
      const rail = find(pinned,'active-pull-rail');
      assert.ok(pinned.attrs.relative,'The block anchors its decorative rail');
      assert.equal(pinned.attrs.border_l,undefined,'The rail consumes no layout width');
      assert.equal(pinned.attrs.p[0],scroll.attrs.p[0],'Pinned and regular rows have identical gutters');
      assert.ok(rail.attrs.absolute,'The rail is outside normal layout');
      assert.equal(rail.attrs.left[0],0);
      assert.equal(rail.attrs.top[0],0);
      assert.equal(rail.attrs.bottom[0],0);
      assert.equal(rail.attrs.w[0],2);
      assert.equal(rail.attrs.bg[0],'accent','The rail uses the theme accent');
      assert.ok(rail.attrs.left[0] + rail.attrs.w[0] <= pinned.attrs.p[0],'The rail stays outside the row hover area');
      assert.equal(rail.attrs.on_click,undefined,'The decoration has no interaction handlers');
      const pinnedRow = find(pinned,'pr-908');
      assert.equal(pinnedRow.attrs.pl[0],8,'Pinning preserves the standard left row content inset');
      assert.equal(pinnedRow.attrs.pr[0],3,'Pinning preserves the Spaces-aligned highlight-relative content inset');
      assert.ok(pinnedRow.attrs.w_full,'The normal full-width hover target is preserved');
      assert.equal(divider.attrs.bg[0],'border','The horizontal separator uses the theme border');
      assert.equal(pinned.attrs.overflow_y_scrollbar,undefined);
      assert.ok(find(pinned,'pr-908'));
      assert.equal(find(scroll,'pr-908'),undefined,'No duplicate active row in the scroll list');
      assert.deepEqual(body.kids.map(node=>node.attrs.id[0]),['active-pull','active-pull-divider','pulls-scroll-frame']);
    }
    for (const pr of prs) assert.equal(find(body,`pr-${pr.number}`).attrs.bg,undefined,'Pinning never adds a special row background');
    const rows = descendants(scroll).filter(node=>/^pr-\d+$/.test(node?.attrs?.id?.[0] ?? '')).map(node=>node.attrs.id[0]);
    assert.deepEqual(rows,prs.filter(pr=>!shouldPin || pr.number !== 908).map(pr=>`pr-${pr.number}`),'Other rows preserve GitHub order');
    for (const pr of prs) assert.equal(descendants(body).filter(node=>node?.attrs?.id?.[0] === `pr-${pr.number}`).length,1);
    assert.ok(!descendants(scroll).includes('Showing the first 50 pull requests'),'No fixed 50-PR cap');
  }
}
for (const feature of ['files','changes']) {
 const h=await harness(feature,false);
 h.render();h.view.refresh(h.cx);
 if(feature==='files')h.view.freshen(h.cx);
 else {h.view.syncAgent(h.cx);h.view.loadPulls('open',h.cx,true);h.view.loadRelatedPull(h.cx);h.view.syncWebhooks(h.cx);}
 assert.equal(h.calls.length,0,`${feature}: disabled plugin performs no filesystem/git/GitHub reads`);
 h.enablePlugin(true);h.render();await Promise.all(h.tasks);
 assert.ok(h.calls.length>0,`${feature}: re-enable loads normally`);
 const count=h.calls.length;h.enablePlugin(false);h.render();h.view.refresh(h.cx);
 if(feature==='changes'){h.view.loadPulls('open',h.cx,true);h.view.syncWebhooks(h.cx);}
 assert.equal(h.calls.length,count,`${feature}: disabling a mounted panel stops new reads`);
}
for(const feature of ['files','changes']) {
 const h=await harness(feature),gate=h.hold(feature==='files'?'sh':'git');
 h.view.refresh(h.cx);const count=h.calls.length;
 h.enablePlugin(false);h.render();
 gate.resolve({code:0,stdout:feature==='files'?'f\0late.txt\0':'/repo\n'});
 await Promise.all(h.tasks);
 assert.equal(h.calls.length,count,`${feature}: disabling during a request prevents follow-up reads`);
 if(feature==='files')assert.ok(!(h.view.entries.get('')??[]).some(e=>e.name==='late.txt'),'Disabled replies cannot populate the browser');
}
console.log('PASS: disabled plugin IO guards, re-enable lifecycle, refresh icons, Git guards, task lists, PR selection, pinned non-scrolling active row, lone-PR divider and accent rail');
