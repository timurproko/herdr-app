import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),store=new Map();let ps=[],ts=[],focus=null;
const context=vm.createContext({sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}});
const runtime=new Map();
const api={panes:()=>ps,terminals:()=>ts,focused:()=>focus,home:()=> 'C:/Users/Local',shared:key=>runtime.get(key),setShared:(key,value)=>runtime.set(key,value)};
const native=new vm.SyntheticModule(Object.keys(api),function(){for(const[k,v]of Object.entries(api))this.setExport(k,v);},{context});
const labels=new vm.SourceTextModule(fs.readFileSync(path.join(root,'lib/terminal-labels.js'),'utf8'),{context});await labels.link(()=>{throw Error('Unexpected terminal-label dependency');});
const providerModules=new Map();
function providerModule(file){if(!providerModules.has(file))providerModules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));return providerModules.get(file);}
const provider=providerModule(path.join(root,'lib/integration/agent-context/context.js'));await provider.link((name,ref)=>providerModule(path.resolve(path.dirname(ref.identifier),name)));
const directoryLink=name=>name==='./host.js'?native:name==='./terminal-labels.js'?labels:provider;
const mod=new vm.SourceTextModule(fs.readFileSync(path.join(root,'lib/directory.js'),'utf8'),{context});await mod.link(directoryLink);await mod.evaluate();const d=mod.namespace;
ps=[{pane:'p1',terminal:'t1',tab:'tab1',cwd:'C:/Users/Local'},{pane:'p2',terminal:'t2',tab:'tab2',cwd:'C:/Users/Local'}];ts=[{address:'t1',cwd:'C:/Users/Local',labels:{}},{address:'t2',cwd:'C:/Users/Local',labels:{'custom.cwd':'D:/Git/a1','custom.home':'C:/Users/Local'}}];focus={space:'s',pane:'p2',terminal:'t2'};
const space={id:'s',name:'~',named:false,folder:'C:/Users/Local',machine:null,tabs:[{id:'tab1'},{id:'tab2'}]};
assert.equal(d.paneDirectory(ps[1]).name,'a1');assert.equal(d.spaceDirectory(space).cwd,'D:/Git/a1');assert.equal(d.displaySpace(space).name,'a1');assert.equal(d.displaySpace({...space,named:true,name:'My project'}).name,'My project');assert.equal(d.displaySpace({...space,named:undefined,name:'Keep unknown'}).name,'Keep unknown');
focus={space:'other',pane:'other',terminal:'other'};assert.equal(d.displaySpace(space).name,'a1','Inactive spaces retain the last focused terminal, not a frozen path');ts[1].labels['custom.cwd']='D:/Git/next';assert.equal(d.displaySpace(space).name,'next');assert.equal(d.paneDirectory(ps[0]).name,'~','An agent in another tab does not borrow the focused folder');
ts[1].foreground={name:'bash.exe',cwd:'C:/Users/Local'};assert.equal(d.paneDirectory(ps[1]).name,'next');ts[1].foreground={name:'node.exe',cwd:'D:/AgentActual'};assert.equal(d.paneDirectory(ps[1]).name,'AgentActual');delete ts[1].foreground;
ts[1].foreground={name:'powershell.exe',cwd:'C:/Users/Local'};
assert.equal(d.paneDirectory(ps[1]).cwd,'D:/Git/next','PowerShell logical prompt report wins over its stale Win32 cwd');
delete ts[1].labels['custom.cwd'];ts[1].foreground={name:'cmd.exe',cwd:'D:/CmdActual'};
assert.equal(d.paneDirectory(ps[1]).cwd,'D:/CmdActual','CMD live process cwd wins over stale pane/focus/launch snapshots');
ts[1].foreground={name:'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',cwd:'D:/NativeFallback'};
assert.equal(d.paneDirectory(ps[1]).cwd,'D:/NativeFallback','Unreported native shell process folders remain a usable fallback');
ts[1].labels['custom.cwd']='D:/Git/next';delete ts[1].foreground;
assert.equal(d.paneDirectory({terminal:null,mod:'custom-files',cwd:'D:/fixed-file-origin'}).cwd,null);assert.equal(d.tabDirectory('file-only').cwd,null);assert.equal(d.directoryName('c:\\users\\LOCAL\\','C:/Users/Local'),'~');assert.equal(d.directoryName('/home/A','/home/a'),'A');assert.equal(d.directoryName('\\\\server\\share\\project'),'project');assert.equal(d.directoryName('D:/bad\u001bpath'),'');
const remote={terminal:'pc2/t3',cwd:'/home/different'},remoteTerminal={address:'pc2/t3',labels:{'custom.cwd':'/home/different','custom.home':'/home/different'}};assert.equal(d.paneDirectory(remote,[remoteTerminal]).name,'~');assert.equal(d.paneDirectory(remote,[{address:'pc2/t3'}]).name,'different','Remote home is not guessed from the local machine');
ts[1].labels['custom.cwd']='relative-or-invalid';assert.equal(d.paneDirectory(ps[1]).name,'~');ps=ps.slice(0,1);assert.equal(d.displaySpace(space).name,'~','Removed terminals invalidate remembered focus');

// Capture the last live folder, then remove every terminal as a native exit would.
ps=[{pane:'p-last',terminal:'t-last',tab:'last-tab',cwd:'C:/Users/Local'}];
ts=[{address:'t-last',labels:{'custom.cwd':'D:/Git/last folder','custom.home':'C:/Users/Local'}}];
focus={space:'last-space',pane:'p-last',terminal:'t-last'};
const lastSpace={id:'last-space',machine:null,folder:'C:/Users/Local',named:false,tabs:[{id:'last-tab',active:true}]};
d.rememberSpaceDirectory(lastSpace);
const snapshot=runtime.get('custom.spaces.last-directory');
d.rememberSpaceDirectory(lastSpace);assert.equal(runtime.get('custom.spaces.last-directory'),snapshot,'Unchanged observation does not write shared state');
ps=[];ts=[];focus=null;
assert.equal(d.spaceDirectory(lastSpace).cwd,'D:/Git/last folder','Empty-space launches keep the last live folder, not HOME');
assert.equal(d.displaySpace(lastSpace).name,'last folder','An unnamed empty sidebar space keeps its last folder label');
const reloaded=new vm.SourceTextModule(fs.readFileSync(path.join(root,'lib/directory.js'),'utf8'),{context});await reloaded.link(directoryLink);await reloaded.evaluate();
assert.equal(reloaded.namespace.spaceDirectory(lastSpace).cwd,'D:/Git/last folder','A different/reloaded mod reads the same persisted runtime location');
ps=[{pane:'rp',terminal:'pc2/rt',tab:'remote-tab',cwd:'/home/me'}];
ts=[{address:'pc2/rt',labels:{'custom.cwd':'/work/remote project','custom.home':'/home/me'}}];
const remoteSpace={id:'pc2/s',machine:'pc2',folder:'/home/me',tabs:[{id:'remote-tab',active:true}]};
d.rememberSpaceDirectory(remoteSpace);ps=[];ts=[];
assert.equal(d.spaceDirectory(remoteSpace).cwd,'/work/remote project');
assert.equal(d.spaceDirectory({...remoteSpace,machine:'pc3'}).cwd,'/home/me','Remembered folders never cross machines');
// A newly appearing pane without a usable report must not overwrite the last valid location with HOME.
ps=[{pane:'rp',terminal:'pc2/rt',tab:'remote-tab'}];
d.rememberSpaceDirectory(remoteSpace);ps=[];
assert.equal(d.spaceDirectory(remoteSpace).cwd,'/work/remote project');

// Where a new terminal starts: never inside a crew worker's copy (its primary checkout, else home).
{
 const local={userHome:'C:/Users/Local'},reads=[];
 const read=async p=>{reads.push(p);return gitFiles[p]??null;};
 const gitFiles={'C:/Users/Local/.treehouse/crew-17d230/1/crew/.git':'gitdir: D:/Git/crew/.git/worktrees/crew\n','C:/Users/Local/.crew/.worktrees/abc123/.git':'gitdir: D:\\Git\\app\\.git\\worktrees\\abc123\r\n','C:/Users/Local/.treehouse/odd-1/1/odd/.git':'gitdir: D:/Somewhere/else\n'};
 const slot='C:/Users/Local/.treehouse/crew-17d230/1/crew/src/lib';
 // Ordinary folders and home are unchanged.
 assert.equal(d.startFolder('D:/Git/crew',local),'D:/Git/crew');assert.equal(d.startFolder('C:/Users/Local',local),'C:/Users/Local');assert.equal(d.startFolder('D:\\Git\\crew\\',local),'D:/Git/crew');
 // Folders that only look similar are not copies.
 assert.equal(d.startFolder('C:/Users/Local/.treehouse-notes/x',local),'C:/Users/Local/.treehouse-notes/x');assert.equal(d.startFolder('D:/Git/my.worktrees/x',local),'D:/Git/my.worktrees/x');assert.equal(d.startFolder('C:/Users/Local/.crew/coordinator',local),'C:/Users/Local/.crew/coordinator');
 assert.equal(d.startFolder('C:/Other/.treehouse/a-1/1/a',local),'C:/Other/.treehouse/a-1/1/a','A pool outside this machine’s home is not one');
 // <repo>/.worktrees/<name>: that repository, at once, without reading anything.
 assert.equal(d.startFolder('D:/Git/app/.worktrees/feature/src',local),'D:/Git/app');assert.equal(d.startFolder('D:\\Git\\App\\.WORKTREES\\x',local),'D:/Git/App','Mixed case and backslashes');
 // Treehouse slot and crew worktree: home until the slot's .git file has been read, then the primary checkout.
 assert.equal(d.startFolder(slot,local),'C:/Users/Local','Primary not known yet: home');
 await d.warmStartFolder(slot,local,read);assert.deepEqual(reads.splice(0),['C:/Users/Local/.treehouse/crew-17d230/1/crew/.git'],'The slot’s own .git file, once');
 assert.equal(d.startFolder(slot,local),'D:/Git/crew');
 assert.equal(d.startFolder('c:\\users\\LOCAL\\.TreeHouse\\crew-17d230\\1\\crew',local),'D:/Git/crew','Mixed case and backslashes find the same slot');
 await d.warmStartFolder(slot,local,read);assert.equal(reads.length,0,'Cached: not read again');
 await d.warmStartFolder('C:/Users/Local/.crew/.worktrees/abc123/pkg',local,read);assert.equal(d.startFolder('C:/Users/Local/.crew/.worktrees/abc123/pkg',local),'D:/Git/app');
 // Primary checkout not found (no .git file, or one that names no worktree): home.
 await d.warmStartFolder('C:/Users/Local/.treehouse/odd-1/1/odd',local,read);assert.equal(d.startFolder('C:/Users/Local/.treehouse/odd-1/1/odd',local),'C:/Users/Local');
 await d.warmStartFolder('C:/Users/Local/.treehouse/gone-1/1/gone',local,read);assert.equal(d.startFolder('C:/Users/Local/.treehouse/gone-1/1/gone',local),'C:/Users/Local');
 assert.equal(d.startFolder('C:/Users/Local/.treehouse/crew-17d230',local),'C:/Users/Local','Inside the pool but not in a slot: home');
 assert.equal(d.primaryFromGitFile('gitdir: D:/Git/x/.git/worktrees/y'),'D:/Git/x');assert.equal(d.primaryFromGitFile('not a git file'),null);
 // Another machine: paths of that machine, never read here; its home from the path when not reported.
 reads.length=0;
 await d.warmStartFolder('/home/me/.treehouse/r-1/1/r',{remote:true},read);assert.equal(reads.length,0,'Nothing is read for a remote path');
 assert.equal(d.startFolder('/home/me/.treehouse/r-1/1/r',{remote:true}),'/home/me');assert.equal(d.startFolder('/srv/app/.worktrees/x',{remote:true}),'/srv/app');
 assert.equal(d.startFolder('/home/me/.TreeHouse/r-1/1/r',{remote:true}),'/home/me/.TreeHouse/r-1/1/r','POSIX paths compare case-sensitively');
 assert.equal(d.startFolder('/home/me/.treehouse/r-1/1/r',{remote:true,userHome:'/home/me'}),'/home/me');
 // Pane and space wrappers: displays keep the real folder, the start folder avoids the copy.
 ps=[{pane:'wp',terminal:'wt',tab:'wtab',cwd:slot}];ts=[{address:'wt',labels:{'custom.cwd':slot,'custom.home':'C:/Users/Local'}}];focus={space:'ws',pane:'wp',terminal:'wt'};
 const workerSpace={id:'ws',machine:null,folder:'C:/Users/Local',tabs:[{id:'wtab',active:true}]};
 assert.equal(d.paneDirectory(ps[0]).cwd,slot,'paneDirectory still shows the worker’s real folder');assert.equal(d.spaceDirectory(workerSpace).cwd,slot);
 assert.equal(d.paneStartFolder(ps[0]),'D:/Git/crew');assert.equal(d.spaceStartFolder(workerSpace),'D:/Git/crew');
 ps=[{pane:'rp2',terminal:'pc2/rt2',tab:'rtab',cwd:'/home/me'}];ts=[{address:'pc2/rt2',labels:{'custom.cwd':'/home/me/.crew/.worktrees/w1','custom.home':'/home/me'}}];focus={space:'pc2/rs',pane:'rp2',terminal:'pc2/rt2'};
 assert.equal(d.paneStartFolder(ps[0]),'/home/me','A terminal on another machine: that machine’s home');
 assert.equal(d.spaceStartFolder({id:'pc2/rs',machine:'pc2',folder:'/home/me',tabs:[{id:'rtab',active:true}]}),'/home/me');
 ps=[];ts=[];focus=null;
}

// New isolated Bash processes + a mock hc only; never write into a user terminal
// or create a real core terminal/agent. No user startup files are sourced.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-cwd-test-'));
try{
 const bin=path.join(temp,'bin'),capture=path.join(temp,'labels'),folder=path.join(temp,'folder space # é');fs.mkdirSync(bin);fs.mkdirSync(folder);
 fs.writeFileSync(path.join(bin,'hc'),'#!/usr/bin/env bash\nprintf "%s\\0" "$@" >> "$CAPTURE"\nexit "${MOCK_STATUS:-0}"\n');fs.chmodSync(path.join(bin,'hc'),0o755);
 const core=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/hc.exe'),schema=JSON.parse(cp.execFileSync(core,['schema'],{encoding:'utf8',timeout:15000}));
 const caller=schema.methods.find(m=>m.name==='terminal.run').params.find(p=>p.name==='caller');assert.match(caller.description,/HC_TERMINAL_ID/,'Use the installed core’s documented marker, not a self-consistent mock name');
 const bashrc=fs.readFileSync(path.join(os.homedir(),'.bashrc'),'utf8');assert.ok(bashrc.includes('-z ${HC_TERMINAL_ID:-} && -r "$_lastdir_file"'),'Herdr launch-folder guard uses the real core marker too');
 const productionHook=path.join(root,'shell/bash-cwd.sh'),hook=fs.readFileSync(productionHook,'utf8'),guard='[[ $- == *i* && -n ${HC_TERMINAL_ID:-} && -t 1 ]]';assert.ok(hook.includes(guard));
 // Model TTY=true only in this disposable copy to exercise function logic
 // without creating or sending input to any real terminal. Check the original
 // production hook separately with a captured/non-TTY stdout below.
 const fixtureHook=path.join(temp,'mock-tty-hook.sh');fs.writeFileSync(fixtureHook,hook.replace(guard,'[[ $- == *i* && -n ${HC_TERMINAL_ID:-} ]]'));
 const env={...process.env,BASH_ENV:'',ENV:'',HOME:temp,HC_TERMINAL_ID:'owned-cwd-test',CAPTURE:capture,FIXTURE_BIN:bin,FIXTURE_FOLDER:folder,FIXTURE_HOOK:fixtureHook};
 const bash=path.join(process.env.ProgramFiles??'C:/Program Files','Git/bin/bash.exe');
 const run=(script,extra={},interactive=true)=>{const r=cp.spawnSync(bash,['--noprofile','--norc',interactive?'-ic':'-c','export PATH="$(cygpath -u "$FIXTURE_BIN"):$PATH"; '+script],{cwd:temp,env:{...env,...extra},encoding:'utf8',timeout:15000});assert.equal(r.status,0,'Isolated Bash fixture failed (no real hc was invoked)');return r.stdout;};
 const output=run('PROMPT_COMMAND="true"; source "$FIXTURE_HOOK"; source "$FIXTURE_HOOK"; [[ $PROMPT_COMMAND == "true; _herdr_report_cwd" ]] || exit 10; builtin cd "$FIXTURE_FOLDER" || exit 11; false; _herdr_report_cwd; [[ $? == 1 ]] || exit 12; _herdr_report_cwd; true');
 const args=fs.readFileSync(capture,'utf8').split('\0').filter(Boolean);assert.equal(args.length,10,'Only first report + changed directory publish labels');assert.equal(args[0],'label');assert.equal(args[1],'owned-cwd-test');assert.ok(args[7].endsWith('/folder space # é'));assert.ok(output.includes('%20%23%20%C3%A9'),'OSC 7 percent-encodes spaces, fragment markers and UTF-8');assert.equal((output.match(/\u001b\]7;/g)||[]).length,2);
 fs.writeFileSync(capture,'');run('PROMPT_COMMAND=(true true); source "$FIXTURE_HOOK"; source "$FIXTURE_HOOK"; [[ ${#PROMPT_COMMAND[@]} == 3 && ${PROMPT_COMMAND[2]} == _herdr_report_cwd ]] || exit 13');assert.equal(fs.readFileSync(capture,'utf8').split('\0').filter(Boolean).length,5);
 fs.writeFileSync(capture,'');run('source "$FIXTURE_HOOK"; _herdr_report_cwd; true',{MOCK_STATUS:'1'});assert.equal(fs.readFileSync(capture,'utf8').split('\0').filter(Boolean).length,10,'Failed labels retry silently');
 fs.writeFileSync(capture,'');assert.equal(run('source "$FIXTURE_HOOK"; [[ -z ${PROMPT_COMMAND:-} ]] || exit 14',{HC_TERMINAL_ID:''}),'');assert.equal(fs.readFileSync(capture,'utf8'),'');assert.equal(run('source "$FIXTURE_HOOK"',{},false),'');assert.equal(fs.readFileSync(capture,'utf8'),'');assert.equal(run('source "$FIXTURE_HOOK"',{FIXTURE_HOOK:productionHook}),'','Captured agent tools cannot overwrite a real terminal’s folder');assert.equal(fs.readFileSync(capture,'utf8'),'');
 console.log('PASS: authoritative directory labels/foreground paths, focus-following unnamed spaces, custom/remote/file guards, URI-safe Herdr-only Bash reporting, prompt/exit-status preservation and no real terminal/agent input');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
