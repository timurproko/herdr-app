// Read-only installed-shell discovery. Never reads terminal profiles or starts a process.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function terminalShells(options={}) {
  const env=options.env??process.env,win=(options.platform??process.platform)==='win32';
  const p=win?path.win32:path.posix,home=options.home??os.homedir();
  const get=name=>{const key=Object.keys(env).find(k=>k.toLowerCase()===name.toLowerCase());return key?env[key]:'';};
  const exists=options.exists??(async file=>{try{return(await fs.stat(file)).isFile();}catch{return false;}});
  const dirs=(get('PATH')||'').split(win?';':':').map(s=>s.replace(/^"|"$/g,'')).filter(Boolean).slice(0,100);
  const windir=get('SystemRoot')||'C:\\Windows',program=get('ProgramFiles')||'C:\\Program Files';
  const local=get('LOCALAPPDATA')||p.join(home,'AppData','Local');
  const known=win?[
    ['pwsh','PowerShell 7',[p.join(program,'PowerShell','7','pwsh.exe')]],
    ['powershell','Windows PowerShell',[p.join(windir,'System32','WindowsPowerShell','v1.0','powershell.exe')]],
    ['cmd','Command Prompt',[get('ComSpec')||p.join(windir,'System32','cmd.exe')]],
    ['bash','Git Bash',[p.join(program,'Git','bin','bash.exe'),p.join(local,'Programs','Git','bin','bash.exe'),p.join(get('ProgramFiles(x86)')||program,'Git','bin','bash.exe')]],
  ]:[['bash','Bash',[]],['zsh','Zsh',[]],['fish','Fish',[]],['nu','Nushell',[]],['pwsh','PowerShell',[]]];
  const shells=[],seen=new Set();
  for(const [command,name,fallback]of known) {
    const candidates=[...fallback,...dirs.map(dir=>p.join(dir,command+(win?'.exe':'')))];
    for(const exe of [...new Set(candidates)]) {
      if(!exe||/[\0\r\n]/.test(exe)||!await exists(exe))continue;
      // Match native terminal startup: load normal machine profiles, but omit
      // PowerShell's host banner (Windows Terminal also launches with -NoLogo).
      // Do not add -NoProfile, --noprofile/--norc, or cmd /d: those skip user config.
      const run=[exe,...(command==='bash'?['--login','-i']:command==='powershell'||command==='pwsh'?['-NoLogo']:[])];
      const identity=JSON.stringify([win?p.normalize(exe).toLowerCase():exe,...run.slice(1)]);
      if(!seen.has(identity)){seen.add(identity);shells.push({key:`installed:${command}`,name,run,source:'Installed shell'});}
      break;
    }
  }
  return{shells};
}
module.exports={terminalShells};
if(require.main===module||!module.parent){const deadline=setTimeout(()=>{console.log(JSON.stringify({shells:[],error:'Shell discovery timed out'}));process.exit(0);},5000);terminalShells().then(result=>{clearTimeout(deadline);console.log(JSON.stringify(result));}).catch(()=>{clearTimeout(deadline);console.log(JSON.stringify({shells:[],error:'Shell discovery unavailable'}));});}
