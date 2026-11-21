import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build,project} from './build.mjs';
import {pluginTests} from './plugins.mjs';
const group=process.argv[2]??'unit';
if(!['unit','integration'].includes(group))throw Error('Use unit or integration.');
const {output}=build();
const tests=group==='integration'?['scripts/test.mjs']:[
  ...fs.readdirSync(path.join(output,'scripts')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'scripts/'+n),
  'mods/custom-new-menu/shell-switch.test.mjs',
  'mods/custom-new-menu/panel-switch.test.mjs',
];
for(const rel of tests) {
  console.log(`\n=== ${rel} ===`);
  const result=cp.spawnSync(process.execPath,['--experimental-vm-modules',...(rel.endsWith('/previews.test.mjs')?['--test']:[]),path.join(output,rel)],{cwd:output,stdio:'inherit',timeout:180000,env:{...process.env,HERDR_CUSTOMIZATION_SOURCE:project}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
if(group==='unit')for(const file of [...fs.readdirSync(path.join(project,'tests')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>path.join('tests',n)),...pluginTests(project)]){
 const result=cp.spawnSync(process.execPath,['--experimental-vm-modules',path.join(project,file)],{cwd:project,stdio:'inherit',timeout:180000});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
console.log(`PASS: ${group} customization tests (no native application build).`);
