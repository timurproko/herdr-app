import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const rows=[{id:'a',label:'Active board',tab:'active'},{id:'b',label:'Inactive board',tab:'inactive'}];let added=[];
const plugin={id:'fixture-polish',name:'Example',version:'1',icon:'code',defaultEnabled:true,settings:[{key:'access',label:'Access',type:'choice',default:'read',options:[['read','Read'],['write','Write']]}],prerequisites:[
 {id:'account',label:'Account',check:async()=>({configured:true,account:{name:'Only name'},status:'ready'}),saved:{replace:true,row:r=>({label:r.account.name}),remove:async()=>{}}},
 {id:'boards',section:true,label:'Boards',check:async()=>({status:'ready',statusLabel:'0 added',usable:true,rows:[]}),list:{scope:{header:true,divider:'items'},picker:{kind:'items',tabStyle:'tabs',tabs:[['active','Active'],['inactive','Inactive']]},candidates:async()=>({items:rows,add:async(_cx,ids)=>{added.push(...ids);}})}}]};
const h=await formsHarness({},[plugin]),{view,ui,cx,render,click,flush}=h;ui.initPlugins(view,cx,plugin.id);view.pluginOpen['fixture-polish-requirements']=true;view.pluginOpen['fixture-polish-boards']=true;view.pluginOpen['fixture-polish-settings']=true;ui.reloadPlugins(view,cx,plugin.id);await flush();
assert.equal(words(render()).filter(w=>w==='Only name').length,1);assert.ok(!words(render()).includes('Account'));assert.ok(words(render()).includes('All ready'));
const saved='st-plugin-saved-fixture-polish-account-row-0';assert.ok(words(find(render(),saved)).includes('Ready'));find(render(),saved).attrs.on_hover[0](true,cx);assert.ok(words(find(render(),saved)).includes('Remove'));assert.ok(!words(find(render(),saved)).includes('Ready'));
assert.equal(find(render(),'st-plugin-list-fixture-polish-boards-where').attrs.border_b_1,undefined);
find(render(),'st-plugin-list-fixture-polish-boards-add-popup').attrs.on_open_change[0](true,cx);await flush();
const active=find(render(),'st-plugin-list-fixture-polish-boards-tab-active');assert.deepEqual(active.attrs.font_semibold,[]);assert.equal(active.attrs.border_1,undefined);
assert.equal(find(render(),'st-plugin-fixture-polish-access-read').attrs.font_semibold,undefined,'Field choices retain their own segmented style');
click('st-plugin-list-fixture-polish-boards-item-0');click('st-plugin-list-fixture-polish-boards-tab-inactive');assert.ok(words(render()).includes('Inactive board'));assert.ok(!words(render()).includes('Active board'));
click('st-plugin-list-fixture-polish-boards-item-1');click('st-plugin-list-fixture-polish-boards-cancel');assert.deepEqual(added,[]);
find(render(),'st-plugin-list-fixture-polish-boards-add-popup').attrs.on_open_change[0](true,cx);await flush();assert.equal(view.listPicker.tab,'active');
click('st-plugin-list-fixture-polish-boards-item-0');click('st-plugin-list-fixture-polish-boards-tab-inactive');click('st-plugin-list-fixture-polish-boards-item-1');click('st-plugin-list-fixture-polish-boards-choose');await flush();assert.deepEqual(added,['a','b']);
console.log('PASS: opt-in saved replacement/status hover, empty separators and lightweight picker tabs preserve unrelated field choices');
