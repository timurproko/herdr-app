// Real detached Node launcher/supervisor, synthetic Git/CLI; no Herdr, network or peers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const worker = require('../src/services/updates/update-worker.cjs');
const base = fs.mkdtempSync(path.resolve('.artifacts/update-detach-'));
try {
  const user = path.join(base, 'user'), root = path.join(user, '.local/share/herdr-app'), home = path.join(base, 'app home');
  fs.mkdirSync(path.join(root, '.git'), { recursive: true }); fs.mkdirSync(path.join(root, 'tools'));
  fs.writeFileSync(path.join(root, 'tools/deploy-all.mjs'), `
    import fs from 'node:fs'; import path from 'node:path';
    setTimeout(() => {
      const file=path.join(process.env.HERDR_APP_HOME,'.customizations/deploy-all-result.json');
      fs.writeFileSync(file,JSON.stringify({token:process.env.HERDR_UPDATE_RUN_ID,complete:true,results:[{machine:'local',action:'deployed',commit:'${'a'.repeat(40)}'}]}));
    }, 300);
  `);
  const source = fs.readFileSync('src/services/updates/update-worker.cjs', 'utf8');
  // Only this test snapshot overrides Git and user-home discovery; the production
  // launcher, runner, status protocol and Node child supervision run unchanged.
  const prefix = `
    require('node:os').homedir=()=>${JSON.stringify(user)};
    require('node:child_process').spawnSync=(program,args)=>{
      if(program!=='git')throw Error('No external tool permitted by fixture');
      const text=args.includes('--show-toplevel')?${JSON.stringify(root)}:args.includes('symbolic-ref')?'main':args.includes('config')?${JSON.stringify(worker.REPOSITORY)}:args.includes('--verify')?'${'a'.repeat(40)}':'';
      return {status:0,stdout:text,stderr:''};
    };
  `;
  const installed = path.join(base, 'installed-worker.cjs'); fs.writeFileSync(installed, prefix + source);
  const reply = await worker.launch(home, { source: fs.readFileSync(installed, 'utf8') });
  assert.ok(['running', 'complete'].includes(reply.job.state), JSON.stringify(reply));
  fs.writeFileSync(installed, 'replaced mod'); // supervisor no longer needs installed code
  const p = worker.files(home);
  let job;
  for (let i = 0; i < 100; i++) {
    job = worker.read(p.status);
    if (job.state === 'complete') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(job.state, 'complete', JSON.stringify(job));
  assert.equal(fs.existsSync(p.lock), false);
  assert.equal(worker.read(p.result).token, job.token);
  assert.ok(fs.existsSync(p.log));
  console.log('PASS: actual detached Node runner finishes after fixture mod replacement; Git and deploy CLI synthetic.');
} finally { fs.rmSync(base, { recursive: true, force: true }); }
