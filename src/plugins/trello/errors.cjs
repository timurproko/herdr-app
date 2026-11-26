'use strict';
// Only these messages can cross the worker boundary. Never forward provider errors.
const messages = {
  INPUT: 'Invalid command or input. See herdr-trello --help.',
  STORE: 'Private Trello storage is missing, invalid or unsafe. Check local setup and permissions.',
  STORE_MISSING: 'Private Trello setup is not saved on this machine.',
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
  WRITE_CHANGED: 'Trello acknowledged the write, but local authority changed. No result content or follow-up is available; inspect the board before another action.',
  UNKNOWN_WRITE: 'Write outcome unknown. Read the card and its comments/checklists before any explicit retry; this command will not replay it.',
};
class TrelloError extends Error {
  constructor(code, extra = {}) { super(messages[code] || messages.RESPONSE); this.code = code in messages ? code : 'RESPONSE'; Object.assign(this, extra); }
}
const fail = code => { throw new TrelloError(code); };
function publicError(error) {
  const safe = error instanceof TrelloError ? error : new TrelloError('INTERNAL');
  return {code: safe.code, message: messages[safe.code], outcome: safe.code === 'UNKNOWN_WRITE' ? 'unknown' : safe.code === 'WRITE_CHANGED' ? 'applied' : 'refused',
    ...(Number.isSafeInteger(safe.retryAt) ? {retryAt: safe.retryAt} : {})};
}
module.exports = {TrelloError, fail, publicError, messages};
