// Pull requests for the repo under the panel's folder, read through the GitHub CLI.
// Pure helpers here; main.js owns exec calls and rendering.
export const PR_FIELDS = 'number,title,url,state,isDraft,author,createdAt,mergedAt,closedAt,body,statusCheckRollup,reviewDecision,headRefName,headRefOid,mergeable,labels';
export const PR_PAGE_SIZE = 10;

// The public host exec API has no env option. Scope GH_REPO in one child only;
// gh api does not accept -R, and account wrappers cannot inspect GraphQL bodies.
export const GH_REPOSITORY_ENV = `const {spawnSync}=require('node:child_process');
const [repo,argv,limit]=process.argv.slice(1);
const r=spawnSync('gh',JSON.parse(argv),{env:{...process.env,GH_REPO:repo},encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:Number(limit)});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
if(r.error)process.stderr.write(r.error.code==='ETIMEDOUT'?'GitHub command timed out':String(r.error.message));
process.exitCode=r.status??1;`;
export function repositoryRead(exec, args, repository, options = {}) {
  if(args[0]!=='api')return exec('gh',args,options);
  if(typeof repository!=='string' || repository.trim()!==repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.split('/').some(p=>p==='.'||p==='..'))throw Error('Invalid GitHub repository');
  return exec('node',['-e',GH_REPOSITORY_ENV,repository,JSON.stringify(args),String(Math.max(1,Math.min(options.timeout??30000,30000)-1000))],options);
}

// Diagnose with the same repository routing and inherited credential, not the
// globally active gh login. Only a validated public login leaves the child.
export async function repositoryFailure(exec, result, repository, options = {}, diagnostics = null) {
  const failure=pullFailure(result);
  if(!repository)return failure;
  // GitHub's missing-resource response is not evidence of an account problem.
  if(failure.kind==='notfound')return {...failure,repository,message:`${repository} not found`};
  if(!['access','auth'].includes(failure.kind))return failure;
  const key=JSON.stringify([repository,options.on??null,options.cwd??null]);
  let identity=diagnostics?.get(key);
  if(!identity) {
    identity=(async()=>{
      try {
        const result=await repositoryRead(exec,['api','user','--jq','.login'],repository,{...options,timeout:5000});
        const login=result.stdout?.trim();
        if(result.code===0 && !result.signal && !result.timed_out && !result.timedOut && /^[a-z\d][a-z\d-]{0,38}(?:\[bot\])?$/i.test(login??''))return login;
      } catch {} // Unknown identity never permits a login switch.
      return null;
    })();
    diagnostics?.set(key,identity);
  }
  const account=await identity;
  return {...failure,repository,account,message:`${repository} not accessible with the GitHub account ${account??'(unknown)'}${failure.kind==='auth'?'; sign in with gh auth login':''}`};
}

// Single publication rule for every PR-read path. Queue ownership determines
// read order; epochs invalidate old contexts, and generations prevent late
// replies from replacing a newer published PR. No read path bypasses this gate.
export class PullFactsOrder {
  constructor() {this.epoch=0;this.generation=0;this.published=new Map();}
  reset() {this.epoch++;this.published.clear();}
  begin() {return {epoch:this.epoch,generation:++this.generation};}
  publish(read,key,update) {
    if(read.epoch!==this.epoch)return {accepted:false,value:null};
    const previous=this.published.get(key);
    if(previous && previous.generation>read.generation)return {accepted:false,value:previous.value};
    const value=update(previous?.value);
    this.published.set(key,{generation:read.generation,value});
    return {accepted:true,value};
  }
}

// One-shot state/check safety reads share the panel queue. Enrollment accelerates
// via events, but cannot guarantee delivery: shown open rows still get a repair.
export const CHECKS_INTERVAL = 45000;
export const STATE_SAFETY_INTERVAL = 120000;
export const needsChecks = pr => Boolean(pr && (pr.checks?.pending > 0 || (!pr.checks && pr.checksKnown !== true)));
export class ChecksFallback {
  constructor({snapshot,read,now=()=>Date.now()}) {this.snapshot=snapshot;this.read=read;this.now=now;this.jobs=new Map();this.cooldowns=new Map();}
  stop() {this.jobs.clear();this.wakeup=null;}
  eligible() {
    const state=this.snapshot();
    return state?.enabled ? {...state,repositories:state.repositories.map(repo=>({...repo,interval:repo.uncovered?CHECKS_INTERVAL:STATE_SAFETY_INTERVAL,
      rows:repo.rows.filter(pr=>['open','draft'].includes(pr?.state) || (repo.uncovered && needsChecks(pr)))})).filter(repo=>repo.rows.length)} : null;
  }
  sync(cx) {
    const state=this.eligible();
    if(!state) {this.stop();return;}
    for(const [name,until]of this.cooldowns)if(until<=this.now())this.cooldowns.delete(name);
    const wanted=new Set(state.repositories.map(repo=>repo.name));
    for(const [name,job] of this.jobs)if(job.scope!==state.scope || !wanted.has(name))this.jobs.delete(name);
    for(const repo of state.repositories) {
      const job=this.jobs.get(repo.name);
      if(!job)this.jobs.set(repo.name,{scope:state.scope,interval:repo.interval,due:Math.max(this.now()+repo.interval,this.cooldowns.get(repo.name)??0),failures:0});
      else if(job.interval!==repo.interval) {job.interval=repo.interval;if(!job.running && !job.failures)job.due=Math.max(this.now()+repo.interval,this.cooldowns.get(repo.name)??0);}
    }
    this.arm(cx);
  }
  arm(cx) {
    const due=Math.min(Infinity,...[...this.jobs.values()].filter(j=>!j.running).map(j=>Math.max(j.due,this.cooldownUntil??0)));
    if(!Number.isFinite(due) || (this.wakeup && this.wakeup.due<=due))return;
    const wakeup=this.wakeup={due};
    cx.timer?.after(Math.max(0,due-this.now()),view=>{
      if(this.wakeup!==wakeup)return;
      this.wakeup=null;
      view.spawn(async view=>{await Promise.resolve();await this.run(view);});
    });
  }
  async run(cx) {
    const state=this.eligible();if(!state) {this.stop();return;}
    if(this.now()<(this.cooldownUntil??0)) {this.arm(cx);return;}
    for(const repo of state.repositories) {
      const job=this.jobs.get(repo.name);
      if(!job || job.running || job.due>this.now())continue;
      const current=()=>this.jobs.get(repo.name)===job && this.eligible()?.scope===job.scope
        && this.eligible()?.repositories.some(r=>r.name===repo.name && r.rows.length);
      if(!current())continue;
      job.running=true;
      let result;
      try {result=await this.read(repo,cx,current);}catch {result={failed:true};}
      if(this.jobs.get(repo.name)!==job)continue;
      job.running=false;
      if(result?.busy)job.due=this.now()+1000;
      else if(result?.failed) {
        job.failures++;
        job.due=this.now()+Math.max(result.rateLimited?900000:0,result.retryAfter??0,Math.min(720000,CHECKS_INTERVAL*2**Math.min(job.failures,4)));
        if(result.rateLimited || result.retryAfter)this.cooldowns.set(repo.name,job.due);
        // Repositories in this panel share the machine's account. A secondary
        // refusal must not immediately fan out into the next repository.
        if(result.rateLimited) {this.cooldownUntil=job.due;break;}
      } else {job.failures=0;job.due=this.now()+job.interval;}
    }
    this.sync(cx);
  }
}

// One repository batch for shown open rows (or uncovered pending checks).
// State and checks travel together; unrelated tasks/labels/reviews stay intact.
// Keep each query comfortably below Windows' 32K argv ceiling, including
// quoting/remote wrappers. A repository job holds its lease across all chunks.
export const CHECKS_BATCH_SIZE = 20;
export const STATE_BATCH_SIZE = 40;
const summaryState=value=>value==null?null:['SUCCESS'].includes(value)?'success':['FAILURE','ERROR'].includes(value)?'failure':['PENDING','EXPECTED'].includes(value)?'pending':undefined;
// gh --include exposes Retry-After on failures; pure JSON remains useful in fixtures.
export function pullPayload(stdout) {
  const text=String(stdout??'');
  return /^HTTP\//i.test(text)?text.slice(text.search(/\r?\n\r?\n/)).trim():text;
}
export function pullRetryAfter(result,now=Date.now()) {
  const header=result?.headers?.['retry-after']??result?.headers?.['Retry-After']??/^retry-after:\s*([^\r\n]+)/im.exec(`${result?.stdout??''}\n${result?.stderr??''}`)?.[1];
  if(header==null)return 0;
  const seconds=Number(header);
  return Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(header)-now)||0;
}
export function pullStateArgs(numbers,nameWithOwner,includeCounts=false) {
  const [owner,name]=nameWithOwner.split('/');
  if(!numbers.length || numbers.length>STATE_BATCH_SIZE || numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Invalid or oversized state batch');
  const fields=numbers.map(n=>`pr${n}:pullRequest(number:${n}){number state isDraft mergedAt closedAt headRefOid commits(last:1){nodes{commit{statusCheckRollup{state}}}}}`).join(' ');
  return ['api','graphql','--include','-f',`query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${fields}${includeCounts?' open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}':''}}}`,'-F',`owner=${owner}`,'-F',`name=${name}`];
}
export function parsePullStates(stdout,numbers) {
  const data=JSON.parse(pullPayload(stdout));
  if(data.errors?.length)throw Error(data.errors.map(e=>[e.type,e.message].filter(Boolean).join(': ')).join('; '));
  return new Map(numbers.map(number=>{
    const pr=data.data?.repository?.[`pr${number}`],rollup=pr?.commits?.nodes?.[0]?.commit?.statusCheckRollup;
    const checkSummary=summaryState(rollup?.state);
    if(pr?.number!==number || !Array.isArray(pr.commits?.nodes) || !['OPEN','CLOSED','MERGED'].includes(pr.state) || typeof pr.isDraft!=='boolean' || checkSummary===undefined || (rollup && !rollup.state))throw Error('Incomplete PR state/summary response');
    return [number,{...pr,checkSummary}];
  }));
}
export function pendingChecksArgs(numbers, nameWithOwner, includeCounts = false) {
  const [owner,name]=nameWithOwner.split('/');
  if(!numbers.length || numbers.length>CHECKS_BATCH_SIZE || numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Invalid or oversized checks batch');
  const fields=numbers.map(n=>`pr${n}:pullRequest(number:${n}){number state isDraft headRefOid commits(last:1){nodes{commit{statusCheckRollup{contexts(first:100){pageInfo{hasNextPage} nodes{... on CheckRun{name status conclusion startedAt completedAt detailsUrl checkSuite{workflowRun{workflow{name}}}} ... on StatusContext{context state createdAt}}}}}}}}`).join(' ');
  return ['api','graphql','--include','-f',`query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${fields}${includeCounts?' open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}':''}}}`,'-F',`owner=${owner}`,'-F',`name=${name}`];
}
export function parsePendingChecks(stdout,numbers) {
  const data=JSON.parse(pullPayload(stdout));
  if(data.errors?.length)throw Error(data.errors.map(e=>[e.type,e.message].filter(Boolean).join(': ')).join('; '));
  return new Map(numbers.map(number=>{
    const pr=data.data?.repository?.[`pr${number}`];
    if(pr?.number!==number || !Array.isArray(pr.commits?.nodes) || !['OPEN','CLOSED','MERGED'].includes(pr.state) || typeof pr.isDraft!=='boolean')throw Error('Incomplete checks/state response');
    const rollup=pr.commits.nodes[0]?.commit?.statusCheckRollup;
    if(rollup?.contexts?.pageInfo?.hasNextPage)throw Error('Incomplete checks contexts');
    const contexts=rollup?.contexts?.nodes??[];
    return [number,{...pr,checks:checks(contexts.map(c=>({...c,workflowName:c.checkSuite?.workflowRun?.workflow?.name??null})))}];
  }));
}

export function pullListArgs(state, nameWithOwner, after = null) {
  const [owner, name] = String(nameWithOwner).split('/');
  const states = state === 'closed' ? '[CLOSED,MERGED]' : '[OPEN]';
  const query = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount} pullRequests(first:${PR_PAGE_SIZE},after:$after,states:${states},orderBy:{field:CREATED_AT,direction:DESC}){totalCount pageInfo{hasNextPage endCursor} nodes{number title url state isDraft author{login} createdAt mergedAt closedAt body reviewDecision headRefName headRefOid mergeable labels(first:100){nodes{name color}} commits(last:1){nodes{commit{statusCheckRollup{state contexts(first:100){nodes{... on CheckRun{name status conclusion startedAt completedAt detailsUrl checkSuite{workflowRun{workflow{name}}}} ... on StatusContext{context state createdAt}}}}}}}}}}}`;
  return ['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`,
    ...(after ? ['-f', `after=${after}`] : [])];
}

export function parsePullPage(stdout) {
  const result = JSON.parse(stdout || '{}');
  if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
  const repo=result.data?.repository, page=repo?.pullRequests;
  if (!Array.isArray(page?.nodes)) throw new Error('Cannot load pull requests');
  const pulls = page.nodes.map(pr => ({...pr,
    checkSummary:summaryState(pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state),
    statusCheckRollup: pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes?.map(check => ({...check,
      workflowName:check.checkSuite?.workflowRun?.workflow?.name ?? null,
    })) ?? [],
  }));
  const cursor = page.pageInfo?.endCursor ?? null;
  if (page.pageInfo?.hasNextPage && !cursor) throw new Error('Missing pull-request page cursor');
  const counts=Number.isSafeInteger(repo.open?.totalCount) && Number.isSafeInteger(repo.closed?.totalCount)
    ? {open:repo.open.totalCount,closed:repo.closed.totalCount} : null;
  return {pulls, cursor, hasMore:Boolean(page.pageInfo?.hasNextPage), total:page.totalCount ?? null,counts};
}
export const REPO_ARGS = ['repo', 'view', '--json', 'nameWithOwner,owner,url'];
export function countArgs(nameWithOwner) {
  const [owner, name] = String(nameWithOwner).split('/');
  const query = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}}}`;
  return ['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`];
}
export function parseCounts(stdout) {
  try {
    const repo = JSON.parse(stdout)?.data?.repository;
    if (!repo) return null;
    return { open: repo.open?.totalCount ?? null, closed: repo.closed?.totalCount ?? null };
  } catch { return null; }
}

// "25 minutes ago", as GitHub writes it.
export function ago(iso, now = Date.now()) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const s = Math.max(0, (now - at) / 1000);
  const units = [[60, 1, 'second'], [3600, 60, 'minute'], [86400, 3600, 'hour'], [2592000, 86400, 'day'], [31536000, 2592000, 'month'], [Infinity, 31536000, 'year']];
  for (const [limit, size, name] of units) {
    if (s < limit) { const n = Math.max(1, Math.floor(s / size)); return `${n} ${name}${n === 1 ? '' : 's'} ago`; }
  }
  return '';
}

// GitHub-style body checklist: "3 tasks", "1 of 3 tasks", "3 tasks done".
export function tasks(body) {
  const text = String(body ?? '');
  const done = (text.match(/^\s*(?:[-*+]|\d+[.)])\s+\[[xX]\]/gm) ?? []).length;
  const open = (text.match(/^\s*(?:[-*+]|\d+[.)])\s+\[ \]/gm) ?? []).length;
  const total = done + open;
  const count = `${total} task${total === 1 ? '' : 's'}`;
  return total ? { done, total, label: done === 0 ? count : done === total ? `${count} done` : `${done} of ${total} tasks` } : null;
}

// gh includes checks from superseded workflow runs on the same commit. A job
// absent from the newest run must not survive just because its name is unique.
// The Actions run ID in detailsUrl identifies the run (including rerun attempts).
function workflowRun(check) {
  if (!check.workflowName) return null;
  const match = /^https:\/\/([^/]+\/[^/]+\/[^/]+)\/actions\/runs\/(\d+)(?:[/?#]|$)/.exec(check.detailsUrl ?? '');
  if (!match) return null;
  const id = Number(match[2]);
  return Number.isSafeInteger(id) ? { key: `${match[1]}/${check.workflowName}`, id } : null;
}

// Latest workflow run, then latest run per check name: "14/14" and a state.
export function checks(rollup) {
  if (!Array.isArray(rollup) || !rollup.length) return null;
  const workflows = new Map();
  for (const c of rollup) {
    const run = workflowRun(c);
    if (run) workflows.set(run.key, Math.max(workflows.get(run.key) ?? 0, run.id));
  }
  const latest = new Map();
  for (const c of rollup) {
    const run = workflowRun(c);
    if (run && run.id !== workflows.get(run.key)) continue;
    const key = `${run?.key ?? c.workflowName ?? ''}/${c.name ?? c.context ?? ''}`;
    // Running checks can have a non-null year-0001 completion timestamp. Prefer
    // their start time; an older attempt finishing later must not win either.
    const at = Date.parse(c.startedAt ?? c.createdAt ?? '') || Date.parse(c.completedAt ?? '') || 0;
    const prev = latest.get(key);
    if (!prev || at >= prev.at) latest.set(key, { ...c, at });
  }
  let ok = 0, bad = 0, pending = 0;
  const details=[];
  for (const c of latest.values()) {
    const name=c.name??c.context;
    const detail=state=>{if(typeof name==='string'&&name.trim())details.push(`${state}: ${c.workflowName?`${c.workflowName} / `:''}${name}`);};
    const conclusion = String(c.conclusion ?? c.state ?? '').toUpperCase();
    if (c.status && c.status !== 'COMPLETED') {pending++;detail('Pending');}
    else if (['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(conclusion)) ok++;
    else if (['', 'PENDING', 'EXPECTED', 'QUEUED', 'IN_PROGRESS', 'WAITING'].includes(conclusion)) {pending++;detail('Pending');}
    else {bad++;detail('Failed');}
  }
  const total = ok + bad + pending;
  return { ok, bad, pending, total, label: `${ok}/${total}`, state: bad ? 'failure' : pending ? 'pending' : 'success', ...(details.length?{details:details.sort()}:{}) };
}

// GraphQL connections and gh pr view's arrays share one safe label shape.
export function pullLabels(value) {
  const labels = Array.isArray(value) ? value : value?.nodes;
  if (!Array.isArray(labels)) return [];
  return labels.filter(label => typeof label?.name === 'string' && label.name.length > 0)
    .map(label => ({name: label.name, color: /^[a-f\d]{6}$/i.test(label.color ?? '') ? `#${label.color}` : null}));
}

// One row's facts from a gh JSON entry. `owner` is the repo owner's login.
export function pullRow(pr, owner, now = Date.now()) {
  const login = pr.author?.login ?? '',checkFacts=checks(pr.statusCheckRollup);
  const state = pr.state === 'MERGED' ? 'merged' : pr.state === 'CLOSED' ? 'closed' : pr.isDraft ? 'draft' : 'open';
  const when = state === 'merged' ? `merged ${ago(pr.mergedAt ?? pr.closedAt, now)}`
    : state === 'closed' ? `closed ${ago(pr.closedAt, now)}` : `opened ${ago(pr.createdAt, now)}`;
  return {
    number: pr.number, title: pr.title ?? '', url: pr.url, state, login,
    createdAt:pr.createdAt??null,mergedAt:pr.mergedAt??null,closedAt:pr.closedAt??null,
    headRefName: pr.headRefName ?? null, headRefOid: pr.headRefOid ?? null,
    mergeConflict: ['open','draft'].includes(state) && pr.mergeable === 'CONFLICTING',
    meta: `#${pr.number} · ${login ? `${login} ` : ''}${when}`,
    byline: `${login ? `${login} ` : ''}${when}`, when,
    compactWhen: when.replace(/^(?:opened|closed|merged) /, '').replace(/ (second|minute|hour|day|month|year)s? ago$/, (_m, unit) => `${({second:'s',minute:'m',hour:'h',day:'d',month:'mo',year:'y'})[unit]} ago`),
    checksKnown: Array.isArray(pr.statusCheckRollup),
    owner: Boolean(owner && login && login.toLowerCase() === String(owner).toLowerCase()),
    tasks: tasks(pr.body), checks: checkFacts, checkSummary:pr.checkSummary??checkFacts?.state??null, labels: pullLabels(pr.labels),
    review: pr.reviewDecision === 'APPROVED' ? 'approved' : pr.reviewDecision === 'CHANGES_REQUESTED' ? 'changes' : null,
  };
}

// Apply the deliberately narrow safety read without erasing labels/tasks/review.
export function refreshPullFacts(pr, value) {
  const {state,meta,byline,when,compactWhen,mergeConflict,headRefName,headRefOid,createdAt,mergedAt,closedAt}=pullRow({...value,createdAt:pr.createdAt,headRefName:pr.headRefName,mergeable:pr.mergeConflict?'CONFLICTING':null,author:{login:pr.login}});
  return {...pr,state,meta,byline,when,compactWhen,mergeConflict,headRefName,headRefOid,createdAt,mergedAt,closedAt,checks:value.checks,checkSummary:value.checkSummary,checksKnown:true};
}

// Session-owned PR badges can differ from the parent shell's branch.
// Inspect only the current bottom footer, paired with the usage row; never
// match arbitrary PR mentions in conversation/history. No terminal input.
export {agentPullNumber} from './plugins/git/ci-footer.js';

export function parsePulls(stdout) {
  const list = JSON.parse(stdout || '[]');
  return Array.isArray(list) ? list : [];
}

// Keep command/response facts until classification; an empty abnormal exit is
// not evidence that GitHub is down. The string wrapper also serves folder Git.
export function pullFailure(e, stderr = '') {
  // Already classified at the repository boundary; don't erase its identity
  // when the controller applies its ordinary error presentation.
  if(e?.repository && ['access','auth','notfound'].includes(e.kind) && typeof e.message==='string')return e;
  const detail = String(stderr || e?.stderr || e?.message || (typeof e === 'string' ? e : '')).trim();
  const text = `${e?.code ?? ''} ${detail}`;
  const failure = (kind, message) => ({kind, message});
  const transient = () => failure('transient', 'Could not read pull requests; refresh to retry');
  if (/program not found|not recognized|No such file|\bENOENT\b/i.test(text)) return failure('cli', 'GitHub CLI (gh) is not installed');
  // Windows NTSTATUS (signed or unsigned), signals and start/exec failures are
  // local execution failures even if stderr happens to mention the network.
  const code = Number(e?.code);
  if (e?.signal || (Number.isInteger(code) && (code < 0 || code >= 0x80000000)) ||
      /cannot start gh|failed to (?:start|spawn|execute)|spawn.*(?:EAGAIN|ENOMEM|EPERM)|process init|0xc0000142|3221225794|\bEAGAIN\b|\bENOMEM\b|resource temporarily unavailable|insufficient system resources/i.test(text)) return transient();
  if (e?.timed_out || e?.timedOut || /execution timed out|command timed out|process timed out/i.test(text)) return transient();
  if (/rate limit|HTTP 429|secondary rate/i.test(text)) return failure('rate', 'Could not read pull requests: GitHub rate limit exceeded');
  if (/auth login|not logged in|authentication|HTTP 401|bad credentials/i.test(text)) return failure('auth', 'Sign in first: gh auth login');
  if (/no git remotes|could not determine|none of the git remotes|not a git repository|no remotes/i.test(text)) return failure('repository', 'No GitHub repository');
  // Explicit refusals/connectivity errors win even if stderr also quotes a
  // missing-resource message. Such failures must never enter a negative cache.
  if (/HTTP 403|not accessible|resource not accessible|permission denied/i.test(text)) return failure('access', 'Repository or pull request is not accessible with the GitHub account');
  if (/could not resolve host|no such host|\bENOTFOUND\b|\bEAI_AGAIN\b|network is unreachable|network is down|connection refused|connection reset|failed to connect|TLS handshake timeout|dial tcp.*(?:timeout|timed out)|connect(?:ion)?[^\n]*timed out/i.test(text)) return failure('unreachable', 'GitHub is unreachable');
  if (/HTTP 5\d\d/i.test(text)) return failure('response', 'Could not read pull requests: GitHub returned an error');
  if (/could not resolve to|could not resolve (?:repository|pull request)|HTTP 404|\bnot found\b/i.test(text)) return failure('notfound', 'Repository or pull request not found');
  if (/HTTP [45]\d\d|GraphQL:/i.test(text)) return failure('response', 'Could not read pull requests: GitHub returned an error');
  if (/timeout|timed out/i.test(text) || (e && typeof e === 'object' && 'code' in e && !detail)) return transient();
  if (e instanceof SyntaxError) return failure('response', 'Could not read pull requests: invalid GitHub response');
  return failure('read', detail.split('\n')[0].slice(0,240) || 'Cannot load pull requests');
}
export function pullError(e, stderr = '') { return pullFailure(e, stderr).message; }
