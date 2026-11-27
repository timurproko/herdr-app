// Production feedback/header trees; no native IO, agents or real Crew homes.
import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t,rowGeometry,words} from './support/git-row.mjs';
const h=await rowHarness({modules:{'panel-kit.js':'src/ui/panel-kit.js'}}),p=h.panel;
p.sectionEntry=true;p.shown=()=>true;
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<0.001,`${label}: ${a} != ${b}`);
for(const zoom of [1,1.3]) {
 h.setZoom(zoom);
 const header=p.repositoryHeader(t,'owner/repo',p.context,1),hg=rowGeometry(header,390,zoom);
 const label=find(header,`task-repo-name-${p.context}-owner/repo`),labelBox=hg.get(label);
 for(const text of ['No open pull requests','No closed pull requests','Not a git repository','Synthetic read failed; refresh to retry']) {
  const message=p.bodyMessage(t,'feedback',text,{error:text.startsWith('Synthetic')}),g=rowGeometry(message,390,zoom),line=g.get(text);
  near(line.x,labelBox.x,'same text left edge');near(line.y,labelBox.y,'same text top');near(g.get(message).height,hg.get(header).height,'same row height');
  assert.equal(message.attrs.text_color[0],text.startsWith('Synthetic')?t.ansi1:t.dim);
 }
 for(const view of ['open','closed'])for(const folded of [false,true]) {
  p.view=view;p.pulls[view]=[];p.foldedRepositories=folded?new Set(['owner/repo']):new Set();
  const tree=h.render(()=>p.renderPulls(t));assert.ok(words(tree).includes(`No ${view} pull requests`));
  assert.equal(find(tree,'task-repo-header-owner/repo'),undefined,'Empty ordinary section has no header/count/chevron');
  const g=rowGeometry(tree,390,zoom,600),line=g.get(`No ${view} pull requests`);
  near(line.x,15*zoom,'7px list plus 8px header inset before panel border');near(line.y,(4+(28-19.5)/2)*zoom,'4px list top plus header text inset');
  p.pullError='Synthetic read failed; refresh to retry';p.foldedRepositories.add('owner/repo');
  const failure=h.render(()=>p.renderPulls(t)),fg=rowGeometry(failure,390,zoom,600);
  near(fg.get(p.pullError).y,(4+(28-19.5)/2)*zoom,'Headerless failure ignores saved fold');assert.equal(find(failure,'task-repo-header-owner/repo'),undefined);
  p.pullError=null;p.foldedRepositories.clear();
 }
 p.view='open';p.foldedRepositories.add('owner/repo');p.pulls.open=[h.facts.pullRow({number:1,title:'Last row',state:'OPEN'})];
 assert.ok(find(p.renderPulls(t),'task-repo-header-owner/repo'));
 p.pulls.open=[];const departed=p.renderPulls(t);
 assert.ok(words(departed).includes('No open pull requests'),'Last row leaving a folded tab cannot leave a blank body');
 assert.equal(find(departed,'task-repo-header-owner/repo'),undefined);assert.ok(p.foldedRepositories.has('owner/repo'),'Fold is retained for future rows');p.foldedRepositories.clear();
}
console.log('PASS Git header-position feedback at 100/130%, empty Open/Closed and folded initial failures');
