import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(asset) {
  const node={asset,attrs:{},kids:[]};let proxy;
  return proxy=new Proxy(node,{get:(n,key)=>key in n?n[key]:key==='when'?(yes,fn)=>yes?fn(proxy):proxy
    :key==='child'?child=>{n.kids.push(child);return proxy;}:(...args)=>{n.attrs[key]=args;return proxy;}});
}
let tab={id:'pc2/tab',space:'pc2/space'},pinned=false,refuse=false;
const toggles=[],modules={
  'gpui-kit':{svg:element},'gpui-base':{Toggle:{new:id=>element('toggle').id(id)}},
  './ui.js':{U:{insetControl:24,insetRadius:4,smallIcon:14},subtleActionFill:()=> 'hover',itemHover:()=> 'pressed-hover'},
  './panel-state.js':{panelTab:()=>tab,panelPinned:()=>pinned,togglePanelPin:(target,on)=>{if(refuse)return false;toggles.push({target,on});return true;}},
};
const context=vm.createContext({}),module=new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/panel-pin.js',import.meta.url),'utf8'),{context});
await module.link(name=>new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const [key,value]of Object.entries(modules[name]))this.setExport(key,value);},{context}));await module.evaluate();
const {panelPin}=module.namespace,t={foreground:'foreground',dim:'dim',input:'border',selected:'selected'};let stops=0;
let notifications=0;
const cx={stop_propagation:()=>{stops++;},notify:()=>notifications++};
for(const enabled of [false,true])for(const value of [false,true]) {
  pinned=value;const button=panelPin(t,{id:'files-pin',enabled});
  assert.equal(button.asset,'toggle');assert.equal(button.attrs.pressed[0],pinned);
  assert.equal(button.attrs.id[0],'files-pin');assert.equal(button.attrs.size[0],24);assert.equal(button.kids[0].attrs.size[0],14);
  assert.equal(button.attrs.disabled[0],!enabled);assert.equal(button.attrs.text_color[0],pinned?'foreground':'dim');
  assert.equal(button.attrs.bg[0],pinned?'selected':'#00000000');assert.equal(button.attrs.border_color[0],pinned?'border':'#00000000');
  assert.equal(button.attrs.accessibility_label[0],`${pinned?'Unpin':'Pin'} right sidebar`);
  assert.equal(button.kids[0].asset,'mods/custom-workspace-chrome/panel-pin.svg','Both states use the same Usage pin icon');
  assert.equal(button.attrs.tooltip,undefined,'No hover tooltip; keep an accessible label');
  const before=toggles.length;button.attrs.on_change[0](!pinned,cx);
  assert.equal(toggles.length,before+Number(enabled),'Hidden tools cannot change a pin');
  if(enabled)assert.equal(toggles.at(-1).on,!pinned,'Pass the desired pressed state, not a blind toggle');
  const after=toggles.length;button.attrs.on_change[0](pinned,cx);assert.equal(toggles.length,after,'Unchanged pressed state does not toggle');
  button.attrs.on_mouse_down[1]({},cx);
}
const captured=panelPin(t,{id:'git-pin',enabled:true}),old=tab;tab={id:'new-tab',space:'new-space'};
captured.attrs.on_change[0](false,cx);assert.equal(toggles.at(-1).target,old,'The controller validates the captured source binding');
tab=null;pinned=true;const held=panelPin(t,{id:'git-pin',enabled:true});assert.equal(held.attrs.disabled[0],false,'A hold can be released with no selected tab');
held.attrs.on_change[0](false,cx);assert.equal(toggles.at(-1).target,null);
pinned=false;const empty=panelPin(t,{id:'git-pin',enabled:true});assert.equal(empty.attrs.disabled[0],true);
const before=toggles.length;empty.attrs.on_change[0](true,cx);assert.equal(toggles.length,before);assert.ok(stops>0);
tab={id:'coordinator',space:'space'};refuse=true;
const cold=panelPin(t,{id:'git-pin',enabled:true});cold.attrs.on_change[0](true,cx);
assert.equal(cold.attrs.pressed[0],false);assert.equal(notifications,1,'A refused provisional pin redraws the controlled unpressed state');
const manifest=JSON.parse(fs.readFileSync(new URL('../customization.json',import.meta.url),'utf8'));
const usage=JSON.parse(fs.readFileSync(new URL('../src/plugins/usage/panel.json',import.meta.url),'utf8'));
assert.equal(manifest.files['mods/custom-workspace-chrome/panel-pin.svg'],usage.shared['pin.svg'],'Package the exact same canonical shared pin icon, not a hand-copied variant');
const asset=fs.readFileSync(new URL('../'+manifest.files['mods/custom-workspace-chrome/panel-pin.svg'],import.meta.url),'utf8');
assert.match(asset,/stroke-width="1\.5"/);assert.match(asset,/stroke-linecap="round"/);
console.log('PASS: shared Files/Git native pin Toggle, default unpressed/Usage pressed styling, exact Usage icon, hover gating, desired-state events and captured-tab actions');
