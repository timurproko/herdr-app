// Pull-request facts shown by the Git panel, from gh's JSON. Pure: no exec, no UI.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=await import(new URL('file://'+path.join(root,'mods/custom-changes/pulls.js').replace(/\\/g,'/')).href);
const now=Date.parse('2026-11-10T17:10:10Z');

assert.equal(m.PR_PAGE_SIZE,10);
assert.ok(m.PR_FIELDS.split(',').includes('labels'),'Targeted older active/coordinator PR reads include labels');
for (const state of ['open','closed']) assert.ok(m.pullListArgs(state,'owner/repo').some(a=>a.includes('labels(first:100){nodes{name color}}')));
const labels=[{name:'🤖 Under review',color:'840479'},{name:'ready · 🚀',color:'ABCDEF'}];
const expectedLabels=[{name:'🤖 Under review',color:'#840479'},{name:'ready · 🚀',color:'#ABCDEF'}];
assert.deepEqual(m.pullLabels(labels),expectedLabels);
assert.deepEqual(m.pullLabels({nodes:labels}),expectedLabels);
for(const value of [null,undefined,{},[],{nodes:[]}])assert.deepEqual(m.pullLabels(value),[]);
assert.deepEqual(m.pullLabels([null,{}, {name:''},{name:'invalid colour',color:'red;bad'}]),[{name:'invalid colour',color:null}]);
assert.deepEqual(m.pullListArgs('open','owner/repo').slice(0,2),['api','graphql']);
assert.ok(m.pullListArgs('open','owner/repo').some(a=>a.includes('first:10') && a.includes('states:[OPEN]')));
assert.ok(m.pullListArgs('closed','owner/repo').some(a=>a.includes('states:[CLOSED,MERGED]')));
assert.ok(m.pullListArgs('weird','owner/repo').some(a=>a.includes('states:[OPEN]')),'Unknown states fall back to open');
assert.ok(!m.pullListArgs('open','owner/repo').some(a=>a.startsWith('after=')));
assert.ok(m.pullListArgs('closed','owner/repo','cursor:10').includes('after=cursor:10'));
const pageReply = nodes => JSON.stringify({data:{repository:{pullRequests:{nodes,totalCount:25,pageInfo:{hasNextPage:true,endCursor:'cursor:10'}}}}});
const page = m.parsePullPage(pageReply([{number:1,commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:[{name:'test',checkSuite:{workflowRun:{workflow:{name:'CI'}}}}]}}}}]}}]));
assert.equal(page.pulls[0].statusCheckRollup[0].workflowName,'CI');
const labeledPage=m.parsePullPage(pageReply([{number:2,labels:{nodes:labels}}]));
assert.deepEqual(m.pullRow(labeledPage.pulls[0],'owner',now).labels,expectedLabels);
assert.deepEqual(m.pullRow({number:2,labels},'owner',now).labels,expectedLabels);
assert.deepEqual(m.pullRow({number:2},'owner',now).labels,[]);
assert.equal(page.cursor,'cursor:10'); assert.equal(page.hasMore,true); assert.equal(page.total,25);
assert.throws(()=>m.parsePullPage('{}'));
assert.throws(()=>m.parsePullPage(JSON.stringify({errors:[{message:'GitHub rate limit'}]})),/rate limit/);
assert.throws(()=>m.parsePullPage(JSON.stringify({data:{repository:{pullRequests:{nodes:[],pageInfo:{hasNextPage:true}}}}})),/cursor/);
assert.deepEqual(m.countArgs('timurproko/a1').slice(0,2),['api','graphql']);
assert.ok(m.countArgs('timurproko/a1').includes('owner=timurproko')&&m.countArgs('timurproko/a1').includes('name=a1'));
assert.deepEqual(m.parseCounts(JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:893}}}})),{open:1,closed:893});
assert.equal(m.parseCounts('nope'),null);

assert.equal(m.ago('2026-11-10T16:45:10Z',now),'25 minutes ago');
assert.equal(m.ago('2026-11-10T17:10:00Z',now),'10 seconds ago');
assert.equal(m.ago('2026-11-10T16:10:10Z',now),'1 hour ago');
assert.equal(m.ago('2026-11-01T17:10:10Z',now),'9 days ago');
assert.equal(m.ago('2026-08-10T17:10:10Z',now),'3 months ago');
assert.equal(m.ago('2024-08-10T17:10:10Z',now),'2 years ago');
assert.equal(m.ago(undefined,now),'');

assert.deepEqual(m.tasks('- [x] a\n- [ ] b\n- [ ] c\nno box'),{done:1,total:3,label:'1 of 3 tasks'});
assert.deepEqual(m.tasks('1. [X] only'),{done:1,total:1,label:'1 task done'});
assert.equal(m.tasks('- [x] a\n- [x] b').label,'2 tasks done');
assert.deepEqual(m.tasks('- [ ] a\n- [ ] b'),{done:0,total:2,label:'2 tasks'});
assert.equal(m.tasks('- [ ] only').label,'1 task');
assert.equal(m.tasks('- [ ] a\n- [ ] b\n- [ ] c\n- [ ] d').label,'4 tasks');
assert.equal(m.tasks('plain body'),null);assert.equal(m.tasks(null),null);

const run=(name,conclusion,completedAt,status='COMPLETED')=>({__typename:'CheckRun',name,workflowName:'CI',conclusion,completedAt,status});
const rollup=[run('build','CANCELLED','2026-11-10T18:00:00Z'),run('build','SUCCESS','2026-11-10T18:05:00Z'),run('lint','SUCCESS','2026-11-10T18:05:00Z'),{__typename:'StatusContext',context:'ext',state:'SUCCESS'}];
assert.deepEqual(m.checks(rollup),{ok:3,bad:0,pending:0,total:3,label:'3/3',state:'success'},'Only the latest run per check counts, as GitHub shows');
assert.equal(m.checks([...rollup,run('test',null,null,'IN_PROGRESS')]).state,'pending');
assert.equal(m.checks([...rollup,run('test','FAILURE','2026-11-10T18:06:00Z')]).state,'failure');
assert.equal(m.checks([]),null);assert.equal(m.checks(undefined),null);

const action=(name,id,conclusion='SUCCESS',workflowName='Validation',status='COMPLETED')=>({
  ...run(name,conclusion,'2026-11-10T18:05:00Z',status),workflowName,
  detailsUrl:`https://github.com/example/repo/actions/runs/${id}/job/1`,
});
// The newer run expands the matrix and omits two skipped placeholders from the
// older run. Deduplication by job name alone incorrectly produces 14/19.
const oldRun=[action('readiness',100),action('matrix.label',100,'SKIPPED'),action('old required gate',100,'SKIPPED')];
const currentRun=Array.from({length:14},(_,i)=>action(i===0?'readiness':`job ${i}`,101,i<9?'SUCCESS':'', 'Validation',i<9?'COMPLETED':'IN_PROGRESS'));
const otherWorkflows=[action('archive',90,'SKIPPED','Archive'),action('policy',99,'SUCCESS','Policy'),action('finalize',98,'SUCCESS','Finalization')];
const currentChecks={ok:12,bad:0,pending:5,total:17,label:'12/17',state:'pending'};
assert.deepEqual(m.checks([...oldRun,...currentRun,...otherWorkflows]),currentChecks,'Superseded workflow-only jobs must not inflate the GitHub count');
assert.deepEqual(m.checks([...otherWorkflows,...currentRun,...oldRun].reverse()),currentChecks,'Input order does not choose the current workflow run');
assert.equal(m.checks([action('obsolete failure',100,'FAILURE'),action('replacement',101)]).state,'success','A removed old job cannot keep the current workflow red');
assert.equal(m.checks([action('build',101),action('build',100,'FAILURE')]).state,'success');
assert.equal(m.checks([action('build',101,'FAILURE'),action('build',100)]).state,'failure');
assert.equal(m.checks([action('new job',101,'','Validation','QUEUED'),action('old job',100)]).label,'0/1','A queued replacement supersedes the old workflow immediately');
assert.equal(m.checks([action('build',100),action('lint',101,'SUCCESS','Other')]).total,2,'Independent workflows remain visible');
assert.equal(m.checks([action('build',100),{...action('build',101),detailsUrl:'https://github.com/example/other/actions/runs/101/job/1'}]).total,2,'Workflow identity includes the repository');
assert.equal(m.checks([{...action('old',100),detailsUrl:'https://ci.example/1'},{...action('new',101),detailsUrl:'https://ci.example/2'}]).total,2,'Non-Actions checks are not pruned as workflow runs');
assert.equal(m.checks([action('build',100),{__typename:'StatusContext',context:'external',state:'PENDING',createdAt:'2026-11-10T18:06:00Z'}]).label,'1/2');
const rerun=[
  {...action('build',101),startedAt:'2026-11-10T18:00:00Z',completedAt:'2026-11-10T18:10:00Z'},
  {...action('build',101,'','Validation','IN_PROGRESS'),startedAt:'2026-11-10T18:05:00Z',completedAt:'0001-01-01T00:00:00Z'},
];
assert.equal(m.checks(rerun).state,'pending','An in-progress rerun beats an older attempt, despite its sentinel completion time');
assert.equal(m.checks([...rerun].reverse()).state,'pending');

const pr={number:903,title:'fix(ux): align dialogs',url:'https://github.com/timurproko/a1/pull/903',state:'OPEN',isDraft:true,author:{login:'timurproko'},createdAt:'2026-11-10T16:45:10Z',body:'- [x] a\n- [ ] b\n- [ ] c',statusCheckRollup:rollup,reviewDecision:''};
const row=m.pullRow(pr,'timurproko',now);
assert.equal(row.meta,'#903 · timurproko opened 25 minutes ago');
assert.ok(m.PR_FIELDS.split(',').includes('headRefName'));
assert.equal(m.pullRow({...pr,headRefName:'fix/agent-pr'},'x',now).headRefName,'fix/agent-pr');
assert.equal(row.headRefName,null,'Older/missing branch data never selects a PR');
assert.equal(row.owner,true);assert.equal(row.state,'draft');assert.equal(row.tasks.label,'1 of 3 tasks');assert.equal(row.checks.label,'3/3');assert.equal(row.review,null);
assert.equal(m.pullRow({...pr,isDraft:false},'Someone',now).state,'open');
assert.equal(m.pullRow({...pr,isDraft:false},'Someone',now).owner,false);
assert.equal(m.pullRow({...pr,state:'MERGED',mergedAt:'2026-11-10T16:10:10Z'},'x',now).meta,'#903 · timurproko merged 1 hour ago');
assert.equal(m.pullRow({...pr,state:'CLOSED',closedAt:'2026-11-10T17:09:10Z'},'x',now).meta,'#903 · timurproko closed 1 minute ago');
assert.equal(m.pullRow({...pr,reviewDecision:'APPROVED'},'x',now).review,'approved');
assert.equal(m.pullRow({...pr,author:null},'x',now).meta,'#903 · opened 25 minutes ago');

const screen = text => JSON.stringify({how:'screen',complete:true,text});
for (const footer of ['D:/Git/a1/.worktrees/pi (chore/pi-1.5.2) • #906',String.raw`D:\Git\a1\.worktrees\pi (chore/pi-1.5.2) • #906`,'/home/me/repo (fix/a) #906','~/repo (fix/a) #906 • Session']) {
  assert.equal(m.agentPullNumber(screen(`${footer}\n↑67k ↓5.7k $0.302 (sub) 13.1%/500k (auto) • name`)),906);
}
assert.equal(m.agentPullNumber(screen('Implemented #906.\n↑67k 13.1%/500k (auto)')),null,'Conversation PR mentions are not links');
assert.equal(m.agentPullNumber(screen('D:\\Git\\a1\\.worktrees\\m (feature/m…) • #977\n↑687 ↓162k R67M W2.5M CH99.8% $24.694 (sub… • Modal mouse hover  gpt-6.1-sol • high')),977,'A usage row cut off before its context counter is still the footer');
assert.equal(m.agentPullNumber(screen('Implemented #906.\n↑67k ↓5.7k $0.302')),null,'Token counters alone never turn a chat line into a footer');
assert.equal(m.agentPullNumber(screen('D:/repo (develop) • #906\nnot a usage row')),null);
assert.equal(m.agentPullNumber(screen('D:/repo (develop) • #9007199254740992\n13.1%/500k')),null);
assert.equal(m.agentPullNumber(screen('D:/repo (develop) • #906\n13.1%/500k\n'+Array(9).fill('body').join('\n'))),null,'Only the bottom footer is inspected');
assert.equal(m.agentPullNumber(JSON.stringify({how:'history',complete:true,text:'D:/repo (a) • #906\n13.1%/500k'})),null);
assert.equal(m.agentPullNumber('bad json'),null);
assert.equal(m.agentPullNumber(screen('D:/repo (develop)\n13.1%/500k')),null);

const claudeUsage='  Fable 5.2 · 166.0k/200.0k 83% · $4.6684    person@example.com';
const claudeStrip='  ⏵⏵ auto mode on (shift+tab to cycle) · PR #933';
const claudeFooter=`${claudeUsage}\n${claudeStrip}`;
assert.equal(m.agentPullNumber(screen(claudeFooter),'claude-code'),933);
assert.equal(m.agentPullNumber(screen(claudeFooter.replace(/\n/g,'\r\n')+'\r\n\r\n'),'claude-code'),933);
for (const mode of ['accept edits','bypass permissions','plan mode']) {
  assert.equal(m.agentPullNumber(screen(claudeFooter.replace('auto mode',mode)),'claude-code'),933);
}
assert.equal(m.agentPullNumber(screen(claudeFooter),'a1'),null,'Agent footer formats are not interchangeable');
assert.equal(m.agentPullNumber(screen(claudeFooter),'codex'),null);
for (const text of [
  'Implemented PR #933.\n'+claudeUsage,
  claudeStrip,
  'not a usage row\n'+claudeStrip,
  claudeUsage+'\nPlease check PR #933',
  claudeFooter+'\nconversation continues',
  claudeFooter.replace('#933','#9007199254740992'),
  claudeFooter.replace('#933','#0'),
  claudeFooter.replace('#933','#-1'),
]) assert.equal(m.agentPullNumber(screen(text),'claude-code'),null,text);
assert.equal(m.agentPullNumber(JSON.stringify({how:'history',complete:true,text:claudeFooter}),'claude-code'),null);
assert.equal(m.agentPullNumber(JSON.stringify({how:'screen',complete:false,text:claudeFooter}),'claude-code'),null);
assert.equal(m.agentPullNumber('bad json','claude-code'),null);

assert.deepEqual(m.parsePulls(''),[]);assert.deepEqual(m.parsePulls('{}'),[],'A non-list reply shows as empty, never throws into the view');
assert.equal(m.pullError(new Error('cannot start gh: program not found')),'GitHub CLI (gh) is not installed');
assert.equal(m.pullError('', 'To get started with GitHub CLI, please run:  gh auth login'),'Sign in first: gh auth login');
assert.equal(m.pullError('', 'none of the git remotes configured for this repository point to a known GitHub host'),'No GitHub repository');
assert.equal(m.pullError(new Error('boom\nmore')),'boom');
console.log('PASS: gh pull-request facts: args, counts, relative time, tasks, current-workflow checks and reruns, GitHub-style meta line, error reasons');
