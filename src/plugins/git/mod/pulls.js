// Pull requests for the repo under the panel's folder, read through the GitHub CLI.
// Pure helpers here; main.js owns exec calls and rendering.
export const PR_FIELDS = 'number,title,url,state,isDraft,author,createdAt,mergedAt,closedAt,body,statusCheckRollup,reviewDecision,headRefName,headRefOid,mergeable,labels';
export const PR_PAGE_SIZE = 10;

export function pullListArgs(state, nameWithOwner, after = null) {
  const [owner, name] = String(nameWithOwner).split('/');
  const states = state === 'closed' ? '[CLOSED,MERGED]' : '[OPEN]';
  const query = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){pullRequests(first:${PR_PAGE_SIZE},after:$after,states:${states},orderBy:{field:CREATED_AT,direction:DESC}){totalCount pageInfo{hasNextPage endCursor} nodes{number title url state isDraft author{login} createdAt mergedAt closedAt body reviewDecision headRefName headRefOid mergeable labels(first:100){nodes{name color}} commits(last:1){nodes{commit{statusCheckRollup{contexts(first:100){nodes{... on CheckRun{name status conclusion startedAt completedAt detailsUrl checkSuite{workflowRun{workflow{name}}}} ... on StatusContext{context state createdAt}}}}}}}}}}}`;
  return ['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`,
    ...(after ? ['-f', `after=${after}`] : [])];
}

export function parsePullPage(stdout) {
  const result = JSON.parse(stdout || '{}');
  if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
  const page = result.data?.repository?.pullRequests;
  if (!Array.isArray(page?.nodes)) throw new Error('Cannot load pull requests');
  const pulls = page.nodes.map(pr => ({...pr,
    statusCheckRollup: pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes?.map(check => ({...check,
      workflowName:check.checkSuite?.workflowRun?.workflow?.name ?? null,
    })) ?? [],
  }));
  const cursor = page.pageInfo?.endCursor ?? null;
  if (page.pageInfo?.hasNextPage && !cursor) throw new Error('Missing pull-request page cursor');
  return {pulls, cursor, hasMore:Boolean(page.pageInfo?.hasNextPage), total:page.totalCount ?? null};
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
  const login = pr.author?.login ?? '';
  const state = pr.state === 'MERGED' ? 'merged' : pr.state === 'CLOSED' ? 'closed' : pr.isDraft ? 'draft' : 'open';
  const when = state === 'merged' ? `merged ${ago(pr.mergedAt ?? pr.closedAt, now)}`
    : state === 'closed' ? `closed ${ago(pr.closedAt, now)}` : `opened ${ago(pr.createdAt, now)}`;
  return {
    number: pr.number, title: pr.title ?? '', url: pr.url, state, login,
    headRefName: pr.headRefName ?? null, headRefOid: pr.headRefOid ?? null,
    mergeConflict: ['open','draft'].includes(state) && pr.mergeable === 'CONFLICTING',
    meta: `#${pr.number} · ${login ? `${login} ` : ''}${when}`,
    byline: `${login ? `${login} ` : ''}${when}`,
    owner: Boolean(owner && login && login.toLowerCase() === String(owner).toLowerCase()),
    tasks: tasks(pr.body), checks: checks(pr.statusCheckRollup), labels: pullLabels(pr.labels),
    review: pr.reviewDecision === 'APPROVED' ? 'approved' : pr.reviewDecision === 'CHANGES_REQUESTED' ? 'changes' : null,
  };
}

// Session-owned PR badges can differ from the parent shell's branch.
// Inspect only the current bottom footer, paired with the usage row; never
// match arbitrary PR mentions in conversation/history. No terminal input.
export {agentPullNumber} from './plugins/git/ci-footer.js';

export function parsePulls(stdout) {
  const list = JSON.parse(stdout || '[]');
  return Array.isArray(list) ? list : [];
}

// A person-readable reason when gh cannot answer.
export function pullError(e, stderr = '') {
  const text = `${e ?? ''} ${stderr ?? ''}`;
  if (/program not found|not recognized|No such file|cannot start gh/i.test(text)) return 'GitHub CLI (gh) is not installed';
  if (/auth login|not logged in|authentication/i.test(text)) return 'Sign in first: gh auth login';
  if (/no git remotes|could not determine|none of the git remotes|not a git repository|no remotes/i.test(text)) return 'No GitHub repository';
  if (/Could not resolve|network|timed out|timeout/i.test(text)) return 'GitHub is unreachable';
  const first = (stderr || (e?.message ?? String(e ?? ''))).trim().split('\n')[0];
  return first || 'Cannot load pull requests';
}
