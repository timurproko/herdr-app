// Synthetic InputState/controller coverage; never types in or renames real sessions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

async function harness(kind,name,named=true) {
  const state=new Map([['layout','Custom']]),calls=[],inputs=[],jobs=[];
  const tab={id:'pc2/tab',name,named,active:true},space={id:'pc2/space',name,named,machine:'pc2',active:true,tabs:[tab]};
  const cx={notify(){},focus_handle:()=>({}),bind_keys(){},sleep:async()=>{},spawn:fn=>jobs.push(fn(cx))};
  const InputState={new(options){
    let text=options.value,selection=null;
    const events={},input={options,events,focusCount:0,released:0,value:()=>text,
      set_selected_range:range=>{selection={...range};},selected_range:()=>selection,
      replace:value=>{text=text.slice(0,selection.start)+value+text.slice(selection.end);selection={start:selection.start+value.length,end:selection.start+value.length};events.change?.({},cx);},
      on:(event,fn)=>{events[event]=fn;},focus:()=>{assert.deepEqual(selection,{start:0,end:text.length},'The full name is selected before focus');input.focusCount++;},release:()=>{input.released++;}};
    inputs.push(input);return input;
  }};
  const host={shared:key=>state.get(key),setShared:(key,value)=>state.set(key,value),spaces:()=>[space],
    focused:()=>({space:space.id,tab:tab.id,pane:'pc2/pane'}),run:(...args)=>calls.push(args),window:()=>({active:true}),
    layout:()=>({id:'sidebar',size:{px:248}})};
  const context=vm.createContext({localStorage:{setItem(){}}});
  const module=new vm.SourceTextModule(fs.readFileSync(new URL(`../src/ui/${kind}-rename.js`,import.meta.url),'utf8'),{context});
  await module.link(name=>{
    const exports=name==='gpui-base'?{InputState}:host;
    return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
  });
  await module.evaluate();
  const api=module.namespace,owner={folded:new Set(),shown:new Set(),spaceRenameLabel:()=> 'automatic folder'};
  const title=kind==='tab'?'Tab':'Space',id=kind==='tab'?tab.id:space.id;
  return {owner,id,cx,calls,inputs,begin:()=>api[`begin${title}Rename`](owner,id,cx),
    request:async()=>{assert.equal(api[`requestInline${title}Rename`]({command:{name:`${kind}.rename`,args:{id}}}),true);api[`sync${title}Rename`](owner,cx);await Promise.all(jobs);},
    cancel:()=>api[`cancel${title}Rename`](owner,cx)};
}

for(const kind of ['tab','space'])for(const route of ['direct','request'])for(const [name,named]of [
  ['Build tools',true],['Проект 🛠️ café',true],['D:/folder/file.ts',true],['',true],['Automatic label',false],
]) {
  const h=await harness(kind,name,named),original=named?name:'';
  if(route==='direct')h.begin();else await h.request();
  const edit=h.owner.rename,input=edit.input;
  assert.equal(input.value(),original);
  assert.deepEqual(input.selected_range(),{start:0,end:original.length},`${kind}/${route}: select the entire existing UTF-16 name`);
  assert.equal(input.focusCount,1);assert.equal(h.calls.length,0,'Entering rename never renames/selects a session');
  input.replace('New name');assert.equal(input.value(),'New name',`${kind}: first typing replaces rather than appends`);
  input.set_selected_range({start:1,end:4});h.begin();
  assert.equal(h.owner.rename,edit);assert.equal(h.inputs.length,1);
  assert.equal(input.value(),'New name');assert.deepEqual(input.selected_range(),{start:1,end:4},'Repeated rename/F2 preserves an in-progress draft and selection');
  h.cancel();assert.equal(input.released,1);assert.equal(h.calls.length,0,'Cancel does not submit the draft');
  h.begin();assert.notEqual(h.owner.rename,edit);
  assert.deepEqual(h.owner.rename.input.selected_range(),{start:0,end:original.length},'A fresh invocation selects the original name again');
  h.owner.rename.input.replace('Replacement');h.owner.rename.input.events.submit({},h.cx);
  const saved=h.calls.find(([command])=>command===`${kind}.rename`);
  assert.ok(saved);assert.equal(saved[1].id,h.id);assert.equal(saved[1].name,'Replacement');
}
console.log('PASS: tabs/sidebar consistently select existing names before focus; immediate replacement, Unicode, empty/automatic names, command/direct entry, repeat-F2 draft preservation and reopen/save');
