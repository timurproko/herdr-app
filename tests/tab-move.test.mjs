// Synthetic Core only: never writes a live document or starts a terminal/Core.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from '../tools/build.mjs';
const {output} = build(), require = createRequire(import.meta.url);
const contract = require(path.join(output, 'mods/custom-tabs/tab-move-v1.cjs'));
const {operate} = require(path.join(output, 'mods/custom-tabs/move-tab.cjs'));
const clone = structuredClone, now = () => 100000;
const pane = (id, terminal) => ({id, type: 'block', content: {terminal}, size: {weight: 1}});
const tab = (id, children) => ({id, name: 'Work', root: {id, type: 'row', children}});
const start = id => tab(id, [{id: 'p' + id, type: 'block', content: {mod: 'custom-space-start', props: {spaceId: 's2'}}}]);
function fixture(appVersion = '0.1.15') {
  const doc = {spaces: [
    {id: 's1', name: 'Source', folder: '/src', color: 'blue', tabs: [tab('tb1', [pane('p1', 't1'), {id: 'split', type: 'column', children: [pane('p2', 't2')], size: {weight: 2}}])]},
    {id: 's2', name: 'Target', folder: '/target', tabs: [tab('tb2', [{id: 'p3', type: 'block', content: {mod: 'custom-files', props: {path: '/target/readme.md'}}}]), start('start2')]},
    {id: 's3', name: 'Other', folder: '/other', tabs: [tab('tb3', [pane('p4', 't4')])]},
  ]};
  const terminal = (address, space, tabId, parent) => ({address, state: 'live', created_ms: 1, pid: 123, ...(parent ? {parent} : {}), labels: {'herdr.space': space, 'herdr.tab': tabId, unrelated: 'keep'}});
  const records = new Map([
    terminal('t1', 's1', 'tb1'), terminal('t2', 's1', 'tb1'), terminal('t3', 's1', 'tb1', 't1'),
    terminal('t4', 's3', 'tb3', 't1'), terminal('t5', 's3', 'tb3', 't4'),
  ].map(t => [t.address, t]));
  const hello = {version: '0.1.21', generation: 1, core: {id: 'core-one'}, methods: ['doc.get', 'doc.set', 'terminal.get', 'terminal.list', 'terminal.label']};
  const calls = [], state = {doc, version: 7, records, hello, calls, onSet: null, onLabel: null, afterGet: null};
  const rpc = async (method, args) => {
    calls.push([method, clone(args)]);
    if (method === 'hello') return clone(hello);
    if (method === 'doc.get') return {value: clone(state.doc), version: state.version};
    if (method === 'doc.set') {
      if (state.onSet) await state.onSet(args, state);
      if (args.version !== state.version) throw Object.assign(Error('conflict'), {kind: 'conflict'});
      state.doc = clone(args.value); return {version: ++state.version};
    }
    if (method === 'terminal.list') return {terminals: clone([...records.values()])};
    if (method === 'terminal.get') { const r = clone(records.get(args.terminal)); state.afterGet?.(r, args); return r; }
    if (method === 'terminal.label') { await state.onLabel?.(args); Object.assign(records.get(args.terminal).labels, args.labels); return clone(records.get(args.terminal)); }
    throw Error('Unexpected RPC ' + method);
  };
  const request = {action: 'move', machine: null, requestId: 'request-1', expiresAt: now() + 20000,
    appVersion, coreId: 'core-one', sourceSpaceId: 's1', destinationSpaceId: 's2', tabId: 'tb1', keepSource: false, fingerprint: contract.fingerprint(doc.spaces[0].tabs[0])};
  return {state, request, rpc, run: r => operate(r ?? request, rpc, {now, appVersion: () => appVersion})};
}
let assertions = 0;
// Exact reviewed pairs, not a semver range. Inspection is read-only; moves retain
// the newly reviewed 0.1.16 typography fields without rebuilding the tab payload.
for (const app of ['0.1.15', '0.1.16']) for (const core of ['0.1.19', '0.1.21', '0.1.22']) {
  const f = fixture(app); f.state.hello.version = core;
  Object.assign(f.state.doc.spaces[0].tabs[0].root, {
    font_weight: 400, terminal_line_height: 1.1, terminal_cell_width: 0.95, terminal_scroll_speed: 2,
  });
  f.request.fingerprint = contract.fingerprint(f.state.doc.spaces[0].tabs[0]);
  const before = clone(f.state.doc.spaces[0].tabs[0]);
  assert.equal((await f.run({...f.request, action: 'inspect'})).ok, true, `${app}/${core} inspection`);
  assert.equal(f.state.calls.some(([m]) => ['doc.set', 'terminal.label'].includes(m)), false);
  assert.equal((await f.run()).status, 'moved', `${app}/${core} move`);
  assert.deepEqual(f.state.doc.spaces.find(s => s.id === 's2').tabs.find(t => t.id === 'tb1'), before);
  assertions += 4;
}
for (const app of ['0.1.14', '0.1.17', '0.2.0']) {
  const f = fixture(app);
  assert.equal((await f.run({...f.request, action: 'inspect'})).ok, false);
  assert.equal((await f.run()).status, 'failed');
  assert.equal(f.state.calls.some(([m]) => ['doc.set', 'terminal.label'].includes(m)), false);
  assertions += 3;
}
{
  const {state, request} = fixture(), before = clone(state.doc);
  const plan = contract.planMove({value: state.doc, version: 7}, request);
  assert.deepEqual(state.doc, before);
  assert.deepEqual(plan.value.spaces.find(s => s.id === 's2').tabs.map(t => t.id), ['tb2', 'tb1', 'start2'], 'Append work BEFORE the hidden Start tab to avoid a second reorder');
  assert.deepEqual(plan.value.spaces.find(s => s.id === 's2').tabs[1], before.spaces[0].tabs[0]);
  assert.deepEqual(plan.value.spaces.find(s => s.id === 's3'), before.spaces[2]);
  assert.equal(plan.value.spaces.some(s => s.id === 's1'), false);
  assert.throws(() => contract.planMove({value: state.doc, version: 7}, {...request, keepSource: true}), /Start page/);
  state.doc.spaces[0].tabs.push(start('start1'));
  const retained = contract.planMove({value: state.doc, version: 8}, {...request, keepSource: true});
  assert.equal(retained.value.spaces[0].tabs[0].id, 'start1');
  assertions += 7;
}
for (const mutate of [
  d => d.spaces.push(clone(d.spaces[0])),
  d => d.spaces[0].tabs[0].root.children.push(pane('dup', 't1')),
  d => d.spaces[0].tabs[0].floating = [{terminal: 't9'}],
  d => d.spaces[0].tabs[0].root.floating = [{id: 'floating', content: {terminal: 't9'}}],
  d => d.spaces[0].tabs[0].root.children[0].unknown = {},
  d => d.spaces[0].tabs[0].root.children[0].content = {agent: 'focused'},
  d => d.spaces[0].tabs[0].root.id = 'not-the-tab',
  d => d.extra = {spaces: []},
]) {
  const {state, request} = fixture(); mutate(state.doc);
  assert.throws(() => contract.planMove({value: state.doc, version: 7}, request)); assertions++;
}
{
  const {state, request} = fixture();
  const s = state.doc.spaces[1].tabs.at(-1);
  assert.throws(() => contract.locate({value: state.doc, version: 7}, {...request, tabId: s.id, sourceSpaceId: 's2', fingerprint: undefined}), /Start pages/);
  state.doc.spaces[0].tabs[0].root.children[0] = {id: 'p1', type: 'block', content: {mod: 'other', props: {spaceId: 's1'}}};
  assert.throws(() => contract.locate({value: state.doc, version: 7}, {...request, fingerprint: undefined}), /bound to its space/); assertions += 2;
}
{
  const f = fixture(), result = await f.run({...f.request, action: 'inspect'});
  assert.equal(result.ok, true); assert.equal(result.fingerprint, f.request.fingerprint);
  assert.equal(f.state.calls.some(([m]) => ['doc.set', 'terminal.label'].includes(m)), false); assertions += 3;
}
{
  const f = fixture(), moved = clone(f.state.doc.spaces[0].tabs[0]), result = await f.run();
  assert.equal(result.status, 'moved');
  assert.deepEqual(f.state.doc.spaces[0].tabs.find(t => t.id === 'tb1'), moved);
  for (const address of ['t1', 't2', 't3']) assert.deepEqual(f.state.records.get(address).labels, {'herdr.space': 's2', 'herdr.tab': 'tb1', unrelated: 'keep'});
  for (const address of ['t4', 't5']) assert.equal(f.state.records.get(address).labels['herdr.space'], 's3');
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1); assertions += 8;
}
for (const patch of [{machine: 'remote'}, {expiresAt: 1}, {appVersion: '0.1.16'}, {coreId: 'different-core'}, {fingerprint: '0'.repeat(64)}, {destinationSpaceId: 'gone'}, {destinationSpaceId: 's1'}]) {
  const f = fixture(), result = await f.run({...f.request, ...patch});
  assert.equal(result.status, 'failed'); assert.equal(f.state.calls.some(([m]) => m === 'doc.set'), false); assertions += 2;
}
{
  const f = fixture(); f.state.version = Number.MAX_SAFE_INTEGER + 1;
  assert.equal((await f.run()).status, 'failed'); assert.equal(f.state.calls.some(([m]) => m === 'doc.set'), false); assertions += 2;
}
{
  const f = fixture('0.1.16'); f.state.hello.version = '0.1.23';
  const result = await f.run();
  assert.equal(result.status, 'failed');
  assert.match(result.message, /Detected App: 0\.1\.16; Core: 0\.1\.23; generation: 1/);
  assert.match(result.message, /Reviewed Apps: 0\.1\.15, 0\.1\.16; Cores: 0\.1\.19, 0\.1\.21, 0\.1\.22; generation: 1/);
  assert.equal(f.state.calls.some(([m]) => m !== 'hello'), false); assertions += 4;
}
for (const patch of [
  {generation: 2}, {core: {}},
  ...['doc.get', 'doc.set', 'terminal.get', 'terminal.list', 'terminal.label'].map(missing => ({methods: ['doc.get', 'doc.set', 'terminal.get', 'terminal.list', 'terminal.label'].filter(m => m !== missing)})),
]) {
  const f = fixture('0.1.16'); Object.assign(f.state.hello, {version: '0.1.22'}, patch);
  const result = await f.run({...f.request, action: 'inspect'});
  assert.equal(result.ok, false);
  assert.equal(f.state.calls.some(([m]) => m !== 'hello'), false, 'Refused profiles cannot even read a document');
  if (patch.generation) assert.match(result.message, /generation: 2.*generation: 1/);
  if (patch.methods) assert.match(result.message, /Core is missing/);
  if (patch.core) assert.match(result.message, /Core identity is unavailable/);
  assertions += 3;
}
{
  const f = fixture('0.1.16'); f.state.hello.version = '0.1.22';
  const before = clone(f.state.doc);
  f.state.onSet = () => { throw Object.assign(Error('cannot save document: disk full'), {kind: 'internal', code: -32603}); };
  const result = await f.run();
  assert.equal(result.status, 'unknown', 'Non-conflict save errors retain conservative readback/unknown semantics');
  assert.deepEqual(f.state.doc, before, 'Core rolls back the document on failed persistence');
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1, 'An internal error is never a CAS retry');
  assert.equal(f.state.calls.some(([m]) => m === 'terminal.label'), false); assertions += 4;
}
for (const applied of [false, true]) {
  const f = fixture('0.1.16'); f.state.hello.version = '0.1.22';
  f.state.onLabel = args => {
    if (applied) Object.assign(f.state.records.get(args.terminal).labels, args.labels);
    throw Object.assign(Error('cannot save terminals; the operation may already have completed'), {kind: 'unavailable'});
  };
  const result = await f.run();
  assert.equal(result.status, 'partial', 'Unavailable labels are partial success even if already applied in memory');
  assert.equal(f.state.doc.spaces.find(s => s.id === 's2').tabs.some(t => t.id === 'tb1'), true);
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1, 'Never roll back a committed move');
  f.state.onLabel = null;
  assert.equal((await f.run({...f.request, action: 'repair', sourceSpaceId: 's2'})).status, 'repaired');
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1);
  assert.equal(f.state.records.get('t1').labels.unrelated, 'keep'); assertions += 6;
}
{
  const f = fixture(); let count = 0;
  f.state.onSet = () => { if (!count++) { f.state.doc.spaces[2].color = 'red'; f.state.version++; throw Object.assign(Error('conflict'), {kind: 'conflict'}); } };
  assert.equal((await f.run()).status, 'moved'); assert.equal(f.state.doc.spaces.at(-1).color, 'red');
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 2); assertions += 3;
}
{
  const f = fixture(); f.state.onSet = () => { f.state.doc.spaces[0].tabs[0].name = 'Concurrent edit'; f.state.version++; throw Object.assign(Error('conflict'), {kind: 'conflict'}); };
  assert.equal((await f.run()).status, 'failed'); assert.equal(f.state.doc.spaces[0].tabs[0].name, 'Concurrent edit');
  assert.equal(f.state.calls.some(([m]) => m === 'terminal.label'), false); assertions += 3;
}
{
  const f = fixture(); f.state.onSet = () => { throw Object.assign(Error('conflict'), {kind: 'conflict'}); };
  assert.equal((await f.run()).status, 'failed'); assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 2); assertions += 2;
}
{
  const f = fixture(); f.state.onSet = args => { f.state.doc = clone(args.value); f.state.version++; throw Error('timeout after acceptance'); };
  assert.equal((await f.run()).status, 'moved'); assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1); assertions += 2;
}
{
  const f = fixture(); f.state.onSet = () => { throw Error('timeout before acceptance'); };
  assert.equal((await f.run()).status, 'unknown'); assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, 1);
  assert.equal(f.state.calls.some(([m]) => m === 'terminal.label'), false); assertions += 3;
}
{
  const f = fixture(); f.state.onLabel = args => { if (args.terminal === 't1') throw Error('label failure'); };
  assert.equal((await f.run()).status, 'partial');
  assert.equal(f.state.doc.spaces.some(s => s.id === 's1'), false, 'No automatic layout rollback');
  const repair = {...f.request, action: 'repair', sourceSpaceId: 's2'};
  assert.equal((await f.run({...repair, action: 'inspect'})).repairNeeded, true);
  const writes = f.state.calls.filter(([m]) => m === 'doc.set').length;
  f.state.onLabel = null;
  assert.equal((await f.run(repair)).status, 'repaired');
  assert.equal(f.state.calls.filter(([m]) => m === 'doc.set').length, writes, 'Repair never writes the layout'); assertions += 5;
}
{
  const f = fixture(); f.state.afterGet = record => { if (record?.address === 't1') record.pid = 999; };
  assert.equal((await f.run()).status, 'partial');
  assert.equal(f.state.calls.some(([m, a]) => m === 'terminal.label' && a.terminal === 't1'), false, 'Never relabel a replaced process identity'); assertions += 2;
}
{
  const f = fixture(); let clock = now(), hellos = 0;
  const rpc = async (method, args) => { const value = await f.rpc(method, args); if (method === 'hello' && ++hellos === 2) clock += 30000; return value; };
  const result = await operate(f.request, rpc, {now: () => clock, appVersion: () => '0.1.15'});
  assert.equal(result.status, 'failed');
  assert.equal(f.state.calls.some(([m]) => m === 'doc.set'), false, 'A handshake crossing the deadline cannot authorize a stale write'); assertions += 2;
}
// Remote routing is a separate adapter layer; the planner still sees raw local IDs.
for (const appVersion of ['0.1.15', '0.1.16']) for (const localVersion of ['0.1.21', '0.1.22']) {
  let routingVersion = localVersion;
  const f = fixture(appVersion); f.state.hello.version = '0.1.19';
  f.state.doc.spaces[0].tabs[0].root.children.push({id:'mod-pane',type:'block',content:{mod:'custom-files',props:{path:'pc2/t1',opaque:{'pc2/s1':'pc2/tb1'}}}});
  const originalTab = clone(f.state.doc.spaces[0].tabs[0]);
  f.request.fingerprint = contract.fingerprint(originalTab);
  const binding = {name:'pc2',id:'core-one',version:'0.1.19',session:'work',state:'connected',temporary:false};
  const wire = []; let changeSession = false;
  const qualify = t => ({...t,address:'pc2/'+t.address,...(t.parent ? {parent:'pc2/'+t.parent} : {})});
  const base = async (method,args) => {
    wire.push([method,clone(args)]);
    if (method === 'hello') return {...clone(f.state.hello),version:routingVersion,core:{id:'local-core'},methods:[...f.state.hello.methods,'machine.list','machine.exec']};
    if (method === 'machine.list') return {machines:[{...binding,session:changeSession?'replaced':binding.session}]};
    if (method === 'machine.exec') {
      assert.equal(args.on,'pc2');assert.deepEqual(args.argv.slice(0,2),['node','-e']);
      return {code:0,stdout:Buffer.from(JSON.stringify(f.state.hello)).toString('base64')};
    }
    if (method.startsWith('doc.')) { assert.equal(args.on,'pc2');const {on,...params}=args;return f.rpc(method,params); }
    if (method === 'terminal.list') return {terminals:[...f.state.records.values()].map(qualify).concat([{address:'t1',state:'live'},{address:'other/t1',state:'live'}])};
    if (method === 'terminal.get' || method === 'terminal.label') {
      assert.ok(args.terminal.startsWith('pc2/'));
      return qualify(await f.rpc(method,{...args,terminal:args.terminal.slice(4)}));
    }
    throw Error('Unexpected remote RPC '+method);
  };
  const ui = {...f.request,machine:'pc2',tabId:'pc2/tb1',sourceSpaceId:'pc2/s1',destinationSpaceId:'pc2/s2'};
  const scoped = contract.scopeRequest(ui), rpc = contract.machineRpc(base,'pc2');
  for (const versions of [{local:'0.1.23',remote:'0.1.19'}, {local:localVersion,remote:'0.1.23'}]) {
    routingVersion = versions.local; binding.version = f.state.hello.version = versions.remote;
    const rejected = await operate({...scoped,action:'inspect'},contract.machineRpc(base,'pc2'),{now,appVersion:()=>appVersion});
    assert.equal(rejected.ok,false);
    assert.match(rejected.message,/Core: 0\.1\.23/);
    assert.equal(wire.some(([m])=>m.startsWith('doc.')||m==='terminal.label'),false,'Unknown routing or target versions fail before forwarding layout calls'); assertions+=3;
  }
  routingVersion = localVersion; binding.version = f.state.hello.version = '0.1.19';
  assert.equal(scoped.machine,null);assert.equal(scoped.tabId,'tb1');assert.equal(ui.tabId,'pc2/tb1');
  assert.equal((await operate(scoped,rpc,{now,appVersion:()=> appVersion})).status,'moved');
  assert.deepEqual(f.state.doc.spaces.find(s=>s.id==='s2').tabs.find(t=>t.id==='tb1'),originalTab,'Qualified-looking mod props remain opaque and unchanged'); assertions++;
  assert.equal(f.state.records.get('t1').labels['herdr.space'],'s2','Remote adoption labels stay unqualified');
  assert.equal(f.state.records.get('t4').labels['herdr.space'],'s3','Unrelated remote panes stay untouched');
  assert.throws(()=>contract.scopeRequest({...ui,destinationSpaceId:'other/s2'}),/same machine/);
  assert.throws(()=>contract.scopeRequest({...ui,sourceSpaceId:'s1'}),/same machine/);
  assert.throws(()=>contract.scopeRequest({...ui,machine:null}),/machine-local/);
  changeSession=true;
  await assert.rejects(()=>rpc('doc.get',{name:'herdr-app'}),/identity\/session\/version changed/);
  assert.equal(wire.filter(([m])=>m==='doc.set').length,1);assertions+=11;
}
{
  const f=fixture();
  const base=async(method)=>method==='machine.list'?{machines:[{name:'pc2',state:'connected',id:'expected',version:'0.1.19'}]}
    :method==='hello'?{...f.state.hello,methods:[...f.state.hello.methods,'machine.list','machine.exec']}
    :method==='machine.exec'?{code:0,stdout:Buffer.from(JSON.stringify({...f.state.hello,version:'0.1.19',core:{id:'wrong-session'}})).toString('base64')}
    :assert.fail('Unexpected forwarding before remote identity verification');
  await assert.rejects(()=>contract.machineRpc(base,'pc2')('hello',{}),/identity\/version/);assertions++;
}
console.log(`PASS: ${assertions} tab-move planner, preservation, version/identity, CAS conflict, unknown-outcome, metadata repair and descendant-isolation assertions (synthetic Core only)`);
