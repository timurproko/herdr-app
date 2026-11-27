import {loadMod} from '../../tools/plugin-harness.mjs';
import {realUi} from './panel-kit.mjs';
export function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{n.kids.push(c);return p;}:k==='children'?c=>{n.kids.push(...c);return p;}:(...a)=>{n.attrs[k]=a;return p;}});}
export const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
export const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
export async function formsHarness(host={},plugins=null,extraModules={}){
 const shared={},writes=[],jobs=[],inputs=[];
 const cx={notify(){},stop_propagation(){},open_url(){},focus_handle:()=>({focus(){}}),spawn:fn=>jobs.push(fn)};
 const base={HoverCard:{new:id=>element().id(id)},Popup:{new:(id,trigger)=>element().id(id).child(trigger)},h_flex:element,v_flex:element,Textarea:{new:element},TextareaState:{new:()=>({on(){},value:()=>'',set_value(){}})},Checkbox:{new:id=>element().id(id)},Scrollbar:{vertical:id=>element().target(id)},Input:{new:state=>element().nativeState(state)},InputState:{new:o=>{let value=o.value;const events={};const input={masked:false,on:(event,fn)=>events[event]=fn,value:()=>value,set_value:v=>{value=v;},set_masked:v=>input.masked=v,events};inputs.push(input);return input;}}};
 const {ui,registry}=await loadMod({host:{shared:k=>shared[k],setShared:(k,v)=>{writes.push([k,v]);shared[k]=v;},spaces:()=>[],panes:()=>[],terminals:()=>[],focused:()=>null,settings:()=>({zoom:1}),...host},modules:{
 'plugins-ui.js':'src/features/settings/plugins-ui.js','reorder.js':'src/ui/reorder.js','settings-kit.js':'src/ui/settings-kit.js','panel-kit.js':'src/ui/panel-kit.js','modal-layout.js':'src/ui/modal-layout.js','space-color-state.js':{currentSpaceColor(){}},'directory.js':{spaceDirectory:()=>({cwd:null})},'machine-picker.js':{machinePicker:element},'folder-browser.js':{folderBrowser:element,openBrowser(){},closeBrowser(){}},'gpui-kit':{div:element,svg:element,image:element},'gpui-base':base,...(plugins?{'plugins/index.js':{default:plugins}}:{}),
 'ui.js':{...realUi(element),U:{control:28,field:32,font:13,meta:12,radius:6,gutter:12,statusSize:7},slot:x=>x,searchField:(_t,state,{id})=>element().id(id).state(state),emptyState:(_t,{id,title='No results'})=>element().id(id).child(title),description:(_t,text)=>element().child(text),control:(_t,x=element())=>x,itemHover(){},spinner:()=>element(),chevron:element,dialogScrollbar:x=>x,menuSurface:(_t,e)=>e,dropdown:(id,trigger,content,{open,onOpen})=>element().id(id).on_open_change(onOpen).child(trigger).when(open,e=>e.child(content)),button:(_t,id,label,click,options={})=>element().id(id).child(label).on_click(click).disabled(options.enabled===false)},
 ...extraModules},entry:"export * as ui from './plugins-ui.js';export * as registry from './plugins.js';"});
 const view={heading:element,toggle:(_t,id,on,click)=>element().id(id).pressed(on).on_click(click)};
 const render=()=>element().child(ui.pluginsPage(view,{working:'#5599dd',blocked:'#dd5555'})).child(ui.pluginConfirmation(view,{working:'#5599dd',blocked:'#dd5555'}));
 const click=id=>{const node=find(render(),id);if(!node)throw Error('Missing '+id);node.attrs.on_click[0]({},cx);};
 const flush=async()=>{while(jobs.length)await jobs.shift()(cx);};
 return {ui,registry,view,cx,jobs,inputs,writes,shared,render,click,flush};
}
