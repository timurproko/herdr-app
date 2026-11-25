import {rowHarness,nodes,t} from './git-row.mjs';
export function mountedRows(count,coordinator=false,state='open') {
  return Array.from({length:count},(_,i)=>({...(coordinator?{key:`owner/repo#${i+1}`,repo:'owner/repo'}:{}),number:i+1,
    title:`A distinct long PR title for mounted-row width measurement and native render cost ${i}`,state,login:'author',
    when:`${state==='closed'?'closed':'opened'} 4 hours ago`,compactWhen:'4h ago',meta:`#${i+1}`,
    tasks:{done:2,total:2,label:'2 tasks done'},checks:{state:'success',label:'11/11'},
    labels:[{name:'bug',color:'d73a4a'},{name:'UI',color:'0075ca'}],review:'approved'}));
}
export async function rowBudgetHarness(main='src/plugins/git/mod/main.js') {
  let operations=0,settingsReads=0,zoom=1,font='Geist';
  function element() {
    const node={kids:[],attrs:{},mouse:{}};let proxy;
    proxy=new Proxy(node,{get(n,key){
      if(key in n)return n[key];if(key==='then')return undefined;
      return(...args)=>{operations++;
        if(key==='when')return args[0]?args[1](proxy):proxy;
        if(key==='child')n.kids.push(args[0]);else if(key==='children')n.kids.push(...args[0]);
        else if(key==='on_mouse_down')n.mouse[args[0]]=args[1];else n.attrs[key]=args;
        return proxy;
      };
    }});return proxy;
  }
  const h=await rowHarness({host:{settings:()=>{settingsReads++;return{zoom,ui_font_family:font};}},modules:{
    'main.js':main,'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset),PathBuilder:{}},
    'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{}},
  }});
  const render=(count,mode='ordinary',state='open')=>{
    const coordinator=mode==='coordinator',rows=mountedRows(count,coordinator,state),p=h.panel;
    p.context=coordinator?'tasks:fixture':'ordinary';p.root='/fixture';p.view=state==='closed'?'closed':'open';p.agentPull=-1;
    p.aggregate={target:()=>null};p.agentLinks={related:()=>null};p.pulls[p.view]=rows;
    p.pullTextWidths=new Map();p.pullTextPending=new Set();p.pullTextRequests=new Map();p.pullLineSizes=new Map();
    operations=0;settingsReads=0;
    const tree=h.render(()=>coordinator?element().flex().flex_col().w(390).children(rows.map(pr=>p.pullRow(t,pr))):p.renderPulls(t));
    const all=nodes(tree),mounted=all.filter(n=>/^pr-(?:owner\/repo#)?\d+$/.test(n.attrs.id?.[0]??''));
    return {tree,operations,elements:all.length,mounted:mounted.length,settingsReads,
      probes:all.filter(n=>n.attrs.on_size_change&&/-probe-|-intrinsic-measure-/.test(n.attrs.id?.[0]??'')).length};
  };
  return {...h,renderMounted:render,setEnvironment:(z,f='Geist')=>{zoom=z;font=f;}};
}
