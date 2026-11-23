// Instrument native elements without replacing any shared presentation helper.
export function element() {
  const node={kids:[],attrs:{},mouse:{}};let p;
  p=new Proxy(node,{get(n,k){
    if(k in n)return n[k];if(k==='then')return undefined;
    if(k==='when')return(yes,fn)=>yes?fn(p):p;
    if(k==='child')return value=>{n.kids.push(value);return p;};
    if(k==='children')return values=>{n.kids.push(...values);return p;};
    if(k==='on_mouse_down')return(button,fn)=>{n.mouse[button]=fn;return p;};
    return(...args)=>{n.attrs[k]=args;return p;};
  }});return p;
}
export const svg=asset=>element().asset(asset);
export const Popover={new:id=>element().id(id)};
export const nodes=n=>n&&typeof n==='object'?[n,...[...(n.kids??[]),...(n.attrs?.trigger??[]),...(n.attrs?.content??[])].flatMap(nodes)]:[];
export const find=(n,id)=>nodes(n).find(e=>e.attrs.id?.[0]===id);
export const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
export const choiceModules={
  'gpui-kit':{div:element,svg},'gpui-base':{Popover,Input:{}},
  'ui.js':'src/ui/ui.js','choice-menu.js':'src/ui/choice-menu.js',
  'claude-account.js':'src/features/workspace-status/claude-account.js','claude-context.js':'src/shared/claude-context.js',
};
// A single-line flex/block geometry model, not a native pixel measurement. Text
// uses the panel's 20px line box; popup layout uses its trigger, never menu content.
export function inlineGeometry(root, zoom = 1) {
  const boxes=new Map(),value=(attrs,key,fallback=0)=>attrs[key]?.[0]??fallback;
  const measure=node=>{
    if(typeof node==='string')return {node,width:node.length*6,height:20,children:[]};
    const a=node.attrs,row=Boolean(a.flex && !a.flex_col),children=(a.trigger??node.kids).map(measure);
    const left=value(a,'pl',value(a,'px',value(a,'p'))),right=value(a,'pr',value(a,'px',value(a,'p')));
    const top=value(a,'pt',value(a,'py',value(a,'p'))),bottom=value(a,'pb',value(a,'py',value(a,'p')));
    const gap=value(a,row?'gap_x':'gap_y',value(a,'gap')),space=Math.max(0,children.length-1)*gap;
    const width=value(a,'w',value(a,'size',left+right+(row?children.reduce((n,c)=>n+c.width,space):Math.max(0,...children.map(c=>c.width)))));
    const height=value(a,'h',value(a,'size',top+bottom+(row?Math.max(0,...children.map(c=>c.height)):children.reduce((n,c)=>n+c.height,space))));
    return {node,width,height,children,row,left,top,bottom,gap,center:Boolean(a.items_center),ml:value(a,'ml'),mr:value(a,'mr')};
  };
  const place=(box,x,y)=>{
    boxes.set(box.node,{x:x*zoom,y:y*zoom,width:box.width*zoom,height:box.height*zoom,cy:(y+box.height/2)*zoom});
    let offset=0;
    for(const child of box.children){
      const ml=child.ml??0,mr=child.mr??0;
      place(child,x+box.left+(box.row?offset:0)+ml,y+box.top+(box.row?(box.center?(box.height-box.top-box.bottom-child.height)/2:0):offset));
      offset+=(box.row?child.width+ml+mr:child.height)+box.gap;
    }
  };
  place(measure(root),0,0);return boxes;
}
export const theme={muted:'muted',dim:'dim',hover:'hover',popover:'popover',border:'border',foreground:'foreground',raised:'raised',accent:'accent'};
