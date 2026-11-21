// Read-only native header/row alignment preview. Synthetic prerequisites only.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),name='custom-plugin-status-preview',dir=path.join(home,'mods',name);if(JSON.parse(app(['status'],home)).overlays?.length)throw Error('Existing overlay preserved; close it before preview.');if(fs.existsSync(dir))throw Error('Existing fixture preserved.');
const nonce=crypto.randomUUID(),fulls=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 fs.cpSync(path.resolve('dist/mods/custom-settings'),dir,{recursive:true});fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';export const shared=()=>null;export const spaces=()=>[];export const machines=()=>[];export const panes=()=>[];export const terminals=()=>[];export const focused=()=>null;export const exec=()=>{throw Error('Fixture cannot run checks or read credentials');};export const hc=exec;export const readTextFile=exec;export const setShared=exec;`);
 fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:700,height:500}}));
 fs.writeFileSync(path.join(dir,'main.js'),`import {View} from 'gpui-kit';import {v_flex,Toggle} from 'gpui-base';import {theme,checking} from './host.js';import {initPlugins,pluginsPage} from './plugins-ui.js';import {pluginById} from './plugins.js';
export default class Preview extends View {
 init(_p,cx){initPlugins(this,cx,'git');const items=pluginById('git').prerequisites.filter(p=>['node','gh','relay'].includes(p.id)).map(p=>({...p,status:null,detail:'Synthetic prerequisite',fix:null}));this.pluginChecks.git={loading:true,items};if(!checking())cx.timer.after(1500,cx=>{for(const item of items)item.status='ready';this.pluginChecks.git.loading=false;cx.notify();});}
 heading(_t,title){return v_flex().child(title);}
 toggle(_t,id,on){return Toggle.new(id).pressed(on);}
 render(){const t=theme();return v_flex().size_full().p(16).bg(t.background).text_color(t.foreground).child(pluginsPage(this,t));}
}`);
 app(['check',dir],home);for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(error){if(i===20)throw error;await wait(100);}}
 for(const state of ['checking','ready']){
  await wait(state==='checking'?200:1600);const s=JSON.parse(app(['status'],home));if(s.overlays?.length!==1||s.overlays[0]!==name)throw Error('Preview no longer sole overlay; capture skipped.');const full=path.resolve('.work',`plugin-${nonce}-${state}.png`),image=path.resolve('.work',`plugin-status-${state}.png`);fulls.push(full);app(['shot',full],home);
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Drawing;$s=[System.Drawing.Bitmap]::FromFile('${full.replaceAll("'","''")}');try{$w=[int](700*${s.zoom}-8);$h=[int](500*${s.zoom}-8);$r=New-Object System.Drawing.Rectangle([int](($s.Width-$w)/2),[int](($s.Height-$h)/2),$w,$h);$c=$s.Clone($r,$s.PixelFormat);try{$c.Save('${image.replaceAll("'","''")}',[System.Drawing.Imaging.ImageFormat]::Png)}finally{$c.Dispose()}}finally{$s.Dispose()}`],{windowsHide:true,timeout:15000});console.log('Native alignment preview: '+image);
 }
}finally{try{if(JSON.parse(app(['status'],home)).overlays?.includes(name))app(['do','mod.open','--name',name],home);}finally{fs.rmSync(dir,{recursive:true,force:true});for(const full of fulls)fs.rmSync(full,{force:true});}}
