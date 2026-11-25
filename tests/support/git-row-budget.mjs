import {rowHarness,nodes,t} from './git-row.mjs';
export function mountedRows(count,coordinator=false,state='open') {
  return Array.from({length:count},(_,i)=>{const repo=i<3?'owner/a':'owner/b';return {
    ...(coordinator?{key:`${repo}#${i+1}`,repo}:{}),number:i+1,
    title:`A distinct long PR title for mounted-row render cost ${i}`,state,login:'author',
    createdAt:'2026-11-20T10:00:00Z',closedAt:state==='closed'?'2026-11-20T10:00:00Z':null,
    when:`${state==='closed'?'closed':'opened'} 4 hours ago`,compactWhen:'4h ago',meta:`#${i+1}`,
    tasks:{done:2,total:2,label:'2 tasks done'},checks:{state:'success',label:'11/11'},
    labels:[{name:'bug',color:'d73a4a'},{name:'UI',color:'0075ca'}],review:'approved'};});
}
export async function rowBudgetHarness({main='src/plugins/git/mod/main.js',presentation='src/plugins/git/mod/row-presentation.js'}={}) {
  let operations=0,zoom=1;
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
  const h=await rowHarness({host:{settings:()=>({zoom})},modules:{
    'main.js':main,'row-presentation.js':presentation,
    'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset),PathBuilder:{}},
    'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{}},
  }});
  const render=(count,mode='ordinary',state='open')=>{
    const coordinator=mode==='coordinator',rows=mountedRows(count,coordinator,state),p=h.panel;
    p.resetRepository();p.context=coordinator?'tasks:fixture':'ordinary';p.root='/fixture';p.view=state;p.agentPull=-1;
    p.aggregate={context:{scope:'fixture'},entries:new Map(rows.map(pr=>[pr.key,{pr}])),
      counts:()=>({open:state==='open'?count:0,closed:state==='closed'?count:0}),repositories:()=>['owner/a','owner/b'],
      rows:()=>rows,currentContext:()=>({scope:'fixture'}),readNotice:()=>null,target:()=>null};
    p.agentLinks={related:()=>null};p.pulls[state]=rows;
    p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){}};p.syncChecksFallback=()=>{};
    p.taskWindows=new Map();p.rowPresentations=null;
    p.pullTextWidths=new Map();p.pullTextPending=new Set();p.pullTextRequests=new Map();p.pullLineSizes=new Map();
    const cx={...h.cx,timer:{after(){}},spawn(){}};
    if(coordinator){
      const sections=p.aggregate.repositories().map(repo=>({repo,rows:rows.filter(pr=>pr.repo===repo)}));
      const w=p.taskSections(sections,'fixture').window;
      p.taskMeasure(w,'fixture','viewport',{width:390*zoom,height:400*zoom},cx);
      while(w.revealMore()){}
    }
    operations=0;
    const tree=h.render(()=>coordinator?p.renderAggregate(cx,t):p.renderPulls(t));
    const all=nodes(tree),mounted=all.filter(n=>/^pr-(?:owner\/[ab]#)?\d+$/.test(n.attrs.id?.[0]??''));
    return {tree,operations,elements:all.length,mounted:mounted.length,
      probes:all.filter(n=>n.attrs.on_size_change&&/-probe-/.test(n.attrs.id?.[0]??'')).length};
  };
  return {...h,renderMounted:render,setEnvironment:z=>{zoom=z;}};
}
