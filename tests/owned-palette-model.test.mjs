import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {entries,keyOf,activation,rows,remember,recentIds} from '../src/features/palette/model.js';
import {manifestPalettes,legacyRecent} from '../src/services/palette-manifests.mjs';
import {build} from '../tools/build.mjs';
const plain=v=>JSON.parse(JSON.stringify(v));
const text=fs.readFileSync('tests/fixtures/palette/stock-0.1.18.js','utf8');
assert.equal(crypto.createHash('sha256').update(text).digest('hex'),'f8cbfb955ab3ef4474012dbb7103a7b8c5260c9c6ccde96aea6952a4980124dc');
let commands=[],dark=true,layout='Custom';
const layouts=['main','Custom','terminals'],themes=[{name:'Custom',light:false},{name:'main',light:false},{name:'night',light:false},{name:'day',light:true},{name:'terminals',light:true}];
function native(source,modern){
  const cx=vm.createContext({View:class{},commands:()=>commands,layouts:()=>layouts,themes:()=>themes,settings:()=>({dark}),shared:()=>layout,win:()=>({platform:'windows'})});
  vm.runInContext(source.replace(/^import .*;\r?$/gm,'').replaceAll('export default class','class').replaceAll('export async function','async function')+`\nglobalThis.stock={entries,keyOf,NAMED${modern?',modEntry':''}};`,cx);
  return cx.stock;
}
const stock=native(text,true),old=native(fs.readFileSync('src/integration/native-patches/palette/original-0.1.17.js','utf8'),false);
commands=[...new Set(stock.NAMED.map(e=>e[0]))].map(name=>({name,args:[],about:'fixture'}));
commands.push({name:'fixture.new_action',args:[],about:'new command'},{name:'tab.select',args:[{name:'id',required:false},{name:'index',required:false}],about:'select'}, {name:'layout.clone',args:[{name:'name',required:true}],about:'clone'});
commands.find(c=>c.name==='mod.open').args=[{name:'name',required:true}];
const mods=[{mod:'extra',command:'mod.open',args:{name:'extra'},title:'Extra'}, {mod:'extra',command:'extra.run',title:'Run extra'}, {mod:'extra',command:'other.run',title:'Wrong owner'}, {mod:'extra',command:'mod.open',args:{},title:'Missing'}, {mod:'extra',command:'tab.select',args:{index:2},title:'Second tab'}, {mod:'extra',command:'layout.clone',args:{name:'main'},title:'Clone main'}, {mod:'extra',command:'tab.select',args:{alien:2},title:'Unknown'}, {mod:'extra',command:'tab.select',args:{id:22},title:'Bad target'}, {mod:'extra',command:'extra.run',title:'Duplicate'}];
for(const mode of [false,true])for(const active of layouts){dark=mode;layout=active;const facts={commands,layouts,themes,dark,layout,platform:'windows'};assert.deepEqual(entries(facts),plain(old.entries()));assert.deepEqual(plain(entries(facts,mods)),plain(stock.entries(mods)));}
const facts={commands,layouts,themes,dark,layout,platform:'windows'};
const bound=[{section:'global',keys:'f1',action:'tab.select:2'},{section:'global',keys:'f2',action:JSON.stringify({command:'layout.clone',args:{name:'main'}})}];
for(const e of entries(facts,mods))assert.equal(keyOf(e,bound),stock.keyOf(e,bound));
assert.ok(entries({...facts,usage:true}).some(e=>e.title==='Usage'));assert.ok(!entries(facts).some(e=>e.title==='Usage'));
for(const kind of ['tab','pane','space']){
 assert.equal(activation({name:`${kind}.close`,args:{}},layout).name,`custom-tabs.close-${kind}`);
 assert.deepEqual(activation({name:`${kind}.close`,args:{id:'pc2/explicit'}},layout),{name:`${kind}.close`,args:{id:'pc2/explicit'}});
}
for(const kind of ['tab','space']){assert.equal(activation({name:`${kind}.rename`,args:{}},layout).name,`custom-tabs.rename-${kind}`);assert.equal(activation({name:`${kind}.rename`,args:{id:'captured',name:'literal'}},layout).name,`${kind}.rename`);}
for(const name of ['picker','settings','worktree','machine-add'])assert.equal(activation({name:'mod.open',args:{name}},layout).args.name,`custom-${name}`);
assert.equal(activation({name:'app.settings',args:{}},layout).args.name,'custom-settings');
assert.deepEqual(activation({name:'app.settings',args:{section:'updates'}},layout),{settings:{section:'updates'}});
assert.ok(!entries({...facts,usage:false},[{mod:'extra',command:'mod.open',args:{name:'custom-usage'},title:'Usage via manifest'}]).some(e=>e.args?.name==='custom-usage'));
assert.deepEqual(activation({name:'mod.clone',args:{name:'explicit'}},layout),{name:'mod.clone',args:{name:'explicit'}});
assert.deepEqual(activation({name:'mod.clone',args:{}},layout),{prompt:true});
assert.deepEqual(activation({name:'layout.clone',args:{}},'Custom').args,{name:'Custom'});
assert.deepEqual(activation({name:'layout.clone',args:{name:'explicit'}},layout).args,{name:'explicit'});
const all=entries(facts),recent=remember([],all[1].id);assert.equal(rows(all,'',recent)[0].head,'Recent');assert.ok(rows(all,'new',[]).length);assert.deepEqual(recentIds(JSON.parse(JSON.stringify(recent))),recent);assert.deepEqual(recentIds({bad:true}),[]);
const root=fs.mkdtempSync(path.resolve('.artifacts/palette-model-'));
const put=(name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
try{
 put('mods/extra/mod.json',JSON.stringify({palette:mods}));put('mods/extra/main.js','throw new Error("must not execute")');put('mods/.hidden/mod.json','{}');put('mods/broken/mod.json','broken');
 const found=await manifestPalettes(root);assert.ok(found.length);assert.ok(found.every(p=>p.mod==='extra'));assert.ok(!found.some(p=>p.args?.name==='missing'));
 put('data/frame-palette/store-1234567890abcdef.json',JSON.stringify({recent:JSON.stringify(recent),unrelated:'leave'}));
 assert.deepEqual(await legacyRecent(root),recent);const before=fs.readFileSync(path.join(root,'data/frame-palette/store-1234567890abcdef.json'));
 assert.deepEqual(await legacyRecent(root),recent);assert.deepEqual(fs.readFileSync(path.join(root,'data/frame-palette/store-1234567890abcdef.json')),before);
 put('data/frame-palette/store-1234567890abcdef.json','{"recent":42}');await assert.rejects(legacyRecent(root),/Unrecognized/);
 const {output}=build();assert.ok(fs.existsSync(path.join(output,'scripts/palette-manifests.mjs')));
 const bundle=JSON.parse(fs.readFileSync(path.join(output,'bundle.json')));assert.ok(bundle.files['.customizations/runtime/scripts/palette-manifests.mjs']);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('PASS owned palette: real 0.1.17/18 catalog parity, manifests, hotkeys, clone args, target-bound routing, Usage, metadata-only worker and stable history');
