import { absoluteProjectPath, isProjectKind, projectKindJson, projectKindCapability, projectKindEnvelope, validKindProject, sameProjectPath } from './project-kinds.js';
const messages = Object.freeze({
  'home-owned': 'another session owns the Crew home; change its projects from that session.',
  'home-missing': 'the Crew home no longer exists; refresh the list.',
  'project-missing': 'Crew no longer has this project; refresh the list.',
  'project-changed': 'the registered folder changed; refresh the list.',
  'kind-unavailable': 'Crew cannot use that delivery kind on this machine.',
  'invalid-arguments': 'Crew did not accept the change; update Crew and refresh the list.',
  'registry-busy': 'Crew is changing its projects; refresh and try again.',
  'internal-error': 'Crew could not save the change.'
});
const failure = (message, uncertain = false) => Object.assign(new Error(message), { uncertain });
const unknown = () => failure('Could not confirm the delivery kind. Refresh before trying again.', true);
const stale = () => failure('The project changed. Refresh before trying again.');
// No legacy add flags: the advertised setter alone owns kind persistence and policy.
export async function setProjectKind(ask, target, value, current = () => true) {
  if (!target || !absoluteProjectPath(target.home) || !validKindProject(target) || !isProjectKind(value) || !current()) throw stale();
  if (value === target.kind) return { value };
  let probe;
  try { probe = await ask(['--capabilities', '--json']); }
  catch { throw failure('Could not check delivery kind support. Refresh before trying again.'); }
  if (!current()) throw stale();
  if (probe?.code !== 0 || probe.missing || probe.timedOut || !projectKindCapability(projectKindJson(probe.stdout)))
    throw failure('Crew does not advertise safe delivery kind editing. Refresh the list.');
  let r;
  try { r = await ask(['set-kind', target.name, '--kind', value, '--home', target.home, '--expected-path', target.path, '--json']); }
  catch { throw unknown(); }
  if (!current()) throw stale();
  if (!r || r.missing || r.timedOut) throw unknown();
  const reply = projectKindJson(r.stdout) ?? projectKindJson(r.stderr);
  if (!projectKindEnvelope(reply) || !sameProjectPath(reply.home, target.home)) throw unknown();
  if (r.code !== 0 && reply.ok === false) {
    const reason = Object.hasOwn(messages, reply.error?.code ?? '') ? messages[reply.error.code] : null;
    throw failure(reason ? `Could not change delivery kind: ${reason}` : 'Could not change delivery kind.');
  }
  if (r.code !== 0 || reply.ok !== true || typeof reply.changed !== 'boolean' || !validKindProject(reply.project) ||
    reply.project.name !== target.name || !sameProjectPath(reply.project.path, target.path) || reply.project.kind !== value) throw unknown();
  return { value };
}
