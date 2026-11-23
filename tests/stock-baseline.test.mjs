import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {stockBaseline} from '../tools/runtime/stock-baseline.mjs';
const root=fs.mkdtempSync(path.resolve('.artifacts/stock-baseline-')),home=path.join(root,'home');
try {
 fs.mkdirSync(path.join(root,'baselines'));fs.mkdirSync(path.join(root,'scripts'));fs.mkdirSync(path.join(home,'mods/stock'),{recursive:true});
 const stock=path.join(home,'mods/stock/main.js');fs.writeFileSync(stock,'reviewed stock');
 fs.writeFileSync(path.join(root,'baselines/0.1.16.json'),JSON.stringify({'mods/stock/main.js':createHash('sha256').update('reviewed stock').digest('hex')}));
 assert.equal(stockBaseline(root,'0.1.16').reviewed,true);assert.equal(stockBaseline(root,'0.1.17').reviewed,false);
 assert.match(stockBaseline(root,'0.1.17').advisory,/No older baseline substituted/);
 assert.throws(()=>stockBaseline(root,'../../escape'),/Invalid/);
 fs.writeFileSync(path.join(root,'baselines/0.1.18.json'),'broken');assert.throws(()=>stockBaseline(root,'0.1.18'));
 // Execute the actual stock-check block with synthetic SDK/version/home facts.
 const original=fs.readFileSync(new URL('./regression/test.mjs',import.meta.url),'utf8');
 const prefix=original.slice(0,original.indexOf("const original = json(path.join(home,'layouts/main.json'))"))
  .replace("import { mix } from '../mods/custom-settings/palette.js';",'')
  .replace("import { stockBaseline } from './stock-baseline.mjs';",`import {stockBaseline} from ${JSON.stringify(pathToFileURL(path.resolve('tools/runtime/stock-baseline.mjs')).href)};`)
  .replace("import { execFileSync } from 'node:child_process';","const execFileSync=()=>process.env.FIXTURE_VERSION;");
 const script=path.join(root,'scripts/check.mjs');fs.writeFileSync(script,prefix+"\nconsole.log('independent regressions reached');\n");
 const run=version=>cp.spawnSync(process.execPath,[script],{env:{...process.env,HERDR_APP_HOME:home,FIXTURE_VERSION:`herdr-app ${version}`,LOCALAPPDATA:root},encoding:'utf8'});
 let r=run('0.1.17');assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/ADVISORY.*unreviewed/);assert.match(r.stdout,/independent regressions reached/);
 r=run('0.1.16');assert.equal(r.status,0,r.stderr);fs.writeFileSync(stock,'personal change');r=run('0.1.16');assert.notEqual(r.status,0);assert.match(r.stderr,/Shipped\/personal file changed/);
 console.log('PASS explicit stock coverage: unreviewed newer release continues, reviewed mismatch fails, malformed evidence refused');
}finally{fs.rmSync(root,{recursive:true,force:true});}
