// Read-only executable discovery. Never executes a candidate or reads CLI auth.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function discover(request={},options={}) {
 const env=options.env??process.env,home=options.home??os.homedir(),win=(options.platform??process.platform)==='win32',p=win?path.win32:path.posix;
 const node=options.node??process.execPath;
 const exists=options.exists??(async file=>{try{return (await fs.stat(file)).isFile();}catch{return false;}});
 const appdata=env.APPDATA??p.join(home,'AppData','Roaming'),local=env.LOCALAPPDATA??p.join(home,'AppData','Local');
 const roots=[env.npm_config_prefix,env.NPM_CONFIG_PREFIX,win?p.join(appdata,'npm'):null,win?p.join(local,'npm'):null,p.dirname(node),p.join(home,'.npm-global'),p.join(home,'.local')].filter(Boolean);
 const dirs=[...new Set((env.PATH??env.Path??'').split(win?';':':').map(v=>v.replace(/^"|"$/g,'')).filter(Boolean))].slice(0,100);
 const scripts={codex:['@openai/codex/bin/codex.js'],pi:['@earendil-works/pi-coding-agent/dist/cli.js','@mariozechner/pi-coding-agent/dist/cli.js']};
 const entries={};
 for(const item of (request.commands??[]).slice(0,100)) {
  const command=typeof item.command==='string'?item.command.trim():'';
  if(!command||command.length>4096||/[\0\r\n]/.test(command))continue;
  let run=null;
  if(p.isAbsolute(command)||/[\\/]/.test(command)) {
   if(await exists(command))run=/\.(mjs|cjs|js)$/i.test(command)?[node,command]:[command];
  } else {
   const name=command.replace(/\.(exe|cmd|bat)$/i,'').toLowerCase();
   const known=name==='claude'?[p.join(home,'.local','bin',win?'claude.exe':'claude')]:name==='copilot'&&win?[p.join(local,'GitHubCopilotCLI','copilot.exe')]:name==='opencode'?[p.join(home,'.opencode','bin',win?'opencode.exe':'opencode'),p.join(home,'.bun','bin',win?'opencode.exe':'opencode')]:[];
   for(const file of known)if(await exists(file)){run=[file];break;}
   // Prefer Node + the known npm entrypoint over .cmd shims on Windows.
   if(!run&&scripts[name])for(const root of roots){for(const base of [p.join(root,'node_modules'),p.join(root,'lib','node_modules')]){for(const script of scripts[name]){const file=p.join(base,...script.split('/'));if(await exists(file)){run=[node,file];break;}}if(run)break;}if(run)break;}
   if(!run)for(const dir of dirs){for(const ext of win?['.exe','.cmd','.bat','']:['']){const file=p.join(dir,command+(p.extname(command)?'':ext));if(await exists(file)){run=[file];break;}}if(run)break;}
  }
  entries[item.key]={found:Boolean(run),run};
 }
 return {entries};
}
module.exports={discover};
if(require.main===module||!module.parent){let request={};try{request=JSON.parse(process.argv[2]??process.argv[1]??'{}');}catch{}const deadline=setTimeout(()=>{console.log(JSON.stringify({error:'Executable discovery timed out'}));process.exit(0);},5000);discover(request).then(result=>{clearTimeout(deadline);console.log(JSON.stringify(result));}).catch(()=>{clearTimeout(deadline);console.log(JSON.stringify({error:'Executable discovery unavailable'}));});}
