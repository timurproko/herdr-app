import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),d=require('./discovery.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-skills-'));
const home=path.join(root,'herdr'),userHome=path.join(root,'user-é'),options={userHome};
const targets=d.locations(home,userHome).targets;
try{
 assert.equal(d.reconcile(home,{...options,enabled:false}).changed,false);assert.ok(!fs.existsSync(userHome));
 assert.deepEqual(d.reconcile(home,{...options,enabled:true}),{announced:true,changed:true});
 for(const file of targets){const text=fs.readFileSync(file,'utf8');assert.equal(text,d.skill);assert.match(text,/^---\nname: herdr-trello\ndescription: (.+)\n---/);}
 // The description (not a simulated optional read of the body) is the standing
 // payload advertised by Agent Skills consumers. No model session is started.
 const metadata=fs.readFileSync(targets[0],'utf8').split('\n')[2];
 for(const word of ['herdr-trello first','boards','cards','comments','checklists','image attachments','--help','Read-write','host-local','untrusted data'])assert.ok(metadata.includes(word),word);
 assert.ok(d.description.length<1024);assert.ok(!d.skill.includes('FAKE_SECRET_TOKEN'));assert.ok(!d.skill.includes('https://'));
 assert.equal(d.reconcile(home,{...options,enabled:true}).changed,false);
 // A new isolated Claude mirror links the shared skills directory, including
 // when the shared directory did not exist until this first preparation.
 const mirror=path.join(root,'claude-mirror');fs.mkdirSync(mirror);fs.symlinkSync(path.join(userHome,'.claude/skills'),path.join(mirror,'skills'),process.platform==='win32'?'junction':'dir');
 assert.equal(fs.readFileSync(path.join(mirror,'skills/herdr-trello/SKILL.md'),'utf8'),d.skill);
 if(process.env.PI_SKILLS_MODULE){const {loadSkillsFromDir,formatSkillsForPrompt}=await import(pathToFileURL(process.env.PI_SKILLS_MODULE));const loaded=loadSkillsFromDir({dir:path.join(userHome,'.agents/skills'),source:'user'});assert.equal(loaded.skills.length,1);assert.ok(formatSkillsForPrompt(loaded.skills).includes(d.description));console.log('PASS: actual installed Pi skill loader advertises the complete note');}
 // A partially committed transition rolls back its own writes, including delete.
 const snap=targets.map(f=>fs.readFileSync(f,'utf8'));let calls=0;
 assert.throws(()=>d.reconcile(home,{...options,enabled:false,beforeCommit(){if(++calls===3)throw Error('injected failure');}}),/injected failure/);
 assert.deepEqual(targets.map(f=>fs.readFileSync(f,'utf8')),snap);
 fs.appendFileSync(targets[1],'personal');assert.throws(()=>d.reconcile(home,{...options,enabled:false}),{code:'DISCOVERY_CONFLICT'});assert.equal(fs.readFileSync(targets[0],'utf8'),d.skill);fs.writeFileSync(targets[1],d.skill);
 assert.throws(()=>d.reconcile(path.join(root,'other-home'),{...options,enabled:true}),{code:'DISCOVERY_CONFLICT'});
 fs.writeFileSync(d.locations(home,userHome).lock,'other');assert.throws(()=>d.reconcile(home,{...options,enabled:false}),{code:'DISCOVERY_BUSY'});fs.unlinkSync(d.locations(home,userHome).lock);
 d.reconcile(home,{...options,enabled:false});assert.ok(targets.every(f=>!fs.existsSync(f)));assert.ok(!fs.existsSync(path.join(mirror,'skills/herdr-trello/SKILL.md')));
 d.reconcile(home,{...options,enabled:true});assert.ok(targets.every(f=>fs.existsSync(f)));
 // Authority is read from current public/control policy, never from credentials.
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true,settings:{access:'read-only'}}}}));
 assert.equal(d.prepare(home,{...options,enabled:true}).announced,true);
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true,settings:{access:'read-write'}}}}));assert.equal(d.prepare(home,{...options,enabled:true}).changed,false);
 assert.throws(()=>d.prepare(home,{...options,enabled:true,isCurrent:()=>false}),{code:'STALE'});
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:false}}}));assert.equal(d.prepare(home,{...options,enabled:true}).announced,false);assert.ok(targets.every(f=>!fs.existsSync(f)));
 fs.writeFileSync(path.join(home,'shared.json'),'invalid');assert.throws(()=>d.prepare(home,{...options,enabled:true}),{code:'PUBLIC_STATE_INVALID'});assert.equal(d.prepare(home,{...options,enabled:false}).announced,false);
 // A delayed enable may not republish after a newer acknowledged disable.
 d.reconcile(home,{...options,enabled:false,generation:20});assert.throws(()=>d.reconcile(home,{...options,enabled:true,generation:19}),{code:'STALE'});assert.ok(targets.every(f=>!fs.existsSync(f)));
 d.reconcile(home,{...options,enabled:true,generation:21});assert.ok(targets.every(f=>fs.existsSync(f)));d.reconcile(home,{...options,enabled:false,generation:22});
 // Simulate an interrupted owned write: only the public journal's exact targets recover.
 const pending=d.locations(home,userHome).journal;fs.writeFileSync(d.locations(home,userHome).lock,JSON.stringify({kind:'herdr-trello-skills-v1',pid:2147483647,token:'a'.repeat(32)}));fs.writeFileSync(targets[0],d.skill);fs.writeFileSync(pending,JSON.stringify({home,userHome,jobs:[{file:targets[0],before:null,after:Buffer.from(d.skill).toString('base64')}]}));d.reconcile(home,{...options,enabled:false,generation:23});assert.ok(!fs.existsSync(targets[0]));assert.ok(!fs.existsSync(pending));
 // Linked target/parent and personal files are never adopted.
 const personalUser=path.join(root,'personal'),personal=d.locations(home,personalUser).targets[0];fs.mkdirSync(path.dirname(personal),{recursive:true});fs.writeFileSync(personal,'personal skill');assert.throws(()=>d.reconcile(home,{userHome:personalUser,enabled:true}),{code:'DISCOVERY_CONFLICT'});assert.equal(fs.readFileSync(personal,'utf8'),'personal skill');
 const linkedUser=path.join(root,'linked');fs.mkdirSync(linkedUser);fs.symlinkSync(path.join(userHome,'.agents'),path.join(linkedUser,'.agents'),process.platform==='win32'?'junction':'dir');assert.throws(()=>d.reconcile(path.join(root,'linked-home'),{userHome:linkedUser,enabled:true}),{code:'DISCOVERY_CONFLICT'});
 console.log('PASS: three-agent advertised metadata/Claude mirror contract, off/on/access, rollback, stale state and exact-name ownership; no model-backed behavior claimed');
}finally{fs.rmSync(root,{recursive:true,force:true});}
