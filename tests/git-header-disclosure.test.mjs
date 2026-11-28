import assert from 'node:assert/strict';
import {RepositoryDisclosure, DISCLOSURE_KEY, LEGACY_FOLDS_KEY} from '../src/plugins/git/mod/repository-disclosure.js';

function storage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {data, writes: 0, getItem: key => data.get(key) ?? null,
    setItem(key, value) { this.writes++; data.set(key, value); }};
}
const saved = storage(), folds = new RepositoryDisclosure(saved);
assert.equal(folds.collapsed, false);
assert.equal(folds.has('owner/repo'), false);
folds.toggle('OWNER/Repo');
assert.equal(folds.has('owner/repo'), true);
assert.equal(folds.has('another/repo'), false);
assert.equal(folds.collapsed, false, 'Individual folds do not change the chosen global default');
folds.toggle('owner/repo');assert.equal(folds.exceptions.size, 0);
folds.toggle('hidden/repo');folds.toggleAll();
assert.equal(folds.collapsed, true);assert.equal(folds.exceptions.size, 0);
assert.equal(folds.has('unseen/repo'), true, 'The default covers future repositories, not only a visible set');
folds.toggle('owner/repo');assert.equal(folds.has('owner/repo'), false);
assert.equal(folds.has('hidden/repo'), true);assert.equal(folds.collapsed, true);
let restarted = new RepositoryDisclosure(saved);
assert.equal(restarted.collapsed, true);assert.equal(restarted.has('OWNER/REPO'), false);
assert.equal(restarted.has('unseen/repo'), true);
restarted.toggleAll();assert.equal(restarted.collapsed, false);
assert.equal(restarted.has('owner/repo'), false);assert.equal(restarted.has('hidden/repo'), false);
assert.equal(folds.sync(), true, 'Retained views reconcile newer persisted choices');
assert.equal(folds.collapsed, false);assert.equal(folds.sync(), false);
assert.equal(new RepositoryDisclosure(saved).exceptions.size, 0);
console.log('PASS global default, canonical individual exceptions, hidden/unseen repositories, bulk reset, retained views and restart');

for (const raw of [null, '{broken', JSON.stringify({version: 9, collapsed: true, exceptions: []}), JSON.stringify({version: 1, collapsed: 'yes', exceptions: []})]) {
  const old = storage({[LEGACY_FOLDS_KEY]: JSON.stringify(['OWNER/Repo', null, 12, '']), ...(raw === null ? {} : {[DISCLOSURE_KEY]: raw})});
  const migrated = new RepositoryDisclosure(old);
  assert.equal(migrated.collapsed, false);assert.equal(migrated.has('owner/repo'), true);
  assert.equal(migrated.has('other/repo'), false);assert.equal(old.writes, 0, 'Restoration never rewrites malformed or future-version data');
  assert.equal(old.getItem(DISCLOSURE_KEY), raw);
  migrated.toggleAll();migrated.toggleAll();
  assert.equal(new RepositoryDisclosure(old).has('owner/repo'), false, 'Legacy folds cannot reappear after an explicit new-format save');
  assert.equal(old.getItem(LEGACY_FOLDS_KEY), JSON.stringify(['OWNER/Repo', null, 12, '']));
}
for (const legacy of ['{broken', '{}', 'null']) assert.equal(new RepositoryDisclosure(storage({[LEGACY_FOLDS_KEY]: legacy})).has('owner/repo'), false);
const refused = storage();refused.setItem = () => { throw Error('refused'); };
const memory = new RepositoryDisclosure(refused);memory.toggleAll();memory.sync();memory.toggle('owner/repo');memory.sync();
assert.equal(memory.collapsed, true);assert.equal(memory.has('owner/repo'), false);assert.equal(memory.has('new/repo'), true);
assert.equal(new RepositoryDisclosure(refused).collapsed, false, 'Restart persistence requires writable local storage');
const inaccessible = new RepositoryDisclosure({getItem() { throw Error('refused'); }, setItem() { throw Error('refused'); }});
inaccessible.toggleAll();inaccessible.sync();assert.equal(inaccessible.has('new/repo'), true);
const stale = new RepositoryDisclosure(saved), latest = new RepositoryDisclosure(saved);
latest.toggleAll();stale.toggle('one/repo');
assert.equal(stale.collapsed, true, 'A stale writer first adopts the current default');
assert.equal(stale.has('one/repo'), false);assert.equal(stale.has('new/repo'), true);
console.log('PASS legacy migration, malformed/unknown versions, read/write refusal, unsaved memory and stale writer reconciliation');

// Production renderers/callbacks, no installed app, network or real preferences.
const {rowHarness, find, nodes, words, rowGeometry} = await import('./support/git-row.mjs');
const {assertTaskSections} = await import('./support/git-section-invariant.mjs');
let enabled = true, mode = 'ordinary', reads = 0;
const uiStore = storage(), context = {scope:'disclosure', parent:'owner', links:[]};
const h = await rowHarness({globals:{localStorage:uiStore},
  host:{exec() { reads++; throw Error('Disclosure must not start transport'); }},
  modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js',
    'plugins.js':{sidebarPanelEnabled:()=>enabled, pluginPullContext:()=>context, pluginEvent(){}}}});
const {panel:p, cx, place} = h;
p.foldedRepositories = new RepositoryDisclosure(uiStore);
p.shown = () => enabled;
p.notices = {sync(){}, presentation(){}, stop(){}};
p.enrollmentPicker = {render(){}, stop(){}};
for (const name of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback','syncMotionPreference']) p[name] = () => {};
p.pullsDue = () => false; p.agentLinks.refresh = () => {}; p.sourceCurrent = () => true;
p.syncAggregate = () => mode === 'coordinator';
const aggregate = p.aggregate = new h.AggregatePulls({shown:()=>enabled});aggregate.context=context;
const pr = (n, repo='owner/repo', state='OPEN') => h.facts.pullRow({number:n,title:`Fixture ${n}`,state,url:`https://github.com/${repo}/pull/${n}`,headRefName:`branch-${n}`}, 'fixture');
for (let n=1;n<=80;n++) {
  const repo=n<41?'owner/repo':'owner/other', row={...pr(n,repo),repo,key:`${repo}#${n}`};
  context.links.push({url:row.url});aggregate.entries.set(row.key,{link:{repo,number:n,key:row.key,targets:[]},pr:row,completedAt:Date.now(),dirty:false});
}
function ordinary(repo='owner/repo') {
  mode='ordinary';p.context=JSON.stringify([place.cwd,place.on]);p.root=place.cwd;p.repo={name:repo};p.sectionEntry=true;
  p.pulls={open:[pr(1,repo),pr(2,repo),pr(3,repo)],closed:[pr(4,repo,'CLOSED'),pr(5,repo,'CLOSED')]};p.counts={open:30,closed:20};
  p.pages.open={cursor:'next',hasMore:true,expanded:true};p.agentPull=1;p.agentResolved=JSON.stringify(place);
}
function coordinator() { mode='coordinator';p.context='tasks:disclosure';aggregate.context=context; }
const render=()=>h.render(()=>p.renderPanel(cx));
const button=tree=>find(tree,'git-disclosure');
const click=tree=>button(tree).attrs.on_click[0]({},cx);
const key=(tree,key)=>button(tree).attrs.on_key_down[0]({key},cx);
ordinary();let tree=render();
assert.ok(find(tree,'pr-2'));assert.ok(find(tree,'active-pull'));
const facts=p.pulls,counts=p.counts,pages=p.pages,epoch=p.taskSelectionEpoch??0;
p.pinMotion.current={phase:'waiting'};click(tree);tree=render();
assert.ok(find(find(tree,'active-pull'),'pr-1'));assert.equal(find(tree,'pr-2'),undefined);
assert.equal(words(find(tree,'task-repo-count-owner/repo')).join(''),'2');
assert.equal(find(tree,'pulls-more'),undefined);assert.equal(p.pages,pages);assert.equal(p.pulls,facts);assert.equal(p.counts,counts);
assert.equal(p.pinMotion.current,null);assert.ok(p.taskSelectionEpoch>epoch);
assert.equal(p.foldedRepositories.collapsed,true);assert.equal(button(tree).attrs.accessibility_label[0],'Expand all repository sections');
find(tree,'task-repo-header-owner/repo').attrs.on_click[0]({},cx);tree=render();
assert.ok(find(tree,'pr-2'));assert.ok(find(tree,'pulls-more'));
assert.equal(p.foldedRepositories.collapsed,true,'A one-off expansion leaves the global icon collapsed');
assert.ok(nodes(button(tree)).some(node=>node.attrs?.asset?.[0]?.endsWith('sections-collapsed.svg')));
Object.assign(place,{terminal:'agent-b',space:'another-space',cwd:'/another'});ordinary('unseen/repository');tree=render();
assert.equal(find(tree,'pr-2'),undefined);assert.ok(find(tree,'active-pull'),'An unseen repository inherits the default but retains its agent pin');
p.view='closed';tree=render();assert.equal(find(tree,'pr-4'),undefined);
p.view='open';ordinary();tree=render();assert.ok(find(tree,'pr-2'),'Returning to the canonical repository restores its exception');
key(tree,'escape');assert.equal(p.foldedRepositories.collapsed,true);
key(tree,'enter');tree=render();assert.equal(p.foldedRepositories.collapsed,false);assert.equal(p.foldedRepositories.exceptions.size,0);
key(tree,'space');tree=render();assert.equal(p.foldedRepositories.collapsed,true);key(tree,' ');tree=render();assert.equal(p.foldedRepositories.collapsed,false);
p.pulls.open=[p.pulls.open[0]];tree=render();click(tree);tree=render();
assert.ok(find(tree,'active-pull'));assert.equal(find(tree,'task-repo-header-owner/repo'),undefined,'A lone pin gets no empty header');
console.log('PASS actual ordinary button/chevron, unseen agent/space, both tabs, keyboard activation, persistent exceptions, pin/count/cursor and motion guards');

// Coordinator disclosure uses its existing bounded reveal policy, not an eager
// all-rows mount. The global choice also clears a hidden repository exception.
p.view='open';coordinator();tree=render();assertTaskSections(tree,p);
assert.equal(find(tree,'task-repo-body-owner/repo'),undefined);
find(tree,'task-repo-header-owner/repo').attrs.on_click[0]({},cx);tree=render();assertTaskSections(tree,p);
assert.ok(find(tree,'task-repo-body-owner/repo'));assert.equal(p.foldedRepositories.collapsed,true);
p.foldedRepositories.toggle('hidden/repository');click(tree);tree=render();assertTaskSections(tree,p);
assert.equal(p.foldedRepositories.collapsed,false);assert.equal(p.foldedRepositories.exceptions.size,0);
assert.equal(p.foldedRepositories.has('hidden/repository'),false);
assert.ok(find(tree,'task-repo-body-owner/repo'));
while(p.selectedTaskWindow.revealMore()){}tree=render();assertTaskSections(tree,p);
assert.ok(nodes(tree).filter(node=>/^pr-owner\//.test(node.attrs?.id?.[0]??'')).length<=60);
const totals=aggregate.counts(), heldScope=p.fallbackSnapshot().scope;click(tree);tree=render();assertTaskSections(tree,p);
assert.notEqual(p.fallbackSnapshot().scope,heldScope,'Bulk folding retires held coordinator safety selections');
click(tree);tree=render();assert.notEqual(p.fallbackSnapshot().scope,heldScope,'Changing away and back cannot revive a held safety reply');
click(tree);tree=render();
assert.deepEqual(aggregate.counts(),totals);assert.equal(find(tree,'git-task-empty'),undefined);
assert.equal(find(tree,'task-repo-body-owner/repo'),undefined);assert.equal(find(tree,'task-repo-body-owner/other'),undefined);
// Applicable failures without PRs remain headerless and cannot be folded away.
aggregate.entries.set('failed/repository#99',{link:{repo:'failed/repository',number:99,key:'failed/repository#99',targets:[{terminal:'worker'}]},pr:null,error:{kind:'read',message:'Refresh to retry'},dirty:false});
tree=render();assert.ok(find(tree,'task-error-failed/repository'));assert.equal(find(tree,'task-repo-header-failed/repository'),undefined);
aggregate.entries.delete('failed/repository#99');
// Another mounted/recreated view's save wins before the first target paint.
const otherView=new RepositoryDisclosure(uiStore);otherView.toggleAll();
ordinary();tree=render();assert.ok(find(tree,'pr-2'));assert.equal(p.foldedRepositories.collapsed,false);
const retired=button(tree),writesBefore=uiStore.writes;enabled=false;retired.attrs.on_click[0]({},cx);render();assert.equal(uiStore.writes,writesBefore);
otherView.toggleAll();enabled=true;ordinary();tree=render();assert.equal(find(tree,'pr-2'),undefined,'Re-enable adopts current saved disclosure before content');
p.foldedRepositories=new RepositoryDisclosure(uiStore);ordinary();tree=render();assert.equal(find(tree,'pr-2'),undefined,'Panel recreation restores global state');
// Cold ordinary feedback and headerless failures retain their policy.
p.pulls.open=null;p.pullLoading=true;p.loading=false;p.agentPull=null;p.agentResolved=JSON.stringify(place);tree=render();
assert.ok(find(tree,'git-empty'));assert.equal(find(tree,'task-repo-header-owner/repo'),undefined);
p.pullLoading=false;p.pullError='Fixture read failed; refresh to retry';p.pulls.open=[];tree=render();
assert.match(words(find(tree,'git-empty')).join(' '),/Fixture read failed/);p.pullError=null;
assert.equal(reads,0);assert.equal(h.focus.length,0,'Disclosure performs no navigation');
console.log('PASS coordinator reveal/cap, counts, hidden overrides, headerless errors, warm entry, disable/re-enable, recreation, cold feedback and zero transport/navigation');

for(const selected of ['open','closed'])for(const view of ['ordinary','coordinator'])for(const zoom of [1,1.3])for(const width of [280,390,480]) {
  h.setZoom(zoom);p.view=selected;if(view==='ordinary')ordinary();else coordinator();
  tree=render();const geometry=rowGeometry(tree,width,zoom,600),strip=find(tree,'git-views'),control=button(tree),b=geometry.get(control),s=geometry.get(strip);
  assert.equal(nodes(strip).filter(node=>node.attrs.id?.[0]==='git-disclosure').length,1);
  assert.equal(b.width,24*zoom);assert.equal(b.height,24*zoom);assert.ok(Math.abs(s.x+s.width-b.x-b.width-4*zoom)<1e-6);
  assert.ok(Math.abs(b.y+b.height/2-s.y-s.height/2)<1e-6);assert.equal(s.height,40*zoom);
  assert.equal(control.attrs.tab_index[0],0);assert.ok(control.attrs.focus);assert.equal(control.attrs.tooltip,undefined);
  assert.ok(nodes(control).some(node=>node.attrs?.asset?.[0]===`mods/custom-changes/sections-${p.foldedRepositories.collapsed?'collapsed':'expanded'}.svg`));
  for(const tab of ['open','closed']) {
    const el=find(tree,`git-view-${tab}`),label=find(el,`git-view-${tab}-label`),tb=geometry.get(el),lb=geometry.get(label);
    assert.equal(words(el).join(''),tab==='open'?'Open':'Closed');assert.equal(find(tree,`git-view-${tab}-count`),undefined);
    assert.ok(Math.abs(lb.x-tb.x-8*zoom)<1e-6);assert.ok(Math.abs(tb.x+tb.width-lb.x-lb.width-8*zoom)<1e-6);
  }
}
console.log('PASS one right-aligned 24px shared control, 40px strip, focus semantics and unchanged label-only tabs at 100%/130%');
