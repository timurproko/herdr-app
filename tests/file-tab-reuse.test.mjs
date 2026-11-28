import assert from 'node:assert/strict';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

async function harness(root='D:/project',on='pc2') {
  let now=100000,fail=false;
  const storage=new Map(),calls=[],reads=[];
  const place={cwd:root,on,space:'pc2/space',tab:'pc2/agent',terminal:'pc2/t1'};
  const spaces=[{id:place.space,machine:on,active:true,tabs:[]}],panes=[];
  const context=vm.createContext({Date:class extends Date {static now(){return now;}},
    sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  const host={spaces:()=>spaces,panes:()=>panes,terminals:()=>[],focused:()=>({}),home:()=>'',
    layout:()=>({id:'files'}),run:(name,args)=>{if(fail)throw Error('creation failed');calls.push([name,JSON.parse(JSON.stringify(args))]);},
    readTextFile:(...args)=>{reads.push(args);throw Error('Reusing a tab must not reread files');},
    exec:()=>{throw Error('No process or terminal operations are allowed');},writeTextFile(){},notify(){},theme:()=>({}),
    window:()=>({platform:'windows'}),props:()=>({}),openOverlay(){},closeOverlay(){},nextCommand(){}};
  const modules={
    './panel-pin.js':{panelPin(){}},'./panel-state.js':{changePanel(){}},
    'gpui-kit':{View:class{},div(){},svg(){},image(){}},'gpui-base':{v_flex(){},h_flex(){},Editor:{},EditorState:{}},
    './host.js':host,'./ui.js':{U:{},slot(){},headerTools(){},reveal(){},subtleActionFill(){},panelTitle(){},refreshButton(){},emptyState(){},menuSurface(){},dialogSurface(){},dialogHeader(){},dialogBody(){},description(){},button(){}},
    './delete-entry.js':{deleteEntry(){throw Error('No deletion during file tab reuse');}},
    './file-icons.js':{fileIconAsset(){}},'./preview-font.js':{previewFont(){}},'./location.js':{location:()=>place},'./plugins.js':{runPluginHook(){},sidebarPanelEnabled:()=>true},'./sidebar-title.js':{sidebarTitle(){}},
  };
  const main=new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/files/mod/main.js',import.meta.url),'utf8'),{context});
  let headers;
  const panelKit=kitModule(context);withKitUi(modules['./ui.js']);
  await main.link(name=>{
    if(name==='./panel-kit.js')return panelKit;
    if(name==='./file-header.js')return headers=new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/file-header.js',import.meta.url),'utf8'),{context});
    assert.ok(modules[name],name);
    return new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const [key,value]of Object.entries(modules[name]))this.setExport(key,value);},{context});
  });
  await main.evaluate();
  const view=new main.namespace.default();view.root=root;view.on=on;
  view.context={...place,key:JSON.stringify([root,on])};
  function addFile(name,{id='pc2/file',space=spaces[0],active=false,settled=false,mod='custom-files',header=null,count=1}={}) {
    const tab={id,name,active,settled};space.tabs.push(tab);
    for(let i=0;i<count;i++)panes.push({pane:`${id}/pane${i}`,tab:id,mod});
    if(header)headers.namespace.publishFileHeader(id,header);
    return tab;
  }
  return {view,place,spaces,panes,calls,reads,addFile,headers:headers.namespace,
    advance:(ms=3001)=>{now+=ms;},fail:value=>{fail=value;}};
}

for(const active of [false,true]) {
  const h=await harness();h.addFile('D:/project/src/main.ts',{active,settled:!active});
  h.view.openFile('src/main.ts');
  assert.deepEqual(h.calls,[['pane.focus',{pane:'pc2/file/pane0'}]],'Existing active, inactive and settled file tabs are focused, never recreated');
  assert.equal(h.reads.length,0,'The existing editor and scroll state are retained');
}

{
  const h=await harness();h.addFile('D:\\PROJECT\\src\\MAIN.ts');
  h.view.openFile('src/main.ts');assert.equal(h.calls[0][0],'pane.focus','Windows slash and case variants identify the same file');
}
{
  const h=await harness('\\\\server\\share\\project',null);h.addFile('//SERVER/share/project/src/Main.ts');
  h.view.openFile('src/main.ts');assert.equal(h.calls[0][0],'pane.focus','UNC paths use Windows comparison');
}
{
  const h=await harness('/project','linux');h.addFile('/project/Src/main.ts');
  h.view.openFile('src/main.ts');assert.equal(h.calls[0][0],'tab.new','POSIX case differences remain distinct files');
}
{
  const h=await harness();h.addFile('main.ts',{header:'D:/project/src/main.ts'});
  h.view.openFile('src/main.ts');assert.equal(h.calls[0][0],'pane.focus','Legacy basename tabs match their published full path');
  h.spaces[0].tabs[0].name='My notes';h.view.openFile('src/main.ts');
  assert.equal(h.calls[1][0],'pane.focus','Renaming a viewer does not change its known file identity');
}

{
  const h=await harness();h.spaces[0].active=false;
  const destination={id:'local-space',active:true,machine:null,tabs:[]};h.spaces.push(destination);
  h.addFile('D:/project/src/main.ts',{space:destination});h.view.openFile('src/main.ts');
  assert.equal(h.calls[0][0],'tab.new','A held remote source cannot reuse an unverified same-path local viewer');
  assert.equal(h.calls[0][1].space,destination.id);assert.equal(h.calls[0][1].props.fileMachine,'pc2');
}

for(const mismatch of ['directory','basename-only','other-space','other-machine','terminal','missing-pane','multiple-viewers']) {
  const h=await harness();
  if(mismatch==='other-space'||mismatch==='other-machine')h.spaces.push({id:'elsewhere',machine:mismatch==='other-machine'?'pc3':'pc2',tabs:[]});
  const tab=h.addFile(mismatch==='directory'?'D:/other/src/main.ts':mismatch==='basename-only'?'main.ts':'D:/project/src/main.ts',{
    space:h.spaces.at(-1),mod:mismatch==='terminal'?null:'custom-files',count:mismatch==='missing-pane'?0:mismatch==='multiple-viewers'?2:1,
  });
  h.view.openFile('src/main.ts');
  assert.equal(h.calls[0][0],'tab.new',`${mismatch}: do not focus an unrelated or ambiguous tab`);
  assert.equal(h.calls[0][1].props.fileMachine,'pc2');assert.equal(h.calls[0][1].props.fileSpace,'pc2/space');
  assert.equal(h.calls[0][1].props.fileRoot,'D:/project');assert.equal(h.calls[0][1].props.fileRelative,'src/main.ts');
  assert.equal(h.calls[0][1].name,'D:/project/src/main.ts');assert.equal(tab.name.includes('main.ts'),true);
}

{
  const h=await harness();h.addFile('D:/project/src/main.ts',{id:'older'});
  h.addFile('D:/project/src/main.ts',{id:'current',active:true});
  h.view.openFile('src/main.ts');assert.deepEqual(h.calls,[['pane.focus',{pane:'current/pane0'}]],'Prefer the active copy if duplicates already exist');
}
{
  const h=await harness();h.addFile('D:/project/src/main.ts');
  h.panes.unshift({pane:'terminal-pane',tab:'pc2/file',terminal:'pc2/t2'});
  h.view.openFile('src/main.ts');assert.equal(h.calls[0][1].pane,'pc2/file/pane0','A split terminal does not steal focus from the file pane');
}
{
  const h=await harness();h.view.openFile('src/main.ts');h.view.openFile('src/main.ts');
  assert.equal(h.calls.length,1,'Repeated clicks before the native snapshot updates create only one tab');
  h.addFile('D:/project/src/main.ts');h.view.openFile('src/main.ts');
  assert.equal(h.calls.length,2);assert.equal(h.calls[1][0],'pane.focus','Once acknowledged, another click activates the actual tab');
  h.spaces[0].tabs.length=0;h.panes.length=0;h.view.openFile('src/main.ts');
  assert.equal(h.calls[2][0],'tab.new','A closed viewer is not cached as an existing tab');
}
{
  const h=await harness();h.view.openFile('src/main.ts');h.advance();h.view.openFile('src/main.ts');
  assert.equal(h.calls.length,2,'Failed/unacknowledged creation can be retried after the short lease');
  h.view.openFile('src/other.ts');assert.equal(h.calls.length,3,'Different paths are independent');
}
{
  const h=await harness();h.fail(true);assert.throws(()=>h.view.openFile('src/main.ts'),/creation failed/);
  h.fail(false);h.view.openFile('src/main.ts');assert.equal(h.calls.length,1,'A synchronous failure releases the duplicate guard');
}
{
  const h=await harness();h.addFile('D:/project/src/main.ts');h.place.cwd='D:/different';
  h.view.openFile('src/main.ts');assert.equal(h.calls.length,0,'A stale browser cannot create or focus a file in its old root');
  h.view.root=null;h.view.openFile('src/main.ts');assert.equal(h.calls.length,0);
}
console.log('PASS: existing file tabs activate without new tabs or reads; full-path/Windows/legacy identity, current-space isolation, native pane focus, duplicate-click lease and stale-tree guards');
