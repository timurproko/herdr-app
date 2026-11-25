import assert from 'node:assert/strict';
import { loadMod } from '../../../tools/plugin-harness.mjs';

const { projectFailure } = await loadMod({ host: {},
  modules: { 'space-color-state.js': { currentSpaceColor() {} } },
  entry: 'export { projectFailure } from "./plugins/crew/plugin.js";' });
const folder = 'D:/Git/site.dev', name = 'site.dev';
const options = { operation: 'add', name, folder, machine: 'pc2' };
const usage = 'Usage: crew project add <name> <git folder> [--replace] | crew project remove <name> | crew project list';
const rejected = `Could not add ${folder}. Crew did not accept the project name ${name}; update the Crew tool and try again.`;
const cases = [
  [usage, rejected],
  [`  crew: ${usage}\r\nsecond line`, rejected],
  [`Invalid project name: ${name}. Use lowercase letters, digits and dashes.`, rejected],
  [`${folder} is not a git repository.`, `Could not add ${folder}: it is not a git repository; choose a git repository folder.`],
  [`Folder ${folder} does not exist.`, `Could not add ${folder}: the folder does not exist; choose an existing git repository folder.`],
  [`Folder not found: ${folder}`, `Could not add ${folder}: the folder does not exist; choose an existing git repository folder.`],
  [`fatal: cannot find the path '${folder}'`, `Could not add ${folder}: the folder does not exist; choose an existing git repository folder.`],
  [`ENOENT: no such file or directory, open '${folder}'`, `Could not add ${folder}: the folder does not exist; choose an existing git repository folder.`],
  [`Project ${name} already points at D:/Git/old. Pass --replace to point it at ${folder} instead.`, `Could not add ${folder}: Crew already uses the project name ${name}; choose a folder with a different name.`],
  [`Project name ${name} is taken.`, `Could not add ${folder}: Crew already uses the project name ${name}; choose a folder with a different name.`],
  [`Project ${name} is already registered.`, `Could not add ${folder}: it is already registered with Crew; use the existing project.`],
  ['Read-only: this home is owned by terminal t9. Only that session may change its projects.', `Could not add ${folder}: another session owns the Crew home; change its projects from that session.`],
  [`Unknown project: ${name}. See \`crew project list\`.`, `Could not add ${folder}: Crew no longer has this project; refresh the list.`],
  [`Project ${name} is used by unfinished tasks: private-task[working]. Finish them first.`, `Could not add ${folder}: finish its Crew tasks first.`],
  [`Project ${name} still has working copies of finished tasks to return: private-task. They go back once no terminal holds them (crew status --all).`, `Could not add ${folder}: close the terminals holding its finished Crew task copies and try again.`],
  ['', `Could not add ${folder}.`],
  ['\r\n  \t', `Could not add ${folder}.`],
  ['crew: Permission denied. Do not show this sentence.\nDo not show this line.', `Could not add ${folder}. Permission denied.`],
  [`Read failed\n${usage}`, `Could not add ${folder}. Read failed.`],
  [`Read failed ${usage}`, `Could not add ${folder}. Read failed.`],
  ['\u001b[31mConnection refused!\u001b[0m Retry?\r\nStack trace', `Could not add ${folder}. Connection refused.`],
  ['Failed to read D:/Git/site.dev. Extra details.', `Could not add ${folder}. Failed to read D:/Git/site.dev.`],
  ['First line\u2028Second line', `Could not add ${folder}. First line.`],
];
for (const [raw, expected] of cases) {
  const error = projectFailure(raw, options);
  assert.equal(error.message, expected, raw);
  assert.equal(error.folderMessage(folder), expected, 'The renderer receives the same summary');
  const remove = projectFailure(raw, { ...options, operation: 'remove', folder: undefined });
  assert.equal(remove.folderMessage(folder), expected.replace('Could not add', 'Could not remove'), raw);
  assert.doesNotMatch(error.message, /Usage:|\r|\n|private-task|<name>/, 'No raw dump or task inventory');
}
assert.equal(projectFailure(usage, { ...options, outdated: true }).message,
  `Could not add ${folder}. Update the Crew tool on pc2 and try again.`);
assert.equal(projectFailure(usage, { ...options, machine: null, outdated: true }).message,
  `Could not add ${folder}. Update the Crew tool on this computer and try again.`);
assert.ok(projectFailure('x'.repeat(500), options).message.length < 300, 'Unknown output is bounded');

// Real command paths, with base64 transport replies. No external command executes.
const calls = [];
let reply = { code: 1, stdout: '', stderr: JSON.stringify({ error: { message: `Connection refused.\n${usage}` } }) };
const { plugin: wired } = await loadMod({ host: { hc: async args => { calls.push(args); return reply; } },
  modules: { 'space-color-state.js': { currentSpaceColor() {} } },
  entry: 'export { default as plugin } from "./plugins/crew/plugin.js";' });
const context = { setting: () => 'pc2' };
const actions = wired.prerequisites.find(p => p.id === 'projects').list;
await assert.rejects(actions.add(context, folder), e => e.message === `Could not add ${folder}. Connection refused.`);
await assert.rejects(actions.remove(context, name), e => e.folderMessage(folder) === `Could not remove ${folder}. Connection refused.`);
const b64 = text => Buffer.from(text).toString('base64');
for (const [raw, expected] of cases) for (const channel of ['stdout', 'stderr']) {
  reply = { code: 0, stdout: JSON.stringify({ code: 2, stdout: b64(channel === 'stdout' ? raw : ''), stderr: b64(channel === 'stderr' ? raw : '') }) };
  const before = calls.length;
  await assert.rejects(actions.add(context, folder), e => e.message === expected);
  await assert.rejects(actions.remove(context, name), e => e.folderMessage(folder) === expected.replace('Could not add', 'Could not remove'));
  assert.equal(calls.length, before + 2, 'Each operation makes exactly one request, never retries');
}
console.log('PASS: concise Crew project failure mappings, safe fallback and transport errors');
