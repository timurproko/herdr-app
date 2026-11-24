// Opt-in Windows typography fixture. Starts only its own disposable app, with
// an unavailable Core binary, no terminals, credentials, live home or deployment.
// --diagnose compares native/literal Geist at both weights/heights and Segoe UI;
// default captures the actual packaged shared Git text helper before/after.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
if(process.platform!=='win32'||!process.argv.includes('--run'))throw Error('Explicit Windows opt-in required: --run [--diagnose]');
const app=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const diagnose=process.argv.includes('--diagnose'),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
fs.mkdirSync('.artifacts',{recursive:true});const root=fs.mkdtempSync(path.resolve('.artifacts/ge-'));build();
for(const zoom of [1,1.3]) {
  const home=path.join(root,zoom===1?'1':'13');
  assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104,'Own native socket must fit');
  const env={...process.env,HERDR_APP_HOME:home,HERDR_APP_ID:`git-ellipsis-fixture-${Date.now()}`,HC_SESSION:`no-core-git-ellipsis-${Date.now()}`,HERDR_RELEASES_URL:'http://127.0.0.1:1'};
  for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS'])delete env[key];
  const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));};
  put('settings.json',{telemetry:false,zoom,core:path.join(home,'unavailable-core.exe')});
  put('shared.json',{layout:'EllipsisFixture','frame.welcomed':'skipped'});
  put('layouts/EllipsisFixture.json',{id:'root',type:'row',titlebar:'system',children:[{id:'fixture',type:'block',content:{mod:'custom-ellipsis-fixture'}}]});
  const dir=path.join(home,'mods/custom-ellipsis-fixture'),dispose=temporaryMod(home,'custom-ellipsis-fixture');
  try {
  fs.cpSync(path.resolve('dist/mods/custom-changes'),dir,{recursive:true});fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes.js'));
  put('mods/custom-ellipsis-fixture/mod.json',{place:'none'});
  put('mods/custom-ellipsis-fixture/main.js',`import Changes from './changes.js';import {div} from 'gpui-kit';import {h_flex,v_flex} from 'gpui-base';import {writeTextFile} from './host.js';
export default class Fixture extends Changes {
 init(p,cx){this.context='fixture';cx.timer.after(2000,cx=>cx.spawn(async()=>{await writeTextFile(${JSON.stringify(path.join(home,'metrics.json'))},JSON.stringify({boxes:[...(this.pullTextBoxes??[])],widths:[...(this.pullTextWidths??[])]}),null);}));}
 shown(){return true;}
 render(){this.pullTextPending=new Set();const text='feature(status): add bounded fleet overview with a very long title';
 const row=(label,body)=>h_flex().h(48).gap(20).items_center().child(div().w(230).text_size(12).font_normal().child(label)).child(body);
 const native=(font,semi,literal=false,height=20,family='Geist')=>div().w(240).h(height).line_height(height+'px').text_size(font).font_family(family).when(semi,el=>el.font_semibold()).when(!semi,el=>el.font_normal()).when(!literal,el=>el.truncate()).when(literal,el=>el.whitespace_nowrap().overflow_hidden()).child(literal?'feature(status): add fleet …':text);
 const fixed=(id,font,weight)=>this.measuredText(id,text,{font,height:font===13?20:18,weight,truncate:true}).w(240);
 const rows=${diagnose ? `[
 row('Geist 13 semibold native',native(13,true)),row('Geist 13 semibold literal',native(13,true,true)),
 row('Geist 13 normal native',native(13,false)),row('Geist 13 normal literal',native(13,false,true)),
 row('Geist metadata 11 native',native(11,false,false,18)),row('Geist metadata 11 literal',native(11,false,true,18)),
 row('Geist semibold taller line',native(13,true,false,32)),row('Segoe UI native',native(13,true,false,20,'Segoe UI'))]` : `[
 row('Before: PR title',native(13,true)),row('After: measured PR title',fixed('pr-title-native',13,'semibold')),
 row('Before: repository header',native(12,false,false,18)),row('After: repository header',fixed('task-repo-name-native',12,'normal')),
 row('Before: panel repository',native(12,false,false,18)),row('After: panel repository',fixed('git-repo-name',12,'normal')),
 row('Unchanged fitting title',this.measuredText('pr-title-short','A fitting PR title',{font:13,height:20,weight:'semibold',truncate:true}).w(240))]`};
 return v_flex().size_full().p(24).gap(8).font_family('Geist').bg('#191d28').text_color('#eeeeee')
 .child(div().h(32).text_size(16).child('Disposable Git ellipsis ${diagnose?'diagnosis':'fix'} — zoom ${zoom}')).children(rows);
 }}
`);
  const descriptor=fs.openSync(path.join(home,'app.log'),'w'),child=spawn(app,[],{env,stdio:['ignore',descriptor,descriptor]});
  try {
    let status;
    for(let attempt=0;attempt<50;attempt++) {
      await sleep(250);assert.equal(child.exitCode,null,'Only own fixture app must remain alive');
      try {status=JSON.parse(execFileSync(app,['status'],{env,encoding:'utf8',timeout:4000,windowsHide:true,stdio:['ignore','pipe','ignore']}));break;}catch {}
    }
    assert.ok(status,'Disposable native app answers');await sleep(2800);
    status=JSON.parse(execFileSync(app,['status'],{env,encoding:'utf8',timeout:4000,windowsHide:true}));assert.deepEqual(status.errors,[]);
    fs.writeFileSync(path.join(home,'status.json'),JSON.stringify(status,null,2));
    execFileSync(app,['shot',path.join(home,'comparison.png')],{env,timeout:15000,windowsHide:true});
    if(!diagnose) {
      const metrics=JSON.parse(fs.readFileSync(path.join(home,'metrics.json'),'utf8'));
      for(const id of ['pr-title-native','task-repo-name-native','git-repo-name']) {
        const record=metrics.boxes.find(([key])=>key===id)?.[1];assert.ok(record?.fit&&record.fit.high-record.fit.low<=1,'Measured prefix converges');
      }
    }
    console.log(`Native ${diagnose?'diagnosis':'fix'} ${zoom*100}%: ${home}`);
  } finally {child.kill();await sleep(400);fs.closeSync(descriptor);}
  } finally {dispose();}
}
console.log('Inspect comparison.png at both zooms; only disposable app processes/homes were used. No live app, Core, terminal or preference was changed.');
