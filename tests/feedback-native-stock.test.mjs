import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from '../tools/build.mjs';
import { framePatch, inspectFramePatch } from '../tools/runtime/frame-patch.mjs';
import { restoreStartupFrames } from '../tools/runtime/startup-frames.mjs';

// Pinned stock data only; no installed host, feedback submission or native UI.
const {output}=build();
const source='src/integration/native-patches/feedback';
const provenance=JSON.parse(fs.readFileSync(`${source}/provenance.json`));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.deepEqual(provenance.releases.map(r=>r.tag),['v0.1.16','v0.1.17']);
assert.equal(provenance.originals[0].sha256,'29da2cc452b3054c15218fe23c3c542b12de018e8a797308640b0fd8b840f80b');
assert.equal(provenance.originals[1].sha256,'cc8a38b49fea6e0bcfccddfc74e30d92c327f4fe67574fadee3e9f451d869659');
const fixture=fs.mkdtempSync(path.resolve('.artifacts/feedback-stock-'));
const put=(file,bytes)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const snapshot=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(dir,file),fs.readFileSync(file).toString('base64')];}));
try {
 for(const record of provenance.originals){
  const stock=fs.readFileSync(`${source}/${record.file}`);
  assert.equal(sha(stock),record.sha256);assert.equal(stock.length,record.bytes);
  assert.deepEqual(fs.readFileSync(path.join(output,'frame-patches/feedback',record.file)),stock,'Build preserves raw bytes');
  assert.match(stock.toString(),/from "herdr"/);assert.doesNotMatch(stock.toString(),/\.\/host\.js/);
  for(const release of provenance.releases){
   const home=path.join(fixture,release.tag,record.format),main=path.join(home,'frame/feedback/main.js');
   put(main,stock);
   const options={binary:Buffer.concat([Buffer.from('synthetic executable\0'),stock])};
   assert.deepEqual(restoreStartupFrames(home,output,options),{ok:true,frames:{}},'Never opt in automatically');
   framePatch('apply',home,output,'feedback',options);
   const patched=fs.readFileSync(main,'utf8');
   const send=text=>text.slice(text.indexOf('  send(body, cx)'),text.indexOf('  render(cx)')).replaceAll('\r\n','\n');
   assert.equal(send(patched),send(stock.toString()),'Native sending unchanged');
   assert.match(patched,/this\.sent \? "Feedback sent"/);assert.match(patched,/Drag or add images to attach them/);
   assert.equal(inspectFramePatch(home,output,'feedback',options).status,'ready','Owned refresh recognizes real embedded stock');
   assert.equal(restoreStartupFrames(home,output,options).ok,true);
   const before=snapshot(home);assert.match(framePatch('apply',home,output,'feedback',options),/already current/);assert.deepEqual(snapshot(home),before);
   assert.match(framePatch('check',home,output,'feedback',options),/match/);
   const skipped=restoreStartupFrames(home,output,{binary:Buffer.from('unknown stock')});
   assert.equal(skipped.ok,true);assert.equal(skipped.frames.feedback.status,'skipped');assert.match(skipped.frames.feedback.advisory,/unreviewed/);assert.deepEqual(snapshot(home),before);
   put(main,'// unknown future native feedback');const unknown=snapshot(home);
   assert.equal(restoreStartupFrames(home,output,options).frames.feedback.status,'skipped');assert.deepEqual(snapshot(home),unknown);
   put(main,patched);framePatch('restore',home,output,'feedback',options);assert.deepEqual(fs.readFileSync(main),stock,'Exact raw backup restored');
  }
 }
 console.log('PASS real feedback stock: pinned LF/CRLF digests, raw build, both releases, opt-in/owned refresh/no-op/restore and nonfatal unknown skips');
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
