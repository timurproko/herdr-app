import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadMod} from '../../../tools/plugin-harness.mjs';
let calls = [], reply = {version: 1, ok: true, data: {configured: true, allowedBoards: 2, localWrites: false}};
const ns = await loadMod({modules: {'space-color-state.js': {currentSpaceColor: () => null}}, host: {checking: () => false, appHome: () => 'X:/fixture', exec: async (program, args) => {calls.push([program, args]); return {code: 0, stdout: JSON.stringify(reply)};}},
  entry: "import plugin from './plugins/trello/plugin.js'; export {plugin};"});
assert.equal(ns.plugin.defaultEnabled, false); assert.equal(ns.plugin.settings[0].default, 'read-only');
assert.equal((await ns.plugin.prerequisites[0].check()).status, 'ready');
assert.equal(JSON.stringify(calls[0]), JSON.stringify(['node', ['X:/fixture/.customizations/runtime/lib/trello/cli.cjs', 'status', '--home', 'X:/fixture']]));
reply = {version: 1, ok: true, data: {configured: false}};
assert.equal((await ns.plugin.prerequisites[0].check()).status, 'missing');
reply = {rawSecret: 'must never surface'};
assert.ok(!JSON.stringify(await ns.plugin.prerequisites[0].check()).includes('must never surface'));
assert.equal(ns.plugin.prerequisites[0].fix, undefined);
assert.ok(!fs.readFileSync(fileURLToPath(new URL('./plugin.js', import.meta.url)), 'utf8').includes('gpui-kit'));
console.log('PASS: declarative off-by-default Trello plugin, sanitized local prerequisites and no automatic provisioning');
