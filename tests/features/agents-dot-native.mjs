// Opt-in, terminal-free native rendering evidence. Only a disposable app home
// and synthetic agents are used; the person's app/Core/preferences are untouched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
if (!process.argv.includes('--run') || process.platform !== 'win32') throw Error('Explicit Windows opt-in required: --run');
const appBin = path.join(process.env.LOCALAPPDATA, 'Programs/herdr-app/herdr-app.exe');
const coreBin = path.join(process.env.LOCALAPPDATA, 'Programs/herdr-core/herdr-core.exe');
fs.mkdirSync('.artifacts', {recursive:true});
const root = fs.mkdtempSync(path.resolve('.artifacts/ad-')), home = path.join(root, 'a');
assert.ok(Buffer.byteLength(path.join(home, 'herdr-app.sock')) < 104);
const env = {...process.env, USERPROFILE:home, HERDR_APP_HOME:home,
  LOCALAPPDATA:path.join(root,'local'), APPDATA:path.join(root,'roaming'),
  XDG_STATE_HOME:path.join(root,'state'), XDG_CONFIG_HOME:path.join(root,'config'),
  HC_SESSION:`test-agents-dot-${Date.now()}`, HERDR_APP_ID:'herdr-disposable-agents-dot',
  HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for (const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE']) delete env[key];
fs.mkdirSync(home, {recursive:true}); fs.mkdirSync(env.LOCALAPPDATA, {recursive:true});
const {output} = build(); deploy(output, home, {repair:false});
const put = (rel, value) => {const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json', {core:coreBin,telemetry:false,zoom:1.3});
const version = execFileSync(appBin,['--version'],{encoding:'utf8'}).match(/\d+\.\d+\.\d+/)[0];
put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json', {layout:'AgentsFixture','frame.welcomed':'skipped'});
put('layouts/AgentsFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[
  {id:'sidebar',type:'block',size:{px:220},content:{mod:'custom-agents'}},
  {id:'body',type:'block',content:{mod:'custom-agents-note'}}]});
const dir = path.join(home,'mods/custom-agents');
fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
put('mods/custom-agents/host.js',`export * from './native-host.js';
const counts=[1,10,100,1,10,100];
export const agents=()=>counts.flatMap((count,g)=>Array.from({length:count},(_,i)=>({address:'fixture-'+g+'-'+i,space:'s'+g,space_name:(g<3?'Folded ':'Expanded ')+count,pane:'p'+g+'-'+i,title:'Copy toast not showing',program:{key:'a1',name:'A1'},seq:g*100+i,status:g===1?'working':'done'})));
export const spaces=()=>counts.map((count,g)=>({id:'s'+g,name:(g<3?'Folded ':'Expanded ')+count,named:true}));
export const terminals=()=>[];export const panes=()=>[];export const focused=()=>null;
export const props=()=>({});export const layout=()=>({id:'sidebar',size:{px:220}});
export const shared=key=>key==='agents.sort'?'grouped':null;
export const setShared=()=>{throw Error('Fixture cannot write shared preferences');};
export const setAgentOrder=()=>{};export const run=()=>{throw Error('Fixture cannot navigate');};
export const hc=()=>{throw Error('Fixture cannot contact Core');};
export const exec=()=>{throw Error('Fixture cannot execute workers');};
`);
fs.renameSync(path.join(dir,'main.js'),path.join(dir,'agents-view.js'));
put('mods/custom-agents/main.js',`import Agents from './agents-view.js';import {agents} from './host.js';
export default class Fixture extends Agents {
 init(p,cx){super.init(p,cx);this.folded=new Set([1,10,100].map(n=>'sp-Folded '+n));for(const a of agents())this.changed[a.address]={s:'idle',at:Date.now()-19*60000};}
}
`);
// Keep production grouping/counts/row rendering and the native scroll surface.
// Retain one representative row per expanded group so every header is visible.
fs.renameSync(path.join(dir,'sidebar-scroll.js'),path.join(dir,'native-sidebar-scroll.js'));
put('mods/custom-agents/sidebar-scroll.js',`import {sidebarScroll as scroll} from './native-sidebar-scroll.js';
export function sidebarScroll(view,id,t,rows){return scroll(view,id,t,rows.filter((_row,i)=>[0,1,2,3,4,5,6,16,17].includes(i)));}
`);
put('mods/custom-agents-note/mod.json',{place:'none'});
put('mods/custom-agents-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View {render(){return div().size_full().p(24).text_size(16).child('Disposable Agents fixture · 130% zoom · synthetic counts 1 / 10 / 100');}}`);
const log = fs.openSync(path.join(root,'app.log'),'w');
const child = spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const app = args => execFileSync(appBin,args,{env,encoding:'utf8',timeout:15000});
try {
  let status;
  for(let i=0;i<80;i++){await sleep(250);assert.equal(child.exitCode,null);try{status=JSON.parse(app(['status']));if(status.zoom===1.3)break;}catch{}}
  assert.equal(status?.zoom,1.3);assert.deepEqual(status.errors,[]);
  await sleep(1200);
  const shot=path.join(root,'agents-130.png');app(['shot',shot]);
  fs.writeFileSync(path.join(root,'status.json'),JSON.stringify(status,null,2));
  // Measure actual painted pixels, not a guessed character width or mock layout.
  // Neutral count glyphs sit between the coloured group bulb and the chevron.
  const measure=String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile('${shot.replaceAll("'","''")}')
try {
 $pixels=[System.Collections.Generic.HashSet[int]]::new()
 for($y=80;$y -lt [Math]::Min(900,$b.Height);$y++) {
  for($x=0;$x -lt [Math]::Min(430,$b.Width);$x++) {
   $c=$b.GetPixel($x,$y)
   if(($c.G -gt $c.R*1.3 -and $c.G -gt $c.B*1.1) -or ($c.B -gt $c.R*1.3 -and $c.B -gt $c.G*1.1)) {[void]$pixels.Add($y*$b.Width+$x)}
  }
 }
 # Connected components reject coloured ClearType fringes on neutral text.
 $bands=@()
 while($pixels.Count) {
  $seed=($pixels | Select-Object -First 1);[void]$pixels.Remove($seed)
  $queue=[System.Collections.Generic.Queue[int]]::new();$queue.Enqueue($seed)
  $left=99999;$right=0;$top=99999;$bottom=0;$area=0
  while($queue.Count) {
   $p=$queue.Dequeue();$x=$p%$b.Width;$y=[Math]::Floor($p/$b.Width);$area++
   $left=[Math]::Min($left,$x);$right=[Math]::Max($right,$x);$top=[Math]::Min($top,$y);$bottom=[Math]::Max($bottom,$y)
   foreach($q in @(($p-1),($p+1),($p-$b.Width),($p+$b.Width))){if($pixels.Remove($q)){$queue.Enqueue($q)}}
  }
  if($area -ge 60 -and $right-$left -le 18 -and $bottom-$top -le 18){$bands+= @{left=$left;right=$right;top=$top;bottom=$bottom}}
 }
 $bands=@($bands | Sort-Object { $_.top })
 if($bands.Count -ne 6){throw ('Expected six painted dots; got '+($bands | ConvertTo-Json -Compress))}
 $rowDotLeft=$bands[3].left
 $counts=@(1,10,100);$result=@();$step=(($bands[2].top+$bands[2].bottom)-($bands[0].top+$bands[0].bottom))/4
 for($i=0;$i -lt 6;$i++) {
  $dot=$bands[$i];$cy=($dot.top+$dot.bottom)/2
  if($i -ge 3){$cy-= $step}
  $left=99999;$right=-1
  for($y=[int]($cy-17);$y -le [int]($cy+17);$y++) {
   for($x=$bands[0].right+8;$x -lt $rowDotLeft-15;$x++) {
    $c=$b.GetPixel($x,$y)
    if($c.R -gt 90 -and [Math]::Abs([int]$c.R-$c.G) -lt 15 -and [Math]::Abs([int]$c.R-$c.B) -lt 15){$left=[Math]::Min($left,$x);$right=[Math]::Max($right,$x)}
   }
  }
  if($right -lt $left){throw ('Count glyphs not found at index '+$i+'; dots '+($bands | ConvertTo-Json -Compress))}
  $result+= @{count=$counts[$i%3];expanded=($i -ge 3);dotX=($dot.left+$dot.right)/2;dotY=($dot.top+$dot.bottom)/2;countLeft=$left;countRight=$right}
 }
 $result | ConvertTo-Json -Compress
} finally {$b.Dispose()}
`;
  const measurements=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',measure],{encoding:'utf8',timeout:30000}));
  fs.writeFileSync(path.join(root,'measurements.json'),JSON.stringify(measurements,null,2));
  for(const row of measurements.slice(0,3))assert.equal(row.dotX,measurements[0].dotX,'Native mixed-state 1/2/3-digit group dots align');
  for(const row of measurements)assert.ok(Math.abs(row.countRight-measurements[0].countRight)<=1,'Native count glyphs share the right edge within raster rounding');
  console.log(JSON.stringify({shot,home,pid:child.pid,status,measurements},null,2));
} finally {
  try{app(['do','app.quit']);}catch{}
  await sleep(600);if(child.exitCode===null)child.kill();
  assert.ok(env.HC_SESSION.startsWith('test-agents-dot-'));
  try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});}catch{}
  fs.closeSync(log);
}
