// Explicit build-time support for a reviewed app update. Never writes app files.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=process.argv[2];if(!/^\d+\.\d+\.\d+$/.test(version??''))throw Error('Pass the reviewed app version.');
const exe=path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const actual=execFileSync(exe,['--version'],{encoding:'utf8'}).trim().replace(/^herdr-app\s+/,'');
if(actual!==version)throw Error('Installed app does not match the requested version.');
const home=process.env.HERDR_APP_HOME||path.join(os.homedir(),'.config/herdr-app'),binary=fs.readFileSync(exe);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const seed=process.argv[3]??'0.1.13';if(!/^\d+\.\d+\.\d+$/.test(seed))throw Error('Optional seed version is invalid.');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'baselines',`${seed}.json`),'utf8')),changed=[];
for(const [rel,expected]of Object.entries(baseline)){
 if(['settings.json','keys.json'].includes(rel))continue;
 const bytes=fs.readFileSync(path.join(home,rel)),current=hash(bytes);if(current===expected)continue;
 if(!/^(mods\/[^/]+\/main\.js|layouts\/main\.json)$/.test(rel)||!binary.includes(bytes))throw Error(`Refusing to adopt non-embedded/personal file: ${rel}`);
 baseline[rel]=current;changed.push(rel);
}
const dir=path.join(root,'baselines'),file=path.join(dir,`${version}.json`),text=JSON.stringify(baseline,null,2)+'\n';
if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')!==text)throw Error('Existing version baseline differs; explicit source review required.');
fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,text);
const provenance=path.join(dir,`${version}.provenance.json`);if(!fs.existsSync(provenance))fs.writeFileSync(provenance,JSON.stringify({version,executableSha256:hash(binary),verifiedEmbeddedStock:changed},null,2)+'\n');
console.log(`Recorded ${version}: ${changed.length} changed stock files matched the executable's embedded source; app/personal files unchanged.`);
