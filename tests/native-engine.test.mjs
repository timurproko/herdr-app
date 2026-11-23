import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectNative, mutateNative, stockSource, digest } from '../tools/runtime/native-frame.mjs';
import { nativeRecoveryInventory } from '../tools/runtime/native-recovery.mjs';
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
function previousFiles(home,before) {
  const after=snapshot(home),live=o=>Object.fromEntries(Object.entries(o).filter(([n])=>!n.replaceAll('\\','/').startsWith('.customizations/recovery/')));
  assert.deepEqual(live(after),live(before));
  for(const [file,bytes]of Object.entries(before))if(file.replaceAll('\\','/').startsWith('.customizations/recovery/'))assert.equal(after[file],bytes,'Earlier recovery evidence remains immutable');
}
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
  const skip=fixture();const skipBefore=snapshot(skip.home);const advisory=inspectNative(skip.home,skip.root,patch,()=>{throw TypeError('bad callback shape');},skip.options);assert.equal(advisory.status,'skipped');assert.match(advisory.advisory,/palette transform sample.*bad callback shape/);assert.deepEqual(snapshot(skip.home),skipBefore);
  assert.match(mutateNative('apply',skip.home,skip.root,patch,()=>{throw TypeError('unexpected callback shape');},skip.options),/Optional palette patch skipped:.*transform sample.*unexpected callback shape/);assert.deepEqual(snapshot(skip.home),skipBefore,'Unexpected transform errors also skip explicit apply before journaling or activation');
  const badEvidence=inspectNative(skip.home,skip.root,{...patch,capabilities:['example']},transform,{...skip.options,apis:{}});assert.equal(badEvidence.status,'skipped');assert.match(badEvidence.advisory,/inspection preflight/);assert.deepEqual(snapshot(skip.home),skipBefore);
} finally { /* More transaction cases below share the disposable root. */ }
try {
  for(const where of ['helper','main','state','commit']) {
    const f=fixture(),before=snapshot(f.home);
    const fault=(phase,file)=>{if((where==='commit'&&phase==='before-commit')||(phase==='after-write'&&file.includes(where==='helper'?'helper.js':where==='main'?'/main.js':'frame-palette.json')))throw Error('injected');};
    assert.throws(()=>mutateNative('apply',f.home,f.root,patch,transform,{...f.options,fault}),/previous graph restored/);
    previousFiles(f.home,before);
    const backups=nativeRecoveryInventory(f.home).backups;assert.ok(backups.length>0,'Rollback retires its journal only into an immutable recovery backup');
    const saved=JSON.parse(fs.readFileSync(path.join(f.home,backups[0].file)));assert.equal(Buffer.from(saved.changes.find(e=>e.file.endsWith('/main.js')).before,'base64').toString(),stock);
  }
  const vanished=fixture(),vanishedBefore=snapshot(vanished.home);
  assert.throws(()=>mutateNative('apply',vanished.home,vanished.root,patch,transform,{...vanished.options,fault:(phase)=>{if(phase==='before-commit'){const record=JSON.parse(fs.readFileSync(path.join(vanished.home,'.customizations/frame-palette.json')));fs.unlinkSync(path.join(vanished.home,patch.target,record.generation,'helper.js'));}}}),/previous graph restored/);
  previousFiles(vanished.home,vanishedBefore);
  for(const target of ['main','record']) {
    const repair=fixture();mutateNative('apply',repair.home,repair.root,patch,transform,repair.options);
    const recordFile=path.join(repair.home,'.customizations/frame-palette.json'),saved=fs.readFileSync(recordFile),record=JSON.parse(saved);
    const mainFile=path.join(repair.home,patch.target,'main.js'),mainBytes=fs.readFileSync(mainFile),helperFile=path.join(repair.home,patch.target,record.generation,'helper.js');
    fs.unlinkSync(helperFile);const writes=[];
    const changedFile=target==='main'?mainFile:recordFile,external=Buffer.concat([fs.readFileSync(changedFile),Buffer.from(target==='main'?'\n// concurrent main':'\n ')]);
    assert.throws(()=>mutateNative('apply',repair.home,repair.root,patch,transform,{...repair.options,fault:(phase,file)=>{if(phase==='after-write')writes.push(file);if(phase==='before-commit')put(changedFile,external);}}),/Final readback failed.*recovery required/);
    assert.ok(writes.every(n=>n.endsWith('/helper.js')),'Dependency-only repair does not rewrite main/record');
    assert.deepEqual(fs.readFileSync(changedFile),external,'Concurrent unchanged main/record is never overwritten');
    assert.equal(inspectNative(repair.home,repair.root,patch,transform,repair.options).status,'recovery-required');
    assert.ok(fs.existsSync(path.join(repair.home,'.customizations/native-palette.journal.json')),'Failed checkpoint keeps recovery journal and helper');
    assert.ok(fs.existsSync(helperFile));
    // Once an external writer deliberately restores its bytes, journal recovery works.
    put(mainFile,mainBytes);put(recordFile,saved);mutateNative('apply',repair.home,repair.root,patch,transform,repair.options);
    assert.equal(inspectNative(repair.home,repair.root,patch,transform,repair.options).active,true);
  }
  const restoreFault=fixture();mutateNative('apply',restoreFault.home,restoreFault.root,patch,transform,restoreFault.options);
  const restoreMain=path.join(restoreFault.home,patch.target,'main.js'),restoreBefore=snapshot(restoreFault.home),rename=fs.renameSync;
  fs.renameSync=(from,to)=>{rename(from,to);if(to===restoreMain){const body=fs.readFileSync(to,'utf8'),gen=body.match(/custom-[a-f0-9]{24}/)?.[0];if(gen)assert.ok(fs.existsSync(path.join(restoreFault.home,patch.target,gen,'helper.js')),'Rollback must recreate prior dependencies before reactivating main');}};
  try{assert.throws(()=>mutateNative('restore',restoreFault.home,restoreFault.root,patch,transform,{...restoreFault.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('helper.js'))throw Error('restore failed');}}),/previous graph restored/);previousFiles(restoreFault.home,restoreBefore);}finally{fs.renameSync=rename;}
  const crash=fixture(),main=path.join(crash.home,patch.target,'main.js');
  assert.throws(()=>mutateNative('apply',crash.home,crash.root,patch,transform,{...crash.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('/main.js')){const e=Error('killed');e.crash=true;throw e;}}}),/killed/);
  assert.equal(inspectNative(crash.home,crash.root,patch,transform,crash.options).status,'recovery-required');
  mutateNative('apply',crash.home,crash.root,patch,transform,crash.options);assert.equal(inspectNative(crash.home,crash.root,patch,transform,crash.options).active,true);
  const personal=fs.readFileSync(main,'utf8')+'// personal edit';put(main,personal);assert.throws(()=>mutateNative('restore',crash.home,crash.root,patch,transform,crash.options),/Personal.*target/);assert.equal(fs.readFileSync(main,'utf8'),personal);
  const conflict=fixture();assert.throws(()=>mutateNative('apply',conflict.home,conflict.root,patch,transform,{...conflict.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('/main.js')){put(path.join(conflict.home,file),'external');throw Error('race');}}}),/recovery required/);
  assert.equal(inspectNative(conflict.home,conflict.root,patch,transform,conflict.options).status,'recovery-required');
  const migration=fixture();const original=stock;const patched=stock+'// old owned\n';put(path.join(migration.home,patch.target,'main.js'),patched);put(path.join(migration.home,'.customizations/frame-palette.json'),JSON.stringify({version:1,original:{'main.js':original},installed:{'main.js':digest(patched)}}));
  mutateNative('apply',migration.home,migration.root,patch,transform,migration.options);assert.equal(JSON.parse(fs.readFileSync(path.join(migration.home,'.customizations/frame-palette.json'))).version,2);
  for(const backup of [null,'valuable original user helper'])for(const exists of [true,false]) {
    const partial=fixture(),oldHelper='previous owned helper',newHelper='new owned helper',legacyMain=stock+'// legacy owned\n';
    const stateFile=path.join(partial.home,'.customizations/frame-palette.json'),legacyHelper=path.join(partial.home,patch.target,'custom-ui.js');
    put(path.join(partial.home,patch.target,'main.js'),legacyMain);if(exists)put(legacyHelper,oldHelper);
    put(stateFile,JSON.stringify({version:1,original:{'main.js':stock,'custom-ui.js':backup},installed:{'main.js':digest(legacyMain),'custom-ui.js':digest(newHelper)},previousInstalled:{'main.js':digest(stock),'custom-ui.js':digest(oldHelper)}}));
    assert.equal(inspectNative(partial.home,partial.root,patch,transform,partial.options).status,'ready');
    mutateNative('apply',partial.home,partial.root,patch,transform,partial.options);
    const migrated=JSON.parse(fs.readFileSync(stateFile));assert.equal(migrated.previousInstalled['custom-ui.js'],digest(oldHelper));assert.equal(migrated.previousInstalled['main.js'],undefined);
    assert.equal(inspectNative(partial.home,partial.root,patch,transform,partial.options).active,true);
    const stable=snapshot(partial.home);assert.match(mutateNative('apply',partial.home,partial.root,patch,transform,partial.options),/already current/);assert.deepEqual(snapshot(partial.home),stable);
    mutateNative('restore',partial.home,partial.root,patch,transform,partial.options);
    assert.equal(fs.readFileSync(path.join(partial.home,patch.target,'main.js'),'utf8'),stock);
    if(backup===null)assert.equal(fs.existsSync(legacyHelper),false);else assert.equal(fs.readFileSync(legacyHelper,'utf8'),backup,'Missing helper must receive its nonempty original before its record is deleted');
    assert.equal(fs.existsSync(stateFile),false);assert.ok(nativeRecoveryInventory(partial.home).backups.length>0,'Original metadata also survives in immutable recovery evidence');
  }
  const orphan=fixture(),orphanRecord=path.join(orphan.home,'.customizations/frame-palette.json'),orphanMain=stock+'// owned\n';
  put(path.join(orphan.home,patch.target,'main.js'),orphanMain);put(orphanRecord,JSON.stringify({version:1,original:{'main.js':stock,'forgotten.txt':'valuable unmapped original'},installed:{'main.js':digest(orphanMain)}}));
  mutateNative('apply',orphan.home,orphan.root,patch,transform,orphan.options);mutateNative('restore',orphan.home,orphan.root,patch,transform,orphan.options);
  assert.equal(fs.readFileSync(path.join(orphan.home,patch.target,'forgotten.txt'),'utf8'),'valuable unmapped original','Restoration enumerates original backups, not just currently installed helpers');
  const unchanged=fixture(),valuable='valuable original already on disk',unchangedRecord=path.join(unchanged.home,'.customizations/frame-palette.json'),unchangedHelper=path.join(unchanged.home,patch.target,'custom-ui.js'),oldOwned=stock+'// prior owned\n';
  put(path.join(unchanged.home,patch.target,'main.js'),oldOwned);put(unchangedHelper,valuable);put(unchangedRecord,JSON.stringify({version:1,original:{'main.js':stock,'custom-ui.js':valuable},installed:{'main.js':digest(oldOwned),'custom-ui.js':digest('old patch helper')}}));
  assert.throws(()=>mutateNative('restore',unchanged.home,unchanged.root,patch,transform,{...unchanged.options,fault:phase=>{if(phase==='before-commit')fs.unlinkSync(unchangedHelper);}}),/Final readback failed.*recovery required/);
  const evidence=JSON.parse(fs.readFileSync(path.join(unchanged.home,'.customizations/native-palette.journal.json'))),savedRecord=JSON.parse(Buffer.from(evidence.changes.find(e=>e.file.endsWith('frame-palette.json')).before,'base64'));
  assert.equal(savedRecord.original['custom-ui.js'],valuable,'An original removed during restore still has its only snapshot in the pending journal');
  put(unchangedHelper,valuable);mutateNative('recover',unchanged.home,unchanged.root,patch,transform,unchanged.options);assert.equal(fs.existsSync(unchangedRecord),false);
  const archiveFailure=fixture(),archiveRename=fs.renameSync;
  fs.renameSync=(from,to)=>{if(to.includes(`${path.sep}recovery${path.sep}`))throw Error('backup archive blocked');archiveRename(from,to);};
  try{assert.throws(()=>mutateNative('apply',archiveFailure.home,archiveFailure.root,patch,transform,archiveFailure.options),/recovery required/);assert.ok(fs.existsSync(path.join(archiveFailure.home,'.customizations/native-palette.journal.json')),'Unarchived recovery evidence is never deleted');}finally{fs.renameSync=archiveRename;}
  mutateNative('recover',archiveFailure.home,archiveFailure.root,patch,transform,archiveFailure.options);assert.equal(fs.existsSync(path.join(archiveFailure.home,'.customizations/frame-palette.json')),false);assert.ok(nativeRecoveryInventory(archiveFailure.home).backups.length>0);
  const interrupted=fixture();
  assert.throws(()=>mutateNative('apply',interrupted.home,interrupted.root,patch,transform,{...interrupted.options,fault:(phase,file)=>{if(phase==='after-write'&&file.endsWith('/main.js')){const error=Error('crash');error.crash=true;throw error;}}}),/crash/);
  const interruptedMain=path.join(interrupted.home,patch.target,'main.js'),interruptedJournal=path.join(interrupted.home,'.customizations/native-palette.journal.json'),journalBytes=fs.readFileSync(interruptedJournal);
  fs.renameSync=(from,to)=>{archiveRename(from,to);if(to===interruptedMain)put(to,'concurrent recovery edit');};
  try{assert.throws(()=>mutateNative('recover',interrupted.home,interrupted.root,patch,transform,interrupted.options),/Recovery readback failed/);assert.deepEqual(fs.readFileSync(interruptedJournal),journalBytes,'Failed rollback readback retains the only original snapshot');}finally{fs.renameSync=archiveRename;}

  const lock=path.join(migration.home,'.customizations/native-patches.lock');put(lock,String(process.pid));assert.throws(()=>mutateNative('apply',migration.home,migration.root,patch,transform,migration.options),/busy/);fs.unlinkSync(lock);
  put(lock,'99999999');assert.throws(()=>mutateNative('apply',migration.home,migration.root,patch,transform,migration.options),/Stale/);assert.equal(fs.existsSync(lock),false);
  const caps=fixture();assert.equal(inspectNative(caps.home,caps.root,{...patch,capabilities:['missingApi']},transform,{...caps.options,apis:[]}).status,'skipped');
  const corrupt=fixture();
  for(const raw of ['{broken','null','[]',JSON.stringify({version:2,original:{'main.js':null},installed:{'main.js':digest(stock)},previousInstalled:'bad'})]) {
    put(path.join(corrupt.home,'.customizations/frame-palette.json'),raw);
    assert.throws(()=>inspectNative(corrupt.home,corrupt.root,patch,transform,corrupt.options),/Corrupt|Unrecognized/,'Malformed recovery records remain hard safety errors, never optional source skips');
  }
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
