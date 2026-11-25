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

test('workflow ignores label-only changes and preserves other PR triggers and supersession', () => {
  const workflow = readFileSync(new URL('../.github/workflows/tests.yml', import.meta.url), 'utf8');
  const prTrigger = workflow.match(/^  pull_request:\n([\s\S]*?)(?=^  \w)/m)?.[1];
  assert.ok(prTrigger, 'pull_request trigger is present');
  const types = prTrigger.match(/types: \[([^\]]+)\]/)?.[1].split(',').map(type => type.trim());
  assert.deepEqual(types, ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft', 'edited']);
  assert.ok(workflow.includes("group: ${{ github.event_name == 'pull_request' && format('ci-pr-{0}', github.event.pull_request.number) || format('ci-run-{0}', github.run_id) }}"));
  assert.match(workflow, /cancel-in-progress: true/);
});

test('review label additions call only the separate advisory workflow', () => {
  const workflow = readFileSync(new URL('../.github/workflows/review-labels.yml', import.meta.url), 'utf8');
  assert.equal(workflow.trim(), `# Copy to .github/workflows/review-labels.yml; keep delivery/test callers free of label events.
name: Review labels

on:
  pull_request_target:
    types: [labeled]

permissions:
  contents: read
  pull-requests: read

jobs:
  review-labels:
    uses: timurproko/MyWorkflows/.github/workflows/review-labels.yml@main
    secrets:
      app_id: \${{ vars.DELIVERY_BOT_APP_ID }}
      app_private_key: \${{ secrets.DELIVERY_BOT_PRIVATE_KEY }}`);
  const delivery = readFileSync(new URL('../.github/workflows/delivery.yml', import.meta.url), 'utf8');
  const types = delivery.match(/types: \[([^\]]+)\]/)?.[1].split(',').map(type => type.trim());
  assert.deepEqual(types, ['opened', 'synchronize', 'ready_for_review', 'converted_to_draft', 'reopened', 'edited', 'closed']);
});

test('protection adds the advisory caller without changing required checks or existing policy', () => {
  const declarations = JSON.parse(readFileSync(new URL('../.github/protection.json', import.meta.url), 'utf8'));
  assert.deepEqual(declarations, [
    { kind: 'default-branch', checks: ['CI required'], mergeMethods: ['squash'], linearHistory: true },
    { kind: 'workflow-events', workflows: ['.github/workflows/delivery.yml', '.github/workflows/review-labels.yml'], events: ['pull_request_target', 'workflow_dispatch'] },
  ]);
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
