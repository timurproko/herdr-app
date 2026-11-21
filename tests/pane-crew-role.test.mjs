import assert from 'node:assert/strict';
import fs from 'node:fs';

// The pane header's crew role chip: which terminals get one and what it says. The rule is a
// pure function of the terminal's labels, taken from the header's source and run on its own.
const source = fs.readFileSync(new URL('../src/features/pane/main.js', import.meta.url), 'utf8');
const start = source.indexOf('const CREW_KINDS'), end = source.indexOf('export default class');
assert.ok(start > 0 && end > start, 'The role rule is in the pane header');
const crewRole = new Function(`${source.slice(start, end).replace('export function', 'function')}; return crewRole;`)();

assert.equal(crewRole({ 'custom.crew.home': '1', 'herdr.space': 's' }), 'Crew', 'The coordinator a profile started');
for (const [kind, label] of [['scout', 'Scout'], ['ship', 'Ship'], ['review', 'Review'], ['fix', 'Fix']])
  assert.equal(crewRole({ 'crew.task': 't1', 'crew.kind': kind }), label);
assert.equal(crewRole({ 'crew.task': 't1' }), 'Worker', 'A worker of an older crew, without a kind');
assert.equal(crewRole({ 'crew.task': 't1', 'crew.kind': 'constructor' }), 'Worker', 'Only known kinds are named');
for (const labels of [null, undefined, {}, { 'crew.kind': 'ship' }, { 'crew.task': '' }, { 'custom.crew.home': '0' }, 'x'])
  assert.equal(crewRole(labels), null, 'An ordinary terminal has no chip');
assert.ok(source.includes('rolePill(t, role, { status: true })') && source.includes('.absolute().inset_0()'), 'Drawn as the sidebar’s status pill, centred over the header');
console.log('PASS: pane header crew role (coordinator, worker kinds, ordinary terminals)');
