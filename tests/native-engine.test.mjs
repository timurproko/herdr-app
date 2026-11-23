import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectNative, mutateNative, stockSource, digest } from '../tools/runtime/native-frame.mjs';
import { tree, edits, one, checkGraph } from '../tools/runtime/native-ast.mjs';
const base=fileURLToPath(new URL('../',import.meta.url));
const temp=fs.mkdtempSync(path.join(base,'.artifacts/native-engine-'));
const put=(f,b)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);};
const stock='import { View } from "gpui-kit";\nexport default class Palette extends View { render() { return 1; } }\n';
const transform=(s,p)=>s+`\nimport { value } from '${p}/helper.js';\n`;
const patch={id:'palette',target:'frame/palette',files:{'main.js':'unused','helper.js':'helper.js'}};
let count=0;
function fixture(source=stock){const home=path.join(temp,String(count++)),root=path.join(home,'bundle');put(path.join(root,'helper.js'),'export const value = 1;');put(path.join(home,patch.target,'main.js'),source);const options={binary:Buffer.from('palette/main.js'+source+'palette/mod.json{}')};return {home,root,options};}
const snapshot=dir=>{const out={};function visit(d){for(const n of fs.readdirSync(d)){const f=path.join(d,n);if(fs.statSync(f).isDirectory())visit(f);else out[path.relative(dir,f)]=fs.readFileSync(f).toString('base64');}}visit(dir);return out;};
try {
  const a=fixture();const before=snapshot(a.home);assert.equal(inspectNative(a.home,a.root,patch,transform,a.options).phase,'repair-needed');assert.deepEqual(snapshot(a.home),before);
  mutateNative('apply',a.home,a.root,patch,transform,a.options);assert.equal(inspectNative(a.home,a.root,patch,transform,a.options).active,true);
  const main=path.join(a.home,patch.target,'main.js'),stat=fs.statSync(main,{bigint:true}),installed=snapshot(a.home);
  assert.match(mutateNative('apply',a.home,a.root,patch,transform,a.options),/already current/);assert.equal(fs.statSync(main,{bigint:true}).mtimeNs,stat.mtimeNs);assert.deepEqual(snapshot(a.home),installed);
  const future=stock.replace('return 1','return 2');a.options.binary=Buffer.from('palette/main.js'+future+'palette/mod.json{}');
  mutateNative('apply',a.home,a.root,patch,transform,a.options);assert.match(fs.readFileSync(main,'utf8'),/return 2/);
  mutateNative('restore',a.home,a.root,patch,transform,a.options);assert.equal(fs.readFileSync(main,'utf8'),future);
  for(const source of [stock.replaceAll('\n','\r\n'),'\ufeff'+stock]){const f=fixture(source);mutateNative('apply',f.home,f.root,patch,transform,f.options);mutateNative('restore',f.home,f.root,patch,transform,f.options);assert.equal(fs.readFileSync(path.join(f.home,patch.target,'main.js'),'utf8'),source);}
  assert.throws(()=>stockSource('palette',null,null,null),/unavailable/);
  assert.throws(()=>stockSource('palette',null,null,Buffer.from('palette/main.jsxpalette/main.js')),/ambiguous/);
  assert.throws(()=>stockSource('palette',null,null,Buffer.from('palette/main.js'+stock)),/mod.json/);
  assert.throws(()=>stockSource('palette',null,null,Buffer.from('palette/main.jsnot js palette/mod.json')),/parse/);
  assert.throws(()=>one([], 'missing'),/missing/);assert.throws(()=>one([1,2],'duplicate'),/duplicate/);
  assert.throws(()=>edits(stock,[{start:0,end:2,value:''},{start:1,end:3,value:''}]),/overlapping/);
  assert.throws(()=>checkGraph("import './absent.js'",{}),/missing module/);
  const skip=fixture();const skipBefore=snapshot(skip.home);assert.throws(()=>inspectNative(skip.home,skip.root,patch,()=>{throw Error('bad');},skip.options),/bad/);assert.deepEqual(snapshot(skip.home),skipBefore);
} finally { /* More transaction cases below share the disposable root. */ }
try {
  for(const where of ['helper','main','state','commit']) {
    const f=fixture(),before=snapshot(f.home);
    const fault=(phase,file)=>{if((where==='commit'&&phase==='before-commit')||(phase==='after-write'&&file.includes(where==='helper'?'helper.js':where==='main'?'/main.js':'frame-palette.json')))throw Error('injected');};
    assert.throws(()=>mutateNative('apply',f.home,f.root,patch,transform,{...f.options,fault}),/previous graph restored/);
    assert.deepEqual(snapshot(f.home),before);
  }
  const vanished=fixture(),vanishedBefore=snapshot(vanished.home);
  assert.throws(()=>mutateNative('apply',vanished.home,vanished.root,patch,transform,{...vanished.options,fault:(phase)=>{if(phase==='before-commit'){const record=JSON.parse(fs.readFileSync(path.join(vanished.home,'.customizations/frame-palette.json')));fs.unlinkSync(path.join(vanished.home,patch.target,record.generation,'helper.js'));}}}),/previous graph restored/);
  assert.deepEqual(snapshot(vanished.home),vanishedBefore,'A reset after individual readbacks cannot silently certify a missing helper');
  const restoreFault=fixture();mutateNative('apply',restoreFault.home,restoreFault.root,patch,transform,restoreFault.options);
  const restoreMain=path.join(restoreFault.home,patch.target,'main.js'),restoreBefore=snapshot(restoreFault.home),rename=fs.renameSync;
  fs.renameSync=(from,to)=>{rename(from,to);if(to===restoreMain){const body=fs.readFileSync(to,'utf8'),gen=body.match(/custom-[a-f0-9]{24}/)?.[0];if(gen)assert.ok(fs.existsSync(path.join(restoreFault.home,patch.target,gen,'helper.js')),'Rollback must recreate prior dependencies before reactivating main');}};
  try{assert.throws(()=>mutateNative('restore',restoreFault.home,restoreFault.root,patch,transform,{...restoreFault.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('helper.js'))throw Error('restore failed');}}),/previous graph restored/);assert.deepEqual(snapshot(restoreFault.home),restoreBefore);}finally{fs.renameSync=rename;}
  const crash=fixture(),main=path.join(crash.home,patch.target,'main.js');
  assert.throws(()=>mutateNative('apply',crash.home,crash.root,patch,transform,{...crash.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('/main.js')){const e=Error('killed');e.crash=true;throw e;}}}),/killed/);
  assert.equal(inspectNative(crash.home,crash.root,patch,transform,crash.options).status,'recovery-required');
  mutateNative('apply',crash.home,crash.root,patch,transform,crash.options);assert.equal(inspectNative(crash.home,crash.root,patch,transform,crash.options).active,true);
  const personal=fs.readFileSync(main,'utf8')+'// personal edit';put(main,personal);assert.throws(()=>mutateNative('restore',crash.home,crash.root,patch,transform,crash.options),/Personal.*target/);assert.equal(fs.readFileSync(main,'utf8'),personal);
  const conflict=fixture();assert.throws(()=>mutateNative('apply',conflict.home,conflict.root,patch,transform,{...conflict.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('/main.js')){put(path.join(conflict.home,file),'external');throw Error('race');}}}),/recovery required/);
  assert.equal(inspectNative(conflict.home,conflict.root,patch,transform,conflict.options).status,'recovery-required');
  const migration=fixture();const original=stock;const patched=stock+'// old owned\n';put(path.join(migration.home,patch.target,'main.js'),patched);put(path.join(migration.home,'.customizations/frame-palette.json'),JSON.stringify({version:1,original:{'main.js':original},installed:{'main.js':digest(patched)}}));
  mutateNative('apply',migration.home,migration.root,patch,transform,migration.options);assert.equal(JSON.parse(fs.readFileSync(path.join(migration.home,'.customizations/frame-palette.json'))).version,2);
  const lock=path.join(migration.home,'.customizations/native-patches.lock');put(lock,String(process.pid));assert.throws(()=>mutateNative('apply',migration.home,migration.root,patch,transform,migration.options),/busy/);fs.unlinkSync(lock);
  put(lock,'99999999');assert.throws(()=>mutateNative('apply',migration.home,migration.root,patch,transform,migration.options),/Stale/);assert.equal(fs.existsSync(lock),false);
  const caps=fixture();assert.equal(inspectNative(caps.home,caps.root,{...patch,capabilities:['missingApi']},transform,{...caps.options,apis:[]}).status,'skipped');
  const corrupt=fixture();put(path.join(corrupt.home,'.customizations/frame-palette.json'),'{broken');assert.throws(()=>inspectNative(corrupt.home,corrupt.root,patch,transform,corrupt.options),/Corrupt/);
  const changed=fixture();mutateNative('apply',changed.home,changed.root,patch,transform,changed.options);const state=JSON.parse(fs.readFileSync(path.join(changed.home,'.customizations/frame-palette.json')));const helper=path.join(changed.home,patch.target,state.generation,'helper.js');put(helper,'personal helper');assert.throws(()=>inspectNative(changed.home,changed.root,patch,transform,changed.options),/Personal.*dependency/);
  const reset=fixture();mutateNative('apply',reset.home,reset.root,patch,transform,reset.options);const state2=JSON.parse(fs.readFileSync(path.join(reset.home,'.customizations/frame-palette.json')));fs.rmSync(path.join(reset.home,patch.target,state2.generation),{recursive:true});put(path.join(reset.home,patch.target,'main.js'),stock);mutateNative('apply',reset.home,reset.root,patch,transform,reset.options);assert.equal(inspectNative(reset.home,reset.root,patch,transform,reset.options).active,true);
  const link=fixture();fs.symlinkSync(link.home,path.join(temp,'linked-home'),process.platform==='win32'?'junction':'dir');assert.throws(()=>inspectNative(path.join(temp,'linked-home'),link.root,patch,transform,link.options),/symlink/);
  const tempConflict=fixture(),tempPath=path.join(tempConflict.home,`.customizations/native-palette.journal.json.custom-${process.pid}.tmp`);put(tempPath,'personal temp');assert.throws(()=>mutateNative('apply',tempConflict.home,tempConflict.root,patch,transform,tempConflict.options),/EEXIST/);assert.equal(fs.readFileSync(tempPath,'utf8'),'personal temp');
  const unsupported=fixture();assert.equal(inspectNative(unsupported.home,unsupported.root,patch,transform,{binary:null}).status,'skipped');
  const invalid=fixture();assert.equal(inspectNative(invalid.home,invalid.root,patch,()=> 'export default }',invalid.options).status,'skipped');
  const fixtures=path.join(base,'tests/fixtures/native-stock');for(const [f,info]of Object.entries(JSON.parse(fs.readFileSync(path.join(fixtures,'provenance.json'))).files))assert.equal(digest(fs.readFileSync(path.join(fixtures,f))),info.sha256);const feedback16=fs.readFileSync(path.join(fixtures,'0.1.16/feedback.js'));assert.deepEqual(feedback16,fs.readFileSync(path.join(fixtures,'0.1.17/feedback.js')));
  assert.match(fs.readFileSync(path.join(fixtures,'0.1.17/palette.js'),'utf8'),/for \(const \{ name, light \} of themes\(\)\)/);
  console.log('PASS native structural engine: raw provenance, graph checks, generations, migration, no-op, restore, faults and crash recovery');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
