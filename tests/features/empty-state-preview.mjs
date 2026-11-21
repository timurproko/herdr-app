// Manual read-only native preview. No credentials, collection, settings or input.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),name='custom-empty-state-preview',dir=path.join(home,'mods',name),status=JSON.parse(app(['status'],home));
if(status.overlays?.length)throw Error('Existing overlays left untouched; close them before this manual preview.');
if(fs.existsSync(dir))throw Error('Existing preview preserved.');
const full=path.resolve('.work',`empty-state-${crypto.randomUUID()}.png`),image=path.resolve('.work/empty-state-live.png');
try{
 fs.cpSync(path.resolve('dist/mods/custom-settings'),dir,{recursive:true});fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:560,height:320}}));
 fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';import {h_flex,v_flex} from 'gpui-base';import {theme} from './host.js';import {emptyState} from './ui.js';
export default class Preview extends View {render(){const t=theme();return v_flex().size_full().p(24).gap(16).bg(t.background).text_color(t.foreground).child(div().h(32).child('Shared empty states — dummy preview')).child(h_flex().flex_1().min_h(0).gap(16).child(div().flex_1().min_w(0).child(emptyState(t,{title:'No results',icon:'mods/custom-workspace-chrome/search.svg'}))).child(div().flex_1().min_w(0).child(emptyState(t,{title:'No folders.',icon:'mods/custom-workspace-chrome/folder.svg'}))));}}`);
 app(['check',dir],home);for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(error){if(i===20)throw error;await new Promise(r=>setTimeout(r,150));}}
 await new Promise(r=>setTimeout(r,400));const current=JSON.parse(app(['status'],home));if(current.overlays?.length!==1||current.overlays[0]!==name)throw Error('Preview not the only overlay; no capture.');
 app(['shot',full],home);execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Drawing;$s=[System.Drawing.Bitmap]::FromFile('${full.replaceAll("'","''")}');try{$w=[int](560*${current.zoom}-8);$h=[int](320*${current.zoom}-8);$r=New-Object System.Drawing.Rectangle([int](($s.Width-$w)/2),[int](($s.Height-$h)/2),$w,$h);$c=$s.Clone($r,$s.PixelFormat);try{$c.Save('${image.replaceAll("'","''")}',[System.Drawing.Imaging.ImageFormat]::Png)}finally{$c.Dispose()}}finally{$s.Dispose()}`],{windowsHide:true,timeout:15000});
 console.log('Native preview captured: '+image+'; no settings, credentials, terminals or feedback touched.');
}finally{
 try{const current=JSON.parse(app(['status'],home));if(current.overlays?.includes(name))app(['do','mod.open','--name',name],home);}finally{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(full,{force:true});}
}
