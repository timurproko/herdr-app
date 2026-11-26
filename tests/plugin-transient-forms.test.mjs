import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
let calls=0,resolve,received;
const action={id:'save',label:'Save',input:true,run:async(context,values)=>{calls++;received=values.token;assert.equal(context.machine,null);return {detail:'Saved'};}};
const plugin={id:'fixture-private',name:'Fixture',icon:'code',version:'1',defaultEnabled:true,machineScoped:true,settings:[],prerequisites:[{id:'account',label:'Account',check:async()=>({status:'missing'}),form:{fields:[{key:'token',type:'secret',label:'Token'}],actions:[action]}}]};
const h=await formsHarness({},[plugin]),{ui,registry,view,cx,jobs,writes,render,click,flush}=h;
ui.initPlugins(view,cx,plugin.id);view.pluginOpen[plugin.id+'-requirements']=true;
ui.reloadPlugins(view,cx,plugin.id);await flush();
const id='st-plugin-form-fixture-private-account',get=()=>view.pluginForms['fixture-private:account'];
const initial=get().fields.token;assert.equal(initial.masked,true);initial.set_value('fake-private-token');
assert.equal(initial.events.blur,undefined);assert.equal(initial.events.submit,undefined);assert.equal(calls,0);const before=JSON.stringify(writes);
click(id+'-save');assert.ok(words(find(render(),id+'-save')).includes('Working…'),'Undeclared busy copy stays unchanged');click(id+'-save');assert.equal(jobs.length,1,'Pre-paint duplicates cannot queue actions');await flush();
assert.equal(calls,1);assert.equal(received,'fake-private-token');assert.equal(get().fields.token.value(),'');assert.notEqual(get().fields.token,initial,'Submitted native input/undo entity replaced');assert.ok(words(render()).includes('Saved'));assert.equal(JSON.stringify(writes),before);
// Error text, including a hostile exception echo, never reaches the renderer.
action.run=async()=>{throw Error('fake-private-token');};get().fields.token.set_value('fake-private-token');click(id+'-save');await flush();assert.ok(!words(render()).join(' ').includes('fake-private-token'));assert.equal(get().fields.token.value(),'');
// Machine changes invalidate both input and late results without portable state.
action.run=async context=>{context.onCancel(()=>Promise.reject(Error('fake-private-token')));return new Promise(r=>resolve=r);};get().fields.token.set_value('fake-private-token');click(id+'-save');const pending=jobs.shift()(cx);await Promise.resolve();view.settingsMachine='ssh-fixture';ui.followSettingsMachine(view);assert.equal(get().fields.token.value(),'');resolve({detail:'Obsolete'});await pending;assert.ok(!words(render()).includes('Obsolete'));assert.equal(JSON.stringify(writes),before);
view.settingsMachine=null;ui.followSettingsMachine(view);ui.reloadPlugins(view,cx,plugin.id);await flush();
// Stale callbacks after disable/close/cancel cannot dispatch.
action.run=async()=>{calls++;};const stale=find(render(),id+'-save');registry.setPluginEnabled(plugin,false);stale.attrs.on_click[0]({},cx);assert.equal(jobs.length,0);registry.setPluginEnabled(plugin,true);
get().fields.token.set_value('fake-private-token');ui.clearPluginForms(view);assert.equal(get().fields.token.value(),'');view.pluginClosed=true;stale.attrs.on_click[0]({},cx);assert.equal(jobs.length,0);
assert.ok(!JSON.stringify(writes).includes('fake-private-token'));
console.log('PASS: generic masked transient forms, explicit submit, clearing/native undo retirement, duplicate/stale/machine/disabled/closed guards and no persistence or exception echo');
