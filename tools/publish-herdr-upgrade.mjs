// Trusted writer. API Git objects create a new branch only; existing refs are never updated.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {commitSha,parseIdentity,releaseIdentity,releaseVersion,compareVersions,safePath,gitBlob,REPOSITORIES,evidenceFile} from './herdr-upgrade-releases.mjs';
import {migrationBranch,migrationBody,migrationChange,migrationFiles,migrationTitle,renderMigrationReport,SKIP_LABEL,SKIP_DESCRIPTION} from './herdr-upgrade-report.mjs';
import {inventory as treeInventory} from './check-tab-move.mjs';
export const TARGET_REPOSITORY='timurproko/herdr-app';
export function githubApi({token=process.env.GH_TOKEN,fetchImpl=fetch}={}) {
  return async (method,suffix,body)=>{
    if(!/^[A-Za-z0-9_?&=./%+-]*$/.test(suffix)||suffix.includes('..'))throw Error('Unsafe GitHub API suffix.');
    const response=await fetchImpl(`https://api.github.com/repos/${TARGET_REPOSITORY}${suffix?`/${suffix}`:''}`,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Custom-Herdr-migrations',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{} )});
    let size=0;const chunks=[];for await(const chunk of response.body??[]){size+=chunk.length;if(size>8*1024*1024)throw Error('GitHub response exceeds limit.');chunks.push(Buffer.from(chunk));}
    if(!response.ok){const error=Error(`GitHub ${method} ${suffix}: HTTP ${response.status}`);error.status=response.status;throw error;}
    return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null;
  };
}
export async function pages(api,suffix,field) {
  const all=[];
  for(let page=1;page<=100;page++) {
    const result=await api('GET',`${suffix}${suffix.includes('?')?'&':'?'}per_page=100&page=${page}`),entries=field?result[field]:result;
    if(!Array.isArray(entries))throw Error('Invalid paginated GitHub response.');all.push(...entries);
    if(entries.length<100)return all;
  }
  throw Error('GitHub pagination exceeds safety bound; refusing an incomplete identity lookup.');
}
export function frozenUntil(value,event='schedule',now=Date.now()) {
  if(event!=='schedule'||!value)return false;
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value))throw Error('Malformed HERDR_UPGRADE_FREEZE_UNTIL; no scheduled writes.');
  const date=new Date(value.length===10?`${value}T00:00:00Z`:value);
  if(!Number.isFinite(date.getTime())||date.toISOString().replace('.000Z','Z').slice(0,value.length)!==value)throw Error('Invalid UTC freeze date; no scheduled writes.');
  return date.getTime()>now;
}
const scope=file=>file==='.github/workflows/herdr-upstream-sync.yml'||file.startsWith('tools/herdr-upgrade-')||file==='tools/propose-herdr-upgrade.mjs'||file==='tools/publish-herdr-upgrade.mjs'||file==='tools/host-api-facts.mjs'||file==='tools/runtime/stock-baseline.mjs'||file==='tools/check-tab-move.mjs'||file.startsWith('tools/contracts/')||file==='src/integration/herdr/compatibility.js'||file==='src/integration/herdr/documents/tab-move-v1.cjs';
export async function verifyActivation(api,{enabled,probeRunId,baseSha,defaultBranch}) {
  if(enabled!=='true')throw Error('Publication disabled: set HERDR_UPGRADE_PROPOSALS_ENABLED=true only after a successful hosted no-write probe.');
  if(!/^[1-9]\d*$/.test(String(probeRunId??'')))throw Error('Set HERDR_UPGRADE_PROBE_RUN_ID to the successful hosted no-write probe run.');
  commitSha(baseSha);
  const run=await api('GET',`actions/runs/${probeRunId}`);
  if(run.repository?.full_name!==TARGET_REPOSITORY||run.event!=='workflow_dispatch'||run.status!=='completed'||run.conclusion!=='success'||run.head_branch!==defaultBranch||run.path!=='.github/workflows/herdr-upstream-sync.yml')throw Error('Activation run must be a successful manual Herdr workflow on the default branch.');
  commitSha(run.head_sha);
  const jobs=await pages(api,`actions/runs/${probeRunId}/jobs`,'jobs');
  if(!jobs.some(j=>j.name==='Hosted no-write probe'&&j.conclusion==='success'&&j.steps?.some(s=>s.name==='Record successful no-write probe'&&s.conclusion==='success')))throw Error('Activation run is not a successful hosted no-write probe.');
  const fingerprint=async sha=>{
    const entries=treeInventory(await api('GET',`git/trees/${sha}?recursive=1`)).filter(e=>scope(e[0]));
    if(!entries.some(e=>e[0]==='.github/workflows/herdr-upstream-sync.yml'))throw Error('Probe revision lacks the migration workflow.');
    return entries;
  };
  if(JSON.stringify(await fingerprint(run.head_sha))!==JSON.stringify(await fingerprint(baseSha)))throw Error('Probe predates the current migration workflow/tool revision; run a new no-write probe.');
  return {probeRunId:String(probeRunId),revision:baseSha};
}
export function validateBundle(bundle) {
  if(bundle?.schema!=='herdr-upgrade-bundle-v1'||!['evaluate','refresh','probe'].includes(bundle.mode))throw Error('Invalid upgrade bundle.');
  commitSha(bundle.baseSha);commitSha(bundle.headSha);
  const r=bundle.report;
  if(r?.schema!=='herdr-migration-v1'||r.baseSha!==bundle.baseSha||r.headSha!==bundle.headSha||r.worktreeDirty!==false)throw Error('Mismatched evaluation identity.');
  if(bundle.identity)parseIdentity(bundle.identity);
  if(typeof r.generatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(r.generatedAt))throw Error('Invalid report timestamp.');
  if(r.runUrl!==undefined&&!/^https:\/\/github\.com\/timurproko\/herdr-app\/actions\/runs\/[1-9]\d*$/.test(r.runUrl))throw Error('Untrusted report artifact URL.');
  for(const c of ['app','core']) {
    const release=r.discovery?.releases?.[c];if(release){releaseVersion(release.version);if(release.commit)commitSha(release.commit);}
    if(r.discovery?.candidates?.[c])releaseVersion(r.discovery.candidates[c]);
    const pin=c==='app'?r.inventory?.appSource:r.inventory?.coreSource;
    if(pin?.repository!==REPOSITORIES[c])throw Error('Unexpected evidence repository.');commitSha(pin.commit);
  }
  if(!Array.isArray(r.steps)||r.steps.length>100||!Array.isArray(r.actions)||r.actions.length>1000)throw Error('Invalid report steps/actions.');
  for(const s of r.steps)if(!/^[a-z0-9-]{1,80}$/.test(s.name)||!['passed','failed','blocked','skipped'].includes(s.status)||typeof s.operation!=='string'||typeof s.detail!=='string'||s.detail.length>3000)throw Error('Invalid step verdict.');
  if(!r.evidence||Object.keys(r.evidence).length>1000)throw Error('Invalid evidence map.');
  let bytes=0;
  for(const [file,content] of Object.entries(r.evidence)) {
    evidenceFile(file);
    if(typeof content!=='string')throw Error('Unsafe generated evidence.');
    bytes+=Buffer.byteLength(content);if(bytes>48*1024*1024||Buffer.byteLength(content)>16*1024*1024)throw Error('Evidence bundle exceeds limit.');
  }
  return bundle;
}
export function proposalVersions(pr,defaultBranch) {
  if(pr.base?.ref!==defaultBranch||pr.head?.repo?.full_name!==TARGET_REPOSITORY||!pr.head?.ref?.startsWith('chore/herdr-'))return null;
  try{return parseIdentity(pr.head.ref.slice('chore/herdr-'.length));}catch{return null;}
}
export async function proposalInventory(api,defaultBranch) {
  return (await pages(api,`pulls?state=all&base=${encodeURIComponent(defaultBranch)}`)).map(pr=>({...pr,versions:proposalVersions(pr,defaultBranch)})).filter(pr=>pr.versions);
}
export function planProposals(candidates,existing,{manual=false}={}) {
  const remaining={...candidates},reuse=[];
  for(const pr of existing) {
    const overlapping=Object.entries(pr.versions).some(([c,v])=>remaining[c]===v);
    if(!overlapping)continue;
    const skipped=pr.state==='closed'&&!pr.merged_at&&pr.labels?.some(l=>l.name===SKIP_LABEL);
    reuse.push({pr,action:pr.merged_at?'merged-metadata-gap':skipped&&!manual?'skipped':pr.state==='open'?'comment':manual?'reconsider':'closed'});
    for(const [c,v] of Object.entries(pr.versions))if(remaining[c]===v)delete remaining[c];
  }
  return {identity:Object.keys(remaining).length?releaseIdentity(remaining):null,reuse};
}
async function optional(api,suffix) {try{return await api('GET',suffix);}catch(error){if(error.status===404)return null;throw error;}}
export async function ensureSkipLabel(api) {
  if(await optional(api,`labels/${encodeURIComponent(SKIP_LABEL)}`))return;
  try {await api('POST','labels',{name:SKIP_LABEL,color:'6e7781',description:SKIP_DESCRIPTION});}
  catch(error){if(error.status!==422||!await optional(api,`labels/${encodeURIComponent(SKIP_LABEL)}`))throw error;}
}
export function boundedComment(body) {
  if(Buffer.byteLength(body)<=55000)return body;
  const excerpt=Buffer.from(body).subarray(0,48000).toString('utf8');
  return excerpt.slice(0,excerpt.lastIndexOf('\n'))+'\n\nComment excerpt truncated for GitHub size limits. The complete report, hunks and migration checklist remain in the linked Actions artifact and committed proposal evidence.\n';
}
export async function commentOnce(api,number,marker,body) {
  const comments=await pages(api,`issues/${number}/comments`);
  if(!comments.some(c=>c.body?.includes(marker)))await api('POST',`issues/${number}/comments`,{body:`${marker}\n${boundedComment(body)}`});
}
const prefixAllowed=(file,identity)=>file.startsWith(`upstream/migrations/${identity}/`)||file.startsWith(`openspec/changes/${migrationChange(identity)}/`);
export function validateGeneratedFiles(files,identity) {
  parseIdentity(identity);let bytes=0;
  for(const [file,content] of Object.entries(files)) {
    safePath(file);
    if(!prefixAllowed(file,identity)||!/(?:\.json|\.md|\.txt|\.diff|\.yaml)$/.test(file)||/(?:^|\/)(?:AGENTS|CLAUDE)\.md$/.test(file)||typeof content!=='string')throw Error('Unsafe generated publication path.');
    bytes+=Buffer.byteLength(content);if(bytes>64*1024*1024)throw Error('Generated publication exceeds limit.');
  }
  return files;
}
export async function createProposalBranch(api,identity,bundle,files) {
  const branch=migrationBranch(identity),ref=await optional(api,`git/ref/heads/${branch}`);
  if(ref) {
    // Recovery only: initial commit, exact base, and ONLY generated additions.
    const commit=await api('GET',`git/commits/${commitSha(ref.object?.sha)}`);
    if(commit.message!==`chore(herdr): propose ${identity}\n\nHerdr migration base: ${bundle.baseSha}`||commit.parents?.length!==1||commit.parents[0].sha!==bundle.baseSha)throw Error('Existing branch is not an interrupted initial proposal; preserving it.');
    const before=treeInventory(await api('GET',`git/trees/${bundle.baseSha}?recursive=1`)),after=treeInventory(await api('GET',`git/trees/${commit.sha}?recursive=1`));
    const base=new Map(before.map(e=>[e[0],e])),next=new Map(after.map(e=>[e[0],e]));
    const changes=[...new Set([...base.keys(),...next.keys()])].filter(n=>JSON.stringify(base.get(n))!==JSON.stringify(next.get(n)));
    if(!changes.length||changes.some(n=>base.has(n)||!next.has(n)||!Object.hasOwn(files,n)||!prefixAllowed(n,identity)||next.get(n)[1]!=='100644'))throw Error('Unknown orphan branch contents; preserving it.');
    return branch;
  }
  const baseCommit=await api('GET',`git/commits/${bundle.baseSha}`),tree=[];
  const baseTree=treeInventory(await api('GET',`git/trees/${bundle.baseSha}?recursive=1`));
  const existing=new Set(baseTree.map(e=>e[0]));
  if(Object.keys(files).some(file=>existing.has(file)))throw Error('Generated evidence/change already exists on base; no artifact will be overwritten.');
  for(const [file,content] of Object.entries(files)) {
    const blob=await api('POST','git/blobs',{encoding:'base64',content:Buffer.from(content).toString('base64')});
    if(blob.sha!==gitBlob(content))throw Error('Published blob hash mismatch.');
    tree.push({path:file,mode:'100644',type:'blob',sha:blob.sha});
  }
  const createdTree=await api('POST','git/trees',{base_tree:commitSha(baseCommit.tree?.sha),tree});
  const commit=await api('POST','git/commits',{message:`chore(herdr): propose ${identity}\n\nHerdr migration base: ${bundle.baseSha}`,tree:commitSha(createdTree.sha),parents:[bundle.baseSha]});
  // Atomic create, never PATCH/update/force. A race or uncertain write is left for reconciliation.
  await api('POST','git/refs',{ref:`refs/heads/${branch}`,sha:commitSha(commit.sha)});
  return branch;
}
export async function publishMigration(bundle,{api,readApi=api,enabled,probeRunId,event='schedule',freeze,manual=false,refresh,now=Date.now()}={}) {
  validateBundle(bundle);
  if(frozenUntil(freeze,event,now))return {status:'frozen',proposals:[]};
  if(bundle.mode==='probe')return {status:'no-write-probe',proposals:[]};
  if(refresh){parseIdentity(refresh);if(bundle.mode!=='refresh'||bundle.identity!==refresh)throw Error('Refresh bundle identity mismatch.');}
  else if(bundle.mode!=='evaluate'||bundle.headSha!==bundle.baseSha)throw Error('New proposals require evaluation of the trusted default-branch head.');
  const repository=await readApi('GET','');
  if(repository.full_name!==TARGET_REPOSITORY)throw Error('Unexpected target repository.');
  const defaultBranch=repository.default_branch;
  const base=await readApi('GET',`git/ref/heads/${encodeURIComponent(defaultBranch)}`);
  if(base.object?.sha!==bundle.baseSha)throw Error('Default branch advanced during evaluation; rerun without publishing stale results.');
  await verifyActivation(readApi,{enabled,probeRunId,baseSha:bundle.baseSha,defaultBranch});
  let existing=await proposalInventory(readApi,defaultBranch);
  const plan=refresh?{identity:null,reuse:existing.filter(p=>releaseIdentity(p.versions)===refresh).map(pr=>({pr,action:pr.state==='open'?'comment':'closed'}))}:planProposals(bundle.report.discovery.candidates,existing,{manual});
  if(refresh&&!plan.reuse.length)throw Error('Refresh needs an existing migration proposal.');
  if(refresh&&plan.reuse[0].pr.head.sha!==bundle.headSha)throw Error('Refresh proposal head changed; evaluate it again.');
  // Validate all generated content before the first mutation, including label creation.
  const identity=plan.identity;
  const files=identity?validateGeneratedFiles(migrationFiles(bundle.report,identity),identity):null;
  for(const {pr} of plan.reuse){const reusedIdentity=releaseIdentity(pr.versions);validateGeneratedFiles(migrationFiles(bundle.report,reusedIdentity),reusedIdentity);}
  await ensureSkipLabel(api);
  const result={status:'published',proposals:[],reused:[]};
  for(const {pr,action} of plan.reuse) {
    result.reused.push({number:pr.number,action});
    if(action==='comment') {
      await commentOnce(api,pr.number,`<!-- herdr-report:${bundle.baseSha}:${bundle.headSha}:${bundle.report.generatedAt} -->`,renderMigrationReport(bundle.report,releaseIdentity(pr.versions),{prUrl:pr.html_url,artifactUrl:bundle.report.runUrl??pr.html_url}));
    } else if(action==='reconsider') {
      if(!await optional(readApi,`git/ref/heads/${migrationBranch(releaseIdentity(pr.versions))}`))throw Error(`Restore branch for PR #${pr.number} before manual reconsideration; never creating a duplicate.`);
      await api('PATCH',`pulls/${pr.number}`,{state:'open'});
      await commentOnce(api,pr.number,`<!-- herdr-reconsider:${probeRunId}:${bundle.report.generatedAt} -->`,'Manual reconsideration requested; the same migration branch and checklist are preserved.');
    }
  }
  if(!identity)return result;
  // Re-read immediately before creating any ref/PR; this closes duplicate races with other actors.
  existing=await proposalInventory(readApi,defaultBranch);
  const finalPlan=planProposals(parseIdentity(identity),existing,{manual});
  if(finalPlan.identity!==identity||finalPlan.reuse.length)throw Error('Proposal identity changed during publication; rerun to reconcile existing PRs.');
  if((await readApi('GET',`git/ref/heads/${encodeURIComponent(defaultBranch)}`)).object?.sha!==bundle.baseSha)throw Error('Default branch advanced before proposal creation.');
  const branch=await createProposalBranch(api,identity,bundle,files);
  const pr=await api('POST','pulls',{base:defaultBranch,head:branch,title:migrationTitle(identity),body:migrationBody(identity),draft:true});
  result.proposals.push({number:pr.number,url:pr.html_url,identity});
  await commentOnce(api,pr.number,`<!-- herdr-initial:${identity} -->`,renderMigrationReport(bundle.report,identity,{prUrl:pr.html_url,artifactUrl:bundle.report.runUrl??pr.html_url}));
  const versions=parseIdentity(identity);
  for(const older of existing.filter(p=>p.state==='open')) {
    const shared=Object.keys(versions).filter(c=>older.versions[c]);
    const advanced=shared.filter(c=>compareVersions(versions[c],older.versions[c])>0),supersedes=advanced.length>0;
    const unrelated=!shared.length;
    if(supersedes||unrelated)await commentOnce(api,older.number,`<!-- herdr-${supersedes?'superseded':'related'}:${identity} -->`,`${supersedes?`A newer Herdr migration supersedes the ${advanced.join(', ')} release review in this proposal`:'A related independent-component migration is available'}: ${pr.html_url}. Existing commits and checklist are preserved; neither proposal was closed or merged.`);
  }
  return result;
}
export async function publicationGate({api,env=process.env}) {
  if(env.REFRESH_ID)parseIdentity(env.REFRESH_ID);
  if(env.MODE&&!['probe','publish'].includes(env.MODE))throw Error('Invalid workflow mode.');
  const repository=await api('GET',''),defaultBranch=repository.default_branch;
  const baseSha=commitSha((await api('GET',`git/ref/heads/${encodeURIComponent(defaultBranch)}`)).object?.sha);
  const frozen=frozenUntil(env.HERDR_UPGRADE_FREEZE_UNTIL,env.EVENT_NAME);
  let publish=false;
  if(!frozen&&env.MODE!=='probe'&&env.HERDR_UPGRADE_PROPOSALS_ENABLED==='true') {
    await verifyActivation(api,{enabled:env.HERDR_UPGRADE_PROPOSALS_ENABLED,probeRunId:env.HERDR_UPGRADE_PROBE_RUN_ID,baseSha,defaultBranch});publish=true;
  } else if(!frozen&&env.EVENT_NAME==='workflow_dispatch'&&env.MODE==='publish')throw Error('Publication is disabled; first complete and authorize a hosted no-write probe.');
  return {baseSha,defaultBranch,frozen,publish};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if(process.env.GITHUB_REPOSITORY!==TARGET_REPOSITORY||process.env.GITHUB_REF!==`refs/heads/${process.env.DEFAULT_BRANCH}`)throw Error('Writer/gate requires this repository default branch Actions context.');
    const readApi=githubApi({token:process.env.GITHUB_READ_TOKEN});
    if(process.argv[2]==='--gate') {
      const gate=await publicationGate({api:readApi});
      if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`base=${gate.baseSha}\nfrozen=${gate.frozen}\npublish=${gate.publish}\n`);
      console.log(JSON.stringify(gate));
    } else if(process.argv[2]==='--publish'&&process.argv.length===4) {
      const bytes=fs.readFileSync(process.argv[3]);if(bytes.length>64*1024*1024)throw Error('Bundle file exceeds limit.');
      const result=await publishMigration(JSON.parse(bytes),{api:githubApi(),readApi,enabled:process.env.HERDR_UPGRADE_PROPOSALS_ENABLED,probeRunId:process.env.HERDR_UPGRADE_PROBE_RUN_ID,event:process.env.EVENT_NAME,freeze:process.env.HERDR_UPGRADE_FREEZE_UNTIL,manual:process.env.EVENT_NAME==='workflow_dispatch'&&process.env.EXACT_VERSION_OVERRIDE==='true',refresh:process.env.REFRESH_ID||undefined});
      console.log(JSON.stringify(result));
    } else throw Error('Use --gate or --publish <bundle.json> in the trusted workflow.');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
