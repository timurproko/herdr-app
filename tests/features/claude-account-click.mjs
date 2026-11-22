// Explicit live UI test, dummy accounts only. Never creates terminals, sends terminal input or changes auth.
// Run manually: node tests/features/claude-account-click.mjs
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),name='custom-claude-click-fixture',dir=path.join(home,'mods',name);
if(fs.existsSync(dir))throw Error('Click fixture already exists; preserve it and inspect before retrying.');
const nonce=crypto.randomUUID(),receipt=path.join(home,'.customizations',`click-fixture-${nonce}.json`),image=path.join(os.tmpdir(),'claude-account-click.png');
const dispose=temporaryMod(home,name);
try {
  fs.cpSync(path.join(home,'mods/custom-workspace-status'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const terminals=()=>[{address:'t42',program:{key:'claude'},labels:{
 'custom.claude.email':'one@example.test','custom.claude.account':'one','custom.claude.organization':'org',
 'custom.claude.at':String(Date.now()),'custom.claude.state':'ok','custom.claude.session':'fixture-instance-12345','custom.claude.control':'1'}}];
export const exec=()=>{throw Error('Fixture cannot execute a worker');};
`);
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:500,height:112}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';
import {theme,writeTextFile} from './host.js';
import {ClaudeAccount} from './claude-account.js';
export default class ClickFixture extends View {
 init(_p,cx){this.account=new ClaudeAccount();this.account.init(cx);
 this.account.worker=async(_opening,action)=>{
 if(action!=='list')throw Error('Fixture only permits opening the list');
 await writeTextFile(${JSON.stringify(receipt)},JSON.stringify({nonce:${JSON.stringify(nonce)},action}),null);
 return {accounts:[{email:'one@example.test',account:'one',organization:'org'},{email:'two@example.test',account:'two',organization:'org-two'}]};};}
 render(cx){return div().p(16).flex().flex_col().gap(12).text_size(13).text_color(theme().foreground)
 .child('Dropdown click test — dummy accounts only')
 .child(this.account.render({terminal:'t42',on:null},theme(),cx));}
}
`);
  app(['check',dir],home);
  for(let i=0;;i++) {
    try{app(['do','mod.open','--name',name],home);break;}
    catch(e){if(i===20)throw e;await new Promise(r=>setTimeout(r,150));}
  }
  await new Promise(r=>setTimeout(r,500));
  const status=JSON.parse(app(['status'],home));
  if(!status.overlays?.includes(name))throw Error('Fixture is not the active overlay; do not send a mouse event.');
  app(['shot',image],home);
  // The fixture is a known, centered 500x112 dialog. Address only its email hitbox
  // using window-client coordinates; do not move the global cursor or type keys.
  execFileSync('powershell.exe',['-NoProfile','-Command',`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MenuClick {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L; public int T; public int R; public int B; }
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
}
'@
$p=Get-Process herdr-app | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
if($null -eq $p) {throw 'Herdr window is unavailable'}
$r=New-Object MenuClick+Rect
if(-not [MenuClick]::GetClientRect($p.MainWindowHandle,[ref]$r)) {throw 'Cannot read fixture window size'}
$x=[int]($r.R/2-150*${status.zoom}); $y=[int]($r.B/2+8*${status.zoom})
$coords=[IntPtr](($y -shl 16) -bor ($x -band 65535))
[void][MenuClick]::PostMessage($p.MainWindowHandle,0x0200,[IntPtr]0,$coords)
[void][MenuClick]::PostMessage($p.MainWindowHandle,0x0201,[IntPtr]1,$coords)
[void][MenuClick]::PostMessage($p.MainWindowHandle,0x0202,[IntPtr]0,$coords)
`],{stdio:'inherit',timeout:10000});
  for(let i=0;i<40&&!fs.existsSync(receipt);i++)await new Promise(r=>setTimeout(r,150));
  if(!fs.existsSync(receipt)||JSON.parse(fs.readFileSync(receipt,'utf8')).nonce!==nonce)throw Error('Native mouse press did not reach the account-opening handler.');
  await new Promise(r=>setTimeout(r,400));app(['shot',image],home);
  console.log(`PASS: native mouse press reached the dropdown, loaded dummy accounts without auth changes; inspect ${image}`);
} finally {
  try {
    const status=JSON.parse(app(['status'],home));
    if(status.overlays?.includes(name))app(['do','mod.open','--name',name],home);
  } finally {dispose();fs.rmSync(receipt,{force:true});}
}
