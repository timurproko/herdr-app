import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const storage = new Map(); let redraws = 0;
const context = vm.createContext({
  sessionStorage: {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k)},
  window: {refresh: () => redraws++},
});
const mod = new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/file-header.js', import.meta.url), 'utf8'), {context});
await mod.link(() => {}); await mod.evaluate();
const {requestFileReload, fileReloadPending, fileReloadStamp, finishFileReload} = mod.namespace;
const space = 'pc2/space', path = '/project/file.txt';
assert.equal(fileReloadPending(space,path),false);
requestFileReload(space,path);
const stamp = fileReloadStamp(space,path);
assert.equal(fileReloadPending(space,path),true);assert.equal(redraws,1);
requestFileReload(space,path);assert.equal(fileReloadStamp(space,path),stamp);assert.equal(redraws,1,'Duplicate reloads stay blocked until the read settles');
finishFileReload('another-space',path,stamp);assert.equal(fileReloadPending(space,path),true);
finishFileReload(space,path,'stale');assert.equal(fileReloadPending(space,path),true);
finishFileReload(space,path,stamp);assert.equal(fileReloadPending(space,path),false);assert.equal(redraws,2);
requestFileReload(space,path);const next = fileReloadStamp(space,path);assert.notEqual(next,stamp);
finishFileReload(space,path,stamp);assert.equal(fileReloadPending(space,path),true,'Late reads never clear a newer header progress indicator');
finishFileReload(space,path,next);assert.equal(fileReloadPending(space,path),false);
console.log('PASS: file-header refresh pending state, duplicate guard, machine/space isolation and stale completion protection');
