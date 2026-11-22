// Manual native layout check with dummy quotas. No auth, network or settings IO.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),name='custom-usage-widget-preview',dir=path.join(home,'mods',name),status=JSON.parse(app(['status'],home));
if(status.overlays?.length)throw Error('Existing overlays left untouched; close them before this preview.');if(fs.existsSync(dir))throw Error('Existing fixture preserved.');
const nonce=crypto.randomUUID(),fulls=[],images=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
const dispose=temporaryMod(home,name);
try{
 fs.cpSync(path.resolve('dist/mods/custom-usage'),dir,{recursive:true});fs.renameSync(path.join(dir,'main.js'),path.join(dir,'usage-view.js'));fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
 fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';let mode='fresh';export const previewMode=()=>mode;export const setPreviewMode=value=>{mode=value;};
const pins=['["codex:fixture","weekly"]','["claude:fixture","session"]','["claude:fixture","weekly"]'];
export const shared=key=>key==='custom.plugins'?{usage:{enabled:true}}:key.endsWith('.preferences')?{enabled:true,summary:true,remaining:true,pins}:key.endsWith('.cache')?{version:5,at:Date.now(),reports:mode==='fresh'?[{id:'codex:fixture',sourceLabel:'Codex',checkedAt:Date.now(),report:{status:'available',windows:[{id:'weekly',label:'Weekly',usedPct:81}]}},{id:'claude:fixture',sourceLabel:'Claude',checkedAt:Date.now(),report:{status:'available',windows:[{id:'session',label:'Session',usedPct:19},{id:'weekly',label:'Weekly',usedPct:16}]}}]:[]}:null;
export const props=()=>({summary:true});export const spaces=()=>[{active:true,machine:null}];export const panes=()=>[];export const machines=()=>[];export const focused=()=>null;export const terminals=()=>[];export const layout=()=>({id:'sidebar',size:{px:248}});
export const exec=()=>{throw Error('Fixture cannot execute or access credentials');};export const hc=exec;export const readTextFile=exec;export const setShared=exec;export const openOverlay=exec;
`);
 fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:360,height:160}}));
 fs.writeFileSync(path.join(dir,'main.js'),`import {div} from 'gpui-kit';import {v_flex} from 'gpui-base';import Usage from './usage-view.js';import {theme,checking,setPreviewMode,previewMode} from './host.js';
export default class Preview extends Usage {init(_p,cx){if(!checking())cx.timer.after(1500,cx=>{setPreviewMode('missing');cx.notify();});}render(){const t=theme();return v_flex().size_full().p(24).gap(16).bg(t.background).text_color(t.foreground).child(div().h(24).child('Usage layout — '+previewMode()+' dummy data')).child(div().w(248).h(28).child(this.summary(t)));}}
`);
 app(['check',dir],home);for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(error){if(i===20)throw error;await wait(100);}}
 for(const stage of ['fresh','missing']){
  await wait(stage==='fresh'?200:1600);const current=JSON.parse(app(['status'],home));if(current.overlays?.length!==1||current.overlays[0]!==name)throw Error('Fixture no longer the only overlay; no capture.');
  const full=path.resolve('.work',`usage-${nonce}-${stage}.png`),image=path.resolve('.work',`usage-widget-${stage}.png`);fulls.push(full);images.push(image);app(['shot',full],home);
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Drawing;$s=[System.Drawing.Bitmap]::FromFile('${full.replaceAll("'","''")}');try{$w=[int](360*${current.zoom}-8);$h=[int](160*${current.zoom}-8);$r=New-Object System.Drawing.Rectangle([int](($s.Width-$w)/2),[int](($s.Height-$h)/2),$w,$h);$c=$s.Clone($r,$s.PixelFormat);try{$c.Save('${image.replaceAll("'","''")}',[System.Drawing.Imaging.ImageFormat]::Png)}finally{$c.Dispose()}}finally{$s.Dispose()}`],{windowsHide:true,timeout:15000});
 }
 console.log('Native fresh/missing widget captures: '+images.join(', ')+'; dummy data only, no input or backend calls.');
}finally{try{if(JSON.parse(app(['status'],home)).overlays?.includes(name))app(['do','mod.open','--name',name],home);}finally{dispose();for(const full of fulls)fs.rmSync(full,{force:true});}}
