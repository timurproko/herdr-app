import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {realUi} from './support/panel-kit.mjs';
function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{n.kids.push(c);return p;}:k==='children'?c=>{n.kids.push(...c);return p;}:(...a)=>{n.attrs[k]=a;return p;}});}
const bulbs=n=>n&&typeof n==='object'?Number(n.attrs?.bulb?.[0]===true)+(n.kids??[]).reduce((sum,k)=>sum+bulbs(k),0):0;
const palette={working:'#5599dd',blocked:'#dd5555'};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
// A collapsible's body stays laid out while closed (it is measured, to slide like Usage's): closed is a 0-tall clip.
const clipH=(tree,id)=>find(tree,id+'-clip')?.attrs?.h?.[0];
const state={},jobs=[],actions=[];
const cx={notify(){},stop_propagation(){},focus_handle:()=>({focus(){}}),spawn:fn=>jobs.push(fn)};
const {ui,registry}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>[],panes:()=>[],terminals:()=>[],focused:()=>null,settings:()=>({zoom:1})},modules:{
 'plugins-ui.js':'src/features/settings/plugins-ui.js','reorder.js':'src/ui/reorder.js','settings-kit.js':'src/ui/settings-kit.js','modal-layout.js':'src/ui/modal-layout.js','space-color-state.js':{currentSpaceColor(){}},'directory.js':{spaceDirectory:()=>({cwd:null})},
 'machine-picker.js':{machinePicker:element},'folder-browser.js':{folderBrowser:element,openBrowser(){},closeBrowser(){}},
 'gpui-kit':{div:element,svg:element,image:element},'gpui-base':{Popup:{new:(id,trigger)=>element().id(id).child(trigger)},h_flex:element,v_flex:element,Textarea:{new:element},TextareaState:{new:o=>{let value=o?.value??'';return {on(){},value:()=>value,set_value:v=>{value=v;}};}},Checkbox:{new:id=>element().id(id)},Scrollbar:{vertical:id=>element().target(id)},Input:{new:element},InputState:{new:o=>{let value=o.value;return {on(){},value:()=>value,set_value:v=>{value=v;}};}}},
 'ui.js':{chevronSlot:realUi(element).chevronSlot,iconButton:(_t,o)=>element().id(o.id).available(o.available??true).on_click(o.onClick),menuRow:realUi(element).menuRow,collapsible:realUi(element).collapsible,settingsRow:realUi(element).settingsRow,SETTINGS_ROW:32,searchField:(_t,state,{id})=>element().id(id).searchComponent(true).state(state),menuSurface:(_t,e)=>e,dropdown:(id,trigger,content,{open,onOpen})=>element().id(id).on_open_change(onOpen).child(trigger).when(open,e=>e.child(content)),U:{control:28,field:32,font:13,meta:12,radius:6,gutter:12,statusSize:7},slot:x=>x,emptyState:(_t,{id,title='No results',icon='search'})=>element().id(id).emptyComponent(true).asset(icon).child(title),description:(_t,text)=>element().child(text),control:(_t,x=element())=>x,itemHover(){},spinner:color=>element().bulb(true).text_color(color),chevron:element,dialogScrollbar:x=>x,
  button:(_t,id,label,click,options={})=>element().id(id).child(label).on_click(click).primary(options.primary??false).disabled(options.enabled===false)},
},entry:"export * as ui from './plugins-ui.js';export * as registry from './plugins.js';"});
// Requirement status labels and counts use the same generic renderer in a card and detail page.
for(const target of [null,'crew']) {
  const notice={heading:element,toggle:(_t,id,on)=>element().id(id).pressed(on)};
  ui.initPlugins(notice,cx,target);notice.pluginOpen['crew-requirements']=true;
  const update={id:'crew',label:'Crew tool',status:'missing',statusLabel:'Outdated',detail:'0.12.1 · 372f8b608853',fix:{label:'Update',run:async()=>{}}};
  const optional={id:'jq',label:'jq',status:'recommended'};
  const draw=items=>{notice.pluginChecks.crew={loading:false,items};return ui.pluginsPage(notice,palette);};
  for(const items of [[update],[update,optional]]) {
    const tree=draw(items),row=find(tree,'st-plugin-crew-crew-status-rail'),header=find(tree,'st-plugin-crew-requirements-status-rail');
    assert.deepEqual(words(row),['Update','Outdated']);
    assert.equal(row.kids[1].kids[0].attrs.text_color[0],palette.blocked,'Same non-optional unmet colour');
    assert.equal(row.kids[1].kids[0].attrs.w_full.length,0,'Same badge geometry');
    assert.deepEqual(words(header),['Check','1 to fix'],'Optional tools do not dilute the attention count');
    assert.equal(header.kids[1].kids[0].attrs.text_color[0],palette.blocked);
  }
  assert.deepEqual(words(find(draw([optional]),'st-plugin-crew-jq-status-rail')),['Optional'],'Ordinary row labels retain their defaults');
  assert.deepEqual(words(find(draw([optional]),'st-plugin-crew-requirements-status-rail')),['Check','1 optional']);
  assert.deepEqual(words(find(draw([{...update,status:'ready',statusLabel:undefined,fix:null}]),'st-plugin-crew-crew-status-rail')),['Ready']);
}
const toggle=(_t,id,on,click)=>element().id(id).pressed(on).on_click(click);
const button=(_t,id,label,click,options={})=>element().id(id).child(label).on_click(click).disabled(options.enabled===false);
const git=registry.pluginById('git'),view={heading:element,toggle,button,handle:{focus(){}}};ui.initPlugins(view,cx,'git');view.pluginOpen['git-requirements']=true;
// Requirements never open by themselves, whatever needs fixing: the person opens them.
{
  const closed={heading:element,toggle};ui.initPlugins(closed,cx,'git');
  closed.pluginChecks.git={loading:false,items:[{id:'node',label:'Node',status:'missing'}]};
  assert.equal(clipH(ui.pluginsPage(closed,palette),'st-plugin-git-requirements'),0,'Requirements start collapsed even with something missing');
  find(ui.pluginsPage(closed,palette),'st-plugin-git-requirements-toggle').attrs.on_click[0]({},cx);
  assert.ok(clipH(ui.pluginsPage(closed,palette),'st-plugin-git-requirements')>0,'They open on click');
}
// Ordinary catalog/setup entry starts Repositories collapsed, including on re-entry.
for(const requested of [null,'git']){
  const ordinary={heading:element,toggle};ui.initPlugins(ordinary,cx,requested);
  for(let entry=0;entry<2;entry++){
    const tree=ui.pluginsPage(ordinary,palette);
    assert.equal(clipH(tree,'st-plugin-git-repository'),0,'Repositories start collapsed');
    assert.ok(find(tree,'st-plugin-refresh-git-repository'),'Check remains available while collapsed');
    find(tree,'st-plugin-git-repository-toggle').attrs.on_click[0]({},cx);
    assert.ok(clipH(ui.pluginsPage(ordinary,palette),'st-plugin-git-repository')>0,'Repositories expand on click');
    ui.initPlugins(ordinary,cx,requested);
  }
}
// Ephemeral deep links open Add with the search filled: no settings or drafts, one read-only scan.
{
  const before=JSON.stringify(state),beforeJobs=jobs.length;
  const targeted={heading:element,toggle};
  ui.initPlugins(targeted,cx,'git',{section:'repository',search:' owner/firstmate '});
  assert.equal(targeted.pluginOpen['git-requirements'],false);
  assert.equal(targeted.pluginOpen['git-repository'],true);
  assert.equal(targeted.pluginSearches['git:repository'].value(),'owner/firstmate');
  assert.equal(targeted.listPicker?.key,'git:repository','A repository link opens Add');assert.equal(jobs.length,beforeJobs+1,'Only the candidate scan is queued');jobs.pop();
  const repoDef=git.prerequisites.find(p=>p.id==='repository');
  targeted.pluginChecks.git={loading:false,items:[{id:'node',label:'Node',status:'missing'},{...repoDef,status:'ready',statusLabel:'0 added',usable:true,rows:[]}]};
  Object.assign(targeted.listPicker,{loading:false,items:[{id:'owner/firstmate',label:'owner/firstmate'},{id:'owner/other',label:'owner/other'}],add(){assert.fail('Opening a link cannot change hooks');}});
  const tree=ui.pluginsPage(targeted,palette);
  assert.equal(clipH(tree,'st-plugin-git-requirements'),0,'Requirements stay collapsed even with missing prerequisites');
  assert.ok(clipH(tree,'st-plugin-git-repository')>0);
  assert.ok(find(tree,'st-plugin-list-git-repository-item-0'));assert.equal(find(tree,'st-plugin-list-git-repository-item-1'),undefined,'The link filters the popup to its repository');
  targeted.pluginSearches['git:repository'].set_value('other');ui.pluginsPage(targeted,palette);
  assert.equal(targeted.pluginSearches['git:repository'].value(),'other','Renders do not overwrite the user’s search');
  for(const search of [null,{},'x'.repeat(201),'owner/repo\n']){
    const invalid={};ui.initPlugins(invalid,cx,'git',{section:'repository',search});assert.equal(invalid.pluginSearches['git:repository'].value(),'');
  }
  for(const requested of ['git','unknown-plugin']){
    const invalid={};ui.initPlugins(invalid,cx,requested,{section:'not-a-section',search:'must-not-apply'});
    assert.equal(invalid.pluginSearches['git:repository'].value(),'');
    assert.equal(invalid.pluginOpen['git-requirements'],undefined,'Requirements stay closed until the person opens them');
  }
  assert.equal(JSON.stringify(state),before);assert.equal(jobs.length,beforeJobs);
}
const render=()=>element().child(ui.pluginsPage(view,palette))
 .when(Boolean(view.pluginConfirm),el=>el.child(ui.pluginConfirmation(view,{})));
const click=id=>{const n=find(render(),id);assert.ok(n,id);n.attrs.on_click[0]({},cx);};
const checked=(id,value)=>{const n=find(render(),id);assert.ok(n,id);assert.equal(n.attrs.on_click,undefined,'Native Checkbox is controlled by on_change, not on_click');assert.ok(n.attrs.on_change);n.attrs.on_change[0](value,cx);};
const install={id:'install-test',label:'Tools',status:'missing',fix:{label:'Install',run:async()=>actions.push('install')}};
const keys={id:'keys-test',label:'Keys',status:'missing',fix:{label:'Create',run:async()=>actions.push('keys')}};
const configure={id:'relay',label:'Relay',status:'missing',fix:{label:'Configure',manual:true,primary:true,requiresEnabled:true,run:async context=>{actions.push('configure');assert.equal(context.setSetting('relay','https://relay.example',''),true);}}};
const confirm={id:'confirm-test',label:'Other action',status:'missing',fix:{label:'Connect',manual:true,confirm:{title:'Approve action?'},run:async()=>actions.push('connect')}};
const choose={id:'account-test',label:'Account',status:'ready',selection:{key:'account',options:[['a'.repeat(32),'Personal'],['b'.repeat(32),'Work']]}};
const seed=()=>{jobs.length=0;view.pluginChecks.git={loading:false,items:[install,keys,configure,confirm,choose]};};seed();
click('st-plugin-fix-git-confirm-test');assert.equal(jobs.length,0);click('st-plugin-confirm-git-cancel');assert.equal(view.pluginConfirm,null);
click('st-plugin-fix-git-relay');assert.equal(view.pluginConfirm,null);assert.equal(jobs.length,1);await jobs.shift()(cx);
assert.deepEqual(actions,['configure']);assert.equal(registry.pluginSetting(git,'relay'),'https://relay.example');assert.equal(view.pluginInputs['git-relay'],undefined);
seed();click('st-plugin-git-fix-all');await jobs.shift()(cx);assert.deepEqual(actions,['configure','install','keys'],'Install all never starts remote setup');
seed();find(render(),'st-plugin-git-account-test-selection-popup').attrs.on_open_change[0](true,cx);click(`st-plugin-git-account-test-selection-${'b'.repeat(32)}`);assert.equal(registry.pluginSetting(git,'account'),'b'.repeat(32));
const context=ui.prerequisiteContext(git);assert.equal(context.setSetting('relay','https://new.example','stale'),false);assert.equal(context.setSetting('privateSecret','must-not-save'),false);assert.equal(ui.prerequisiteContext(git,()=>false).setSetting('relay','https://closed.example'),false);
seed();const staleConfigure=find(render(),'st-plugin-fix-git-relay');registry.setPluginEnabled(git,false);staleConfigure.attrs.on_click[0]({},cx);assert.equal(jobs.length,0);registry.setPluginEnabled(git,true);
// Update → "Updating" → the new status: when the action ends, the row keeps its spinner and
// busy button until the re-check answers; it never flashes its old status and button.
{
  view.pluginSettling={};jobs.length=0;
  const real=git.prerequisites.find(pre=>!pre.section),id=real.id,key=`git:${id}`;
  const update={...real,status:'missing',statusLabel:'Outdated',fix:{label:'Update',statusLabel:'Updating',run:async()=>actions.push('update')}};
  view.pluginChecks.git={loading:false,items:[update]};
  const text=node=>JSON.stringify(node),rail=()=>text(find(render(),`st-plugin-git-${id}-status-rail`)??{});
  click(`st-plugin-fix-git-${id}`);assert.ok(rail().includes('Updating'),'Running: Updating');
  await jobs.shift()(cx);assert.equal(view.pluginFixing,null);assert.equal(view.pluginSettling[key],true,'The ended action waits for its re-check');
  assert.ok(jobs.length>=1,'The fix queued a re-check');
  assert.ok(rail().includes('Updating')&&rail().includes('Update…'),'Between the action and the re-check the row still reads Updating, with the busy button');
  const before=jobs.length;find(render(),`st-plugin-fix-git-${id}`)?.attrs.on_click?.[0]({},cx);assert.equal(jobs.length,before,'The button cannot be pressed again meanwhile');
  while(jobs.length)await jobs.shift()(cx);
  assert.equal(view.pluginSettling[key],undefined,'The answered re-check ends the settling');
  assert.ok(!rail().includes('Updating'),'Then the row shows its checked status');
  jobs.length=0;
}

// CI automation keeps compact copy without changing keys or saved settings.
assert.equal(git.settings.find(s=>s.key==='autoFixCI').label,'Auto-fix pull requests');
assert.equal(git.settings.find(s=>s.key==='autoFixCI').about,'Message the linked agent when its pull request needs a fix, even when Herdr is closed.');
assert.equal(git.prerequisites.some(p=>p.id==='ci-monitor'),false,'No separate background status, Check or installation UI');
assert.equal(git.settings.find(s=>s.key==='ciMonitorMachine').hidden,true);
assert.equal(git.settings.find(s=>s.key==='ciMonitorRepositories').hidden,true);
assert.equal(git.settings.find(s=>s.key==='ciFixStates').label,'Send when agent is');
assert.equal(git.settings.find(s=>s.key==='ciFixStates').about,'Only checked states receive messages. Blocked agents are never messaged.');
assert.equal(git.settings.find(s=>s.key==='ciFixMessage').label,'CI tests failed');
assert.equal(git.settings.find(s=>s.key==='ciFixMessage').toggle,'ciFixEnabled','The message row has its own switch');
assert.equal(git.settings.find(s=>s.key==='conflictFixMessage').label,'Merge conflicts');
assert.equal(JSON.stringify(git.settings.find(s=>s.key==='conflictFixMessage').tags.map(([tag])=>tag)),JSON.stringify(['{url}','{base}','{head}','{files}']));
assert.equal(git.settings.find(s=>s.key==='ciFixMessage').type,'longtext','The full message is edited on its own page');
assert.equal(JSON.stringify(git.settings.find(s=>s.key==='ciFixMessage').tags.map(([tag])=>tag)),JSON.stringify(['{url}','{runUrl}','{head}','{runs}']),'Every placeholder is explained');
assert.doesNotMatch(git.settings.find(s=>s.key==='ciFixMessage').about,/[{}]/,'The row description is plain language');
assert.equal(registry.pluginSetting(git,'autoFixCI'),false);
assert.match(registry.pluginSetting(git,'ciFixMessage'),/^CI failed on \{url\} at commit \{head\}\.\nRead the failed job logs[^]*\nFailed runs:\n\{runs\}$/);
click('st-plugin-git-settings-toggle');
assert.equal(find(render(),'st-plugin-git-autoFixCI').attrs.pressed[0],false);
click('st-plugin-git-autoFixCI');assert.equal(registry.pluginSetting(git,'autoFixCI'),true);
click('st-plugin-git-autoFixCI');assert.equal(registry.pluginSetting(git,'autoFixCI'),false);
// Each message row carries its own switch; flipping it never opens the message page.
for(const [row,key] of [['ciFixMessage','ciFixEnabled'],['conflictFixMessage','conflictFixEnabled']]){
  click(`st-plugin-git-${row}-switch`);assert.equal(registry.pluginSetting(git,key),false,`${row} off`);assert.equal(ui.pluginTextOpen(view),false,'The switch does not open the page');
  click(`st-plugin-git-${row}-switch`);assert.equal(registry.pluginSetting(git,key),true,`${row} on`);
}
{
  // Message: a row that opens a page; the full text is a draft until Apply.
  const full=registry.pluginSetting(git,'ciFixMessage'),area=view.pluginTextareas['git-ciFixMessage'];
  assert.equal(view.pluginInputs['git-ciFixMessage'],undefined,'No inline single-line field');
  assert.equal(ui.pluginTextOpen(view),false);click('st-plugin-git-ciFixMessage');assert.equal(ui.pluginTextOpen(view),true);
  assert.equal(area.state.value(),full,'The page shows the whole message');assert.equal(ui.pluginTextChanged(view),false);
  const actions=()=>element().child(ui.pluginTextActions(view,palette)),press=id=>find(actions(),id).attrs.on_click[0]({},cx);
  {const page=element().child(ui.pluginTextPage(view,palette));assert.ok(find(page,'st-plugin-git-ciFixMessage-tags'),'Tags are listed under the text');
   assert.equal(find(page,'st-plugin-git-ciFixMessage-frame').attrs.h[0],168,'Same field size as feedback');assert.equal(find(page,'st-plugin-git-ciFixMessage-count').kids[0],`${[...full].length} / 4000`,'The counter shows the limit');
   let typed=null;area.state.replace=v=>{typed=v;};area.state.focus=()=>{};find(page,'st-plugin-git-ciFixMessage-tag-3').attrs.on_click[0]({},cx);assert.equal(typed,'{runs}','A tag click types it at the cursor');}
  area.state.set_value(full+'\nAlso run the tests.');assert.equal(ui.pluginTextChanged(view),true);
  press('st-plugin-text-discard');assert.equal(area.state.value(),full,'Discard restores the saved text');assert.equal(registry.pluginSetting(git,'ciFixMessage'),full);
  area.state.set_value('Fix {runs} now {nope}');assert.equal(find(actions(),'st-plugin-text-apply').attrs.disabled[0],true,'An invalid message cannot be applied');
  press('st-plugin-text-apply');assert.equal(registry.pluginSetting(git,'ciFixMessage'),full);
  area.state.set_value('x'.repeat(4001));assert.equal(find(element().child(ui.pluginTextPage(view,palette)),'st-plugin-git-ciFixMessage-count').attrs.text_color[0],palette.blocked,'Over the limit, the counter turns red');assert.equal(find(actions(),'st-plugin-text-apply').attrs.disabled[0],true);
  area.state.set_value('Fix {runUrl} for {url}.\r\n{runs}');press('st-plugin-text-apply');
  assert.equal(registry.pluginSetting(git,'ciFixMessage'),'Fix {runUrl} for {url}.\n{runs}','Apply saves the draft with plain newlines');assert.equal(ui.pluginTextChanged(view),false);
  registry.setPluginSetting(git,'ciFixMessage','Analyze failed CI run {runUrl} for {url}. Fix the cause; Push.');ui.closePluginTextPage(view);click('st-plugin-git-ciFixMessage');
  assert.equal(area.state.value(),full,'The old one-line default opens as the full default');
  registry.setPluginSetting(git,'ciFixMessage',full);ui.closePluginTextPage(view);assert.equal(ui.pluginTextOpen(view),false);
}
assert.equal(view.pluginInputs['git-relay'],undefined,'Generated relay URLs remain read-only');
// Multi-select opens a native-style popup and stays open after each checkbox.
const statesId='st-plugin-git-ciFixStates',statesKey='git-ciFixStates-multi';
assert.deepEqual(Array.from(registry.pluginSetting(git,'ciFixStates')),['idle','done']);
assert.equal(find(render(),`${statesId}-error`),undefined,'Options are hidden while closed');
find(render(),`${statesId}-popup`).attrs.on_open_change[0](true,cx);
for(const status of ['idle','done','error','working'])assert.ok(find(render(),`${statesId}-${status}`));
assert.equal(find(render(),`${statesId}-blocked`),undefined,'Blocked is not offered');
checked(`${statesId}-error`,true);
assert.deepEqual(Array.from(registry.pluginSetting(git,'ciFixStates')),['idle','done','error']);
assert.equal(view.pluginOpen[statesKey],true,'Checking does not close the popup');
checked(`${statesId}-working`,true);checked(`${statesId}-idle`,false);
assert.deepEqual(Array.from(registry.pluginSetting(git,'ciFixStates')),['done','error','working']);
const staleState=find(render(),`${statesId}-idle`);
registry.setPluginEnabled(git,false);staleState.attrs.on_change[0](true,cx);
assert.equal(registry.pluginSetting(git,'ciFixStates').includes('idle'),false,'Disabled stale checkboxes cannot save');
registry.setPluginEnabled(git,true);
view.pluginClosed=true;staleState.attrs.on_change[0](true,cx);view.pluginClosed=false;
assert.equal(registry.pluginSetting(git,'ciFixStates').includes('idle'),false,'Closed views cannot save');
find(render(),`${statesId}-popup`).attrs.on_open_change[0](false,cx);
staleState.attrs.on_change[0](true,cx);assert.equal(registry.pluginSetting(git,'ciFixStates').includes('idle'),false,'Dismissed popup cannot save');
find(render(),`${statesId}-popup`).attrs.on_open_change[0](true,cx);
for(const status of ['done','error','working'])checked(`${statesId}-${status}`,false);
assert.deepEqual(Array.from(registry.pluginSetting(git,'ciFixStates')),[],'None is a valid explicit selection');
assert.ok(JSON.stringify(find(render(),statesId).kids).includes('None'));
registry.setPluginSetting(git,'ciFixStates',['idle','done']);
find(render(),`${statesId}-popup`).attrs.on_open_change[0](false,cx);
click('st-plugin-git-settings-toggle');
// A list section fixture: the Git repositories as their check returns them.
const managed={...git.prerequisites.find(p=>p.id==='repository'),status:'ready',usable:true,rows:[{id:'owner/one',label:'owner/one'},{id:'owner/two',label:'owner/two'}]};
const row=i=>`st-plugin-list-git-repository-row-${i}`;
const seedList=()=>{jobs.length=0;view.pluginChecks.git={loading:false,items:[managed]};};seedList();
click('st-plugin-git-repository-toggle');
const sectionTree=render(),header=find(sectionTree,'st-plugin-git-repository-toggle'),check=find(sectionTree,'st-plugin-refresh-git-repository');const rail=find(sectionTree,'st-plugin-git-repository-status-rail');assert.equal(header.kids.at(-2),rail,'The summary and Check, then the chevron at the right edge like Usage');assert.notEqual(header.kids.at(-1),rail);assert.equal(rail.kids[0],check);assert.equal(rail.kids[1].attrs.w[0],72);assert.ok(rail.kids[1].kids[0].kids.includes('Ready'));assert.equal(rail.kids[1].kids[0].attrs.w[0],72,'Ready and All ready share the full status width');assert.ok(check.kids.includes('Check'));assert.equal(check.attrs.w[0],80);assert.equal(header.attrs.px[0],8,'Header inset matches the body inset inside the shared panel');assert.ok(find(sectionTree,'st-plugin-git-repository-panel'),'Header and body share one collapsible panel');
view.pluginChecks.git.loading=true;assert.ok(find(render(),'st-plugin-refresh-git-repository').kids.includes('Check'));assert.equal(find(render(),'st-plugin-refresh-git-repository').attrs.disabled[0],true);view.pluginChecks.git.loading=false;
// All plugin headers use action/status rails and display only their version.
view.pluginTarget=null;view.pluginChecks={};const catalog=render();for(const plugin of registry.PLUGINS){assert.equal(find(catalog,`st-plugin-version-${plugin.id}`).kids[0],plugin.version);if(!plugin.prerequisites?.length)continue;const id=`st-plugin-${plugin.id}-requirements-status-rail`,r=find(catalog,id);assert.ok(r,id);assert.equal(r.attrs.gap[0],10);assert.equal(r.kids[1].attrs.w[0],72);assert.ok(find(catalog,`st-plugin-${plugin.id}-recheck`).kids.includes('Check'));}
view.pluginTarget='git';view.pluginChecks.git={loading:true};const loadingTree=render(),topRail=find(loadingTree,'st-plugin-git-requirements-status-rail');for(const item of git.prerequisites.filter(p=>!p.section)){const r=find(loadingTree,`st-plugin-git-${item.id}-status-rail`);assert.equal(r.kids[0].attrs.w[0],80);assert.equal(r.kids[1].attrs.w[0],topRail.kids[1].attrs.w[0]);assert.equal(r.attrs.gap[0],topRail.attrs.gap[0]);}
assert.equal(bulbs(loadingTree),1+git.prerequisites.filter(p=>p.section).length,'Global checks mark main and section headers, not every requirement');for(const item of git.prerequisites.filter(p=>!p.section))assert.equal(bulbs(find(loadingTree,`st-plugin-git-${item.id}-status-rail`)),0);assert.equal(topRail.kids[1].kids[0].attrs.text_color[0],palette.working,'Checking status text is blue');const working=topRail.kids[1].kids[0];assert.equal(working.kids[0].attrs.left[0],0,'Bulb leads the checking text');assert.equal(working.kids[0].attrs.right,undefined);assert.equal(working.kids[1].attrs.pl[0],11);assert.ok(working.kids[1].kids.includes('Checking'));
const sizeOf=id=>{const b=find(render(),id);return [b.attrs.w[0],b.attrs.min_w[0],b.attrs.max_w[0],b.attrs.h[0],b.attrs.min_h[0],b.attrs.max_h[0],Boolean(b.attrs.flex_none),Boolean(b.attrs.whitespace_nowrap)];};
view.pluginTarget=null;view.pluginChecks={};for(const plugin of registry.PLUGINS){if(!plugin.prerequisites?.length)continue;const id=`st-plugin-${plugin.id}-recheck`,normal=sizeOf(id);assert.deepEqual(normal,[80,80,80,24,24,24,true,true]);view.pluginChecks[plugin.id]={loading:true,checkingTarget:'requirements'};assert.deepEqual(sizeOf(id),normal,'Check never changes size while disabled');assert.ok(find(render(),id).kids.includes('Check'));view.pluginChecks[plugin.id]={loading:false,items:[]};}
view.pluginTarget='git';view.pluginChecks.git={loading:false,items:[managed]};jobs.length=0;click('st-plugin-refresh-git-repository');assert.equal(view.pluginChecks.git.groups.repository.target,'repository');assert.equal(bulbs(render()),0,'A warm section keeps its confirmed badge while Check is busy');click('st-plugin-refresh-git-repository');assert.equal(jobs.length,1,'Double-click cannot launch another check before repaint');
view.pluginChecks.git={loading:false,items:git.prerequisites.map(p=>({...p,status:'ready'}))};view.pluginFixing='git:node';assert.equal(bulbs(render()),1,'An individually running fix shows a bulb only on that row');view.pluginFixing=null;view.pluginChecks.git.loading=true;view.pluginChecks.git.checkingTarget='node';assert.equal(bulbs(render()),0,'Post-action reads retain known badges while controls stay busy');assert.equal(bulbs(find(render(),'st-plugin-git-requirements-status-rail')),0);view.pluginChecks.git.checkingTarget='requirements';const cachedCheck=render();assert.equal(bulbs(cachedCheck),0);assert.equal(bulbs(find(cachedCheck,'st-plugin-git-repository-status-rail')),0,'Repositories retain confirmed Ready while Check provides refresh activity');for(const item of git.prerequisites.filter(p=>!p.section))assert.ok(find(cachedCheck,`st-plugin-git-${item.id}-status-rail`).kids[1].kids[0].kids.includes('Ready'),'Previously checked rows retain their result during a main check');
// Real scoped check scheduling, with deferred synthetic checks: no host IO.
const originalPrerequisites=git.prerequisites;
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
let waits={requirements:deferred(),repository:deferred()};const runs=[];
try{
  git.prerequisites=originalPrerequisites.filter(pre=>pre.id!=='ci-monitor').map(pre=>({...pre,async check(context){const group=pre.section?pre.id:'requirements',gate=waits[group];runs.push({id:pre.id,group,context});return gate.promise;}}));
  ui.initPlugins(view,cx,'git');view.pluginOpen['git-requirements']=true;click('st-plugin-git-repository-toggle');jobs.length=0;ui.reloadPlugins(view,cx,'git');assert.equal(jobs.length,2,'Initial main and section checks are separate jobs');
  const mainJob=jobs.shift()(cx),repoJob=jobs.shift()(cx);
  assert.equal(new Set(runs.filter(r=>r.group==='requirements').map(r=>r.context)).size,1,'Main checks retain within-group memoization');assert.notEqual(runs[0].context,runs.at(-1).context,'Repository work cannot wait on the main context memo');
  waits.requirements.resolve({status:'ready',detail:'Main first'});await mainJob;
  assert.equal(find(render(),'st-plugin-git-recheck').attrs.disabled[0],false,'Main re-enables while repositories are still loading');assert.equal(find(render(),'st-plugin-refresh-git-repository').attrs.disabled[0],true);assert.equal(find(render(),row(0)),undefined,'No rows while the list is still loading');
  waits.requirements=deferred();const beforeRepoRuns=runs.filter(r=>r.group==='repository').length;click('st-plugin-git-recheck');const mainAgain=jobs.shift()(cx);assert.equal(runs.filter(r=>r.group==='repository').length,beforeRepoRuns,'Main Check never calls the repository check');waits.requirements.resolve({status:'ready',detail:'Main second'});await mainAgain;
  waits.repository.resolve({...managed,detail:'Repository first'});await repoJob;assert.ok(find(render(),row(0)));assert.ok(view.pluginChecks.git.items.find(p=>p.id==='node').detail==='Main second','Late repository results preserve newer main results');
  waits.requirements=deferred();waits.repository=deferred();click('st-plugin-git-recheck');const slowMain=jobs.shift()(cx);click('st-plugin-refresh-git-repository');const fastRepo=jobs.shift()(cx);waits.repository.resolve({...managed,detail:'Repository second'});await fastRepo;
  assert.equal(find(render(),'st-plugin-refresh-git-repository').attrs.disabled[0],false,'Repository Check re-enables while main is still loading');assert.ok(find(render(),row(0)),'Independent main checking does not hide the list');
  waits.requirements.resolve({status:'error',detail:'Main failed independently'});await slowMain;assert.equal(view.pluginChecks.git.items.find(p=>p.id==='repository').detail,'Repository second','Main errors cannot overwrite repository results');
  waits.repository=deferred();ui.reloadPlugins(view,cx,'git','repository');const oldGate=waits.repository,oldRepo=jobs.shift()(cx);waits.repository=deferred();ui.reloadPlugins(view,cx,'git','repository');const newRepo=jobs.shift()(cx);waits.repository.resolve({...managed,detail:'Newest repository'});await newRepo;oldGate.resolve({...managed,detail:'Stale repository'});await oldRepo;assert.equal(view.pluginChecks.git.items.find(p=>p.id==='repository').detail,'Newest repository','Superseded section results cannot win');
  waits.repository=deferred();ui.reloadPlugins(view,cx,'git','repository');const closedRepo=jobs.shift()(cx),beforeClose=view.pluginChecks.git;view.pluginClosed=true;waits.repository.resolve({...managed,detail:'Closed dialog'});await closedRepo;assert.equal(view.pluginChecks.git,beforeClose,'Closed dialog completions cannot publish');
}finally{git.prerequisites=originalPrerequisites;view.pluginClosed=false;}
// Repositories: a top row with Add and the account dropdown, then the added rows. Only
// the Add popup scans; adding or removing re-checks the section.
{
  const repoDef=git.prerequisites.find(p=>p.id==='repository'),saved=git.prerequisites,calls=[];
  let found=deferred();
  const list={...repoDef.list,candidates:async()=>{calls.push('scan');return found.promise;},remove:async(_cx,id)=>{calls.push(['remove',id]);}};
  git.prerequisites=saved.map(p=>p.id==='repository'?{...p,list}:p);
  try{
    ui.initPlugins(view,cx,'git');click('st-plugin-git-repository-toggle');jobs.length=0;
    const listed={...repoDef,list,status:'ready',statusLabel:'1 added',usable:true,rows:[{id:'owner/one',label:'owner/one'}],
      selection:{key:'githubAccount',label:'GitHub account',value:'fixture-user',options:[['fixture-user','fixture-user'],['other-user','other-user']]}};
    view.pluginChecks.git={loading:false,items:[listed]};
    let tree=render();
    assert.ok(find(tree,'st-plugin-list-git-repository-where'),'Repositories open with the account row');
    assert.ok(find(tree,'st-plugin-list-git-repository-add').kids.includes('Add repo'));
    {const where=find(tree,'st-plugin-list-git-repository-where'),i=id=>where.kids.findIndex(k=>find(k,id));assert.ok(i('st-plugin-git-repository-selection')<i('st-plugin-list-git-repository-add'),'The dropdown comes before Add');
     const rail=find(where,'st-plugin-list-git-repository-where-rail'),rowRail=find(tree,'st-plugin-list-git-repository-row-0-rail');assert.ok(find(rail,'st-plugin-list-git-repository-add'),'Add sits in the rail column');assert.equal(rail.attrs.w[0],rowRail.attrs.w[0],'Add and Remove share one column, flush at the right edge');assert.equal(rail.kids.length,1,'No reserved status column after Add');assert.equal(find(tree,'st-plugin-list-git-repository-add').attrs.w[0],80,'Add is as wide as Check and Remove');}
    assert.ok(find(tree,'st-plugin-git-repository-selection'),'The account is a dropdown beside Add');
        assert.equal(find(tree,'st-plugin-list-git-repository-remove-0'),undefined,'Remove is hidden until the row is hovered');
    find(tree,'st-plugin-list-git-repository-row-0').attrs.on_hover[0](true,cx);tree=render();
    assert.ok(find(find(tree,'st-plugin-list-git-repository-row-0'),'st-plugin-list-git-repository-remove-0'),'A hovered repository shows Remove');assert.ok(find(tree,'st-plugin-list-git-repository-row-0').attrs.bg,'and highlights');
    find(tree,'st-plugin-list-git-repository-row-0').attrs.on_hover[0](false,cx);tree=render();
    assert.equal(calls.length,0,'Rendering never scans');assert.equal(jobs.length,0);
    find(tree,'st-plugin-list-git-repository-add-popup').attrs.on_open_change[0](true,cx);
    assert.equal(jobs.length,1,'Opening Add starts the only scan');const scan=jobs.shift()(cx);assert.deepEqual(calls,['scan']);
    {const loading=find(render(),'st-plugin-list-git-repository-loading');assert.ok(loading,'The popup shows loading while scanning');assert.ok(loading.kids[1].kids.includes('Loading'),'A bulb, then Loading, bottom left like the folder browser');}
    assert.equal(find(render(),'st-plugin-list-git-repository-panel').attrs.w[0],320,'The popup is as wide as the folder browser');
    const added=[];found.resolve({items:[{id:'owner/two',label:'owner/two'},{id:'owner/blocked',label:'owner/blocked',disabled:true,detail:'No access'}],add:async(_cx,ids)=>{added.push(...ids);return {errors:{}};}});await scan;
    assert.equal(find(render(),'st-plugin-list-git-repository-choose').attrs.disabled[0],true,'Nothing picked, nothing to add');
    // The host knows this role as check_box; any other spelling makes Settings fail to draw.
    assert.equal(find(render(),'st-plugin-list-git-repository-item-0').attrs.role[0],'check_box');
    click('st-plugin-list-git-repository-item-1');assert.equal(view.listPicker.selected.length,0,'Unavailable repositories cannot be picked');
    click('st-plugin-list-git-repository-item-0');{const popup=render(),choose=find(popup,'st-plugin-list-git-repository-choose'),cancel=find(popup,'st-plugin-list-git-repository-cancel');assert.ok(choose.kids.includes('Add'),'The button is just Add');assert.deepEqual([choose.attrs.w[0],choose.attrs.h[0]],[cancel.attrs.w[0],cancel.attrs.h[0]],'Cancel and Add are the same size');}
    click('st-plugin-list-git-repository-choose');assert.equal(view.listPicker,null,'Adding closes the popup');assert.equal(view.pluginFixing,'git:repository');
    await jobs.shift()(cx);assert.deepEqual(added,['owner/two']);assert.equal(view.pluginFixing,null);assert.equal(jobs.length,1,'Adding re-checks the section');assert.equal(view.pluginSettling['git:repository'],true,'The section stays busy until that re-check answers');jobs.length=0;view.pluginSettling={}; // stands in for the dropped re-check's answer
    view.pluginChecks.git={loading:false,items:[listed]};
    find(render(),'st-plugin-list-git-repository-row-0').attrs.on_hover[0](true,cx);click('st-plugin-list-git-repository-remove-0');await jobs.shift()(cx);assert.deepEqual(calls.at(-1),['remove','owner/one']);jobs.length=0;view.pluginSettling={};
    // Real mutation -> post-action check -> done/failed: header-only busy feedback,
    // with identical account/detail/list content and row geometry until the check answers.
    const beforeLifecycle=git.prerequisites,remove=list.remove;
    try{
      for(const outcome of ['done','action-failed','check-failed']){
        const operation=deferred(),recheck=deferred();
        list.remove=()=>operation.promise;
        git.prerequisites=beforeLifecycle.map(p=>p.id==='repository'?{...p,check:()=>recheck.promise}:p);
        view.pluginFixing=null;view.pluginSettling={};view.pluginFixError={};jobs.length=0;
        view.pluginChecks.git={loading:false,items:[listed]};
        find(render(),'st-plugin-list-git-repository-row-0').attrs.on_hover[0](true,cx);
        const section=()=>find(render(),'st-plugin-section-git-repository');
        const body=()=>find(section(),'st-plugin-git-repository-body');
        const quiet=()=>assert.ok(!words(section()).some(s=>/^Updating(?:…|\.\.\.)?$/.test(s)),'No duplicate Updating line in any lifecycle state');
        const snapshot=()=>({text:words(body()),rows:find(body(),'st-plugin-list-git-repository').kids.map(n=>({id:n.attrs.id,h:n.attrs.h}))});
        const idle=snapshot();quiet();
        assert.deepEqual(words(find(section(),'st-plugin-git-repository-status-rail')),['Check','1 added']);
        click('st-plugin-list-git-repository-remove-0');
        const busy=()=>{
          quiet();
          const tree=section(),rail=find(tree,'st-plugin-git-repository-status-rail'),status=rail.kids[1].kids[0];
          assert.deepEqual(words(rail),['Check','Applying'],'The literal pill word has no ellipsis');
          assert.equal(bulbs(rail),1);assert.equal(status.attrs.text_color[0],palette.working);
          assert.equal(status.attrs.w[0],72);assert.equal(status.kids[1].attrs.whitespace_nowrap.length,0);
          assert.equal(status.kids[1].attrs.truncate,undefined,'The full word is not ellipsized by truncation');
          assert.equal(find(tree,'st-plugin-refresh-git-repository').attrs.disabled[0],true);
          assert.equal(find(tree,'st-plugin-list-git-repository-add').attrs.disabled[0],true);
          assert.equal(find(tree,'st-plugin-list-git-repository-remove-0').attrs.disabled[0],true);
          assert.equal(find(tree,'st-plugin-git-repository-selection').attrs.disabled[0],true);
          assert.equal(find(tree,'st-plugin-git-repository-selection-loading'),undefined,'Keep the previous account, not a loading replacement');
          assert.equal(find(tree,'st-plugin-git-repository-selection-popup'),undefined);
        };
        busy();assert.deepEqual(snapshot(),idle,'Starting the mutation preserves body content and row height');
        const applying=jobs.shift()(cx);
        if(outcome==='action-failed')operation.reject(new Error('Webhook removal refused'));
        else operation.resolve();
        await applying;
        assert.equal(view.pluginSettling['git:repository'],true);
        busy();
        if(outcome==='action-failed'){
          assert.ok(words(body()).includes('Webhook removal refused'),'Action errors still occupy the existing detail slot');
          assert.deepEqual(snapshot().rows,idle.rows,'An error does not replace the repository list');
        }else assert.deepEqual(snapshot(),idle,'The post-action check also preserves body content and row height');
        const checking=jobs.shift()(cx);busy();
        recheck.resolve(outcome==='check-failed'?{status:'error',detail:'Repository check failed'}:listed);
        await checking;quiet();
        assert.equal(view.pluginSettling['git:repository'],undefined);
        assert.ok(!words(section()).includes('Applying'));
        assert.equal(find(section(),'st-plugin-refresh-git-repository').attrs.disabled[0],false);
        if(outcome==='done'){
          assert.deepEqual(snapshot(),idle,'Completion does not remove/reinsert unchanged content');
          assert.equal(find(section(),'st-plugin-list-git-repository-remove-0').attrs.disabled[0],false);
        }else assert.ok(words(body()).includes(outcome==='action-failed'?'Webhook removal refused':'Repository check failed'),'Failures remain visible after completion');
        assert.equal(jobs.length,0);
      }
    }finally{git.prerequisites=beforeLifecycle;list.remove=remove;view.pluginFixError={};}
    view.pluginChecks.git={loading:false,items:[listed]};registry.setPluginSetting(git,'githubAccount','fixture-user');jobs.length=0;
    find(render(),'st-plugin-git-repository-selection-popup').attrs.on_open_change[0](true,cx);
    click('st-plugin-git-repository-selection-other-user');assert.equal(registry.pluginSetting(git,'githubAccount'),'other-user');assert.equal(jobs.length,1,'Switching account re-checks');jobs.length=0;
    registry.setPluginSetting(git,'githubAccount','');
    view.pluginChecks.git={loading:true,items:[{...repoDef,list,status:null}]};tree=render();
    assert.ok(find(tree,'st-plugin-git-repository-selection'),'The account dropdown stays while loading');assert.ok(find(tree,'st-plugin-git-repository-selection-loading'),'It shows a placeholder inside, like Core');assert.equal(find(tree,'st-plugin-git-repository-selection-popup'),undefined,'It cannot open while loading');
    view.pluginChecks.git={loading:false,items:[{...listed,rows:[],statusLabel:'0 added'}]};tree=render();assert.equal(find(tree,'st-plugin-list-git-repository-empty'),undefined,'No empty-state panel, only the description');assert.equal(find(tree,'st-plugin-list-git-repository-add').attrs.h[0],24,'Add is the small header-style button');assert.equal(find(tree,'st-plugin-list-git-repository-add').attrs.bg,undefined,'Add is plain, not primary');
  }finally{git.prerequisites=saved;}
}
console.log('PASS: requirements fixes and choices, list sections (scope, Add popup, hover Remove), independent check groups, out-of-order/stale/closed results and shared controls');
