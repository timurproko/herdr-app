import {loadMod} from '../../tools/plugin-harness.mjs';
import {githubInvocation} from './github-read.mjs';
import {element,svg,nodes,find,words} from './choice-menu.mjs';
export {element,svg,nodes,find,words};
export const t={background:'#191d28',foreground:'#eeeeee',muted:'#999999',dim:'#666666',raised:'#222222',hover:'#333333',border:'#444444',ansi1:'red',ansi2:'green',ansi3:'yellow',ansi5:'purple'};
export async function rowHarness({host={},modules={},globals={}}={}) {
  let zoom=1,agent=false,rendering=false;
  const place={cwd:'/repo',on:null,terminal:'t1'},focus=[];
  const chain=new Proxy({},{get:(_n,key)=>key==='build'?()=>({}):()=>chain});
  const transport=host.exec?((command,args,options)=>{const call=githubInvocation(command,args,options);return host.exec(call.command,call.args,call.options);}):undefined;
  const {Main,facts,U,AggregatePulls}=await loadMod({mod:'custom-changes',globals:{window:{paint_path:element},...globals},
    host:{props:()=>null,settings:()=>({zoom}),theme:()=>t,closeOverlay(){},openOverlay(){},nextCommand(){},run:(...args)=>focus.push(args),
      layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),...host,
      ...(transport?{exec:transport}:{})},
    modules:{'main.js':'src/plugins/git/mod/main.js','pulls.js':'src/plugins/git/mod/pulls.js','label-colors.js':'src/plugins/git/mod/label-colors.js',
      'ui.js':'src/ui/ui.js','gpui-kit':{View:class{},div:element,svg,PathBuilder:{stroke:()=>chain}},
      'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{}},
      'pin-swap.js':'src/plugins/git/mod/pin-swap.js',
      'location.js':{location:()=>place},'plugins.js':{sidebarPanelEnabled:()=>true},'agent-links.js':{AgentLinks:class{}},
      'aggregate.js':{AggregatePulls:class{}},'webhooks.js':{GitWebhooks:class{sync(){}stop(){}}},'notices.js':{GitNotices:class{}},
      'enrollment-picker.js':{EnrollmentPicker:class{}},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},
      'panel-state.js':{changePanel(){}},'settings-dialog.js':{openSettings(){}},'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:element},...modules},
    entry:'export {default as Main} from "./main.js"; export * as facts from "./pulls.js"; export {U} from "./ui.js"; export {AggregatePulls} from "./aggregate.js";'});
  const panel=new Main();panel.resetRepository();panel.root='/repo';panel.repo={name:'owner/repo'};panel.context=JSON.stringify(['/repo',null]);panel.view='open';panel.foldedRepositories=new Set();
  panel.agentLinks={related:()=>agent?{key:'agent',address:'t2'}:null};
  panel.aggregate={context:{scope:'home'},target:()=>agent?{terminal:'t2'}:null,focus:(...args)=>focus.push(args)};
  const cx={focus_handle(){if(rendering)throw Error('focus handle during render');return {};},notify(){if(rendering)throw Error('notify during render');},stop_propagation(){},spawn:fn=>fn(cx)};
  const render=fn=>{panel.pullTextPending=new Set();rendering=true;try{return fn();}finally{rendering=false;}};
  const nativeSizes=new Map();
  const settle=(build,width,zoom=1,height,changedOnly=false)=>{
    // Native post-layout callbacks, not render-time heuristics. Include hidden
    // intrinsic probes; visible text assertions below exclude their paint.
    for(let pass=0;pass<8;pass++) {
      const tree=render(()=>build().child(panel.stageBoxProbe())),geometry=rowGeometry(tree,width,zoom,height);let changed=false;
      for(const node of nodes(tree))if(/pr-(?:(?:byline|meta)-|stage-box-measure-)/.test(node.attrs?.id?.[0]??'')) {
        const callback=node.attrs.on_size_change?.[0];if(callback){
          const size=geometry.get(node),id=node.attrs.id[0],before=nativeSizes.get(id);
          nativeSizes.set(id,{width:size.width,height:size.height});
          if(!changedOnly||!before||Math.abs(before.width-size.width)>0.01||Math.abs(before.height-size.height)>0.01)callback(size,{...cx,notify(){changed=true;}});
        }
      }
      if(!changed)return {tree,geometry};
    }
    throw Error('Natural row layout must converge without a measurement/render loop');
  };
  return {panel,facts,U,AggregatePulls,cx,transport,render,settle,settleChanged:(build,width,zoom=1,height)=>settle(build,width,zoom,height,true),focus,place,setAgent:value=>{agent=value;},setZoom:value=>{zoom=value;}};
}

// Deterministic flex/absolute box model for these real render trees, not GPUI
// pixels. Intrinsic text widths deliberately vary by glyph and length. Handles
// zero-basis growth, shrinking/minima, padding/borders, inherited line boxes,
// stretch, alignment and absolute/relative positioning. Clipping is a paint rule.
// Unlike size()/text_size(), Herdr line_height(number) is font-relative. Retain
// its inherited token until the text leaf's effective font size is known.
export function lineHeightPixels(value,fontSize) {
  if(typeof value==='number')return value*fontSize;
  if(typeof value==='string' && /^\d+(?:\.\d+)?px$/.test(value))return Number.parseFloat(value);
  throw Error(`Unsupported fixture line-height: ${value}`);
}
export function rowGeometry(root,width,zoom=1,height) {
  const boxes=new Map(),v=(a,k,f=0)=>a[k]?.[0]??f;
  boxes.textLines=[];boxes.naturalWidths=new Map();
  const attrs=n=>typeof n==='object'&&n?n.attrs:{};
  const children=n=>typeof n==='object'&&n?(n.kids??[]).filter(c=>c!=null):[];
  const absolute=n=>Boolean(attrs(n).absolute);
  const style=(n,parent={font:13,line:1.5})=>({font:v(attrs(n),'text_size',parent.font),line:v(attrs(n),'line_height',parent.line)});
  const pad=a=>{const b=a.border_1?1:0;return {l:v(a,'pl',v(a,'px',v(a,'p')))+b,r:v(a,'pr',v(a,'px',v(a,'p')))+b,t:v(a,'pt',v(a,'py',v(a,'p')))+b,b:v(a,'pb',v(a,'py',v(a,'p')))+b};};
  const intrinsic=(n,parent)=>{
    const s=style(n,parent),a=attrs(n);
    if(typeof n==='string')return {w:[...n].reduce((w,c)=>w+(/[il1 .]/.test(c)?0.3:/[MW🤖🚀]/u.test(c)?0.9:0.56)*s.font,0),h:n?lineHeightPixels(s.line,s.font):0};
    const p=pad(a),row=Boolean(a.flex&&!a.flex_col),kids=children(n).filter(c=>!absolute(c)).map(c=>{
      const size=intrinsic(c,s),m=attrs(c);
      return {w:size.w+v(m,'ml')+v(m,'mr'),h:size.h+v(m,'mt')+v(m,'mb')};
    }),gap=v(a,'gap');
    return {w:Math.max(v(a,'min_w'),v(a,'w',v(a,'size',p.l+p.r+(row?kids.reduce((sum,k)=>sum+k.w,Math.max(0,kids.length-1)*gap):Math.max(0,...kids.map(k=>k.w)))))),
      h:v(a,'h',v(a,'size',p.t+p.b+(row?Math.max(0,...kids.map(k=>k.h)):kids.reduce((sum,k)=>sum+k.h,Math.max(0,kids.length-1)*gap))))};
  };
  const limit=(x,min=0,max=Infinity)=>Math.max(min,Math.min(max,x));
  const place=(n,x,y,w,h,parent,ancestors=[])=>{
    const a=attrs(n),s=style(n,parent),natural=intrinsic(n,parent),p=pad(a);
    w=limit(w??(a.w_full?width:natural.w),v(a,'min_w'),a.max_w_full?w:v(a,'max_w',Infinity));
    h=limit(h??natural.h,v(a,'min_h'),v(a,'max_h',Infinity));
    const paintY=y+(a.relative?v(a,'top'):0);
    boxes.set(n,{x:x*zoom,y:paintY*zoom,width:w*zoom,height:h*zoom});
    boxes.naturalWidths.set(n,natural.w*zoom);
    if(typeof n==='string') {
      if(n)boxes.textLines.push({text:n,x:x*zoom,naturalWidth:natural.w*zoom,lineHeight:lineHeightPixels(s.line,s.font)*zoom,fontSize:s.font*zoom,ancestors});
      return;
    }
    const row=Boolean(a.flex&&!a.flex_col),kids=children(n).filter(c=>!absolute(c)),innerW=Math.max(0,w-p.l-p.r),innerH=Math.max(0,h-p.t-p.b),gap=v(a,'gap');
    const available=(row?innerW:innerH)-Math.max(0,kids.length-1)*gap;
    const records=kids.map(child=>{
      const ca=attrs(child),cn=intrinsic(child,s),basis=ca.flex_basis?.[0]??(ca.flex_1?0:undefined);
      const explicit=row?(ca.w?.[0]??ca.size?.[0]??(ca.w_full?innerW:undefined)):(ca.h?.[0]??ca.size?.[0]);
      const min=row?v(ca,'min_w',ca.flex_none?cn.w:0):v(ca,'min_h');
      return {child,a:ca,n:cn,base:Math.max(min,basis??explicit??(row?cn.w:cn.h)),min,leading:v(ca,row?'ml':'mt'),trailing:v(ca,row?'mr':'mb'),grow:v(ca,'flex_grow',ca.flex_1?1:0),shrink:ca.flex_none?0:v(ca,'flex_shrink',1)};
    });
    const used=records.reduce((sum,k)=>sum+k.base+k.leading+k.trailing,0),free=available-used,grow=records.reduce((sum,k)=>sum+k.grow,0),shrink=records.reduce((sum,k)=>sum+k.shrink*k.base,0);
    let offset=0;
    if(a.justify_center&&free>0&&!grow)offset=free/2;
    if(a.justify_end&&!grow)offset=free;
    for(const r of records){
      offset+=r.leading;
      const size=Math.max(r.min,r.base+(free>0&&grow?free*r.grow/grow:free<0&&shrink?free*r.shrink*r.base/shrink:0));
      const cross=row?v(r.a,'h',v(r.a,'size',a.items_start||a.items_center?r.n.h:innerH)):v(r.a,'w',v(r.a,'size',innerW));
      const crossOffset=a.items_center?((row?innerH:innerW)-cross)/2:0;
      place(r.child,x+p.l+(row?offset:crossOffset),y+p.t+(row?crossOffset:offset),row?size:cross,row?cross:size,s,[...ancestors,n]);
      offset+=size+r.trailing+gap;
    }
    for(const child of children(n).filter(absolute)){
      const ca=attrs(child),cn=intrinsic(child,s),cw=v(ca,'w',v(ca,'size',ca.size_full||ca.inset_0?innerW:ca.right?innerW-v(ca,'left')-v(ca,'right'):cn.w)),ch=v(ca,'h',v(ca,'size',ca.size_full||ca.inset_0?innerH:ca.bottom?innerH-v(ca,'top')-v(ca,'bottom'):cn.h));
      place(child,x+v(ca,'left'),y+v(ca,'top'),cw,ch,s,[...ancestors,n]);
    }
  };
  place(root,0,0,width,height);
  boxes.visibleTextLines=boxes.textLines.filter(line=>!line.ancestors.some(n=>n.attrs?.invisible));
  return boxes;
}
