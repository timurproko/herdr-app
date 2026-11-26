// CI wiring: invoke supported suites with their required VM flags.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from '../tools/build.mjs';
import {pluginTests} from '../tools/plugins.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export function ciTestPlan(platform=process.platform) {
  if(!['linux','win32'].includes(platform))throw Error('CI supports linux or win32.');
  const config=JSON.parse(fs.readFileSync(path.join(project,'customization.json'),'utf8'));
  const entries=Object.entries(config.files).filter(([dest])=>/^scripts\/.*\.test\.mjs$/.test(dest)).sort(([a],[b])=>a.localeCompare(b)).map(([file,source])=>({file,source,packaged:true}));
  for(const file of ['mods/custom-new-menu/shell-switch.test.mjs','mods/custom-new-menu/panel-switch.test.mjs'])entries.push({file,source:config.files[file],packaged:true});
  for(const name of fs.readdirSync(path.join(project,'tests')).filter(n=>n.endsWith('.test.mjs')).sort())entries.push({file:`tests/${name}`,source:`tests/${name}`,packaged:false});
  for(const file of pluginTests(project))entries.push({file,source:file,packaged:false});
  entries.push({file:'scripts/ci-required.test.mjs',source:'scripts/ci-required.test.mjs',packaged:false});
  const excluded=[],included=[];
  for(const entry of entries){
    let reason=null;
    if(entry.file==='scripts/directory.test.mjs')reason='Requires installed hc schema and the real user .bashrc; native/private integration.';
    if(platform==='win32'&&entry.file==='tests/file-delete.test.mjs')reason='Original Git-sh Darwin backend fixture returns 7 instead of 0 at line 77 on windows-latest (run 44947261103).';
    if(entry.file==='tests/a1-api-candidate.test.mjs')reason='Requires a separately built external A1 candidate checkout and tsx.';
    (reason?excluded:included).push(reason?{...entry,reason}:entry);
  }
  return {platform,included,excluded};
}

// These are read-only tool-readiness probes, not test executions. A cold hosted
// Windows process can exceed 15 seconds before printing its version. Retry only
// ETIMEDOUT once with a larger startup allowance; actual refusals stay fatal.
export function checkRunnerTool(command,args,env,{spawnSync=cp.spawnSync,warn=console.warn}={}) {
  for(const timeout of [15000,45000]) {
    const result=spawnSync(command,args,{env,encoding:'utf8',timeout});
    if(!result.error&&result.status===0)return;
    if(result.error?.code==='ETIMEDOUT'&&timeout===15000){
      warn(`Runner tool preflight timed out: ${command}; retrying once with a 45-second startup allowance.`);
      continue;
    }
    throw Error(`Required runner tool unavailable: ${command}: ${result.error??result.stderr}`);
  }
}

function run(plan) {
  if(process.env.CI!=='true')throw Error('This command is for disposable CI runners. Use --list locally; the unchanged suites can include OS recycle operations.');
  fs.mkdirSync(path.join(project,'.artifacts'),{recursive:true});
  const home=fs.mkdtempSync(path.join(project,'.artifacts','ci-home-'));
  const fixtures=path.join(home,'fixtures');fs.mkdirSync(fixtures);
  // Reproduce the normal OS temporary directory's CommonJS default. Otherwise
  // disposable original .js helpers inherit this checkout's type=module.
  fs.writeFileSync(path.join(fixtures,'package.json'),'{"type":"commonjs"}\n');
  const env={...process.env,HERDR_APP_HOME:home,HERDR_APP_BIN:path.join(home,'unavailable-herdr.exe'),HERDR_CUSTOMIZATION_SOURCE:project,TMP:fixtures,TEMP:fixtures,TMPDIR:fixtures};
  // Original helpers launch Windows PowerShell 5, not the workflow's pwsh 7.
  // Let that process choose its own default modules instead of inheriting pwsh's paths.
  if(plan.platform==='win32')for(const key of Object.keys(env))if(key.toLowerCase()==='psmodulepath')delete env[key];
  try {
    for(const [command,args] of [['gh',['--version']],plan.platform==='win32'?['powershell.exe',['-NoProfile','-NonInteractive','-Command','$PSVersionTable.PSVersion.ToString(); Get-Command Get-Acl,Set-Acl | Select-Object -ExpandProperty Name']]:['/bin/bash',['--version']]]){
      checkRunnerTool(command,args,env);
    }
    const {output}=build();
    const results=[];
    for(const entry of plan.included){
      console.log(`\n=== ${entry.source} (${entry.packaged?'packaged':'source'}) ===`);
      const file=path.join(entry.packaged?output:project,entry.file);
      const start=Date.now();
      const result=cp.spawnSync(process.execPath,['--experimental-vm-modules',...(entry.file.endsWith('/previews.test.mjs')?['--test']:[]),file],{cwd:entry.packaged?output:project,env,stdio:'inherit',timeout:180000});
      results.push({source:entry.source,file:entry.file,status:result.status,error:result.error?.message??null,milliseconds:Date.now()-start});
      fs.writeFileSync(path.join(project,'.artifacts',`ci-results-${plan.platform}.json`),JSON.stringify({plan,results},null,2)+'\n');
      if(result.error||result.status!==0)console.error(`FAILED ${entry.source}: ${result.error?.message??`exit ${result.status}`}`);
    }
    const failed=results.filter(result=>result.error||result.status!==0);
    if(failed.length)throw Error(`${failed.length} unmodified suite entries failed: ${failed.map(result=>result.source).join(', ')}`);
    console.log(`PASS: ${results.length} supported unmodified suite entries on ${plan.platform}; ${plan.excluded.length} documented exclusions.`);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try {
    const args=process.argv.slice(2);
    if(args.some(arg=>!['--list','--linux','--windows'].includes(arg)))throw Error('Use [--list] [--linux|--windows].');
    const plan=ciTestPlan(args.includes('--linux')?'linux':args.includes('--windows')?'win32':process.platform);
    console.log(JSON.stringify(plan,null,2));
    if(!args.includes('--list'))run(plan);
  } catch(error){console.error(error.message);process.exitCode=1;}
}
