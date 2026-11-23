import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {migrationBranch,migrationChange,migrationTitle,migrationBody,migrationFiles,renderMigrationReport,handoff,SKIP_LABEL,SKIP_DESCRIPTION,MIGRATION_OUTCOMES} from '../tools/herdr-upgrade-report.mjs';
import {parseUpgradeArgs,artifactDirectory,proposeHerdrUpgrade} from '../tools/propose-herdr-upgrade.mjs';
import {reviewInventory} from '../tools/herdr-upgrade-releases.mjs';
const identity='app-0.1.17',inventory=reviewInventory(process.cwd()),sha='a'.repeat(40);
const report={schema:'herdr-migration-v1',generatedAt:'2026-11-23',baseSha:sha,headSha:'b'.repeat(40),discovery:{releases:{app:{version:'0.1.17',commit:sha,feedSha256:'f'.repeat(64)},core:{version:'0.1.22',commit:inventory.coreSource.commit,feedSha256:'e'.repeat(64)}},errors:{},candidates:{app:'0.1.17'}},inventory,steps:[{name:'patch-palette',status:'failed',detail:'changed hunks',operation:'compare',evidence:'logs/patch-palette.txt',requires:[]},{name:'native-binary',status:'skipped',detail:'no host',operation:'native',evidence:'logs/native-binary.txt',requires:[]},{name:'reachability',status:'passed',detail:'fixed source hosts reachable',operation:'GET',evidence:'logs/reachability.txt',requires:[]}],checks:{apiDelta:[{name:'run',after:null}],consumers:{run:['src/integration/herdr/host.js']},palette:{sourceMatch:false,binaryApplicability:'blocked: no binary',originals:[{file:inventory.patches[0].originals[0].file,match:false,candidateDiff:'diffs/palette.diff',customDiff:'diffs/palette-custom.diff'}]}},actions:[{id:'patch-palette',problem:'Review the exact changed hunk',files:['src/integration/native-patches/palette/main.js'],evidence:['diffs/palette.diff'],command:'node tests/frame-upgrade.test.mjs'}],evidence:{'diffs/palette.diff':'--- original\n+++ candidate\n@@ -1 +1 @@\n-old\n+new\n','diffs/palette-custom.diff':'custom delta','logs/patch-palette.txt':'x'.repeat(18000),'logs/native-binary.txt':'no native proof','logs/reachability.txt':'reachable'}};
assert.equal(SKIP_LABEL,'\u{1F916} Skip');assert.match(SKIP_DESCRIPTION,/Closing.*skips that version/);
assert.equal(migrationBranch(identity),'chore/herdr-app-0.1.17');assert.equal(migrationChange(identity),'herdr-migration-app-0.1.17');
assert.equal(migrationTitle(identity),'chore(herdr): Herdr 0.1.17 migration');assert.equal(migrationTitle('core-0.1.23'),'chore(herdr): Herdr Core 0.1.23 migration');
const body=migrationBody(identity);assert.ok(body.startsWith('## Proposal\n'));assert.ok(body.trimEnd().endsWith('</details>'));assert.equal((body.match(/- \[ \]/g)??[]).length,MIGRATION_OUTCOMES.length);assert.match(body,/"version": 3/);
for(const outcome of MIGRATION_OUTCOMES)assert.ok(Buffer.byteLength(outcome)<=300);
const text=renderMigrationReport(report,identity,{prUrl:'https://github.com/timurproko/herdr-app/pull/123'});
for(const expected of ['**failed**','**skipped**','evaluated head','source/fixture','src/integration/native-patches/palette/main.js','diffs/palette.diff','old owned feedback','https://github.com/timurproko/herdr-app/pull/123','Do not create another PR','whole-tree'])assert.ok(text.toLowerCase().includes(expected.toLowerCase()),expected);
assert.match(handoff(identity),/after the person approves/i);
const files=migrationFiles(report,identity,{date:'2026-11-23'});
assert.match(files[`openspec/changes/${migrationChange(identity)}/.openspec.yaml`],/skip_specs: true/);
assert.equal((files[`openspec/changes/${migrationChange(identity)}/tasks.md`].match(/^## \d+\./gm)??[]).length,MIGRATION_OUTCOMES.length);
assert.match(files[`upstream/migrations/${identity}/logs/patch-palette.txt`],/Full bounded output/);
assert.ok(!files[`upstream/migrations/${identity}/report.json`].includes('x'.repeat(100)));
assert.throws(()=>parseUpgradeArgs(['--app-version','0.1.17;echo']));assert.throws(()=>parseUpgradeArgs(['--publish']));assert.throws(()=>parseUpgradeArgs(['--refresh',identity,'--core-version','0.1.23']));
const dir=fs.mkdtempSync(path.resolve('.artifacts/herdr-report-'));
try {
  assert.throws(()=>artifactDirectory(process.cwd(),'upstream/migrations/unsafe'),/artifacts/);
  const feed=(c,v)=>({version:v,...(c==='app'?{core_min:'0.1.11'}:{generation:1}),targets:{'linux-x86_64':{url:`https://releases.herdr.dev/${c}/${v}/fixture.tar.gz`,sha256:'c'.repeat(64)}}});
  const fake=async url=>url.includes('latest.json')?feed(url.includes('/app/')?'app':'core',url.includes('/app/')?'0.1.17':'0.1.22'):{ref:`refs/tags/v${url.split('/v').at(-1)}`,object:{type:'commit',sha:url.includes('herdr-core')?inventory.coreSource.commit:sha}};
  const result=await proposeHerdrUpgrade({probe:true,output:path.relative(process.cwd(),dir),requested:{}},{get:fake,evaluate:async()=>structuredClone(report)});
  assert.equal(result.bundle.mode,'probe');assert.equal(result.probe.ok,true);assert.ok(fs.existsSync(path.join(dir,'preview',`upstream/migrations/${identity}/report.md`)));
  // Rendering a repeated preview cannot mutate tracked baselines or create a PR.
  assert.equal(cp.execFileSync('git',['status','--porcelain','--','src/integration/native-patches','upstream/baselines'],{encoding:'utf8'}),'');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS agent migration reports, honest missing native proof, delivery/OpenSpec scaffolds and no-write CLI preview');
