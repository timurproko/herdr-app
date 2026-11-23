// Protocol-1, public invalidation metadata only. No payloads or credential facts.
export const RELAY_EVENTS = ['check_run','check_suite','status','workflow_run','pull_request','push'];
const branch = value => typeof value === 'string' && value.length > 0 && value.length <= 255
  && !/[\x00-\x20\x7f~^:?*\[\\]/.test(value) && !value.includes('..') && !value.includes('@{');
export function relayNotice(value) {
  if (value?.type !== 'github' || !RELAY_EVENTS.includes(value.event)
      || typeof value.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository)
      || value.repository.length > 201 || typeof value.delivery !== 'string' || !/^[A-Za-z0-9-]{1,100}$/.test(value.delivery)) return null;
  const result = { type:'github', repository:value.repository, event:value.event, delivery:value.delivery };
  if (value.event === 'push' && branch(value.ref) && value.ref.startsWith('refs/heads/')) result.ref = value.ref;
  if (value.event === 'pull_request') {
    if (typeof value.action === 'string' && /^[a-z_]{1,40}$/.test(value.action)) result.action = value.action;
    if (typeof value.merged === 'boolean') result.merged = value.merged;
    if (branch(value.base)) result.base = value.base;
  }
  return result;
}
export function mainChanged(value, repository, base = 'main') {
  const event = relayNotice(value);
  return Boolean(event && event.repository.toLowerCase() === repository.toLowerCase()
    && (event.event === 'push' && event.ref === `refs/heads/${base}`
      || event.event === 'pull_request' && event.action === 'closed' && event.merged === true && event.base === base));
}
