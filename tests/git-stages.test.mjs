import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rowHarness} from './support/git-row.mjs';
const {facts:f}=await rowHarness();
const raw={number:7,state:'OPEN',headRefOid:'a',url:'https://github.com/owner/repo/pull/7'};
const table=[['build',['Build','Rework','Changes needed']],['review',['Review','Under review']],['approved',['Approved']]];
for(const [stage,names]of table)for(const name of names)for(const prefix of ['', '🤖 '])for(const connection of [false,true]) {
  const labels=[{name:prefix+name,color:'840479'}];
  const row=f.pullRow({...raw,labels:connection?{nodes:labels}:labels});
  assert.equal(row.stage,stage);assert.equal(row.labels[0].name,prefix+name);
  const narrow=f.refreshPullFacts(row,{state:'OPEN',headRefOid:'b',checks:{state:'pending'},checkSummary:'pending'});
  assert.equal(narrow.stage,stage);assert.equal(narrow.labels,row.labels,'Narrow CI reads retain authoritative labels and stage');
  const retimed=f.retimePull({...row,createdAt:'2020-01-01T00:00:00Z'});
  assert.equal(retimed.stage,stage);
}
for(const labels of [null,undefined,[],{nodes:[]},[{name:'Not Approved'}],[{name:'🤖 Review extra'}],[{name:'review'}],[null,{}, {name:7}]])assert.equal(f.pullRow({...raw,labels}).stage,null);
const build=f.pullRow({...raw,labels:[{name:'🤖 Rework'}]});
assert.equal(f.pullRow({...raw,labels:[]}).stage,null,'Authoritative label removal clears stage');
assert.equal(f.pullRow({...raw,labels:[{name:'🤖 Approved'},{name:'Review'},{name:'Build'}]}).stage,'build');
assert.equal(f.pullRow({...raw,labels:[{name:'Approved'},{name:'Review'}]}).stage,'review');
for(const check of ['PENDING','SUCCESS','FAILURE'])assert.equal(f.pullRow({...raw,labels:[{name:'Approved'}],checkSummary:check,reviewDecision:'CHANGES_REQUESTED'}).stage,'approved');
assert.equal(f.pullRow({...raw,reviewDecision:'APPROVED'}).stage,null,'GitHub reviewDecision is not a managed stage');
for(const labels of [[],[{name:'Review'}],[{name:'Approved'}]])assert.notEqual(f.pullRow({...raw,labels}),build);
for(const name of table.flatMap(([,names])=>names))assert.ok(fs.readFileSync('README.md','utf8').includes(name),`Documented alias ${name}`);
assert.ok(f.pullListArgs('open').join(' ').includes('labels(first:100){nodes{name color}}'));
console.log('PASS: managed stage aliases, parsing, authoritative replacement and narrow fact retention');
