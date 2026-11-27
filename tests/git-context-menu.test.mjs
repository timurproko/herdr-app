import assert from 'node:assert/strict';
import {scrollModule,Background} from './support/git-scroll-modules.mjs';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import * as labelColors from '../src/plugins/git/mod/label-colors.js';
import {loadMod} from '../tools/plugin-harness.mjs';
const pullHelpers=await loadMod({mod:'custom-changes',modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
import {Publication} from '../src/plugins/git/mod/presentations.js';
const U={row:28,gap:8,radius:6,smallIcon:14};

function element() {
  const node = {attrs:{},kids:[]}; let proxy;
  proxy = new Proxy(node,{get(target,key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes,fn)=>yes ? fn(proxy) : proxy;
    if (key === 'child') return child=>{node.kids.push(child);return proxy;};
    if (key === 'children') return children=>{node.kids.push(...children);return proxy;};
    return (...args)=>{node.attrs[key]=args;return proxy;};
  }});
  return proxy;
}
function find(node,id) {
  if (node?.attrs?.id?.[0] === id) return node;
  return node?.kids?.map(child=>find(child,id)).find(Boolean);
}
const opened=[],closed=[],notices=[],clipboard=[],browser=[];
let properties=null,focused=0,background=0,stopped=0,receive;
let commandReads=0,diagnosticReads=0;
const host={props:()=>properties,openOverlay:spec=>opened.push(spec),closeOverlay:id=>closed.push(id),notify:n=>notices.push(n),
  exec:(...args)=>{browser.push(args);return Promise.resolve();},window:()=>({platform:'windows'}),theme:()=>({hover:'hover'}),
  hc(){},run(command){assert.equal(command,'custom-changes.open-external');receive(command.slice('custom-changes.'.length));},
  nextCommand:()=>{commandReads++;return new Promise(resolve=>{receive=resolve;});},layout(){},settings:()=>({zoom:1})};
const modules={
  './enrollment-picker.js':{EnrollmentPicker:class{}},
  './label-colors.js':labelColors,
  './presentations.js':{Publication},
  './aggregate.js':{AggregatePulls:class {sync(){return false;}stop(){}}},
  './ci-fix.js':{CIFix:class {sync(){}stop(){}}},
  './notices.js':{GitNotices:class {sync(){return null;}stop(){}retryNow(){}}},
  './webhooks.js':{GitWebhooks:class {sync(){} stop(){}}},
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{},Background},
  'gpui-base':{v_flex:element,h_flex:element},
  './host.js':host,'./location.js':{location:()=>({cwd:'/other-repo',on:'pc2'})},
  './ui.js':{U,panelTitle:element,headerTools:el=>el,reveal:el=>el,subtleActionFill:()=>'',refreshButton:element,emptyState:element,menuSurface:(_t,el)=>el,menuHeading:(_t,text)=>element().child(text),slot:el=>el},
  './plugins.js':{sidebarPanelEnabled:()=>true},'./sidebar-title.js':{sidebarTitle:element},
  './agent-links.js':{AgentLinks:class{}},'./pin-swap.js':{PinSwap:class{},PIN_SWAP_MS:320},
  './panel-pin.js':{panelPin:(_t,{id})=>element().id(id)},'./panel-state.js':{changePanel(){}},
  // Link the real pure helper namespace, not a stale hand-maintained export
  // list. Keep the diagnostic trap: popup actions must never initialize reads.
  './pulls.js':{...pullHelpers,gitReads(){diagnosticReads++;return {};}},

};
assert.equal(typeof pullHelpers.pullFailure,'function','The production helper really exports the newly imported classifier');
assert.equal(pullHelpers.pullFailure({code:1,stderr:'HTTP 503 Service Unavailable'}).kind,'response');
const context=vm.createContext({});
const main=new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/git/mod/main.js',import.meta.url),'utf8'),{context});
const panelKit=kitModule(context);withKitUi(modules['./ui.js'],element);
await main.link(specifier=>scrollModule(context,specifier)??(specifier==='./settings-dialog.js'?new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/settings-dialog.js',import.meta.url),'utf8'),{context}):specifier==='./panel-kit.js'?panelKit:new vm.SyntheticModule(Object.keys(modules[specifier]),function(){
  for (const [key,value] of Object.entries(modules[specifier])) this.setExport(key,value);
},{context})));
await main.evaluate();
const Changes=main.namespace.default;
const cx={notify(){},stop_propagation(){stopped++;},write_to_clipboard:text=>clipboard.push(text),
  focus_handle:()=>({focus(){focused++;}}),spawn(fn){background++;fn(cx);},timer:{every(){background++;}}};
const panel=new Changes();
panel.agentLinks={related:()=>null};
const pr={number:923,title:'Clicked PR',url:'https://github.com/owner/repo/pull/923',state:'open'};
const row=panel.pullRow({},pr);
assert.equal(row.attrs.on_mouse_down[0],'right');
row.attrs.on_mouse_down[1]({},cx);
assert.equal(stopped,1);
assert.equal(browser.length,0,'Right-click must not open the browser');
const spec=opened[0];
assert.equal(spec.mod,'custom-changes');assert.equal(spec.kind,'popup');assert.equal(spec.frame,'none');
assert.equal(spec.height,2*U.row+12+9);assert.equal(spec.props.pullMenu.url,pr.url);
assert.equal(panel.pullRow({},pr,true).attrs.on_mouse_down,undefined,'Animation ghosts are not interactive');
panel.showPullMenu({number:2},cx);assert.equal(opened.length,1,'Missing URLs do not open a menu');
assert.equal(commandReads,1,'One panel receiver owns browser work after the popup closes');
background=0;
// Changing focus/repository or refreshed row data cannot retarget the popup.
properties={...spec.props,overlay:'menu-923'};
pr.url='https://github.com/elsewhere/repo/pull/1';
const menu=new Changes();menu.init({},cx);
assert.equal(focused,1);assert.equal(background,0,'Popup starts no Git/GitHub/agent work or timers');
let tree=menu.render(cx);
const action=find(tree,'git-context-copy-path');
assert.equal(action.attrs.accessibility_label[0],'Copy path');
assert.deepEqual(tree.kids.map(item=>item.attrs.id[0]),['git-context-open','git-context-separator','git-context-copy-path']);
assert.equal(find(tree,'git-context-open').attrs.accessibility_label[0],'Open...');
action.attrs.on_click[0]({},cx);
const url='https://github.com/owner/repo/pull/923';
assert.deepEqual(clipboard,[url]);assert.deepEqual(closed,['menu-923']);
assert.equal(notices[0].title,'Path copied');assert.equal(notices[0].body,url);
assert.equal(notices[0].level,'success');assert.equal(notices[0].timeout,3000);
tree.attrs.on_key_down[0]({key:'escape'},cx);
assert.equal(clipboard.length,1,'Escape dismisses without copying');
find(tree,'git-context-open').attrs.on_click[0]({},cx);
for (let i=0;i<8;i++) await Promise.resolve();
assert.equal(browser.length,1,'Open launches in the panel, not the closed popup');
assert.deepEqual(Array.from(browser[0][1]),['/c','start','',url]);
assert.equal(browser[0][2].on,undefined,'Remote PRs still use this computer’s browser');
assert.deepEqual(clipboard,[url],'Open does not copy or show a success toast');
assert.equal(notices.length,1);
// Enter defaults to Open, like Files, and reuses the sole panel receiver.
panel.showPullMenu({url},cx);
assert.equal(commandReads,2);
properties={...opened.at(-1).props,overlay:'menu-keyboard'};
const keyboardMenu=new Changes();keyboardMenu.init({},cx);
keyboardMenu.render(cx).attrs.on_key_down[0]({key:'enter'},cx);
for (let i=0;i<8;i++) await Promise.resolve();
assert.equal(browser.length,2);assert.equal(closed.at(-1),'menu-keyboard');
row.attrs.on_click[0]();assert.equal(browser.length,3,'Ordinary left click still opens GitHub');
const source=fs.readFileSync(new URL('../src/plugins/git/mod/main.js',import.meta.url),'utf8');
for(const retired of ['git-header-context-menu','git-header-context-title','open-code','open-actions','git-repo-name','git-repo-slot'])assert.ok(!source.includes(retired),`${retired} is removed, not relocated`);
assert.equal(browser.length,3);assert.equal(clipboard.length,1,'Removing repository shortcuts preserves individual PR actions');
assert.equal(diagnosticReads,0,'Context menus never initialize repository read diagnostics');
console.log('PASS removed repository header/menu commands; captured local-browser PR Open, Copy path, keyboard and click isolation stay intact');
