// Pure per-mod resolver registration. Only a pin event captures these scalars;
// no host writes, notifications, IO or native objects belong in a location read.
const resolvers = new Map();
export function registerPanelSource(view, resolve) { resolvers.set(view, resolve); }
export function namedPullNumber(tab) {
  const match = tab?.named === true ? /^(?:PR\s*#?\s*|#)?([1-9]\d*)$/i.exec(tab.name?.trim() ?? '') : null;
  const number = match ? Number(match[1]) : null;
  return Number.isSafeInteger(number) ? number : null;
}
const scalar = value => value == null || typeof value === 'string' && value.length <= 4096 && !/[\x00-\x1f\x7f]/.test(value);
export function cleanPanelSource(value) {
  if (!value || !['cwd','on','space','tab','terminal','app'].every(key => scalar(value[key]))) return null;
  if (value.pullNumber != null && (!Number.isSafeInteger(value.pullNumber) || value.pullNumber < 1)) return null;
  return Object.fromEntries(['cwd','on','space','tab','terminal','app','pullNumber'].map(key => [key,value[key] ?? null]));
}
export function capturePanelSource(view) { return cleanPanelSource(resolvers.get(view)?.()); }
