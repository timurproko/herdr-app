// No-write CLI. Publication is a separate trusted writer, never a side effect here.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {reviewInventory,discoverReleases,publicReader,releaseVersion,releaseIdentity,parseIdentity,commitSha,evidenceFile} from './herdr-upgrade-releases.mjs';
import {evaluateCandidate} from './herdr-upgrade-evaluate.mjs';
import {migrationFiles} from './herdr-upgrade-report.mjs';
export function parseUpgradeArgs(args) {
  const result={probe:false,output:'.artifacts/herdr-upgrade',requested:{}},seen=new Set();
  for(let i=0;i<args.length;i++) {
    const key=args[i];
    if(seen.has(key))throw Error(`Duplicate option: ${key}`);seen.add(key);
    if(key==='--probe'&&!result.probe)result.probe=true;
    else if(['--output','--root','--base-sha','--head-sha','--app-version','--core-version','--refresh'].includes(key)) {
      const value=args[++i];if(!value||value.startsWith('--'))throw Error(`Missing ${key} value.`);
      if(key.endsWith('-version'))result.requested[key==='--app-version'?'app':'core']=releaseVersion(value);
      else if(key==='--refresh')result.refresh=releaseIdentity(parseIdentity(value));
      else result[key.slice(2).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase())]=value;
    } else throw Error(`Unknown or duplicate option: ${key}`);
  }
  if(result.refresh&&Object.keys(result.requested).length)throw Error('Refresh and version overrides are mutually exclusive.');
  if(result.refresh)result.requested=parseIdentity(result.refresh);
  return result;
}
export function artifactDirectory(root,output) {
  const artifacts=path.join(root,'.artifacts');fs.mkdirSync(artifacts,{recursive:true});
  const resolved=path.resolve(root,output);
  if(!resolved.startsWith(artifacts+path.sep))throw Error('Output must be inside this checkout .artifacts/.');
  fs.mkdirSync(resolved,{recursive:true});
  if(!fs.realpathSync(resolved).startsWith(fs.realpathSync(artifacts)+path.sep))throw Error('Output escapes artifacts through a symlink.');
  return resolved;
}
export async function proposeHerdrUpgrade(options,{get=publicReader(),evaluate=evaluateCandidate}={}) {
  const root=path.resolve(options.root??fileURLToPath(new URL('../',import.meta.url))),output=artifactDirectory(root,options.output??'.artifacts/herdr-upgrade');
  const gitSha=()=>cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const baseSha=commitSha(options.baseSha??gitSha()),headSha=commitSha(options.headSha??gitSha());
  const inventory=reviewInventory(root),discovery=await discoverReleases({inventory,get,requested:options.requested??{}});
  const report=await evaluate({root,inventory,discovery,get,baseSha,headSha,scratch:path.join(output,'scratch'),skipTests:options.probe});
  report.generatedAt=new Date().toISOString();
  report.worktreeDirty=Boolean(cp.execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim());
  if(process.env.GITHUB_REPOSITORY==='timurproko/herdr-app'&&/^[1-9]\d*$/.test(process.env.GITHUB_RUN_ID??''))report.runUrl=`https://github.com/timurproko/herdr-app/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const versions=Object.fromEntries(Object.entries(discovery.releases).map(([c,r])=>[c,r.version]));
  const identity=options.refresh??(Object.keys(discovery.candidates).length?releaseIdentity(discovery.candidates):Object.keys(versions).length?releaseIdentity(versions):null);
  const bundle={schema:'herdr-upgrade-bundle-v1',baseSha,headSha,mode:options.probe?'probe':options.refresh?'refresh':'evaluate',identity,report};
  fs.writeFileSync(path.join(output,'bundle.json'),JSON.stringify(bundle,null,2)+'\n');
  for(const [file,content] of Object.entries(report.evidence)) {
    evidenceFile(file);
    const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
  }
  if(identity) {
    for(const [file,content] of Object.entries(migrationFiles(report,identity))) {
      const target=path.join(output,'preview',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
    }
    fs.writeFileSync(path.join(output,'report.md'),fs.readFileSync(path.join(output,'preview',`upstream/migrations/${identity}/report.md`)));
  }
  // Probe success concerns reachability, not compatibility or an unreviewed source verdict.
  const probe={schema:'herdr-upgrade-probe-v1',ok:report.steps.find(s=>s.name==='reachability')?.status==='passed',baseSha,headSha,mode:bundle.mode};
  fs.writeFileSync(path.join(output,'probe.json'),JSON.stringify(probe,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Herdr ${bundle.mode} (no writes)\n\nHosted source reachability: **${probe.ok?'passed':'failed'}**. Evaluation base ${baseSha}; head ${headSha}. Publication is a separate gated job.\n\n${report.steps.map(s=>`- ${s.status}: ${s.name}: ${s.detail}`).join('\n')}\n`);
  return {bundle,probe,output};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {const result=await proposeHerdrUpgrade(parseUpgradeArgs(process.argv.slice(2)));console.log(`No-write ${result.bundle.mode}: ${result.output}; reachability ${result.probe.ok?'passed':'failed'}`);if(result.bundle.mode==='probe'&&!result.probe.ok)process.exitCode=1;}
  catch(error){console.error(error.message);process.exitCode=1;}
}
