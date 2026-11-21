// Every literal accessibility role in the source must be one the host knows: an unknown
// one (e.g. 'checkbox' for 'check_box') makes the whole view fail to re-render.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const project = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const declarations = path.join(project, '..', 'gpui-kit.d.ts');
if (!fs.existsSync(declarations)) { console.log('SKIP: accessibility roles (no installed gpui-kit.d.ts)'); process.exit(0); }
const block = /export type Role =([\s\S]*?);/.exec(fs.readFileSync(declarations, 'utf8'))?.[1];
assert.ok(block, 'gpui-kit.d.ts declares Role');
const known = new Set([...block.matchAll(/"([a-z_]+)"/g)].map(m => m[1]));
assert.ok(known.has('check_box') && known.has('button'), 'The Role list was read');
const files = [];
const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) walk(full); else if (/\.(m?js|cjs)$/.test(entry.name) && !/\.test\.m?js$/.test(entry.name)) files.push(full);
} };
walk(path.join(project, 'src'));
const unknown = [];
for (const file of files) for (const m of fs.readFileSync(file, 'utf8').matchAll(/\.role\(\s*['"]([^'"]+)['"]\s*\)/g))
  if (!known.has(m[1])) unknown.push(`${path.relative(project, file)}: ${m[1]}`);
assert.deepEqual(unknown, [], 'Every .role(...) literal is a host Role');
console.log(`PASS: accessibility roles: ${files.length} source files use only host-known role names`);
