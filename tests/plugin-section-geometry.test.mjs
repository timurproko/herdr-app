// Packaged Settings renderer + real shared kit. Native size callbacks use window px,
// while authored h()/padding and the animated clip use logical px (SDK contract).
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
function element() {
  const n={attrs:{},kids:[]};let p;
  return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:
    k==='child'||k==='trigger'?c=>{n.kids.push(c);return p;}:
    k==='children'?cs=>{n.kids.push(...cs);return p;}:
    (...args)=>{n.attrs[k]=args;return p;}});
}
const v=()=>element().flex().flex_col(),h=()=>element().flex();
const find=(n,id)=>!n||typeof n!=='object'?undefined:n.attrs?.id?.[0]===id?n:[...(n.kids??[]),n.attrs?.content?.[0]].map(c=>find(c,id)).find(Boolean);
const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
const val=(n,k,fallback=0)=>n.attrs[k]?.[0]??fallback;
// Vertical intrinsic layout of the kit's fixed rows, text lines and padded flex stacks.
// Popup contents and absolute decoration do not contribute to the parent's flow.
function height(n) {
  if(typeof n==='string')return 18;
  if(!n||n.attrs.absolute)return 0;
  if(typeof val(n,'h',null)==='number')return val(n,'h');
  if(typeof val(n,'size',null)==='number')return val(n,'size');
  const kids=n.kids.filter(k=>k!=null&&!k?.attrs?.absolute),sizes=kids.map(height);
  const vertical=Boolean(n.attrs.flex_col),gap=vertical?val(n,'gap')*Math.max(0,kids.length-1):0;
  return (vertical?sizes.reduce((a,b)=>a+b,0):Math.max(0,...sizes))+gap+
    val(n,'pt',val(n,'py',val(n,'p')))+val(n,'pb',val(n,'py',val(n,'p')))+Number(Boolean(n.attrs.border_b_1));
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
let zoom=1;const state={},jobs=[];
const cx={notify(){},stop_propagation(){},focus_handle:()=>({focus(){}}),spawn:fn=>jobs.push(fn)};
const input={new:({value='' }={})=>({value:()=>value,set_value:v=>value=v,on(){}})};
const {ui,registry}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>[],panes:()=>[],terminals:()=>[],focused:()=>null,settings:()=>({zoom})},modules:{
  'plugins-ui.js':'src/features/settings/plugins-ui.js','ui.js':'src/ui/ui.js','settings-kit.js':'src/ui/settings-kit.js',
  'modal-layout.js':'src/ui/modal-layout.js','reorder.js':'src/ui/reorder.js','directory.js':{spaceDirectory:()=>({cwd:null})},
  'space-color-state.js':{currentSpaceColor(){}},'machine-picker.js':{machinePicker:element},
  'folder-browser.js':{folderBrowser:element,openBrowser(){},closeBrowser(){}},
  'gpui-kit':{div:element,svg:element,image:element},
  'gpui-base':{v_flex:v,h_flex:h,Popover:{new:id=>element().id(id)},Popup:{new:element},Input:{new:element},InputState:input,
    Checkbox:{new:element},Textarea:{new:element},TextareaState:input},
},entry:"export * as ui from './plugins-ui.js';export * as registry from './plugins.js';"});
const git=registry.pluginById('git'),original=git.prerequisites,definition=original.find(p=>p.id==='repository');
const id='st-plugin-git-repository',listId='st-plugin-list-git-repository';
const toggle=(_t,id,on,click)=>element().id(id).on_click(click);
const rows=n=>Array.from({length:n},(_,i)=>({id:`owner/repo-${i}`,label:`owner/repo-${i}`}));
try {
  for(zoom of [0.75,1,1.3,1.5,2])for(const count of [0,1,7,20]) {
    let current=rows(count),operation,recheck;
    const list={...definition.list,remove:()=>operation.promise,candidates:async()=>({items:[{id:'owner/added',label:'owner/added'}],add:()=>operation.promise})};
    const result=()=>({...definition,list,status:'ready',usable:true,about:'',detail:'',rows:current,
      selection:{key:'githubAccount',value:'fixture',options:[['fixture','fixture']]}});
    git.prerequisites=original.map(p=>p.id==='repository'?{...p,list,check:()=>recheck.promise}:p);
    const view={heading:element,toggle,handle:{focus(){}}};ui.initPlugins(view,cx,'git');jobs.length=0;
    view.pluginOpen['git-repository']=true;
    view.pluginChecks.git={loading:false,items:[result()]};
    const render=()=>ui.pluginsPage(view,{}),click=id=>{const n=find(render(),id);assert.ok(n,id);n.attrs.on_click[0]({},cx);};
    // Lay out the intrinsic body, publish the window-pixel native measurement, then
    // re-render the clip. Feeding the clip itself back would hide the zoom bug.
    const measure=(expectedCount,detail=false)=>{
      let tree=render(),body=find(tree,id+'-body');
      const expected=height(find(body,listId+'-where'))+16+
        (expectedCount?8+expectedCount*28+(expectedCount-1)*2:0)+(detail?8+18:0);
      assert.equal(height(body),expected,'Only scope, actual rows/detail, gaps and normal padding consume space');
      body.attrs.on_size_change[0]({width:700*zoom,height:height(body)*zoom},cx);
      tree=render();body=find(tree,id+'-body');
      assert.ok(Math.abs(val(find(tree,id+'-clip'),'h')-expected)<=0.5,`No retained gap: ${expectedCount} rows at ${zoom}x`);
      assert.ok(Math.abs(height(body)-expected)<=0.5);
      assert.ok(!words(body).some(s=>/^Updating(?:…|\.\.\.)?$/.test(s)));
      return expected;
    };
    const busy=()=>{
      assert.equal(find(render(),listId+'-add').attrs.disabled[0],true);
      assert.ok(words(find(render(),id+'-status-rail')).includes('Applying'));
    };
    measure(count);
    for(const action of ['add','remove']) {
      // Start removals at the requested row count too; zero exercises 1 -> 0.
      if(action==='remove'&&count>0){current=rows(count);view.pluginChecks.git.items=[result()];measure(count);}
      const before=current.length;operation=deferred();recheck=deferred();
      if(action==='add') {
        find(render(),listId+'-add-popup').attrs.on_open_change[0](true,cx);await jobs.shift()(cx);
        click(listId+'-item-0');click(listId+'-choose');
      } else {
        find(render(),listId+'-row-0').attrs.on_hover[0](true,cx);click(listId+'-remove-0');
      }
      busy();assert.equal(measure(before),height(find(render(),id+'-body')),'Mutation keeps the previous exact height');
      const running=jobs.shift()(cx);operation.resolve({errors:{}});await running;
      busy();measure(before);
      const checking=jobs.shift()(cx);busy();measure(before);
      current=action==='add'?[...current,{id:'owner/added',label:'owner/added'}]:current.slice(1);
      recheck.resolve(result());await checking;
      measure(current.length);assert.equal(view.pluginSettling['git:repository'],undefined);
      assert.equal(find(render(),listId+'-add').attrs.disabled[0],false);
      assert.equal(jobs.length,0);
    }
    view.pluginFixError['git:repository']='Request refused';measure(current.length,true);
    delete view.pluginFixError['git:repository'];measure(current.length);
    // Replacing a much larger settled result must not preserve obsolete row slots.
    view.pluginChecks.git.items=[{...result(),rows:rows(20)}];measure(20);
    view.pluginChecks.git.items=[result()];measure(current.length);
    // Requirements and Settings share the same disclosure measurement path.
    view.pluginChecks.git.items=[...original.filter(p=>!p.section).map(p=>({...p,status:'ready'})),result()];
    for(const section of ['requirements','settings']) {
      view.pluginOpen[`git-${section}`]=true;
      const sibling=`st-plugin-git-${section}`,body=find(render(),sibling+'-body'),actual=height(body);
      assert.ok(actual>16,`${section} contains real rows, not just an empty padding shell`);
      body.attrs.on_size_change[0]({height:actual*zoom},cx);
      assert.ok(Math.abs(val(find(render(),sibling+'-clip'),'h')-actual)<=0.5,`${section} has no zoom-inflated tail`);
    }
  }
} finally {git.prerequisites=original;}
console.log('PASS: packaged plugin sections fit 0/1/7/20 rows at 75–200% zoom, through add/remove/recheck and error clearing');
