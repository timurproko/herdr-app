// Exercise the real CLI files in a disposable checkout; no real desktop/home access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.mkdirSync(path.join(project,'.artifacts'),{recursive:true});
const temp=fs.mkdtempSync(path.join(project,'.artifacts','preferences-home-'));
const checkout=path.join(temp,'checkout'),user=path.join(temp,'user');
const write=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
const put=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
const get=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function tree(root) {
  return Object.fromEntries(fs.readdirSync(root,{recursive:true,withFileTypes:true})
    .filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath??e.path,e.name);return [path.relative(root,file),fs.readFileSync(file,'utf8')];}));
}
const palette={version:1,palette:{accent:'#123456',background:'#181818',sidebar:'#141414',surface:'#1e1e1e',border:'#282828',foreground:'#fafafa',muted:'#a3a3a3'}};
const theme='{"colors":{"accent":"#123456"}}\n';
const layout={version:1,overrides:{terminal_padding:[8,8]}};
const shared={'sidebar.collapsed':false,'custom.profiles:null':{version:1,overrides:{},custom:[],order:[]},unrelated:{session:'keep'}};
const seed=home=>{
  put(path.join(home,'shared.json'),shared);
  put(path.join(home,'.customizations/layout-preferences.json'),layout);
  put(path.join(home,'.customizations/palette.json'),{customization:palette,theme});
  write(path.join(home,'themes/custom-palette.json'),theme);
};
try {
  // Copy only the import graph, not the maintainer's snapshots or generated output.
  for(const file of ['package.json','tools/preferences.mjs','tools/runtime/preferences.mjs','tools/runtime/settings-sections.js',
    'tools/build.mjs','tools/deploy.mjs','tools/trello-launchers.mjs','tools/files.mjs','tools/plugins.mjs','tools/layout-preferences.mjs','tools/preferences-export.mjs','src/ui/settings-sections.js',
    'src/integration/herdr/compatibility.js','src/appearance/layouts/Custom.json']) {
    write(path.join(checkout,file),fs.readFileSync(path.join(project,file)));
  }
  // Invalid legacy JSON catches any attempted fallback; all bytes must remain intact.
  for(const name of ['fixture-host','layout','palette','theme'])write(path.join(checkout,'preferences',name+'.json'),'legacy snapshot: leave untouched\n');
  const checkoutBefore=tree(checkout);
  const preload=path.join(temp,'isolate.mjs');
  write(preload,`import os from 'node:os';
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
os.homedir=()=>${JSON.stringify(user)};
os.hostname=()=>'Fixture-HOST';
cp.execFileSync=(file,args)=>{
  if(file!=='powershell.exe'||!args.some(a=>a.includes('Get-Process herdr-app')))throw Error('Unexpected external command: '+file);
  return process.env.FIXTURE_DESKTOP_OPEN==='1'?'running':'closed';
};
syncBuiltinESMExports();
`);
  for(const entry of ['tools/preferences.mjs','tools/runtime/preferences.mjs']) {
    for(const selection of ['environment','explicit','default','empty']) {
      const environmentHome=path.join(temp,entry.includes('/runtime/')?'runtime':'wrapper',selection);
      const home=selection==='explicit'?path.join(environmentHome,'explicit'):
        ['default','empty'].includes(selection)?path.join(user,'.config/herdr-app'):environmentHome;
      fs.rmSync(home,{recursive:true,force:true});seed(home);
      const env={...process.env,HERDR_APP_HOME:environmentHome,FIXTURE_DESKTOP_OPEN:'0'};
      if(selection==='default')delete env.HERDR_APP_HOME;
      if(selection==='empty')env.HERDR_APP_HOME='';
      const args=selection==='explicit'?[home]:[];
      function run(action,{open=false,fail=null}={}) {
        const result=cp.spawnSync(process.execPath,['--import',pathToFileURL(preload).href,path.join(checkout,entry),action,...args],
          {cwd:checkout,env:{...env,FIXTURE_DESKTOP_OPEN:open?'1':'0'},encoding:'utf8',timeout:15000});
        assert.ifError(result.error);
        if(fail){assert.equal(result.status,1,result.stdout);assert.match(result.stderr,fail);}
        else assert.equal(result.status,0,result.stderr);
        return result;
      }
      run('export');
      const prefs=path.join(home,'preferences'),host=path.join(prefs,'fixture-host.json');
      assert.deepEqual(get(host),{version:1,shared:{'custom.profiles:null':shared['custom.profiles:null'],'sidebar.collapsed':false}});
      assert.deepEqual(get(path.join(prefs,'palette.json')),palette);
      if(entry==='tools/preferences.mjs') {
        assert.deepEqual(get(path.join(prefs,'layout.json')),layout);
        assert.equal(fs.readFileSync(path.join(prefs,'theme.json'),'utf8'),theme);
      }
      if(selection==='explicit')assert.ok(!fs.existsSync(path.join(environmentHome,'preferences')),'Explicit home wins over environment');
      const stamp=fs.statSync(host).mtimeMs;run('export');assert.equal(fs.statSync(host).mtimeMs,stamp,'Quiet exports');
      put(path.join(home,'shared.json'),{...shared,'sidebar.collapsed':true});
      const beforeOpen=tree(home);run('import',{open:true,fail:/Close (?:the )?Herdr [Dd]esktop/});assert.deepEqual(tree(home),beforeOpen);
      if(entry==='tools/preferences.mjs') {
        write(path.join(home,'themes/custom-palette.json'),'personal conflict\n');
        const beforeConflict=tree(home);run('import',{fail:/Personal palette conflict/});assert.deepEqual(tree(home),beforeConflict);
        fs.rmSync(path.join(home,'themes/custom-palette.json')); // first-install theme seeding from the saved snapshot
        put(path.join(home,'.customizations/layout-preferences.json'),{version:1,overrides:{}});
      }
      run('import');
      assert.equal(get(path.join(home,'shared.json'))['sidebar.collapsed'],false);
      assert.deepEqual(get(path.join(home,'shared.json')).unrelated,shared.unrelated);
      assert.deepEqual(get(path.join(home,'.customizations/palette.json')).customization,palette);
      if(entry==='tools/preferences.mjs') {
        assert.deepEqual(get(path.join(home,'.customizations/layout-preferences.json')),layout);
        assert.equal(fs.readFileSync(path.join(home,'themes/custom-palette.json'),'utf8'),theme);
      }
      fs.unlinkSync(host);
      put(path.join(prefs,'other-host.json'),{version:1,shared:{'sidebar.collapsed':false}});
      put(path.join(home,'shared.json'),{...shared,'sidebar.collapsed':true});
      run('import');assert.equal(get(path.join(home,'shared.json'))['sidebar.collapsed'],true,'No legacy/other-host fallback');
      assert.deepEqual(tree(checkout),checkoutBefore,'No checkout writes or automatic migration/deletion');
    }
  }
  console.log('PASS: source/runtime preference CLI home selection, private snapshots, visual restore, legacy isolation and safety guards');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
