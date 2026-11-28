import { updateSentence } from './customization-update-model.js';

const at = millis => { const date = new Date(millis); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
const target = row => `${row.name} on ${row.machine ?? 'This computer'}`;
const summary = (rows, text = target) => {
  const values = [...new Set(rows.map(text))];
  return values.slice(0, 2).join('; ') + (values.length > 2 ? `; ${values.length - 2} more` : '');
};

// Pure presentation only. Notification availability and write ownership stay in
// the existing shared controller, independently of this row's current feedback.
export function pluginUpdateRowState(snapshot = {}, { machines = [], fixing = false, closed = false, now = Date.now() } = {}) {
  const connected = machine => machine === null || machines.some(m => m.name === machine && m.layout === 'ready');
  const order = snapshot.machines ?? [null];
  const rank = machine => machine === null ? -1 : order.includes(machine) ? order.indexOf(machine) : order.length;
  const rows = [...(snapshot.rows ?? [])].sort((a, b) => rank(a.machine) - rank(b.machine));
  const pending = rows.filter(row => row.pending && connected(row.machine));
  const failed = rows.filter(row => row.error || ['failed', 'unknown'].includes(row.outcome));
  const updated = rows.filter(row => row.outcome === 'updated').length;
  const busy = snapshot.batch?.running === true;
  const checking = snapshot.scan?.expires > now;
  const check = snapshot.check;
  const covered = [null, ...machines.filter(m => m.layout === 'ready').map(m => m.name)]
    .every(machine => check?.machines?.includes(machine))
    && !rows.some(row => connected(row.machine) && row.known === false);
  let description, current = false;
  const failure = () => updateSentence(summary(failed, row => `${target(row)}: ${String(row.error || 'Update outcome unknown').slice(0, 120)}`));
  if (busy) {
    const active = rows.find(row => row.outcome === 'running') ?? rows.find(row => row.outcome === 'checking') ?? rows.find(row => row.outcome === 'queued');
    description = active ? `${active.outcome === 'checking' ? 'Checking' : 'Updating'} ${target(active)}.` : 'Updating.';
    if (failed.length) description += ` ${failure()}`;
    else if (updated) description += ` ${updated} updated.`;
  } else if (failed.length) description = `${failure()}${updated ? ` ${updated} updated.` : ''}`;
  else if (pending.length) description = `Update available: ${updateSentence(summary(pending))}`;
  else if (checking) description = 'Checking.';
  else if (updated && snapshot.batch?.completed && (!check?.known || !covered)
    && (check?.completed ?? 0) <= snapshot.batch.completed) description = 'Updated. Check now.';
  else if (check?.error || snapshot.error) description = 'Check failed. Try again.';
  else if (check?.checked && check.known && covered) {
    description = `Up to date. Checked at ${at(check.checked)}.`;
    current = true;
  } else description = 'Not checked.';
  return { title: 'herdr-app-plugins', description, current: current && !checking,
    action: pending.length ? 'update' : 'check',
    label: busy ? 'Updating…' : checking ? 'Checking…' : pending.length ? 'Update' : 'Check now',
    enabled: !closed && !fixing && !busy && !checking };
}
