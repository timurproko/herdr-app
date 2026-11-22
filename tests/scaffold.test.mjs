import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {build, project} from '../tools/build.mjs';

test('standalone package retains the project identity and MIT license', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'herdr-app');
  assert.equal(pkg.private, true);
  assert.equal(pkg.license, 'MIT');
});

test('checkout build needs no personal snapshots and ships authored visual defaults', () => {
  const artifacts=path.join(project,'.artifacts');mkdirSync(artifacts,{recursive:true});
  const fixture=mkdtempSync(path.join(artifacts,'snapshot-free-build-'));
  try {
    for(const name of ['src','tools','tests','upstream','docs','README.md','package.json','customization.json'])
      cpSync(path.join(project,name),path.join(fixture,name),{recursive:true});
    assert.equal(existsSync(path.join(fixture,'preferences')),false);
    const {output}=build(fixture);
    for(const [emitted,source] of [['layouts/Custom.json','src/appearance/layouts/Custom.json'],['themes/Custom.json','src/appearance/themes/Custom.json']])
      assert.equal(readFileSync(path.join(output,emitted),'utf8'),readFileSync(path.join(fixture,source),'utf8'));
    assert.equal(existsSync(path.join(output,'preferences')),false);
    assert.equal(existsSync(path.join(fixture,'preferences')),false);
  } finally {rmSync(fixture,{recursive:true,force:true});}
});
