// Pure metadata validation: never inspect, scroll, or send input to a terminal.
export function previewLink(value) {
  if (typeof value !== 'string' || value.length > 8192 || /[\s\x00-\x1f\x7f]/.test(value)) return null;
  const match = value.match(/^(https?):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\[::\])(?::([0-9]+))?(?:[/?#][^\s]*)?$/i);
  if (!match) return null;
  const port = Number(match[3] || (match[1].toLowerCase() === 'https' ? 443 : 80));
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  // Health probes are not useful browser landing pages; keep query-bearing URLs exact.
  const url = /[?#]/.test(value) ? value : value.replace(/\/(?:api\/ping|health|healthz|readyz|livez)\/?$/, '/');
  return {url, label: `localhost:${port}`};
}

// Match the helper's SSH-forward identity: paths, scheme and IPv4 aliases share a port.
export function previewEndpoint(machine, value) {
  const link = previewLink(value);
  if (!link) return null;
  const match = link.url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
  const host = match[1].startsWith('[') ? '::1' : '127.0.0.1';
  return JSON.stringify([machine ?? null, host, Number(link.label.slice('localhost:'.length))]);
}

// What the status bar calls a preview when its terminal names it (label custom.preview.label,
// set by the tool that published the page: "Lavish"). A short plain name or nothing.
export function previewName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,23}$/.test(name) ? name : null;
}

// Terminals asking for their preview to be opened now: label custom.preview.open holds the
// time of the request in milliseconds (set by the tool that published the page, e.g.
// `crew show`). Each request is honoured once: `handled` maps a terminal to the last request
// opened for it, and a request older than maxAge (an app start long after it) is left alone.
// The machine is the prefix of a remote terminal's address; null for this computer.
export function previewOpenRequests(terminals, handled, now, maxAge = 15 * 60000) {
  const requests = [];
  for (const terminal of Array.isArray(terminals) ? terminals : []) {
    const stamp = terminal?.labels?.['custom.preview.open'];
    if (terminal?.state !== 'live' || typeof stamp !== 'string' || !/^[0-9]{13}$/.test(stamp)) continue;
    const link = previewLink(terminal.labels['custom.preview.url']);
    if (!link || handled?.[terminal.address] === stamp || Math.abs(now - Number(stamp)) > maxAge) continue;
    const cut = terminal.address.indexOf('/');
    requests.push({ address: terminal.address, stamp, link, machine: cut > 0 ? terminal.address.slice(0, cut) : null });
  }
  return requests;
}
