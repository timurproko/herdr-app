import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const hash='a'.repeat(64),binding={id:'fake-core',session:'fake',principal:hash,home:hash};
const setup={configured:false,revision:hash,localWrites:false,allowedBoards:0,boards:[],namesMissing:false,destination:binding};
let runtimeCode=null,statusCode=null,hold=false,release;const calls=[];
const h=await formsHarness({checking:()=>false,appHome:()=>'/fake-owned-home',exec:async(program,args)=>{
  if(args.includes('--discovery-all'))return {code:0,stdout:JSON.stringify({ok:true,data:{pending:[]}})};
  assert.equal(program,'node');calls.push(args);assert.ok(args.includes('--probe')||args.includes('--status'),'No private action or secret dispatch is allowed');
  const code=args.includes('--probe')?runtimeCode:statusCode;
  const result=code?{version:1,ok:false,error:{code,...(code==='CONFIG_UNKNOWN'?{outcome:'unknown'}:{})}}:{version:1,ok:true,data:args.includes('--probe')?{runtime:'ready',destination:binding}:setup};
  if(hold&&args.includes('--status')){hold=false;return new Promise(resolve=>release=()=>resolve({stdout:JSON.stringify(result)}));}
  return {stdout:JSON.stringify(result)};
}}),{ui,registry,view,cx,render,click,flush,jobs}=h;
const plugin=registry.pluginById('trello');registry.setPluginEnabled(plugin,true);view.settingsMachine='fixture-ssh';ui.initPlugins(view,cx,'trello');view.pluginOpen['trello-requirements']=true;view.pluginOpen['trello-boards']=true;view.pluginOpen['trello-settings']=true;
const refresh=async()=>{ui.reloadPlugins(view,cx,'trello');await flush();};
const unavailable=()=>find(render(),'st-plugin-trello-unavailable');
const assertElevated=()=>{
  const text=words(render());assert.ok(unavailable());
  const explanation=text.filter(t=>t.includes('administrator (elevated) SSH login'));assert.equal(explanation.length,1);assert.equal(explanation[0].split('. ').length,2);
  assert.match(explanation[0],/refuses for safety/);assert.match(explanation[0],/normal user running Herdr Core/);assert.match(explanation[0],/set up the plugin on that machine directly/);
  assert.ok(!text.some(t=>/\d+ to fix|All ready|Check failed|Elevated SSH login unsupported/.test(t)));
  for(const id of ['st-plugin-req-trello-runtime','st-plugin-req-trello-local-setup','st-plugin-list-trello-boards-where','st-plugin-form-trello-local-setup-save','st-plugin-fix-trello-runtime','st-plugin-trello-access-read-write'])assert.ok(!find(render(),id),id);
};
await refresh();const stale=find(render(),'st-plugin-form-trello-local-setup-save');assert.ok(stale);
for(const [r,s] of [['MACHINE_ELEVATED','MACHINE_ELEVATED'],['MACHINE_ELEVATED',null],[null,'MACHINE_ELEVATED']]){runtimeCode=r;statusCode=s;await refresh();assertElevated();}
const before=calls.length;stale.attrs.on_click[0]({},cx);await flush();assert.equal(calls.length,before,'A pre-refusal Save node cannot dispatch');
// The visible Check must recover a refusal published by Boards as well as Requirements.
runtimeCode=statusCode='MACHINE_ELEVATED';await refresh();assertElevated();runtimeCode=statusCode=null;
click('st-plugin-trello-recheck');await flush();assert.ok(!unavailable());assert.ok(find(render(),'st-plugin-form-trello-local-setup-save'));
for(const code of ['MACHINE_UNSUPPORTED','MACHINE_IDENTITY']){runtimeCode=statusCode=code;await refresh();assert.ok(unavailable());assert.equal(words(unavailable()).filter(t=>/no credentials|cannot verify/.test(t)).length,1);}
for(const code of ['SSH_UNAVAILABLE','STORE_PERMISSION_CHECK','CONFIG_UNKNOWN']){runtimeCode=statusCode=code;await refresh();assert.ok(!unavailable());assert.ok(!words(render()).some(t=>t.includes('administrator (elevated) SSH login')));assert.ok(!words(render()).includes('All ready'));}
runtimeCode=statusCode=null;await refresh();assert.ok(find(render(),'st-plugin-form-trello-local-setup-save'));
// Boards can finish first and supply the whole-card refusal while Requirements waits.
hold=true;ui.reloadPlugins(view,cx,'trello');const pending=jobs.shift()(cx);for(let i=0;i<50&&!release;i++)await Promise.resolve();assert.ok(release);
statusCode='MACHINE_ELEVATED';await flush();assertElevated();release();await pending;assertElevated();
statusCode=null;await refresh();assert.ok(!unavailable());
// A late refusal from an old machine cannot replace the replacement selection.
hold=true;statusCode='MACHINE_ELEVATED';ui.reloadPlugins(view,cx,'trello','boards');const old=jobs.shift()(cx);for(let i=0;i<50&&!release;i++)await Promise.resolve();
view.settingsMachine=null;ui.followSettingsMachine(view);statusCode=null;await refresh();release();await old;assert.ok(!unavailable());assert.ok(find(render(),'st-plugin-form-trello-local-setup-save'));
// Disable retires a pending check session as well as any old rendered controls.
view.settingsMachine='fixture-ssh';ui.followSettingsMachine(view);hold=true;statusCode='MACHINE_ELEVATED';ui.reloadPlugins(view,cx,'trello','boards');const late=jobs.shift()(cx);for(let i=0;i<50&&!release;i++)await Promise.resolve();click('st-plugin-trello-enabled');release();await late;assert.equal(registry.pluginEnabled(plugin),false);assert.ok(!unavailable());assert.equal(view.pluginChecks.trello,undefined);
console.log('PASS: one actionable card-level elevated SSH explanation, no fix count/duplicate controls, independent groups, safe retry and stale/disabled refusal guards');
