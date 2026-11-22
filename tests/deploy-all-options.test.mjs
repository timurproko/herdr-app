import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deployAll, parseOptions, printSummary } from '../tools/deploy-all.mjs';
import worker from '../tools/deploy-all-worker.cjs';
import { project, fixture, git, clean } from './support/deploy-all.mjs';
try {
  for (const args of [['--wat'],['--only'],['--only',''],['--only','a,,b'],['--only','--dry-run'],['--only','a','--only','b']]) assert.throws(()=>parseOptions(args));
  assert.deepEqual(parseOptions(['--dry-run','--only',' local,peer ','--skip-local']), {dryRun:true,only:['local','peer'],skipLocal:true});
  for (const args of [['--skip-local'],['--only','peer']]) {
    const f = fixture(); fs.appendFileSync(path.join(f.root,'source.txt'),'dirty');
    assert.equal(deployAll(args,f).code,1); assert.ok(f.calls.every(c=>c.command==='git'));
  }
  function selected(args, mutate = () => {}) {
    const f = fixture(), original = f.run, sent = [], logs = [];
    f.hostname = 'desktop'; f.log = line=>logs.push(line);
    f.run = (c,a,o) => {
      if (c !== 'hc') return original(c,a,o);
      if (a[0] === 'machine') return {code:0,stdout:JSON.stringify({machines:[{name:'peer',state:'connected'},{name:'other',state:'offline'}]})};
      sent.push(a[2]);
      // The supplied dry-run flag is inside the Base64 loader, not a shell argument.
      const loader = Buffer.from(a.at(-1).split("'")[1],'base64').toString();
      assert.equal(loader.includes('\\"dryRun\\":true'), args.includes('--dry-run'));
      return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from('HERDR_DEPLOY_ALL_RESULT='+JSON.stringify({action:args.includes('--dry-run')?'would deploy':'already current',commit:'peer-sha'})).toString('base64')})};
    };
    mutate(f); const result = deployAll(args,f); return {f,sent,logs,...result};
  }
  let r = selected(['--only','peer','--skip-local']); assert.equal(r.code,0); assert.deepEqual(r.sent,['peer']);
  assert.equal(r.results[0].reason,'--skip-local'); assert.equal(r.results[2].reason,'not selected');
  r = selected(['--only','desktop']); assert.equal(r.code,0); assert.deepEqual(r.sent,[]); assert.equal(r.results[0].action,'deployed');
  r = selected(['--only','unknown']); assert.equal(r.code,1); assert.deepEqual(r.sent,[]);
  assert.ok(!r.f.calls.some(c=>c.command!=='git'), 'unknown selection never deploys');
  const f = fixture(), next = f.advance(), before = git(f.root,'rev-parse','HEAD');
  const files = fs.readFileSync(path.join(f.root,'source.txt'));
  const messages = []; f.log = line=>messages.push(line);
  r = deployAll(['--dry-run'],f); assert.equal(r.code,0); assert.equal(r.results[0].action,'would deploy'); assert.equal(r.results[0].commit,next);
  assert.equal(git(f.root,'rev-parse','HEAD'),before); assert.equal(git(f.root,'rev-parse','origin/main'),next);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'source.txt')),files);
  assert.ok(!f.calls.some(c=>c.command!=='git'&&c.command!=='hc'));
  assert.ok(!fs.existsSync(f.env.HERDR_APP_HOME)); assert.ok(!fs.existsSync(path.join(f.root,'dist')));
  assert.match(messages.join('\n'),/would deploy.*fast-forward/); assert.match(messages.join('\n'),/\(target\)/);
  r = selected(['--dry-run','--only','peer']); assert.equal(r.code,0); assert.equal(r.results[1].action,'would deploy');
  const results = [
    [{changed:0,removed:0,backup:null,patches:{ok:true,frames:{}}},0,'already current'],
    [{changed:0,removed:0,backup:null,patches:{ok:true,frames:{palette:{ok:true,message:'Custom palette frame applied (other layouts retain stock styling).'}}}},0,'deployed'],
    [{changed:1,removed:0,backup:'backup-id',patches:{ok:false}},1,'failed'],
  ];
  for (const [data,code,action] of results) {
    const row = worker.deployCheckout(f.root,next,'deploy',{run:()=>({code,stdout:'npm banner\n'+JSON.stringify(data,null,2),stderr:''}),log(){}});
    assert.equal(row.action,action); assert.equal(row.backup,data.backup); assert.equal(row.commit,next);
  }
  assert.equal(worker.deployCheckout(f.root,next,'deploy',{run:()=>({code:0,stdout:'missing result',stderr:''}),log(){}}).action,'failed');
  const table = []; printSummary([{machine:'good',action:'deployed',commit:next,backup:'backup-id'},{machine:'bad',action:'failed',reason:'bad\nreason',commit:before},{machine:'offline',action:'skipped',reason:'offline'}],s=>table.push(s));
  assert.match(table.join('\n'),/Machine \| Action \| Source commit \| Backup/);
  assert.match(table.join('\n'),/backup-id/); assert.match(table.join('\n'),/\(attempted\)/); assert.equal(table.length,4);
  for (const file of ['README.md','docs/COMMANDS.md']) {
    const docs = fs.readFileSync(path.join(project,file),'utf8');
    for (const text of ['--dry-run','--only','--skip-local']) assert.ok(docs.includes(text),file+text);
    assert.match(docs,/fetch.*(?:exception|still|only)|still.*fetch/i);
  }
  console.log('PASS: deploy-all selection, mandatory source gate, fetch-only preview, result/backup reporting and exit codes.');
} finally { clean(); }
