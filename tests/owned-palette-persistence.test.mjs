import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {build} from '../tools/build.mjs';
import {seedPaletteSdk,mockPaletteExecutable} from './support/palette-host.mjs';
import {deploy} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {guardPaletteHome,inspectPaletteState,installPalettePolicy,removePalettePolicy} from '../tools/runtime/palette-policy.mjs';
import {planBinding,reconcileBinding,planInstalledBinding,boundedLog,PALETTE_ACTION,PALETTE_SCOPE} from '../src/features/palette/binding.js';
import {checkPaletteFacts,missingPaletteUi} from '../src/integration/herdr/palette-capabilities.js';
const {output}=build(),temp=fs.mkdtempSync(path.resolve('.artifacts/palette-persistence-'));
const restoreHost=mockPaletteExecutable(temp);
const put=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const raw=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
const gpui='InputState Input VirtualListScrollHandle Scrollbar v_virtual_list focus_handle on_key_down';
const stock=JSON.stringify({global:{'ctrl-shift-p':'app.palette','f9':'app.help'},terminal:{'ctrl-c':'terminal.copy'},'layout:Custom':{'ctrl-shift-w':'custom-tabs.close-tab'}},null,2)+'\n';
const parsed=planBinding(stock,null,{install:true});
assert.equal(JSON.parse(parsed.keys)[PALETTE_SCOPE]['ctrl-shift-p'],PALETTE_ACTION);
assert.equal(JSON.parse(parsed.keys).global.f9,'app.help');
assert.equal(planBinding(parsed.keys,parsed.record).status,'already-current');
assert.equal(planBinding(stock,parsed.record).status,'repaired');
assert.equal(JSON.parse(planInstalledBinding(parsed.keys,parsed.record,{installed:false}).keys)[PALETTE_SCOPE]['ctrl-shift-p'],'app.palette');
assert.throws(()=>planBinding('{broken',parsed.record),error=>!error.message.includes('{broken')&&/malformed/.test(error.message));
assert.throws(()=>planBinding('{"layout:Custom":{"ctrl-shift-p":"personal.action"}}',parsed.record),/Personal/);
assert.throws(()=>planBinding('{"global":{"ctrl-shift-p":"personal.action"}}',null,{install:true}),/Personal/);
assert.equal(planBinding(parsed.keys.replace('"ctrl-shift-p": "app.palette"','"ctrl-shift-p": "personal.other-layout"'),parsed.record).status,'already-current','Established Custom binding does not own other layouts global keys');
assert.throws(()=>planBinding('{"terminal":{"ctrl-shift-p":"terminal"}}',parsed.record),/Higher-priority/);
assert.throws(()=>planBinding(stock,'{"version":99}'),/Unrecognized/);
assert.equal(planInstalledBinding('{"layout:Custom":{"ctrl-shift-p":"personal.action"}}',parsed.record,{installed:false}).keys,'{"layout:Custom":{"ctrl-shift-p":"personal.action"}}');
assert.equal(planBinding(stock,null).status,'not-installed');
let log='';for(let i=0;i<150;i++)log=boundedLog(log,{ok:false,status:`failure-${i}`,error:'reason'});assert.equal(log.trim().split('\n').length,128);
let unicodeLog='';for(let i=0;i<150;i++)unicodeLog=boundedLog(unicodeLog,{ok:false,status:'unicode',error:'😀'.repeat(240)});assert.ok(Buffer.byteLength(unicodeLog)<=65536);
for(const version of ['0.1.17','0.1.18','0.9.99']){
 const declarations=fs.readFileSync(`tests/fixtures/palette/herdr-${version==='0.9.99'?'0.1.18':version}.d.ts`,'utf8');
 const facts={version,declarations,gpui,commands:[{name:'mod.open',args:[{name:'name',required:true}]},{name:'overlay.close',args:[]}]};
 assert.equal(checkPaletteFacts(facts).ok,true);assert.equal(checkPaletteFacts({...facts,gpui:''}).ok,false);
 assert.ok(checkPaletteFacts({...facts,declarations:declarations.replace('export function commands(','export function removedCommands(')}).missingApi.includes('commands'));
 assert.equal(checkPaletteFacts({...facts,commands:[{name:'mod.open',args:[]}]}).ok,false);
 assert.equal(checkPaletteFacts({...facts,version:'0.1.1'}).ok,false);
}
assert.ok(missingPaletteUi('').length);
try{
 for(const machine of ['local','pc2']){
  const home=path.join(temp,machine);seedPaletteSdk(home);put(path.join(home,'keys.json'),stock);
  put(path.join(home,'data/frame-palette/store-1234567890abcdef.json'),JSON.stringify({recent:JSON.stringify(['app.help:{}']),unrelated:'kept'}));
  const first=deploy(output,home);assert.ok(first.backup);assert.equal(first.palette.ok,true);assert.equal(first.palette.history,'seeded');
  assert.equal(JSON.parse(raw(path.join(home,'.customizations/palette-recent.json'))).recent[0],'app.help:{}');
  assert.equal(guardPaletteHome(home,{startup:true}).ok,true);
  assert.equal((await installPalettePolicy(home)).status,'already-current');
  // The native update resets both its private palette bytes and user keys.
  put(path.join(home,'frame/palette/main.js'),'// newer native palette');put(path.join(home,'keys.json'),stock.replace('"f9"','"f10"'));
  let writes=0;const io={guard:async()=>guardPaletteHome(home,{startup:true}),read:async rel=>raw(path.join(home,rel)),defaults:()=>JSON.parse(stock),write:async(rel,text,expected)=>{assert.equal(raw(path.join(home,rel)),expected);writes++;put(path.join(home,rel),text);}};
  const repaired=await reconcileBinding(io);assert.equal(repaired.status,'repaired');assert.equal(writes,1);
  assert.equal(JSON.parse(raw(path.join(home,'keys.json'))).global.f10,'app.help');assert.equal(raw(path.join(home,'frame/palette/main.js')),'// newer native palette');
  const bindings=JSON.parse(raw(path.join(home,'keys.json'))),action=bindings['layout:Custom']['ctrl-shift-p'];
  let overlay=null;function press(){if(action==='mod.open:custom-palette')overlay=overlay===null?'custom-palette':null;else throw Error('Vanilla fallback');}
  press();assert.equal(overlay,'custom-palette');press();assert.equal(overlay,null,'simulated native mod.open toggles');
  fs.unlinkSync(path.join(home,'keys.json'));assert.equal((await reconcileBinding(io)).status,'repaired');
  assert.equal(JSON.parse(raw(path.join(home,'keys.json'))).global.f9,'app.help','missing keys merge native fallback defaults');
  // Every normal full Update also restores reset mappings, without enabling a patch.
  put(path.join(home,'keys.json'),stock);assert.equal(deploy(output,home).palette.status,'repaired');
  assert.equal(fs.existsSync(path.join(home,'.customizations/frame-palette.json')),false);
  const manifestFile=path.join(home,'.customizations/manifest.json'),beforeManifest=raw(manifestFile);
  put(path.join(home,'keys.json'),'{"layout:Custom":{"ctrl-shift-p":"personal.command"}}');
  assert.throws(()=>deploy(output,home),/Personal palette/);assert.equal(raw(manifestFile),beforeManifest);
  put(path.join(home,'keys.json'),parsed.keys);
  const before=raw(path.join(home,'mods/custom-palette/main.js'));put(path.join(home,'mods/custom-palette/main.js'),'personal');assert.throws(()=>guardPaletteHome(home),/changed/);put(path.join(home,'mods/custom-palette/main.js'),before);
  assert.equal(removePalettePolicy(home).removed,true);assert.equal(JSON.parse(raw(path.join(home,'keys.json')))['layout:Custom']['ctrl-shift-p'],'app.palette');
 }
 // First-install rollback derives stock routing while preserving unrelated keys/history.
 const home=path.join(temp,'rollback');seedPaletteSdk(home);put(path.join(home,'keys.json'),stock);put(path.join(home,'.migration-fixture'),'1');
 const first=deploy(output,home);rollback(home,first.backup,{fixture:true});assert.deepEqual(JSON.parse(raw(path.join(home,'keys.json'))),{...JSON.parse(stock),'layout:Custom':{'ctrl-shift-w':'custom-tabs.close-tab','ctrl-shift-p':'app.palette'}});assert.equal(raw(path.join(home,'.customizations/palette-binding.json')),null);
 const core=path.join(temp,'core-only');deploy(output,core,{shellOnly:true});assert.equal(raw(path.join(core,'keys.json')),null);assert.equal(raw(path.join(core,'.customizations/palette-binding.json')),null);
 // CAS contention retries once with fresh bytes; persistent permission failure never forces.
 const memory=new Map([['keys.json',stock],['.customizations/palette-binding.json',parsed.record]]);let attempts=0;
 const io={guard:async()=>{},read:async p=>memory.get(p)??null,defaults:()=>({}),write:async(p,v,old)=>{attempts++;if(attempts===1){memory.set(p,stock.replace('f9','f11'));throw Error('stale');}assert.equal(memory.get(p),old);memory.set(p,v);}};
 assert.equal((await reconcileBinding(io)).ok,true);assert.equal(JSON.parse(memory.get('keys.json')).global.f11,'app.help');
 memory.set('keys.json',stock);await assert.rejects(reconcileBinding({...io,write:async()=>{throw Error('permission');}}),/permission/);
 // Mounted startup/hot reload uses only the facade to mutate keys.
 const mounted=path.join(temp,'mounted');seedPaletteSdk(mounted);put(path.join(mounted,'keys.json'),stock);deploy(output,mounted);put(path.join(mounted,'keys.json'),stock);
 const shared=new Map([['layout','Custom']]),timers=[],tasks=[],notifications=[];let checks=false,fail=false,guards=0;
 const catalog=()=>{const value=JSON.parse(raw(path.join(mounted,'keys.json'))??stock);return Object.entries(value).flatMap(([section,items])=>Object.entries(items).map(([keys,action])=>({section,keys,action})));};
 const api={appHome:()=>mounted,checking:()=>checks,hostVersion:()=> '0.1.18',requireHostCapabilities(){},commands:()=>[{name:'mod.open',args:[{name:'name'}]}],keys:catalog,notify:n=>notifications.push(n),window:()=>({active:true}),shared:k=>shared.get(k),setShared:(k,v)=>shared.set(k,v),readTextFile:async p=>raw(p),writeTextFile:async(p,v,old)=>{if(fail)throw Error('denied');assert.equal(raw(p),old);put(p,v);},exec:async(_command,args)=>{if(args[0].endsWith('startup-frames.mjs'))return {code:0,stdout:JSON.stringify(restoreStartupFrames(mounted,path.join(mounted,'.customizations/runtime')))};if(args[1]==='startup')return {code:0,stdout:JSON.stringify(await installPalettePolicy(mounted,{startup:true}))};guards++;try{return {code:0,stdout:JSON.stringify(inspectPaletteState(mounted,{startup:true}))};}catch{return {code:1,stderr:'{}'};}}};
 const context=vm.createContext({console,Date,Math}),cache=new Map();
 const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});
 const moduleFor=file=>{if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));return cache.get(file);};
 const mod=moduleFor(path.join(output,'mods/custom-workspace-chrome/palette-startup.js'));
 await mod.link((s,ref)=>s==='./host.js'?synthetic(api):moduleFor(path.resolve(path.dirname(ref.identifier),s)));await mod.evaluate();
 const cx={sleep:async()=>{},timer:{every:(_ms,fn)=>{timers.push(fn);return {cancel(){}};}},spawn:fn=>tasks.push(fn(cx))};
 const owner={};mod.namespace.initPalettePolicy(owner,cx);mod.namespace.initPalettePolicy({},cx);await Promise.all(tasks.splice(0));assert.equal(guards,1,'duplicate copies share one lease');
 assert.equal(shared.get('custom.palette.status').ok,true);assert.equal(catalog().find(b=>b.section==='layout:Custom'&&b.keys==='ctrl-shift-p').action,PALETTE_ACTION);
 put(path.join(mounted,'keys.json'),stock);timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(shared.get('custom.palette.status').ok,true);
 put(path.join(mounted,'keys.json'),stock);fail=true;shared.set('custom.palette.retry',1);timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(shared.get('custom.palette.status').ok,false);assert.equal(notifications.length,1);
 shared.set('custom.palette.retry',2);timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(notifications.length,1,'same failure notification deduplicated');
 fail=false;shared.set('custom.palette.retry',3);timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(shared.get('custom.palette.status').ok,true);
 const collision=JSON.stringify({global:{'ctrl-shift-p':'app.palette'},terminal:{'shift-ctrl-p':'terminal'}});
 put(path.join(mounted,'keys.json'),collision);shared.set('custom.palette.retry',4);timers[0](cx);await Promise.all(tasks.splice(0));
 assert.equal(shared.get('custom.palette.status').ok,false,'Equivalent higher-priority spelling cannot report startup success');assert.match(shared.get('custom.palette.status').error,/Higher-priority/);assert.equal(raw(path.join(mounted,'keys.json')),collision);
 // A mounted/reloaded Custom with an orphaned action corrects it even without
 // SDK files or a sidecar; personal rebinding is retained and stale intent removed.
 fs.unlinkSync(path.join(mounted,'mods/custom-palette/main.js'));fs.unlinkSync(path.join(mounted,'herdr.d.ts'));fs.unlinkSync(path.join(mounted,'gpui-kit.d.ts'));
 put(path.join(mounted,'keys.json'),parsed.keys);shared.set('custom.palette.retry',5);timers[0](cx);await Promise.all(tasks.splice(0));
 assert.equal(shared.get('custom.palette.status').ok,true);assert.equal(shared.get('custom.palette.status').installed,false);
 assert.equal(JSON.parse(raw(path.join(mounted,'keys.json')))['layout:Custom']['ctrl-shift-p'],'app.palette');assert.equal(raw(path.join(mounted,'.customizations/palette-binding.json')),null);
 put(path.join(mounted,'keys.json'),parsed.keys);shared.set('custom.palette.retry',6);timers[0](cx);await Promise.all(tasks.splice(0));
 assert.equal(JSON.parse(raw(path.join(mounted,'keys.json')))['layout:Custom']['ctrl-shift-p'],'app.palette');assert.equal(raw(path.join(mounted,'.customizations/palette-binding.json')),null);
 const personal='{"layout:Custom":{"ctrl-shift-p":"personal.command"},"global":{"f9":"app.help"}}';put(path.join(mounted,'keys.json'),personal);put(path.join(mounted,'.customizations/palette-binding.json'),parsed.record);
 shared.set('custom.palette.retry',7);timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(raw(path.join(mounted,'keys.json')),personal);assert.equal(raw(path.join(mounted,'.customizations/palette-binding.json')),null);
 checks=true;const n=timers.length;mod.namespace.initPalettePolicy({},cx);assert.equal(timers.length,n,'native checks never arm repair');
 owner.sidebarClosed=true;const before=guards;timers[0](cx);await Promise.all(tasks.splice(0));assert.equal(guards,before);
 console.log('PASS owned palette persistence: capabilities, local/pc2 install, resets, missing defaults, update/reload, CAS/conflicts, rollback, Core-only exclusion, coalesced public-API startup and failure notifications');
}finally{restoreHost();fs.rmSync(temp,{recursive:true,force:true});}
