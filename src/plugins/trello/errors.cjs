'use strict';
// Only these messages can cross the worker boundary. Never forward provider errors.
const messages = {
  INPUT: 'Invalid command or input. See herdr-trello --help.',
  STORE: 'Private Trello storage is missing, invalid or unsafe. Check local setup and permissions.',
  STORE_MISSING: 'A private Trello setup file is missing on this machine.',
  STORE_MALFORMED: 'Private Trello configuration has invalid JSON or an unsupported schema. It was not replaced.',
  STORE_PERMISSIONS: 'Private Trello storage has the wrong owner or allows another user access. Restrict it before continuing.',
  STORE_PERMISSION_CHECK: 'Private Trello storage permissions could not be verified. Check this machine’s ACL tooling; access remains refused.',
  STORE_IN_CHECKOUT: 'Private Trello storage is inside a Git checkout. Use a private home outside the checkout.',
  STORE_UNSAFE_PATH: 'Linked, non-regular or multiply linked private Trello storage is refused.',
  STORE_BUSY: 'Private Trello configuration is locked. Check the active setup operation before retrying.',
  STORE_IO: 'Private Trello storage could not be read or updated. Check filesystem access.',
  PUBLIC_STATE_INVALID: 'This host’s Trello activation or Access configuration could not be validated. No access was granted.',
  INTERNAL: 'Trello could not finish because of an internal error. No retry was started.',
  CONTROL_CONFLICT: 'This host is managed by another Trello controller or identity. Remove its account explicitly before adopting it.',
  CONFLICT: 'Local Trello configuration changed or already exists; inspect it before retrying.',
  DISABLED: 'Enable Trello in Settings > Plugins before accessing boards.',
  SCOPE: 'The board or child identity is not verified in the local allowlist.',
  READ_ONLY: 'Writes require public read-write mode and the separate local write opt-in.',
  STALE: 'Trello authority changed during this command. No follow-up was started.',
  AUTH: 'Trello rejected the API key or user token. Check expiry or revoke and rotate locally.',
  FORBIDDEN: 'Trello refused access with this user token.',
  NOT_FOUND: 'Trello did not resolve this permitted resource.',
  RATE_LIMIT: 'Trello rate limit: wait until retryAt before an explicit retry.',
  REMOTE: 'Trello returned an unsuccessful response.',
  TRANSPORT: 'The Trello read did not complete. Retry explicitly when ready.',
  RESPONSE: 'The Trello response was invalid or exceeded a safety bound.',
  LIMIT: 'This command reached its request or time bound; narrow the request.',
  ATTACHMENT_LINK: 'This attachment is an external link. Only metadata is returned; no URL was fetched.',
  ATTACHMENT_TYPE: 'Attachment MIME or image signature is unsupported or inconsistent. Other uploaded types require --allow-other-types; files are never opened automatically.',
  ATTACHMENT_SIZE: 'The selected attachment exceeds the 20 MiB download limit. Try an available smaller preview.',
  ATTACHMENT_PREVIEW: 'This attachment has no usable scaled image preview. List its metadata or explicitly request the original.',
  WRITE_CHANGED: 'Trello acknowledged the write, but local authority changed. No result content or follow-up is available; inspect the board before another action.',
  UNKNOWN_WRITE: 'Write outcome unknown. Read the card and its comments/checklists before any explicit retry; this command will not replay it.',
};
// Provider material is matched, never echoed. Unknown text/statusText is ignored.
const {STATUS_CODES} = require('node:http');
const reasons = new Map([
  ['invalid key', 'Invalid API key'], ['invalid token', 'Invalid token'],
  ['invalid id', 'Invalid resource ID'], ['permission denied', 'Permission denied'],
  ['access denied', 'Access denied'], ['unauthorized permission requested', 'Permission denied'],
  ['unauthorized card permission requested', 'Card access denied'],
  ['card not found', 'Card not found'], ['board not found', 'Board not found'],
  ...['filter', 'fields', 'attachments', 'actions', 'checklists', 'members', 'pluginData', 'stickers'].map(k => [`invalid value for ${k}`, `Invalid value for ${k}`]),
]);
function httpDetails(status, reason) {
  if (!Number.isInteger(status) || status < 100 || status > 599) return {};
  const phrase = STATUS_CODES[status] || 'HTTP rejection';
  return {httpStatus: status, httpReason: phrase + ([...reasons.values()].includes(reason) ? `: ${reason}` : '')};
}
function providerReason(text, credentials) {
  if (typeof text !== 'string' || [credentials?.apiKey, credentials?.token].some(s => s && text.includes(s))) return;
  let value = text.trim();
  try { const json = JSON.parse(value); value = typeof json === 'string' ? json : json?.message ?? json?.error; } catch {}
  return reasons.get(value);
}
class TrelloError extends Error {
  constructor(code, extra = {}) { super(messages[code] || messages.RESPONSE); this.code = code in messages ? code : 'RESPONSE'; Object.assign(this, extra); }
}
const fail = code => { throw new TrelloError(code); };
// Wall-clock time is reserved for persisted rate limits. Execution budgets use a
// monotonic clock, and children can never outlive the command which owns them.
class Deadline {
  constructor(duration = 60000, clock = () => performance.now(), parent = null, code = 'LIMIT') {
    this.clock = clock; this.parent = parent; this.code = code;
    this.end = clock() + Math.max(1, Math.min(duration, 60000));
  }
  remaining() {
    const parent = this.parent ? this.parent.remaining() : Infinity;
    const left = Math.min(parent, this.end - this.clock());
    if (left <= 0) fail(this.code);
    return left;
  }
  check() { this.remaining(); }
  timeout(max = 10000) { return Math.max(1, Math.ceil(Math.min(max, this.remaining()))); }
  expire() { this.end = -Infinity; }
}
function publicError(error, {configurationUnknown = false} = {}) {
  const safe = error instanceof TrelloError ? error : new TrelloError('INTERNAL');
  // Reconstruct the phrase at the public boundary; even forged extras cannot leak.
  const details = httpDetails(safe.httpStatus, safe.providerReason);
  return {code: safe.code, ...details, message: messages[safe.code] + (details.httpStatus ? ` HTTP ${details.httpStatus} ${details.httpReason}.` : '') + (configurationUnknown ? ' Setup may have changed; check status before retrying.' : ''), outcome: configurationUnknown || safe.code === 'UNKNOWN_WRITE' ? 'unknown' : safe.code === 'WRITE_CHANGED' ? 'applied' : 'refused',
    ...(Number.isSafeInteger(safe.retryAt) ? {retryAt: safe.retryAt} : {})};
}
module.exports = {TrelloError, fail, publicError, messages, httpDetails, providerReason, Deadline};
