import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
const root=fs.mkdtempSync(path.resolve('.artifacts/frame-upgrade-')),home=path.join(root,'home');
const put=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
const registry={version:1,patches:['palette','feedback'].map(id=>({id,target:`frame/${id}`,originals:[`${id}/original.js`],files:{'main.js':`${id}/main.js`,'custom-ui.js':'ui.js'}}))};
const supported={binary:Buffer.from('reviewed-palette\nreviewed-feedback')},unknown={binary:Buffer.from('new native bytes')};
const snapshot=()=>{
 const out={};const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else out[path.relative(home,p)]=fs.readFileSync(p).toString('base64');}};walk(home);return out;
};
try {
 put(path.join(root,'frame-patches/registry.json'),JSON.stringify(registry));put(path.join(root,'ui.js'),'private ui');
 for(const p of registry.patches){put(path.join(root,p.originals[0]),`reviewed-${p.id}`);put(path.join(root,p.files['main.js']),`import './custom-ui.js'; // ${p.id}`);put(path.join(home,p.target,'main.js'),`reviewed-${p.id}`);framePatch('apply',home,root,p.id);}
 // An owned old target is not permission to overwrite on a changed binary.
 let before=snapshot();let result=restoreStartupFrames(home,root,unknown);
 assert.equal(result.ok,true);for(const p of registry.patches){assert.equal(result.frames[p.id].status,'skipped');assert.equal(result.frames[p.id].retained,true);assert.equal(result.frames[p.id].active,true);}
 assert.deepEqual(snapshot(),before);
 assert.throws(()=>framePatch('apply',home,root,'palette',unknown),/native original unreviewed/);
 assert.equal(inspectFramePatch(home,root,'feedback',{binary:null}).status,'skipped');
 // New stock is untouched along with old helpers and recovery records.
 for(const p of registry.patches)put(path.join(home,p.target,'main.js'),`new-${p.id}`);
 before=snapshot();result=restoreStartupFrames(home,root,unknown);assert.equal(result.ok,true);
 assert.deepEqual(snapshot(),before);for(const p of registry.patches){assert.equal(result.frames[p.id].retained,false);assert.equal(result.frames[p.id].active,false);}
 // Reviewed reset can repair; a synthetic embedded original supports subsequent refresh.
 for(const p of registry.patches)put(path.join(home,p.target,'main.js'),`reviewed-${p.id}`);
 assert.equal(restoreStartupFrames(home,root,supported).ok,true);assert.match(framePatch('apply',home,root,'feedback',supported),/already current/);
 put(path.join(home,'frame/feedback/custom-ui.js'),'personal');
 result=restoreStartupFrames(home,root,supported);assert.equal(result.ok,false);assert.match(result.frames.feedback.error,/dependency conflict/);
 put(path.join(home,'.customizations/frame-palette.json'),'{"version":2}');
 result=restoreStartupFrames(home,root,unknown);assert.equal(result.ok,false);assert.match(result.frames.palette.error,/Unrecognized/);
 // Concurrent main edits after the record write are still detected before replacement.
 put(path.join(home,'frame/feedback/custom-ui.js'),'private ui');put(path.join(home,'frame/feedback/main.js'),'reviewed-feedback');
 const rename=fs.renameSync;
 fs.renameSync=(from,to)=>{rename(from,to);if(to===path.join(home,'.customizations/frame-feedback.json'))put(path.join(home,'frame/feedback/main.js'),'concurrent personal edit');};
 try {assert.throws(()=>framePatch('apply',home,root,'feedback',supported),/changed during apply/);}finally{fs.renameSync=rename;}
 assert.equal(fs.readFileSync(path.join(home,'frame/feedback/main.js'),'utf8'),'concurrent personal edit');
 console.log('PASS frame upgrade: skipped unknown binaries/stock preserve all bytes, retained old patch, supported repair, conflict/corrupt/concurrent refusals');
}finally{fs.rmSync(root,{recursive:true,force:true});}
