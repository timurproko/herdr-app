// Public settings only. Credentials deliberately live outside shared/plugin preferences.
export const EVENTS = ['check_run', 'check_suite', 'status', 'workflow_run', 'pull_request', 'push'];
export function relayURL(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) return null;
    return url.origin;
  } catch { return null; }
}
export const credentialPath = home => `${home}/.customizations/git-webhook.json`;
export function credentials(text) {
  try {
    const value = JSON.parse(text);
    return /^[a-f0-9]{64}$/.test(value.token) && /^[a-f0-9]{64}$/.test(value.secret) ? value : null;
  } catch { return null; }
}
export const repositoryName = value => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? '') ? value : null;
