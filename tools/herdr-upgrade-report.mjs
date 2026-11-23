// Pure delivery/report rendering. Candidate evidence is never reviewed permission.
import {releaseIdentity,parseIdentity,safePath} from './herdr-upgrade-releases.mjs';
export const SKIP_LABEL='\u{1F916} Skip';
export const SKIP_DESCRIPTION='Closing a Herdr migration proposal with this label skips that version.';
export const migrationBranch=identity=>`chore/herdr-${releaseIdentity(parseIdentity(identity))}`;
export const migrationChange=identity=>`herdr-migration-${releaseIdentity(parseIdentity(identity))}`;
export const migrationRoot=identity=>`upstream/migrations/${releaseIdentity(parseIdentity(identity))}`;
export const MIGRATION_OUTCOMES=Object.freeze([
  'Adapt the facade and consuming modules to changed public API signatures and command contracts, recording the reviewed host evidence.',
  'Review App and Core document changes and preserve generation, shape, identity, CAS, routing and metadata partial-success safety.',
  'Rebase or explicitly retain the palette exception using reviewed originals, native action parity and guarded patch applicability.',
  'Rebase or explicitly retain the feedback exception using reviewed originals, native action parity and guarded patch applicability.',
  'Record reviewed stock and binary provenance and resolve every failed, blocked or unavailable check in the migration report.',
]);
const escape=value=>String(value).replaceAll('`','\\`').replace(/[\r\n]/g,' ');
export function migrationTitle(identity) {
  const versions=parseIdentity(identity);
  return `chore(herdr): Herdr ${versions.app??`Core ${versions.core}`} migration`;
}
export function migrationBody(identity) {
  const versions=parseIdentity(identity);
  return `## Proposal\n\nReview and migrate Custom for ${Object.entries(versions).map(([c,v])=>`${c==='app'?'Herdr App':'herdr-core'} ${v}`).join(' and ')} using the generated report in ${migrationRoot(identity)}/report.md. Candidate evidence does not authorize runtime policy changes or native patch adoption.\n\n## Implementation\n\n${MIGRATION_OUTCOMES.map(s=>`- [ ] ${s}`).join('\n')}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify({version:3,change:migrationChange(identity)},null,2)}\n\`\`\`\n\n</details>\n`;
}
export function handoff(identity,prUrl='the URL of this proposal') {
  return `After the person approves the plan, give an agent this task:\n\n> The plan in ${prUrl} is approved for implementation. Continue its existing branch ${migrationBranch(identity)} and OpenSpec change ${migrationChange(identity)}. Read ${migrationRoot(identity)}/report.md, resolve its file-specific checklist and rerun the listed checks. Preserve capability-based runtime safety and native updates. Do not create another PR, mark ready or merge. If behavior must change, revise the plan and relevant OpenSpec deltas first.\n\nCrew: start a ship task with this instruction, or resume its existing worker using crew tell. Crew's separate task branch is not permission to replace the proposal branch; use supported task/worktree attachment, and report an attachment blocker instead of making a second migration PR. No agent is spawned automatically.\n`;
}
export function renderMigrationReport(report,identity,{prUrl,artifactUrl,date=report.generatedAt??'undated'}={}) {
  parseIdentity(identity);
  const evidenceLink=(file,label=file)=>artifactUrl?`[${label}](${artifactUrl}) (artifact path \`${safePath(file)}\`)`:`[${label}](${safePath(file)})`;
  const lines=[`# ${migrationTitle(identity).replace('chore(herdr): ','')}`,`\nGenerated: ${escape(date)}`,`\nBase: \`${report.baseSha}\`; evaluated head: \`${report.headSha}\`.${report.worktreeDirty?' **Dirty working tree: this local preview includes uncommitted changes and cannot be published.**':''}`,
    '\nThis is source/fixture evidence, not certification of an installed binary or native UI. Native updates and capability/shape gates remain unchanged. Unknown native bytes stay advisory skips; old owned feedback can remain retained but unreviewed.',
    '\n## Versions and provenance'];
  for(const c of ['app','core']) {
    const release=report.discovery.releases[c];
    lines.push(`- ${c}: ${release?`${release.version}; commit ${release.commit??'UNAVAILABLE'}; latest feed version ${release.feed?.version??'unavailable'}; feed SHA-256 ${release.feedSha256}`:'UNAVAILABLE'}${report.discovery.errors[c]?`; ${escape(report.discovery.errors[c])}`:''}`);
    const pin=c==='app'?report.inventory.appSource:report.inventory.coreSource;
    lines.push(`  - Reviewed source: ${pin.appVersion??pin.coreVersion} at ${pin.commit}${release?.commit?`; [immutable comparison](https://github.com/${pin.repository}/compare/${pin.commit}...${release.commit})`:''}`);
    lines.push(`  - Document review versions: ${report.inventory.documents[c].join(', ')}`);
  }
  if(report.checks.compatibility)lines.push(`- Evaluated-checkout compatibility: ${evidenceLink('candidate-compatibility.json')}; trusted baseline mappings: ${evidenceLink('baseline-compatibility.json')}. Candidate adapter fixes affect the host verdict; historical upstream deltas still require review.`);
  lines.push(`- Host API reviews: ${report.inventory.host.versions.join(', ')}; profiles: ${report.inventory.host.profiles.join(', ')}`);
  lines.push(`- Stock baseline versions: ${Object.keys(report.inventory.baselines).join(', ')}. Missing coverage is not an older-baseline fallback.`);
  lines.push('\n## Step-by-step checks','\n| Step | Result | Operation | Details / log |','| --- | --- | --- | --- |');
  for(const step of report.steps)lines.push(`| ${escape(step.name)} | **${step.status}** | ${escape(step.operation).replaceAll('|','\\|')} | ${escape(step.detail).replaceAll('|','\\|')} — ${evidenceLink(step.evidence,'details')}${step.exitCode!==undefined?`; exit ${step.exitCode}`:''} |`);
  lines.push('\n## Consumed contracts and evidence');
  for(const [key,label] of [['apiDelta','API/type'],['commandDelta','Command']])for(const change of report.checks[key]??[])lines.push(`- ${label} \`${escape(change.name)}\`: ${change.after===null?'removed':'changed'}; consumers: ${(report.checks.consumers?.[change.name]??[]).map(f=>`\`${f}\``).join(', ')||'facade/transitive declaration'}`);
  for(const patch of report.inventory.patches) {
    const result=report.checks[patch.id];lines.push(`- **${patch.id}**: ${result?`source ${result.sourceMatch?'matches a reviewed original':'changed'}; ${result.binaryApplicability}`:'blocked; see prerequisite failures'}. Local sources: ${(patch.mains??[patch.main]).map(file=>`\`${file}\``).join(', ')}.`);
    for(const original of result?.originals??[])lines.push(`  - \`${original.file}\`: ${original.match?'exact match':'changed'}; ${evidenceLink(original.candidateDiff,'candidate hunks')}; ${evidenceLink(original.customDiff,'Custom hunks')}; replacement \`${original.main??patch.main}\``);
    if(result?.provenance) {
      const record=result.provenance;
      lines.push(`  - Reviewed native provenance: ${evidenceLink(`${patch.id}-provenance.json`)} from \`${record.file}\` (SHA-256 ${record.sha256}); releases ${record.data.releases.map(r=>r.tag).join(', ')}.`);
      if(record.data.installedVerification)lines.push(`  - Prior read-only binary verification: ${record.data.installedVerification.release}, executable SHA-256 ${record.data.installedVerification.executableSha256}, original \`${record.data.installedVerification.original}\`. This is recorded evidence, not a new inspection of the current host.`);
    }
  }
  lines.push(artifactUrl?`\nThis run did not replace committed proposal evidence. Download the current report, scoped hunks, candidate manifests and full bounded logs from the [Actions artifact](${artifactUrl}); open report.md inside it. Evidence links below point to that run and name each artifact path.`:'\nAll scoped hunks and candidate manifests are committed beside this report. Full bounded logs are also retained in the Actions artifact; tracked log files contain a bounded excerpt when the full log is longer.');
  lines.push('Whole-tree changed-path inventories flag dependencies outside the primary diff, not a claim that those dependencies were reviewed.');
  lines.push('\n## Agent migration checklist');
  for(const action of report.actions)lines.push(`\n- [ ] **${escape(action.id)}**: ${escape(action.problem)}\n  - Touch: ${action.files.map(f=>`\`${safePath(f)}\``).join(', ')}\n  - Evidence: ${action.evidence.map(f=>evidenceLink(f)).join(', ')}\n  - Check: \`${escape(action.command)}\``);
  lines.push('\n## Mechanical work already done','\nFeed snapshots and immutable commits resolved where available; consumed-source and every-native-original diffs generated; candidate-only hashes and inventories recorded; build/fixture/test results collected; this migration plan scaffolded. No reviewed original, baseline, opt-in or runtime review list was changed automatically.', '\n## Native proof still required','\nSeparately authorize disposable native checks for embedded-original provenance, frame interactions and tab/session continuity. Do not test document mutations on existing sessions. An unchanged name or source hunk cannot prove CAS/durability semantics.', '\n## Agent continuation',handoff(identity,prUrl));
  return lines.join('\n')+'\n';
}
export function migrationFiles(report,identity,{date=new Date().toISOString().slice(0,10)}={}) {
  const root=migrationRoot(identity),change=migrationChange(identity),prefix=`openspec/changes/${change}`;
  const files={};
  for(const [name,content] of Object.entries(report.evidence)) {
    safePath(name);
    files[`${root}/${name}`]=name.startsWith('logs/')&&content.length>16000?content.slice(0,8000)+'\n[Full bounded output in Actions artifact]\n'+content.slice(-8000):content;
  }
  files[`${root}/report.md`]=renderMigrationReport(report,identity);
  const {evidence,...metadata}=report;
  files[`${root}/report.json`]=JSON.stringify({...metadata,evidenceFiles:Object.keys(evidence)},null,2)+'\n';
  files[`${prefix}/.openspec.yaml`]=`schema: spec-driven\ncreated: ${date}\nskip_specs: true\n`;
  files[`${prefix}/proposal.md`]=`# Proposal\n\n## Why\n\n${identity} needs compatibility review. The report identifies degraded or unavailable evidence without blocking native updates.\n\n## What Changes\n\n- Resolve the file-specific actions in ${root}/report.md.\n- Candidate evidence only is generated; the person approves migrations before implementation.\n\n## Capabilities\n\nNo behavior changes are assumed by this evidence scaffold (skip_specs: true). If the migration changes behavior, revise the plan with the relevant existing capability deltas before implementation.\n\n## Impact\n\nSee the immutable source comparisons, consumed contracts, native hunks and checklist in ${root}/report.md.\n`;
  files[`${prefix}/design.md`]=`# Design\n\n## Context\n\nBase ${report.baseSha}; evaluated head ${report.headSha}. See ${root}/report.md for every verdict and file-specific action.\n\n## Decisions\n\nKeep candidate evidence separate from reviewed stock and native originals. Preserve capability, generation, shape, ownership and recovery safeguards. No automatic native rebase or policy approval was performed. Native binary and interaction proof requires separately authorized disposable hosts.\n`;
  files[`${prefix}/tasks.md`]=MIGRATION_OUTCOMES.map((outcome,i)=>`## ${i+1}. ${['Public host contracts','Document compatibility','Palette exception','Feedback exception','Stock provenance and remaining checks'][i]}\n\n- [ ] ${i+1}.1 ${outcome} Use the file-specific evidence and verification commands in ${root}/report.md.\n`).join('\n');
  return files;
}
