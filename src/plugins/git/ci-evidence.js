// Shared GitHub evidence for the Core-side monitor and legacy manual tooling.
import {DEFAULT_CI_MESSAGE,renderCIMessage,DEFAULT_CONFLICT_MESSAGE,renderConflictMessage,DEFAULT_MERGED_MESSAGE,renderMergedMessage} from './ci-message.js';
export const validRepository = value => typeof value === 'string' && value.length <= 140 && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
export const validHead = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const sameRepo = (value, repo) => typeof value === 'string' && value.toLowerCase() === repo.toLowerCase();
const failed = run => run.status === 'completed' && ['failure','timed_out'].includes(run.conclusion);
const runIdentity = (run, repo, head) => positive(run?.id) && positive(run.workflow_id) && positive(run.run_attempt)
  && run.head_sha?.toLowerCase() === head.toLowerCase() && sameRepo(run.repository?.full_name, repo);
export function eligiblePull(pr) {
  return positive(pr?.number) && ['open','draft'].includes(pr.state) && validHead(pr.headRefOid) && pr.checks?.bad > 0;
}
export function currentPull(stdout, pr, repo) {
  const value = JSON.parse(stdout);
  return value?.number === pr.number && value.state === 'open' && sameRepo(value.base?.repo?.full_name, repo)
    && value.head?.sha?.toLowerCase() === pr.headRefOid.toLowerCase();
}
function latestRuns(stdout, pr, repo) {
  const value = JSON.parse(stdout);
  if (!validRepository(repo) || !validHead(pr.headRefOid) || !Array.isArray(value?.workflow_runs)
      || !Number.isSafeInteger(value.total_count) || value.total_count < 0 || value.total_count > 100
      || value.workflow_runs.length !== value.total_count) throw Error('Incomplete workflow inventory; no CI request sent.');
  const latest = new Map();
  for (const run of value.workflow_runs) {
    if (!runIdentity(run,repo,pr.headRefOid)) throw Error('Unverified workflow identity; no CI request sent.');
    const previous = latest.get(run.workflow_id);
    if (!previous || run.id > previous.id || (run.id === previous.id && run.run_attempt > previous.run_attempt)) latest.set(run.workflow_id,run);
  }
  return [...latest.values()];
}
// Diagnostics reuse exactly the same verified newest-workflow evidence, with no extra read.
export const workflowStillRunning=(stdout,pr,repo)=>latestRuns(stdout,pr,repo).some(run=>['queued','in_progress','waiting','pending','requested'].includes(run.status));
export function failedRuns(stdout, pr, repo) {
  const runs = latestRuns(stdout,pr,repo).filter(failed).map(run => ({id:run.id,attempt:run.run_attempt,workflow:run.workflow_id,
    head:pr.headRefOid.toLowerCase(),url:`https://github.com/${repo}/actions/runs/${run.id}`}));
  if (runs.length > 16) throw Error('Too many failed workflows for one bounded CI request.');
  return runs;
}
export function currentRun(stdout, run, repo) {
  const value = JSON.parse(stdout);
  return runIdentity(value,repo,run.head) && value.id === run.id && value.workflow_id === run.workflow
    && value.run_attempt === run.attempt && failed(value);
}
// Merge conflicts. GitHub says "dirty" only once it has computed mergeability (null while
// computing); the base branch must be a plain branch name this repository owns.
export const validBranch = value => typeof value === 'string' && value.length <= 200 && /^[\w.-]+(?:\/[\w.-]+)*$/.test(value) && !value.includes('..');
export function conflictingPull(raw, repo) {
  return raw?.state === 'open' && raw.mergeable === false && raw.mergeable_state === 'dirty'
    && validHead(raw.head?.sha) && validBranch(raw.base?.ref) && sameRepo(raw.base?.repo?.full_name, repo);
}
// One message per PR head and base tip: a new push or a moved base that still conflicts asks again.
export const conflictKey = (repo, number, head, base) => JSON.stringify([repo.toLowerCase(),number,'conflict',head.toLowerCase(),base.toLowerCase()]);
// `git merge-tree --name-only` output after the tree line: plain repository paths only.
export function conflictFiles(stdout) {
  const files = [...new Set(String(stdout ?? '').split(/\r?\n/).slice(1).map(line => line.trim()).filter(Boolean))];
  return files.filter(file => file.length <= 300 && !/[\x00-\x1f\x7f-\x9f]/.test(file));
}
export const FILES_LIMIT = 50;
export function conflictPrompt(repo, number, {head, base, files}, template = DEFAULT_CONFLICT_MESSAGE) {
  if (!validRepository(repo) || !positive(number) || !validHead(head) || !validBranch(base)) throw Error('Invalid merge conflict request.');
  const listed = files?.length
    ? [...files.slice(0, FILES_LIMIT).map(file => `- ${file}`), ...(files.length > FILES_LIMIT ? [`- …and ${files.length - FILES_LIMIT} more`] : [])].join('\n')
    : `- (not listed: merge ${base} to see them)`;
  return renderConflictMessage(template, {url:`https://github.com/${repo}/pull/${number}`, base, head, files:listed});
}
export const failureKey = (repo, pr, run) => JSON.stringify([repo.toLowerCase(),pr.number,run.head,run.id,run.attempt]);
export function fixPrompt(repo, pr, runs, template = DEFAULT_CI_MESSAGE) {
  if (!validRepository(repo) || !eligiblePull(pr) || !runs.length || runs.length > 16) throw Error('Invalid CI request.');
  const url = `https://github.com/${repo}/pull/${pr.number}`;
  // The whole message comes from the template (Settings > Git > Message).
  return renderCIMessage(template,{url,runUrl:runs[0].url,head:pr.headRefOid,
    runs:runs.map(run => `- ${run.url} (attempt ${run.attempt})`).join('\n')});
}
// Merged into a branch of this repository. Asked once per PR: a merge is final.
export function mergedPull(raw, repo) {
  return raw?.state === 'closed' && raw.merged === true && validBranch(raw.base?.ref) && sameRepo(raw.base?.repo?.full_name, repo);
}
export const mergedKey = (repo, number) => JSON.stringify([repo.toLowerCase(),number,'merged']);
export function mergedPrompt(repo, number, {base, branch}, template = DEFAULT_MERGED_MESSAGE) {
  if (!validRepository(repo) || !positive(number) || !validBranch(base)) throw Error('Invalid pull request merged request.');
  return renderMergedMessage(template, {url:`https://github.com/${repo}/pull/${number}`, base, branch:validBranch(branch) ? branch : ''});
}
