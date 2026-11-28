// Pure per-mod resolver registration. Only a pin event captures these scalars;
// no host writes, notifications, IO or native objects belong in a location read.
const resolvers = new Map();
let resolvePullContext = () => null;
export function registerPanelSource(view, resolve) { resolvers.set(view, resolve); }
export function registerPanelPullContext(resolve) { resolvePullContext = resolve; }
const providerKeys = ['provider','scope','parent','machine','home','owner','ownerTab','ownerPane'];
function cleanPullSource(value) {
  if (value?.mode === 'folder') return {mode:'folder'};
  if (value?.mode !== 'tasks') return {mode:'unavailable'};
  const identity = value.identity;
  if (!identity || !providerKeys.every(key=>scalar(identity[key])) || !identity.scope || !identity.parent) return null;
  return {mode:'tasks',identity:Object.fromEntries(providerKeys.map(key=>[key,identity[key] ?? null]))};
}
export function namedPullNumber(tab) {
  const match = tab?.named === true ? /^(?:PR\s*#?\s*|#)?([1-9]\d*)$/i.exec(tab.name?.trim() ?? '') : null;
  const number = match ? Number(match[1]) : null;
  return Number.isSafeInteger(number) ? number : null;
}
const scalar = value => value == null || typeof value === 'string' && value.length <= 4096 && !/[\x00-\x1f\x7f]/.test(value);
export function cleanPanelSource(value) {
  if (!value || !['cwd','on','space','tab','terminal','app'].every(key => scalar(value[key]))) return null;
  if (value.pullNumber != null && (!Number.isSafeInteger(value.pullNumber) || value.pullNumber < 1)) return null;
  const git = cleanPullSource(value.git);
  if (!git) return null;
  return {...Object.fromEntries(['cwd','on','space','tab','terminal','app','pullNumber'].map(key => [key,value[key] ?? null])),git};
}
export function capturePanelSource(view) {
  const source = cleanPanelSource(resolvers.get(view)?.());
  if (!source) return null;
  // Capture mode/provenance once at the event, for either starting view. No
  // inventory, verification token or action permission enters the held record.
  const context = resolvePullContext(source.space);
  // A provisional presentation (for example cold coordinator Loading) has no
  // immutable home scope yet. Keep the toggle unpressed until verification;
  // never freeze a temporary identity which cannot match its eventual source.
  if (context?.stale === true) return null;
  const git = context ? cleanPullSource({mode:'tasks',identity:{...context,parent:context.parent ?? source.space}}) : {mode:'folder'};
  return git ? {...source,git} : null;
}
