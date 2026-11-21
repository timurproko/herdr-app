// Explicit live fixture: click only dummy PRs; never navigate real agents or
// touch terminals/network. --slow slows ONLY this disposable copy for photos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {app,defaultHome} from '../../tools/deploy.mjs';
const full=process.argv.includes('--full');
const home=defaultHome(),name='custom-pr-swap-fixture',dir=path.join(home,'mods',name);
const receipt=path.join(home,'.customizations',`pr-swap-${crypto.randomUUID()}.json`);
const debug=receipt+'.debug';
const shot=part=>path.join(home,'customizations/.work',`pr-pin-swap-${part}.png`);
if(fs.existsSync(dir))throw Error('Fixture exists; preserve it and inspect before retrying.');
try {
  fs.cpSync(path.join(home,'mods/custom-changes'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
let terminal='fixture-source',reply;
export const fixtureLocation=()=>({cwd:'/fixture',on:null,terminal,space:'fixture-space',tab:terminal,app:'a1',pullNumber:null});
export const run=(name,args)=>{if(name==='agent.focus')terminal=args.terminal;};
export const exec=()=>{throw Error('Fixture cannot execute programs');};
export const hc=()=>new Promise(resolve=>{reply=resolve;});
export const finishFixtureRead=()=>reply?.({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'/fixture (feature) • #922\\n13.1%/500k (auto)'})});
export const layout=()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]});
`);
  fs.writeFileSync(path.join(dir,'location.js'),"export {fixtureLocation as location} from './host.js'; export const namedPullNumber=()=>null;\n");
  const motionPath=path.join(dir,'pin-swap.js'),motion=fs.readFileSync(motionPath,'utf8');
  assert.ok(motion.includes('PIN_SWAP_MS = 320;'));
  if(process.argv.includes('--slow'))fs.writeFileSync(motionPath,motion.replace('PIN_SWAP_MS = 320;','PIN_SWAP_MS = 1200;'));
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:480,height:260}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import {div} from 'gpui-kit';
import {theme,writeTextFile,readTextFile,finishFixtureRead} from './host.js';
import {location} from './location.js';
import Changes from './changes-view.js';
export default class Fixture extends Changes {
 init(){this.resetRepository();const original=this.pinMotion.start.bind(this.pinMotion);
 this.pinMotion.start=(...args)=>{const [snapshot,clicked,event]=args,ok=original(...args);
 writeTextFile(${JSON.stringify(debug)},JSON.stringify({ok,pointer:this.pinMotion.pointer,bounds:this.pinMotion.bodyBounds,bodySize:this.pinMotion.bodySize,sizes:[...this.pinMotion.sizes],event,snapshot,clicked}),null).catch(()=>{});return ok;};
 const {cwd,on}=location();this.context=JSON.stringify([cwd,on]);
 this.repo={name:'example/repo'};this.root='/fixture';this.view='open';this.agentPull=923;
 this.selection=JSON.stringify(location());this.pullsAt.open=Date.now();
 this.pulls.open=[
 {number:922,state:'open',title:'Click robot — move this PR to pinned',meta:'#922 · selected from the list'},
 {number:923,state:'draft',title:'Previous pin — return this PR to list',meta:'#923 · previously selected'},
 {number:924,state:'open',title:'Unchanged PR',meta:'#924 · stays in the list'}];
 this.agentLinks={refresh(){},related:pr=>pr.number<924?{address:'fixture-target',key:'fixture'}:null};}
 report(data,cx){cx.spawn(async()=>{const file=${JSON.stringify(receipt)};await writeTextFile(file,JSON.stringify(data),await readTextFile(file));});}
 swapOverlay(t,swap){return super.swapOverlay(t,swap).on_size_change((_size,cx)=>{
 this.pinMotion.arm(swap,cx);this.report({phase:'started',cards:swap.cards,terminal:location().terminal,heldPin:swap.snapshot.pinned.number,resolved:this.agentPull},cx);
 });}
 render(cx){const content=${full?'super.render(cx)':'(this.syncAgent(cx),this.renderPulls(theme()))'};
 if(location().terminal==='fixture-target'&&!this.footerScheduled){this.footerScheduled=true;
 this.report({phase:'waiting',terminal:location().terminal,heldPin:this.pullPresentation.pinned.number},cx);
 cx.timer.after(250,cx=>{finishFixtureRead();cx.notify();});}
 return div().size_full().p(16).flex().flex_col().bg(theme().surface)
 .on_size_change((_size,cx)=>cx.timer.after(100,cx=>this.report({phase:'ready',sizes:[...this.pinMotion.sizes]},cx)))
 .child(content);}
}
`);
  app(['check',dir],home);
  for(let i=0;;i++) {
    try{app(['do','mod.open','--name',name],home);break;}
    catch(error){if(i===20)throw error;await new Promise(r=>setTimeout(r,150));}
  }
  for(let i=0;i<50&&!fs.existsSync(receipt);i++)await new Promise(r=>setTimeout(r,100));
  const measured=JSON.parse(fs.readFileSync(receipt,'utf8'));
  assert.equal(measured.phase,'ready');
  const oldHeight=new Map(measured.sizes).get(923)?.height;assert.ok(oldHeight>0);
  console.log('Fixture measurements:',JSON.stringify(measured));
  const status=JSON.parse(app(['status'],home));
  assert.ok(status.overlays?.includes(name),'Only send pointer input while our fixture is active');
  app(['shot',shot('before')],home);
  // 480x260 centered fixture: body starts at 16, old pin +9, list +4,
  // then row title center +16. Target the second row's robot, not a terminal.
  execFileSync('powershell.exe',['-NoProfile','-Command',`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class PrSwapClick {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L; public int T; public int R; public int B; }
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
}
'@
$p=Get-Process herdr-app | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
if($null -eq $p) {throw 'No Herdr window'}
$r=New-Object PrSwapClick+Rect
if(-not [PrSwapClick]::GetClientRect($p.MainWindowHandle,[ref]$r)) {throw 'Cannot measure fixture'}
$x=[int]($r.R/2+200*${status.zoom}); $y=[int]($r.B/2+(${oldHeight}-85+${full?73:0})*${status.zoom})
Write-Host "Fixture pointer: $x,$y (window $($r.R)x$($r.B))"
$coords=[IntPtr](($y -shl 16) -bor ($x -band 65535))
[void][PrSwapClick]::PostMessage($p.MainWindowHandle,0x0200,[IntPtr]0,$coords)
Start-Sleep -Milliseconds 80
[void][PrSwapClick]::PostMessage($p.MainWindowHandle,0x0201,[IntPtr]1,$coords)
[void][PrSwapClick]::PostMessage($p.MainWindowHandle,0x0202,[IntPtr]0,$coords)
`],{stdio:'inherit',timeout:10000});
  for(let i=0;i<30;i++) {
    if(JSON.parse(fs.readFileSync(receipt,'utf8')).phase==='started')break;
    await new Promise(r=>setTimeout(r,40));
  }
  const started=JSON.parse(fs.readFileSync(receipt,'utf8'));
  if(started.phase!=='started') {
    app(['shot',shot('failed')],home);
    console.log('Native swap diagnostic:',fs.existsSync(debug)?fs.readFileSync(debug,'utf8'):'No robot activation');
  }
  assert.equal(started.phase,'started','Native robot press must produce measured traveling cards, not only change the pin');
  assert.deepEqual(started.cards.map(c=>c.pr.number),[922,923]);
  assert.equal(started.terminal,'fixture-target','Agent tab switches before row movement');
  assert.equal(started.heldPin,923,'The old row remains pinned until motion settles');
  assert.equal(started.resolved,922,'Movement waits for the destination footer to resolve');
  await new Promise(r=>setTimeout(r,process.argv.includes('--slow')?500:150));app(['shot',shot('moving')],home);
  await new Promise(r=>setTimeout(r,1300));app(['shot',shot('settled')],home);
  const after=JSON.parse(app(['status'],home));assert.deepEqual(after.errors,[]);
  console.log(`PASS: native mouse click starts two-card pin exchange; inspect ${shot('moving')} and ${shot('settled')}`);
} finally {
  try {
    const status=JSON.parse(app(['status'],home));
    if(status.overlays?.includes(name))app(['do','mod.open','--name',name],home);
  } finally {fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(receipt,{force:true});fs.rmSync(debug,{force:true});}
}
