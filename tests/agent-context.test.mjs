import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agentProjectDirectory, createAgentContext } from '../src/integration/agent-context/context.js';
import { projectDirectory } from '../src/integration/agent-context/validation.js';
import providers from '../src/integration/agent-context/providers.js';
const now = 1_030_000;
const a1 = {'a1.session':'11111111-1111-4111-8111-111111111111','a1.runtime':'22222222-2222-4222-8222-222222222222','a1.at':'1000000','a1.cwd':'D:/Git/repo/.worktrees/active'};
a1['a1.cwd.binding']=`${a1['a1.runtime']}/${a1['a1.session']}/${a1['a1.at']}`;
const read=(labels,app='a1',time=now)=>agentProjectDirectory({terminal:{address:'pc2/t1',report:{app},labels},now:time})?.cwd;
for(const cwd of ['D:/Git/repo space/项目','D:\\Git\\repo','\\\\server\\share\\repo','/work/repo','/'])assert.equal(read({...a1,'a1.cwd':cwd}),projectDirectory(cwd));
for(const key of Object.keys(a1)){const incomplete={...a1};delete incomplete[key];assert.equal(read(incomplete),undefined,`Missing ${key} falls back`);}
for(const key of ['a1.runtime','a1.session','a1.at'])assert.equal(read({...a1,[key]:key==='a1.at'?'1030000':'33333333-3333-4333-8333-333333333333'}),undefined,'Downgrade/old producer cannot refresh orphan paths');
for(const cwd of ['', 'relative', 'D:relative','\\root-relative','/bad\x1bpath','/bad\x85path','/bad\u2028path','/bad\ud800path','/'+ 'é'.repeat(2048)])assert.equal(read({...a1,'a1.cwd':cwd}),undefined);
for(const at of ['', 'NaN', 'Infinity','-1','1.5','1000000x',1000000,'9007199254740992'])assert.equal(read({...a1,'a1.at':at}),undefined);
for(const key of ['a1.session','a1.runtime'])for(const value of ['prefix','',1])assert.equal(read({...a1,[key]:value}),undefined);
assert.equal(read(a1,'a1',1_089_999),a1['a1.cwd']);assert.equal(read(a1,'a1',1_090_000),undefined);
assert.equal(read(a1,'a1',995_000),a1['a1.cwd']);assert.equal(read(a1,'a1',994_999),undefined);
assert.equal(read(a1,'bash'),undefined,'Leftover reports cannot override another program');
const claude={'custom.claude.session':'instance-123','custom.claude.at':'1000000','custom.claude.cwd':'/work/claude root'};
for(const app of ['claude-code','claude'])assert.equal(read(claude,app),claude['custom.claude.cwd']);
for(const key of Object.keys(claude)){const partial={...claude};delete partial[key];assert.equal(read(partial,'claude-code'),undefined);}
for(const cwd of ['relative','/bad\u0085','/'+ 'é'.repeat(2048)])assert.equal(read({...claude,'custom.claude.cwd':cwd},'claude-code'),undefined);
assert.equal(read(claude,'claude-code',1_090_000),undefined);assert.equal(read(claude,'claude-code',994_999),undefined);
assert.equal(read({...claude,'custom.claude.session':'bad\nidentity'},'claude-code'),undefined);
const future={id:'fixture-future',matches:({app})=>app==='future-agent',projectDirectory:({terminal})=>terminal.labels['fixture.project']};
const context=createAgentContext([...providers,future]);
const target={terminal:{address:'future/t9',report:{app:'future-agent'},labels:{'fixture.project':'/future/project/'}}};
assert.deepEqual(context.projectDirectory(target),{cwd:'/future/project',provider:'fixture-future'},'New providers need no shared resolver or panel edits');
assert.equal(context.projectDirectory({...target,pane:{terminal:'other/t9'}}),null,'Providers never borrow a different terminal');
assert.equal(createAgentContext([future,{...future,id:'duplicate'}]).projectDirectory(target),null,'Ambiguity fails closed');
assert.equal(createAgentContext([{...future,projectDirectory(){throw Error('unavailable');}}]).projectDirectory(target),null);
assert.equal(createAgentContext([{...future,matches(){throw Error('unavailable');}}]).projectDirectory(target),null);
assert.equal(createAgentContext([{id:'no-capability',matches:()=>true}]).projectDirectory(target),null);
for(const file of ['../src/ui/directory.js','../src/integration/herdr/terminal-labels.js','../src/integration/agent-context/context.js']) {
  assert.doesNotMatch(fs.readFileSync(new URL(file,import.meta.url),'utf8'),/a1|claude/i,`Shared code cannot identify agents: ${file}`);
}
console.log('PASS: generic project capability, isolated A1/Claude providers, fresh validated paths, future providers and fail-closed ambiguity/errors');
