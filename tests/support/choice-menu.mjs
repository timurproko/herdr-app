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
export const nodes=n=>n&&typeof n==='object'?[n,...(n.kids??[]).flatMap(nodes)]:[];
export const find=(n,id)=>nodes(n).find(e=>e.attrs.id?.[0]===id);
export const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
export const choiceModules={
  'gpui-kit':{div:element,svg},'gpui-base':{Popover,Input:{}},
  'ui.js':'src/ui/ui.js','choice-menu.js':'src/ui/choice-menu.js',
  'claude-account.js':'src/features/workspace-status/claude-account.js','claude-context.js':'src/shared/claude-context.js',
};
export const theme={muted:'muted',dim:'dim',hover:'hover',popover:'popover',border:'border',foreground:'foreground',raised:'raised',accent:'accent'};
