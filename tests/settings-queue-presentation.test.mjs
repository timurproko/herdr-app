import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
let release,pending=false;
const plugin={id:'queue-ui',name:'Fixture',icon:'code',version:'1',defaultEnabled:true,settings:[],prerequisites:[
 {id:'tool',label:'Tool',check:async()=>pending?new Promise(r=>release=r):{status:'ready'}},
 {id:'projects',label:'Projects',section:true,list:{scope:{header:true},picker:{kind:'items'},remove:async()=>{},candidates:async()=>({items:[]})},check:async()=>({status:'ready',statusLabel:'1 added',usable:true,rows:[{id:'r',label:'known project'}]})}]};
const h=await formsHarness({},[plugin]);h.ui.initPlugins(h.view,h.cx,plugin.id);h.view.pluginOpen['queue-ui-projects']=true;h.ui.reloadPlugins(h.view,h.cx,plugin.id);await h.flush();
pending=true;h.ui.reloadPlugins(h.view,h.cx,plugin.id);const check=h.jobs.shift()(h.cx);
assert.ok(words(h.render()).includes('All ready'),'Known Requirements badge remains during waiting');
assert.ok(words(h.render()).includes('1 added'));assert.ok(words(h.render()).includes('known project'),'Even legacy lists retain last-good rows during refresh');
assert.ok(!words(h.render()).some(w=>/to fix|execs are running|Error/.test(w)));
release({status:'ready'});await check;await h.flush();assert.ok(words(h.render()).includes('All ready'));
console.log('PASS queued Settings refresh retains confirmed list, badges and fix counts');
