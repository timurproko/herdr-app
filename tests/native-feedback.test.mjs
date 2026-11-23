import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformFeedback } from '../tools/runtime/native-transform.mjs';
import { tree,method,text } from '../tools/runtime/native-ast.mjs';
import { harness,byId,words } from './native-harness.mjs';
const files=Object.fromEntries(Object.entries({'feedback-ui.js':'src/integration/native-patches/feedback/ui.js','custom-ui.js':'src/ui/ui.js','custom-modal-layout.js':'src/ui/modal-layout.js'}).map(([n,f])=>['custom-test/'+n,fs.readFileSync(f,'utf8')]));
for(const version of ['0.1.16','0.1.17','future']) {
 let stock=fs.readFileSync(`tests/fixtures/native-stock/${version==='future'?'0.1.17':version}/feedback.js`,'utf8');
 if(version==='future')stock=stock.replace('.child(this.shots_row(t))','.child(this.shots_row(t))\n .child(div().id("future-action").on_click(() => this.future = true).child("Native future action"))').replace('this.sending || !this.message.value().trim()','this.sending || !this.message.value().trim() || this.nativeBlocked').replace('this.sending = true;','this.nativeSent = true; this.sending = true;').replace('this.shots.splice(i, 1);','this.nativeRemoved = true; this.shots.splice(i, 1);');
 const source=transformFeedback(stock,'./custom-test');
 const klass=s=>tree(s).body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
 for(const n of ['send','pick','close'])assert.equal(text(stock,method(klass(stock),n).body),text(source,method(klass(source),n).body),'native controller unchanged');
 let raw=null,sentError=null,writeConflict=false,pickerResult=[{path:'picked.png'}];const sent=[],attached=[],writes=[];
 const h=await harness(source,files,{appHome:()=>'/fixture',readTextFile:async()=>raw,writeTextFile:async(file,value,expected)=>{if(writeConflict)throw Error('compare conflict');writes.push({value,expected});},feedbackPreview:(message,email,images)=>({available:true,body:{message,email,images,native:'retained'}}),feedbackClearImages(){},feedbackPickImages:async()=>pickerResult,feedbackPasteImage:()=>({path:'paste.png'}),feedbackAttachImages:paths=>{attached.push(paths);return paths.map(path=>({path}));},sendFeedback:async(body,shots)=>{sent.push({body,shots:[...shots]});return sentError;}});
 const f=new h.View();f.init({},h.cx);const draft=h.jobs.shift();let v=f.render(h.cx);
 assert.equal(v.style.h[0],500);assert.equal(words(byId(v,'dialog-title')),'Send feedback');
 for(const id of ['feedback-email-section','feedback-message-section','feedback-attachments','feedback-preview','feedback-actions'])assert.ok(byId(v,id),id);
 assert.equal(f.email.options.placeholder,'you@example.com (optional)');
 assert.ok(!byId(v,'feedback-json'));assert.equal(words(byId(v,'feedback-add')),'Add image');assert.equal(words(byId(v,'feedback-attachments-help')),'Drag or add images to attach them.');
 assert.equal(byId(v,'feedback-send').style.disabled[0],true);
 f.message.set_value('hello');f.email.set_value('person@example.com');v=f.render(h.cx);assert.equal(byId(v,'feedback-send').style.disabled[0],false);
 f.message.set_value('x'.repeat(4001));assert.equal(byId(f.render(h.cx),'feedback-send').style.disabled[0],true);f.message.set_value('hello');
 if(version==='future'){f.nativeBlocked=true;assert.equal(byId(f.render(h.cx),'feedback-send').style.disabled[0],true);f.nativeBlocked=false;byId(f.render(h.cx),'future-action').events.on_click();assert.equal(f.future,true);}
 byId(v,'feedback-preview-toggle').events.on_change(true,h.cx);v=f.render(h.cx);assert.ok(byId(v,'feedback-json'));assert.match(words(byId(v,'feedback-json')),/retained/);assert.ok(byId(v,'feedback-preview-help'));
 v.events.on_drop({paths:['one.png','two.png','three.png','extra.png']},h.cx);assert.equal(f.shots.length,3);assert.equal(f.error,null);assert.equal(attached.at(-1).length,3);
 f.message.events.paste_other({},h.cx);assert.equal(f.error,null);assert.equal(f.shots.length,3);
 v=f.render(h.cx);assert.ok(byId(v,'feedback-thumbnails'));byId(v,'shot-0').events.on_click({},h.cx);assert.equal(f.viewing,0);assert.ok(byId(f.render(h.cx),'feedback-viewer'));
 byId(f.render(h.cx),'feedback-viewer-next').events.on_click({},h.cx);assert.equal(f.viewing,1);byId(f.render(h.cx),'feedback-viewer-prev').events.on_click({},h.cx);assert.equal(f.viewing,0);
 f.render(h.cx).events.on_key_down({key:'escape'},h.cx);assert.equal(f.viewing,null);
 byId(f.render(h.cx),'shot-x-0').events.on_click({},h.cx);assert.equal(f.shots.length,2);if(version==='future')assert.equal(f.nativeRemoved,true);
 f.pick(h.cx);f.sending=true;await h.jobs.shift()(h.cx);assert.equal(f.shots.length,2,'late picker completion cannot change sending form');f.sending=false;
 f.sending=true;f.render(h.cx).events.on_drop({paths:['late.png']},h.cx);assert.equal(f.shots.length,2);f.sending=false;
 sentError='native failure';byId(f.render(h.cx),'feedback-send').events.on_click({},h.cx);assert.equal(f.sending,true);await h.jobs.shift()(h.cx);assert.equal(f.error,'native failure');assert.equal(f.sent,false);
 sentError=null;byId(f.render(h.cx),'feedback-send').events.on_click({},h.cx);await h.jobs.shift()(h.cx);assert.equal(f.sent,true);if(version==='future')assert.equal(f.nativeSent,true);v=f.render(h.cx);assert.equal(words(byId(v,'dialog-title')),'Feedback sent');assert.match(words(byId(v,'feedback-success')),/Thanks for helping/);assert.equal(sent.at(-1).body.native,'retained');
 f.add([{path:'post-send'}]);assert.equal(f.shots.length,2);
 // A fresh draft fills once and is consumed before fields/attachments are touched.
 const g=new h.View();g.init({},h.cx);raw=JSON.stringify({version:1,created:Date.now(),message:'draft',email:'draft@example.com',images:['draft.png']});await h.jobs.shift()(h.cx);assert.equal(g.message.value(),'draft');assert.equal(g.email.value(),'draft@example.com');assert.equal(writes.length,1);assert.equal(writes[0].expected,raw);assert.equal(sent.length,2,'draft never sends');
 const e=new h.View();e.init({},h.cx);raw=JSON.stringify({version:1,created:Date.now()-300000,message:'expired'});await h.jobs.shift()(h.cx);assert.equal(e.message.value(),'');assert.equal(writes.length,1);
 raw=JSON.stringify({version:1,created:Date.now(),consumed:true,message:'used'});const used=new h.View();used.init({},h.cx);await h.jobs.shift()(h.cx);assert.equal(used.message.value(),'');
 writeConflict=true;raw=JSON.stringify({version:1,created:Date.now(),message:'conflict'});const conflict=new h.View();conflict.init({},h.cx);await h.jobs.shift()(h.cx);assert.equal(conflict.message.value(),'');assert.match(conflict.error,/compare conflict/);writeConflict=false;
 h.state.skin=false;const native=new h.View();native.init({},h.cx);v=native.render(h.cx);assert.equal(v.style.h[0],650);assert.ok(!byId(v,'feedback-attachments'));assert.match(words(v),/Your message/);
 assert.throws(()=>transformFeedback(stock.replace('send(body, cx)','submit(body, cx)'),'./custom-test'),/method send/);
 assert.throws(()=>transformFeedback(stock.replace('.child(image(path).h(72))','.child(image(path).h(72).on_click(() => this.extra = true))'),'./custom-test'),/thumbnail action shape/);
 transformFeedback('\ufeff'+stock.replaceAll('\n','\r\n'),'./custom-test');
 transformFeedback(stock.replace('{ View, div','{ View as FrameView, div').replace('Feedback extends View','Renamed extends FrameView').replace('InputState, Input,','InputState, Input as NativeInput,').replace('TextareaState, Textarea }','TextareaState, Textarea as NativeTextarea }').replaceAll('Input.new','NativeInput.new').replaceAll('Textarea.new','NativeTextarea.new'),'./custom-test');
}
console.log('PASS actual 0.1.16/0.1.17 and future feedback: Custom form/viewer/drafts, native actions/controllers/validation, non-Custom and safe refusal');
