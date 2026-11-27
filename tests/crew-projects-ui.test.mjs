import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {realUi} from './support/panel-kit.mjs';
// Settings > Plugins > Crew > Projects: a section listing the folders registered on a
// machine, with the machine dropdown, Add (through the folder browser) and Remove per row.
// The plugin's own add/remove are replaced by recorders; nothing reaches a machine.
function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{n.kids.push(c);return p;}:k==='children'?c=>{n.kids.push(...c);return p;}:(...a)=>{n.attrs[k]=a;return p;}});}
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
// A collapsible's body stays laid out while closed (it is measured, to slide like Usage's): closed is a 0-tall clip.
const clipH=(tree,id)=>find(tree,id+'-clip')?.attrs?.h?.[0];
const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
const state={},jobs=[],opened=[];
const cx={notify(){},focus_handle:()=>({focus(){}}),spawn:fn=>jobs.push(fn)};
const {ui,registry,crewErrors}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>[],panes:()=>[],terminals:()=>[],focused:()=>null,settings:()=>({zoom:1})},modules:{
 'plugins-ui.js':'src/features/settings/plugins-ui.js','reorder.js':'src/ui/reorder.js','settings-kit.js':'src/ui/settings-kit.js','modal-layout.js':'src/ui/modal-layout.js','space-color-state.js':{currentSpaceColor(){}},'directory.js':{spaceDirectory:()=>({cwd:null})},
 'machine-picker.js':{machinePicker:(_t,o)=>element().id(o.id).selected(o.selected).disabled(o.disabled).on_select(o.onSelect)},
 'folder-browser.js':{folderBrowser:(_view,_t,o)=>element().id(`${o.id}-popup`).on_pick(o.onPick).on_open_change(o.onOpen).multi(o.multi).machine_switch(o.machineSwitch).child(o.trigger),
   openBrowser(view,_cx,key,machine,start,options){opened.push([key,machine,start,options?.from,options?.selected]);view.folderBrowser={key,machine};},closeBrowser(view){view.folderBrowser=null;}},
 'gpui-kit':{div:element,svg:element,image:element},'gpui-base':{Popup:{new:(id,trigger)=>element().id(id).child(trigger)},h_flex:element,v_flex:element,Textarea:{new:element},TextareaState:{new:o=>{let value=o?.value??'';return {on(){},value:()=>value,set_value:v=>{value=v;}};}},Checkbox:{new:id=>element().id(id)},Scrollbar:{vertical:id=>element().target(id)},Input:{new:element},InputState:{new:o=>{let value=o.value;return {on(){},value:()=>value,set_value:v=>{value=v;}};}}},
 'ui.js':{chevronSlot:realUi(element).chevronSlot,iconButton:(_t,o)=>element().id(o.id).available(o.available??true).on_click(o.onClick),menuRow:realUi(element).menuRow,collapsible:realUi(element).collapsible,settingsRow:realUi(element).settingsRow,SETTINGS_ROW:32,searchField:(_t,_s,{id})=>element().id(id),menuSurface:(_t,e)=>e,dropdown:(id,trigger)=>element().id(id).child(trigger),U:{control:28,field:32,font:13,meta:12,radius:6,gutter:12,statusSize:7},slot:x=>x,emptyState:(_t,{id,title='No results',icon='search'})=>element().id(id).emptyComponent(true).asset(icon).child(title),description:(_t,text)=>element().child(text),control:(_t,x=element())=>x,itemHover(){},spinner:()=>element(),chevron:element,dialogScrollbar:x=>x,
  button:(_t,id,label,click,options={})=>element().id(id).child(label).on_click(click).primary(options.primary??false).disabled(options.enabled===false)},
},entry:"export * as ui from './plugins-ui.js';export * as registry from './plugins.js';export * as crewErrors from './plugins/crew/plugin.js';"});
const toggle=(_t,id,on,click)=>element().id(id).pressed(on).on_click(click);
const palette={},crew=registry.pluginById('crew'),section=crew.prerequisites.find(p=>p.id==='projects');
assert.ok(section?.section&&section.list?.picker?.kind==='folders','The Crew plugin has a Projects list section that adds folders');
registry.setPluginEnabled(crew,true);registry.setPluginSetting(crew,'machine','pc2');

const calls=[];let fail=null;
const list={...section.list,
  async add(c,folder){calls.push(['add',c.setting('machine'),folder]);if(fail)throw crewErrors.projectFailure(fail,{operation:'add',name:crewErrors.projectName(folder),folder,machine:c.setting('machine')});},
  async remove(c,id){calls.push(['remove',c.setting('machine'),id]);if(fail)throw crewErrors.projectFailure(fail,{operation:'remove',name:id,machine:c.setting('machine')});}};
const two=[{id:'fork',label:'D:\\Git\\crew · treehouse',path:'D:\\Git\\crew'},{id:'app',label:'C:\\Users\\u\\app',path:'C:\\Users\\u\\app'}];
const view={heading:element,toggle};ui.initPlugins(view,cx,'crew');
const seed=(extra={status:'ready',statusLabel:'2 projects',usable:true,rows:two})=>{
  jobs.length=0;view.pluginFixing=null;view.pluginSettling={}; // dropped re-checks would have ended the settling
  view.pluginChecks.crew={loading:false,groups:{requirements:{loading:false,checked:true},projects:{loading:false,checked:true}},
    items:crew.prerequisites.map(p=>p.id==='projects'?{...p,list,...extra}:{...p,status:'ready'})};
};
const render=()=>ui.pluginsPage(view,palette),P='st-plugin-list-crew-projects';
const runJob=async()=>{assert.equal(jobs.length,1,'One action at a time');await jobs.shift()(cx);};

// Collapsed until opened; its summary and Check button show either way.
seed();let tree=render();
assert.equal(clipH(tree,'st-plugin-crew-projects'),0,'Projects start collapsed');
assert.ok(words(find(tree,'st-plugin-crew-projects-status-rail')).includes('2 projects'),'The header says how many there are');
assert.ok(find(tree,'st-plugin-refresh-crew-projects'),'Check is offered on the header');
find(tree,'st-plugin-crew-projects-toggle').attrs.on_click[0]({},cx);tree=render();
assert.ok(clipH(tree,'st-plugin-crew-projects')>0,'Opens on click');
// It slides like Usage's Resets: the body reports its height and the clip animates to it.
{let notified=0;const ncx={...cx,notify(){notified++;}};
 find(tree,'st-plugin-crew-projects-body').attrs.on_size_change[0]({width:800,height:116},ncx);
 assert.equal(view.pluginHeights['st-plugin-crew-projects'],100,'The body’s height without its padding (8 + 8)');assert.equal(notified,1);
 find(render(),'st-plugin-crew-projects-body').attrs.on_size_change[0]({width:800,height:116},ncx);assert.equal(notified,1,'The same size again redraws nothing');
 const clip=find(render(),'st-plugin-crew-projects-clip');assert.equal(clip.attrs.h[0],116,'Open: the measured height');
 assert.ok(clip.attrs.transition,'Height changes animate');
 view.pluginOpen['crew-projects']=false;assert.equal(clipH(render(),'st-plugin-crew-projects'),0,'Closed: slides shut');view.pluginOpen['crew-projects']=true;tree=render();}

// The section names its machine; there is no dropdown in the card (the Settings header has the one).
{const where=find(tree,`${P}-where`);assert.ok(words(where).includes('pc2'),'The machine’s name stands where “Machine” was');assert.ok(!words(where).includes('Machine'));assert.equal(find(tree,`${P}-scope`),undefined,'No machine dropdown in the card');assert.ok(find(find(where,`${P}-where-rail`),`${P}-add`),'Add project sits in the Check/Remove column');assert.equal(find(tree,`${P}-add`).attrs.w[0],80);}
// The header's machine is every plugin's machine: following it changes where Crew looks.
view.settingsMachine=null;
assert.equal(JSON.stringify(ui.followSettingsMachine(view)),'["crew"]','Crew follows the header machine');
assert.equal(registry.pluginSetting(crew,'machine'),null);
assert.equal(JSON.stringify(ui.followSettingsMachine(view)),'[]','Nothing to change the second time');
assert.ok(words(find(render(),`${P}-where`)).includes('This computer'),'This computer is named as such');
view.settingsMachine='pc2';ui.followSettingsMachine(view);
assert.equal(registry.pluginSetting(crew,'machine'),'pc2');

// Rows: one line each, the folder, like the Git plugin's repositories. Hovering a row
// highlights it and shows its Remove; the hidden Remove keeps its place.
const hover=(i,on=true)=>{find(render(),`${P}-row-${i}`).attrs.on_hover[0](on,cx);};
seed();tree=render();
assert.deepEqual([0,1].map(i=>words(find(tree,`${P}-row-${i}`))),[['D:\\Git\\crew · treehouse'],['C:\\Users\\u\\app']]);
assert.equal(find(tree,`${P}-empty`),undefined);
assert.equal(find(tree,`${P}-remove-1`),undefined,'Remove is hidden until the row is hovered');
assert.ok(find(tree,`${P}-row-1-remove-slot`),'Its place is kept, so nothing moves on hover');
assert.equal(find(tree,`${P}-row-1`).attrs.bg,undefined);
hover(1);tree=render();
assert.ok(find(tree,`${P}-row-1`).attrs.bg,'A hovered row highlights like the section headers');
assert.equal(find(tree,`${P}-remove-0`),undefined,'Only the hovered row shows Remove');
find(tree,`${P}-remove-1`).attrs.on_click[0]({},cx);
assert.equal(view.pluginFixing,'crew:projects');
hover(0);assert.equal(find(render(),`${P}-remove-0`).attrs.disabled[0],true,'Nothing else can be started while it runs');
hover(0,false);assert.equal(find(render(),`${P}-remove-0`),undefined,'Leaving the row hides Remove again');
await runJob();
assert.deepEqual(calls.splice(0),[['remove','pc2','app']]);
assert.equal(view.pluginFixing,null);assert.equal(jobs.length,1,'Only the Projects section is re-checked');

// Add: the folder browser opens on the section's machine; the chosen folder is registered there.
seed();tree=render();
const popup=()=>find(render(),`${P}-add-popup`);
assert.ok(find(popup(),`${P}-add`),'Add is the folder browser’s trigger');
assert.equal(popup().attrs.machine_switch[0],false,'The machine is chosen by the dropdown beside it, so the browser has no machine tabs');
popup().attrs.on_open_change[0](true,cx);
assert.deepEqual(opened.splice(0),[['crew-projects-pick','pc2',null,'',['D:\\Git\\crew','C:\\Users\\u\\app']]],'It starts from that machine’s list of drives, with the projects already added ticked');
assert.deepEqual(popup().attrs.multi[0].existing,['D:\\Git\\crew','C:\\Users\\u\\app']);
popup().attrs.on_pick[0]({add:['D:\\Git\\app'],remove:[]},cx);
assert.equal(view.folderBrowser,null,'Choosing closes the browser');
await runJob();
assert.deepEqual(calls.splice(0),[['add','pc2','D:\\Git\\app']]);
assert.equal(jobs.length,1);

// A folder chosen on another machine in the browser: the section follows it.
seed();popup().attrs.on_open_change[0](true,cx);opened.length=0;view.folderBrowser.machine=null;
popup().attrs.on_pick[0]({add:['C:\\work\\site'],remove:[]},cx);await runJob();
assert.deepEqual(calls.splice(0),[['add',null,'C:\\work\\site']],'Added on the machine it was picked on');
assert.equal(registry.pluginSetting(crew,'machine'),null);
assert.equal(jobs.length,2,'Requirements and projects are both re-checked for the new machine');
registry.setPluginSetting(crew,'machine','pc2');

// Several ticked folders are added in one go; a refused one is named and the rest still go
// in. The section is left open on the new list.
seed();const several=popup();
assert.deepEqual([[1,0],[3,0],[2,1]].map(([a,r])=>several.attrs.multi[0].label(a,r)),['Add','Add','Apply'],'The browser’s button is one word; its count is beside it');
several.attrs.on_open_change[0](true,cx);opened.length=0;
const addOne=list.add;list.add=async(c,folder)=>{calls.push(['add',c.setting('machine'),folder]);if(folder.endsWith('bad'))throw crewErrors.projectFailure('D:/Git/bad is not a git repository.',{operation:'add',name:'bad',folder});};
view.pluginOpen['crew-projects']=false;
several.attrs.on_pick[0]({add:['D:\\Git\\one','D:\\Git\\bad','D:\\Git\\two'],remove:['C:\\Users\\u\\app']},cx);
assert.equal(view.pluginOpen['crew-projects'],true,'Adding opens the section so the new projects are in view');
await runJob();list.add=addOne;
assert.deepEqual(calls.splice(0).map(c=>[c[0],c[2]]),[['remove','app'],['add','D:\\Git\\one'],['add','D:\\Git\\bad'],['add','D:\\Git\\two']],'An unticked project is removed by its name; every newly ticked folder is tried');
assert.equal(view.pluginFixError['crew:projects'],'Could not add D:\\Git\\bad: it is not a git repository; choose a git repository folder.');
assert.equal(jobs.length,1,'The list is read again afterwards');
delete view.pluginFixError['crew:projects'];

// A folder Crew already lists under another name is refused by the plugin itself: the
// message is shown once, as written, and not attributed to Crew.
{
  const said='Could not add D:\\Git\\xrbuild\\.xrbuild: it is already added as xrbuild-private.';
  seed();popup().attrs.on_open_change[0](true,cx);opened.length=0;
  list.add=async(c,folder)=>{calls.push(['add',c.setting('machine'),folder]);throw crewErrors.alreadyAdded(folder,'xrbuild-private');};
  popup().attrs.on_pick[0]({add:['D:\\Git\\xrbuild\\.xrbuild'],remove:[]},cx);await runJob();list.add=addOne;
  assert.deepEqual(calls.splice(0),[['add','pc2','D:\\Git\\xrbuild\\.xrbuild']]);
  assert.equal(view.pluginFixError['crew:projects'],said,'Shown once, as written, without Crew named as its source');
  assert.equal(jobs.length,1,'The list is read again afterwards');
  seed();assert.ok(words(find(render(),'st-plugin-crew-projects-body')).includes(said),'The section shows that one sentence');
  delete view.pluginFixError['crew:projects'];
}

// Summaries replace the raw wrapper, including a multiline usage dump.
const rejected='Could not add D:\\Git\\agentnumberone.dev. Crew did not accept the project name agentnumberone.dev; update the Crew tool and try again.';
for (const [reason,expected] of [
  ['Invalid project name: agentnumberone.dev. Use lowercase letters, digits and dashes.',rejected],
  ['crew: Usage: crew project add <name> <git folder> | crew project remove <name>\nraw second line',rejected],
  ['Read-only: this home is owned by terminal t9. Only that session may change its projects.','Could not add D:\\Git\\agentnumberone.dev: another session owns the Crew home; change its projects from that session.']]) {
  seed();fail=reason;popup().attrs.on_open_change[0](true,cx);opened.length=0;
  popup().attrs.on_pick[0]({add:['D:\\Git\\agentnumberone.dev'],remove:[]},cx);await runJob();fail=null;
  assert.deepEqual(calls.splice(0),[['add','pc2','D:\\Git\\agentnumberone.dev']],'No retry or alternative folder after refusal');
  assert.equal(view.pluginFixError['crew:projects'],expected);
  assert.doesNotMatch(expected,/reported:|Usage:|\n|<name>/);
  assert.equal(jobs.length,1,'The authoritative list is re-read even after refusal');
  seed();assert.ok(words(find(render(),'st-plugin-crew-projects-body')).includes(expected),'Only the concise summary is visible in the section');
}
// Unticking preserves both the dotted ID and removal-specific refusal context.
const dotted={id:'agentnumberone.dev',label:'D:\\Git\\agentnumberone.dev',path:'D:\\Git\\agentnumberone.dev'};
seed({status:'ready',usable:true,rows:[dotted]});popup().attrs.on_open_change[0](true,cx);opened.length=0;
assert.deepEqual(popup().attrs.multi[0].existing,[dotted.path],'Existing dotted registrations start ticked');
fail='Read-only: this home is owned by terminal t9. Only that session may change its projects.';
popup().attrs.on_pick[0]({add:['D:\\Git\\other'],remove:[dotted.path]},cx);await runJob();fail=null;
assert.deepEqual(calls.splice(0),[['remove','pc2',dotted.id],['add','pc2','D:\\Git\\other']]);
assert.equal(view.pluginFixError['crew:projects'],`Could not remove ${dotted.path}: another session owns the Crew home; change its projects from that session. · Could not add D:\\Git\\other: another session owns the Crew home; change its projects from that session.`);
assert.equal(jobs.length,1,'Batch refusals still refresh the list');
seed({status:'ready',usable:true,rows:[dotted]});hover(0);find(render(),`${P}-remove-0`).attrs.on_click[0]({},cx);await runJob();
assert.deepEqual(calls.splice(0),[['remove','pc2',dotted.id]],'The row button removes a dotted registration by exact ID too');

// A direct Remove uses the same summary and actual folder rather than the ID.
seed();fail='Read-only: this home is owned by terminal t9. Only that session may change its projects.';
hover(0);find(render(),`${P}-remove-0`).attrs.on_click[0]({},cx);await runJob();fail=null;calls.length=0;
assert.equal(view.pluginFixError['crew:projects'],'Could not remove D:\\Git\\crew: another session owns the Crew home; change its projects from that session.');
seed();assert.ok(words(find(render(),'st-plugin-crew-projects-body')).includes(view.pluginFixError['crew:projects']));
find(render(),'st-plugin-refresh-crew-projects').attrs.on_click[0]({},cx);
assert.equal(view.pluginFixError['crew:projects'],undefined,'Check clears it');

// Usage is suppressed for both removal entrypoints; their target is the folder.
for(const picker of [true,false]) {
  seed({status:'ready',usable:true,rows:[dotted]});fail='crew: Usage: crew project remove <name>\nprivate output';
  if(picker){popup().attrs.on_open_change[0](true,cx);opened.length=0;popup().attrs.on_pick[0]({add:[],remove:[dotted.path]},cx);}
  else {hover(0);find(render(),`${P}-remove-0`).attrs.on_click[0]({},cx);}
  await runJob();fail=null;
  assert.equal(view.pluginFixError['crew:projects'],`Could not remove ${dotted.path}. Crew did not accept the project name ${dotted.id}; update the Crew tool and try again.`);
  assert.deepEqual(calls.splice(0),[['remove','pc2',dotted.id]]);
}
// Other plugins keep the default operation context and plugin attribution.
{
  const other=registry.pluginById('files'),saved=other.prerequisites,savedCheck=view.pluginChecks.files;
  const item={...section,list:{...section.list,async add(){throw Error('Permission denied.');}}};
  other.prerequisites=[item];view.pluginTarget='files';registry.setPluginEnabled(other,true);
  jobs.length=0;view.pluginFixing=null;view.pluginSettling={};
  view.pluginChecks.files={loading:false,groups:{projects:{loading:false,checked:true}},items:[{...item,status:'ready',usable:true,rows:[]}]};
  find(render(),'st-plugin-list-files-projects-add-popup').attrs.on_pick[0]({add:['D:\\Git\\other'],remove:[]},cx);
  await runJob();
  assert.equal(view.pluginFixError['files:projects'],'Could not add folder “D:\\Git\\other”. Files reported: Permission denied.');
  other.prerequisites=saved;
  if(savedCheck)view.pluginChecks.files=savedCheck;else delete view.pluginChecks.files;
  view.pluginTarget='crew';delete view.pluginFixError['crew:projects'];
}

// Empty list: says so, and Add stays available. No tool or home: nothing to add to.
seed({status:'ready',statusLabel:'0 projects',usable:true,rows:[]});tree=render();
assert.equal(find(tree,`${P}-empty`),undefined,'An empty list shows nothing in place of rows');
assert.notEqual(find(tree,`${P}-add`).attrs.disabled?.[0],true);
seed({status:'missing',statusLabel:null,detail:'Install the crew tool first (Requirements).',rows:[]});tree=render();
assert.equal(find(tree,`${P}-add`).attrs.disabled[0],true,'Add waits for the tool and its home');
assert.equal(find(tree,`${P}-empty`),undefined);
assert.ok(words(find(tree,'st-plugin-crew-projects-body')).includes('Install the crew tool first (Requirements).'));
find(tree,`${P}-add-popup`).attrs.on_open_change[0](true,cx);assert.equal(opened.length,0,'A disabled Add does not open the browser');

// Pending execution retains last-good rows but grants no action authority.
seed();view.pluginChecks.crew.groups.projects={loading:true,target:'projects'};tree=render();
assert.ok(!words(find(tree,'st-plugin-crew-projects-body')).some(w=>/will appear here/.test(w)),'No placeholder line flashes during a check');
assert.ok(find(tree,`${P}-row-0`));assert.equal(find(tree,`${P}-remove-0`).attrs.disabled[0],true);assert.equal(find(tree,`${P}-add`).attrs.disabled[0],true);

// A dropdown fed by the check (Claude account) shows a loading bar inside until the first
// check has finished; only then can it say there is nothing to choose.
{
  const field='st-plugin-crew-claudeAccount';view.pluginOpen['crew-settings']=true;
  delete view.pluginChecks.crew;
  assert.ok(find(find(render(),field),`${field}-loading`),'Before any check: loading, not “no accounts”');
  seed();view.pluginChecks.crew.loading=true;
  assert.ok(find(find(render(),field),`${field}-loading`),'While checking: loading');
  assert.ok(!words(find(render(),field)).includes('No saved accounts on this machine'));
  seed();
  assert.equal(find(render(),`${field}-loading`),undefined);
  assert.ok(words(find(render(),field)).includes('No saved accounts on this machine'),'Checked and none saved: says so');
  state['custom.crew.claude-accounts']={pc2:[['a@example.org','a@example.org · Team']]};seed();view.pluginChecks.crew.loading=true;
  assert.equal(find(render(),`${field}-loading`),undefined,'Known accounts stay shown during a re-check');
  assert.ok(words(find(render(),field)).includes('a@example.org'),'An account is shown by its email alone, whatever label was cached');
  assert.equal(find(render(),field).attrs.w[0],142,'The field is as wide as its longest choice needs (13 characters)');
  state['custom.crew.claude-accounts']={pc2:[['a@example.org','x'],['a.much.longer.address.for.someone@organisation.example.org','x']]};
  assert.equal(find(render(),field).attrs.w[0],360,'…up to a limit');
  delete state['custom.crew.claude-accounts'];
}

// Requirements: closed until opened; Install all sits in the machine row (which names the
// machine, no dropdown), as the same plain small button as Add project, not on the header.
{
  seed();const installed=[];
  view.pluginChecks.crew.items=view.pluginChecks.crew.items.map(item=>['jq','gh-axi'].includes(item.id)?{...item,status:'recommended',fix:{label:'Install',async run(){installed.push(item.id);}}}:item);
  delete view.pluginOpen['crew-requirements'];
  assert.equal(clipH(render(),'st-plugin-crew-requirements'),0,'Requirements do not open by themselves when something can be installed');
  find(render(),'st-plugin-crew-requirements-toggle').attrs.on_click[0]({},cx);tree=render();
  const where=find(tree,'st-plugin-crew-machine-where'),all=find(where,'st-plugin-crew-fix-all');
  assert.ok(all,'Install all is in the machine row');
  assert.equal(find(find(tree,'st-plugin-crew-requirements-status-rail'),'st-plugin-crew-fix-all'),undefined,'…and no longer on the header');
  assert.equal(all.attrs.primary[0],false,'Plain, like Add project');
  const order=where.kids.map(kid=>find(kid,'st-plugin-crew-fix-all')?'install':find(kid,'st-plugin-crew-machine')?'machine':'label');
  assert.deepEqual(order,['machine','install'],'The machine’s name, then Install all');
  assert.ok(words(where).includes('pc2')&&!words(where).includes('Machine'),'Named, not labelled “Machine”');
  all.attrs.on_click[0]({},cx);await runJob();assert.deepEqual(installed,['jq','gh-axi']);
}

// The Settings header's refresh: every group of every plugin is checked again, old refusals
// are cleared, and it waits while checks or an action are still running.
{
  seed();view.pluginFixError['crew:projects']='old refusal';
  assert.equal(ui.pluginsChecking(view),false);
  ui.recheckAllPlugins(view,cx);
  assert.equal(view.pluginFixError['crew:projects'],undefined,'Old refusals are cleared');
  const groups=new Set(crew.prerequisites.map(p=>p.section?p.id:'requirements'));
  assert.ok(jobs.length>=groups.size,'Crew’s requirements and every section are re-checked');
  assert.equal(ui.pluginsChecking(view),true,'Checking until they answer');
  const queued=jobs.length;ui.recheckAllPlugins(view,cx);
  assert.equal(jobs.length,queued,'A second click while checking starts nothing');
  seed();view.pluginFixing='crew:projects';ui.recheckAllPlugins(view,cx);
  assert.equal(jobs.length,0,'Nothing while an action runs');view.pluginFixing=null;
}

// Settings › Profiles: a row with › that opens the role's page: the machine's available profiles
// (and any already in Crew), each with a switch only: no reordering, editing or removing.
{
  const roles=[];let asked=[];
  ui.provideProfiles({list:async m=>{asked.push(m);return [
    {key:'terminal',name:'Terminal',available:true},
    {key:'a1',name:'a1',command:'a1',available:true,role:'firstmate'},
    {key:'claude',name:'Claude Code',command:'claude',available:true,role:null,icon:'icons/claude.svg'},
    {key:'pi',name:'Pi',command:'pi',available:false,role:null},
    {key:'gone',name:'Gone',command:'gone',available:false,role:'firstmate'}];},
    setRole:(m,k,r,on)=>roles.push([m,k,r,on])});
  seed();view.settingsMachine='pc2';view.pluginOpen['crew-settings']=true;
  assert.equal(find(render(),'st-plugin-section-crew-profiles'),undefined,'No Profiles section any more');
  const row=find(render(),'st-plugin-crew-profiles');assert.ok(row,'A Profiles row in Settings');
  assert.ok(words(row).includes('Profiles'));
  row.attrs.on_click[0]({},cx);assert.equal(ui.pluginTextOpen(view),true,'It opens the page');assert.equal(ui.pluginTextChanged(view),false,'No Apply/Discard footer');
  await runJob();assert.deepEqual(asked,['pc2'],'Listed on the header’s machine');
  let page=ui.pluginTextPage(view,palette);const P2='st-plugin-crew-profiles',keys=()=>find(page,`${P2}-list`).kids.map(k=>k.attrs.id[0].slice(`${P2}-row-`.length));
  assert.deepEqual(keys(),['a1','claude','gone'],'Available profiles and those already in Crew, in the Profiles order; no Terminal, no unavailable outsiders');
  assert.equal(find(page,`${P2}-toggle-a1`).attrs.pressed[0],true);assert.equal(find(page,`${P2}-toggle-claude`).attrs.pressed[0],false);
  assert.equal(find(page,`${P2}-up-claude`),undefined,'No reorder arrows');
  assert.ok(!words(page).some(w=>/Edit|Remove/.test(w)),'No edit or remove');
  find(page,`${P2}-toggle-claude`).attrs.on_click[0]({},cx);
  assert.deepEqual(roles.splice(0),[['pc2','claude','firstmate',true]]);
  page=ui.pluginTextPage(view,palette);assert.equal(find(page,`${P2}-toggle-claude`).attrs.pressed[0],true,'The switch follows at once');
  // Settings › Profiles links here: its Add a crew profile button comes from this setting's addLabel.
  assert.equal(JSON.stringify(ui.roleLinks().map(l=>[l.plugin.id,l.def.key,l.def.addLabel])),JSON.stringify([['crew','profiles','Add a crew profile']]));
  ui.closePluginTextPage(view);assert.equal(ui.pluginTextOpen(view),false);assert.equal(view.rolePage,null);
  ui.openRoleLink(view,cx,ui.roleLinks()[0]);assert.equal(ui.pluginTextOpen(view),true,'The link opens the same page');await runJob();
  ui.closePluginTextPage(view);
  ui.provideProfiles(null);
}

// The cards reorder like Usage's (the shared reorder.js card): press a card, drag, release.
{
  view.pluginTarget=null;seed();
  const ids=()=>JSON.stringify(registry.orderedPlugins().map(p=>p.id));
  const before=JSON.parse(ids());assert.ok(before.indexOf('files')<before.indexOf('crew'));
  let page=render();
  find(page,'st-plugin-crew').attrs.on_mouse_down[1]({position:{x:10,y:900},bounds:{x:0,y:880,width:800,height:200}},cx);
  find(page,'st-plugin-files').attrs.on_mouse_move[0]({position:{x:10,y:100},local_position:{x:10,y:20},bounds:{width:800,height:120}},cx);
  page=render();
  assert.ok(find(page,'st-plugin-drop-line-files'),'The drop line is on the card it lands on');
  assert.ok(find(page,'st-plugin-drag-preview'),'The dragged card’s name follows the pointer');
  page.attrs.on_mouse_up[1]({},cx);
  const after=JSON.parse(ids());assert.equal(after[0],'crew','Dropped above Files: first');assert.equal(after.length,before.length);
  assert.equal(JSON.stringify(state['custom.plugins.order']),JSON.stringify(after),'The order is saved');
  assert.equal(render().kids.filter(k=>k?.attrs?.id?.[0]?.startsWith?.('st-plugin-')).map(k=>k.attrs.id[0])[0],'st-plugin-crew','Cards are drawn in that order');
  view.pluginTarget='crew';page=render();assert.equal(page.attrs.on_mouse_up,undefined,'One plugin’s own page has nothing to reorder');
  view.pluginTarget='crew';delete state['custom.plugins.order'];
}

// Off: the section is gone with the rest of the plugin's sections.
registry.setPluginEnabled(crew,false);seed();
assert.equal(find(render(),'st-plugin-section-crew-projects'),undefined);
console.log('PASS: Crew projects section: collapsed summary, machine dropdown, rows with Remove, Add through the folder browser on the chosen machine, refusals shown, empty and unavailable states');
