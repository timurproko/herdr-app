import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { requiredProblems } from './ci-required.mjs';

const successful = () => ({ readiness: { result: 'success', outputs: { ready: 'true' } }, openspec: { result: 'success' }, tests: { result: 'success' } });

test('ready head or main succeeds only with every dependency successful', () => {
  assert.deepEqual(requiredProblems(successful()), []);
});

test('failure, cancellation, unexpected skip and missing dependency fail closed', () => {
  for (const name of ['readiness', 'openspec', 'tests']) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      const needs = successful();
      if (result) needs[name].result = result; else delete needs[name];
      assert.ok(requiredProblems(needs).length, `${name}: ${result}`);
    }
  }
});

test('draft or missing readiness output cannot pass', () => {
  for (const ready of ['false', '', undefined]) {
    const needs = successful(); needs.readiness.outputs.ready = ready;
    assert.ok(requiredProblems(needs).includes('candidate is not ready'));
  }
});

test('aggregate command returns nonzero on a skipped suite', () => {
  const needs = successful(); needs.tests.result = 'skipped';
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./ci-required.mjs', import.meta.url))], { env: { ...process.env, NEEDS: JSON.stringify(needs) }, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stderr); assert.match(r.stderr, /tests: expected success, got skipped/);
});

test('workflow keeps draft suites and aggregate disabled and checks both platforms', () => {
  const workflow = readFileSync(new URL('../.github/workflows/tests.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if: needs\.readiness\.outputs\.ready == 'true'/);
  assert.match(workflow, /if: always\(\) && \(github\.event_name != 'pull_request' \|\| !github\.event\.pull_request\.draft\)/);
  assert.match(workflow, /os: \[windows-latest, ubuntu-latest\]/);
  assert.match(workflow, /needs: \[readiness, openspec, tests\]/);
  assert.equal((workflow.match(/name: CI required/g) || []).length, 1);
  assert.match(workflow, /uses: timurproko\/MyWorkflows\/actions\/openspec@main/);
});
