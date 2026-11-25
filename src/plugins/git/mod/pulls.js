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
// Session memory only: never publish credentials, PR inventories or promises to
// persisted shared state. Both ordinary and coordinator readers use this boundary.
const readers = new WeakMap();
export const quietRead = error => error?.quiet === true;
export function retryRead(owner, cx, error, run) {
  if(!quietRead(error))return false;
  const due=error.retryAt??Date.now()+900000;
  if(owner.readWake && owner.readWake.due<=due)return true;
  const wake=owner.readWake={due};
  cx.timer?.after(Math.max(1,due-Date.now()),view=>{
    if(owner.readWake!==wake)return;
    owner.readWake=null;run(view);view.notify();
  });
  return true;
}
export class GitReads {
  constructor({now=()=>Date.now(),log=line=>console.log(line)}={}) {this.now=now;this.log=log;this.routes=new Map();this.pending=new Map();this.tails=new Map();this.facts=new Map();this.targets=new Map();this.lists=new Map();this.generation=0;this.versions=new Map();}
  route(options={}) {return JSON.stringify([options.on??null,options.credentialScope??null]);}
  state(options) {const key=options?.on??'';if(!this.routes.has(key))this.routes.set(key,{until:0,episode:false});return this.routes.get(key);}
  refusal(result,repository,options={}) {
    const state=this.state(options);state.version=(state.version??0)+1;state.until=Math.max(state.until??0,this.now()+Math.max(900000,pullRetryAfter(result,this.now())));
    if(!state.episode) {state.episode=true;try{this.log(`[custom-changes] GitHub rate refusal; reads paused (${repository??'repository lookup'})`);}catch {}}
    return Object.assign(new Error('GitHub read deferred'),{kind:'rate',quiet:true,retryAt:state.until});
  }
  async read(key,repository,options,run) {
    if(options.current && !options.current())throw Object.assign(new Error('Obsolete GitHub read'),{quiet:true,retryAt:this.now()+10000});
    const state=this.state(options),id=JSON.stringify([this.route(options),repository?.toLowerCase()??[options.cwd??'',++this.generation],key,...(options.fresh?[++this.generation]:[])]);
    const bypass=options.manual?.remaining>0 && (options.manual.expires==null || options.manual.expires>=this.now());
    if(bypass)options.manual.remaining--; // An earlier healthy click is not a future bypass credit.
    if(this.pending.has(id)) {
      const job=this.pending.get(id);job.consumers.push(options.current??(()=>true));return job;
    }
    const consumers=[options.current??(()=>true)],current=()=>consumers.some(consumer=>consumer());
    if(state.until>this.now() && !bypass)throw Object.assign(new Error('GitHub read deferred'),{kind:'rate',quiet:true,retryAt:state.until});
    const scope=repository?JSON.stringify([this.route(options),repository.toLowerCase()]):null,previous=scope?this.tails.get(scope):null;
    const job=(async()=>{
      if(previous)await previous.catch(()=>{});
      if(state.until>this.now() && !bypass)throw Object.assign(new Error('GitHub read deferred'),{kind:'rate',quiet:true,retryAt:state.until});
      if(!current())throw Object.assign(new Error('Obsolete GitHub read'),{quiet:true,retryAt:this.now()+10000});
      const admitted=state.version??0;let result;
      try{result=await run();}catch(error){if(rateRefusal(error))throw this.refusal(error,repository,options);throw error;}
      if(rateRefusal(result))throw this.refusal(result,repository,options);
      if((state.version??0)===admitted && result?.code===0 && !result.signal && !result.timed_out && !result.timedOut) {state.until=0;state.episode=false;}
      return result;
    })();
    job.consumers=consumers;this.pending.set(id,job);if(scope)this.tails.set(scope,job);
    try{return await job;}finally{if(this.pending.get(id)===job)this.pending.delete(id);if(scope && this.tails.get(scope)===job)this.tails.delete(scope);}
  }
}
export function gitReads(exec) {if(!readers.has(exec))readers.set(exec,new GitReads());return readers.get(exec);}
export function rateRefusal(result) {
  if(result?.name==='SyntaxError')return false;
  const code=Number(result?.code);
  if(result?.signal || result?.timed_out || result?.timedOut || code<0 || code>=0x80000000
      || /^(?:ENOTFOUND|EAI_AGAIN|ECONN\w*|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EPIPE|ENOENT|EAGAIN|ENOMEM|EPERM|EACCES)$/i.test(String(result?.code??'')))return false;
  if(result?.kind==='rate' || result?.rateLimited===true)return true;
  let payload;try{payload=JSON.parse(pullPayload(result?.stdout));}catch {}
  if(payload?.rateLimited===true)return true;
  const responseMessage=(Number(result?.code)!==0 || /^HTTP[^\n]*\b[45]\d\d\b/im.test(result?.stdout??''))?payload?.message:null;
  const text=[result?.stderr,result?.message,responseMessage,...(payload?.errors??[]).map(e=>`${e.type??''} ${e.message??''}`)].filter(Boolean).join('\n');
  if(/^HTTP[^\n]*\b401\b/im.test(result?.stdout??'') || /auth login|not logged in|bad credentials|HTTP 401|permission denied|resource not accessible|timed? out|timeout|could not resolve host|network is unreachable|cannot start|failed to (?:start|spawn|execute)|\bEAGAIN\b|\bENOMEM\b|process init/i.test(text))return false;
  return /\b(?:API|GitHub|secondary|primary) rate[ -]limit\b|\brate[ -]limit (?:already |has been |is )?(?:exceeded|reached|exhausted)\b|\bRATE_LIMITED\b|\bHTTP 429\b|abuse detection mechanism/i.test(text)
    || /^HTTP[^\n]*\b429\b/im.test(result?.stdout??'');
}
export function repositoryRead(exec, args, repository, options = {}) {
  if(args[0]==='api' && (typeof repository!=='string' || repository.trim()!==repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.split('/').some(p=>p==='.'||p==='..')))throw Error('Invalid GitHub repository');
  const {current,manual,credentialScope,skipList,generation,fresh,...native}=options;
  return gitReads(exec).read(args,repository,options,()=>{
    if(args[0]!=='api')return exec('gh',args,native);
    return exec('node',['-e',GH_REPOSITORY_ENV,repository,JSON.stringify(args),String(Math.max(1,Math.min(native.timeout??30000,30000)-1000))],native);
  });
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
export const CHECKS_CONFIRMATION_LIMIT = 90000;
export const needsChecks = pr => Boolean(pr && (pr.checkSummary==='pending' || pr.checks?.pending > 0 || (!pr.checks && pr.checksKnown !== true)));
export const overdueChecks = (pr,now=Date.now()) => needsChecks(pr) && (!Number.isFinite(pr.checksReadAt) || now-pr.checksReadAt>CHECKS_CONFIRMATION_LIMIT);
export class ChecksFallback {
  constructor({snapshot,read,now=()=>Date.now()}) {this.snapshot=snapshot;this.read=read;this.now=now;this.jobs=new Map();this.cooldowns=new Map();}
  stop() {this.jobs.clear();this.wakeup=null;}
  eligible() {
    const state=this.snapshot();
    return state?.enabled ? {...state,repositories:state.repositories.map(repo=>{
      const rows=repo.rows.filter(pr=>['open','draft'].includes(pr?.state));
      return {...repo,rows,interval:repo.uncovered || rows.some(needsChecks)?CHECKS_INTERVAL:STATE_SAFETY_INTERVAL,
        fresh:rows.some(pr=>overdueChecks(pr,this.now()))};
    }).filter(repo=>repo.rows.length)} : null;
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
        // A shared cooldown's last few seconds are not a new rate refusal.
        // The read gate owns its absolute expiry and fifteen-minute floor.
        job.due=result.rateLimited && Number.isFinite(result.retryAt) ? Math.max(this.now()+1,result.retryAt)
          : this.now()+Math.max(result.rateLimited?900000:0,result.retryAfter??0,Math.min(720000,CHECKS_INTERVAL*2**Math.min(job.failures,4)));
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
  if(Number.isFinite(result?.retryAfter))return Math.max(0,result.retryAfter);
  try{const value=JSON.parse(result?.stdout);if(value?.rateLimited && Number.isFinite(value.retryAfter))return Math.max(0,value.retryAfter);}catch {}
  const header=result?.headers?.['retry-after']??result?.headers?.['Retry-After']??/^retry-after:\s*([^\r\n]+)/im.exec(`${result?.stdout??''}\n${result?.stderr??''}`)?.[1];
  if(header==null)return 0;
  const seconds=Number(header);
  return Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(header)-now)||0;
}
// Keep context shape/counting identical on probes and full-detail refreshes.
const CHECK_CONTEXT_FIELDS='contexts(first:100){pageInfo{hasNextPage} nodes{... on CheckRun{name status conclusion startedAt completedAt detailsUrl checkSuite{workflowRun{workflow{name}}}} ... on StatusContext{context state createdAt}}}';
function contextChecks(rollup) {
  if(rollup?.contexts?.pageInfo?.hasNextPage)throw Error('Incomplete checks contexts');
  if(rollup && !Array.isArray(rollup.contexts?.nodes))throw Error('Incomplete checks contexts');
  return checks((rollup?.contexts?.nodes??[]).map(c=>({...c,workflowName:c.checkSuite?.workflowRun?.workflow?.name??null})));
}
export function stateBatches(rows) {
  const batches=[];let batch=[],detailed=0;
  for(const row of rows) {
    const detail=needsChecks(row);
    if(batch.length===STATE_BATCH_SIZE || (detail && detailed===CHECKS_BATCH_SIZE)) {batches.push(batch);batch=[];detailed=0;}
    batch.push(row);if(detail)detailed++;
  }
  if(batch.length)batches.push(batch);
  return batches;
}
export function pullStateArgs(numbers,nameWithOwner,includeCounts=false,detailed=[]) {
  const [owner,name]=nameWithOwner.split('/');
  if(!numbers.length || numbers.length>STATE_BATCH_SIZE || numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Invalid or oversized state batch');
  if(detailed.length>CHECKS_BATCH_SIZE || detailed.some(n=>!numbers.includes(n)))throw Error('Invalid or oversized detailed state batch');
  const fields=numbers.map(n=>`pr${n}:pullRequest(number:${n}){number state isDraft mergedAt closedAt headRefOid commits(last:1){nodes{commit{statusCheckRollup{state${detailed.includes(n)?` ${CHECK_CONTEXT_FIELDS}`:''}}}}}}`).join(' ');
  return ['api','graphql','--include','-f',`query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${fields}${includeCounts?' open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}':''}}}`,'-F',`owner=${owner}`,'-F',`name=${name}`];
}
export function parsePullStates(stdout,numbers,detailed=[]) {
  const data=JSON.parse(pullPayload(stdout));
  if(data.errors?.length)throw Error(data.errors.map(e=>[e.type,e.message].filter(Boolean).join(': ')).join('; '));
  return new Map(numbers.map(number=>{
    const pr=data.data?.repository?.[`pr${number}`],rollup=pr?.commits?.nodes?.[0]?.commit?.statusCheckRollup;
    const checkSummary=summaryState(rollup?.state);
    if(pr?.number!==number || !Array.isArray(pr.commits?.nodes) || !['OPEN','CLOSED','MERGED'].includes(pr.state) || typeof pr.isDraft!=='boolean' || checkSummary===undefined || (rollup && !rollup.state))throw Error('Incomplete PR state/summary response');
    return [number,{...pr,checkSummary,...(detailed.includes(number)?{checks:contextChecks(rollup),checksReadAt:Date.now()}:rollup==null?{checks:null,checksReadAt:Date.now()}:{})}];
  }));
}
export function pendingChecksArgs(numbers, nameWithOwner, includeCounts = false) {
  const [owner,name]=nameWithOwner.split('/');
  if(!numbers.length || numbers.length>CHECKS_BATCH_SIZE || numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Invalid or oversized checks batch');
  const fields=numbers.map(n=>`pr${n}:pullRequest(number:${n}){number state isDraft headRefOid commits(last:1){nodes{commit{statusCheckRollup{${CHECK_CONTEXT_FIELDS}}}}}}`).join(' ');
  return ['api','graphql','--include','-f',`query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${fields}${includeCounts?' open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}':''}}}`,'-F',`owner=${owner}`,'-F',`name=${name}`];
}
export function parsePendingChecks(stdout,numbers) {
  const data=JSON.parse(pullPayload(stdout));
  if(data.errors?.length)throw Error(data.errors.map(e=>[e.type,e.message].filter(Boolean).join(': ')).join('; '));
  return new Map(numbers.map(number=>{
    const pr=data.data?.repository?.[`pr${number}`];
    if(pr?.number!==number || !Array.isArray(pr.commits?.nodes) || !['OPEN','CLOSED','MERGED'].includes(pr.state) || typeof pr.isDraft!=='boolean')throw Error('Incomplete checks/state response');
    const rollup=pr.commits.nodes[0]?.commit?.statusCheckRollup;
    return [number,{...pr,checks:contextChecks(rollup),checksReadAt:Date.now()}];
  }));
}

export function pullListArgs(state, nameWithOwner, after = null) {
  const [owner, name] = String(nameWithOwner).split('/');
  const states = state === 'closed' ? '[CLOSED,MERGED]' : '[OPEN]';
  let query = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount} pullRequests(first:${PR_PAGE_SIZE},after:$after,states:${states},orderBy:{field:CREATED_AT,direction:DESC}){totalCount pageInfo{hasNextPage endCursor} nodes{number title url state isDraft author{login} createdAt mergedAt closedAt body reviewDecision headRefName headRefOid mergeable labels(first:100){nodes{name color}} commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}`;
  if(state==='closed')query=query.replace(/nodes\{number title[\s\S]*$/, 'nodes{number}}}}');
  return ['api', 'graphql', '--include', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`,
    ...(after ? ['-f', `after=${after}`] : [])];
}

export function parsePullPage(stdout) {
  const result = JSON.parse(pullPayload(stdout) || '{}');
  if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
  const repo=result.data?.repository, page=repo?.pullRequests;
  if (!Array.isArray(page?.nodes)) throw new Error('Cannot load pull requests');
  const pulls = page.nodes.map(pr => ({...pr,
    checkSummary:summaryState(pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state),
    statusCheckRollup: pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes?.map(check => ({...check,
      workflowName:check.checkSuite?.workflowRun?.workflow?.name ?? null,
    })),
  }));
  const cursor = page.pageInfo?.endCursor ?? null;
  if (page.pageInfo?.hasNextPage && !cursor) throw new Error('Missing pull-request page cursor');
  const counts=Number.isSafeInteger(repo.open?.totalCount) && Number.isSafeInteger(repo.closed?.totalCount)
    ? {open:repo.open.totalCount,closed:repo.closed.totalCount} : null;
  return {pulls, cursor, hasMore:Boolean(page.pageInfo?.hasNextPage), total:page.totalCount ?? null,counts};
}
const factKey=(session,repo,number,options)=>JSON.stringify([session.route(options),repo.toLowerCase(),number]);
export function rememberPull(exec,repository,row,options={}) {
  const session=gitReads(exec),key=factKey(session,repository,row.number,options),generation=options.generation??++session.generation;
  // View projection keys must never leak from coordinator safety publication
  // into ordinary row IDs/pin measurements when a cached fact is reused.
  const {key:projectionKey,repo:projectionRepo,...facts}=row;
  if((session.versions.get(key)??0)>generation)return session.facts.get(key)??facts;
  session.versions.set(key,generation);session.facts.set(key,facts);return facts;
}
export function cachedPull(exec,repository,number,options={}) {return gitReads(exec).facts.get(factKey(gitReads(exec),repository,number,options));}
export function finalPull(row) {return ['closed','merged'].includes(row?.state);}
function successful(result) {
  if(result.code!==0 || result.signal || result.timed_out || result.timedOut)throw Object.assign(new Error(result.stderr||'GitHub read failed'),result);
  return result.stdout;
}
export async function completePulls(exec,values,repository,options={}) {
  const rows=values.map(pr=>pullRow(pr,repository.split('/')[0])),changed=[];
  for(let i=0;i<rows.length;i++) {
    const row=rows[i],old=cachedPull(exec,repository,row.number,options);
    if(Array.isArray(values[i].statusCheckRollup))continue;
    if(old?.checksKnown && !needsChecks(old) && row.checkSummary!=='pending' && old.headRefOid===row.headRefOid && old.checkSummary===row.checkSummary) {
      row.checks=old.checks;row.checksKnown=true;row.checksReadAt=old.checksReadAt??null;
    } else if(row.checkSummary!=null)changed.push(row.number);
    else {row.checks=null;row.checksKnown=true;row.checksReadAt=Date.now();}
  }
  for(let at=0;at<changed.length;at+=CHECKS_BATCH_SIZE) {
    const batch=changed.slice(at,at+CHECKS_BATCH_SIZE);
    const details=parsePendingChecks(successful(await repositoryRead(exec,pendingChecksArgs(batch,repository),repository,options)),batch);
    for(const number of batch) {
      const row=rows.find(row=>row.number===number),value=details.get(number);
      if((value.headRefOid??null)!==row.headRefOid || value.state.toLowerCase()!==(row.state==='draft'?'open':row.state) || value.isDraft!==(values.find(pr=>pr.number===number)?.isDraft===true))throw Error('Pull request changed during detail read');
      row.checks=value.checks;row.checksKnown=true;row.checksReadAt=value.checksReadAt;
    }
  }
  if(options.current && !options.current())throw Object.assign(new Error('Obsolete facts'),{quiet:true,retryAt:Date.now()+10000});
  return rows.map(row=>rememberPull(exec,repository,row,options));
}
export async function readPullPage(exec,state,repository,after=null,options={}) {
  const session=gitReads(exec),key=JSON.stringify([session.route(options),repository.toLowerCase()]);
  const consumers=[options.current??(()=>true)],shared={...options,generation:++session.generation,current:()=>consumers.some(current=>current())};
  const job=(async()=>{
    const page=parsePullPage(successful(await repositoryRead(exec,pullListArgs(state,repository,after),repository,shared)));
    if(state==='closed') {
      const values=await readTargetPulls(exec,page.pulls.map(pr=>pr.number),repository,{...shared,skipList:true});
      page.rows=page.pulls.map(pr=>{const value=values.get(pr.number);if(value.error)throw Object.assign(new Error(),value.error);return value.row;});
    } else page.rows=await completePulls(exec,page.pulls,repository,shared);
    return page;
  })();
  job.consumers=consumers;session.lists.set(key,job);
  try{return await job;}finally{if(session.lists.get(key)===job)session.lists.delete(key);}
}
export function targetPullArgs(numbers,repository) {
  if(!numbers.length || numbers.length>20 || numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Invalid targeted batch');
  const [owner,name]=repository.split('/');
  const fields='number title url state isDraft author{login} createdAt mergedAt closedAt body reviewDecision headRefName headRefOid mergeable labels(first:100){nodes{name color}} commits(last:1){nodes{commit{statusCheckRollup{state}}}}';
  return ['api','graphql','--include','-f',`query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${numbers.map(n=>`pr${n}:pullRequest(number:${n}){${fields}}`).join(' ')}}}`,'-F',`owner=${owner}`,'-F',`name=${name}`];
}
// The target lease lives beyond either view's entries. Raw facts carry no worker
// identity; every consumer must independently validate its current membership.
export async function readTargetPulls(exec,numbers,repository,options={}) {
  const session=gitReads(exec),result=new Map(),waiting=[],fresh=[];
  const list=options.skipList?null:session.lists.get(JSON.stringify([session.route(options),repository.toLowerCase()]));
  let covered=new Set();
  if(list) {list.consumers?.push(options.current??(()=>true));const page=await list;covered=new Set(page.rows.map(pr=>pr.number));}
  for(const number of numbers) {
    const key=factKey(session,repository,number,options),known=session.facts.get(key);
    if(known && (finalPull(known)||covered.has(number)))result.set(number,{row:known});
    else if(session.targets.has(key)) {const pending=session.targets.get(key);pending.consumers?.push(options.current??(()=>true));waiting.push([number,pending]);}
    else fresh.push(number);
  }
  for(let at=0;at<fresh.length;at+=20) {
    const batch=fresh.slice(at,at+20),consumers=[options.current??(()=>true)],shared={...options,generation:++session.generation,current:()=>consumers.some(current=>current())};
    const job=(async()=>{
      const result=await repositoryRead(exec,targetPullArgs(batch,repository),repository,shared);
      let response;try{response=JSON.parse(pullPayload(result.stdout));}catch {}
      // gh exits 1 for GraphQL errors even with HTTP 200 and useful sibling
      // aliases. Admit only scoped GraphQL failures here, never a transport,
      // process or HTTP refusal disguised by a partial-looking body. Rate
      // refusals have already been handled for the whole read at admission.
      const aliases=new Set(batch.map(number=>`pr${number}`)),failure=pullFailure(result);
      const partial=result.code===1 && !result.signal && !result.timed_out && !result.timedOut
        && !['cli','auth','unreachable'].includes(failure.kind)
        && !/timeout|timed out|cannot start|failed to (?:start|spawn|execute)|process init|\bEAGAIN\b|\bENOMEM\b/i.test(result.stderr??'')
        && !/^HTTP[^\n]*\b[345]\d\d\b/im.test(result.stdout??'') && !/\bHTTP(?:\/[\d.]+)?\s+[345]\d\d\b/i.test(result.stderr??'')
        && response?.data?.repository && typeof response.data.repository==='object' && !Array.isArray(response.data.repository)
        && Array.isArray(response.errors) && response.errors.length>0
        && response.errors.every(error=>typeof error.message==='string' && error.path?.[0]==='repository' && aliases.has(error.path?.[1]));
      if(!partial)response=JSON.parse(pullPayload(successful(result)));
      const repo=response.data?.repository,values=[],errors=new Map();
      for(const number of batch) {
        const alias=`pr${number}`,failures=(response.errors??[]).filter(e=>!e.path || e.path.length<2 || e.path[1]===alias);
        const value=repo?.[alias];
        if(failures.length || !value) {
          const stderr=failures.map(e=>e.message).join('; ')||'Incomplete targeted PR response';
          errors.set(number,{code:1,stderr});continue;
        }
        if(value.number!==number || value.url?.toLowerCase()!==`https://github.com/${repository.toLowerCase()}/pull/${number}`)throw Error('Pull request identity mismatch');
        values.push({...value,checkSummary:summaryState(value.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state),
          statusCheckRollup:value.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? value.statusCheckRollup});
      }
      const rows=await completePulls(exec,values,repository,shared);
      return new Map(batch.map(number=>[number,errors.has(number)?{error:errors.get(number)}:{row:rows.find(row=>row.number===number)}]));
    })();
    for(const number of batch) {
      const key=factKey(session,repository,number,options),value=job.then(rows=>rows.get(number));value.consumers=consumers;session.targets.set(key,value);waiting.push([number,value]);
      // Install a rejection handler immediately, including when an earlier chunk fails.
      value.catch(()=>{}).finally(()=>{if(session.targets.get(key)===value)session.targets.delete(key);});
    }
    await job; // Keep large targeted selections sequential within a repository.
  }
  for(const [number,promise]of waiting)result.set(number,await promise);
  return result;
}
export const REPO_ARGS = ['repo', 'view', '--json', 'nameWithOwner,owner,url'];
export function countArgs(nameWithOwner) {
  const [owner, name] = String(nameWithOwner).split('/');
  const query = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){open:pullRequests(states:OPEN){totalCount} closed:pullRequests(states:[CLOSED,MERGED]){totalCount}}}`;
  return ['api', 'graphql', '--include', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`];
}
export function parseCounts(stdout) {
  try {
    const repo = JSON.parse(pullPayload(stdout))?.data?.repository;
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
  for (const c of latest.values()) {
    const conclusion = String(c.conclusion ?? c.state ?? '').toUpperCase();
    if (c.status && c.status !== 'COMPLETED') pending++;
    else if (['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(conclusion)) ok++;
    else if (['', 'PENDING', 'EXPECTED', 'QUEUED', 'IN_PROGRESS', 'WAITING'].includes(conclusion)) pending++;
    else bad++;
  }
  const total = ok + bad + pending;
  return { ok, bad, pending, total, label: `${ok}/${total}`, state: bad ? 'failure' : pending ? 'pending' : 'success' };
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
    checksReadAt:Array.isArray(pr.statusCheckRollup)?now:null,
    owner: Boolean(owner && login && login.toLowerCase() === String(owner).toLowerCase()),
    tasks: tasks(pr.body), checks: checkFacts, checkSummary:pr.checkSummary??checkFacts?.state??null, labels: pullLabels(pr.labels),
    review: pr.reviewDecision === 'APPROVED' ? 'approved' : pr.reviewDecision === 'CHANGES_REQUESTED' ? 'changes' : null,
  };
}

// Relative wording is presentation, not a cached GitHub fact. Final rows age
// locally without rereading their body, labels, state or checks.
export function retimePull(pr,now=Date.now()) {
  if(!pr || !(pr.createdAt || pr.closedAt || pr.mergedAt))return pr;
  const when=pr.state==='merged'?`merged ${ago(pr.mergedAt??pr.closedAt,now)}`:pr.state==='closed'?`closed ${ago(pr.closedAt,now)}`:`opened ${ago(pr.createdAt,now)}`;
  if(when===pr.when)return pr;
  return {...pr,when,byline:`${pr.login?`${pr.login} `:''}${when}`,meta:`#${pr.number} · ${pr.login?`${pr.login} `:''}${when}`,
    compactWhen:when.replace(/^(?:opened|closed|merged) /,'').replace(/ (second|minute|hour|day|month|year)s? ago$/,(_m,unit)=>`${({second:'s',minute:'m',hour:'h',day:'d',month:'mo',year:'y'})[unit]} ago`)};
}
// Apply the deliberately narrow safety read without erasing labels/tasks/review.
export function refreshPullFacts(pr, value) {
  const {state,meta,byline,when,compactWhen,mergeConflict,headRefName,headRefOid,createdAt,mergedAt,closedAt}=pullRow({...value,createdAt:pr.createdAt,headRefName:pr.headRefName,mergeable:pr.mergeConflict?'CONFLICTING':null,author:{login:pr.login}});
  return {...pr,state,meta,byline,when,compactWhen,mergeConflict,headRefName,headRefOid,createdAt,mergedAt,closedAt,checks:value.checks,checkSummary:value.checkSummary,checksKnown:true,checksReadAt:value.checksReadAt??pr.checksReadAt??null};
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
  if (rateRefusal(e && typeof e==='object'?e:{stderr:text})) return failure('rate', 'Could not read pull requests: GitHub rate limit exceeded');
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
  if (e instanceof SyntaxError || /invalid GitHub response/i.test(text)) return failure('response', 'Could not read pull requests: invalid GitHub response');
  return failure('read', detail.split('\n')[0].slice(0,240) || 'Cannot load pull requests');
}
export function pullError(e, stderr = '') { return pullFailure(e, stderr).message; }
