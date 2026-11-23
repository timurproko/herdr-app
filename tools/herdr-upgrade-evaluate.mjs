// Source-only evaluation. No native binary, upstream script, or downloaded JS is run.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {HOST_CONTRACT,apiCandidates} from '../src/integration/herdr/compatibility.js';
import {checkHostFacts,hostSourceFacts} from './host-api-facts.mjs';
import {inventory as treeInventory,inventoryHash,compareRelease} from './check-tab-move.mjs';
import {commitSha,gitBlob,githubUrl,sha256,safePath} from './herdr-upgrade-releases.mjs';

export function walkSources(root) {
  const result={};
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&file.endsWith('.js'))result[path.relative(root,file).replaceAll('\\','/')]=fs.readFileSync(file,'utf8');}}
  walk(path.join(root,'src'));return result;
}
export function parseCommands(text) {
  const body=/pub const COMMANDS:\s*&\[Command\]\s*=\s*&\[([\s\S]*?)\n\];/.exec(text)?.[1];
  if(!body)throw Error('Unsupported upstream command catalog syntax.');
  const input=body.replace(/^\s*\/\/[^\n]*$/gm,''),result={};
  const pattern=/cmd\(\s*"([a-zA-Z0-9_.]+)"\s*,\s*&\[([^\]]*)\]\s*,\s*"((?:\\.|[^"\\])*)"\s*\)/g;
  const remainder=input.replace(pattern,(_whole,name,args)=>{
    if(Object.hasOwn(result,name))throw Error('Duplicate upstream command.');
    const values=[];const rest=args.replace(/(req|opt)\(\s*"([a-zA-Z0-9_]+)"\s*\)/g,(_m,kind,arg)=>{values.push({name:arg,required:kind==='req'});return '';});
    if(rest.replace(/[\s,]/g,''))throw Error('Unsupported upstream command arguments.');
    result[name]=values;return '';
  });
  if(!Object.keys(result).length||remainder.replace(/[\s,]/g,''))throw Error('Unsupported upstream command declaration; no partial catalog accepted.');
  return result;
}
export function sdkSurface(text,required=HOST_CONTRACT.api) {
  // Top-level declaration boundaries preserve multiline interfaces and return types.
  const declarations={};const matches=[...text.matchAll(/^export (?:declare )?(function|interface|type|class|const|enum)\s+(\w+)/gm)];
  for(let i=0;i<matches.length;i++)declarations[matches[i][2]]=text.slice(matches[i].index,matches[i+1]?.index??text.length).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'').trim();
  const needed=new Set(required);let changed=true;
  while(changed){changed=false;for(const name of [...needed])for(const word of (declarations[name]??'').match(/\b[A-Za-z_]\w*\b/g)??[])if(declarations[word]&&!needed.has(word)){needed.add(word);changed=true;}}
  return Object.fromEntries([...needed].sort().map(name=>[name,declarations[name]??null]));
}
export function surfaceChanges(before,after) {
  return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(n=>JSON.stringify(before[n]??null)!==JSON.stringify(after[n]??null)).map(name=>({name,before:before[name]??null,after:after[name]??null}));
}
export function unifiedDiff(before,after,beforeName,afterName, scratch) {
  fs.mkdirSync(scratch,{recursive:true});
  const a=path.join(scratch,'before'),b=path.join(scratch,'after');fs.writeFileSync(a,before);fs.writeFileSync(b,after);
  const result=cp.spawnSync('git',['diff','--no-index','--no-ext-diff','--no-textconv','--text','--',a,b],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000,windowsHide:true});
  if(result.error||![0,1].includes(result.status))throw Error(`Diff failed: ${result.error?.message??result.stderr}`);
  return (result.stdout??'').replace(/^diff --git .*\n/,'').replace(/^index .*\n/m,'').replace(/^--- .*$/m,`--- ${beforeName}`).replace(/^\+\+\+ .*$/m,`+++ ${afterName}`);
}
export async function sourceRepository(component,commit,get) {
  commitSha(commit);const tree=treeInventory(await get(githubUrl(component,`git/trees/${commit}?recursive=1`)));
  const entries=new Map(tree.map(e=>[e[0],e]));const cache=new Map();let total=0;
  return {tree,entries,read:async file=>{
    safePath(file);const entry=entries.get(file);
    if(!entry||entry[2]!=='blob'||entry[1]!=='100644')throw Error(`Missing or non-regular upstream source: ${file}`);
    if(!cache.has(file))cache.set(file,(async()=>{
      const data=await get(githubUrl(component,`git/blobs/${entry[3]}`));
      if(data.sha!==entry[3]||data.encoding!=='base64'||typeof data.content!=='string')throw Error(`Invalid source blob: ${file}`);
      const bytes=Buffer.from(data.content.replace(/\s/g,''),'base64');total+=bytes.length;
      if(bytes.length>4*1024*1024||total>64*1024*1024||gitBlob(bytes)!==entry[3])throw Error(`Source size/hash mismatch: ${file}`);
      return bytes;
    })());return cache.get(file);
  }};
}
export class StepRunner {
  constructor(){this.steps=[];this.evidence={};}
  async step(name,operation,work,{requires=[],skip}={}) {
    const prior=requires.filter(n=>this.steps.find(s=>s.name===n)?.status!=='passed');
    const record={name,operation,requires,status:'passed',detail:'',evidence:`logs/${name}.txt`};
    try {
      if(skip){record.status='skipped';record.detail=skip;}
      else if(prior.length){record.status='blocked';record.detail=`Prerequisite not passed: ${prior.join(', ')}`;}
      else {const result=await work();Object.assign(record,typeof result==='string'?{detail:result}:result);}
    }catch(error){record.status='failed';record.detail=error.message;}
    this.evidence[record.evidence]=record.log??record.detail;delete record.log;
    record.detail=String(record.detail??'').slice(0,2000);this.steps.push(record);return record;
  }
}
export function testEnvironment(env=process.env) {
  const allowed=['PATH','Path','HOME','USERPROFILE','SYSTEMROOT','SystemRoot','WINDIR','COMSPEC','ComSpec','PATHEXT','TEMP','TMP','TMPDIR','APPDATA','LOCALAPPDATA','ProgramFiles','ProgramFiles(x86)','NUMBER_OF_PROCESSORS'];
  return {...Object.fromEntries(allowed.filter(k=>env[k]!==undefined).map(k=>[k,env[k]])),CI:'true'};
}
export function runCheck(root,args,{spawn=cp.spawnSync}={}) {
  const result=spawn(process.execPath,args,{cwd:root,env:testEnvironment(),encoding:'utf8',timeout:20*60*1000,maxBuffer:16*1024*1024,windowsHide:true});
  return {status:!result.error&&result.status===0?'passed':'failed',exitCode:result.status??null,detail:result.error?.message??`exit ${result.status}`,log:`node ${args.join(' ')}\n${result.stdout??''}\n${result.stderr??''}`};
}
const npmScript=(root,name)=>runCheck(root,['--run',name]);
export async function evaluateCandidate({root,inventory,discovery,get,baseSha,headSha,scratch,run=runCheck,runScript=npmScript,skipTests=false}) {
  commitSha(baseSha);commitSha(headSha);
  const runner=new StepRunner(),repos={},evidence=runner.evidence,checks={},actions=[];
  const addAction=(id,problem,files,proof,command)=>actions.push({id,problem,files,evidence:proof,command});
  const diff=(name,before,after,beforeName,afterName)=>{evidence[`diffs/${name}.diff`]=unifiedDiff(before,after,beforeName,afterName,path.join(scratch,'diff'));return `diffs/${name}.diff`;};
  const files=walkSources(root),facts=hostSourceFacts(files);
  for(const component of ['app','core']) {
    const release=discovery.releases[component],pin=component==='app'?inventory.appSource:inventory.coreSource;
    await runner.step(`${component}-feed`,`GET releases.herdr.dev/${component}/latest.json`,()=>{
      if(discovery.errors[component]&&!release)throw Error(discovery.errors[component]);
      if(!release)throw Error('Feed unavailable.');return {detail:`${release.version}; feed SHA-256 ${release.feedSha256}`};
    });
    await runner.step(`${component}-source`,'Resolve immutable tag, complete tree and reviewed source hashes',async()=>{
      if(!release?.commit)throw Error(discovery.errors[component]??'Candidate source unavailable.');
      repos[component]=await sourceRepository(component,release.commit,get);
      repos[`${component}Base`]=release.commit===pin.commit?repos[component]:await sourceRepository(component,pin.commit,get);
      const base=repos[`${component}Base`];
      for(const [file,hash] of Object.entries(pin.criticalFiles))if(base.entries.get(file)?.[3]!==hash)throw Error(`Reviewed ${component} blob mismatch: ${file}`);
      if(component==='app'&&inventoryHash(base.tree)!==pin.inventorySha256)throw Error('Reviewed App tree fingerprint mismatch.');
      const original=new Map(base.tree.map(e=>[e[0],e]));const next=new Map(repos[component].tree.map(e=>[e[0],e]));
      const changes=[...new Set([...original.keys(),...next.keys()])].filter(n=>JSON.stringify(original.get(n))!==JSON.stringify(next.get(n)));
      evidence[`${component}-tree-changes.json`]=JSON.stringify(changes,null,2);
      return {detail:`${release.commit}; ${changes.length} changed paths; inspect ${component}-tree-changes.json for dependency/mode/submodule scope gaps.`};
    },{requires:[`${component}-feed`]});
    await runner.step(`${component}-documents`,'Pinned document/CAS/routing/persistence source diff',async()=>{
      const compared=[];
      for(const file of Object.keys(pin.criticalFiles)) {
        const before=await repos[`${component}Base`].read(file),after=await repos[component].read(file);
        compared.push(diff(`${component}-${file.replaceAll('/','-')}`,before,after,`${pin.commit}/${file}`,`${release.commit}/${file}`));
      }
      checks[`${component}Documents`]={reviewed:inventory.documents[component].includes(release.version),diffs:compared};
      if(!checks[`${component}Documents`].reviewed) {
        addAction(`${component}-documents`,'Review unreviewed document contracts; unchanged source is not native semantic proof. Preserve CAS, identity, generation, routing and partial-success checks.',['src/integration/herdr/documents/tab-move-v1.cjs','src/integration/herdr/documents/core-rpc.cjs','src/services/tabs/move-tab.cjs'],compared,'npm run check:tab-move -- --release '+(discovery.releases.app?.version??inventory.appSource.appVersion));
        return {status:'failed',detail:'needs-review; scoped source diff available, runtime permission unchanged.'};
      }
      return 'Reviewed version; scoped source comparison recorded.';
    },{requires:[`${component}-source`]});
  }
  await runner.step('reachability','Hosted no-write feed/tag/tree/blob/schema reachability',async()=>{
    for(const file of ['defaults/herdr.d.ts','src/commands.rs',...inventory.patches.map(p=>`defaults/${p.target}/main.js`)])await repos.app.read(file);
    JSON.parse((await repos.core.read('schema/hc.openrpc.json')).toString('utf8'));
    return 'Both feeds, immutable tags/trees, SDK, command source, all patched surfaces and Core schema reachable and hash-verified. No writes performed.';
  },{requires:['app-source','core-source']});
  await runner.step('host-api','Static candidate SDK, command catalog, signatures and direct imports',async()=>{
    const version=discovery.releases.app.version;
    const beforeSdk=(await repos.appBase.read('defaults/herdr.d.ts')).toString('utf8'),afterSdk=(await repos.app.read('defaults/herdr.d.ts')).toString('utf8');
    const beforeCommands=parseCommands((await repos.appBase.read('src/commands.rs')).toString('utf8'));
    const afterCommands=parseCommands((await repos.app.read('src/commands.rs')).toString('utf8'));
    const required=[...new Set(HOST_CONTRACT.api.flatMap(n=>apiCandidates(n,version)))];
    const before=sdkSurface(beforeSdk,required),after=sdkSurface(afterSdk,required);
    const apiDelta=surfaceChanges(before,after),commandDelta=surfaceChanges(Object.fromEntries(facts.commands.map(n=>[n,beforeCommands[n]??null])),Object.fromEntries(facts.commands.map(n=>[n,afterCommands[n]??null])));
    const sdkDiff=diff('consumed-sdk',JSON.stringify(before,null,2),JSON.stringify(after,null,2),'reviewed consumed API','candidate consumed API');
    const commandDiff=diff('consumed-commands',JSON.stringify(Object.fromEntries(facts.commands.map(n=>[n,beforeCommands[n]??null])),null,2),JSON.stringify(Object.fromEntries(facts.commands.map(n=>[n,afterCommands[n]??null])),null,2),'reviewed commands','candidate commands');
    checks.host=checkHostFacts({version,declarations:afterSdk,commands:Object.keys(afterCommands),files});
    checks.apiDelta=apiDelta;checks.commandDelta=commandDelta;checks.consumers=facts.consumers;
    evidence['candidate-api.json']=JSON.stringify(after,null,2);evidence['candidate-commands.json']=JSON.stringify(afterCommands,null,2);
    evidence['host-check.json']=JSON.stringify(checks.host,null,2);
    if(!checks.host.ok||apiDelta.length||commandDelta.length)addAction('host-api','Review changed or missing public contracts and consuming facade modules.',['src/integration/herdr/host.js','src/integration/herdr/compatibility.js',...new Set([...apiDelta,...commandDelta].flatMap(d=>facts.consumers[d.name]??[]))],[sdkDiff,commandDiff,'host-check.json'],'npm run check:host-api');
    return {status:checks.host.ok?'passed':'failed',detail:`Static capabilities ${checks.host.ok?'present':'missing'}; ${apiDelta.length} API/type changes, ${commandDelta.length} command argument changes. See host-check.json and scoped hunks; live catalog not executed.`};
  },{requires:['app-source']});
  await runner.step('core-contract','Static Core OpenRPC methods and generation',async()=>{
    const schema=JSON.parse((await repos.core.read('schema/hc.openrpc.json')).toString('utf8'));
    if(!Array.isArray(schema.methods)||schema.methods.some(m=>typeof m?.name!=='string'))throw Error('Unsupported Core OpenRPC schema.');
    const required=['hello','doc.get','doc.set','terminal.get','terminal.list','terminal.label','machine.list','machine.exec'];
    const names=new Set(schema.methods.map(m=>m.name));const missing=required.filter(n=>!names.has(n));
    checks.coreContract={generation:discovery.releases.core.feed.generation,missing};
    evidence['core-contract.json']=JSON.stringify(checks.coreContract,null,2);
    if(missing.length||checks.coreContract.generation!==inventory.documents.generation)throw Error(`Core contract mismatch: generation ${checks.coreContract.generation}; missing ${missing.join(', ')}`);
    return 'Required source RPC names and feed generation present; runtime hello, CAS and persistence semantics still require review.';
  },{requires:['core-source']});
  for(const patch of inventory.patches)await runner.step(`patch-${patch.id}`,'Compare each registered original and stock-to-custom hunks',async()=>{
    const candidate=await repos.app.read(`defaults/${patch.target}/main.js`),custom=fs.readFileSync(path.join(root,patch.main));
    const originals=[];
    for(const original of patch.originals){const bytes=fs.readFileSync(path.join(root,original.file));originals.push({...original,match:Buffer.compare(bytes,candidate)===0,candidateDiff:diff(`${patch.id}-${path.basename(original.file)}`,bytes,candidate,original.file,`candidate/${patch.target}/main.js`),customDiff:diff(`${patch.id}-${path.basename(original.file)}-custom`,bytes,custom,original.file,patch.main)});}
    const match=originals.some(o=>o.match);checks[patch.id]={originals,candidateSha256:sha256(candidate),sourceMatch:match,binaryApplicability:'blocked: no installed-binary provenance'};
    addAction(`patch-${patch.id}`,match?'Source matches a reviewed original; verify actual embedded binary provenance and disposable native behavior before certifying.':'Rebase this optional native patch only after reviewing every changed hunk; unknown native bytes remain skipped, not an update blocker.',[patch.main,...patch.originals.map(o=>o.file),'src/integration/native-patches/registry.json'],originals.flatMap(o=>[o.candidateDiff,o.customDiff]),`node --experimental-vm-modules tests/frame-upgrade.test.mjs`);
    return {status:match?'passed':'failed',detail:`${originals.filter(o=>o.match).length}/${originals.length} reviewed originals exactly match. ${patch.id==='palette'?'Stock palette loses Custom styling, Usage entry and close/settings routing.':'Stock feedback loses Custom presentation; old owned patch may be retained, not refreshed or certified.'}`};
  },{requires:['app-source']});
  await runner.step('baselines','Compare reviewed coverage and generate candidate-only source hashes',async()=>{
    const version=discovery.releases.app.version,baseline=inventory.baselines[version],prior=inventory.baselines[inventory.appSource.appVersion];
    const candidate={},missing=[],changed=[];
    for(const [file,reviewedHash] of Object.entries(prior)) {
      try {const bytes=await repos.app.read(`defaults/${safePath(file)}`);candidate[file]=sha256(bytes);if(candidate[file]!==reviewedHash)changed.push(file);}
      catch(error){missing.push({file,error:error.message});}
    }
    checks.baselines={reviewed:Boolean(baseline),changed,missing,priorVersion:inventory.appSource.appVersion};
    evidence['candidate-stock-baseline.json']=JSON.stringify({candidateOnly:true,appVersion:version,commit:discovery.releases.app.commit,hashes:candidate,missing,installedBinaryVerified:false},null,2);
    addAction('baselines','Review source hashes and real stock/binary provenance before recording release-specific stock coverage. Never use live patched files or substitute an older baseline.',[`upstream/baselines/${version}.json`,`upstream/baselines/${version}.provenance.json`],['candidate-stock-baseline.json'],'npm run test:integration');
    return {status:baseline&&!missing.length&&!Object.entries(baseline).some(([n,h])=>candidate[n]!==h)?'passed':'failed',detail:`${baseline?'Reviewed coverage exists':'stock baseline unreviewed'}; ${changed.length} prior source hashes changed; ${missing.length} unavailable paths; candidate-only hashes do not certify installed bytes.`};
  },{requires:['app-source']});
  await runner.step('native-binary','Installed binary provenance and native UI/continuity',()=>'',{skip:'No authorized disposable native host. Source/fixture success cannot certify embedded originals, native CAS durability, multi-client continuity or pixels.'});
  await runner.step('tab-move-audit','Existing complete App tree audit',async()=>{
    const report=await compareRelease(discovery.releases.app.version,{get:(suffix)=>get(githubUrl('app',suffix)),contract:inventory.appSource});
    evidence['tab-move-audit.json']=JSON.stringify(report,null,2);return `Pinned audit ${report.status}; advisory only, no runtime approval.`;
  },{requires:['app-source']});
  await runner.step('build','node --run build',()=>runScript(root,'build'),{skip:skipTests?'Tests explicitly omitted for source-only diagnostic.':null});
  for(const [name,file] of [['tab-move-fixtures','tests/tab-move.test.mjs'],['tab-move-menu','tests/tab-move-ui.test.mjs'],['host-fixtures','tests/host-gate.test.mjs'],['patch-fixtures','tests/frame-upgrade.test.mjs']])await runner.step(name,`node --experimental-vm-modules ${file}`,()=>run(root,['--experimental-vm-modules',file]),{requires:['build'],skip:skipTests?'Tests explicitly omitted.':null});
  await runner.step('test-ci','CI=true node --run test:ci',()=>runScript(root,'test:ci'),{skip:skipTests?'Tests explicitly omitted.':null});
  // Every unavailable check is an actionable migration task too, even if it never got far enough to create a detailed delta.
  for(const step of runner.steps.filter(s=>s.status!=='passed'))if(!actions.some(a=>a.id===step.name))addAction(step.name,step.detail,step.name.startsWith('core-')?['tools/contracts/herdr-core-reviewed.json','src/integration/herdr/documents/tab-move-v1.cjs']:['tools/contracts/tab-move-0.1.16.json','src/integration/herdr/compatibility.js'],[step.evidence],step.operation);
  return {schema:'herdr-migration-v1',baseSha,headSha,discovery,inventory,steps:runner.steps,checks,actions,evidence};
}
