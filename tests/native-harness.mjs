import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function element(kind='div') {
  const o={kind,kids:[],style:{},events:{}};let p;
  p=new Proxy(o,{get(o,k){if(k in o)return o[k];if(k==='then')return undefined;
    if(k==='when')return (yes,fn)=>yes?fn(p):p;
    if(k==='child')return v=>{if(v!=null)o.kids.push(v);return p;};
    if(k==='children')return a=>{o.kids.push(...a.filter(v=>v!=null));return p;};
    if(k==='hover')return fn=>{fn(element('hover'));return p;};
    if(String(k).startsWith('on_'))return (...args)=>{o.events[k]=args.at(-1);return p;};
    return (...args)=>{o.style[k]=args;return p;};}});return p;
}
export function all(n,out=[]) {if(n&&typeof n==='object'){out.push(n);for(const k of n.kids??[])all(k,out);}return out;}
export const byId=(n,id)=>all(n).find(n=>n.style.id?.[0]===id);
export const words=n=>all(n).flatMap(n=>n.kids.filter(x=>typeof x==='string')).join('\n');
function input(options={}) {let value=options.value??'';return {options,events:{},value:()=>value,set_value:v=>{value=v;},focus(){},on(k,fn){this.events[k]=fn;}};}
export async function harness(source,files,extra={}) {
  const calls=[],overlays=[],closed=[],timers=[],jobs=[],sharedData={layout:'Custom'},storage=new Map();
  const t={background:'#111',surface:'#222',popover:'#333',foreground:'#eee',muted:'#aaa',dim:'#888',border:'#444',input:'#aaa',hover:'#555',selected:'#666',accent:'#abc',blocked:'#f00'};
  const state={skin:true,dark:true,commands:[],themes:[],layouts:['main','Custom'],available:true};
  const api={theme:()=>t,settings:()=>({dark:state.dark}),commands:()=>state.commands,layouts:()=>state.layouts,themes:()=>state.themes,keys:()=>[],window:()=>({platform:'windows'}),props:()=>({overlay:'o1'}),run:(...a)=>calls.push(a),openOverlay:s=>overlays.push(s),closeOverlay:id=>closed.push(id),shared:k=>sharedData[k],...extra};
  const kit={Background:{linear_gradient:()=>element('gradient')},PathBuilder:{fill:()=>element('path')},View:class{},div:()=>element(),svg:x=>element('svg').asset(x),image:x=>element('image').asset(x)};
  const base={v_flex:()=>element('vflex'),h_flex:()=>element('hflex'),InputState:{new:input},TextareaState:{new:input},Input:{new:s=>element('input').state(s)},Textarea:{new:s=>element('textarea').state(s)},Toggle:{new:id=>element('toggle').id(id)},Popover:{},VirtualListScrollHandle:{new:()=>({scroll_to_item(...args){this.last=args;}})},Scrollbar:{vertical:id=>element('scrollbar').id(id)},v_virtual_list:(id,n,sizes,key,draw)=>element('virtual').id(id).children(draw({start:0,end:n}))};
  const cx={notify(){},focus_handle:()=>({}),stop_propagation(){},spawn:fn=>jobs.push(fn),timer:{after:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;},every:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;}}};
  const context=vm.createContext({console,Date,window:{paint_path:()=>element('paint')},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
  const cache=new Map();const synthetic=(name,values)=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:name});
  async function load(name,body) {
    if(cache.has(name))return cache.get(name);
    const m=new vm.SourceTextModule(body??files[name],{context,identifier:name});cache.set(name,m);
    await m.link((spec,ref)=>{
      if(spec==='gpui-kit')return synthetic(spec,kit);if(spec==='gpui-base')return synthetic(spec,base);
      if(spec.endsWith('/host.js')||spec==='./host.js')return synthetic(spec,api);
      if(spec.endsWith('/custom-look.js')||spec==='./custom-look.js')return synthetic(spec,{isCustom:()=>state.skin,liveTheme:()=>t,ensureNativeSelection(){}});
      const dest=path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier),spec));
      if(!files[dest])throw Error(`Harness missing ${dest}`);return load(dest);
    });return m;
  }
  const mod=await load('main.js',source);await mod.evaluate();
  return {mod,View:mod.namespace.default,state,api,cx,calls,overlays,closed,timers,jobs,shared:sharedData,t,files};
}
export function paletteFiles(prefix='custom-test') {
  const sources={'palette-ui.js':'src/integration/native-patches/palette/ui.js','custom-routing.js':'src/integration/native-patches/palette/routing.js','custom-ui.js':'src/ui/ui.js','custom-scroll-fade.js':'src/ui/scroll-fade.js'};
  return Object.fromEntries(Object.entries(sources).map(([name,file])=>[`${prefix}/${name}`,fs.readFileSync(file,'utf8')]));
}
