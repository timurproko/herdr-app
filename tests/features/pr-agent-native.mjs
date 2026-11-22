// Explicit live fixture only: dummy PRs, intercepted navigation/browser actions.
// Never selects a real agent, creates terminals, sends terminal input or uses GitHub.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),name='custom-pr-agent-fixture',dir=path.join(home,'mods',name);
const artifacts=fileURLToPath(new URL('../../.artifacts/',import.meta.url));
fs.mkdirSync(artifacts,{recursive:true});
const image=path.join(artifacts,'pr-agent-fixture.png');
if(fs.existsSync(dir))throw Error('Fixture exists; inspect it before retrying.');
const dispose=temporaryMod(home,name);
try {
  fs.cpSync(path.join(home,'mods/custom-changes'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const run=()=>{throw Error('Visual fixture cannot navigate');};
export const exec=()=>{throw Error('Visual fixture cannot execute programs');};
export const hc=()=>{throw Error('Visual fixture cannot read real agents');};
`);
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:480,height:220}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import {div} from 'gpui-kit';
import {theme} from './host.js';
import Changes from './changes-view.js';
export default class Fixture extends Changes {
 init(){this.repo={name:'example/repo'};this.agentLinks={related:pr=>pr.number<924?{address:'fixture',key:'fixture'}:null};}
 render(){const t=theme();return div().size_full().p(16).flex().flex_col().gap(8).bg(t.surface)
 .child(this.pullRow(t,{number:922,state:'open',title:'Related agent — open pull request',meta:'#922 · example opened 1 hour ago'}))
 .child(this.pullRow(t,{number:923,state:'merged',title:'Related agent — merged pull request',meta:'#923 · example merged 1 hour ago'}))
 .child(this.pullRow(t,{number:924,state:'closed',title:'No related agent',meta:'#924 · example closed 1 hour ago'}));}
}
`);
  app(['check',dir],home);
  for(let i=0;;i++) {
    try {app(['do','mod.open','--name',name],home);break;}
    catch(error){if(i===20)throw error;await new Promise(r=>setTimeout(r,150));}
  }
  await new Promise(r=>setTimeout(r,650));
  const status=JSON.parse(app(['status'],home));
  if(!status.overlays?.includes(name))throw Error('Fixture overlay is not active');
  if(status.errors?.length)throw Error(JSON.stringify(status.errors));
  if(process.argv.includes('--hover')) {
    // Address only the checked fixture's first robot. This sends mouse-move
    // to the app window, not a global pointer movement or a terminal click.
    execFileSync('powershell.exe',['-NoProfile','-Command',`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class PrHover {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L; public int T; public int R; public int B; }
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
}
'@
$p=Get-Process herdr-app | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
if($null -eq $p) {throw 'Herdr window is unavailable'}
$r=New-Object PrHover+Rect
if(-not [PrHover]::GetClientRect($p.MainWindowHandle,[ref]$r)) {throw 'Cannot read fixture window size'}
$x=[int]($r.R/2+204*${status.zoom}); $y=[int]($r.B/2-78*${status.zoom})
$coords=[IntPtr](($y -shl 16) -bor ($x -band 65535))
[void][PrHover]::PostMessage($p.MainWindowHandle,0x0200,[IntPtr]0,$coords)
`],{stdio:'inherit',timeout:10000});
    await new Promise(r=>setTimeout(r,500));
  }
  app(['shot',image],home);
  console.log(`PASS: native deferred PR rows rendered; inspect ${image}`);
} finally {
  try {
    const status=JSON.parse(app(['status'],home));
    if(status.overlays?.includes(name))app(['do','mod.open','--name',name],home);
  } finally {dispose();}
}
