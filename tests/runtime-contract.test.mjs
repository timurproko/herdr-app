// Static contract checks only: never import/run native screenshot scripts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ciTestPlan} from '../scripts/test-ci.mjs';
const project=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>fs.readFileSync(path.join(project,rel),'utf8');
for(const rel of ['tests/features/pr-agent-native.mjs','tests/features/pr-pin-swap-native.mjs']) {
 const source=read(rel);
 assert.match(source,/const artifacts=fileURLToPath\(new URL\('\.\.\/\.\.\/\.artifacts\/',import\.meta\.url\)\)/);
 assert.match(source,/fs\.mkdirSync\(artifacts,\{recursive:true\}\)/);
 assert.match(source,/path\.join\(artifacts,/);
 assert.doesNotMatch(source,/customizations\/\.work/);
 assert.equal(path.resolve(fileURLToPath(new URL('../../.artifacts/',pathToFileURL(path.join(project,rel))))),path.join(project,'.artifacts'));
}
for(const rel of ['docs/ARCHITECTURE.md','docs/GIT-CORE-MONITOR.md','docs/TAB-MOVE-COMPATIBILITY.md','docs/TAB-MOVE-ADR.md','docs/VALIDATION.md','src/plugins/git/setup-guide.txt','tools/report-ownership.mjs'])assert.doesNotMatch(read(rel),/~\/\.config\/herdr-app\/customizations|customizations\/(?:src|docs|tools)/,rel);
const bash='_herdr_cwd_hook="${HERDR_APP_HOME:-$HOME/.config/herdr-app}/.customizations/runtime/shell/bash-cwd-loader.sh"; if [[ -r $_herdr_cwd_hook ]]; then source "$_herdr_cwd_hook"; fi; unset _herdr_cwd_hook';
const powershell="$herdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }; $cwdHook = Join-Path $herdrHome '.customizations/runtime/shell/powershell-cwd.ps1'; if (Test-Path -LiteralPath $cwdHook -PathType Leaf) { . $cwdHook }; Remove-Variable cwdHook, herdrHome";
for(const line of [bash,powershell])assert.ok(read('README.md').includes(line),'Exact approved profile content remains documented.');
assert.doesNotMatch(read('src/integration/shell/bash-cwd-loader.sh'),/customizations\/src|state\/yadm/);
assert.ok(read('README.md').includes('~/.config/herdr-app/customizations/preferences/pc.json'),'Retain migration provenance.');
for(const platform of ['linux','win32']) {
 const {included}=ciTestPlan(platform);
 for(const source of ['tests/shell-deployment.test.mjs','tests/shell-only.test.mjs','tests/installed-export.test.mjs','tests/runtime-contract.test.mjs','tests/regression/directory-loader.test.mjs'])assert.ok(included.some(entry=>entry.source===source),`${platform}: ${source}`);
}
console.log('PASS: exact external profile contract, current standalone guidance, source-independent artifact paths and CI coverage.');
