import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(kind='div'){
 let e;const value={kind,kids:[],style:{}};
 e=new Proxy(value,{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return c=>{o.kids.push(c);return e;};if(k==='children')return cs=>{o.kids.push(...cs);return e;};return(...args)=>{o.style[k]=args;return e;};}});return e;
}
const nodes=(el,out=[])=>{if(el&&typeof el==='object'){out.push(el);for(const c of el.kids??[])nodes(c,out);}return out;};
const text=el=>nodes(el).flatMap(n=>n.kids.filter(c=>typeof c==='string'));
const source=fs.readFileSync(new URL('../mods/custom-spaces/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default class Spaces/,'class Spaces').replace(/export /g,'')+'\nglobalThis.Spaces=Spaces;';
let reply={code:1,stdout:'',stderr:'remote temporarily unavailable'},args;
const context={View:class{},div:element,h_flex:()=>element('row'),v_flex:()=>element('column'),svg:p=>element('svg').asset(p),slot:x=>x,U:{meta:11,smallIcon:14},exec:async(...a)=>{args=a;return reply;}};
vm.runInNewContext(source,context);const view=new context.Spaces();
const theme={muted:'#aaa',dim:'#888',ansi2:'green',ansi1:'red'};
for(const branch of ['main','master','develop','feature/a']){
 const tail=view.gitTail({name:'repo',branch,ahead:2,behind:1},false,'repo',theme);
 assert.ok(!text(tail).includes(branch),`${branch} stays out of the sidebar`);
 assert.equal(nodes(tail).filter(n=>n.kind==='svg'&&n.style.asset[0].endsWith('/branch.svg')).length,0);
 assert.equal(tail.style.tooltip,undefined);assert.ok(text(tail).includes('↑2'));assert.ok(text(tail).includes('↓1'));
}
assert.ok(!text(view.gitTail({name:'repo',branch:'feature/a'},true,'feature/a',theme)).includes('feature/a'),'Worktree tails do not repeat branch names');
assert.ok(!text(view.gitTail({name:'repo',branch:'(detached)'},false,'repo',theme)).includes('detached'));
assert.ok(text(view.gitTail({name:'other-repo',branch:'develop'},false,'space',theme)).includes('other-repo'),'Repository names remain available');
const named=view.gitTail({name:'old-folder',ahead:2,behind:1},false,'Custom title',theme,true);
assert.ok(!text(named).includes('old-folder'),'Custom space names hide the old folder/repository label');assert.ok(text(named).includes('↑2'));assert.ok(text(named).includes('↓1'));
const key=JSON.stringify(['pc2','D:/repo']);view.git={[key]:{name:'repo',branch:'develop'}};view.checked={};view.unsure=new Set();
await view.check(key,{});assert.equal(view.git[key].branch,'develop','Transient status failures do not erase a previously known branch');assert.ok(view.unsure.has(key));assert.equal(args[2].on,'pc2');assert.equal(args[2].cwd,'D:/repo');
reply={code:128,stdout:'',stderr:'fatal: not a git repository'};await view.check(key,{});assert.equal(view.git[key],null,'Leaving a repository really clears its branch');
console.log('PASS: hidden sidebar branch names/icons/tooltips, retained repo and ahead/behind, per-machine reads and transient-failure retention');
