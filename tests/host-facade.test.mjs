import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {project} from '../tools/build.mjs';
import {HOST_CONTRACT,hostProfile} from '../src/integration/herdr/compatibility.js';
const dir=path.join(project,'src/integration/herdr'),context=vm.createContext({}),calls=[];let reportedVersion=null;
const api={
 checking:()=>true,updates:()=>({app:{version:reportedVersion}}),run:(...args)=>calls.push(args),spaces:()=>null,settings:()=>null,
 theme:()=>({foreground:'#fff'}),shared:key=>key,missing:null,
};
const native=new vm.SyntheticModule(Object.keys(api),function(){for(const[k,v]of Object.entries(api))this.setExport(k,v);},{context,identifier:'herdr'});
const cache=new Map();function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const host=moduleFor(path.join(dir,'host.js'));await host.link((name,ref)=>name==='herdr'?native:moduleFor(path.resolve(path.dirname(ref.identifier),name)));await host.evaluate();const h=host.namespace;
assert.equal(h.checking(),true,'Native eager-check guard is exposed without changing its shape');
assert.ok(HOST_CONTRACT.reviewedVersions.includes('0.1.16'));assert.ok(hostProfile('0.1.16'));assert.equal(hostProfile('0.1.17'),null,'Review is explicit, not a future-version wildcard');
assert.equal(h.hostVersion(),null,'Transient startup metadata is not treated as a version');reportedVersion='0.1.14';assert.equal(h.hostVersion(),'0.1.14','A later ready version is detected and cached');
h.run('terminal.copy');h.run('pane.focus',{pane:'p1'});assert.deepEqual(calls,[['terminal.copy'],['pane.focus',{pane:'p1'}]],'Facade preserves native call arity and arguments');
assert.equal(JSON.stringify(h.spaces()),'[]');assert.equal(JSON.stringify(h.settings()),'{}');assert.equal(h.theme().foreground,'#fff');assert.equal(h.shared('layout'),'layout');assert.equal(h.hostVersion(),'0.1.14');
assert.throws(()=>h.panes(),/requires Herdr API panes.*0\.1\.14/);
console.log('PASS: host facade version detection, exact command calls, normalized collections/objects and actionable missing-API errors');
