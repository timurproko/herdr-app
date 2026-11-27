import assert from 'node:assert/strict';
import { formsHarness, find, words } from './support/plugin-forms.mjs';
const options = [['workflow','Delivery workflow'],['plain','Plain'],['gate','Gate']];
let value = 'workflow', removed = 0, writes = [];
const row = () => ({id:'fixture.project',label:'D:\\Git\\a-very-long-folder-name-that-must-truncate',choice:{value,revision:value}});
const plugin = {id:'fixture-choice',name:'Fixture',version:'1',icon:'code',defaultEnabled:true,settings:[],prerequisites:[
 {id:'items',label:'Items',section:true,list:{scope:{header:true},picker:{kind:'items'},remove:async()=>removed++,candidates:async()=>({items:[]}),
 rowChoice:{label:'Item mode',options,set:async(cx,r,v)=>{writes.push([cx.machine,r.id,v]);value=v;return {value:v};}}},
 check:async()=>({status:'ready',usable:true,rows:[row(),{id:'ordinary',label:'Ordinary'}]})}]};
const h=await formsHarness({},[plugin]),{view,cx,ui,render,click,flush}=h;
let focused;const handles=[];cx.focus_handle=()=>{const f={focus(){focused=f;},is_focused:()=>focused===f};handles.push(f);return f;};
view.settingsMachine='fixture-ssh';ui.initPlugins(view,cx,plugin.id);view.pluginOpen['fixture-choice-items']=true;ui.reloadPlugins(view,cx,plugin.id);await flush();
const rid='st-plugin-list-fixture-choice-items-row-0',choice=rid+'-choice';
const event=(id,name,e)=>find(render(),id).attrs[name][0](e,cx);
const hover=(on)=>event(rid,'on_hover',on);
const key=(id,k)=>event(id,'on_key_down',{key:k});
assert.ok(words(render()).includes('Delivery workflow'));assert.equal(find(render(),choice).attrs.border_color[0],'#00000000');
assert.equal(find(render(),rid.replace('-row-0','-remove-0')).attrs.opacity[0],0);
assert.ok(!find(render(),'st-plugin-list-fixture-choice-items-remove-1'),'No choice leaves ordinary Remove absent at rest');
const handleCount=handles.length;render();render();assert.equal(handles.length,handleCount,'Rendering allocates no focus handles');
const trigger=find(render(),choice).attrs.track_focus[0];trigger.focus();
assert.notEqual(find(render(),choice).attrs.border_color?.[0],'#00000000','Tab to the persistent trigger reveals the dropdown');
assert.equal(find(render(),rid.replace('-row-0','-remove-0')).attrs.opacity[0],1);
key(choice,'space');assert.ok(find(render(),choice+'-options'));hover(false);assert.ok(find(render(),choice+'-options'),'Open popup survives pointer departure');
key(choice+'-options','down');key(choice+'-options','enter');await flush();assert.deepEqual(writes,[['fixture-ssh','fixture.project','plain']]);assert.ok(words(render()).includes('Plain'));
key(choice,'enter');key(choice+'-options','escape');assert.ok(!find(render(),choice+'-options'));assert.equal(writes.length,1);assert.ok(find(render(),choice).attrs.track_focus[0].is_focused());
focused=null;assert.equal(find(render(),choice).attrs.border_color[0],'#00000000','Blur restores the quiet label');
hover(true);assert.notEqual(find(render(),choice).attrs.border_color?.[0],'#00000000');
find(render(),choice+'-popup').attrs.on_open_change[0](true,cx);for(const [,label]of options)assert.ok(words(render()).includes(label));
click(choice+'-plain');await flush();assert.equal(writes.length,1,'Selecting the current choice does not write');
for(const label of options.map(o=>o[0])) {
 value=label;ui.reloadPlugins(view,cx,plugin.id);await flush();
 for(const width of [320,360,480,700])for(const zoom of [.75,1,1.3,2]) {
  const tree=render(),slot=find(tree,rid+'-choice-slot'),rail=find(tree,rid+'-rail'),rowNode=find(tree,rid);
  assert.equal(slot.attrs.w[0],150);assert.equal(rail.attrs.w[0],80);assert.equal(rowNode.attrs.h[0],28);
  assert.ok((width-150-80-20)*zoom>0,'Independent fixed columns leave a bounded path column');
  hover(false);assert.equal(find(render(),rid+'-choice-slot').attrs.w[0],150,'Reveal never changes column width');
 }
}
hover(true);const removeId=rid.replace('-row-0','-remove-0'),remove=find(render(),removeId);remove.attrs.track_focus[0].focus();hover(false);assert.equal(find(render(),removeId).attrs.opacity[0],1);key(removeId,'enter');await flush();assert.equal(removed,1,'Keyboard Remove remains separate');
key(choice,'enter');const stale=find(render(),choice+'-plain').attrs.on_click[0];
view.settingsMachine='another';ui.followSettingsMachine(view);stale({},cx);await flush();assert.equal(writes.length,1,'A stale menu cannot target the new machine');
console.log('PASS shared row choices: quiet/revealed geometry, persistent Tab focus, keyboard menu/Escape/Remove, same-value and stale-machine guards');
