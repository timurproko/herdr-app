import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformFeedback } from '../tools/runtime/native-transform.mjs';
import { tree,method,text,nodes,call,Incompatible } from '../tools/runtime/native-ast.mjs';
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
// Audit every replaced subtree: a native action must survive or cause a named
// incompatibility, never disappear behind a descendant-only anchor match.
const auditStock=fs.readFileSync('tests/fixtures/native-stock/0.1.17/feedback.js','utf8');
const extra='div().id("native-extra").on_click(() => this.nativeExtra = true).child("Native action")';
const nativeButton='this.button(t,"native-extra","Native action",()=>this.nativeExtra = true)';
const changed=(from,to)=>{assert.ok(auditStock.includes(from),from);return auditStock.replace(from,to);};
const rejected=[
 ['attachments wrapper',changed('.child(this.shots_row(t))',`.child(h_flex().child(this.shots_row(t)).child(${extra}))`),/attachments: surrounding/],
 ['attachments conditional',changed('.child(this.shots_row(t))',`.child(this.shots_row(t).when(true,el=>el.child(${extra})))`),/attachments: surrounding/],
 ['message wrapper',changed('.child(field(Textarea.new(this.message)).h(130))',`.child(h_flex().child(field(Textarea.new(this.message)).h(130)).child(${extra}))`),/messageField/],
 ['email wrapper',changed('.child(field(Input.new(this.email)).h(40))',`.child(h_flex().child(field(Input.new(this.email)).h(40)).child(${extra}))`),/emailField/],
 ['field renderer',changed('.text_size(14);',`.text_size(14).on_click(()=>this.nativeExtra=true).id("native-extra");`),/messageField renderer/],
 ['caption renderer',changed('.child(text);',`.child(text).on_click(()=>this.nativeExtra=true).id("native-extra");`),/caption renderer/],
 ['header children',changed('.child("Send feedback"))',`.child("Send feedback").children([${extra}]))`),/feedback header/],
 ['success children',changed('.child("Sent. Thanks for helping us improve Herdr."))',`.child("Sent. Thanks for helping us improve Herdr.").children([${extra}]))`),/feedback success/,{sent:true}],
 ['agent children',changed('.child("Drafted by an agent: read it before sending")))',`.child("Drafted by an agent: read it before sending").children([${extra}])))`),/feedback agent caption/,{from:'agent'}],
 ['availability children',changed('.child("This build was made from source and doesn\'t send feedback. Use a release build.")))',`.child("This build was made from source and doesn't send feedback. Use a release build.").children([${extra}])))`),/feedback availability caption/,{available:false}],
 ['thumbnail row sibling',changed('.children(this.shots.map(thumb))',`.children(this.shots.map(thumb)).child(${nativeButton})`),/thumbnail row/],
 ['thumbnail list spread',changed('.children(this.shots.map(thumb))',`.children([...this.shots.map(thumb),${nativeButton}])`),/thumbnail list wrapper/],
 ['thumbnail image wrapper',changed('.child(image(path).h(72))',`.child(h_flex().child(image(path).h(72)).child(${nativeButton}))`),/thumbnail image wrapper/,{shots:['one.png']}],
 ['thumbnail remove sibling',changed('.child("×"));',`.child("×").children([${nativeButton}]));`),/thumbnail remove control/,{shots:['one.png']}],
 ['thumbnail Add callback',changed('(_e, cx) => this.pick(cx)','(_e, cx) => { this.nativeExtra = true; this.pick(cx); }'),/thumbnail Add action/,{id:'feedback-add'}],
 ['button renderer sibling',changed('.child(label);',`.child(label).children([${extra}]);`),/feedback button/],
 ['button callback',changed('.on_click((e, cx) => { if (!disabled)','.on_click((e, cx) => { this.nativeExtra = true; if (!disabled)'),/button click action/,{id:'feedback-cancel'}],
];
async function auditForm(source,options={}) {
 const h=await harness(source,files,{props:()=>({overlay:'fixture',from:options.from}),appHome:()=>'/fixture',readTextFile:async()=>null,writeTextFile:async()=>{},feedbackPreview:()=>({available:options.available!==false,body:{native:true}}),feedbackClearImages(){},feedbackPasteImage:()=>null,feedbackPickImages:async()=>[],feedbackAttachImages:paths=>paths.map(path=>({path})),sendFeedback:async()=>null});
 const form=new h.View();form.init({},h.cx);form.sent=Boolean(options.sent);form.shots=options.shots??[];return {h,form};
}
for(const [name,source,reason,options={}]of rejected) {
 const {h,form}=await auditForm(source,options),native=byId(form.render(h.cx),options.id??'native-extra');
 assert.ok(native,`${name}: added native action exists`);native.events.on_click({},h.cx);assert.equal(form.nativeExtra,true,`${name}: original callback works`);
 assert.throws(()=>transformFeedback(source,'./custom-test'),error=>error instanceof Incompatible&&reason.test(error.message),`${name}: refuse overlapping edit explicitly`);
}
const bodyEffect=changed('.px(24).gap(10)','.px(24).gap((this.nativeExtra = true,10))');
const bodyNative=await auditForm(bodyEffect);bodyNative.form.render(bodyNative.h.cx);assert.equal(bodyNative.form.nativeExtra,true);assert.throws(()=>transformFeedback(bodyEffect,'./custom-test'),/body layout decorator gained behavior/);
const placeholderEffect=changed('placeholder: "Email (optional)"','placeholder: (this.nativeExtra = true, "Email (optional)")');assert.equal((await auditForm(placeholderEffect)).form.nativeExtra,true);assert.throws(()=>transformFeedback(placeholderEffect,'./custom-test'),/email placeholder gained behavior/);
const focusHook=changed('this.message.focus();','this.message.on("focus",()=>this.nativeExtra=true); this.message.focus();');const focusNative=await auditForm(focusHook);focusNative.form.message.events.focus();assert.equal(focusNative.form.nativeExtra,true);assert.throws(()=>transformFeedback(focusHook,'./custom-test'),/native focus\/blur hooks/);
assert.throws(()=>transformFeedback(changed('init(_props, cx) {','init(_props, cx) { this.previewExpanded = true;'),'./custom-test'),/native state collides/);
const dynamicFocus='const nativeFocus = "focus";\n'+focusHook.replace('this.message.on("focus",','this.message.on(nativeFocus,');const dynamicNative=await auditForm(dynamicFocus);dynamicNative.form.message.events.focus();assert.equal(dynamicNative.form.nativeExtra,true);assert.throws(()=>transformFeedback(dynamicFocus,'./custom-test'),/dynamic event names/);
const computedHook=changed('init(_props, cx) {','["view"]() { this.nativeExtra = true; }\n init(_props, cx) {');const computedNative=await auditForm(computedHook);computedNative.form.view();assert.equal(computedNative.form.nativeExtra,true);assert.throws(()=>transformFeedback(computedHook,'./custom-test'),/native state collides/);
const render=method(tree(auditStock).body.find(n=>n.type==='ExportDefaultDeclaration').declaration,'render');
const jsonChild=nodes(render,n=>call(n,'child')&&nodes(n.arguments[0],m=>call(m,'stringify')&&m.callee.object.name==='JSON').length).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
const footerChild=nodes(render,n=>call(n,'child')&&call(n.arguments[0],'button')&&n.arguments[0].arguments[1]?.value==='feedback-send')[0];
const preserved=[
 ['JSON wrapper',auditStock.slice(0,jsonChild.arguments[0].start)+`h_flex().child(${text(auditStock,jsonChild.arguments[0])}).child(${extra})`+auditStock.slice(jsonChild.arguments[0].end)],
 ['footer wrapper',auditStock.slice(0,footerChild.arguments[0].start)+`h_flex().child(${text(auditStock,footerChild.arguments[0])}).child(${extra})`+auditStock.slice(footerChild.arguments[0].end)],
 ['unknown form condition',changed('.child(this.shots_row(t))',`.child(this.shots_row(t)).when(true,el=>el.child(${extra}))`)],
];
for(const [name,source]of preserved)for(const transformed of [false,true]) {
 const {h,form}=await auditForm(transformed?transformFeedback(source,'./custom-test'):source);form.previewExpanded=true;
 const native=byId(form.render(h.cx),'native-extra');assert.ok(native,`${name}: action retained in ${transformed?'Custom':'native'}`);native.events.on_click({},h.cx);assert.equal(form.nativeExtra,true);
}
const boundDefaults=await auditForm(transformFeedback(changed('disabled = false','disabled = true'),'./custom-test'));
const blockedCancel=byId(boundDefaults.form.render(boundDefaults.h.cx),'feedback-cancel');assert.equal(blockedCancel.style.disabled[0],true,'Bound native default parameters survive Custom button construction');blockedCancel.events.on_click({},boundDefaults.h.cx);assert.equal(boundDefaults.h.closed.length,0);
const dropSource=changed('if (this.sending || this.sent) return;\n        if (this.shots.length', 'if (this.sending || this.sent) return;\n        this.nativeExtra = true;\n        if (this.shots.length');
for(const area of ['root','attachments']) {
 const {h,form}=await auditForm(transformFeedback(dropSource,'./custom-test'));const view=form.render(h.cx);
 (area==='root'?view:byId(view,'feedback-attachments')).events.on_drop({paths:['one.png']},h.cx);assert.equal(form.nativeExtra,true,`${area}: native drop additions retained`);assert.equal(form.shots.length,1);
}
console.log('PASS replacement audit: native nested/wrapped actions preserved or specifically refused at all feedback sites');
console.log('PASS actual 0.1.16/0.1.17 and future feedback: Custom form/viewer/drafts, native actions/controllers/validation, non-Custom and safe refusal');
