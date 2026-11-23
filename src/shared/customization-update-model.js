// The user-visible name lives here only, independent of native Herdr branding.
export const CUSTOMIZATION_LABEL = 'herdr-app-custom';
export const CUSTOMIZATION_UPDATE_KEY = 'custom.customization-update';
const ok = row => ['deployed', 'already current'].includes(row?.action);
// Kept identical to the standalone update worker's policy (matrix-tested).
// Only pre-dispatch unavailability and the deliberate desktop exclusion are quiet.
export const peerSkipKind = row => row?.action !== 'skipped' || row.outcome === 'unknown' ? null
  : /^offline \((?:offline|unreachable|disconnected)\)$/.test(row.reason) ? 'offline'
  : row.reason === 'needs its own full deploy' ? 'desktop' : null;
export function updateProjection(snapshot) {
  const result = snapshot?.result;
  return {
    revision: snapshot?.revision || null, check: snapshot?.check || null,
    checking: snapshot?.checking === true, locked: snapshot?.locked === true,
    log: snapshot?.log || '', details: snapshot?.details || null, job: snapshot?.job || snapshot?.lastRun || null,
    partial: Boolean(result?.complete && ok(result.results?.find(row => row.machine === 'local')) && result.results.some(row => row.machine !== 'local' && !ok(row) && !peerSkipKind(row))),
  };
}
export const updateAvailable = snapshot => snapshot?.check?.available === true;
const at = millis => { const date = new Date(millis); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
export function customizationRowState(snapshot, { busy = null, error = null, now = Date.now() } = {}) {
  const revision = snapshot?.revision?.slice(0, 7);
  const title = revision ? `${CUSTOMIZATION_LABEL} ${revision}` : CUSTOMIZATION_LABEL;
  const job = snapshot?.job, check = snapshot?.check;
  const details = snapshot?.details || (snapshot?.log ? { kind: 'log', path: snapshot.log } : null);
  const log = details ? ` ${details.kind === 'log' ? 'Log' : 'Details'}: ${details.path}` : '';
  const launch = snapshot?.launch;
  const unknown = (launch && launch.deadline < now) || job?.state === 'unknown' || (job?.state === 'running' && job.deadline < now);
  const running = busy === 'launch' || ((launch || job?.state === 'running') && !unknown);
  const checking = busy === 'check' || snapshot?.checking;
  const freshAfterFailure = !job?.finished || (check?.attempted || 0) > job.finished;
  const canUpdate = !unknown && !running && !snapshot?.locked && !check?.error && updateAvailable(snapshot) && (job?.state !== 'failed' || freshAfterFailure);
  let description, current = false;
  if (running) description = 'Updating all machines…';
  else if (unknown) description = `Update outcome unknown${job?.error ? `: ${job.error}` : ''}. Inspect ${details?.kind === 'result' ? 'details' : 'log'}: ${details?.path || 'unavailable'}`;
  else if (error) description = error;
  else if (job?.state === 'failed') description = `Update failed: ${job.error || 'inspect log'}. Recovery: documented rollback.${log}`;
  else if (check?.error) description = 'Check failed. Try again.';
  else if (snapshot?.partial || job?.state === 'partial') description = `Desktop updated; some machines skipped or failed.${log}`;
  else if (['complete', 'partial'].includes(job?.state) && (check?.attempted || 0) < job.finished) description = 'Updated. Check now.';
  else if (updateAvailable(snapshot)) description = 'Update available.';
  else if (check?.checked && snapshot?.revision) {
    description = `Up to date. Checked at ${at(check.checked)}.`;
    current = check.available === false && !snapshot?.locked;
  }
  else description = 'Not checked.';
  return { title, description, current, action: canUpdate ? 'launch' : 'check', label: running ? 'Updating…' : checking ? 'Checking…' : canUpdate ? 'Update' : 'Check now', enabled: !busy && !running && !checking };
}
