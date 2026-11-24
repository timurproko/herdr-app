import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {build} from '../tools/build.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {paletteCommand} from '../src/integration/native-patches/palette/routing.js';
const {output}=build(),source='src/integration/native-patches/palette';
const provenance=JSON.parse(fs.readFileSync(`${source}/provenance.json`));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const put=(file,bytes)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const temp=fs.mkdtempSync(path.resolve('.artifacts/palette-stock-'));
const snapshot=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(dir,file),fs.readFileSync(file).toString('base64')];}));
const stock=name=>fs.readFileSync(`${source}/${name}`);
try {
 for(const record of provenance.originals){
  const raw=stock(record.file);assert.equal(sha(raw),record.sha256);assert.equal(raw.length,record.bytes);
  assert.deepEqual(fs.readFileSync(path.join(output,'frame-patches/palette',record.file)),raw);
  assert.match(raw.toString(),/from "herdr"/);assert.doesNotMatch(raw.toString(),/\.\/host\.js/);
  const home=path.join(temp,record.file),main=path.join(home,'frame/palette/main.js'),state=path.join(home,'.customizations/frame-palette.json');
  const options={binary:Buffer.concat([Buffer.from('synthetic executable\0'),raw])};
  put(main,raw);assert.deepEqual(restoreStartupFrames(home,output,options),{ok:true,frames:{}});
  framePatch('apply',home,output,'palette',options);
  const expected=['v0.1.17','v0.1.18'].includes(record.release)?`main-${record.release.slice(1)}.js`:'main.js';
  assert.equal(fs.readFileSync(main,'utf8'),fs.readFileSync(`${source}/${expected}`,'utf8'));
  assert.match(inspectFramePatch(home,output,'palette',options).main,new RegExp(expected.replaceAll('.','\\.')));
  assert.equal(restoreStartupFrames(home,output,options).ok,true);assert.match(framePatch('check',home,output,'palette',options),/match/);
  const before=snapshot(home),stamp=fs.statSync(state).mtimeMs;
  assert.match(framePatch('apply',home,output,'palette',options),/already current/);assert.deepEqual(snapshot(home),before);assert.equal(fs.statSync(state).mtimeMs,stamp);
  const unknown=restoreStartupFrames(home,output,{binary:Buffer.from('unknown future binary')});assert.equal(unknown.ok,true);assert.equal(unknown.frames.palette.status,'skipped');assert.deepEqual(snapshot(home),before);
  for(const pair of [['original.js','original-0.1.17.js'],['original-0.1.17-windows.js','original-0.1.18-windows.js']]){
   const ambiguous=restoreStartupFrames(home,output,{binary:Buffer.concat(pair.map(stock))});assert.equal(ambiguous.frames.palette.status,'skipped');assert.deepEqual(snapshot(home),before);
  }
  framePatch('restore',home,output,'palette',options);assert.deepEqual(fs.readFileSync(main),raw,'Restore never downgrades stock or normalizes bytes');
 }
 // Native reset AND an old owned entrypoint masking the release update.
 for(const version of ['0.1.17','0.1.18'])for(const reset of [false,true]){
  const home=path.join(temp,`upgrade-${version}-${reset}`),main=path.join(home,'frame/palette/main.js'),state=path.join(home,'.customizations/frame-palette.json');
  const old=stock(version==='0.1.18'?'original-0.1.17-windows.js':'original-windows.js'),updated=stock(`original-${version}-windows.js`),options={binary:updated};
  put(main,old);framePatch('apply',home,output,'palette',{binary:old});
  if(reset)put(main,updated);else assert.throws(()=>framePatch('check',home,output,'palette',options),/inactive/,'Old owned payload is not certified for the new original');
  assert.equal(restoreStartupFrames(home,output,options).ok,true);
  assert.equal(fs.readFileSync(main,'utf8'),fs.readFileSync(`${source}/main-${version}.js`,'utf8'));
  const record=JSON.parse(fs.readFileSync(state));assert.equal(record.original['main.js'],updated.toString());assert.ok(record.previousOriginals.includes(old.toString()),'Earlier raw backup retained');
  put(main,'// unknown future stock');const before=snapshot(home);const result=restoreStartupFrames(home,output,options);assert.equal(result.ok,true);assert.equal(result.frames.palette.status,'skipped');assert.match(result.frames.palette.advisory,/unknown target/);assert.deepEqual(snapshot(home),before);
  put(main,fs.readFileSync(`${source}/main-${version}.js`));
  const goodState=fs.readFileSync(state);record.previousOriginals={bad:true};put(state,JSON.stringify(record));assert.throws(()=>inspectFramePatch(home,output,'palette',options),/Unrecognized/);put(state,goodState);
  const helper=path.join(home,'frame/palette/custom-ui.js'),goodHelper=fs.readFileSync(helper);put(helper,'personal');assert.equal(restoreStartupFrames(home,output,options).ok,false);put(helper,goodHelper);
  framePatch('restore',home,output,'palette',options);assert.deepEqual(fs.readFileSync(main),updated);
 }
 // Actual native and Custom catalogs, not a restated theme-filter implementation.
 let dark=true,layout='Custom',skin=true,usage;
 const calls=[],overlays=[],storage=new Map();
 const available=[{name:'aurora-night',light:false},{name:'paper-day',light:true},{name:'Custom',light:false},{name:'main',light:false},{name:'terminals',light:true}];
 const names=['app.theme','app.settings','tab.rename','space.rename','tab.close','pane.close','space.close','layout.clone','mod.clone','fixture.new_action'];
 const arg=(name,required=false)=>({name,required});
 const argumentsByName={
  'mod.open':[arg('name',true)],'mod.clone':[arg('name',true)],'layout.clone':[arg('name',true)],
  'tab.rename':[arg('name',true),arg('id')],'space.rename':[arg('name',true),arg('id')],
  'tab.close':[arg('id')],'space.close':[arg('id')],'pane.close':[arg('pane')],
  'space.select':[arg('id'),arg('index')],'fixture.required':[arg('value',true)],
  'fixture.complex':[arg('alpha',true),arg('beta')],
 };
 const host={appHome:()=>temp,commands:()=>[...new Set([...names,...Object.keys(argumentsByName)])].map(name=>({name,args:argumentsByName[name]??[],about:'fixture'})),layouts:()=>['main','Custom','terminals'],themes:()=>available,settings:()=>({dark}),shared:key=>key==='custom.plugins'?{usage:{enabled:usage}}:layout,window:()=>({platform:'windows'}),keys:()=>[],props:()=>({overlay:'fixture'}),run:(...args)=>calls.push(args),closeOverlay(){},openOverlay:spec=>overlays.push(spec)};
 const manifestFiles={...fs.promises,exists:async file=>fs.existsSync(file)};
 async function load(file){
  const context=vm.createContext({console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
  const text=fs.readFileSync(`${source}/${file}`,'utf8');
  const module=new vm.SourceTextModule(text+'\nexport { entries, keyOf };',{context});
  const imports=new Map([...text.matchAll(/import \{([^}]+)\} from "([^"]+)"/g)].map(m=>[m[2],m[1].split(',').map(n=>n.trim().split(/\s+as\s+/)[0])]));
  await module.link(name=>{
   const values=Object.fromEntries(imports.get(name).map(key=>[key,()=>{}]));
   if(name==='herdr'||name==='./host.js')Object.assign(values,host);
   if(name==='fs/promises')Object.assign(values,Object.fromEntries(Object.keys(values).map(k=>[k,manifestFiles[k]])));
   if(name==='gpui-kit')values.View=class{};
   if(name==='./custom-look.js')values.isCustom=()=>skin;
   if(name==='./custom-routing.js')values.paletteCommand=paletteCommand;
   return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});
  });await module.evaluate();return module.namespace;
 }
 const native=await load('original-0.1.17.js'),custom=await load('main-0.1.17.js'),legacy=await load('main.js');
 const native18=await load('original-0.1.18.js'),custom18=await load('main-0.1.18.js');
 const plain=v=>JSON.parse(JSON.stringify(v));
 const themes=ns=>JSON.parse(JSON.stringify(ns.entries().filter(e=>e.name==='app.theme')));
 for(const mode of [false,true])for(const active of ['Custom','main','terminals']){
  dark=mode;layout=active;
  assert.deepEqual(themes(custom),themes(native),'Native dynamic choices, IDs and arguments preserved exactly');
  assert.deepEqual(themes(custom18),themes(native18),'0.1.18 retains native dynamic themes too');
 }
 dark=true;layout='Custom';assert.deepEqual(themes(custom).map(e=>e.args.name),['aurora-night','Custom']);
 dark=false;assert.deepEqual(themes(custom).map(e=>e.args.name),['paper-day']);
 layout='terminals';assert.deepEqual(themes(custom).map(e=>e.args.name),['paper-day','terminals']);
 assert.deepEqual(themes(legacy).map(e=>e.args.name),['graphite','ink','moss','atom-one-dark']);
 for(const ns of [custom,legacy,custom18]){
  skin=true;assert.ok(ns.entries().some(e=>e.title==='Usage'));assert.ok(ns.entries().some(e=>e.name==='fixture.new_action'));
  const palette=new ns.default();palette.recent=[];
  for(const [name,expected]of [['app.settings','mod.open'],['tab.rename','custom-tabs.rename-tab'],['space.rename','custom-tabs.rename-space'],['tab.close','custom-tabs.close-tab'],['pane.close','custom-tabs.close-pane'],['space.close','custom-tabs.close-space']]){palette.go({name,args:{},id:name});assert.equal(calls.at(-1)[0],expected);}
  for(const name of ['picker','settings','machine-add','worktree']){palette.go({name:'mod.open',args:{name},id:name});assert.equal(calls.at(-1)[1].name,`custom-${name}`);}
  const e=themes(custom)[0];palette.go(e);assert.equal(calls.at(-1)[0],'app.theme');assert.equal(calls.at(-1)[1].name,e.args.name);
  skin=false;assert.ok(!ns.entries().some(e=>e.title==='Usage'));palette.go({name:'tab.close',args:{},id:'tab.close'});assert.equal(calls.at(-1)[0],'tab.close');
 }
 // Real 0.1.18 manifest reader and catalog: invalid and duplicate metadata never
 // gets privileged by the rebase. No installed mod or native executable is used.
 skin=false;
 const p=(title,command,args={},extra={})=>({title,command,args,...extra});
 const contributions=[
  p('Duplicate built-in','tab.close'),p('Open demo','mod.open',{name:'demo'}),
  p('Missing mod','mod.open',{name:'missing'}),p('Missing main','mod.open',{name:'no-main'}),
  p('Mod action','demo.action',{}, {group:'Recent',words:'special'}),
  p('Foreign action','foreign.action'),p('Own args','demo.args',{bad:1}),
  p('Canonical first','fixture.complex',{beta:2,alpha:'a'},{group:' Tools '}),
  p('Canonical duplicate','fixture.complex',{alpha:'a',beta:2}),
  p('Missing required','fixture.required'),p('Blank required','fixture.required',{value:'  '}),
  p('Unknown arg','fixture.required',{value:'ok',bad:1}),p('Array args','fixture.required',[]),
  p('Valid required','fixture.required',{value:'ok'},{group:'',words:2}),
  p('Rename prompt target','tab.rename',{id:'pc2/tab'}),
  p('Explicit rename','space.rename',{id:'pc2/space',name:'new'}),
  p('Invalid target','tab.close',{id:4}),p('Targeted close','tab.close',{id:'pc2/tab'}),
  p('Pane close','pane.close',{pane:'pc2/pane'}),p('Space close','space.close',{id:'pc2/space'}),
  p('Clone mod','mod.clone',{name:'demo'}),p('Clone layout','layout.clone',{name:'main'}),
  p('Select index','space.select',{index:2}),p('Numeric id','space.select',{id:'2'}),
  p('Select id','space.select',{id:'space-a'}),p('Negative index','space.select',{index:-1}),
  p('Fraction index','space.select',{index:1.5}),p('Unsafe index','space.select',{index:9007199254740992}),
  p('String index','space.select',{index:'2'}),p('Index and id','space.select',{index:2,id:'space-a'}),
  p('', 'demo.empty'),p('No command',4),null,[],17,
 ];
 put(path.join(temp,'mods/demo/main.js'),'// fixture only');
 put(path.join(temp,'mods/demo/mod.json'),JSON.stringify({palette:contributions}));
 put(path.join(temp,'mods/aaa/mod.json'),JSON.stringify({palette:[p('Earlier own action','aaa.action')]}));
 put(path.join(temp,'mods/zzz/mod.json'),JSON.stringify({palette:[p('Later own action','zzz.action')]}));
 put(path.join(temp,'mods/.hidden/mod.json'),JSON.stringify({palette:[p('Hidden','hidden.action')]}));
 put(path.join(temp,'mods/broken/mod.json'),'{bad json');
 put(path.join(temp,'mods/not-a-list/mod.json'),JSON.stringify({palette:{title:'no'}}));
 put(path.join(temp,'mods/no-main/mod.json'),'{}');
 fs.mkdirSync(path.join(temp,'mods/unreadable/mod.json'),{recursive:true});
 const mods=await native18.modPalettes(temp),customMods=await custom18.modPalettes(temp);
 assert.deepEqual(plain(customMods),plain(mods));
 assert.equal(mods[0].mod,'aaa');assert.equal(mods.at(-1).mod,'zzz');
 for(const title of ['Missing mod','Missing main','Hidden'])assert.ok(!mods.some(m=>m.title===title));
 assert.deepEqual(plain(await custom18.modPalettes(path.join(temp,'absent'))),[]);
 const all=plain(native18.entries(mods));
 assert.deepEqual(plain(custom18.entries(customMods)),all,'Non-Custom catalog equals real native 0.1.18 catalog');
 const extras=all.filter(e=>!native18.entries().some(base=>base.id===e.id));
 assert.deepEqual(extras.map(e=>e.title),['Earlier own action','Open demo','Mod action','Canonical first','Valid required','Rename prompt target','Explicit rename','Targeted close','Pane close','Space close','Clone mod','Clone layout','Select index','Numeric id','Select id','Negative index','Fraction index','Unsafe index','String index','Index and id','Later own action']);
 assert.equal(extras.find(e=>e.title==='Mod action').group,'Mod');
 assert.equal(extras.find(e=>e.title==='Canonical first').group,'Tools');
 assert.equal(extras.find(e=>e.title==='Valid required').words,' demo');
 const complex=extras.find(e=>e.title==='Canonical first');
 assert.equal(complex.id,'fixture.complex:{"alpha":"a","beta":2}');
 // Each entry matches the same native key semantics, with an independently
 // specified expected binding. Numeric target ids are not numeric indices.
 const keyCases=[
  ['Select index','space.select:2',true],['Numeric id','space.select:2',false],
  ['Select id','space.select:space-a',true],['Negative index','space.select:-1',false],
  ['Fraction index','space.select:1.5',false],['Unsafe index','space.select:9007199254740992',false],
  ['String index','space.select:2',false],['Index and id','space.select:2',false],
  ['Canonical first',JSON.stringify({command:'fixture.complex',args:{alpha:'a',beta:2}}),true],
  ['Canonical first',JSON.stringify({command:'fixture.complex',args:{alpha:'different',beta:2}}),false],
  ['Canonical first','{not-json',false],['Open demo','mod.open:demo',true],
  ['Mod action','demo.action',true],
 ];
 for(const [title,action,matches]of keyCases){
  const entry=extras.find(e=>e.title===title),bound=[{section:'global',keys:'ctrl-k',action}];
  assert.equal(native18.keyOf(entry,bound),matches?'ctrl-k':null,title);
  assert.equal(custom18.keyOf(entry,bound),native18.keyOf(entry,bound),title);
  assert.equal(custom18.keyOf(entry,[{...bound[0],section:'layout:Custom'}]),null,'Only global bindings are displayed');
 }
 for(const skinMode of [false,true]){
  skin=skinMode;
  for(const enabled of [undefined,false,true]){
   usage=enabled;
   const catalog=plain(custom18.entries(mods)),withoutUsage=catalog.filter(e=>e.title!=='Usage');
   assert.deepEqual(withoutUsage,all);assert.equal(catalog.some(e=>e.title==='Usage'),skin&&enabled!==false);
   if(catalog.some(e=>e.title==='Usage'))assert.equal(catalog.find(e=>e.title==='Usage').words,'quota limits account credits remaining');
  }
  const palette=new custom18.default();palette.recent=[];
  const stockPalette=new native18.default();stockPalette.recent=[];
  for(const entry of extras){
   stockPalette.go(entry);const nativeCall=plain(calls.at(-1));
   palette.go(entry);const customCall=plain(calls.at(-1));
   assert.deepEqual(customCall,nativeCall,`Explicit/own native dispatch: ${entry.title}`);
   assert.equal(palette.recent[0],entry.id,'History uses native entry IDs');
  }
  for(const command of ['mod.clone','layout.clone']){
   const entry={name:command,args:{},id:`${command}:{}`};
   const n=overlays.length;palette.go(entry);
   if(command==='mod.clone')assert.equal(overlays.length,n+1,'Default mod clone still prompts');
   else assert.deepEqual(plain(calls.at(-1)),['layout.clone',{name:'terminals'}],'Default layout source remains current native layout');
  }
  palette.mods=mods;palette.query='';palette.recent=[];
  assert.ok(palette.rows().some(r=>r.head==='Mod'),'Native Mod group is reachable');
  palette.query='special';assert.equal(palette.rows()[0].e.title,'Mod action','Manifest keywords are searchable');
 }
 console.log('PASS real palette stock: raw provenance/build, 0.1.13/16/17/18 selection, masked/reset upgrades, backups, safe skips/conflicts, actual native themes/manifests/validation/deduplication/hotkeys/clone/target dispatch, Usage policy and Custom routes');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
