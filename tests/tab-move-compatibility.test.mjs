// Entirely synthetic upstream/API and Core fixtures. No network or live sessions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inventory, inventoryHash, compareRelease, checkTabMove, tabMoveVersionStatus, auditHostTabMove, parseArgs} from '../tools/check-tab-move.mjs';
const require = createRequire(import.meta.url);
const {PROFILE, validateProfile} = require('../src/integration/herdr/documents/tab-move-v1.cjs');
const hex = char => char.repeat(40), baseCommit = hex('a'), targetCommit = hex('b');
const entry = (path, hash = hex('1'), mode = '100644', type = 'blob') => ({path, sha: hash, mode, type});
const base = {truncated: false, tree: [entry('src/mirror.rs'), entry('src/window.rs', hex('2')), entry('Cargo.lock', hex('3'))]};
const contract = {version: 1, repository: 'herdrdev/herdr-app', appVersion: '0.1.16', commit: baseCommit,
  inventorySha256: inventoryHash(inventory(base)), criticalFiles: {'src/mirror.rs': hex('1'), 'src/window.rs': hex('2')}};
function upstream(tree = base, {annotated = false} = {}) {
  const calls = [];
  const get = async (url, signal) => {
    calls.push(url); assert.ok(signal instanceof AbortSignal);
    if (url === `git/trees/${baseCommit}?recursive=1`) return structuredClone(base);
    if (url === `git/trees/${targetCommit}?recursive=1`) return structuredClone(tree);
    if (url === 'git/ref/tags/v0.1.17' || url === 'git/ref/tags/v0.1.16') return {ref: url.replace('git/ref/', 'refs/'), object: {type: annotated ? 'tag' : 'commit', sha: targetCommit}};
    if (url === `git/tags/${targetCommit}`) return {object: {type: 'commit', sha: targetCommit}};
    assert.fail('Unexpected endpoint: ' + url);
  };
  return {get, calls};
}
let assertions = 0;
assert.equal(inventoryHash(inventory({...base, tree: [...base.tree].reverse()})), contract.inventorySha256);
assert.notEqual(inventoryHash(inventory({...base, tree: [entry('src/mirror.rs', hex('1'), '100755'), ...base.tree.slice(1)]})), contract.inventorySha256);
assertions += 2;
for (const tree of [null, {}, {truncated: true, tree: base.tree}, {...base, tree: []}, {...base, tree: [...base.tree, base.tree[0]]},
  {...base, tree: [entry('../secret')]}, {...base, tree: [entry('/absolute')]}, {...base, tree: [entry('src\\mirror.rs')]},
  {...base, tree: [entry('src/mirror.rs', 'not-a-hash')]}, {...base, tree: [entry('src/mirror.rs', hex('1'), 'bad-mode')]}, {...base, tree: [entry('src/mirror.rs', hex('1'), '100644', 'tree')]}]) {
  assert.throws(() => inventory(tree)); assertions++;
}
{
  const fake = upstream();
  const report = await compareRelease('0.1.17', {...fake, contract});
  assert.equal(report.status, 'unchanged'); assert.equal(report.changedFiles, 0);
  assert.equal(report.commit, targetCommit);
  assert.equal(fake.calls.some(url => url === 'git/ref/tags/v0.1.16'), false, 'Baseline is fetched by pinned commit, never a mutable tag');
  assert.equal(report.compareUrl, `https://github.com/herdrdev/herdr-app/compare/${baseCommit}...${targetCommit}`);
  const gateBefore = [...PROFILE.apps];
  const result = await checkTabMove({appVersion: '0.1.17', contract, get: fake.get, regressions: () => ({ok: true})});
  assert.equal(result.ok, false); assert.equal(result.status, 'needs-review', 'Identical sources do NOT authorize an unknown installed binary');
  assert.deepEqual(PROFILE.apps, gateBefore); assert.equal(tabMoveVersionStatus('0.1.17').reviewed, false);
  assert.throws(() => validateProfile('0.1.17', {version: '0.1.21', generation: 1}), /reviewed/);
  assertions += 10;
}
{
  const changed = {...base, tree: [entry('src/mirror.rs', hex('4')), entry('src/hidden-dependency.rs', hex('5')), entry('Cargo.lock', hex('6'))]};
  const report = await compareRelease('0.1.17', {...upstream(changed, {annotated: true}), contract});
  assert.equal(report.status, 'changed'); assert.equal(report.changedFiles, 4);
  assert.deepEqual(report.criticalChanges.map(e => [e.file,e.change]), [['src/mirror.rs','changed'],['src/window.rs','removed']]);
  assert.ok(report.changes.some(e => e.file === 'src/hidden-dependency.rs' && e.change === 'added'));
  assert.ok(report.changes.some(e => e.file === 'Cargo.lock'));
  assertions += 5;
}
{
  const many = {...base, tree: [...base.tree, ...Array.from({length: 110}, (_,i) => entry(`new/${i}.rs`))]};
  const report = await compareRelease('0.1.17', {...upstream(many), contract});
  assert.equal(report.changedFiles, 110); assert.equal(report.changes.length, 100); assert.equal(report.omittedChanges, 10); assertions += 3;
}
await assert.rejects(() => compareRelease('0.1.16', {...upstream(), contract}), /release tag changed/); assertions++;
for (const badContract of [{...contract, inventorySha256: '0'.repeat(64)}, {...contract, criticalFiles: {'src/mirror.rs': hex('9')}},
  {...contract, appVersion: '0.1.17'}, {...contract, repository: 'untrusted/repo'}]) {
  await assert.rejects(() => compareRelease('0.1.17', {...upstream(), contract: badContract})); assertions++;
}
for (const badVersion of ['../main', '0.1.17/../main', 'v0.1.16', '0.1.017', '0.1.17-dev', undefined]) {
  let fetched = false;
  await assert.rejects(() => compareRelease(badVersion, {get: async () => {fetched = true;}}));
  assert.equal(fetched, false); assertions += 2;
}
{
  const get = async url => url.includes('trees/') ? base : {ref: 'refs/tags/vWRONG', object: {type:'commit',sha:targetCommit}};
  await assert.rejects(() => compareRelease('0.1.17', {get, contract}), /did not match/);
  const loop = async url => url.includes('trees/') ? base : url.includes('/ref/')
    ? {ref: 'refs/tags/v0.1.17', object: {type:'tag',sha:targetCommit}}
    : {object: {type:'tag',sha:targetCommit}};
  await assert.rejects(() => compareRelease('0.1.17', {get: loop, contract}), /nesting/); assertions += 2;
}
{
  const broken = upstream({...base, truncated: true});
  const result = await checkTabMove({appVersion:'0.1.17', contract, get:broken.get, regressions:()=>({ok:true})});
  assert.equal(result.ok,false); assert.equal(result.source.status,'unavailable');
  const offline = await checkTabMove({appVersion:'0.1.16', offline:true, get:()=>assert.fail('Offline means no HTTP'), regressions:()=>({ok:true})});
  assert.equal(offline.ok,true); assert.equal(offline.source.status,'not-checked');
  const fail = await checkTabMove({appVersion:'0.1.16', offline:true, regressions:()=>({ok:false})});
  assert.equal(fail.ok,false); assert.equal(fail.status,'regression-failed');
  const unavailable = await checkTabMove({appVersion:'0.1.16', get:async()=>{throw Error('HTTP 429');}, regressions:()=>({ok:true})});
  assert.equal(unavailable.ok,false); assert.match(unavailable.source.error,/429/); assertions += 8;
}
{
  const known = await auditHostTabMove({ok:true,version:'0.1.16'},()=>assert.fail('Known release stays fast/offline'));
  assert.equal(known.tabMove.reviewed,true);
  const calls=[];
  const unknown = await auditHostTabMove({ok:true,version:'0.1.17'},async args=>{calls.push(args);return {ok:false,status:'needs-review'};});
  assert.deepEqual(calls,[{appVersion:'0.1.17'}]); assert.equal(unknown.ok,true,'Private feature failure never changes public compatibility');
  assert.equal(unknown.tabMove.upgradeAudit.status,'needs-review');
  const prerelease = await auditHostTabMove({ok:false,version:'dev'},async()=>{throw Error('No release source');});
  assert.equal(prerelease.ok,false); assert.equal(prerelease.tabMove.upgradeAudit.status,'unavailable'); assertions += 6;
}
assert.deepEqual(parseArgs(['--release','0.1.16','--offline']),{appVersion:'0.1.16',offline:true});
for (const args of [['--approve'],['--release'],['--release','../main'],['--offline','--offline']]) assert.throws(()=>parseArgs(args));
assertions += 5;
// The audit never rewrites the canonical runtime adapter/profile.
const adapterFile = new URL('../src/integration/herdr/documents/tab-move-v1.cjs',import.meta.url);
const hash = () => createHash('sha256').update(fs.readFileSync(adapterFile)).digest('hex');
const before = hash();
await checkTabMove({appVersion:'0.1.17',contract,get:upstream().get,regressions:()=>({ok:true})});
assert.equal(hash(),before); assertions++;
console.log(`PASS: ${assertions} tab-move upgrade-audit assertions: pinned provenance, complete tree diffs, fail-closed unknown versions, offline/failure handling and advisory automatic host checks (no network/Core)`);
