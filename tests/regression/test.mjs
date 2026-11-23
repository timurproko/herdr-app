// Run: node --experimental-vm-modules scripts/test.mjs
// Read-only: checks isolation, preserved layout topology, assets and deferred UI states.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mix } from '../mods/custom-settings/palette.js';
import { stockBaseline } from './stock-baseline.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE, '.config/herdr-app');
const json = p => JSON.parse(fs.readFileSync(p,'utf8'));
const appVersion=execFileSync(path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe'),['--version'],{encoding:'utf8'}).trim().replace(/^herdr-app\s+/,'');
const coverage = stockBaseline(root,appVersion), baseline = coverage.baseline;
if(coverage.advisory)console.warn(`ADVISORY: ${coverage.advisory}`);
const terminalRecordPath=path.join(home,'.customizations/terminal-input.json');
const terminalRecord=fs.existsSync(terminalRecordPath)?json(terminalRecordPath):null;
for (const [rel, expected] of Object.entries(baseline)) {
  // Settings are app/user-owned and may change during a live session (zoom, etc.).
  if (rel === 'settings.json') continue;
  if(rel==='keys.json' && terminalRecord?.version===1 && terminalRecord.files?.[rel]) {
    const record=terminalRecord.files[rel];
    assert.equal(record.upstreamHash??crypto.createHash('sha256').update(record.original).digest('hex'),expected,'Reviewed upstream shortcut provenance survives migration; the restore snapshot retains personal global keys');
    const current=JSON.parse(fs.readFileSync(path.join(home,rel),'utf8'));
    const original=JSON.parse(record.original),configured=JSON.parse(record.installed);
    // Global shortcuts are user-owned (e.g. the requested Shift+Up/Down remap).
    assert.deepEqual(current.terminal,configured.terminal,'The opted-in terminal bindings remain intact without freezing personal global shortcuts');
    for(const key of ['ctrl-c','ctrl-v','ctrl-c ctrl-c']) {if(Object.hasOwn(original.terminal,key))configured.terminal[key]=original.terminal[key];else delete configured.terminal[key];}
    assert.deepEqual(configured,original,'Every unrelated shortcut stays unchanged');continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(home,rel))).digest('hex');
  assert.equal(actual, expected, `Shipped/personal file changed: ${rel}`);
}
const original = json(path.join(home,'layouts/main.json'));
for (const file of ['store.js','model.js','gauge.svg']) assert.equal(fs.readFileSync(path.join(root,'mods/custom-settings',file),'utf8'),fs.readFileSync(path.join(root,'mods/custom-usage',file),'utf8'),'Settings and Usage share identical preference helpers/assets');
assert.equal(fs.readFileSync(path.join(root,'mods/custom-files/file-header.js'),'utf8'),fs.readFileSync(path.join(root,'mods/custom-pane/file-header.js'),'utf8'),'File content and native pane header share one in-memory bridge');
assert.equal(fs.readFileSync(path.join(root,'mods/custom-files/preview-font.js'),'utf8'),fs.readFileSync(path.join(root,'mods/custom-settings/preview-font.js'),'utf8'),'Settings and file previews share identical font preferences');
const skin = json(path.join(root,'layouts/Custom.json'));
function topology(n) {
  return { id:n.id, type:n.type, children:(n.children ?? []).filter(c=>c.id!=='sidebar-usage').map(topology),
    content:n.content ? { ...n.content, mod:n.content.mod?.replace(/^custom-/,''),
      pane:n.content.pane ? { header:n.content.pane.header.content.mod.replace(/^custom-/,''), lone:n.content.pane.lone } : undefined } : undefined,
    active:n.active, hidden:n.hidden, resizable:n.resizable, window_drag:n.window_drag };
}
function layoutNode(node,id) {return node.id===id?node:(node.children??[]).map(child=>layoutNode(child,id)).find(Boolean);}
const explorerReference=structuredClone(original);layoutNode(explorerReference,'panel').hidden=false;
assert.deepEqual(topology(skin),topology(explorerReference),'Only the requested explorer default visibility may differ from stock topology');
assert.equal(layoutNode(skin,'panel').hidden,false);assert.equal(layoutNode(skin,'panel').size.px,368);assert.equal(layoutNode(skin,'panel-body').active,'files');
assert.equal(skin.children[0].children.find(n=>n.id==='sidebar-usage')?.content.mod,'custom-usage');
const machineIcon=mod=>fs.readFileSync(path.join(root,'mods',mod,'server.svg'),'utf8').replace(/\s+/g,'');
assert.equal(machineIcon('custom-workspace-chrome'),machineIcon('custom-settings'),'Sidebar and Settings share the same machine glyph');
assert.match(fs.readFileSync(path.join(root,'mods/custom-files/refresh.svg'),'utf8'),/stroke-width="1\.5"/,'Refresh matches the neighboring pane-tool stroke weight');
assert.equal(fs.readFileSync(path.join(root,'mods/custom-workspace-chrome/sidebar-right.svg'),'utf8').trim(),fs.readFileSync(path.join(root,'mods/custom-workspace-chrome/sidebar.svg'),'utf8').trim().replace('M9.5','M14.5'),'Right sidebar glyph is the exact mirrored left glyph, not the heavier stock panel icon');
const sidebarFooter=skin.children[0].children.find(n=>n.id==='sidebar-footer');
const contentFooter=skin.children[1].children.find(n=>n.id==='status');
assert.equal(sidebarFooter.size.px,36);assert.equal(contentFooter.size.px,36);
assert.equal(layoutNode(skin,'sidebar-usage').size.px,sidebarFooter.size.px,'Usage and status-bar controls share 4px vertical hover insets around their 28px targets');
const availableNames = fs.readdirSync(path.join(root,'mods')).filter(n => n.startsWith('custom-'));
const requested = process.argv.slice(2);
for (const name of requested) assert.ok(availableNames.includes(name), `Unknown test mod: ${name}`);
const names = requested.length ? availableNames.filter(name => requested.includes(name)) : availableNames;
for (const name of names) {
  const dir = path.join(root,'mods',name), text = fs.readFileSync(path.join(dir,'main.js'),'utf8');
  assert.equal(fs.readFileSync(path.join(dir,'ui.js'),'utf8'),fs.readFileSync(path.join(root,'lib/ui.js'),'utf8'));
  for (const [,asset] of text.matchAll(/["'](mods\/custom-[^"'`$]+\.(?:svg|png|js))["']/g)) {
    assert.ok(fs.existsSync(path.join(root,asset)),`Missing asset: ${asset}`);
  }
  if (!['custom-confirm', 'custom-space-start'].includes(name)) assert.ok(json(path.join(dir,'mod.json')).cloned_from);
  else assert.equal(json(path.join(dir,'mod.json')).place, 'none', 'Original private dialogs/pages are not fabricated upstream clones');
  if(['custom-settings','custom-workspace-chrome','custom-picker','custom-machine-add','custom-worktree','custom-usage'].includes(name)) assert.equal(fs.readFileSync(path.join(dir,'look.js'),'utf8'),fs.readFileSync(path.join(root,'lib/look.js'),'utf8'));
}
for(const helper of ['modal-layout.js','program-icon.js','machine-picker.js','space-title.js','directory.js','tab-rename.js','space-rename.js','sidebar-scroll.js','sidebar-usage.js','reorder.js'])for(const name of names){const file=path.join(root,'mods',name,helper);if(fs.existsSync(file))assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync(path.join(root,'lib',helper),'utf8'),`${helper} copies share one canonical design contract`);}
assert.equal(json(path.join(root,'themes/Custom.json')).ansi.length,16);
console.log(`PASS: ${coverage.reviewed?'reviewed shipped-mod/layout baseline unchanged':'stock byte coverage unreviewed, not asserted'}; topology/features preserved; private assets present (palette exception tested separately)`);

// Minimal non-visual GPUI builder. Executes every .when and list row without a
// real terminal, process, timer, filesystem write or network call.
function element(kind='div') {
  const node = {kind, kids:[], events:{}, buttonEvents:{}, style:{}};
  let proxy;
  proxy = new Proxy(node,{get(o,k) {
    if (k in o) return o[k];
    if (k === 'when') return (yes,fn) => yes ? fn(proxy) : proxy;
    if (k === 'child' || k === 'content' || k === 'trigger') return child => { if(child != null) o.kids.push(child); return proxy; };
    if (k === 'children') return xs => { o.kids.push(...xs.filter(x=>x!=null)); return proxy; };
    if (String(k).startsWith('on_')) return (...args) => { o.events[k] = args.at(-1); if (['on_mouse_down','on_mouse_up'].includes(k)) (o.buttonEvents[k]??={})[args[0]]=args.at(-1); return proxy; };
    if (k === 'hover') return fn => { o.hoverStyle=element('hover'); fn(o.hoverStyle); return proxy; };
    if (k === 'then') return undefined;
    return (...args) => { o.style[k]=args; return proxy; };
  }});
  return proxy;
}
function nodes(n,out=[]) { if(n && typeof n==='object') { out.push(n); for(const c of n.kids??[]) nodes(c,out); } return out; }
const noop = () => {};
const refreshTimers=[];
const cx = { notify:noop, stop_propagation:noop, spawn:noop, timer:{every:noop,after:(ms,fn)=>{
  if(ms!==600)return;
  const timer={fn,cancelled:false};refreshTimers.push(timer);return{cancel:()=>{timer.cancelled=true;}};
}}, focus_handle:() => ({focus:noop}) };
const finishRefreshFeedback=()=>{while(refreshTimers.length){const timer=refreshTimers.shift();if(!timer.cancelled)timer.fn(cx);}};
function input(options={}) {let value=options.value??'',selection=null;const events={};return {options,events,on:(name,fn)=>{events[name]=fn;return true;},focus:noop,value:()=>value,set_value:v=>{value=v;selection=null;},set_selected_range:range=>{selection=range;},selected_range:()=>selection,release:noop};}
const storage = new Map(), session = new Map();
const base = {View:class {},div:()=>element(),svg:p=>element('svg').asset(p),image:p=>element('image').asset(p),PathBuilder:{fill:()=>element('shape'),stroke:()=>element('shape')},Background:{linear_gradient:(angle,from,to)=>({angle,from,to,color_space(space){this.space=space;return this;}})}};
const nativeThemes=[];
const ui = {set_theme:value=>nativeThemes.push(value),h_flex:()=>element('hflex'),v_flex:()=>element('vflex'),Toggle:{new:id=>element('toggle').id(id)},Checkbox:{new:id=>element('checkbox').id(id)},InputState:{new:input},Input:{new:()=>element('input')},SliderState:{new:options=>input(options)},Slider:{new:()=>element('slider')},SliderTrack:{new:()=>element('slider-track')},SliderIndicator:{new:()=>element('slider-indicator')},SliderThumb:{new:()=>element('slider-thumb')},EditorState:{new:input},Editor:{new:()=>element('editor')},Popover:{new:id=>element('popover').id(id)},HoverCard:{new:id=>element('hovercard').id(id)},Select:{new:id=>element('select').id(id)},Popup:{new:(id,trigger)=>element('popup').id(id).child(trigger)},Scrollbar:{vertical:id=>element('scrollbar').target(id)},ScrollHandle:{new:()=>({calls:[],scroll_to_item(index){this.calls.push(index);}})},VirtualListScrollHandle:{new:()=>({calls:[],scroll_to_item(index,strategy){this.calls.push([index,strategy]);}})},v_virtual_list:(id,n,h,_key,render)=>element('list').id(id).item_sizes(h).children(render({start:0,end:Math.min(n,100)}))};
let assertions=0;
for (const scenario of ['priority','grouped','rail','empty']) {
  const statuses = ['working','blocked','done','idle'];
  const tabs = statuses.map((status,i)=>({id:`tb${i}`,index:i+1,name:`Task ${i+1}`,named:true,active:i===0,status,panes:1}));
  const spaces = scenario==='empty' ? [] : [{id:'sp1',index:1,name:'Project',active:true,folder:'C:/project',machine:null,branch:'main',tabs}];
  if (scenario==='rail') spaces.push({id:'sp2',index:2,name:'Remote',active:false,folder:'/project',machine:'remote',tabs:[]});
  const panes = tabs.map((tab,i)=>({pane:`p${i}`,terminal:`t${i}`,tab:tab.id,title:tab.name,cwd:'C:/project',focused:i===0,status:statuses[i],program:{name:'Agent',key:'agent',agent:true,icon:'icons/agent.svg',tint:true}}));
  const agents = panes.map((p,i)=>({...p,address:p.terminal,space:'sp1',space_name:'Project',tab_name:tabs[i].name,tab_index:i+1,seq:i,pinned:i===3}));
  const terminals = [...agents.map(a=>({...a,state:'live',labels:{}})),{address:'kid',parent:'t0',state:'live',status:'working',program:panes[0].program}];
  let props={pane:'p0',target:{pane:'p0',terminal:'t0',id:'sp1'},tab:'pane',overlay:'test'};
  const shared = {'agents.sort':scenario==='grouped'?'grouped':'priority','workspace.panels':['files','changes'],'layout':'Custom'};
  const colors = json(path.join(root,'themes/Custom.json')).colors;
  const theme = {...colors,...Object.fromEntries(json(path.join(root,'themes/Custom.json')).ansi.map((c,i)=>[`ansi${i}`,c]))};
  const tree=structuredClone(skin); tree.children[0].size.px=scenario==='rail'?44:248;
  const calls=[], coreCalls=[], executions=[], overlays=[], closed=[], memory=new Map();let failWrite=false;
  const appPath='C:/test-app';
  memory.set(appPath+'/themes/Custom.json',JSON.stringify(json(path.join(root,'themes/Custom.json'))));
  memory.set(appPath+'/settings.json','{}');
  const writes=[],fileReads=[];let labelFailures=0;let statusReply=null;let updateScenario=null;let execReply=null;let testZoom=1;let testFocus=null;
  const herdr={checking:()=>true,spaces:()=>spaces,agents:()=>scenario==='empty'?[]:agents,terminals:()=>scenario==='empty'?[]:terminals,panes:()=>scenario==='empty'?[]:panes,machines:()=>[{name:null,layout:'ready'},...(scenario==='rail'?[{name:'remote',layout:'ready'},{name:'emptyremote',layout:'ready'}]:[])],focused:()=>testFocus??({space:'sp1',tab:'tb0',pane:'p0',terminal:'t0'}),props:()=>props,layout:()=>tree,theme:()=>theme,settings:()=>({zoom:testZoom,font_family:'JetBrains Mono',ui_font_family:'Geist',font_size:13,theme_dark:String(shared.layout).toLowerCase()==='custom'?'Custom':'graphite',theme_light:'paper'}),window:()=>({platform:'windows',buttons:true,titlebar:'none',active:true}),home:()=> 'C:/Users/test',shared:k=>shared[k],setShared:(k,v)=>{shared[k]=v;},setAgentOrder:noop,nextCommand:async()=> 'copy',updates:()=>updateScenario??({app:{version:'0.1.13',ready:null,updates:false},core:{version:'0.1.0',ready:null,managed:null},checks:false,checking:false,notes:[]}),keys:()=>[],notify:noop,run:(...a)=>calls.push(a),openOverlay:spec=>{overlays.push(spec);},closeOverlay:id=>closed.push(id),exec:async(...args)=>{executions.push(args);return execReply??({code:0,stdout:JSON.stringify(statusReply??{})});},hc:async args=>{coreCalls.push(args);return {code:args[0]==='label'&&labelFailures-->0?1:0,stdout:'{}',stderr:''};},knownAgents:async()=>[{key:'claude',name:'Claude Code',installed:false,run:['claude','--preserved-flag']},{key:'custom',name:'Custom Claude',installed:false,run:['C:/custom/claude.exe']}],readTextFile:async(p,options)=>{fileReads.push([p,options]);return memory.get(p)??null;}, writeTextFile:async(p,text,expected)=>{if(failWrite||(memory.get(p)??null)!==expected)throw Error('Stale file');memory.set(p,text);writes.push(p);},watchFolder:noop,appHome:()=>appPath,themes:()=>[{name:'graphite',light:false,colors:{...theme,background:'#101010'}},{name:'Custom',light:false,colors:theme},...(memory.has(appPath+'/themes/custom-palette.json')?[{name:'custom-palette',light:false,colors:JSON.parse(memory.get(appPath+'/themes/custom-palette.json')).colors}]:[])],fonts:()=>['Geist','JetBrains Mono'],layouts:()=>['main','Custom'],telemetry:()=>null,playSound:noop};
  for (const name of names) {
    let refreshes=0;
    const context=vm.createContext({console,structuredClone,sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},window:{refresh:()=>refreshes++,appearance:()=>'dark',viewport_size:()=>({width:1920,height:1032}),paint_path:(shape,background)=>{const node=element('paint-path');node.shape=shape;node.background=background;return node;}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
    const cache=new Map();
    function synthetic(name,exports) {
      const mod=new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports)) this.setExport(k,v);},{context,identifier:name});
      return mod;
    }
    function moduleFor(file) {
      if(cache.has(file)) return cache.get(file);
      const mod=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,mod);return mod;
    }
    async function load(file) {
      const mod=moduleFor(file);
      // Let the root linker coordinate shared transitive dependencies. Recursive
      // .link() calls race when multiple helpers import the same identity module.
      if(mod.status==='unlinked')await mod.link((specifier,ref)=>specifier==='gpui-kit'?synthetic(specifier,base):specifier==='gpui-base'?synthetic(specifier,ui):specifier==='herdr'?synthetic(specifier,herdr):specifier==='websocket'?synthetic(specifier,{WebSocket:{connect:async()=>{throw Error('Network is forbidden in fixtures');}}}):moduleFor(path.resolve(path.dirname(ref.identifier),specifier)));
      return mod;
    }
    const mod=await load(path.join(root,'mods',name,'main.js')); await mod.evaluate();
    if(name==='custom-pane') props={...props,terminal:'t0'};
    const instance=new mod.namespace.default(); instance.init?.({},cx);
    if(name==='custom-new-menu') instance.items=[{key:'terminal',name:'Terminal',icon:'icons/shell.svg',tint:true,show:true,available:true,run:null},{key:'agent',name:'Agent',icon:'icons/agent.svg',tint:true,show:true,available:true,run:['agent']}];
    if(name==='custom-files') {instance.entries.set('',[{name:'src',dir:true},{name:'main.js',dir:false}]);instance.entries.set('src',[{name:'index.js',dir:false}]);instance.folders.add('src');}
    if(name==='custom-spaces' && scenario==='rail') instance.machines=[{name:'emptyremote',state:'connected'}];
    if(name==='custom-picker') instance.showEarlier=true;
    if(name==='custom-machine-add') instance.hosts=[{alias:'test-host',aliases:[],user:'test',hostname:'host.invalid'}];
    if(name==='custom-settings') {assert.equal(instance.section,'look');instance.design.base=json(path.join(root,'themes/Custom.json'));instance.design.ready=true;}
    let view=instance.render(cx); assert.ok(view,`${name}/${scenario}`); assertions++;
    const byId=id=>nodes(view).find(n=>n.style?.id?.[0]===id);
    const selectedRow=row=>{
      assert.equal(row.style.bg?.[0],theme.selected);
      assert.ok(row.hoverStyle,'Row has a hover state');
      assert.notEqual(row.hoverStyle.style.bg[0],theme.hover,'Selected hover must not become ordinary hover');
      assert.notEqual(row.hoverStyle.style.bg[0],theme.selected,'Selected hover must be distinct');
      assert.equal(row.style.rounded[0],6);assertions++;
    };
    if(['custom-picker','custom-settings','custom-machine-add','custom-worktree','custom-usage'].includes(name)) {
      const header=byId('dialog-header'), title=byId('dialog-title'), close=byId('dialog-close');
      assert.equal(view.kids[0],header);assert.equal(title.style.text_size[0],16);assert.ok(title.style.font_semibold);
      assert.equal(close.style.size[0],28);assert.equal(close.style.accessibility_label[0],'Close');assert.ok(!byId('st-close'));
      assert.equal(header.style.pl[0],16);assert.equal(header.style.pr[0],8);
      const count=closed.length;close.events.on_click();assert.equal(closed.length,count+1);assertions++;
      const frames={'custom-picker':['pk-list',0],'custom-settings':['st-scroll-frame',0],'custom-usage':['usage-scroll-frame',0],'custom-machine-add':['ma-hosts',16],'custom-worktree':['wt-scroll-frame',16]};
      const [frameId,parentInset]=frames[name],frame=byId(frameId);
      if(frame){assert.equal(frame.style.ml[0]+parentInset,8,'Every modal viewport retains its left inset');assert.equal(frame.style.mr[0]+parentInset,0,'Every modal scrollbar lane docks to the right edge');assert.equal(frame.style.my[0],8,'Every modal scrollbar has symmetric vertical spacing');assert.equal(frame.style.p,undefined,'Viewport padding cannot manufacture overflow');assertions++;}
      if(name==='custom-settings'){const holder=nodes(view).find(n=>n.kids?.includes(frame));assert.ok(holder.style.h_full,'Settings keeps a definite-height holder; a cross-axis flex child alone collapses its page');assert.ok(frame.style.absolute);assert.ok(frame.style.inset_0);}
    }
    const listIds={'custom-spaces':'spaces-list','custom-agents':'ag-list','custom-files':'files-tree','custom-changes':'pulls-content'};
    if(listIds[name]) {assert.ok(byId(listIds[name]), `${name}/${scenario}: scroll list exists`);assert.equal(byId(listIds[name]).style.gap[0],2);assertions++;}
    if(name==='custom-spaces' && scenario!=='empty') {
      selectedRow(byId('space-sp1'));
      assert.equal(byId('space-new').style.text_color[0],theme.dim,'Space plus matches the sort-icon tone');assertions++;
      if(scenario!=='rail') {
        instance.machines=[{name:'test-remote',state:'connected'}];view=instance.render(cx);
        const add=byId('machine-add-local');assert.equal(add.style.size[0],24);assert.equal(add.style.rounded[0],4);
        const localHead=byId('machine-local'),remoteHead=byId('machine-test-remote');
        assert.ok(localHead.kids[0].kids.includes('This computer'),'Header text begins at the left padding');
        const actions=byId('machine-actions-local');
        assert.equal(localHead.kids.at(-2),actions,'Connection actions stay on the original right rail');assert.equal(actions.kids[0].style.id[0],'machine-status-local','The status dot comes first, before +');
        assert.equal(actions.style.gap[0],3);assert.ok(actions.style.flex_none);assert.equal(actions.kids[0],add);
        assert.equal(localHead.style.gap[0],8,'Bulb-to-chevron gap stays unchanged');
        assert.equal(byId('machine-status-local').style.size[0],7);assert.equal(byId('machine-status-local').style.bg[0],theme.done);
        assert.equal(byId('machine-status-test-remote').style.bg[0],theme.dim,'Unready hosts match the Usage picker bulb');
        for(const head of [localHead,remoteHead]) assert.ok(!nodes(head).some(n=>/\/(server|monitor)\.svg$/.test(n.style?.asset?.[0]??'')),'Computer headers have no leading device icons');
        const caret=nodes(byId('machine-local')).find(n=>n.style?.asset?.[0]?.endsWith('chevron-down.svg'));
        assert.equal(caret.style.size[0],14);assert.equal(caret.style.text_color[0],theme.dim);
        assert.equal(localHead.style.pr[0],4);assert.equal(localHead.kids.at(-1).style.size[0],16);assert.equal(8+localHead.style.pr[0]+16/2,byId('spaces-header').style.pr[0]+28/2,'Header + and machine chevron share the same right-hand centerline');
        assert.equal(add.hoverStyle.style.bg[0],`${theme.foreground}0a`);add.events.on_hover(true,cx);view=instance.render(cx);
        assert.equal(byId('machine-local').style.bg[0],theme.selected,'Parent row stays highlighted under its inset control');
        byId('machine-add-local').events.on_hover(false,cx);view=instance.render(cx);assertions++;
      }
      const inactive={w:{...spaces[0],active:false},i:0,g:null,tree:null};
      for(const [i,name] of [[0,'~'],[9,'Git'],[99,'😀 work']]){const w={...inactive.w,name},expanded=nodes(instance.row({w,i,g:null,tree:null},theme)).find(n=>n.style?.id?.[0]===`space-content-${w.id}`).kids[0],compact=instance.compact({w,i},theme).kids[0];assert.equal(compact.kids[0],String(i+1));assert.equal(compact.kids[0],expanded.kids[0],'Expanded/collapsed space badges show the same space number');assert.equal(compact.style.bg[0],expanded.style.bg[0]);assert.equal(compact.style.size[0],expanded.style.size[0]);}
      const worktreeRow=instance.row({...inactive,g:{name:'Project',linked:true,ahead:1},tree:'└─'},theme),worktreeContent=nodes(worktreeRow).find(n=>n.style?.id?.[0]===`space-content-${inactive.w.id}`);
      assert.equal(worktreeContent.style.pl,undefined,'Worktree avatar and title use normal Spaces alignment');assert.equal(worktreeContent.kids[0].kids[0],'1');assert.equal(worktreeContent.kids.at(-1).style.id[0],`space-worktree-${inactive.w.id}`,'Git marker is last, after metadata');assert.equal(worktreeContent.kids.at(-1).style.tooltip[0],'Git worktree');assertions++;
      const row=scenario==='rail'?instance.compact(inactive,theme):instance.row(inactive,theme);
      assert.equal(row.hoverStyle.style.bg[0],theme.hover);assertions++;
    }
    if(name==='custom-agents' && scenario!=='empty') {
      assert.equal(view.style.pt[0],8);const sort=byId('ag-sort');assert.ok(sort);assert.equal(sort.style.size[0],28);assert.ok(sort.style.cursor_pointer);assert.equal(sort.style.tooltip,undefined);assert.equal(sort.style.accessibility_label[0],'Group agents by');
      if(scenario==='rail'){assert.ok(byId('ag-header').style.justify_center);assert.equal(byId('ag-header').style.pl[0],8);assert.equal(byId('ag-header').style.pr[0],8);}
      const priorSort=shared['agents.sort'],priorProps=props,priorCalls=calls.length;
      sort.events.on_click({},cx);assert.equal(overlays.at(-1).mod,'custom-agents');assert.equal(overlays.at(-1).props.sortMenu,true);assert.equal(calls.length,priorCalls,'Opening rail sorting does not expand the sidebar or focus a terminal');
      props={sortMenu:true,overlay:'sort-test'};view=instance.render(cx);byId('sort-grouped').events.on_click({},cx);assert.equal(shared['agents.sort'],'grouped');assert.equal(closed.at(-1),'sort-test');
      props=priorProps;view=instance.render(cx);assert.ok(nodes(byId('ag-sort')).some(n=>n.style?.asset?.[0]?.endsWith('/more.svg')),'Rail and expanded headers show the options button like Spaces');
      shared['agents.sort']=priorSort;view=instance.render(cx);assertions++;
    }
    if(name==='custom-agents' && scenario!=='empty') {
      if(scenario!=='rail') {
        for (let i=0;i<tabs.length;i++) {
          assert.deepEqual(byId(`agent-name-t${i}`).kids,[`Task ${i+1}`],'Priority, grouped and pinned rows show only their session name');
          assert.ok(byId(`agent-name-t${i}`).style.flex_1,'Session title uses all space before metadata');
          assert.equal(byId(`agent-detail-t${i}`),undefined,'No folder prefix or separator fragment');
          assert.ok(!nodes(byId(`ag-t${i}`)).some(n=>n.kids?.includes('Project')));
        }
        const originalTab={...tabs[0]},originalTitle=agents[0].title;
        tabs[0].name='Renamed tab';view=instance.render(cx);
        assert.deepEqual(byId('agent-name-t0').kids,[originalTitle],'Renaming a tab never changes the agent session label');
        agents[0].title='Session · keep this dot';view=instance.render(cx);
        assert.deepEqual(byId('agent-name-t0').kids,['Session · keep this dot'],'Punctuation within an actual session name is preserved');
        tabs[0].name='1';tabs[0].named=false;agents[0].title='Live session';view=instance.render(cx);
        assert.deepEqual(byId('agent-name-t0').kids,['Live session'],'Agent titles update independently of tab names and other panes');
        for(const generic of ['Agent','agent','','1','~/project','/home/user/project','C:/project','C:\\project','user@host']) {
          agents[0].title=generic;view=instance.render(cx);
          assert.deepEqual(byId('agent-name-t0').kids,['Agent'],'Untitled agents fall back to their program name, not the folder or renamed tab');
        }
        Object.assign(tabs[0],originalTab);agents[0].title=originalTitle;view=instance.render(cx);assertions++;
      }
      if(scenario!=='rail') {
        const head=byId('sec-2')??byId('sp-project');assert.ok(head);assert.equal(head.style.h[0],28);assert.equal(head.style.rounded[0],6);assert.equal(head.hoverStyle.style.bg[0],theme.hover);
        assert.ok(nodes(head).some(n=>n.style?.asset?.[0]?.endsWith('chevron-down.svg')));
        assert.ok(head.kids[0].style.flex_1,'Group labels start at the left padding, with no reserved icon slot');
        assert.ok(!nodes(head).some(n=>/\/(layers|folder|pin)\.svg$/.test(n.style?.asset?.[0]??'')),'Group headers omit decorative icons');
        head.events.on_click({},cx);view=instance.render(cx);assert.ok(!byId('ag-t0'));
        assert.ok(nodes(byId(head.style.id[0])).some(n=>n.style?.asset?.[0]?.endsWith('chevron-right.svg')));
        byId(head.style.id[0]).events.on_click({},cx);view=instance.render(cx);assert.ok(byId('ag-t0'));assertions++;
        const age=byId('agent-age-t0'),count=byId(`agent-count-${head.style.id[0]}`),groupMeta=byId(`agent-group-meta-${head.style.id[0]}`);
        assert.equal(age.style.h[0],20);assert.equal(count.style.w[0],age.style.w[0]);assert.equal(count.style.h[0],age.style.h[0]);
        for(const numeric of [age,count]) {assert.ok(numeric.style.justify_end);assert.ok(numeric.kids[0].style.w_full);assert.ok(numeric.kids[0].style.text_right);}
        assert.equal(groupMeta.style.gap[0],byId('agent-meta-t0').style.gap[0]);assert.equal(groupMeta.kids.at(-1).style.size[0],16,'Chevron occupies the same rail as agent status');
        assert.ok(byId('agent-meta-t0').style.flex_none);assert.ok(byId('ag-t0').style.w_full);assertions++;
      } else {
        assert.equal(byId('ag-t0').style.gap[0],2);assert.equal(byId('ag-t0').kids[0].style.w[0],8);assertions++;
      }
      assert.equal(instance.statusSlot(theme,{status:'working'},false).style.w[0],16);assertions++;
      assert.equal(instance.status(theme,{status:'idle'},true).style.bg[0],theme.dim);assert.equal(instance.status(theme,{status:'done'},true).style.bg[0],theme.done);assertions++;
      if(scenario==='rail') {
        byId('ag-t0').events.on_mouse_down({},cx);assert.equal(overlays.at(-1).props.tab,'agent');assertions++;
      }
      selectedRow(byId('ag-t0'));assert.equal(byId('ag-t1').hoverStyle.style.bg[0],theme.hover);assertions++;
      const spacesModule=await load(path.join(root,'mods/custom-spaces/main.js'));await spacesModule.evaluate();const referenceSpaces=new spacesModule.namespace.default();referenceSpaces.pressed=null;
      const beforeAgent={...agents[0]},beforeHeld=instance.held,beforeChanged=structuredClone(instance.changed),beforeStoredChanged=storage.get('changed');
      for(const status of ['working','blocked','done','idle'])for(const selected of [false,true]) {
        agents[0].status=status;agents[0].focused=selected;view=instance.render(cx);
        const reference=referenceSpaces.row({w:{id:'color-reference',name:'Color reference',active:selected},i:0},theme);
        const color=nodes(reference).find(n=>n.kids?.includes('Color reference')).style.text_color[0];assert.equal(color,selected?theme.foreground:theme.muted);
        if(scenario==='rail')assert.equal(byId('ag-t0').kids[0].style.text_color[0],color,'Rail numbering follows selection rather than status');
        else {assert.equal(byId('agent-name-t0').style.text_color[0],color,'Agent name matches the actual Spaces label for every activity state');if(byId('agent-detail-t0'))assert.equal(byId('agent-detail-t0').style.text_color[0],color,'The complete name/detail label uses one consistent tone');assert.equal(nodes(byId('agent-fold-t0')).find(n=>n.kind==='svg').style.text_color[0],theme.foreground,'Monochrome agent glyph stays white for selected and unselected rows');}
        const sub=instance.subRow(theme,{t:{address:'color-sub',name:'Subagent color reference',status,program:{icon:'icons/agent.svg',tint:true}},lines:[]},selected?'color-sub':null,true);
        assert.equal(nodes(sub).find(n=>n.kids?.includes('Subagent color reference')).style.text_color[0],color);assert.equal(nodes(sub).find(n=>n.kind==='svg').style.text_color[0],theme.foreground,'Sub-agent glyph stays white independently of its label');
        assert.equal(instance.status(theme,{status},true).style.bg[0],status==='working'?theme.working:status==='blocked'?theme.blocked+'26':status==='done'?theme.done:theme.dim,'Status colors remain semantic and independent of label selection');assertions++;
      }
      if(scenario!=='rail'){agents[0].program={...agents[0].program,tint:false};view=instance.render(cx);const brand=nodes(byId('agent-fold-t0')).find(n=>n.kind==='image');assert.ok(brand);assert.equal(brand.style.text_color,undefined,'Full-color program artwork is not recolored');assertions++;}
      Object.assign(agents[0],beforeAgent);instance.held=beforeHeld;instance.changed=beforeChanged;if(beforeStoredChanged===undefined)storage.delete('changed');else storage.set('changed',beforeStoredChanged);view=instance.render(cx);
    }
    if(name==='custom-machine-add') {
      assert.equal(byId('ma-host').style.h[0],32);assert.equal(byId('ma-add-test-host').style.h[0],32);
      assert.equal(byId('ma-add-test-host').style.bg,undefined);assert.equal(byId('ma-add-test-host').style.border_1,undefined);assert.equal(byId('ma-add-test-host').style.text_color[0],theme.working);assert.equal(byId('ma-add-typed').style.disabled[0],true);
      for(const id of ['ma-add-test-host','ma-add-typed']) {const a=byId(id);assert.equal(a.style.w[0],76);assert.ok(a.style.justify_end);assert.equal(a.style.px[0],8);}
      assert.equal(byId('ma-row-test-host').style.pr[0],0);
      const oldAdded=instance.added;instance.added=[{name:'test-host'}];view=instance.render(cx);const added=byId('ma-added-test-host');assert.equal(added.style.w[0],76);assert.equal(added.style.px[0],8);assert.ok(added.style.justify_end);assert.ok(nodes(added).some(n=>n.style?.asset?.[0]?.endsWith('/check.svg')));assert.ok(!nodes(added).some(n=>n.style?.asset?.[0]?.endsWith('/circle-check.svg')));instance.added=oldAdded;view=instance.render(cx);
      const old=instance.typed;byId('ma-add-typed').events.on_click({},cx);assert.equal(instance.typed,old);assert.equal(Object.keys(instance.state).length,0);assertions++;
    }
    if(name==='custom-worktree') {
      instance.repo={name:'test',top:'C:/project/feature',main:'C:/project',linked:true};view=instance.render(cx);
      assert.equal(byId('wt-branch').style.h[0],32);assert.equal(byId('wt-submit').style.h[0],32);assertions++;
      instance.opening=true;instance.list=[{path:'C:/project',branch:'main',main:true,at:1}];view=instance.render(cx);
      assert.equal(byId('wt-filter').style.h[0],32);assert.ok(byId('wt-0'));assert.ok(byId('dialog-close'));assertions++;
    }
    if(name==='custom-files') {
      assert.equal(byId('files-header').style.bg[0],theme.surface);assert.equal(byId('files-actions').style.bg[0],theme.surface);assert.equal(byId('files').style.border_color[0],theme.input,'Explorer outline matches native focused-pane outline');assert.equal(byId('files-header').style.pl[0],4,'Title button padding places its icon at the 12px gutter');assert.equal(byId('files-header').style.pr[0],12);assert.equal(byId('files-title').style.px[0],8);assert.equal(byId('files-actions').style.right[0],8);assert.equal(byId('files-actions').style.top[0],4);assert.equal(byId('files-actions').style.opacity[0],0);assert.equal(byId('files-folder').style.text_right,undefined);assert.equal(byId('files-folder').style.flex_1,undefined,'Folder tooltip owns only an intrinsic text box');assert.ok(byId('files-folder-slot').style.flex_1);assert.equal(byId('files-folder-slot').style.tooltip,undefined);assert.equal(byId('files-header').style.gap[0]+(byId('files-folder-slot').style.pl?.[0]??0),8,'Files title button/folder spacing matches the shell pane header (button padding supplies the rest)');assert.equal(byId('files-folder-slot').style.pr[0],84,'Folder tooltip cannot extend into the Refresh/Pin/Close rail');assert.ok(byId('files-folder').style.max_w_full);assertions++;
      for(const id of ['files-refresh','files-close']){assert.equal(byId(id).style.size[0],24);assert.equal(byId(id).style.rounded[0],4);assert.equal(Boolean(byId(id).style.cursor_pointer),id==='files-close','Unavailable refresh has no active pointer');assert.equal(byId(id).style.disabled[0],true);assert.equal(byId(id).kids[0].style.size[0],id==='files-refresh'?12:14);}
      assert.equal(byId('files-close').kids[0].style.asset[0],'mods/custom-pane/close.svg');
      const beforeClose=calls.length;byId('files-close').events.on_click({},cx);assert.equal(calls.length,beforeClose,'Invisible header controls cannot act');byId('files-header').events.on_hover(true,cx);view=instance.render(cx);assert.equal(byId('files-actions').style.opacity[0],1);assert.equal(byId('files-close').hoverStyle.style.bg[0],`${theme.foreground}0a`);byId('files-close').events.on_click({},cx);if(scenario!=='empty')assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['layout.hide',{id:'panel'}]));assert.equal(calls.length,beforeClose+Number(scenario!=='empty'),'Closing explorer needs a valid tab and affects no terminal or session');
      execReply={code:0,stdout:JSON.stringify([{name:'src',dir:true}])};const winPath="C:\\work space\\project's";const entries=await mod.namespace.directory(winPath,'remote');assert.equal(entries[0].name,'src');assert.equal(executions.at(-1)[0],'powershell');assert.equal(executions.at(-1)[2].on,'remote');assert.ok(executions.at(-1)[1].at(-1).includes("project''s"));
      execReply={code:0,stdout:'d\0src\0f\0README.md\0'};const unix=await mod.namespace.directory('/home/project','remote');assert.equal(unix.length,2);assert.equal(executions.at(-1)[0],'sh');execReply=null;assertions++;
      if(spaces.length){const count=fileReads.length;byId('file-main.js').events.on_click({},cx);const open=calls.at(-1);assert.equal(open[0],'tab.new');assert.equal(open[1].mod,'custom-files');assert.equal(open[1].name,'C:/project/main.js');assert.equal(open[1].props.fileSpace,'sp1');assert.equal(open[1].space,'sp1');assert.equal(open[1].props.fileViewer,true);assert.equal(open[1].props.fileMachine,null);assert.equal(fileReads.length,count,'Click opens a mod-only tab, not an inline read or terminal');assert.equal(instance.file,null);assertions++;}
      const priorProps=props,jobs=[],fontWatches=[];let fontNotifies=0;const viewerCx={...cx,notify:()=>fontNotifies++,timer:{...cx.timer,every:(ms,fn)=>fontWatches.push({ms,fn})},sleep:async()=>{},spawn:job=>jobs.push(job)};props={fileViewer:true,fileRoot:'C:/owned-fixture',fileRelative:'test.json',fileMachine:'remote',fileSpace:'fixture-space'};memory.set('C:/owned-fixture/test.json','{"fixture":true}');const viewer=new mod.namespace.default();const execCount=executions.length;viewer.init({},viewerCx);assert.ok(nodes(viewer.render(viewerCx)).some(n=>n.kids?.includes('Loading')),'File preview matches the Git loading label');await jobs.shift()(viewerCx);assert.equal(viewer.code.options.readonly,true);assert.equal(viewer.code.value(),'{"fixture":true}');assert.equal(fileReads.at(-1)[0],'C:/owned-fixture/test.json');assert.equal(fileReads.at(-1)[1].on,'remote');assert.equal(executions.length,execCount,'Viewer starts no listing, watcher, shell or terminal');const fileView=nodes(viewer.render(viewerCx));assert.equal(fileView.find(n=>n.style?.id?.[0]==='file-preview-editor').style.pl[0],8,'Line numbers have a left inset without reconstructing the editor');assert.ok(!fileView.some(n=>n.style?.id?.[0]==='file-viewer-header'),'Only the native pane header remains');assert.ok(!fileView.some(n=>n.kids?.includes('Read only')));assertions++;
      const fontPrefs=cache.get(path.join(root,'mods',name,'preview-font.js')).namespace,previewKey=fontPrefs.PREVIEW_FONT_KEY,savedPreview=shared[previewKey];
      assert.equal(viewer.code.options.font_size,12);assert.equal(viewer.code.options.font_family,'JetBrains Mono');
      const fontReads=fileReads.length,originalEditor=viewer.code;let released=0;originalEditor.release=()=>released++;
      fontPrefs.setPreviewFont({size:16,family:'Geist'});fontPrefs.setPreviewFont({size:17});const watch=fontWatches.find(w=>w.ms===100);assert.ok(watch);const notified=fontNotifies;watch.fn(viewerCx);assert.equal(fontNotifies,notified+1,'Font watcher invalidates the retained pane owner, not just the window');watch.fn(viewerCx);assert.equal(fontNotifies,notified+1,'Unchanged preferences never redraw');const styled=nodes(viewer.render(viewerCx)).find(n=>n.kind==='editor');assert.equal(styled.style.text_size[0],17);assert.equal(styled.style.font_family[0],'Geist');assert.equal(viewer.code,originalEditor);assert.equal(released,0);assert.equal(fileReads.length,fontReads);assert.equal(viewer.on,'remote');assert.equal(viewer.code.options.readonly,true);assertions++;
      if(savedPreview===undefined)delete shared[previewKey];else shared[previewKey]=savedPreview;watch.fn(viewerCx);const reset=nodes(viewer.render(viewerCx)).find(n=>n.kind==='editor');assert.equal(reset.style.text_size[0],12);assert.equal(viewer.code,originalEditor,'Font updates never reconstruct retained editor state');assert.equal(viewer.code.value(),'{"fixture":true}');assert.equal(viewer.code.options.readonly,true);assert.equal(fileReads.length,fontReads);assert.equal(jobs.length,0);assertions++;
      const bridge=cache.get(path.join(root,'mods',name,'file-header.js')).namespace;
      assert.equal(bridge.fullFilePath('C:\\root','dir/test.json'),'C:\\root\\dir\\test.json');
      if(scenario!=='empty') {
        spaces.push({id:'fixture-space',active:false,machine:'remote',tabs:[{id:'fixture-tab',name:'C:/owned-fixture/test.json',active:true}]});
        panes.push({pane:'fixture-pane',tab:'fixture-tab',mod:'custom-files',focused:false,title:'custom-files'});
        viewer.render(viewerCx);while(jobs.length)await jobs.shift()(viewerCx);
        const pm=await load(path.join(root,'mods/custom-pane/main.js'));await pm.evaluate();props={pane:'fixture-pane'};const header=new pm.namespace.default();header.init({},viewerCx);header.hovered=true;const headerView=nodes(header.render(cx));
        assert.equal(headerView.find(n=>n.style?.id?.[0]==='pane-name').kids[0],'C:/owned-fixture/test.json');assert.ok(!headerView.some(n=>n.style?.id?.[0]==='pane-folder'));
        const pathLeaf=headerView.find(n=>n.style?.id?.[0]==='pane-name'),titleSlot=headerView.find(n=>n.style?.id?.[0]==='pane-title-slot');assert.equal(pathLeaf.style.flex_1,undefined,'Path tooltip no longer fills the title bar');assert.equal(pathLeaf.style.tooltip[0],'C:/owned-fixture/test.json');assert.ok(pathLeaf.style.max_w_full);assert.ok(titleSlot.style.flex_1);assert.equal(titleSlot.style.tooltip,undefined);assert.equal(titleSlot.style.pr[0],140,'File path tooltip stops before the five-tool rail');
        const refreshTool=headerView.find(n=>n.style?.id?.[0]==='ph-refresh-fixture-pane');assert.equal(refreshTool.style.size[0],24);assert.equal(refreshTool.kids[0].style.size[0],12,'Pane Reload uses the same compact refresh glyph as the Files header');assert.equal(headerView.find(n=>n.style?.id?.[0]==='ph-x-fixture-pane').kids[0].style.size[0],14,'Other pane glyphs remain unchanged');
        const beforeReload=fileReads.length;bridge.requestFileReload('other-space','C:/owned-fixture/test.json');viewer.render(viewerCx);assert.equal(jobs.length,0,'Another space cannot reload this file');
        headerView.find(n=>n.style?.id?.[0]==='ph-refresh-fixture-pane').events.on_click({},cx);viewer.render(viewerCx);while(jobs.length)await jobs.shift()(viewerCx);assert.equal(fileReads.length,beforeReload+1);assert.equal(fileReads.at(-1)[1].on,'remote','Reload retains the original machine even with another space active');assert.equal(fileReads.at(-1)[0],'C:/owned-fixture/test.json');
        const tab=spaces.at(-1).tabs[0],activeFlags=spaces.map(s=>s.active);tab.name='test.json';viewer.viewerSpace=null;session.delete('custom.file.header:fixture-tab');spaces.forEach(s=>s.active=s.id==='fixture-space');viewer.render(viewerCx);while(jobs.length)await jobs.shift()(viewerCx);assert.equal(bridge.fileHeader(tab.id,null),'C:/owned-fixture/test.json');assert.equal(tab.name,'test.json','Legacy file tabs publish paths without renaming them');spaces.forEach((s,i)=>s.active=activeFlags[i]);spaces.pop();panes.pop();assertions++;
      }
      memory.set('C:/owned-fixture/binary','a\0b');viewer.show('binary',viewerCx);await jobs.shift()(viewerCx);assert.equal(viewer.code,null);assert.match(viewer.fileError,/Binary/);memory.set('C:/owned-fixture/large','x'.repeat(400001));viewer.show('large',viewerCx);await jobs.shift()(viewerCx);assert.ok(viewer.code.value().endsWith('… (file truncated)'));assert.equal(viewer.code.options.readonly,true);props=priorProps;assertions++;
    }
    if(name==='custom-changes') {
      assert.equal(instance.view,'open');
      assert.ok(!byId('git-view-changes')&&!byId('changes-list')&&!byId('commit'),'Git has no Changes tab, diff or commit controls');
      // The Git panel shares the pane header's title-button menu with Files.
      const title=byId('git-title');assert.equal(title.style.accessibility_label[0],'Switch panel');assert.ok(nodes(title).some(n=>n.kids?.includes('Git')));
      const before=overlays.length;title.events.on_click({},cx);assert.equal(overlays.length,before+1);assert.equal(overlays.at(-1).mod,'custom-new-menu');assert.equal(overlays.at(-1).props.panelSwitch,'changes');
      for(const id of ['git-view-open','git-view-closed'])assert.ok(byId(id),`${id} filter exists`);
      instance.root='C:/project';instance.repo={name:'owner/repo',owner:'owner',url:'https://github.com/owner/repo'};instance.pulls.open=[{number:903,title:'fix(ux): align dialogs',url:'https://github.com/owner/repo/pull/903',state:'draft',login:'owner',meta:'#903 · owner opened 25 minutes ago',owner:true,tasks:{done:1,total:3,label:'1 of 3 tasks'},checks:{ok:14,bad:0,pending:0,total:14,label:'14/14',state:'success'},review:null}];instance.pullsAt.open=Date.now();
      byId('git-view-closed').events.on_click({},cx);assert.equal(instance.view,'closed');
      view=instance.render(cx);byId('git-view-open').events.on_click({},cx);view=instance.render(cx);assert.equal(instance.view,'open');
      const row=byId('pr-903');assert.ok(row,'Pull request row renders');assert.ok(nodes(row).some(n=>n.kids?.includes('#903 · owner opened 25 minutes ago')));assert.ok(nodes(row).some(n=>n.kids?.includes('Owner')));assert.ok(nodes(row).some(n=>n.kids?.includes('1 of 3 tasks')));assert.ok(nodes(row).some(n=>n.kids?.includes('14/14')));
      assert.ok(byId('pr-title-903').style.font_semibold,'Title is bold like GitHub');assert.ok(!byId('changes-list'),'Changes view is not drawn while pull requests show');
      const execBefore=executions.length;row.events.on_click({},cx);assert.equal(JSON.stringify(executions.at(-1).slice(0,2)),JSON.stringify(['cmd',['/c','start','','https://github.com/owner/repo/pull/903']]),'Rows open the PR URL in the local browser');assert.equal(executions.at(-1)[2]?.on,undefined,'Never on the remote machine');assert.equal(executions.length,execBefore+1);
      assert.equal(storage.get('custom.git.view'),'open','The chosen view is remembered');
      assert.equal(byId('git-repo'),undefined,'Repository links moved from a header icon to the captured context menu');
      byId('changes-header').events.on_mouse_down({},cx);assert.equal(overlays.at(-1).props.pullMenu.header,true);assert.equal(overlays.at(-1).props.pullMenu.url,'https://github.com/owner/repo/pulls');
      instance.setView('changes',cx);assert.equal(instance.view,'open','Retired views are rejected');view=instance.render(cx);assertions++;
    }
    if(name==='custom-files') {
      const title=byId('files-title');assert.equal(title.style.accessibility_label[0],'Switch panel');assert.ok(nodes(title).some(n=>n.kids?.includes('Files')));
      const before=overlays.length;title.events.on_click({},cx);assert.equal(overlays.at(-1).props.panelSwitch,'files');assert.equal(overlays.length,before+1);assertions++;
    }
    if(name==='custom-menu') {
      assert.equal(view.kids.length,0,'No pane context menu is drawn');assert.ok(!calls.some(c=>c[0]==='terminal.right_click'),'No retry-toasting native command');
      if(scenario!=='empty') {assert.equal(calls.at(-2)[0],'pane.focus');assert.equal(calls.at(-2)[1].pane,'p0');assert.equal(calls.at(-1)[0],'terminal.paste');}
      const originalProps=props,previousCalls=calls.length;props={tab:'pane',target:{pane:'missing',terminal:'t0'},overlay:'stale'};const staleMenu=new mod.namespace.default();staleMenu.init({},cx);assert.equal(calls.length,previousCalls,'Stale right-click targets cannot paste into another terminal');
      if(scenario!=='empty'){props={tab:'pane',target:{pane:'p1',terminal:'t1'},overlay:'clicked'};const otherMenu=new mod.namespace.default();otherMenu.init({},cx);assert.equal(calls.at(-2)[1].pane,'p1');assert.equal(calls.at(-1)[0],'terminal.paste');}props=originalProps;assertions++;
      const savedProps=props;props={tab:'footer',overlay:'test'};view=instance.render(cx);assert.ok(byId('mi-0'));assert.ok(byId('mi-1'));
      instance.choose(0,cx);assert.equal(calls.at(-1)[1].name,'custom-usage');
      assert.ok(nodes(byId('mi-0')).some(n=>n.kids.includes('Usage')));assert.ok(nodes(byId('mi-1')).some(n=>n.kids.includes('Machines')));assert.ok(nodes(byId('mi-2')).some(n=>n.kids.includes('Plugins')));assert.ok(nodes(byId('mi-3')).some(n=>n.kids.includes('Settings')));
      instance.choose(1,cx);assert.equal(overlays.at(-1).mod,'custom-settings');assert.equal(overlays.at(-1).props.section,'machines');
      instance.choose(2,cx);assert.equal(overlays.at(-1).props.section,'plugins');
      instance.choose(3,cx);assert.equal(overlays.at(-1).props.section,'look');assert.equal(view.style.pt[0],5);assert.equal(view.style.pb[0],3);assertions++;
      props={tab:'agent',target:{terminal:'t0'},overlay:'test'};view=instance.render(cx);
      assert.equal(byId('mi-0').style.bg,undefined,'No pre-highlighted context row');assert.equal(byId('mi-0').hoverStyle.style.bg[0],theme.hover);assertions++;
      instance.choose(0,cx);
      assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['terminal.pin',{terminal:'t0',pinned:true}]));assertions++;
      assert.ok(nodes(byId('mi-1')).some(n=>n.kids?.includes('Close')));instance.choose(1,cx);assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(scenario==='empty'?['terminal.kill',{terminal:'t0'}]:['pane.close',{pane:'p0'}]),'Close targets the clicked agent, not the current focus');
      props={tab:'agent',target:{terminal:'t3'},overlay:'test'};instance.choose(0,cx);
      if(scenario!=='empty') assert.equal(calls.at(-1)[1].pinned,false);assertions++;
      if (scenario !== 'empty') {
        spaces.push({id:'pc2/last-space',active:false,tabs:[{id:'pc2/last-tab',active:true}]});
        panes.push({pane:'pc2/last-pane',tab:'pc2/last-tab',terminal:'pc2/last-agent'});
        agents.push({address:'pc2/last-agent'});
        props={tab:'agent',target:{terminal:'pc2/last-agent'},overlay:'sidebar-agent-menu'};
        const before=calls.length, beforeOverlays=overlays.length;
        instance.choose(1,cx);
        assert.equal(calls.length,before+1,'Last sidebar agent closes immediately by default');
        assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['space.close',{id:'pc2/last-space',confirmed:true}]));
        assert.equal(overlays.length,beforeOverlays);
        shared['custom.spaces.preferences']={version:1,confirmLastTab:true,closeOnLastTab:true};
        instance.choose(1,cx);
        delete shared['custom.spaces.preferences'];
        assert.equal(calls.length,before+1,'Opted-in confirmation does not issue a destructive command');
        assert.equal(overlays.at(-1).mod,'custom-confirm');
        assert.equal(overlays.at(-1).props.spaceId,'pc2/last-space');
        assert.equal(overlays.at(-1).props.detail,'1 agent');
        assert.equal(closed.at(-1),'sidebar-agent-menu');
        spaces.pop();panes.pop();agents.pop();assertions++;
        spaces.push({id:'pc2/empty-space',active:false,tabs:[{id:'pc2/empty-start',active:true}]});
        panes.push({pane:'pc2/empty-pane',tab:'pc2/empty-start',mod:'custom-space-start'});
        props={tab:'space',target:{id:'pc2/empty-space'},overlay:'empty-space-menu'};
        const emptyBefore=calls.length,emptyOverlays=overlays.length,savedGit=instance.git;instance.git=null;
        instance.choose(1,cx);instance.git=savedGit;
        assert.equal(calls.length,emptyBefore+1,'Context-menu Close on a Start-only space acts immediately');
        assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['space.close',{id:'pc2/empty-space',confirmed:true}]));
        assert.equal(overlays.length,emptyOverlays,'An empty space opens no confirmation modal');
        spaces.pop();panes.pop();assertions++;
      }
      props=savedProps;
    }
    if(name==='custom-usage') {
      assert.ok(byId('usage-host'));assert.ok(byId('usage-refresh'));assert.equal(byId('usage-options'),undefined,'The dialog has no settings gear');assert.equal(byId('usage-header-tools').style.gap[0],12);assert.equal(byId('usage-header-actions').style.gap[0],4);
      const sample={id:'sample',sourceLabel:'Codex',checkedAt:Date.now(),account:{label:'profile'},report:{status:'available',planLabel:'prolite',windows:[{id:'wk',label:'Weekly',usedPct:18,summary:true,resetsAt:new Date(2030,0,2,13,0,49).toISOString()}]}};
      const claude={id:'claude-sample',sourceLabel:'Claude',checkedAt:Date.now(),report:{status:'available',planLabel:'team',windows:[{id:'session',label:'Session',shortLabel:'5h',usedPct:0},{id:'model:fable',label:'Fable · Weekly',usedPct:35}],details:[{id:'extra',label:'Extra usage',value:'Enabled'},{id:'other',label:'Other',value:'Keep'}]}};
      const copilot={id:'copilot-sample',sourceLabel:'Copilot',checkedAt:Date.now(),account:{label:'fixture@example.test',email:'fixture@example.test',login:'fixture-login'},report:{status:'available',planLabel:'business',windows:[],balances:[{id:'ai_credits_used',label:'AI credits',used:2157}],resetsAt:'2026-12-01',details:[],premiumUsage:{used:130.75,byModel:[{model:'Model A',used:110.75,discounted:95,billed:15.75},{model:'Model B',used:20,discounted:10,billed:10}]}}};
      const saved=shared['custom.usage.local.cache'],savedPinPrefs=shared['custom.usage.local.preferences'],savedRemotePinPrefs=shared['custom.usage.remote:remote.preferences'];
      shared['custom.usage.local.preferences']={...savedPinPrefs,pins:[]};
      shared['custom.usage.local.cache']={version:5,reports:[sample,claude,copilot],at:Date.now()};view=instance.render(cx);
      const copilotCard=byId('usage-report-copilot-sample');assert.equal(copilotCard.kids.at(-1).style.id[0],'usage-account-copilot-sample');assert.ok(copilotCard.kids.at(-1).kids.includes('fixture-login'));assert.ok(!nodes(copilotCard).some(n=>n.kids?.includes('fixture@example.test')));assert.ok(byId('usage-report-reset-copilot-sample'));assert.ok(nodes(copilotCard).some(n=>n.kids?.includes('Tue, Dec 1')));assert.ok(!nodes(copilotCard).some(n=>n.kids?.some(k=>typeof k==='string'&&/No finite|Quota reset:/.test(k))));assert.ok(nodes(copilotCard).some(n=>n.kids?.includes('2157 used')));
      for(const id of ['sample','claude-sample','copilot-sample']){assert.equal(byId(`usage-report-header-${id}`).style.mr,undefined,'The header is not nudged: refresh ends at the content edge, over the pins and the Resets chevron');assert.equal(byId(`usage-refresh-${id}`).style.size[0],28,'Provider tools keep their full hitbox');}
      assert.ok(byId('usage-premium-copilot-sample'));assert.ok(nodes(byId('usage-premium-copilot-sample')).some(n=>n.kids?.includes('130.75 used')));assert.ok(nodes(byId('usage-premium-copilot-sample')).some(n=>n.kids?.includes('Model A')));
      const extra=byId('usage-extra-claude-sample'),plan=byId('usage-plan-claude-sample');assert.ok(extra.kids.includes('Extra usage'));assert.ok(plan.kids.includes('Team'));assert.ok(byId('usage-plan-sample').kids.includes('Prolite'));assert.equal(extra.style.bg[0],plan.style.bg[0]);assert.equal(extra.style.rounded[0],4);
      assert.ok(nodes(byId('usage-report-claude-sample').kids[0]).includes(extra),'Extra usage sits beside the plan in the header');assert.ok(!nodes(byId('usage-report-claude-sample')).some(n=>n.kids?.includes('Extra usage: Enabled')));assert.ok(nodes(byId('usage-report-claude-sample')).some(n=>n.kids?.includes('Other: Keep')));
      claude.report.details[0].value='Disabled';view=instance.render(cx);assert.equal(byId('usage-extra-claude-sample'),undefined,'Disabled extra usage has no badge');assert.ok(!nodes(byId('usage-report-claude-sample')).some(n=>n.kids?.includes('Extra usage: Disabled')));claude.report.details[0].value='Enabled';view=instance.render(cx);
      const sessionKey=JSON.stringify(['claude-sample','session']),modelKey=JSON.stringify(['claude-sample','model:fable']),codexKey=JSON.stringify(['sample','wk']),modalProps=props;
      const sessionPin=byId(`usage-pin-${sessionKey}`);assert.equal(sessionPin.kind,'toggle');assert.equal(sessionPin.style.pressed[0],false);assert.equal(sessionPin.style.bg[0],'#00000000');sessionPin.events.on_change(true,cx);view=instance.render(cx);
      const pressedPin=byId(`usage-pin-${sessionKey}`);assert.equal(pressedPin.style.pressed[0],true);assert.notEqual(pressedPin.style.bg[0],'#00000000');assert.notEqual(pressedPin.style.border_color[0],'#00000000');assert.notEqual(pressedPin.hoverStyle.style.bg[0],pressedPin.style.bg[0],'Hover preserves a distinct pressed state');
      props={summary:true};view=instance.render(cx);assert.equal(byId('usage-summary-open').style.accessibility_label[0],'Claude · Session · 100% left');assert.ok(nodes(view).some(n=>n.style?.asset?.[0]?.endsWith('/claude.svg')));if(scenario!=='rail')assert.ok(nodes(view).some(n=>n.kids?.includes('100%')));
      props=modalProps;view=instance.render(cx);byId(`usage-pin-${codexKey}`).events.on_change(true,cx);view=instance.render(cx);assert.equal(byId(`usage-pin-${sessionKey}`).style.pressed[0],true);assert.equal(JSON.stringify(shared['custom.usage.local.preferences'].pins),JSON.stringify([sessionKey,codexKey]));
      byId(`usage-pin-${modelKey}`).events.on_change(true,cx);props={summary:true};view=instance.render(cx);assert.ok(byId('usage-summary-open').style.accessibility_label[0].includes('Claude · Fable · Weekly'));
      if(scenario!=='rail'){assert.ok(byId('usage-summary-groups').style.overflow_x_scroll);assert.ok(byId(`usage-summary-value-${sessionKey}`).kids.includes('100%'));assert.ok(byId(`usage-summary-value-${codexKey}`).kids.includes('82%'));assert.ok(byId(`usage-summary-value-${modelKey}`).kids.includes('65%'));for(const key of [sessionKey,codexKey,modelKey])assert.equal(nodes(byId(`usage-summary-item-${key}`)).filter(n=>n.kind==='svg').length,1,'Every pinned quota owns its provider icon');assert.equal(nodes(byId('usage-summary-groups')).filter(n=>n.style?.asset?.[0]?.endsWith('/claude.svg')).length,2,'Repeat the Claude icon for both pinned Claude quotas');}
      props=modalProps;view=instance.render(cx);byId(`usage-pin-${modelKey}`).events.on_change(false,cx);view=instance.render(cx);assert.equal(byId(`usage-pin-${sessionKey}`).style.pressed[0],true,'Removing one pin keeps the other pressed states');byId(`usage-pin-${sessionKey}`).events.on_change(false,cx);view=instance.render(cx);byId(`usage-pin-${codexKey}`).events.on_change(false,cx);props={summary:true};view=instance.render(cx);assert.equal(byId('usage-summary-open'),undefined,'No pin means no sidebar hover/click target, including the collapsed rail');assert.equal(view.kids.length,0,'No empty-state placeholder is rendered');
      assert.equal(shared['custom.usage.remote:remote.preferences'],savedRemotePinPrefs,'Local pin changes never affect remote selections');props=modalProps;view=instance.render(cx);
      assert.ok(byId('usage-report-sample'));assert.ok(nodes(view).some(n=>n.kids?.includes('82% left')));
      const resetRow=byId(`usage-reset-${codexKey}`);assert.equal(resetRow.style.gap[0],8);assert.equal(resetRow.style.line_height[0],'18px');assert.ok(resetRow.style.flex_wrap);assert.ok(nodes(resetRow).some(n=>n.kids?.includes('Wed at 1:00PM')));assert.ok(!nodes(resetRow).some(n=>n.kids?.some(k=>typeof k==='string'&&/1:00:49/.test(k))));
      assert.equal(byId('usage-scroll').kids.at(-1),byId('usage-bottom-inset'),'The final card is followed by a real scrollable inset');assert.equal(byId('usage-bottom-inset').style.h[0],8);assert.ok(byId('usage-bottom-inset').style.flex_none);assert.equal(byId('usage-body').style.py[0],8);assert.equal(byId('usage-body').style.pb[0],0,'Replace bottom padding, rather than doubling it');assert.equal(byId('usage-scroll').style.gap[0],0);assert.ok(byId('usage-scroll-frame').style.absolute);assert.ok(byId('usage-scroll-frame').style.inset_0);assert.ok(byId('usage-scroll').style.overflow_y_scroll);
      const bodyIds=byId('usage-body').kids.map(n=>n.style?.id?.[0]);
      assert.equal(byId('usage-checking').style.opacity[0],0);
      const usageHover=byId('usage-refresh').hoverStyle.style.bg[0];
      shared['custom.usage.local.cache'].loading=true;shared['custom.usage.local.cache'].started=Date.now();view=instance.render(cx);
      assert.equal(byId('usage-checking').style.opacity[0],1);assert.equal(byId('usage-checking').style.w[0],120);
      assert.ok(nodes(byId('dialog-title')).includes(byId('usage-checking')),'Loading status stays beside the title');
      assert.equal(JSON.stringify(byId('usage-body').kids.map(n=>n.style?.id?.[0])),JSON.stringify(bodyIds),'Refresh adds no rows above quota cards');
      assert.equal(byId('dialog-header').style.gap[0],byId('usage-header-actions').style.gap[0],'Refresh and close share an even gap');
      assert.equal(byId('usage-refresh').style.disabled[0],true);assert.equal(byId('usage-refresh').style.opacity[0],0.4);assert.equal(Object.hasOwn(byId('usage-refresh'),'hoverStyle'),false);assert.equal(byId('usage-refresh').kids[0].style.spin[0],900);assert.equal(byId('usage-header-progress'),undefined);
      shared['custom.usage.local.cache'].loading=false;view=instance.render(cx);assert.equal(byId('usage-header-progress-line'),undefined);
      shared['custom.usage.local.preferences']={...shared['custom.usage.local.preferences'],pins:[codexKey]};
      props={summary:true};view=instance.render(cx);assert.ok(byId('usage-summary-open'));
      if(scenario!=='rail'){assert.equal(view.style.px[0],8,'Quota hover has the same symmetric outer inset as sidebar list items');assert.equal(byId('usage-summary-open').style.pl[0],6,'Provider slot center aligns with the footer Usage control');assert.equal(byId('usage-summary-open').style.pr[0],8);}
      const summaryTrigger=byId('usage-summary-open');assert.ok(summaryTrigger.style.cursor_pointer);assert.equal((summaryTrigger.style.h??summaryTrigger.style.size)[0],28);assert.equal(summaryTrigger.style.rounded[0],6);assert.equal(summaryTrigger.hoverStyle.style.bg[0],usageHover);assert.equal(summaryTrigger.hoverStyle.style.text_color,undefined,'Quota summary matches command-hint background-only hover');
      const oldPrefs=shared['custom.usage.local.preferences'];shared['custom.usage.local.preferences']={...oldPrefs,summary:false};view=instance.render(cx);assert.equal(byId('usage-summary-open'),undefined,'Turning off the sidebar summary leaves no blank widget content');shared['custom.usage.local.preferences']=oldPrefs;props={pane:'p0',target:{pane:'p0',terminal:'t0',id:'sp1'},tab:'pane',overlay:'test'};
      shared['custom.usage.local.cache']=saved;shared['custom.usage.local.preferences']=savedPinPrefs;
    }
    if(name==='custom-new-menu') {
      for(const profile of [{key:'claude',name:'Claude Code',run:['claude']},{key:'codex',name:'Work Codex',run:['codex','--safe']},{key:'custom',name:'Custom agent',run:['my-agent']},{key:'terminal',name:'My Bash',run:['bash','--login']}]){
        const before=calls.length;instance.launch({...profile,available:true});
        if(profile.key==='terminal'){
          const call=calls.at(-1);assert.equal(call[0],'tab.new');assert.equal(Object.hasOwn(call[1],'name'),false,'Terminal tabs keep native automatic numbering');assert.deepEqual([...call[1].argv],profile.run);
        }else{
          assert.equal(calls.length,before,'A closing popup never owns profile startup');
          const job=shared['custom.profile-launches'].at(-1);assert.equal(job.profile,profile.key);assert.deepEqual([...job.argv],profile.run);assert.deepEqual([...job.shell],[],'Default shell is selected by the target core');assert.equal(job.phase,'queued');assert.equal(job.machine,null);assert.equal(job.space,spaces.find(s=>s.active)?.id??null);
        }
        assertions++;
      }
      instance.launch({key:'custom-a1',name:'A1',available:true,command:'a1',configuredArgs:['--literal','two words'],run:['C:/npm/a1.cmd','--literal','two words']});
      assert.deepEqual([...shared['custom.profile-launches'].at(-1).argv],['a1','--literal','two words'],'The default shell resolves the configured command, not an automatically selected CMD shim');
      const label=byId('new-menu-agent-heading');assert.equal(label.style.text_size[0],11);assert.equal(label.style.text_color[0],theme.dim);assert.equal(label.style.font_semibold,undefined);
      if(scenario==='priority') {
        const jobs=[];const asyncCx={...cx,spawn:fn=>{const p=Promise.resolve().then(()=>fn(asyncCx));jobs.push(p);return p;}};
        memory.set(appPath+'/mods/custom-new-menu/discovery.cjs','public executable probe fixture');
        execReply={code:0,stdout:JSON.stringify({entries:{claude:{found:true,run:['C:/Users/test/.local/bin/claude.exe']}}})};
        const repaired=new mod.namespace.default();repaired.init({},asyncCx);await Promise.all(jobs);
        const claude=repaired.items.find(p=>p.key==='claude'),custom=repaired.items.find(p=>p.key==='custom');assert.equal(claude.available,true);assert.equal(claude.run[0],'C:/Users/test/.local/bin/claude.exe');assert.equal(claude.run[1],'--preserved-flag');assert.notEqual(custom.available,true,'An unchecked custom command is never invented');assert.equal(custom.run[0],'C:/custom/claude.exe');execReply=null;
      }
    }
    if(name==='custom-tabs' && scenario==='empty') {
      const count=calls.length;byId('panel-files').events.on_change(true,cx);assert.equal(calls.length,count,'No active tab: sidebar toggle cannot act on another context');assertions++;
    }
    if(name==='custom-tabs' && scenario!=='empty') {
      const configured=shared['workspace.panels'],panel=layoutNode(tree,'panel'),hidden=panel.hidden;
      shared['workspace.panels']=[];view=instance.render(cx);assert.ok(byId('panel-files'),'Custom explorer remains available when stock panels are disabled');assert.equal(byId('panel-changes'),undefined);assert.deepEqual(shared['workspace.panels'],[],'Stock panel preferences remain untouched');
      panel.hidden=true;view=instance.render(cx);assert.equal(byId('panel-files').kind,'toggle');assert.equal(byId('panel-files').style.size[0],28);assert.equal(byId('panel-files').style.pressed[0],false);assert.equal(byId('panel-files').style.bg,undefined,'Same hover-only styling as the left toggle');assert.ok(!nodes(byId('panel-files')).some(n=>n.kids?.includes('Files')));assert.ok(nodes(byId('panel-files')).some(n=>n.style?.asset?.[0]?.endsWith('/sidebar-right.svg')&&n.style.size[0]===16));byId('panel-files').events.on_change(true,cx);assert.equal(JSON.stringify(calls.at(-2)),JSON.stringify(['layout.select',{stack:'panel-body',child:'files'}]));assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['layout.show',{id:'panel'}]));
      let titlebarStops=0;const beforePress=calls.length;byId('panel-files').buttonEvents.on_mouse_down.left({click_count:2},{stop_propagation:()=>titlebarStops++});assert.equal(titlebarStops,1,'Sidebar presses cannot bubble to the title-bar drag/restore handler');assert.equal(calls.length,beforePress,'The press itself performs no window or layout command');assertions++;
      panel.hidden=false;view=instance.render(cx);assert.equal(byId('panel-files').style.pressed[0],true);byId('panel-files').events.on_change(false,cx);assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['layout.hide',{id:'panel'}]));
      const panelBody=layoutNode(tree,'panel-body'),priorView=panelBody.active;shared['workspace.panels']=['changes'];panelBody.active='changes';cache.get(path.join(root,'mods',name,'panel-state.js')).namespace.changePanel({view:'changes'});view=instance.render(cx);byId('panel-files').events.on_change(false,cx);assert.equal(calls.at(-1)[0],'layout.hide','The right toggle closes Changes too, not just Files');panel.hidden=true;view=instance.render(cx);byId('panel-files').events.on_change(true,cx);assert.equal(JSON.stringify(calls.at(-2)),JSON.stringify(['layout.select',{stack:'panel-body',child:'changes'}]),'Reopening retains the active right-panel view');panelBody.active=priorView;
      const beforeSwitch=calls.length;const activeSpace=spaces.find(s=>s.active);if(activeSpace)activeSpace.active=false;spaces.push({id:'agent-switch',name:'Other agent',active:true,tabs:[]});panel.hidden=false;view=instance.render(cx);assert.equal(byId('panel-files').style.pressed[0],true);assert.equal(calls.length,beforeSwitch,'Agent/space switching never changes the panel choice');panel.hidden=true;view=instance.render(cx);assert.equal(byId('panel-files').style.pressed[0],false);assert.equal(calls.length,beforeSwitch,'Closed also persists across agents');spaces.pop();if(activeSpace)activeSpace.active=true;
      panel.hidden=hidden;shared['workspace.panels']=configured;view=instance.render(cx);
      const helper=cache.get(path.join(root,'mods',name,'ui.js')).namespace;
      const renderer=cache.get(path.join(root,'mods',name,'program-icon.js')).namespace;const glyphSlot=renderer.programIcon({icon:'icons/agent.svg',tint:true},theme.foreground);assert.equal(glyphSlot.style.size[0],16);assert.equal(glyphSlot.style.text_size[0],13,'Glyphs keep identical text metrics in tab and metadata-sized pane headers');assert.ok(glyphSlot.style.items_center);assert.ok(glyphSlot.style.justify_center);
      const indicator=helper.spinner(theme.working);assert.equal(indicator.kind,'div');assert.equal(indicator.style.size[0],7);assert.equal(indicator.style.bg[0],theme.working);
      assert.equal(indicator.style.spin,undefined);assert.equal(indicator.style.loop[0],'opacity');assert.equal(indicator.style.loop[1].period,1100);assertions++;
      const strip=byId('tab-scroll'), plus=byId('tab-new');
      assert.equal(strip.kids.at(-1),plus,'Plus follows the last tab within the scrolling strip');
      assert.ok(!view.kids.includes(plus),'Plus is not in the right-side window controls');
      assert.equal(plus.style.size[0],28);assert.equal(plus.style.rounded[0],6);
      assert.equal(plus.hoverStyle.style.bg[0],theme.hover,'Plus shares the softer sort-icon hover');assert.equal(plus.hoverStyle.style.text_color[0],theme.foreground);assertions++;
      plus.events.on_click();assert.equal(overlays.at(-1).mod,'custom-new-menu');assertions++;
      if(scenario!=='empty') {
        for(const tab of [tabs[0],tabs[1]]) {const program=panes.find(p=>p.tab===tab.id)?.program;if(program?.icon){const glyph=nodes(byId(`tab-${tab.id}`)).find(n=>n.style?.asset?.[0]===program.icon);assert.equal(glyph.style.size[0],16,'Agent tab glyph matches sidebar and file-tab glyph size');if(program.tint)assert.equal(glyph.style.text_color[0],theme.foreground,'Monochrome tab glyph stays white in either selection state');else assert.equal(glyph.style.text_color,undefined);}}
        const inactive=byId('tab-tb1');const fill=mod.namespace.inactiveTabFill(theme);
        assert.equal(inactive.style.bg[0],fill);assert.notEqual(fill,theme.chrome);assert.notEqual(fill,theme.selected);
        assert.equal(inactive.style.border_color[0],fill);assert.equal(inactive.style.h[0],28);
        assert.equal(inactive.hoverStyle.style.bg[0],theme.hover);
        for(const i of [1,3,5]) assert.ok(Math.abs(parseInt(fill.slice(i,i+2),16)-parseInt(theme.chrome.slice(i,i+2),16))<=7,'Inactive fill stays very subtle');
        const beforeDrag=calls.length;
        byId('tab-tb0').buttonEvents.on_mouse_down.left({position:{x:0,y:0},click_count:1},cx);
        byId('tab-tb1').events.on_mouse_move({position:{x:150,y:0},local_position:{x:80,y:10},bounds:{width:100,height:28}},cx);
        view.events.on_mouse_move({local_position:{x:150,y:15}},cx);view=instance.render(cx);
        assert.equal(byId('tab-tb0').style.opacity[0],0.45);assert.ok(byId('tab-drop-indicator'));assert.ok(byId('tab-drag-preview'));
        byId('tab-tb1').events.on_mouse_up({},cx);assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['tab.move',{id:'tb0',index:2}]));assert.equal(instance.drag.active,false);assertions++;
        view=instance.render(cx);byId('tab-tb0').buttonEvents.on_mouse_down.left({position:{x:0,y:0},click_count:1},cx);
        byId('tab-tb1').events.on_mouse_move({position:{x:150,y:0},local_position:{x:80,y:10},bounds:{width:100,height:28}},cx);
        view.events.on_hover(false,cx);assert.equal(instance.drag.current,null);assert.equal(calls.length,beforeDrag+1,'Leaving the strip cancels without moving a tab');
        for(const [from,slot,want] of [[0,4,4],[3,0,1],[1,3,3],[1,1,null],[1,2,null]]) assert.equal(mod.namespace.moveIndex(from,slot,4),want);assertions++;
        view=instance.render(cx);
        const close=byId('close-tb0');assert.equal(close.style.size[0],24);assert.equal(close.style.rounded[0],4);
        assert.equal(byId('tab-tb0').style.h[0],plus.style.size[0]);
        assert.equal(close.hoverStyle.style.bg[0],`${theme.foreground}0a`,'Inset close uses the same faint tint as split tools');assert.notDeepEqual(close.hoverStyle.style.bg,plus.hoverStyle.style.bg,'Standalone plus keeps its normal hover');assert.equal(close.hoverStyle.style.text_color[0],theme.foreground);
        assert.equal(plus.kids[0].style.size[0],close.kids[0].style.size[0]);assertions++;
        selectedRow(byId('tab-tb0'));
        const originalName=tabs[0].name,originalPane={...panes[0]};tabs[0].name='C:/project/sub/test.json';panes[0]={pane:'p0',tab:'tb0',mod:'custom-files'};instance.drag.begin('tb0',{position:{x:0,y:0}},cx,{meta:{space:'sp1'}});instance.drag.over({position:{x:10,y:0}},0,cx);view=instance.render(cx);assert.ok(nodes(byId('tab-drag-preview')).some(n=>n.kind==='image'&&n.style?.asset?.[0]==='mods/custom-files/icons/json.svg'));assert.ok(nodes(byId('tab-tb0')).some(n=>n.kids?.includes('test.json')));assert.ok(!nodes(byId('tab-tb0')).some(n=>n.kids?.includes(tabs[0].name)));instance.cancelDrag(cx);tabs[0].name=originalName;panes[0]=originalPane;view=instance.render(cx);assertions++;
        close.events.on_hover(true,cx);view=instance.render(cx);assert.equal(byId('tab-tb0').hoverStyle.style.bg[0],theme.selected,'Close hover does not hover the whole tab');
        byId('close-tb0').events.on_hover(false,cx);view=instance.render(cx);assertions++;
      }
    }
    if(name==='custom-picker') {
      for(const action of nodes(view).filter(n=>n.style?.id?.[0]==='pk-new'||n.style?.id?.[0]?.startsWith('pk-space-')))assert.ok(action.kids.some(k=>typeof k==='string'&&k.startsWith('New ')),'Jump creation commands start with a capital');
      assert.equal(byId('dialog-title').kids[0],'Jump');assert.equal(instance.input.options.placeholder,'Search for a tab, space or agent…');
      assert.equal(view.style.rounded[0],8);assert.ok(view.style.shadow_lg);
      assert.equal(view.style.border_color[0],theme.border);assert.equal(view.style.bg[0],theme.background);assertions++;
      const search=byId('picker-search');assert.equal(search.style.border_color[0],theme.input);assert.notEqual(search.style.border_color[0],theme.accent);assertions++;
      const searchUi=cache.get(path.join(root,'mods',name,'ui.js')).namespace,searchState=input({value:'query'});let cleared=0,focused=0,stopped=0;searchState.focus=()=>focused++;const clearField=searchUi.searchField(theme,searchState,{id:'clear-fixture',onClear:()=>cleared++}),clearButton=nodes(clearField).find(n=>n.style?.id?.[0]==='clear-fixture-clear');assert.equal(clearButton.style.size[0],24);assert.equal(clearField.style.pr[0],4);assert.equal(nodes(clearField).find(n=>n.kind==='input').events.on_mouse_down,undefined);clearButton.buttonEvents.on_mouse_down.left({},{stop_propagation:()=>stopped++});clearButton.events.on_click({},{...cx,stop_propagation:()=>stopped++});assert.equal(searchState.value(),'');assert.equal(cleared,1);assert.equal(focused,1);assert.equal(stopped,2);assertions++;
      const empty=searchUi.emptyState(theme,{id:'empty-fixture'});assert.ok(empty.style.justify_center);assert.ok(empty.style.items_center);assert.ok(empty.style.text_center);assert.deepEqual(nodes(empty).flatMap(n=>(n.kids??[]).filter(k=>typeof k==='string')),['No results'],'Empty states contain only the No results title, never a description');assert.equal(empty.kids.length,2,'Keep the magnifier and title only');assertions++;
      selectedRow(byId(scenario==='empty'?'pk-new':'pk-tb0'));
      instance.inputFocused=false;const blurred=instance.render(cx);
      assert.equal(nodes(blurred).find(n=>n.style?.id?.[0]==='picker-search').style.border_color[0],theme.border);assertions++;
      const presentation=json(path.join(root,'mods',name,'mod.json')).overlay;
      assert.equal(presentation.kind,'dialog');assert.equal(presentation.frame,'none');assert.equal(byId('pk-list').style.h[0],328,'Jump reserves its viewport plus scrollbar inset before asynchronous hosts arrive');assert.equal(presentation.height,443,'Host geometry is known before the first paint, including symmetric vertical scrollbar insets');assertions++;
      const originalRows=instance.rows;
      assert.equal(byId('pk-earlier-divider'),undefined,'Quiet spaces have no upper divider');const quietToggle=byId('pk-earlier');if(quietToggle){assert.equal(quietToggle.style.border_t,undefined);assert.match(quietToggle.kids.join(''),/^\d+ quiet spaces? [▴▾]$/,'Quiet-space count has no earlier prefix');}const beforeDividerGo=closed.length,beforeDividerCommands=calls.length;instance.go({kind:'divider'});assert.equal(closed.length,beforeDividerGo);assert.equal(calls.length,beforeDividerCommands,'Divider cannot close or dispatch');const commandsDivider=byId('pk-commands-divider');if(scenario==='empty')assert.equal(commandsDivider,undefined,'No separator when there are only creation commands');else{assert.equal(commandsDivider.style.h[0],25);assert.equal(commandsDivider.kids[0].style.h[0],1);assert.equal(commandsDivider.kids[0].style.bg[0],theme.border);assert.equal(commandsDivider.events.on_click,undefined);const rows=instance.rows(),beforeCommands=rows.findIndex(r=>r.kind==='new');assert.equal(rows[beforeCommands-1].kind,'divider');}
      instance.input.set_value('zzzz-no-match');instance.input.events.change({},cx);view=instance.render(cx);assert.ok(byId('picker-empty'));assert.equal(byId('pk-new'),undefined,'Creation actions are not fake search matches');assert.equal(byId('pk-commands-divider'),undefined,'No command separator in filtered results');view.events.on_key_down({key:'down'},cx);assert.ok(Number.isFinite(instance.at));assert.ok(byId('picker-search-clear'));let clearStops=0;byId('picker-search-clear').events.on_click({},{...cx,stop_propagation:()=>clearStops++});assert.equal(clearStops,1);assert.equal(instance.input.value(),'');assert.equal(instance.filter,'');view=instance.render(cx);assert.ok(byId('pk-new'));assert.equal(byId('picker-search-clear'),undefined);assertions++;
      const sidebarAgentsModule=await load(path.join(root,'mods/custom-agents/main.js'));await sidebarAgentsModule.evaluate();const sidebarAgents=new sidebarAgentsModule.namespace.default();
      for(const status of ['working','blocked','done','idle',null,'unknown']) {
        const bulb=instance.glyph(theme,status).kids[0];assert.equal(bulb.style.size[0],7);assert.ok(bulb.style.rounded_full);assert.equal(bulb.kids.length,0,'Never use dot, filled-circle or outline text glyphs');assert.equal(bulb.style.bg[0],status==='done'?theme.done:status==='idle'?theme.dim:(theme[status]??theme.dim));
        if(['working','idle','done'].includes(status)){const sidebarBulb=sidebarAgents.status(theme,{status});for(const key of ['size','bg','rounded_full','loop'])assert.equal(JSON.stringify(bulb.style[key]),JSON.stringify(sidebarBulb.style[key]),'Jump and sidebar use identical bulb geometry, color and motion');}
        assert.equal(Boolean(bulb.style.loop),status==='working');assertions++;
      }
      const sidebarSpacesModule=await load(path.join(root,'mods/custom-spaces/main.js'));await sidebarSpacesModule.evaluate();const sidebarSpaces=new sidebarSpacesModule.namespace.default();sidebarSpaces.pressed=null;
      const openingColors=instance.colors,savedColors=shared['space.colors'];
      for(const [name,color,expected] of [['~',undefined,'#22a99a'],['Project','ansi3','#e3814f'],['~','#12ab34','#12ab34']]) {
        const w={id:'badge-test',name,active:true};instance.colors=color?{[w.id]:color}:{};shared['space.colors']=instance.colors;instance.rows=()=>[{kind:'head',w}];view=instance.render(cx);
        const pickerBadge=byId('pk-head-badge-test').kids[0],sidebarBadge=nodes(sidebarSpaces.row({w,i:0,g:null,tree:null},theme)).find(n=>n.style?.size?.[0]===16);
        assert.equal(pickerBadge.style.bg[0],expected);assert.equal(JSON.stringify(pickerBadge.style),JSON.stringify(sidebarBadge.style),'Jump uses the sidebar badge component, including ~ and custom colors');assertions++;
      }
      for(const active of [true,false]){const w={id:'title-style',name:'Space title',active};instance.rows=()=>[{kind:'head',w}];view=instance.render(cx);const pickerHead=byId('pk-head-title-style'),pickerTitle=pickerHead.kids[1],sidebarTitle=nodes(sidebarSpaces.row({w,i:0,g:null,tree:null},theme)).find(n=>n.kids?.includes(w.name));for(const key of ['text_size','font_normal','text_color'])assert.equal(JSON.stringify(pickerTitle.style[key]),JSON.stringify(sidebarTitle.style[key]),'Space title typography and active/inactive color match the sidebar');assert.equal(pickerTitle.style.text_size[0],13);assert.ok(pickerTitle.style.font_normal);assert.equal(pickerHead.style.font_semibold,undefined);assert.equal(pickerTitle.style.text_color[0],active?theme.foreground:theme.muted);}
      instance.colors=openingColors;shared['space.colors']=savedColors;
      for(const status of ['done','idle',null]) {
        const w={id:'state-test',name:'State',active:true};instance.rows=()=>[{kind:'ctx',w,ctx:{id:'state-tab',name:'Tab',active:true,status},mine:[{status:'idle',program:{name:'Agent'}}],team:0}];view=instance.render(cx);
        const row=byId('pk-state-tab');assert.ok(!nodes(row).some(n=>n.kids?.includes('finished')),'Green already communicates finished; no redundant label');assert.ok(nodes(row).some(n=>n.style?.size?.[0]===7&&n.style.bg?.[0]===(status==='done'?theme.done:theme.dim)),'Idle/fallback is neutral gray-white; only Done stays green');assertions++;
      }
      const originalPanes=instance.world.panes,fileSpace={id:'file-space',name:'Files',active:true};
      for(const [name,icon] of [['C:/project/file.json','json'],['ntuser.ini','settings'],['README','_default']]) {
        instance.world.panes=[...originalPanes,{pane:'file-pane',tab:'file-tab',mod:'custom-files'}];
        const fileRow={kind:'ctx',w:fileSpace,ctx:{id:'file-tab',name,status:null},mine:[],team:0};instance.rows=()=>[fileRow];view=instance.render(cx);
        const row=byId('pk-file-tab'),picture=row.kids[0].kids[0];assert.equal(picture.kind,'image');assert.equal(picture.style.asset[0],`mods/custom-files/icons/${icon}.svg`);assert.equal(picture.style.size[0],16);assert.ok(!nodes(row).some(n=>n.style?.size?.[0]===7),'File rows have an icon, never a gray status bulb');
        fileRow.mine=[{status:'idle',program:{name:'Agent'}}];view=instance.render(cx);assert.equal(byId('pk-file-tab').kids[0].kids[0].style.bg[0],theme.dim,'A mixed file/agent tab keeps its agent indicator');assertions++;
      }
      instance.world.panes=originalPanes;instance.rows=()=>[{kind:'ctx',w:fileSpace,ctx:{id:'agent-file-name',name:'agent.json',status:'idle'},mine:[{status:'idle',program:{name:'Agent'}}],team:0}];view=instance.render(cx);assert.equal(byId('pk-agent-file-name').kids[0].kids[0].style.bg[0],theme.dim,'A file-like agent tab name is not classified as a file pane');assertions++;
      if(scenario!=='empty') {
        spaces[0].tabs.push({id:'snapshot-file',name:'C:/project/file-fixture.json',active:false,status:null});panes.push({pane:'snapshot-file-pane',tab:'snapshot-file',mod:'custom-files'});
        const frozen=new mod.namespace.default();frozen.init({},cx);frozen.filter='file-fixture';spaces[0].tabs.pop();panes.pop();
        const snapshotRow=nodes(frozen.render(cx)).find(n=>n.style?.id?.[0]==='pk-snapshot-file');assert.equal(snapshotRow.kids[0].kids[0].kind,'image');assert.equal(snapshotRow.kids[0].kids[0].style.asset[0],'mods/custom-files/icons/json.svg','File pane identity stays in the synchronous snapshot even after live panes change');assertions++;
      }
      instance.rows=originalRows;view=instance.render(cx);
      const openingRows=JSON.stringify(instance.rows()),initialStatus=spaces[0]?.status;
      if(spaces.length)spaces[0].status='idle';
      spaces.push({id:'late-space',name:'Late',active:false,status:'working',tabs:[{id:'late-tab',name:'Late tab'}]});
      assert.equal(JSON.stringify(instance.rows()),openingRows,'Late spaces/status changes cannot reveal rows in an already-open Jump');spaces.pop();
      if(spaces.length){if(initialStatus===undefined)delete spaces[0].status;else spaces[0].status=initialStatus;}
      const pickerSource=fs.readFileSync(path.join(root,'mods/custom-picker/main.js'),'utf8');assert.ok(!pickerSource.includes('timer.after(600'),'Jump has no delayed focus/reveal retry');assert.ok(!pickerSource.includes('await hc('),'Jump performs no deferred host lookup');
      const w={id:'fit',name:'Fit',active:true};
      const ctx=i=>({kind:'ctx',w,ctx:{id:`fit-${i}`,name:`Tab ${i}`,active:i===0,status:'idle'},mine:[],team:0});
      const fitting=[{kind:'head',w},ctx(0),{kind:'divider'},{kind:'new'},{kind:'space',machine:null}];
      instance.rows=()=>fitting;
      for(const zoom of [1,1.3,1.75]) {
        testZoom=zoom;instance.listHeight=undefined;instance.visibleRange=null;instance.at=null;view=instance.render(cx);
        byId('pk-list').events.on_size_change({height:153,width:640},cx);assert.equal(instance.listHeight,153,'Native sizes are already logical pixels');
        view=instance.render(cx);const selected=instance.at;
        for(const delta of [-120,-4,4,120]) {byId('pk-list').events.on_scroll_wheel({delta:{y:delta}},cx);view=instance.render(cx);assert.equal(byId('pk-native-rows'),undefined,'A fitting list does not acquire native scrolling');assert.equal(instance.at,selected);}
        assert.ok(!byId('pk-fit-0').style.absolute,'A fitting list never changes positioning mode');
        instance.listHeight=undefined;byId('pk-list').events.on_size_change({height:152.75,width:640},cx);view=instance.render(cx);
        assert.equal(byId('pk-native-rows'),undefined);assert.ok(!byId('pk-fit-0').style.absolute,'Fractional rounding cannot create scrolling');assertions++;
      }
      testZoom=1;instance.rows=()=>[{kind:'head',w},...Array.from({length:20},(_,i)=>ctx(i)),{kind:'new'}];instance.listHeight=320;instance.at=0;view=instance.render(cx);
      const nativeList=byId('pk-native-rows'),bar=nodes(view).find(n=>n.kind==='scrollbar');assert.ok(nativeList,'Overflow uses the retained native list');assert.equal(bar.style.target[0],'pk-native-rows');assert.equal(bar.style.mode[0],'scrolling');assert.equal(nativeList.style.track_scroll[0],instance.listScroll);assert.equal(byId('pk-fit-0').events.on_click,undefined,'Deferred rows do not register event handlers');
      const selectedBeforeWheel=instance.at;byId('pk-list').events.on_scroll_wheel({delta:{y:-40}},cx);view=instance.render(cx);assert.equal(instance.at,selectedBeforeWheel,'Native wheel scrolling does not jump the selection');
      instance.visibleRange={start:0,end:3};view.events.on_key_down({key:'down'},cx);assert.ok(instance.listScroll.calls.at(-1)[0]>=2,'Arrow navigation reveals selection through the native handle');
      let clicked=null;const originalGo=instance.go;instance.go=r=>{clicked=r;};byId('pk-native-rows').events.on_item_click('ctx:fit-7',cx);assert.equal(clicked.ctx.id,'fit-7','Native row keys route to their exact tab');instance.go=originalGo;
      instance.rows=originalRows;instance.listHeight=undefined;instance.visibleRange=null;instance.at=null;view=instance.render(cx);
    }
    if(scenario==='rail') {
      const byId=id=>nodes(view).find(n=>n.style?.id?.[0]===id);
      if(name==='custom-spaces') {
        const bubble=byId('space-badge-sp1');assert.equal(bubble.style.size[0],16);assert.equal(bubble.style.rounded[0],4);
        assert.equal(byId('space-status-sp1'),undefined,'Spaces have no status bulbs in either mode');assertions++;
        const header=byId('spaces-header');assert.equal(header.style.pl[0],0);assert.equal(header.style.pr[0],0);assert.ok(header.style.justify_center);assertions++;
        assert.equal(byId('machine-status-remote'),undefined,'Rail headers use device icons, not connection bulbs');
        assert.equal(byId('machine-status-local'),undefined);
        assert.ok(nodes(byId('machine-local')).some(n=>n.style?.asset?.[0]?.endsWith('/monitor.svg')));
        assert.ok(nodes(byId('machine-remote')).some(n=>n.style?.asset?.[0]?.endsWith('/server.svg')));assert.equal(byId('machine-remote').style.tooltip[0],'remote');
        for(const id of ['machine-local','machine-remote','machine-new-emptyremote','space-sp1']) {
          const row=byId(id);assert.ok(row.style.justify_center);assert.equal(row.style.w[0],28);assert.equal(row.style.h[0],28);assert.ok(row.style.self_center);assert.equal(row.style.rounded[0],6);assertions++;
        }
      }
      if(name==='custom-agents') {
        assert.ok(!byId('collapse'));const row=byId('ag-t0');assert.ok(row.style.justify_center);assert.equal(row.style.w[0],28);assert.equal(row.style.h[0],28);assert.equal(row.style.rounded[0],6);assert.equal(byId('ag-list').style.px[0],8);assertions++;
      }
      if(name==='custom-workspace-chrome') {
        assert.ok(view.style.justify_center);assert.equal(view.style.pl[0],0);assert.equal(view.style.pr[0],0);assert.ok(byId('sidebar-toggle'));assertions++;

      }
    }
    if(name==='custom-workspace-status') {
      const stopped=Symbol('disposed'),jobs=[],beforeCopy=calls.length;
      const copyCx={...cx,notify:()=>{throw stopped;},spawn:fn=>{jobs.push(Promise.resolve().then(()=>fn(copyCx)).catch(e=>{if(e!==stopped)throw e;}));}};
      const broker=new mod.namespace.default();broker.init({},copyCx);await Promise.all(jobs);
      assert.equal(calls.length,beforeCopy+1);assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['terminal.copy']),'Queued copy has no originating keystroke or send action');assertions++;
    }
    if(name==='custom-workspace-status'&&scenario!=='empty') {
      const paletteHint=byId('palette');assert.ok(paletteHint.style.cursor_pointer);assert.equal(paletteHint.hoverStyle.style.bg[0],theme.hover);assert.equal(paletteHint.hoverStyle.style.text_color,undefined,'Status hint keeps its text color on hover');
      paletteHint.events.on_click({},cx);assert.equal(calls.at(-1)[0],'app.palette');
      agents.push({address:'remote/t99',status:'blocked'});view=instance.render(cx);
      assert.equal(byId('machine-agents'),undefined,'Status bar has no agent-total widget');
      assert.equal(nodes(view).find(n=>n.style?.asset?.[0]?.endsWith('/monitor.svg')).style.size[0],14,'Device glyphs use the compact status size inside fixed 16px slots');
      const was=spaces[0].machine;spaces[0].machine='remote';testFocus={space:'sp1',tab:'tb0',pane:null,terminal:'remote/t99'};view=instance.render(cx);assert.equal(byId('machine-agents'),undefined);assert.ok(!nodes(view).some(n=>n.kids.includes('1 needs you')),'Blocked-agent counts stay in the sidebar, not the status bar');
      assert.equal(nodes(view).find(n=>n.style?.asset?.[0]?.endsWith('/server.svg')).style.size[0],14,'Remote machine matches the local monitor and compact preview glyph');
      spaces[0].machine=was;testFocus=null;agents.pop();assertions++;
    }
    if(name==='custom-workspace-chrome') {
      const look=cache.get(path.join(root,'mods',name,'look.js')).namespace;
      const tasks=[];const bridgeCx={...cx,spawn:fn=>{const p=Promise.resolve().then(()=>fn(bridgeCx));tasks.push(p);return p;}};
      const closeCount=closed.length,openCount=overlays.length;
      const originalLayout=shared.layout,base={appearance:'dark',colors:{selection:'#ffffff',background:'#181818',foreground:'#fafafa'},spacing:{sm:8},radius:{md:6}};
      shared.layout='Custom';
      const selection=mix(theme.selection,theme.accent,0.25);
      assert.equal(look.ensureNativeSelection({...cx,theme:()=>base}),true);
      assert.equal(nativeThemes.at(-1).tokens.colors.selection,selection,'Native selection enriches the live muted tint with 25% accent');
      assert.equal(nativeThemes.at(-1).tokens.colors.background,base.colors.background);
      assert.equal(base.colors.selection,'#ffffff','Native projection never edits the source theme');
      assert.equal(nativeThemes.at(-1).tokens.typography,undefined);
      assert.equal(look.ensureNativeSelection({...cx,theme:()=>({...base,colors:{...base.colors,selection}})}),false);
      assert.equal(look.ensureNativeSelection({...cx,theme:()=>({...base,appearance:'light'})}),true);
      assert.equal(nativeThemes.at(-1).tokens.colors.selection,selection,'Light mode also uses the enriched tint, not fixed blue');
      shared.layout='main';assert.equal(look.ensureNativeSelection({...cx,theme:()=>base}),false);
      shared.layout=originalLayout;assertions++;
      look.enterCustom({},bridgeCx);await Promise.all(tasks);
      assert.equal(closed.length,closeCount);assert.equal(overlays.length,openCount,'Layout entry never replaces a settings modal');assertions++;
      props={footer:true};view=instance.render(cx);
      assert.equal(view.kind,'hflex');assert.equal(view.style.text_size[0],12);assertions++;
      if(scenario!=='rail'){assert.equal(byId('footer-group-left').kids[0].kids[0].style.id[0],'usage');assert.equal(byId('footer-group-left').kids[1].kids[0].style.id[0],'machine');assertions++;}
      const agentsModule=await load(path.join(root,'mods/custom-agents/main.js'));await agentsModule.evaluate();const sortButton=new agentsModule.namespace.default().sortButton(theme,{icon:'clock',label:'Priority'});const sortGlyph=nodes(sortButton).find(n=>n.kind==='svg');
      for(const id of scenario==='rail'?['footer-menu']:['usage','machine','settings']){const tool=byId(id),glyph=nodes(tool).find(n=>n.kind==='svg');assert.equal(glyph.style.size[0],sortGlyph.style.size[0],'Footer glyphs match the actual Agents sort glyph');assert.equal(glyph.style.size[0],14);assert.equal(tool.style.size[0],28,'Smaller artwork retains the original click target');}assertions++;
      if(scenario==='rail') {
        const more=nodes(view).find(n=>n.style?.id?.[0]==='footer-menu');assert.equal(more.style.size[0],28);assert.equal(more.style.tooltip,undefined);
        assert.equal(view.style.px[0],8);assert.equal(view.kids.length,1);more.events.on_click();
        assert.equal(overlays.at(-1).props.tab,'footer');assertions++;
      }
      for(const [id,label,section] of (scenario==='rail'?[]:[['machine','Machines','machines'],['settings','Settings','look']])) {
        const control=nodes(view).find(n=>n.style?.id?.[0]===id);
        assert.equal(control.style.size[0],28);assert.ok(control.style.justify_center);assert.equal(control.style.tooltip[0],label);
        assert.ok(!nodes(control).some(n=>n.kids?.some(k=>typeof k==='string')),'Footer is icon-only');
        control.buttonEvents.on_mouse_down.left({position:{x:10,y:10}},cx);
        control.buttonEvents.on_mouse_up.left({},cx);
        assert.equal(overlays.at(-1).mod,'custom-settings');assert.equal(overlays.at(-1).props?.section,section);assertions++;
      }
      props={pane:'p0',target:{pane:'p0',terminal:'t0',id:'sp1'},tab:'pane',overlay:'test'};
    }
    if(name==='custom-settings') {
      // The Git footer's Settings link lands on one plugin, not a long catalog.
      const savedProps=props;props={section:'plugins',plugin:'git'};
      const directed=new mod.namespace.default();directed.init({},cx);
      assert.equal(directed.pluginTarget,'git');assert.equal(directed.pluginOpen['git-settings'],false,'Generated URLs and typed overrides stay under collapsed Settings');assert.equal(directed.pluginOpen['git-requirements'],undefined,'Requirements start collapsed: the person opens them');directed.pluginOpen['git-requirements']=true;
      const gitDeclaration=cache.get(path.join(root,'mods',name,'plugins.js')).namespace.pluginById('git');
      directed.pluginChecks.git={loading:false,items:gitDeclaration.prerequisites.map(p=>({...p,status:'missing',...(p.id==='relay'?{fix:{...p.fix,requiresEnabled:true,run(){}}}:p.id==='repository'?{status:'ready',usable:true,rows:[{id:'owner/one',label:'owner/one'},{id:'owner/two',label:'owner/two'}]}:{})}))};
      let directedView=directed.render(cx),directedNodes=nodes(directedView);
      const directedById=id=>directedNodes.find(n=>n.style?.id?.[0]===id);
      assert.ok(directedById('st-plugin-git'));assert.equal(directedById('st-plugin-git-relay'),undefined);assert.equal(directedById('st-plugin-files'),undefined);
      assert.ok(directedById('st-plugin-git-settings-toggle'),'CI automation has its own Settings disclosure');assert.equal(directedById('st-plugin-git-settings-body'),undefined,'Optional automation starts collapsed');assert.ok(directedById('st-plugin-section-git-repository'),'Repositories are a separate section');assert.equal(directedById('st-plugin-list-git-repository'),undefined,'Repositories start collapsed');
      directedById('st-plugin-git-repository-toggle').events.on_click({},cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      assert.ok(directedById('st-plugin-list-git-repository-row-1'),'Opened, Repositories list what was added');assert.ok(directedById('st-plugin-list-git-repository-add'),'with Add in the scope row');
      directedById('st-plugin-git-settings-toggle').events.on_click({},cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      const statesPopup='st-plugin-git-ciFixStates-popup';assert.ok(directedById('st-plugin-git-ciFixStates'));
      directedById(statesPopup).events.on_open_change(true,cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      assert.equal(directedById(statesPopup).style.overlay_closable[0],true);
      const errorState=directedById('st-plugin-git-ciFixStates-error');assert.equal(errorState.events.on_click,undefined);assert.equal(errorState.style.checked[0],false);
      errorState.events.on_change(true,cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      assert.equal(directedById('st-plugin-git-ciFixStates-error').style.checked[0],true,'Selected states remain visible in the open popup');
      directedById('st-plugin-git-ciFixStates-error').events.on_change(false,cx);
      directedById(statesPopup).events.on_open_change(false,cx);
      directedById('st-plugin-git-settings-toggle').events.on_click({},cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      const setup=directedById('st-plugin-fix-git-relay'),installAll=directedById('st-plugin-git-fix-all');
      assert.equal(setup.style.bg[0],theme.solid);assert.equal(setup.style.text_color[0],theme.solid_foreground);assert.ok(installAll,'Install all sits on the Requirements header');
      assert.equal(gitDeclaration.prerequisites.find(p=>p.id==='relay').fix.manual,true,'Configure remains outside automatic Install all actions');
      setup.events.on_click({},cx);directedView=directed.render(cx);directedNodes=nodes(directedView);
      assert.equal(directedById('st-plugin-confirm-git'),undefined,'Configure starts directly without a bottom confirmation panel');assert.equal(directed.pluginFixing,'git:relay');directed.pluginFixing=null;
      assert.equal(directedById('st-plugin-fix-git-repository'),undefined,'No separate Connect action');assert.equal(directedById('st-editor-footer'),undefined,'Lists change at once: no Apply/Discard footer');
      assert.equal(directedById('st-plugin-all'),undefined,'No inline All plugins link');
      const pluginBack=directedById('st-plugin-back');assert.ok(nodes(directedById('dialog-header')).includes(pluginBack));
      pluginBack.events.on_click({},cx);assert.equal(directed.pluginTarget,null);
      directedView=directed.render(cx);directedNodes=nodes(directedView);assert.ok(directedById('st-plugin-files'));
      directed.pluginTarget='git';directedById('st-s-plugins').events.on_click({},cx);assert.equal(directed.pluginTarget,null,'Plugins navigation returns to the full catalog');
      props={section:'plugins',plugin:'git',pluginSection:'repository',pluginSearch:'owner/two'};
      const addRepo=new mod.namespace.default();addRepo.init({},cx);
      addRepo.pluginChecks.git={loading:false,items:[{...gitDeclaration.prerequisites.find(p=>p.id==='repository'),status:'ready',usable:true,rows:[]}]};
      assert.equal(addRepo.listPicker?.key,'git:repository','A repository link opens Add');
      Object.assign(addRepo.listPicker,{loading:false,items:[{id:'owner/one',label:'owner/one'},{id:'owner/two',label:'owner/two'}],add(){throw Error('Fixture must not change webhooks');}});
      const repoNodes=nodes(addRepo.render(cx)),repoById=id=>repoNodes.find(n=>n.style?.id?.[0]===id);
      assert.equal(addRepo.pluginOpen['git-requirements'],false);assert.equal(addRepo.pluginOpen['git-repository'],true);
      assert.equal(addRepo.pluginSearches['git:repository'].value(),'owner/two');assert.equal(repoById('st-plugin-git-requirements-body'),undefined);
      assert.ok(repoById('st-plugin-list-git-repository-search'));assert.equal(repoById('st-plugin-list-git-repository-item-0'),undefined);assert.ok(repoById('st-plugin-list-git-repository-item-1'),'The link filters Add to its repository');
      assert.equal(addRepo.listPicker.selected.length,0,'Prefilled search never picks a repository or changes enrollment');
      const repoSearch=repoById('st-plugin-list-git-repository-search');
      assert.ok(nodes(repoSearch).some(n=>n.style?.asset?.[0]==='mods/custom-workspace-chrome/search.svg'),'Repository search has the shared leading search icon');
      const beforeClearIO=executions.length;
      repoById('st-plugin-list-git-repository-search-clear').events.on_click({},{...cx,stop_propagation(){}});
      assert.equal(addRepo.pluginSearches['git:repository'].value(),'');
      const clearedRepoNodes=nodes(addRepo.render(cx));
      for(const index of [0,1])assert.ok(clearedRepoNodes.some(n=>n.style?.id?.[0]===`st-plugin-list-git-repository-item-${index}`),'Clear restores every candidate');
      assert.ok(!clearedRepoNodes.some(n=>n.style?.id?.[0]==='st-plugin-list-git-repository-search-clear'),'Empty search hides the clear button');
      assert.equal(executions.length,beforeClearIO,'Clearing search starts no network or webhook work');
      props={section:'plugins',plugin:'unknown-plugin'};const unknown=new mod.namespace.default();unknown.init({},cx);assert.equal(unknown.pluginTarget,null);
      props=savedProps;assertions+=8;
      assert.ok(byId('st-statusbar'));assert.ok(byId('st-left-sidebar'));
      assert.equal(byId('st-statusbar').events.on_click,undefined,'Statusbar is a heading, not another navigation step');
      byId('st-left-sidebar').events.on_click({},cx);view=instance.render(cx);
      assert.equal(instance.lookPage,'sidebar');assert.ok(byId('st-body-sidebar'));
      assert.ok(nodes(byId('dialog-header')).includes(byId('st-look-back')),'Back stays in the fixed dialog header');
      assert.ok(!nodes(byId('st-content')).includes(byId('st-look-back')),'Back adds no spacer to the normal content layout');
      for(const section of cache.get(path.join(root,'mods',name,'settings-sections.js')).namespace.settingsSections('windows'))assert.ok(byId(`st-sidebar-${section.id}`));
      assert.equal(byId('st-sidebar-settings'),undefined);
      byId('st-look-back').events.on_click({},cx);view=instance.render(cx);assert.equal(instance.lookPage,null);assert.ok(byId('st-left-sidebar'));
      byId('st-left-sidebar').events.on_click({},cx);view=instance.render(cx);
      view.events.on_key_down({key:'escape'},cx);view=instance.render(cx);assert.equal(instance.lookPage,null);assert.ok(byId('st-statusbar'));assertions++;
      const heading=instance.heading(theme,'Theme');assert.equal(heading.style.text_size[0],16);assert.ok(heading.style.font_semibold);assert.equal(heading.style.text_color[0],theme.foreground);assertions++;
      const about=instance.heading(theme,'Machines','About these machines');assert.equal(about.style.gap[0],4);assert.equal(about.style.pt[0],4);assert.equal(about.style.pb[0],12);assert.equal(instance.row(theme,'Item','About',element()).kids[0].style.gap[0],4);assertions++;
      assert.ok(byId('st-s-look'));assert.equal(byId('st-s-theme'),undefined,'No separate Theme page');assertions++;
      const field=byId('ds-accent');assert.equal(field.style.h[0],32);assert.equal(field.style.rounded[0],6);
      field.events.on_mouse_move({bounds:{x:900,y:300,width:200,height:32}});
      byId('ds-accent-select').events.on_open_change(true,cx);assert.equal(instance.design.open,true);view=instance.render(cx);assert.ok(byId('ds-accent-blue'));
      const pop=byId('ds-accent-select');assert.equal(pop.style.overlay_closable[0],true);assert.equal(pop.style.anchor[0],'top_left');
      pop.events.on_open_change(false,cx);assert.equal(instance.design.open,false);view=instance.render(cx);assertions++;
      assert.ok(!byId('ds-apply'));assert.ok(!nodes(view).some(n=>n.style?.id?.[0]?.startsWith('ds-field-')));assertions++;
      const select=byId('ds-accent-select');select.events.on_open_change(true,cx);view=instance.render(cx);
      assert.ok(byId('ds-accent-blue'));const list=byId('ds-accent-list');list.events.on_key_down({key:'down'},cx);list.events.on_key_down({key:'down'},cx);list.events.on_key_down({key:'enter'},cx);
      assert.equal(instance.design.palette.accent,'#3b82f6');assert.equal(instance.design.open,false);instance.design.busy=false;instance.design.next=null;assertions++;
      byId('ds-accent-select').events.on_open_change(true,cx);view=instance.render(cx);assert.ok(byId('ds-accent-lime'));assert.equal(byId('ds-accent-red'),undefined);
      byId('ds-accent-custom').events.on_click({},cx);view=instance.render(cx);assert.equal(instance.design.custom,true);assert.ok(byId('ds-custom-color'));assert.equal(instance.design.palette.accent,'#3b82f6','Entering Custom keeps the current color');
      byId('ds-color-popup').events.on_open_change(true,cx);view=instance.render(cx);assert.ok(byId('ds-color-panel'));assert.ok(byId('ds-color-hue'));assert.ok(nodes(byId('ds-color-panel')).some(n=>n.kind==='image'&&n.style?.asset?.[0]?.endsWith('color-sv-value.svg')),'SV gradients are full-color images, not tinted icon masks');
      const svFill=nodes(byId('ds-color-sv')).find(n=>n.kind==='paint-path').background;assert.equal(byId('ds-color-sv').style.bg,undefined,'No solid hue backdrop can leak around the rounded value layers');assert.equal(svFill.angle,180);assert.equal(svFill.to,'#000000','The bottom corners cannot expose a saturated hue underlay');assert.equal(svFill.space,'srgb','Value gradients use HSV-compatible RGB interpolation');
      const c=instance.design.color;const openingColor=instance.design.palette.accent;c.hue.events.change(Math.round(c.hsv.h),cx);assert.equal(instance.design.palette.accent,openingColor,'Programmatic slider rounding does not save a new color on open');c.hexInput.set_value('#1634D3');c.hexInput.events.change({},cx);c.hexInput.events.submit({},cx);assert.equal(instance.design.palette.accent,'#1634d3');
      c.hue.set_value(180);c.hue.events.change(180,cx);assert.equal(c.hsv.h,180);assert.equal(instance.design.palette.accent,c.draft,'Hue changes apply before release');c.hue.events.release(180,cx);
      c.hexInput.set_value('#1634d3');c.hexInput.events.change({},cx);c.hexInput.events.submit({},cx);
      c.hexInput.set_value('#invalid');c.hexInput.events.submit({},cx);assert.equal(instance.design.palette.accent,'#1634d3');assert.ok(c.error);c.hexInput.set_value('#1634d3');
      view=instance.render(cx);const beforeDrag=instance.design.palette.accent;
      byId('ds-color-sv').events.on_mouse_move({bounds:{x:100,y:100,width:240,height:156}},cx);
      byId('ds-color-press-observer').events.on_mouse_down_out({button:'left',position:{x:220,y:178}},cx);assert.equal(c.hsv.s,0.5);assert.equal(c.hsv.v,0.5);assert.notEqual(instance.design.palette.accent,beforeDrag,'SV press previews immediately');
      const pressed=instance.design.palette.accent;byId('ds-color-panel').events.on_mouse_move({position:{x:280,y:139}},cx);assert.notEqual(instance.design.palette.accent,pressed,'SV movement previews while held');
      byId('ds-color-panel').events.on_mouse_move({position:{x:350,y:95}},cx);assert.equal(c.hsv.s,1);assert.equal(c.hsv.v,1);assert.equal(c.drag,true,'Crossing the corner into the gutter does not end the drag');
      byId('ds-color-popup').events.on_open_change(true,cx);assert.equal(c.drag,true,'A repeated native open notification cannot cancel a drag');
      byId('ds-color-panel').events.on_mouse_move({position:{x:220,y:178}},cx);assert.equal(c.hsv.s,0.5);assert.equal(c.hsv.v,0.5,'Dragging resumes after a clamped corner');
      assert.equal(byId('ds-color-panel').events.on_hover,undefined,'Hover/hit-test changes never cancel a captured SV drag');
      const heldBounds=c.svBounds;byId('ds-color-sv').events.on_mouse_move({bounds:{x:95,y:173,width:10,height:10}},cx);assert.equal(c.svBounds,heldBounds,'The press geometry is frozen while dragging');
      for(const [x,y,s,v] of [[100,178,0,0.5],[340,178,1,0.5],[220,100,0.5,1],[220,256,0.5,0],[100,100,0,1],[340,256,1,0],[220,178,0.5,0.5]]) {
        context.window.mouse_position=()=>({x,y});c.svDriver.events.change(s,cx);assert.equal(c.hsv.s,s);assert.equal(c.hsv.v,v);assert.equal(c.drag,true,'Native captured motion resumes from every edge');
      }
      c.svDriver.events.release(0.5,cx);assert.equal(c.drag,false,'Native release terminates the gesture even outside the popup');
      const releasedColor=c.draft;context.window.mouse_position=()=>({x:0,y:0});c.svDriver.events.change(0,cx);assert.equal(c.draft,releasedColor,'Unpressed re-entry cannot alter the color');
      view=instance.render(cx);assert.equal(byId('ds-color-sv').style.rounded[0],6);assert.equal(byId('ds-color-sv').style.overflow_hidden,undefined,'The marker is not cropped at SV edges');assert.ok(!nodes(byId('ds-color-panel')).some(n=>n.kids?.includes('100%')));
      const thumb=byId('ds-color-hue-thumb');assert.ok(thumb.style.absolute);assert.equal(thumb.style.top[0],-4);assert.equal(thumb.style.h[0],20);
      const rainbow=nodes(byId('ds-color-hue')).find(n=>n.kind==='image');assert.ok(rainbow.style.absolute,'Hue art takes no flow space before the thumb');
      const inputNode=byId('ds-color-hex-input');assert.equal(inputNode.kind,'input','Keep the native editor for mouse selection and clipboard editing');assert.ok(inputNode.style.flex_1);assert.ok(inputNode.style.h_full);assert.equal(byId('ds-color-hex').style.h[0],32);
      for(const paint of ['bg','border_1','text_color'])assert.equal(inputNode.style[paint],undefined,'Field chrome must not override the native editor selection paint');
      assert.equal(inputNode.events.on_mouse_down,undefined,'No custom handler resets native caret/selection positioning');assert.equal(byId('ds-color-hex').events.on_mouse_down,undefined);
      const saturation=c.hsv.s;byId('ds-color-panel').events.on_key_down({key:'left'},cx);assert.equal(c.hsv.s,saturation,'Panel-level arrow keys never steal text selection');
      byId('ds-color-sv').events.on_key_down({key:'left',modifiers:{}},cx);assert.ok(c.hsv.s<saturation,'SV keyboard changes stay scoped to its focused pad');
      c.drag=true;const hexBefore=c.hexInput.value();byId('ds-color-press-observer').events.on_mouse_down_out({button:'left',position:{x:200,y:350}},cx);assert.equal(c.drag,false);
      c.hexInput.events.focus({},cx);c.hexInput.set_selected_range({start:1,end:4});byId('ds-color-popup').events.on_open_change(true,cx);
      byId('ds-color-panel').events.on_mouse_move({position:{x:200,y:350}},cx);assert.equal(c.hexInput.value(),hexBefore);assert.deepEqual(c.hexInput.selected_range(),{start:1,end:4},'Focus/re-render/open notifications preserve a partial native text selection');assertions++;
      const closing=closed.length;byId('ds-color-panel').events.on_key_down({key:'escape'},cx);assert.equal(c.open,false);assert.equal(closed.length,closing,'Escape dismisses the color picker, not Settings');
      instance.design.busy=false;instance.design.next=null;assertions++;
      for(const section of ['look','machines','core','terminals','usage','alerts','updates','privacy','keyboard']) {
        instance.section=section;view=instance.render(cx);assert.ok(view,section);assert.equal(Boolean(byId('st-settings-host')),['core','terminals','usage'].includes(section),'Only machine-scoped pages show the shared header selector');assert.equal(byId('st-row-Machine'),undefined);assertions++;
      }
      assert.ok(byId('st-s-usage'));
      const remotePrefs='custom.usage.remote:remote.preferences',remoteCache='custom.usage.remote:remote.cache';
      const savedPrefs=shared[remotePrefs],savedCache=shared[remoteCache],localPrefs=shared['custom.usage.local.preferences'];
      shared[remotePrefs]={enabled:true,summary:true,remaining:true,pins:['keep-pin']};
      instance.section='usage';instance.usageMachine='remote';view=instance.render(cx);assert.ok(byId('st-usage-page'));
      byId('st-usage-enabled').events.on_click({},cx);assert.equal(shared[remotePrefs].enabled,false);view=instance.render(cx);
      byId('st-usage-summary').events.on_click({},cx);assert.equal(shared[remotePrefs].summary,false);view=instance.render(cx);
      assert.equal(byId('st-usage-claude-automatic').style.bg[0],theme.accent);
      const beforeAutomaticExec=executions.length,beforeAutomaticCalls=calls.length;
      byId('st-usage-claude-automatic').events.on_click({},cx);assert.equal(shared[remotePrefs].claudeAutomatic,false,'Automatic Claude account is on by default');view=instance.render(cx);
      byId('st-usage-claude-automatic').events.on_click({},cx);assert.equal(shared[remotePrefs].claudeAutomatic,true);
      assert.equal(executions.length,beforeAutomaticExec);assert.equal(calls.length,beforeAutomaticCalls,'Changing the preference never launches or switches an agent');
      byId('st-usage-percentages-false').events.on_click({},cx);assert.equal(shared[remotePrefs].remaining,false);assert.equal(shared[remotePrefs].pins[0],'keep-pin');
      assert.equal(shared['custom.usage.local.preferences'],localPrefs,'Changes stay scoped to the selected machine');
      view=instance.render(cx);assert.equal(byId('st-usage-percentages-false').style.bg[0],theme.selected);
      assert.equal(byId('st-row-Percentages').style.border_b,undefined);assert.equal(byId('st-usage-enabled-thumb').style.transition[1].duration,140);
      byId('st-settings-host-popup').events.on_open_change(true,cx);view=instance.render(cx);byId('st-settings-host-local').events.on_click({},cx);assert.equal(instance.usageMachine,null);
      const priorProps=props;props={...props,section:'usage',usageMachine:'remote'};const deepLink=new mod.namespace.default();deepLink.init({},cx);assert.equal(deepLink.section,'usage');assert.equal(deepLink.usageMachine,'remote');assert.equal(deepLink.profileMachine,'remote','Usage deep links initialize the shared Profiles context too');
      props={...props,usageMachine:null};const localLink=new mod.namespace.default();localLink.init({},cx);assert.equal(localLink.usageMachine,null);assert.equal(localLink.profileMachine,null);props={...props,section:'profiles',profilesMachine:'remote'};const profileLink=new mod.namespace.default();profileLink.init({},cx);assert.equal(profileLink.profileMachine,'remote');assert.equal(profileLink.usageMachine,'remote');props={...props,section:'terminals',terminalsMachine:'remote'};const terminalLink=new mod.namespace.default();terminalLink.init({},cx);assert.equal(terminalLink.profileMachine,'remote');props={...props,terminalsMachine:null};const localTerminalLink=new mod.namespace.default();localTerminalLink.init({},cx);assert.equal(localTerminalLink.profileMachine,null,'An explicit local terminal deep link never inherits a remote machine');props=priorProps;
      shared[remotePrefs]=savedPrefs;shared[remoteCache]=savedCache;
      instance.section='look';instance.picking='font';view=instance.render(cx);
      const fontPopup=byId('st-font-popup-font');assert.equal(fontPopup.kind,'popover');assert.equal(fontPopup.style.open[0],true);
      assert.equal(byId('st-font-menu-font').style.w[0],260);
      const fontMenu=byId('st-font-menu-font');for(const edge of ['p','pt','pb']) assert.equal(fontMenu.style[edge][0],0,'No inset around the full-width search divider');
      assert.ok(byId('st-font-search-font').style.w_full);assert.equal(byId('st-font-search-font').style.border_b[0],1);
      const checked=node=>nodes(node).filter(n=>n.style?.asset?.[0]==='mods/custom-settings/check.svg').length;
      assert.equal(checked(byId('st-fd-font')),1,'Default selection has a checkmark');assert.equal(checked(fontMenu),1);
      const savedPerson=instance.person;instance.person={...savedPerson,font:'Geist'};
      const explicit=instance.fontList(theme,'font','JetBrains Mono');assert.equal(checked(explicit),1);assert.equal(checked(nodes(explicit).find(n=>n.style?.id?.[0]==='st-fi-font-0')),1);
      instance.person={...savedPerson,ui_font:'JetBrains Mono'};const interfaceMenu=instance.fontList(theme,'ui_font','Geist');
      assert.equal(checked(interfaceMenu),1);assert.equal(checked(nodes(interfaceMenu).find(n=>n.style?.id?.[0]==='st-fi-ui_font-1')),1);instance.person=savedPerson;
      fontPopup.events.on_open_change(false,cx);assert.equal(instance.picking,null);
      assert.equal(byId('st-row-Terminal font').style.h,undefined,'Floating font list cannot extend the row');assertions++;
      for(const id of ['st-f-font','st-f-ui_font','st-zoom-reset']) {assert.equal(byId(id).style.h[0],32);assert.equal(byId(id).style.rounded[0],6);assertions++;}
      for(const section of ['look','profiles','terminals','machines','core','usage','alerts','updates','privacy'])assert.equal(nodes(byId(`st-s-${section}`)).find(n=>n.kind==='svg').style.size[0],16,'Settings navigation stays 16px independently of the smaller sidebar footer');assertions++;
      assert.equal(byId('st-zoom-reset').style.w[0],76,'Reset stays a compact normal button');assert.equal(byId('st-zoom-reset-slot'),undefined,'No invisible trailing alignment column');assert.ok(byId('st-zoom-controls').style.justify_end);assert.equal(byId('st-zoom-controls').kids.at(-1),byId('st-zoom-reset'),'Reset reaches the right edge of its row');assert.equal(byId('st-zoom-controls').style.gap[0],8);assertions++;
      assert.equal(nodes(view).filter(n=>n.style?.id?.[0]?.startsWith('st-t-')).length,0,'No redundant color-scheme preview');assert.equal(byId('st-customize-theme'),undefined);assert.ok(byId('ds-accent'),'Accent is inline beside Custom');assertions++;
      assert.equal(byId('st-row-Interface font').style.border_b,undefined,'No trailing divider');
      const privacyView=instance.privacy(theme);assert.equal(nodes(privacyView).find(n=>n.style?.id?.[0]==='st-row-What we send').style.border_b,undefined);assertions++;
      const settingRow=(page,title)=>nodes(page).find(n=>n.style?.id?.[0]===`st-row-${title}`);
      assert.equal(byId('st-row-Accent color').style.border_b,undefined,'No trailing divider after matching moved to Plugins');
      assert.equal(byId('st-match-agent-session-color'),undefined,'Agent matching is no longer a Look-specific toggle');
      const registry=cache.get(path.join(root,'mods',name,'plugins.js')).namespace,matching=registry.pluginById('a1-colors');
      assert.ok(matching);assert.notEqual(shared['custom.match-agent-session-color'],true,'Matching defaults off');
      registry.setPluginEnabled(matching,true);assert.equal(shared['custom.match-agent-session-color'],true);
      registry.setPluginEnabled(matching,false);assert.equal(shared['custom.match-agent-session-color'],false);assertions++;
      assert.equal(settingRow(instance.alerts(theme),'An agent finished').style.border_b[0],1,'Separate the explanatory footer');
      const updateView=instance.updates(theme);for(const title of ['Herdr 0.1.13','herdr-core 0.1.0']) assert.equal(settingRow(updateView,title).style.border_b[0],1);
      assert.ok(!nodes(updateView).some(n=>n.kids?.includes('herdr-core')),'No duplicate core section heading');
      const machinesPage=instance.machines(theme),machineNodes=nodes(machinesPage),machineActions=machineNodes.find(n=>n.style?.id?.[0]==='st-machine-actions'),firstMachine=settingRow(machinesPage,'This computer');
      assert.equal(firstMachine.style.border_b[0],1);assert.equal(firstMachine.style.border_t[0],1,'First machine has a top divider');assert.equal(machinesPage.kids[1],machineActions,'Add machine sits directly below the description');assert.equal(machinesPage.kids[2],firstMachine);assert.equal(machineActions.style.border_t,undefined,'No line above Add machine');assert.equal(machineActions.style.py[0],12);assert.equal(machineActions.style.min_h[0],64);assert.ok(machineActions.style.items_center);assert.ok(nodes(machineActions).some(n=>n.style?.id?.[0]==='st-m-add'));
      assert.equal(instance.machineRow(theme,{name:'test-remote',state:'connected',version:'0.1.0'},'0.1.0').style.border_b[0],1,'Separate Add machine from the list');
      instance.showData=true;assert.equal(settingRow(instance.privacy(theme),'What we send').style.border_b[0],1,'Separate expanded report content');instance.showData=false;assertions++;
      const fontControls=nodes(byId('st-row-Terminal font')).find(n=>n.kids?.some(k=>k?.style?.id?.[0]==='st-font-popup-font'));
      assert.equal(fontControls.kids.at(-1).style.id[0],'st-font-popup-font','Font dropdown is rightmost');
      assert.ok(nodes(fontControls.kids[0]).some(n=>n.style?.id?.[0]==='st-font_size-minus'));
      const fontSearch=byId('st-font-input-font');const jumpSearch=cache.get(path.join(root,'mods',name,'ui.js')).namespace.searchField(theme,input(),{focused:false});
      for(const token of ['h','rounded','px','gap','bg']) assert.deepEqual(fontSearch.style[token],jumpSearch.style[token],'Search geometry and fill are shared');
      assert.ok(nodes(fontSearch).some(n=>n.style?.asset?.[0]==='mods/custom-workspace-chrome/search.svg'));
      const previewPrefs=cache.get(path.join(root,'mods',name,'preview-font.js')).namespace,previewKey=previewPrefs.PREVIEW_FONT_KEY,savedPreview=shared[previewKey],settingsBefore=memory.get(appPath+'/settings.json'),writesBefore=writes.length;
      const fontRows=nodes(view).map(n=>n.style?.id?.[0]).filter(id=>['st-row-Terminal font','st-row-Preview font','st-row-Interface font'].includes(id));assert.deepEqual(fontRows,['st-row-Terminal font','st-row-Preview font','st-row-Interface font']);assert.equal(byId('st-f-preview_font').style.w[0],200);assert.equal(byId('st-f-preview_font').style.h[0],32);assert.equal(byId('st-row-Preview font').style.border_b[0],1);
      byId('st-preview_font_size-plus').events.on_click({},cx);byId('st-preview_font_size-plus').events.on_click({},cx);assert.equal(previewPrefs.previewFont().size,14,'Repeated clicks use the latest persisted preview size');byId('st-preview_font_size-minus').events.on_click({},cx);assert.equal(previewPrefs.previewFont().size,13);assert.equal(memory.get(appPath+'/settings.json'),settingsBefore);assert.equal(writes.length,writesBefore,'Preview size never writes native terminal settings');assertions++;
      const previewMenu=instance.fontList(theme,'preview_font','JetBrains Mono');assert.equal(checked(previewMenu),1);nodes(previewMenu).find(n=>n.style?.id?.[0]==='st-fi-preview_font-0').events.on_click({},cx);assert.equal(previewPrefs.previewFont().family,'Geist');assert.equal(writes.length,writesBefore);const previewDefault=instance.fontList(theme,'preview_font','JetBrains Mono');nodes(previewDefault).find(n=>n.style?.id?.[0]==='st-fd-preview_font').events.on_click({},cx);assert.equal(previewPrefs.previewFontPreference().family,null);assert.equal(previewPrefs.previewFont().family,'JetBrains Mono');if(savedPreview===undefined)delete shared[previewKey];else shared[previewKey]=savedPreview;view=instance.render(cx);assertions++;
      const profileStore=cache.get(path.join(root,'mods',name,'profiles.js')).namespace,profileKey=profileStore.profileKey(null),previousProfiles=shared[profileKey],beforeProfileWrites=writes.length,oldSection=instance.section;
      instance.section='profiles';instance.profileLoading=false;instance.profileItems=profileStore.composeProfiles(null,[{key:'codex',name:'Codex',run:['codex','--kept'],installed:true,icon:'icons/agent.svg',tint:true}]);view=instance.render(cx);assert.ok(byId('st-profiles'));assert.equal(byId('st-profile-toolbar'),undefined,'The redundant refresh block is removed');assert.equal(byId('st-profile-list').style.border_t[0],1);assert.equal(byId('st-profile-refresh').style.size[0],28);assert.ok(nodes(byId('dialog-header')).includes(byId('st-profile-refresh')));assert.ok(byId('st-profile-add').kids.includes('Add a profile'));assert.equal(byId('st-profile-actions').kids[0],byId('st-profile-add'));assert.equal(byId('st-profiles').kids.indexOf(byId('st-profile-actions'))+1,byId('st-profiles').kids.indexOf(byId('st-profile-list')),'Add a profile is left-aligned immediately above the list');assert.equal(byId('st-profile-actions').style.border_t,undefined,'No divider above Add a profile; the list divider below remains');assert.equal(byId('st-profile-actions').style.py[0],12);assert.equal(byId('st-profile-actions').style.min_h[0],64);assert.ok(byId('st-profile-actions').style.items_center);assert.equal(byId('st-terminal-shell'),undefined,'Terminal defaults moved out of agent Profiles');assert.equal(byId('st-profiles').style.gap[0],0,'Modal rows own divider spacing without stacked parent gaps');assert.equal(byId('st-row-Machine'),undefined);assert.equal(byId('st-settings-host').style.w[0],150);assert.ok(byId('st-profile-settings-terminal'));assert.equal(byId('st-profile-edit-terminal'),undefined);assert.equal(nodes(byId('st-s-profiles')).find(n=>n.kind==='svg').style.asset[0],'mods/custom-settings/agent.svg');assert.equal(byId('st-profile-terminal').style.py[0],12);assert.equal(byId('st-profile-codex').style.py[0],12);assert.ok(byId('st-profile-codex'));assert.equal(byId('st-profile-codex').style.border_b[0],1,'Keep consistent profile row separators');assert.equal(byId('st-profile-terminal').style.border_b[0],1);byId('st-profile-show-codex').events.on_click({},cx);assert.equal(profileStore.profileConfig(null).overrides.codex.show,false);assert.equal(writes.length,beforeProfileWrites);
      instance.profileLoading=true;view=instance.render(cx);assert.equal(byId('st-profile-refresh').style.disabled[0],true);assert.equal(byId('st-profile-refresh').style.opacity[0],0.4);assert.equal(byId('st-profile-refresh').style.tooltip,undefined);assert.equal(byId('st-profile-refresh').style.accessibility_label[0],'Refreshing profiles…');assert.equal(byId('st-profile-refresh').kids[0].style.spin[0],900,'Busy refresh rotates its disabled icon');assert.equal(byId('settings-header-progress'),undefined,'No header animation');assert.ok(!nodes(view).some(n=>n.kids?.includes('Only launch a profile when you choose it in the + menu.')));assert.ok(!nodes(view).some(n=>n.kids?.includes('Checking executable paths…')));const busyProfileSerial=instance.profileSerial;byId('st-profile-refresh').events.on_click({},cx);assert.equal(instance.profileSerial,busyProfileSerial);instance.profileLoading=false;view=instance.render(cx);assert.equal(byId('st-profile-refresh').kids[0].style.spin,undefined,'Completed refresh stops icon rotation');
      byId('st-profile-terminal').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);byId('st-profile-codex').events.on_mouse_move({position:{x:0,y:60},local_position:{y:50},bounds:{height:60}},cx);byId('st-profile-list').events.on_mouse_move({local_position:{x:80,y:60}},cx);view=instance.render(cx);assert.ok(byId('st-profile-drop-indicator'));const floating=byId('st-profile-drag-preview');assert.ok(floating);assert.equal(floating.style.left[0],instance.profileDragPoint.x);const previewCard=nodes(floating).find(n=>n.style.shadow_md);assert.equal(previewCard.style.h[0],28);assert.equal(previewCard.style.rounded[0],6);assert.ok(nodes(floating).some(n=>n.kids?.includes('Terminal')));assert.equal(byId('st-profile-terminal').style.opacity[0],0.45);byId('st-profile-codex').events.on_mouse_up({},cx);assert.equal(instance.profileItems[0].key,'codex');assert.equal(profileStore.profileConfig(null).order[0],'codex');assert.equal(instance.profileDrag,null);assert.equal(writes.length,beforeProfileWrites,'Drag saves only private preferences, not program documents');view=instance.render(cx);const beforeDragEscape=closed.length,beforeEscapeOrder=JSON.stringify(profileStore.profileConfig(null).order);byId('st-profile-codex').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);byId('st-profile-terminal').events.on_mouse_move({position:{x:0,y:60},local_position:{y:50},bounds:{height:60}},cx);view=instance.render(cx);view.events.on_key_down({key:'escape'},cx);assert.equal(instance.profileDrag,null);assert.equal(closed.length,beforeDragEscape,'Escape cancels a drag without closing Settings');assert.equal(JSON.stringify(profileStore.profileConfig(null).order),beforeEscapeOrder);assertions++;
      const menuModule=await load(path.join(root,'mods/custom-new-menu/main.js'));await menuModule.evaluate();const menu=new menuModule.namespace.default();menu.init({},cx);menu.items=instance.profileItems;const menuView=nodes(menu.render());assert.ok(!menuView.some(n=>n.style?.id?.[0]==='codex'),'Hidden profiles are not exposed in +');const manage=menuView.find(n=>n.style?.id?.[0]==='edit-profiles');manage.events.on_click();assert.equal(overlays.at(-1).props.section,'profiles');assert.equal(overlays.at(-1).props.profilesMachine,null);assertions++;
      view=instance.render(cx);byId('st-profile-edit-codex').events.on_click({},cx);view=instance.render(cx);assert.ok(byId('st-profile-editor'));assert.equal(byId('st-profile-refresh').style.disabled[0],true,'Header refresh cannot discard an editor draft');for(const id of ['st-profile-cancel','st-profile-save']){assert.equal(byId(id).style.w[0],76);assert.equal(byId(id).style.h[0],32);}assert.ok(byId('st-editor-footer').style.flex_none);assert.equal(byId('st-editor-footer').style.border_t[0],1);assert.ok(nodes(byId('st-editor-footer')).includes(byId('st-profile-save')));assert.ok(!nodes(byId('st-body')).includes(byId('st-profile-save')),'Profile actions are outside the scroll viewport');assert.ok(!nodes(byId('st-body')).includes(byId('st-profile-cancel')));assert.equal(byId('st-settings-host').style.disabled[0],true);const editingMachine=instance.profileMachine;assert.equal(byId('st-settings-host').style.opacity[0],0.4);assert.equal(byId('st-settings-host-popup'),undefined,'An editor has no active machine dropdown wrapper');assert.equal(instance.settingsHostOpen,false,'A machine switch cannot discard or retarget an active profile draft');assert.equal(instance.profileMachine,editingMachine);assert.equal(instance.profileCommand.value(),'codex','Editor uses configured command, not a resolved Node launcher');assert.equal(instance.profileArgs.value(),'["--kept"]');instance.profileName.set_value('Work Codex');instance.profileCommand.set_value('C:/tools/codex.exe');instance.profileArgs.set_value('["--safe"]');byId('st-profile-save').events.on_click({},cx);assert.equal(profileStore.profileConfig(null).overrides.codex.command,'C:/tools/codex.exe');assert.equal(writes.length,beforeProfileWrites);const beforeStaleLaunch=calls.length;menu.space='stale-space';menu.launch({key:'codex',name:'Codex',run:['codex'],available:true});assert.equal(calls.length,beforeStaleLaunch,'A stale menu cannot launch a profile on another space/machine');assertions++;
      view=instance.render(cx);byId('st-profile-settings-terminal').events.on_click({},cx);assert.equal(instance.section,'terminals');
      const terminalKey=profileStore.terminalKey(null),previousTerminals=shared[terminalKey],catalogKey='custom.shell-catalog:null',previousCatalog=shared[catalogKey];
      instance.profileShells=[
        {key:'installed:bash',name:'Git Bash',source:'Installed shell',run:['C:/owned/bash.exe','--login','-i']},
        {key:'installed:powershell',name:'Windows PowerShell',source:'Installed shell',run:['C:/Windows/PowerShell.exe','-NoLogo']},
        {key:'installed:cmd',name:'Command Prompt',source:'Installed shell',run:['C:/Windows/cmd.exe']},
        {key:'wt:old',name:'Duplicate Bash',source:'Windows Terminal profile',run:['C:/owned/bash.exe','--login','-i']},
      ];
      shared[catalogKey]={policy:2,items:instance.profileShells.filter(p=>p.source==='Installed shell'),checkedAt:Date.now()};
      instance.profileShellOpen=true;view=instance.render(cx);
      assert.ok(byId('st-terminals'));assert.equal(byId('st-editor-footer'),undefined,'List pages have no editor footer');assert.ok(!nodes(byId('st-row-Default terminal')).some(n=>n.kids?.includes('Used when you choose + → Terminal. Open tabs keep the shell they already use.')),'Default terminal has no redundant description');assert.equal(byId('st-terminal-shell').style.w[0],200);assert.equal(byId('st-settings-host').style.w[0],150);
      assert.equal(byId('st-row-Default terminal').style.py[0],12);assert.equal(byId('st-row-Default terminal').style.min_h[0],64);
      for(const terminal of profileStore.composeTerminals(null,instance.profileShells))assert.equal(byId(`st-terminal-${terminal.key}`).style.border_b[0],1,'Every terminal item, including the last, has a bottom divider');
      assert.equal(byId('st-terminal-shell-4'),undefined,'Default and detected terminals only, not imported duplicates');
      byId('st-terminal-shell-1').events.on_click({},cx);assert.equal(profileStore.profileConfig(null).overrides.terminal.shell_profile,'installed:bash');
      profileStore.updateProfile(null,'terminal',{shell_profile:'wt:legacy'});const savedLegacyShell=JSON.stringify(profileStore.profileConfig(null));view=instance.render(cx);
      assert.ok(nodes(byId('st-terminal-shell')).some(n=>n.kids?.includes('Git Bash')),'Older imported choices match the installed shell by argv');
      assert.equal(JSON.stringify(profileStore.profileConfig(null)),savedLegacyShell,'Rendering never rewrites a saved shell choice');
      byId('st-terminal-show-installed:bash').events.on_click({},cx);assert.equal(profileStore.terminalConfig(null).overrides['installed:bash'].show,false);
      byId('st-terminal-up-installed:cmd').events.on_click({},cx);view=instance.render(cx);
      assert.deepEqual([...profileStore.composeTerminals(null,instance.profileShells).map(p=>p.key)],['installed:bash','installed:cmd','installed:powershell']);
      byId('st-terminal-installed:bash').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);
      byId('st-terminal-installed:powershell').events.on_mouse_move({position:{x:0,y:100},local_position:{y:50},bounds:{height:60}},cx);
      byId('st-terminal-list').events.on_mouse_move({local_position:{x:80,y:100}},cx);view=instance.render(cx);
      assert.ok(byId('st-terminal-grip-installed:bash'));assert.ok(byId('st-terminal-drop-indicator'));assert.equal(byId('st-terminal-installed:bash').style.opacity[0],0.45);
      const terminalPreview=byId('st-terminal-drag-preview');assert.ok(terminalPreview);assert.equal(terminalPreview.style.left[0],instance.terminalDragPoint.x);assert.equal(nodes(terminalPreview).find(n=>n.style.shadow_md).style.h[0],28);
      byId('st-terminal-installed:powershell').events.on_mouse_up({position:{x:0,y:100},local_position:{y:50},bounds:{height:60}},cx);
      assert.deepEqual([...profileStore.composeTerminals(null,instance.profileShells).map(p=>p.key)],['installed:cmd','installed:powershell','installed:bash']);assert.equal(instance.terminalDrag,null);
      view=instance.render(cx);const beforeDragCancel=JSON.stringify(profileStore.terminalConfig(null)),beforeDragClose=closed.length;
      byId('st-terminal-installed:cmd').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);byId('st-terminal-installed:bash').events.on_mouse_move({position:{x:0,y:100},local_position:{y:50},bounds:{height:60}},cx);
      view=instance.render(cx);view.events.on_key_down({key:'escape'},cx);assert.equal(instance.terminalDrag,null);assert.equal(JSON.stringify(profileStore.terminalConfig(null)),beforeDragCancel);assert.equal(closed.length,beforeDragClose,'Escape cancels terminal dragging, not Settings');
      view=instance.render(cx);byId('st-terminal-installed:cmd').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);byId('st-terminal-list').events.on_hover(false,cx);assert.equal(instance.terminalDrag,null,'Leaving the list cancels the drag');
      instance.profileShellLoading=false;view=instance.render(cx);assert.equal(byId('st-terminal-refresh').style.disabled[0],true,'Section-entry feedback survives a quick cached load');finishRefreshFeedback();view=instance.render(cx);byId('st-terminal-installed:cmd').buttonEvents.on_mouse_down.left({position:{x:0,y:0}},cx);byId('st-terminal-refresh').events.on_click({},cx);assert.equal(instance.terminalDrag,null,'Refresh cancels pending terminal drags');view=instance.render(cx);
      assert.equal(byId('st-terminal-refresh').style.disabled[0],true);assert.equal(byId('st-terminal-refresh').style.tooltip,undefined);assert.equal(byId('st-terminal-refresh').style.accessibility_label[0],'Refreshing terminals…');assert.ok(nodes(byId('dialog-header')).includes(byId('st-terminal-refresh')));assert.ok(!nodes(view).some(n=>n.kids?.includes('Drag terminals or use the arrows to reorder the shell-switch menu. Changes save automatically.')));const busyTerminalSerial=instance.profileSerial;byId('st-terminal-refresh').events.on_click({},cx);assert.equal(instance.profileSerial,busyTerminalSerial,'Repeated refresh is disabled');
      const beforeTerminalCancel=JSON.stringify(profileStore.terminalConfig(null));byId('st-terminal-edit-installed:powershell').events.on_click({},cx);view=instance.render(cx);
      assert.ok(byId('st-terminal-editor'));assert.equal(byId('st-terminal-refresh').style.disabled[0],true,'Header refresh cannot discard a terminal draft');for(const id of ['st-terminal-cancel','st-terminal-save']){assert.equal(byId(id).style.w[0],76);assert.equal(byId(id).style.h[0],32);}assert.ok(byId('st-editor-footer').style.flex_none);assert.ok(nodes(byId('st-editor-footer')).includes(byId('st-terminal-save')));assert.ok(!nodes(byId('st-body')).includes(byId('st-terminal-save')),'Terminal actions are outside the scroll viewport');assert.ok(!nodes(byId('st-body')).includes(byId('st-terminal-cancel')));assert.equal(byId('st-settings-host').style.disabled[0],true);assert.equal(byId('st-settings-host').style.opacity[0],0.4);assert.equal(byId('st-settings-host-popup'),undefined,'Terminal drafts have no machine dropdown handlers');assert.equal(byId('st-terminal-permissions'),undefined,'Core permissions are separate from terminal editing');assert.equal(instance.terminalCommand.value(),'C:/Windows/PowerShell.exe');assert.equal(instance.terminalArgs.value(),'[]');
      assert.ok(byId('st-terminal-option-noLogo'));assert.ok(byId('st-terminal-option-loadProfile'));instance.terminalName.set_value('Unsaved draft');
      const beforeTerminalEscape=closed.length;view.events.on_key_down({key:'escape'},cx);assert.equal(closed.length,beforeTerminalEscape);assert.equal(instance.terminalEdit,null);assert.equal(JSON.stringify(profileStore.terminalConfig(null)),beforeTerminalCancel);
      view=instance.render(cx);byId('st-terminal-edit-installed:powershell').events.on_click({},cx);view=instance.render(cx);instance.terminalArgs.set_value('["-NoProfile"]');byId('st-terminal-save').events.on_click({},cx);assert.match(instance.terminalError,/startup switches/);assert.ok(instance.terminalEdit);view=instance.render(cx);assert.ok(nodes(byId('st-editor-footer')).some(n=>n.kids?.includes(instance.terminalError)),'Validation stays visible beside the pinned actions');
      instance.terminalArgs.set_value('[]');instance.terminalName.set_value('My PowerShell');byId('st-terminal-option-noLogo').events.on_click({},cx);byId('st-terminal-save').events.on_click({},cx);assert.equal(instance.terminalEdit,null);
      assert.equal(profileStore.terminalConfig(null).overrides['installed:powershell'].name,'My PowerShell');assert.equal(profileStore.terminalConfig(null).overrides['installed:powershell'].noLogo,false);
      const shellMenu=new menuModule.namespace.default();shellMenu.init({},cx);const selectedShell=profileStore.composeProfiles(null,[]).find(p=>p.key==='terminal');shellMenu.launch({...selectedShell,available:true});
      assert.equal(calls.at(-1)[0],'tab.new');assert.deepEqual([...calls.at(-1)[1].argv],['C:/owned/bash.exe','--login','-i'],'+ Terminal uses the chosen default even when hidden from the switch menu');assert.equal(writes.length,beforeProfileWrites);
      shellMenu.launch({key:'agent-with-default',name:'Agent',available:true,command:'a1',configuredArgs:[],run:['C:/npm/a1.cmd']});
      assert.deepEqual([...shared['custom.profile-launches'].at(-1).shell],['C:/owned/bash.exe','--login','-i'],'Agent profiles honor the same chosen default, including its startup flags');
      if(previousTerminals===undefined)delete shared[terminalKey];else shared[terminalKey]=previousTerminals;if(previousCatalog===undefined)delete shared[catalogKey];else shared[catalogKey]=previousCatalog;
      instance.section='profiles';instance.profileShellOpen=false;assertions++;
      const customProfile=profileStore.addProfile(null,{name:'Owned test shell',command:'shell.exe',args:[]});instance.profileLoading=false;instance.profileItems=profileStore.composeProfiles(null,[]);view=instance.render(cx);byId(`st-profile-delete-${customProfile}`).events.on_click({},cx);view=instance.render(cx);const deleteRow=byId(`st-profile-${customProfile}`),deleteBlock=nodes(view).find(n=>n.kids?.includes(deleteRow));assert.ok(nodes(deleteBlock).some(n=>n.style?.id?.[0]==='st-profile-delete-confirm'),'Removal confirmation stays beside its own profile, not below the whole list');byId('st-profile-delete-confirm').events.on_click({},cx);assert.ok(!profileStore.profileConfig(null).custom.some(p=>p.key===customProfile));assert.equal(writes.length,beforeProfileWrites);if(previousProfiles===undefined)delete shared[profileKey];else shared[profileKey]=previousProfiles;instance.profileLoading=false;instance.profileEdit=null;instance.section=oldSection;view=instance.render(cx);assertions++;
      if(scenario==='rail'){instance.section='profiles';view=instance.render(cx);byId('st-settings-host-popup').events.on_open_change(true,cx);view=instance.render(cx);const beforeContextCommands=calls.length;byId('st-settings-host-remote').events.on_click({},cx);assert.equal(instance.profileMachine,'remote');assert.equal(instance.usageMachine,'remote');assert.equal(calls.length,beforeContextCommands,'Changing Settings context never selects a space or launches a process');view=instance.render(cx);byId('st-s-usage').events.on_click({},cx);view=instance.render(cx);assert.ok(nodes(byId('st-settings-host')).some(n=>n.kids?.includes('remote')));byId('st-settings-host-popup').events.on_open_change(true,cx);view=instance.render(cx);byId('st-settings-host-local').events.on_click({},cx);assert.equal(instance.profileMachine,null);assert.equal(instance.usageMachine,null);instance.section=oldSection;view=instance.render(cx);}
      const remote={name:'sizing-test',state:'connected',version:'0.1.0'};instance.machineEdit={machine:remote.name,action:'rename',name:remote.name};
      const renameRow=instance.machineRow(theme,remote,'0.1.0');
      for(const action of ['rename','rm','cancel','save']) { const b=nodes(renameRow).find(n=>n.style?.id?.[0]===`st-m-${action}-${remote.name}`);assert.equal(b.style.w[0],76);assert.equal(b.style.h[0],32); }
      instance.machineEdit=null;
      for(const machine of [{name:null,state:'connected',version:'0.1.0'},remote]) {const r=instance.machineRow(theme,machine,'0.1.0');assert.equal(r.kids[0].kids[0].style.id[0],`st-machine-status-${machine.name??'local'}`);}
      for(const show of [false,true]) {instance.showData=show;const p=instance.privacy(theme);assert.equal(nodes(p).find(n=>n.style?.id?.[0]==='st-telemetry-show').style.w[0],64);}instance.showData=false;
      for(const on of [false,true]) { const thumb=nodes(instance.toggle(theme,'motion-test',on,noop)).find(n=>n.style?.id?.[0]==='motion-test-thumb');assert.equal(thumb.style.left[0],on?18:2);assert.equal(thumb.style.transition[0],'left');assert.equal(thumb.style.transition[1].duration,140); }
      const baseUpdates=herdr.updates();const oldAsked=instance.asked;
      for(const phase of ['idle','checking','done']) {updateScenario={...baseUpdates,app:{...baseUpdates.app,updates:true},checks:true,checking:phase==='checking',checked:Date.now()};instance.asked=phase==='idle'?null:Date.now();
        const page=instance.updates(theme);for(const id of ['st-check-app-slot','st-check-core-slot']) {const s=nodes(page).find(n=>n.style?.id?.[0]===id);assert.equal(s.style.w[0],112);assert.equal(s.style.h[0],32);const button=nodes(s).find(n=>n.style?.id?.[0]===id.replace('-slot',''));assert.ok(button,'Checks keep a real button in every phase');assert.equal(button.style.disabled[0],phase!=='idle');if(phase==='checking'){assert.ok(button.kids.includes('Checking…'));assert.ok(!nodes(page).some(n=>n.kids?.includes('Checking…')&&!['st-check-app','st-check-core'].includes(n.style?.id?.[0])),'The description never duplicates the checking caption');const commandsBefore=calls.length;button.events.on_click({},cx);assert.equal(calls.length,commandsBefore);}}}
      updateScenario={...baseUpdates,app:{...baseUpdates.app,updates:true},checks:true,checking:false,checked:1700000000};instance.asked=null;
      const settledUpdates=instance.updates(theme),aboutText=(page,title)=>JSON.stringify(nodes(settingRow(page,title).kids[0]).flatMap(n=>n.kids.filter(k=>typeof k==='string')));
      updateScenario={...updateScenario,checking:true,checked:null};const pendingUpdates=instance.updates(theme);
      for(const title of ['Herdr 0.1.13','herdr-core 0.1.0'])assert.equal(aboutText(pendingUpdates,title),aboutText(settledUpdates,title),'Refreshing retains the previous description even if native checked resets');
      updateScenario=null;instance.asked=oldAsked;
      const stepper=nodes(view).find(n=>n.kids?.some(k=>k?.style?.id?.[0]==='st-zoom-minus'));
      assert.equal(stepper.style.h[0],32);assertions++;
      const look=cache.get(path.join(root,'mods',name,'look.js')).namespace;
      assert.equal(look.isCustom('Custom'),true);assert.equal(look.isCustom('custom'),true);
      let watch;const watchCx={...cx,timer:{...cx.timer,every:(_ms,fn)=>{watch=fn;}}};
      const controller={section:'privacy',filter:'draft'};const closeCount=closed.length,commandCount=calls.length;
      look.watchSettingsLayout(controller,watchCx);shared.layout='main';watch(watchCx);
      assert.equal(closed.length,closeCount);assert.equal(calls.length,commandCount);assert.equal(controller.section,'privacy');assert.equal(controller.filter,'draft');
      assert.equal(look.liveTheme().background,'#101010','Resolve the current look, not the old overlay palette');shared.layout='Custom';assertions++;
      const pending=[];let cancelled=0;const paintCx={...cx,timer:{...cx.timer,after:(_ms,fn)=>{pending.push(fn);return {cancel:()=>cancelled++};}}};
      const ui=cache.get(path.join(root,'mods',name,'ui.js')).namespace;
      assert.equal(ui.U.dialogRadius,8);assert.equal(ui.dialogSurface(theme,element()).style.rounded[0],ui.U.dialogRadius,'Every skin-owned dialog shares the smaller shell radius');
      const nativeShell=ui.dialogSurface(theme,element(),{nativeFrame:true});for(const style of ['border_1','rounded','shadow_lg','bg'])assert.equal(nativeShell.style[style],undefined,'Native-framed palette cannot paint a second shell');
      const upMenu=ui.dropdown('gap-up',element(),element(),{open:true,above:true,onOpen:noop});
      const downMenu=ui.dropdown('gap-down',element(),element(),{open:true,above:false,onOpen:noop});
      assert.equal(upMenu.kids.at(-1).kids.at(-1).style.h[0],4,'Upward menu has only a 4px gap');
      assert.equal(downMenu.kids.at(-1).style.pt[0],4,'Downward menu has the same gap');
      assert.equal(ui.hotkey('Ctrl+Shift+P'),'ctrl-shift-p');assert.equal(ui.hotkey('alt-t'),'alt-t');assert.equal(ui.hotkey('F2'),'f2');
      assert.equal(ui.dropdownPlacement({y:750,height:32},264,1032,1.3).above,true);assert.equal(ui.dropdownPlacement({y:200,height:32},264,1032,1.3).above,false);assertions++;
      const paintOwner={};const painted=refreshes;look.refreshLook(paintOwner,paintCx);look.refreshLook(paintOwner,paintCx);pending.at(-1)();assert.equal(cancelled,1);assert.equal(refreshes,painted+1);assertions++;
      // Real async save logic, but only against an in-memory app home.
      if(scenario==='priority') {
        const tasks=[];const asyncCx={...cx,sleep:async()=>{},spawn:fn=>{const task=Promise.resolve().then(()=>fn(asyncCx));tasks.push(task);return task;}};
        const settle=async()=>{for(let start=0;start<tasks.length;) {const pending=tasks.slice(start);start=tasks.length;await Promise.all(pending);}};
        const live=new mod.namespace.default();live.init({},asyncCx);await settle();
        assert.equal(live.design.ready,true);assert.equal(writes.length,0,'Opening settings never writes preferences');assertions++;
        const design=cache.get(path.join(root,'mods',name,'design.js')).namespace;
        design.chooseAccent(live,'#8b5cf6',asyncCx);await settle();
        const custom=appPath+'/themes/custom-palette.json';assert.deepEqual(writes,[appPath+'/.customizations/palette.json',custom]);assert.equal(JSON.parse(memory.get(custom)).colors.solid,'#8b5cf6');
        assert.equal(JSON.parse(memory.get(custom)).customization,undefined,'Native themes reject unknown metadata fields');
        assert.equal(JSON.parse(memory.get(appPath+'/.customizations/palette.json')).theme,memory.get(custom));
        assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['app.theme',{name:'custom-palette'}]));assert.equal(memory.get(appPath+'/settings.json'),'{}');assertions++;
        design.chooseAccent(live,'#3b82f6',asyncCx);design.chooseAccent(live,'#f43f5e',asyncCx);await settle();
        assert.equal(JSON.parse(memory.get(custom)).colors.solid,'#f43f5e','Latest rapid selection wins');assertions++;
        design.chooseAccent(live,'#3b82f6',asyncCx,{custom:true});await settle();
        const savedMode=JSON.parse(memory.get(appPath+'/.customizations/palette.json'));assert.equal(savedMode.customization.custom_accent,true,'Custom mode persists even when its color equals a preset');
        const reloaded=new mod.namespace.default();reloaded.init({},asyncCx);await settle();assert.equal(reloaded.design.custom,true);assert.equal(reloaded.design.customColor,'#3b82f6');
        design.chooseAccent(live,'#1634d3',asyncCx,{custom:true});await settle();assert.equal(JSON.parse(memory.get(custom)).colors.solid,'#1634d3','Arbitrary custom hex colors use the same CAS save path');
        design.chooseAccent(live,'#f43f5e',asyncCx);await settle();assert.equal(live.design.custom,false);assert.equal(live.design.customColor,'#1634d3','Preset choices retain the last custom color');assertions++;
        const saved=memory.get(custom), count=writes.length;
        failWrite=true;design.chooseAccent(live,'#3b82f6',asyncCx);await settle();assert.equal(memory.get(custom),saved);assert.equal(writes.length,count);assert.match(live.design.error,/Stale/);failWrite=false;assertions++;
        memory.set(custom,'{"personal":true}');design.chooseAccent(live,'#8b5cf6',asyncCx);await settle();assert.equal(memory.get(custom),'{"personal":true}');assert.equal(writes.length,count);assert.match(live.design.error,/Refusing/);assertions++;
        shared.layout='main';const prior=calls.length;design.chooseAccent(live,'#20744a',asyncCx);await settle();assert.equal(calls.length,prior);assert.match(live.design.error,/Switch/);shared.layout='custom';assertions++;
        memory.set(custom,saved);
        const metadataPath=appPath+'/.customizations/palette.json', stableMeta=memory.get(metadataPath), interrupted=JSON.parse(stableMeta);
        interrupted.previous=saved;interrupted.previous_palette=interrupted.customization.palette;interrupted.previous_customization=interrupted.customization;
        interrupted.theme='{"pending":true}';interrupted.customization={version:1,palette:{...interrupted.previous_palette,accent:'#8b5cf6'}};
        memory.set(metadataPath,JSON.stringify(interrupted));const resumed=new mod.namespace.default();resumed.init({},asyncCx);await settle();
        assert.equal(resumed.design.ready,true);assert.equal(resumed.design.palette.accent,'#f43f5e','Interrupted two-file saves recover the still-current palette');assert.equal(resumed.design.custom,false,'Recovery restores the previous preset/custom mode too');assert.equal(writes.length,count);assertions++;
        memory.set(metadataPath,stableMeta);
      }
    }
    // Exercise hover-only code and self-opening sort menus, not just initial render.
    if(name==='custom-agents' && scenario!=='empty' && scenario!=='rail') {
      const row=nodes(view).find(n=>n.style?.id?.[0]==='ag-t0');assert.equal(row.events.on_hover,undefined);
      assert.ok(!nodes(view).some(n=>n.style?.id?.[0]==='pin-t0'));
      row.events.on_mouse_down({},cx);assert.equal(overlays.at(-1).props.tab,'agent');assert.equal(overlays.at(-1).props.target.terminal,'t0');assertions++;
      props={sortMenu:true,overlay:'test'};instance.render(cx);props={pane:'p0',target:{pane:'p0',terminal:'t0',id:'sp1'},tab:'pane',overlay:'test'};assertions++;
    }
    if(name==='custom-pane' && scenario!=='empty') {
      assert.equal(view.style.pl[0],10,'Pane icon rail aligns with tab icon after accounting for their outer insets');assert.equal(view.style.pr[0],12);assert.equal(view.kids[0].style.text_size[0],13);assert.equal(view.kids[0].style.size[0],16);
      const paneGlyph=nodes(view).find(n=>n.style?.asset?.[0]===panes[0].program?.icon);assert.ok(paneGlyph);assert.equal(paneGlyph.style.size[0],16);if(panes[0].program.tint)assert.equal(paneGlyph.style.text_color[0],theme.foreground,'Pane agent glyph matches the white sidebar/tab glyph');
      const hidden=byId('pane-actions');assert.ok(hidden.style.absolute,'Hidden toolbar never takes layout space');assert.equal(hidden.style.opacity[0],0);
      assert.equal(hidden.style.transition[0],'opacity');assert.equal(hidden.style.transition[1].duration,140);
      assert.ok(byId('ph-x-p0').style.disabled[0]);const noClose=calls.length;byId('ph-x-p0').events.on_click({},cx);assert.equal(calls.length,noClose);assertions++;
      assert.ok(!calls.some(c=>c[0]==='terminal.right_click'),'Startup never emits native command toasts');
      const tasks=[];const labelCx={...cx,sleep:async()=>{},spawn:fn=>{const p=Promise.resolve().then(()=>fn(labelCx));tasks.push(p);return p;}};
      const startup=new mod.namespace.default();startup.init({},labelCx);await Promise.all(tasks);
      assert.equal(JSON.stringify(coreCalls.at(-1)),JSON.stringify(['label','t0','herdr.right-click=menu','--json']));assertions++;
      const first=terminals.shift(), beforeLabels=coreCalls.filter(c=>c[0]==='label').length;labelFailures=1;
      let waited=0;const retryTasks=[];const retryCx={...cx,sleep:async()=>{if(++waited===1)terminals.unshift(first);},spawn:fn=>{const p=Promise.resolve().then(()=>fn(retryCx));retryTasks.push(p);return p;}};
      new mod.namespace.default().init({},retryCx);await Promise.all(retryTasks);
      assert.ok(waited>=2,'Waits for spawn and retries a transient core failure');assert.equal(coreCalls.filter(c=>c[0]==='label').length,beforeLabels+2);assertions++;
      assert.ok(!byId('pane-status'),'No duplicate pane spinner');assert.ok(!nodes(view).some(n=>n.style?.spin));assertions++;
      instance.hovered=true;view=instance.render(cx);assert.equal(nodes(view).filter(n=>n.style?.id?.[0]?.startsWith('ph-')).length,4);
      assert.ok(byId('pane-actions').style.absolute);assert.equal(byId('pane-actions').style.opacity[0],1);
      assert.equal(byId('ph-x-p0').style.size[0],24);assert.equal(byId('ph-x-p0').hoverStyle.style.bg[0],`${theme.foreground}0a`);assertions++;
      const filesModule=await load(path.join(root,'mods/custom-files/main.js'));await filesModule.evaluate();const panelView=new filesModule.namespace.default();panelView.init({},cx);const panelNodes=nodes(panelView.render(cx));const panelActions=panelNodes.find(n=>n.style?.id?.[0]==='files-actions');for(const attr of ['right','top','h','gap'])assert.deepEqual(byId('pane-actions').style[attr],panelActions.style[attr],'Pane and Files header tools share the exact same anchors');assert.equal(byId('ph-x-p0').kids[0].style.asset[0],panelNodes.find(n=>n.style?.id?.[0]==='files-close').kids[0].style.asset[0]);assertions++;
      const disabled=byId('ph-z-p0');assert.equal(disabled.style.opacity[0],0.35);assert.equal(disabled.style.tooltip,undefined);const oldCalls=calls.length;
      disabled.events.on_click({},cx);assert.equal(calls.length,oldCalls,'Single-pane zoom is disabled');assertions++;
      panes.push({...panes[0],pane:'split-peer',terminal:'split-peer',focused:false});
      view=instance.render(cx);const enabled=byId('ph-z-p0');assert.equal(enabled.style.opacity,undefined);
      enabled.events.on_click({},cx);assert.equal(calls.at(-1)[0],'pane.zoom');assertions++;panes.pop();
      panes[0].zoomed=true;view=instance.render(cx);assert.equal(byId('ph-z-p0').style.opacity,undefined,'Unzoom remains available');assertions++;panes[0].zoomed=false;
      const originalMod=panes[0].mod;panes[0].mod='custom-space-start';view=instance.render(cx);
      assert.deepEqual(byId('pane-name').kids,['Start']);
      const flag=nodes(view).find(n=>n.style?.asset?.[0]==='mods/custom-pane/racing-flag.svg');
      assert.ok(flag,'The Start header has a racing flag before its title');
      assert.equal(flag.style.size[0],16);assert.equal(flag.style.text_color[0],theme.foreground,'Flag matches the robot glyph geometry and color');
      const flagSvg=fs.readFileSync(path.join(root,'mods/custom-pane/racing-flag.svg'),'utf8');
      for(const attribute of ['viewBox="0 0 24 24"','stroke-width="2"','stroke-linecap="round"','stroke-linejoin="round"','fill="currentColor"'])assert.ok(flagSvg.includes(attribute),'Racing flag keeps the rounded outline and a recognizable checkered fill');
      if(originalMod===undefined)delete panes[0].mod;else panes[0].mod=originalMod;view=instance.render(cx);assertions++;
    }
    if(name==='custom-pane'&&scenario==='priority') {
      const saved={paneCwd:panes[0].cwd,program:panes[0].program,terminalCwd:terminals[0].cwd,labels:terminals[0].labels,named:spaces[0].named,tabNamed:spaces[0].tabs[0].named},savedProps=props,savedSort=shared['agents.sort'];
      panes[0].cwd='C:/Users/test';panes[0].program={...panes[0].program,name:'bash',key:'shell',shell:true,agent:false};
      terminals[0].cwd='C:/Users/test';terminals[0].labels={...(terminals[0].labels??{}),'custom.cwd':'D:/Git/a1','custom.home':'C:/Users/test'};
      spaces[0].named=false;spaces[0].tabs[0].named=false;props={pane:'p0',overlay:'owned-cwd-fixture'};
      const header=new mod.namespace.default();header.hovered=false;const headerNodes=nodes(header.render(cx));assert.ok(headerNodes.find(n=>n.style?.id?.[0]==='pane-folder').kids.includes('a1'));
      const directory=cache.get(path.join(root,'mods/custom-pane/directory.js')).namespace,displayed=directory.displaySpace(spaces[0]);assert.equal(displayed.name,'a1');
      const spaceMod=await load(path.join(root,'mods/custom-spaces/main.js'));await spaceMod.evaluate();const spaceList=new spaceMod.namespace.default();spaceList.pressed=null;assert.ok(nodes(spaceList.row({w:displayed,i:0,g:null,tree:null},theme)).some(n=>n.kids?.includes('a1')));
      const pickerMod=await load(path.join(root,'mods/custom-picker/main.js'));await pickerMod.evaluate();const jump=new pickerMod.namespace.default();jump.init({},cx);assert.equal(jump.world.spaces[0].name,'a1');assert.equal(jump.world.spaces[0].tabs[0].name,'Task 1','A reported agent keeps its session name even when foreground program metadata says shell');
      const tabsMod=await load(path.join(root,'mods/custom-tabs/main.js'));await tabsMod.evaluate();const tabBar=new tabsMod.namespace.default();tabBar.init({},cx);assert.ok(nodes(tabBar.render()).some(n=>n.kids?.includes('1')),'Unnamed shell tabs show their number, not the current folder');
      const agentMod=await load(path.join(root,'mods/custom-agents/main.js'));await agentMod.evaluate();shared['agents.sort']='priority';const agentList=new agentMod.namespace.default();agentList.init({},cx);const agentNodes=nodes(agentList.render(cx)),agentName=agentNodes.find(n=>n.style?.id?.[0]==='agent-name-t0');assert.deepEqual(agentName.kids,['Task 1'],'Live folder resolution does not prefix the agent session title');assert.ok(!nodes(agentNodes.find(n=>n.style?.id?.[0]==='ag-t0')).some(n=>n.kids?.includes('a1')));
      const menuMod=await load(path.join(root,'mods/custom-new-menu/main.js'));await menuMod.evaluate();const menu=new menuMod.namespace.default();menu.init({},cx);menu.launch({key:'terminal',name:'Terminal',available:true,run:null});assert.equal(calls.at(-1)[1].folder,'D:/Git/a1','Launch receives the real folder, not the stale core creation cwd');
      panes[0].cwd=saved.paneCwd;panes[0].program=saved.program;terminals[0].cwd=saved.terminalCwd;terminals[0].labels=saved.labels;spaces[0].named=saved.named;spaces[0].tabs[0].named=saved.tabNamed;props=savedProps;shared['agents.sort']=savedSort;assertions++;
    }
  }
}
console.log(`PASS: ${assertions} deferred render/hover cases across priority, grouped, rail and empty states`);
