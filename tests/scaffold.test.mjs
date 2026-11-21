import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('standalone package retains the project identity and MIT license', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'herdr-app');
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, 'MIT');
});
