// Metadata and pure parsing only: no build, native executable, network or live-home access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prLinkOptions} from '../tools/pr-link-options.mjs';
import {noticeEntries} from '../tools/notices.mjs';
import {allowedPath} from '../tools/deploy.mjs';
const root=new URL('../',import.meta.url);
const read=rel=>fs.readFileSync(new URL(rel,root),'utf8');
const config=JSON.parse(read('customization.json'));
assert.deepEqual(fs.readdirSync(new URL('preferences/',root)).sort(),['layout.json','palette.json','theme.json']);
assert.doesNotMatch(JSON.stringify(config),/preferences\/pc\.json|shared\.json|\.credentials\.json/);
for(const name of ['layout','palette','theme'])assert.doesNotMatch(read(`preferences/${name}.json`),/relay|account|pins|profiles|autoFixCI|workers\.dev/i);
assert.deepEqual(prLinkOptions(['example/repository','1','42']),{repository:'example/repository',numbers:[1,42]});
for(const args of [[],['owner/repo'],['../repo','1'],['owner/repo','1;write'],['owner/repo','01'],['owner/repo','1','1'],['owner/repo','9007199254740992']])assert.throws(()=>prLinkOptions(args));
const inspector=read('tools/inspect-pr-links.mjs');
assert.ok(inspector.indexOf('prLinkOptions(process.argv')<inspector.indexOf('defaultHome(),'));
assert.doesNotMatch(inspector,/timurproko\/|\[920,922,923\]/);
const smoke=read('tools/runtime/ssh-clipboard-smoke.ps1');
assert.ok(smoke.indexOf('param(')<smoke.indexOf('Add-Type'));
assert.match(smoke,/Mandatory = \$true/);assert.match(smoke,/@\('', \$RemoteMachine\)/);assert.doesNotMatch(smoke,/\bpc2\b/);
assert.doesNotMatch(read('tests/status-reveal.test.mjs'),/masha|tymur/i);
assert.doesNotMatch(read('tests/regression/pulls.test.mjs'),/timurproko/);
for(const rel of ['docs/ARCHITECTURE.md','docs/GIT-CI-FIX.md','docs/GIT-CORE-MONITOR.md','docs/TAB-MOVE-ADR.md','docs/VALIDATION.md','docs/history/README.md','docs/history/VALIDATION.md','docs/history/docs/PREVIEW-PERFORMANCE.md'])assert.doesNotMatch(read(rel),/\bpc2\b/);
const provenance=JSON.parse(read('docs/ASSET-PROVENANCE.json'));
assert.equal(provenance.entries.length,94);assert.equal(new Set(provenance.entries.map(e=>e.path)).size,94);
const held=provenance.entries.filter(e=>e.status==='held-absent');assert.equal(held.length,3);
for(const entry of provenance.entries){
 if(entry.status==='held-absent'){assert.ok(!fs.existsSync(new URL(entry.path,root)));continue;}
 const text=read(entry.path).replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(text).digest('hex'),entry.sha256LF,entry.path);
 assert.ok(entry.licenses.length&&entry.source&&entry.modifications,entry.path);
}
assert.equal(provenance.entries.filter(e=>e.status==='licensed-replacement').length,35);
assert.equal(provenance.entries.filter(e=>e.status==='provisional-neutral-provider').length,3);
assert.match(read('LICENSES/Apache-2.0.txt'),/END OF TERMS AND CONDITIONS/);
assert.match(read('LICENSES/Lucide-ISC.txt'),/Lucide Contributors/);
assert.match(read('LICENSES/Herdr-Lucide.txt'),/2013-present Cole Bemis/);
assert.match(read('LICENSES/Feather-MIT.txt'),/Permission is hereby granted/);
for(const entry of noticeEntries(fileURLToPath(root),config.features)){
 assert.ok(entry.bytes.length>0);
 allowedPath(entry.dest.startsWith('licenses/')?`.customizations/runtime/${entry.dest}`:entry.dest);
}
assert.throws(()=>allowedPath('.customizations/runtime/licenses/unowned.txt'));
console.log('PASS: curated source metadata, targeted privacy, validated diagnostics, licensed assets and three held-absent gradients');
