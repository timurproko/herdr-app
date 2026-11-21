// node --experimental-vm-modules scripts/profile-cache.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import nodeFs from 'node:fs';
// The real ui.js basics (dist/lib/ui.js) on this test's element: shared rows/buttons as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const read = file => readFileSync(new URL(`../mods/${file}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const persisted = new Map();
let now = 100000, knownCalls = 0, probes = 0, shellProbes = 0, fail = false, gate = null;
let native = [{ key: 'claude', name: 'Claude Code', run: ['claude'], installed: false }, { key: 'codex', name: 'Codex', run: ['codex', '--kept'], installed: false }];
const api = {
  shared: key => persisted.get(key), setShared: (key, value) => persisted.set(key, plain(value)),
  appHome: () => '/app', readTextFile: async path => path.endsWith('/shells.cjs') ? '// shell-discovery' : '// read-only discovery',
  knownAgents: async () => { knownCalls++; return plain(native); },
  exec: async (_command, argv) => {
    if (argv.includes('// shell-discovery')) {
      shellProbes++; if (fail) throw Error('Offline');
      return { code: 0, stdout: JSON.stringify({ shells: [{ key:'installed:cmd', name:'Command Prompt', source:'Installed shell', run:['C:/Windows/cmd.exe'] }] }) };
    }
    probes++; if (gate) await gate;
    if (fail) throw Error('Offline');
    const { commands } = JSON.parse(argv.at(-1));
    return { code: 0, stdout: JSON.stringify({ entries: Object.fromEntries(commands.map(p => [p.key, { found: true, run: [`/resolved/${p.command}`] }])) }) };
  },
};
async function loadCache() {
  const session = new Map();
  const context = vm.createContext({ Date: class extends Date { static now() { return now; } },
    sessionStorage: { getItem: k => session.get(k) ?? null, setItem: (k, v) => session.set(k, v) } });
  const dep = new vm.SyntheticModule(Object.keys(api), function () { for (const [k,v] of Object.entries(api)) this.setExport(k,v); }, { context });
  const module = new vm.SourceTextModule(read('custom-new-menu/profiles.js'), { context });
  await module.link(() => dep); await module.evaluate();
  return { module, context, p: module.namespace };
}
const { p } = await loadCache();
const first = p.loadProfiles(null), second = p.loadProfiles(null);
assert.equal(first, second, 'Simultaneous same-config discovery is coalesced.');
await first; assert.equal(knownCalls, 1); assert.equal(probes, 1);
assert.deepEqual(plain(p.cachedProfiles(null).filter(x => x.show).map(x => x.key)), ['terminal','claude','codex']);
const fresh = await loadCache();
assert.equal(fresh.p.cachedProfiles(null).length, 3, 'A fresh popup/runtime with empty sessionStorage immediately reads the persistent shared catalog.');
assert.equal(fresh.p.cachedProfiles('other-machine').length, 0, 'Never leak local executable paths into another machine.');
const checked = probes;
await fresh.p.warmProfiles(null); await fresh.p.warmProfiles(null);
assert.equal(probes, checked, 'Fresh prewarming does not probe on every timer/click.');
fresh.p.updateProfile(null,'codex',{ name:'Work Codex', args:['--new','two words'] });
let cached = fresh.p.cachedProfiles(null).find(x => x.key === 'codex');
assert.equal(cached.name,'Work Codex'); assert.deepEqual(plain(cached.run),['/resolved/codex','--new','two words']);
await fresh.p.warmProfiles(null); assert.equal(probes, checked, 'Label/argument edits reuse command-specific resolution proof.');
fresh.p.updateProfile(null,'codex',{ command:'/custom/codex' });
cached = fresh.p.cachedProfiles(null).find(x => x.key === 'codex');
assert.notEqual(cached.available,true); assert.equal(cached.run[0],'/custom/codex','Never reuse an old resolved executable for an edited command.');
await fresh.p.warmProfiles(null); assert.equal(probes,checked+1);

// Failures leave the last complete catalog available and are rate-limited.
now += 61000; fail = true;
const saved = JSON.stringify(persisted.get('custom.profile-catalog:null'));
await assert.rejects(fresh.p.warmProfiles(null));
assert.equal(JSON.stringify(persisted.get('custom.profile-catalog:null')),saved);
const failedProbes = probes;
await fresh.p.warmProfiles(null); assert.equal(probes,failedProbes,'Offline warm attempts back off rather than retrying on each open.');
assert.equal(fresh.p.cachedProfiles(null).length,3);
fail = false;

// A settings edit during asynchronous discovery cannot publish the old config.
let release; gate = new Promise(resolve => { release = resolve; });
const racing = p.loadProfiles('race');
await Promise.resolve(); await Promise.resolve();
p.updateProfile('race','codex',{command:'/changed/codex'}); release(); await racing; gate=null;
assert.equal(persisted.has('custom.profile-catalog:"race"'),false,'Stale in-flight result is discarded.');
await p.loadProfiles('race');
assert.equal(p.cachedProfiles('race').find(x=>x.key==='codex').run[0],'/resolved//changed/codex');

// Exercise the actual + menu init/render with an independent module context.
function element() {
  const data={kids:[],style:{}};let el;
  el=new Proxy(data,{get(o,k){if(k in o)return o[k];if(k==='when')return(yes,fn)=>yes?fn(el):el;if(k==='child')return child=>{o.kids.push(child);return el;};if(k==='children')return children=>{o.kids.push(...children);return el;};return(...args)=>{o.style[k]=args;return el;};}});return el;
}
async function menuClass(profiles, getMachine) {
  const context=vm.createContext({});
  const modules={
    'gpui-kit':{View:class{},div:element,svg:element,image:element},
    'gpui-base':{h_flex:element,v_flex:element,ScrollHandle:{new:()=>({scroll_to_item(){}})}},
    './host.js':{theme:()=>({}),spaces:()=>[{id:'space',active:true,machine:getMachine()}],run(){},openOverlay(){},closeOverlay(){},props:()=>({}),keys:()=>[],shared:k=>persisted.get(k),setShared:(k,v)=>persisted.set(k,v),readTextFile:async()=>null},
    './ui.js':{menuRow:uiReal(element).menuRow,U:{row:28,gap:8,radius:6,icon:16,smallIcon:14},emptyState:element,slot:x=>x,menuSurface:(_,x)=>x,hotkey:()=>'',menuHeading:element,rolePill:element,rolePillButton:element,ROLE_LABELS:{firstmate:'Firstmate'},ROLE_ACTIONS:{firstmate:'Start Crew'}},
    './modal-layout.js':{divider:element}, './profiles.js':{PROFILE_ROLES:['firstmate'],launchList:(l,roles=[])=>l.filter(p=>p.show||(p.key!=='terminal'&&roles.includes(p.role))),plainProfile:p=>p,...profiles},
    './plugins.js':{pluginGateReady:()=>false},
    './profile-actions.js':{launchSpaceProfile(){}},
    './directory.js':{spaceDirectory:()=>({cwd:'/work'}),warmSpaceStartFolder:async()=>{}},'./shell-switch.js':{ShellSwitch:class{}},'./panel-switch.js':{PanelSwitch:class{}},
  };
  const module=new vm.SourceTextModule(read('custom-new-menu/main.js'),{context});
  await module.link(specifier=>new vm.SyntheticModule(Object.keys(modules[specifier]),function(){for(const[k,v]of Object.entries(modules[specifier]))this.setExport(k,v);},{context}));
  await module.evaluate();return module.namespace.default;
}
let machine=null, menuLookups=0;
const Menu=await menuClass({cachedProfiles:fresh.p.cachedProfiles,composeProfiles:fresh.p.composeProfiles,loadProfiles:async m=>{menuLookups++;return fresh.p.loadProfiles(m);}},()=>machine);
const tasks=[];const cx={focus_handle:()=>({focus(){}}),notify(){},spawn(fn){tasks.push(fn(cx));}};
const open=new Menu();open.init({},cx);
assert.equal(menuLookups,0,'Opening a cached + menu never runs discovery.');assert.equal(tasks.length,0);
const openingHeight=open.render().style.h[0],openingKeys=plain(open.items.map(p=>p.key));
native.push({key:'opencode',name:'OpenCode',run:['opencode'],installed:false});await fresh.p.loadProfiles(null);
assert.deepEqual(plain(open.items.map(p=>p.key)),openingKeys,'A background discovery cannot add/reorder rows under an open menu.');
assert.equal(open.render().style.h[0],openingHeight,'An open popup never resizes after cache updates.');
const reopened=new Menu();reopened.init({},cx);assert.ok(reopened.items.some(p=>p.key==='opencode'),'Next opening immediately sees the refreshed catalog.');
assert.equal(menuLookups,0);
machine='never-seen';const cold=new Menu();cold.init({},cx);const coldHeight=cold.render().style.h[0];
await Promise.all(tasks);assert.equal(cold.render().style.h[0],coldHeight,'Even a first-install cold load keeps its viewport size fixed.');
assert.ok(cold.items.some(p=>p.key==='codex'));assert.equal(menuLookups,1);
// The shell picker has the same persistent, machine-isolated warm-opening contract.
const shellFirst = p.loadTerminalShells(null), shellSecond = p.loadTerminalShells(null);
assert.equal(shellFirst, shellSecond); await shellFirst;
assert.equal(shellProbes, 1);
const shellFresh = await loadCache();
assert.equal(shellFresh.p.cachedTerminalShells(null)[0].name, 'Command Prompt');
assert.equal(shellFresh.p.cachedTerminalShells('other').length, 0);
await shellFresh.p.warmTerminalShells(null); assert.equal(shellProbes, 1, 'A warm shell picker needs no subprocess');
now += 61000; fail = true;
await shellFresh.p.warmTerminalShells(null); assert.equal(shellProbes, 2);
assert.equal(shellFresh.p.cachedTerminalShells(null).length, 1, 'Offline checks preserve the last shell rows');
await shellFresh.p.warmTerminalShells(null); assert.equal(shellProbes, 2, 'Failed shell probes back off');
fail = false;
// Cached banner-producing launchers are invalidated, including across restarts.
const legacyMachine='legacy-shell',legacyKey='custom.shell-catalog:"legacy-shell"',ps='C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const shellItem={key:'installed:powershell',name:'Windows PowerShell',source:'Installed shell',run:[ps,'-NoLogo']};
persisted.set(legacyKey,{policy:1,items:[{...shellItem,run:[ps]}],checkedAt:now});
assert.equal(shellFresh.p.cachedTerminalShells(legacyMachine).length,0,'Old shell argv must be rechecked');
persisted.set(legacyKey,{policy:2,items:[shellItem],checkedAt:now});
shellFresh.p.updateProfile(legacyMachine,'terminal',{command:ps,args:[],shell_profile:'installed:powershell'});
const savedSelection=JSON.stringify(shellFresh.p.profileConfig(legacyMachine));
let terminal=shellFresh.p.composeProfiles(legacyMachine,[]).find(p=>p.key==='terminal');
assert.deepEqual(plain(terminal.run),[ps,'-NoLogo']);assert.equal(terminal.available,true);
assert.equal(JSON.stringify(shellFresh.p.profileConfig(legacyMachine)),savedSelection,'Legacy launcher adaptation never rewrites user preferences');
shellFresh.p.updateProfile(legacyMachine,'terminal',{args:['-NoExit']});
terminal=shellFresh.p.composeProfiles(legacyMachine,[]).find(p=>p.key==='terminal');
assert.deepEqual(plain(terminal.run),[ps,'-NoExit'],'Explicit custom startup arguments stay unchanged');
shellFresh.p.updateProfile(legacyMachine,'terminal',{command:'C:/custom/powershell.exe',args:[]});
terminal=shellFresh.p.composeProfiles(legacyMachine,[]).find(p=>p.key==='terminal');
assert.deepEqual(plain(terminal.run),['C:/custom/powershell.exe'],'Never redirect a custom executable to an unrelated installation');
assert.equal(read('custom-new-menu/profiles.js'),read('custom-settings/profiles.js'));
assert.equal(read('custom-new-menu/profiles.js'),read('custom-tabs/profiles.js'));
console.log('PASS: persistent cross-popup cache, background-only refresh, single-flight/TTL/backoff, config-race safety, command proof invalidation, immediate populated menus and stable popup geometry.');
