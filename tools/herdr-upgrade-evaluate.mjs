// Source-only evaluation. No native binary, upstream script, or downloaded JS is run.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {HOST_CONTRACT} from '../src/integration/herdr/compatibility.js';
import {candidateCompatibilityFacts,trustedCompatibilityFacts} from './herdr-upgrade-compatibility.mjs';
import {testEnvironment} from './herdr-upgrade-environment.mjs';
export {testEnvironment} from './herdr-upgrade-environment.mjs';
import {checkHostFacts,hostSourceFacts} from './host-api-facts.mjs';
import {inventory as treeInventory,inventoryHash,compareRelease} from './check-tab-move.mjs';
import {commitSha,gitBlob,githubUrl,sha256,safePath,selectedCoreGeneration} from './herdr-upgrade-releases.mjs';

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
  // Preserve string/template literal types while stripping comments, then retain
  // complete top-level declarations and their transitive referenced types.
  text=text.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,(_m,literal)=>literal??'');
  const declarations={};const matches=[...text.matchAll(/^export (?:declare )?(function|interface|type|class|const|enum)\s+(\w+)/gm)];
  for(let i=0;i<matches.length;i++) {
    const name=matches[i][2],declaration=text.slice(matches[i].index,matches[i+1]?.index??text.length).trim();
    // TypeScript overloads and declaration merging share a name. Keep every
    // declaration, in source order, including each one's referenced types.
    declarations[name]=Object.hasOwn(declarations,name)?`${declarations[name]}\n${declaration}`:declaration;
  }
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
  const files=walkSources(root),sourceFacts=hostSourceFacts(files);
  const versions=[...new Set([inventory.appSource.appVersion,discovery.releases.app?.version].filter(Boolean))];
  const baselineCompatibility=trustedCompatibilityFacts(versions,sourceFacts.commands);
  let candidateCompatibility;
  evidence['baseline-compatibility.json']=JSON.stringify(baselineCompatibility,null,2);
  await runner.step('candidate-compatibility','Credential-free evaluated-checkout compatibility snapshot',()=>{
    candidateCompatibility=candidateCompatibilityFacts(root,versions,sourceFacts.commands);
    checks.compatibility=candidateCompatibility;
    evidence['candidate-compatibility.json']=JSON.stringify(candidateCompatibility,null,2);
    return 'Validated evaluated-checkout API/command adapters and document profiles; trusted baseline facts recorded separately.';
  });
  for(const component of ['app','core']) {
    const release=discovery.releases[component],pin=component==='app'?inventory.appSource:inventory.coreSource;
    await runner.step(`${component}-feed`,`GET releases.herdr.dev/${component}/latest.json`,()=>{
      if(discovery.errors[component]&&!release)throw Error(discovery.errors[component]);
      if(!release)throw Error('Feed unavailable.');return {detail:`Selected ${release.version}; latest feed describes ${release.feed?.version??'unknown'}; feed SHA-256 ${release.feedSha256}`};
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
      if(!candidateCompatibility)throw Error('Evaluated document compatibility facts unavailable.');
      checks[`${component}Documents`]={reviewed:candidateCompatibility.documents[component].includes(release.version),diffs:compared};
      if(!checks[`${component}Documents`].reviewed) {
        addAction(`${component}-documents`,'Review unreviewed document contracts; unchanged source is not native semantic proof. Preserve CAS, identity, generation, routing and partial-success checks.',['src/integration/herdr/documents/tab-move-v1.cjs','src/integration/herdr/documents/core-rpc.cjs','src/services/tabs/move-tab.cjs'],compared,'npm run check:tab-move -- --release '+(discovery.releases.app?.version??inventory.appSource.appVersion));
        return {status:'failed',detail:'needs-review; scoped source diff available, runtime permission unchanged.'};
      }
      return 'Reviewed version; scoped source comparison recorded.';
    },{requires:[`${component}-source`,'candidate-compatibility']});
  }
  await runner.step('reachability','Hosted no-write feed/tag/tree/blob/schema reachability',async()=>{
    for(const file of ['defaults/herdr.d.ts','src/commands.rs',...inventory.patches.map(p=>`defaults/${p.target}/main.js`)])await repos.app.read(file);
    JSON.parse((await repos.core.read('schema/hc.openrpc.json')).toString('utf8'));
    return 'Both feeds, immutable tags/trees, SDK, command source, all patched surfaces and Core schema reachable and hash-verified. No writes performed.';
  },{requires:['app-source','core-source']});
  await runner.step('host-api','Static candidate SDK, command catalog, signatures and direct imports',async()=>{
    const version=discovery.releases.app.version;
    const beforeSdk=(await repos.appBase.read('defaults/herdr.d.ts')).toString('utf8'),afterSdk=(await repos.app.read('defaults/herdr.d.ts')).toString('utf8');
    const beforeCommandSource=(await repos.appBase.read('src/commands.rs')).toString('utf8'),afterCommandSource=(await repos.app.read('src/commands.rs')).toString('utf8');
    const beforeCommands=parseCommands(beforeCommandSource),afterCommands=parseCommands(afterCommandSource);
    const support=text=>text.replace(/pub const COMMANDS:\s*&\[Command\]\s*=\s*&\[[\s\S]*?\n\];/,'/* consumed catalog diff is separate */').split('#[cfg(test)]')[0];
    const commandSupportChanged=support(beforeCommandSource)!==support(afterCommandSource);
    const supportDiff=diff('command-support',support(beforeCommandSource),support(afterCommandSource),'reviewed catalog helpers/validation','candidate catalog helpers/validation');
    const baseline=baselineCompatibility.versions[inventory.appSource.appVersion],candidate=candidateCompatibility.host.versions[version];
    const required=[...new Set([...Object.values(baseline.api).flat(),...Object.values(candidate.api).flat()])];
    const facts=hostSourceFacts(files,{api:[...new Set([...required,...baselineCompatibility.contract.api,...candidateCompatibility.host.contract.api])]});
    const before=sdkSurface(beforeSdk,required),after=sdkSurface(afterSdk,required);
    const commandSurface=(catalog,resolved)=>Object.fromEntries(facts.commands.map(name=>{const native=resolved.commands[name];return [name,{native,args:catalog[native]??null}];}));
    const oldCommands=commandSurface(beforeCommands,baseline),newCommands=commandSurface(afterCommands,candidate);
    const apiDelta=surfaceChanges(before,after),commandDelta=surfaceChanges(oldCommands,newCommands);
    const sdkDiff=diff('consumed-sdk',JSON.stringify(before,null,2),JSON.stringify(after,null,2),'reviewed consumed API','candidate consumed API');
    const commandDiff=diff('consumed-commands',JSON.stringify(oldCommands,null,2),JSON.stringify(newCommands,null,2),'reviewed commands','candidate commands');
    checks.host=checkHostFacts({version,declarations:Object.values(after).filter(Boolean).join('\n'),commands:Object.keys(afterCommands),files,compatibility:candidateCompatibility.host});
    checks.apiDelta=apiDelta;checks.commandDelta=commandDelta;checks.commandSupportChanged=commandSupportChanged;checks.consumers=facts.consumers;
    evidence['candidate-api.json']=JSON.stringify(after,null,2);evidence['candidate-commands.json']=JSON.stringify(afterCommands,null,2);
    evidence['host-check.json']=JSON.stringify(checks.host,null,2);
    if(!checks.host.ok||apiDelta.length||commandDelta.length||commandSupportChanged)addAction('host-api',checks.host.ok?'Evaluated branch passes static host compatibility; review the recorded upstream deltas and migrated facade for behavioral proof.':'Repair missing public contracts or imports in the evaluated branch using its compatibility adapters.',['src/integration/herdr/host.js','src/integration/herdr/compatibility.js',...new Set([...apiDelta,...commandDelta].flatMap(d=>facts.consumers[d.name]??[]))],[sdkDiff,commandDiff,supportDiff,'host-check.json','baseline-compatibility.json','candidate-compatibility.json'],'npm run check:host-api');
    return {status:checks.host.ok?'passed':'failed',detail:`Static capabilities ${checks.host.ok?'present':'missing'}; ${apiDelta.length} API/type changes, ${commandDelta.length} command argument changes; catalog helper/validation change: ${commandSupportChanged}. See host-check.json and scoped hunks; live catalog not executed.`};
  },{requires:['app-source','candidate-compatibility']});
  await runner.step('core-contract','Static Core OpenRPC methods and generation',async()=>{
    const schema=JSON.parse((await repos.core.read('schema/hc.openrpc.json')).toString('utf8'));
    if(!Array.isArray(schema.methods)||schema.methods.some(m=>typeof m?.name!=='string'))throw Error('Unsupported Core OpenRPC schema.');
    const required=['hello','doc.get','doc.set','terminal.get','terminal.list','terminal.label','machine.list','machine.exec'];
    const names=new Set(schema.methods.map(m=>m.name));const missing=required.filter(n=>!names.has(n));
    const generationEvidence=selectedCoreGeneration(discovery.releases.core),expectedGeneration=candidateCompatibility.documents.generation;
    checks.coreContract={generation:generationEvidence.generation,generationEvidence,expectedGeneration,missing};
    evidence['core-contract.json']=JSON.stringify(checks.coreContract,null,2);
    if(missing.length)throw Error(`Core contract mismatch: missing ${missing.join(', ')}`);
    if(generationEvidence.status!=='available')return {status:'blocked',detail:generationEvidence.reason};
    if(checks.coreContract.generation!==expectedGeneration)throw Error(`Core contract mismatch: generation ${checks.coreContract.generation}; expected ${expectedGeneration} for the evaluated branch.`);
    return 'Required source RPC names and selected-version feed generation present; runtime hello, CAS and persistence semantics still require review.';
  },{requires:['core-source','candidate-compatibility']});
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
    const covered=[...new Set(Object.values(inventory.baselines).flatMap(b=>Object.keys(b)))].sort();
    for(const file of covered) {
      const reviewedHash=prior?.[file];
      try {const bytes=await repos.app.read(`defaults/${safePath(file)}`);candidate[file]=sha256(bytes);if(reviewedHash&&candidate[file]!==reviewedHash)changed.push(file);}
      catch(error){missing.push({file,error:error.message});}
    }
    const mismatches=Object.entries(baseline??{}).filter(([n,h])=>candidate[n]!==h).map(([file,expected])=>({file,expected,actual:candidate[file]??null}));
    checks.baselines={reviewed:Boolean(baseline),changed,missing,mismatches,priorVersion:inventory.appSource.appVersion};
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
  for(const step of runner.steps.filter(s=>s.status!=='passed'))if(!actions.some(a=>a.id===step.name)) {
    const testFile=/tests\/[A-Za-z0-9_.-]+\.mjs/.exec(step.operation)?.[0];
    const files=step.name==='native-binary'?[`upstream/baselines/${discovery.releases.app?.version??inventory.appSource.appVersion}.provenance.json`,'src/integration/native-patches/README.md']:testFile?[testFile]:step.name==='test-ci'?['scripts/test-ci.mjs','docs/TESTING.md']:step.name==='build'?['tools/build.mjs','customization.json']:step.name.startsWith('core-')?['tools/contracts/herdr-core-reviewed.json','src/integration/herdr/documents/tab-move-v1.cjs']:['tools/herdr-upgrade-releases.mjs','tools/contracts/tab-move-0.1.16.json'];
    addAction(step.name,`${step.detail} Resolve missing evidence or failing source/tests without relaxing runtime or review safeguards.`,files,[step.evidence],step.name==='native-binary'?'npm run test:native (only after separate disposable-host authorization)':step.operation);
  }
  return {schema:'herdr-migration-v1',baseSha,headSha,discovery,inventory,steps:runner.steps,checks,actions,evidence};
}
