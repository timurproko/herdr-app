// Crew owns delivery selection. Human project output is never a source of kinds.
export const PROJECT_KINDS = Object.freeze([['plain', 'Plain'], ['workflow', 'Delivery'], ['gate', 'Gate']].map(Object.freeze));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.length > 0 && v.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(v);
export const absoluteProjectPath = v => text(v) && !/(?:^|[\\/])\.{1,2}(?:[\\/]|$)/.test(v) &&
  (/^[a-z]:[\\/]/i.test(v) || /^\\\\[^\\]+\\[^\\]+/.test(v) || v.startsWith('/'));
const name = v => typeof v === 'string' && /^(?=.{1,40}$)(?!.*\.\.)(?!.*\.$)\.?[a-z0-9][a-z0-9.-]*$/.test(v);
export const isProjectKind = v => PROJECT_KINDS.some(([kind]) => kind === v);
export const projectKindJson = text => { try { return JSON.parse(text); } catch { return null; } };
export const projectKindEnvelope = v => object(v) && v.capability === 'project-kinds' && v.version === 1;
export const projectKindCapability = v => projectKindEnvelope(v) && v.listJson === true && v.setKind === true &&
  v.explicitHome === true && v.expectedPath === true && Array.isArray(v.kinds) && PROJECT_KINDS.every(([kind]) => v.kinds.includes(kind));
const pathKey = path => {
  const normalized = path.replace(/\\/g, '/').replace(/\/$/, '');
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith('//') ? normalized.toLowerCase() : normalized;
};
export const sameProjectPath = (a, b) => absoluteProjectPath(a) && absoluteProjectPath(b) && pathKey(a) === pathKey(b);
export const validKindProject = p => object(p) && name(p.name) && absoluteProjectPath(p.path) && isProjectKind(p.kind);
export function projectKindRows(v) {
  if (!projectKindEnvelope(v) || v.ok !== true || !absoluteProjectPath(v.home) || !Array.isArray(v.projects) || v.projects.length > 10000) return null;
  const names = new Set();
  for (const p of v.projects) {
    if (!validKindProject(p) || names.has(p.name)) return null;
    names.add(p.name);
  }
  return v.projects.map(p => {
    const path = p.path.replace(/\//g, '\\');
    return { id: p.name, label: path, path,
      choice: { value: p.kind, identity: JSON.stringify([v.home, p.name, p.path]), revision: JSON.stringify([v.home, p.name, p.path, p.kind]) },
      kindTarget: { home: v.home, name: p.name, path: p.path, kind: p.kind } };
  });
}
const readFailure = () => new Error('Could not read Crew projects. Refresh to try again.');
const usableReply = r => r && !r.missing && !r.timedOut && typeof r.code === 'number';
// One bounded probe per Projects check. Older Crew can print help while ignoring flags.
export async function readProjectKinds(ask, parseLegacy) {
  const probe = await ask(['--capabilities', '--json']);
  if (!usableReply(probe)) throw readFailure();
  const supported = probe.code === 0 && projectKindCapability(projectKindJson(probe.stdout));
  if (probe.code !== 0 && !([1, 2].includes(probe.code) && /(?:usage:|unknown (?:option|flag|project)|unsupported|unrecognized)/i.test(probe.stderr || probe.stdout))) throw readFailure();
  const r = await ask(supported ? ['list', '--json'] : ['list']);
  if (!usableReply(r) || r.code !== 0) throw readFailure();
  const rows = supported ? projectKindRows(projectKindJson(r.stdout)) : parseLegacy(r.stdout);
  if (!rows) throw readFailure();
  return { rows, kindSupported: supported };
}
