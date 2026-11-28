import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,t} from './support/git-row.mjs';
import {spacesGeometryHarness} from './support/spaces-geometry.mjs';
import {Popover} from './support/choice-menu.mjs';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
const right=b=>b.x+b.width,centre=b=>b.x+b.width/2;
const inset=(geometry,row,control)=>right(geometry.get(row))-right(geometry.get(control));
const spacesMeasurements=new Map();
function spacesInset(width,zoom) {
  const tree=spaces.render(),geometry=rowGeometry(tree,width,zoom,600);
  const measurements=['ordinary'].map(id=>{
    const row=find(tree,`space-${id}`),pill=find(tree,`space-tag-${id}-crew-0`);
    const badge=find(tree,`space-content-${id}`).kids[0],box=geometry.get(row);
    const metrics={left:box.x,right:width*zoom-right(box),leading:geometry.get(badge).x-box.x,
      trailing:3*zoom,radius:row.attrs.rounded[0]};
    near(metrics.left,8*zoom,'Spaces left highlight gutter');near(metrics.right,8*zoom,'Spaces right highlight gutter');
    near(metrics.leading,8*zoom,'Spaces badge starts 8px inside its highlight');
    near(metrics.trailing,3*zoom,'Git preserves its independent 3px inset after Crew is restyled');
    near(metrics.radius,6,'Spaces radius remains 6 logical pixels');
    near(width*zoom-right(geometry.get(pill)),79*zoom,'Spaces Crew retains its count-and-chevron-present column');
    near(right(geometry.get(pill)),right(geometry.get(find(tree,'space-tag-coordinator-crew-0'))),'Childless and connected Crew labels share one column');
    const metadata=find(tree,`space-meta-${id}`);
    assert.equal(metadata.kids.length,3,'Childless Crew reserves both trailing rails');
    for(const slot of metadata.kids.slice(1)) {
      near(geometry.get(slot).width,24*zoom,'Absent controls retain their existing rail widths');
      assert.equal(slot.kids.length,0,'No visible placeholder count or chevron');
      for(const key of ['on_click','tab_index','role','tooltip'])assert.equal(slot.attrs[key],undefined,'Empty rail stays inert');
    }
    return metrics;
  });
  assert.equal(find(tree,'space-tag-fleet-crew-0'),undefined,'Connected children have no Crew labels; parent and childless Crew use the same fixed column');
  assert.ok(find(tree,'space-branch-fleet'),'The child has its own indented connector instead');
  const parentContent=find(tree,'space-content-coordinator');assert.equal(find(parentContent,'space-meta-coordinator').kids.at(-1),find(tree,'space-fold-coordinator'),'The connected parent now reserves its far-right edge for disclosure, after Crew');
  spacesMeasurements.set(`${width}/${zoom}`,measurements[0]);
  return measurements[0].trailing;
}
function gitColumn(geometry,node,width,zoom) {
  const expected=spacesMeasurements.get(`${width}/${zoom}`),box=geometry.get(node);
  assert.ok(box,`Missing geometry for ${node?.attrs.id}`);
  near(box.x,expected.left,'Git highlight matches actual Spaces left gutter');
  near(width*zoom-right(box),expected.right,'Git highlight matches actual Spaces right gutter');
}
function gitHighlight(geometry,row,width,zoom) {
  gitColumn(geometry,row,width,zoom);
  near(row.attrs.rounded[0],spacesMeasurements.get(`${width}/${zoom}`).radius,'Git highlight matches actual Spaces radius');
}
// Independent negative-margin oracle: a trailing pill extends beyond its row's
// padding, but never beyond the list's inset. The full Spaces tree below uses it.
{
  const root=element().flex().px(8).child(element().flex_1()).child(element().w(30).h(18).flex_none().mr(-5));
  near(right(rowGeometry(root,100).get(root.kids[1])),97,'Negative trailing margin extends the painted box by 5px');
}
const spaces=await spacesGeometryHarness(),h=await rowHarness({modules:{
  'panel-kit.js':'src/ui/panel-kit.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js',
  'choice-menu.js':'src/ui/choice-menu.js',
  'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover,Input:{}},
}}),{panel,facts}=h;
const no=()=>{};
for(const method of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback'])panel[method]=no;
panel.pullsDue=()=>false;panel.agentLinks.refresh=no;
panel.notices={sync:()=>null};panel.enrollmentPresentation=()=>null;
panel.foldedRepositories=new Set();
const raw={number:17,title:'Long title '.repeat(20),url:'https://github.com/owner/repo/pull/17',author:{login:'owner'},createdAt:'2026-11-20T10:00:00Z',labels:[{name:'fixture',color:'840479'}]};
const now=Date.parse('2026-11-20T14:00:00Z');
let comparisons=0;
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  h.setZoom(zoom);
  const expectedInset=spacesInset(width,zoom),titles=new Map();
  for(const state of ['OPEN','CLOSED','MERGED'])for(const mode of ['ordinary','pinned','ghost','coordinator'])for(const agent of [false,true]) {
    h.setAgent(agent);panel.view=state==='OPEN'?'open':'closed';
    const pr=facts.pullRow({...raw,state},'owner',now),next={...pr,number:18};
    if(mode==='coordinator')for(const row of [pr,next])Object.assign(row,{key:`owner/repo#${row.number}`,repo:'owner/repo'});
    const rows=[pr,next];panel.pulls[panel.view]=rows;panel.agentPull=mode==='pinned'?17:null;
    panel.aggregate={context:{scope:'home'},target:()=>agent?{terminal:'t2'}:null,focus:no,
      counts:()=>({open:2,closed:2}),repositories:()=>['owner/repo'],rows:()=>rows,readNotice:()=>null,
      entries:new Map(rows.map(row=>[row.key,{pr:row,link:{repo:'owner/repo'}}])),currentContext:()=>({scope:'home'})};
    panel.syncAggregate=()=>mode==='coordinator';
    panel.pinMotion=mode==='ghost'?{current:{id:'geometry',phase:'moving',snapshot:{rows,pinned:pr},
      cards:rows.map((pr,i)=>({pr,from:i*76,to:(1-i)*76}))},active:no,resolve:no,settled:()=>true}:null;
    const {tree,geometry}=h.settle(()=>panel.render(h.cx),width,zoom,600);
    assert.equal(tree.attrs.id[0],'changes');assert.ok(tree.attrs.border_1,'Include the real panel border, not an isolated row');
    const prefix=mode==='ghost'?'swap-':'';
    for(const row of rows) {
      const id=row.key??row.number,block=find(tree,`${prefix}pr-${id}`),slot=find(block,`${prefix}pr-agent-slot-${id}`);
      const robot=geometry.get(slot),pill=geometry.get(find(block,`${prefix}pr-labels-${id}`).kids.at(-1));
      gitHighlight(geometry,block,width,zoom);
      if(slot)near(inset(geometry,block,slot),expectedInset,'Live robot slot retains its highlight inset');
      near(right(geometry.get(block))-right(pill),expectedInset,'Actual label pill retains the independent Git highlight-relative inset');
      if(robot)near(width*zoom-right(robot),11*zoom,'Git control ends 11px from the panel, matching Spaces');
      near(geometry.get(find(block,`${prefix}pr-state-slot-${id}`)).x-geometry.get(block).x,
        spacesMeasurements.get(`${width}/${zoom}`).leading,'Git state slot matches actual Spaces highlight-to-badge inset');
      const title=geometry.get(find(block,`${prefix}pr-title-${id}`)),titleKey=`${state}-${mode}-${id}`;
      near(right(title),robot?robot.x-4*zoom:right(geometry.get(block))-3*zoom,'Title uses all width except a present fallback robot');
      if(agent)near(right(title)+28*zoom,titles.get(titleKey),'Only the live robot and gap consume title width');
      else titles.set(titleKey,right(title));
      if(robot)near(robot.width,24*zoom,'Fallback robot keeps its original target, not an 80px stage reservation');near(geometry.get(block).height,74*zoom,'PR vertical geometry stays fixed');
      near(geometry.get(find(block,`${prefix}pr-title-${id}`)).x,geometry.get(block).x+32*zoom,'Left inset is unchanged');
      for(const [kind,height,offset] of [['title-line',20,6],['byline',18,29],['meta',18,50]]) {
        const line=geometry.get(find(block,`${prefix}pr-${kind}-${id}`));
        near(line.height,height*zoom,'Line height is unchanged');near(line.y,geometry.get(block).y+offset*zoom,'Line vertical anchor is unchanged');
      }
      const button=find(block,`${prefix}pr-agent-${id}`);
      assert.equal(Boolean(button),agent);
      if(button) {
        const box=geometry.get(button);near(box.width,24*zoom,'Robot hit width');near(box.height,24*zoom,'Robot hit height');
        near(right(geometry.get(block))-right(box),expectedInset,'Robot hover box shares the Spaces highlight-relative inset');assert.equal(Boolean(button.attrs.on_click),mode!=='ghost');
        assert.equal(button.attrs.tooltip,undefined,'Robot remains without a tooltip');
        const glyph=nodes(button).find(node=>node.attrs.asset?.[0]==='icons/agent.svg');
        near(centre(geometry.get(glyph)),centre(box),'Robot glyph is centred in its 24px target at the trailing edge');
        near(geometry.get(glyph).width,16*zoom,'Robot glyph retains its existing size');
      } else assert.equal(slot,undefined,'No absent-control title placeholder');
      comparisons++;
    }
    if(mode==='coordinator') {
      const header=find(tree,'task-repo-header-owner/repo'),slot=header.kids.at(-1),glyph=slot.kids[0],box=geometry.get(slot);
      gitHighlight(geometry,header,width,zoom);
      near(inset(geometry,header,slot),expectedInset,'Header chevron slot shares the Spaces highlight-relative inset');
      near(right(box),right(geometry.get(find(tree,'pr-labels-owner/repo#17').kids.at(-1))),'Header chevron slot right edge equals the actual pill edge');
      near(box.width,24*zoom,'Header chevron reserves 24px');near(box.height,24*zoom,'Header slot remains inside 28px header');
      near(geometry.get(header).height,28*zoom,'Header vertical geometry is unchanged');
      near(centre(geometry.get(glyph)),centre(box),'Chevron glyph is centred in the robot column');
      assert.equal(glyph.attrs.size[0],14,'Chevron keeps its existing glyph size');assert.ok(header.attrs.on_click,'Full header retains its fold target');
      if(agent) {
        const robot=nodes(find(tree,'pr-agent-owner/repo#17')).find(node=>node.attrs.asset?.[0]==='icons/agent.svg');
        near(centre(geometry.get(glyph)),centre(geometry.get(robot)),'Chevron and robot glyph centre lines align');
        near(right(geometry.get(robot))-right(geometry.get(glyph)),zoom,'Different SVG sizes retain the accepted 1px edge difference');
      }
      for(const folded of [true,false]) {
        panel.foldedRepositories=folded?new Set(['owner/repo']):new Set();
        const foldedTree=h.render(()=>panel.render(h.cx)),foldedBoxes=rowGeometry(foldedTree,width,zoom,600),foldedHeader=find(foldedTree,'task-repo-header-owner/repo');
        gitHighlight(foldedBoxes,foldedHeader,width,zoom);
        near(inset(foldedBoxes,foldedHeader,foldedHeader.kids.at(-1)),expectedInset,'Expanded and folded chevron slots share the Spaces highlight-relative inset');
      }
    }
    // Mutations must fail at complete-panel level even when all row-local
    // equalities still hold: old padding, old header slot and an extra border.
    if(mode==='coordinator' && agent && state==='OPEN') {
      const row=find(tree,'pr-owner/repo#17'),header=find(tree,'task-repo-header-owner/repo');
      row.pr(6);
      assert.notEqual(inset(rowGeometry(tree,width,zoom,600),row,find(row,'pr-agent-slot-owner/repo#17')),expectedInset);row.pr(3);
      header.pr(6);
      assert.notEqual(inset(rowGeometry(tree,width,zoom,600),header,header.kids.at(-1)),expectedInset);header.pr(3);
      header.kids.at(-1).size(16);
      near(inset(rowGeometry(tree,width,zoom,600),header,header.kids.at(-1)),expectedInset,'Inset alone cannot detect a shrunken chevron slot');
      assert.notEqual(rowGeometry(tree,width,zoom,600).get(header.kids.at(-1)).width,24*zoom);header.kids.at(-1).size(24);
      find(tree,'task-pulls-scroll').border_1();
      const changed=rowGeometry(tree,width,zoom,600);
      near(inset(changed,row,find(row,'pr-agent-slot-owner/repo#17')),expectedInset,'Inset alone cannot detect a shifted highlight');
      assert.throws(()=>gitHighlight(changed,row,width,zoom),/Git highlight matches/);
      delete find(tree,'task-pulls-scroll').attrs.border_1;
      const viewport=nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith('task-pulls-content-'));
      for(const side of ['pl','pr']) {
        viewport[side](6);
        assert.throws(()=>gitHighlight(rowGeometry(tree,width,zoom,600),row,width,zoom),/Git highlight matches/,'Either asymmetric gutter must fail');
        delete viewport.attrs[side];
      }
      row.rounded(4);
      assert.throws(()=>gitHighlight(rowGeometry(tree,width,zoom,600),row,width,zoom),/Spaces radius/);
      row.rounded(6);
    }
  }
}
// Exercise main's mounted-prefix renderer and warm distinct-string widths.
const {measureTask,scrollTask,taskWindow,taskContent,ordinaryContent}=await import('./support/git-scroll.mjs');
const {MAX_MOUNTED_ROWS}=await import('../src/plugins/git/mod/task-reveal.js');
let pagedComparisons=0;
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2])for(const view of ['open','closed']) {
  h.setZoom(zoom);h.setAgent(true);panel.view=view;panel.pinMotion=null;panel.taskWindows?.clear();panel.foldedRepositories.clear();
  const rows=Array.from({length:25},(_,i)=>Object.assign(facts.pullRow({...raw,number:i+1,state:view==='open'?'OPEN':'MERGED'},'owner',now),
    {key:`owner/repo#${i+1}`,repo:'owner/repo'}));
  Object.assign(panel.aggregate,{rows:()=>rows,counts:()=>({open:25,closed:25}),entries:new Map(rows.map(pr=>[pr.key,{pr,link:{repo:pr.repo}}]))});
  panel.syncAggregate=()=>true;
  const expectedInset=spacesInset(width,zoom);
  const seen=new Set();let offset=0;
  while(true) {
    const {tree,geometry}=h.settle(()=>panel.render(h.cx),width,zoom,600);
    const viewport=find(tree,`task-pulls-list-home-${view}`);
    assert.ok(viewport,'Continuous scrolling retains one native scroll identity');assert.equal(taskContent(tree).attrs.py[0],4);assert.equal(taskContent(tree).attrs.px[0],7);
    assert.equal(find(tree,'task-pulls-pages'),undefined);
    const header=find(tree,'task-repo-header-owner/repo');
    if(header) {
      gitHighlight(geometry,header,width,zoom);
      near(inset(geometry,header,header.kids.at(-1)),expectedInset,'Mounted header slot shares the Spaces highlight-relative inset');
    }
    const visible=nodes(viewport).filter(node=>/^pr-owner\/repo#\d+$/.test(node.attrs.id?.[0]??''));
    assert.ok(visible.length<=MAX_MOUNTED_ROWS,'Alignment must preserve the measured mounted cap');
    assert.equal(visible.length,taskWindow(panel).range().revealedRows.length,'All revealed rows remain mounted independent of native viewport');
    for(const row of visible) {
      const id=row.attrs.id[0].slice(3);seen.add(id);
      gitHighlight(geometry,row,width,zoom);
      near(inset(geometry,row,find(row,`pr-agent-slot-${id}`)),expectedInset,'Paged robot slot shares the Spaces highlight-relative inset');
      near(inset(geometry,row,find(row,`pr-agent-${id}`)),expectedInset,'Paged robot hover box shares the Spaces highlight-relative inset');
      near(inset(geometry,row,find(row,`pr-labels-${id}`).kids.at(-1)),expectedInset,'Paged actual pill shares the Spaces highlight-relative inset');
      near(geometry.get(row).height,74*zoom,'Paged rows preserve their vertical geometry');pagedComparisons++;
    }
    measureTask(panel,tree,h.cx,400,width,zoom);
    const w=taskWindow(panel);if(w.limit>=w.items.length && w.offset>=w.max)break;
    offset+=250;scrollTask(panel,tree,h.cx,offset,400,zoom);
  }
  assert.deepEqual([...seen].sort(),rows.map(pr=>pr.key).sort(),'Every PR remains reachable with unchanged alignment');
}
// Exercise real panelMessage and both real enrollment-card renderers, not the
// inert stubs used by most controller tests. Outer column and inner padding are
// separate: text/icons begin another 8px inside the shared 8px outer gutter.
let feedbackComparisons=0;
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2])for(const view of ['open','closed']) {
  h.setZoom(zoom);h.setAgent(false);panel.view=view;panel.pinMotion=null;panel.agentPull=null;
  panel.foldedRepositories.clear();panel.taskWindows?.clear();panel.error=null;panel.pullError=null;panel.pageError=null;
  panel.pages[view]={hasMore:false};panel.enrollmentPresentation=()=>null;panel.notices.sync=()=>null;
  spacesInset(width,zoom);
  const check=(tree,geometry,id,{leading=false,radius=false}={})=>{
    const node=find(tree,id);assert.ok(node,id);gitColumn(geometry,node,width,zoom);
    if(radius)near(node.attrs.rounded[0],spacesMeasurements.get(`${width}/${zoom}`).radius,'Card radius matches Spaces');
    const first=node.kids[0],content=String(first?.attrs?.id?.[0]).startsWith('task-notice-measure-')?first.kids[0]:first;
    if(leading)near(geometry.get(content).x-geometry.get(node).x,
      spacesMeasurements.get(`${width}/${zoom}`).leading,'Feedback painted content shares the Spaces badge inset');
    feedbackComparisons++;
  };
  const render=()=>h.settle(()=>panel.render(h.cx),width,zoom,600);
  const pr=facts.pullRow({...raw,state:view==='open'?'OPEN':'MERGED'},'owner',now);
  panel.syncAggregate=()=>false;
  for(const loading of [false,true]) {
    panel.pulls[view]=loading?null:[];
    const {tree,geometry}=render();check(tree,geometry,'git-empty',{leading:true});
    const viewport=find(tree,`pulls-list-${view}`);
    assert.ok(viewport.attrs.overflow_y_scrollbar);assert.equal(ordinaryContent(tree).attrs.px[0],7);
    assert.ok(find(tree,'pulls-scroll-frame').attrs.overflow_hidden,'Native scroll clipping stays bounded');
  }
  panel.pulls[view]=[pr];panel.pullError='Read failed';panel.pageError={state:view,message:'Page failed'};
  {
    const {tree,geometry}=render();check(tree,geometry,'git-read-error',{leading:true});
    const pageNotice=ordinaryContent(tree).kids.find(node=>node.kids?.includes('Page failed'));
    gitColumn(geometry,pageNotice,width,zoom);feedbackComparisons++;
  }
  panel.pullError=null;panel.pageError=null;
  for(const notice of ['setup','repository']) {
    panel.notices.sync=()=>notice;
    const {tree,geometry}=render();check(tree,geometry,'git-live-ci-info',{leading:true,radius:true});
  }
  panel.notices.sync=()=>null;panel.syncAggregate=()=>true;
  const aggregate=panel.aggregate;
  aggregate.context={scope:'home'};aggregate.currentContext=()=>aggregate.context;
  aggregate.repositories=()=>[];aggregate.rows=()=>[];aggregate.entries=new Map();aggregate.readNotice=()=>null;
  for(const loading of [false,true]) {
    aggregate.busy=loading;
    const {tree,geometry}=render();check(tree,geometry,'git-task-empty',{leading:true});
    const viewport=find(tree,`task-pulls-list-home-${view}`);
    assert.ok(viewport.attrs.overflow_y_scrollbar);assert.equal(taskContent(tree).attrs.px[0],7);
    assert.ok(find(tree,'task-pulls-scroll').attrs.overflow_hidden,'Coordinator scroll clipping stays bounded');
  }
  aggregate.busy=false;aggregate.context.stale=true;
  {
    const {tree,geometry}=render();check(tree,geometry,'git-task-empty',{leading:true});
  }
  aggregate.context.stale=false;aggregate.repositories=()=>['owner/repo'];aggregate.readNotice=()=> 'Repository read failed';
  {
    const {tree,geometry}=render();check(tree,geometry,'task-error-owner/repo',{leading:true});
    assert.equal(find(tree,'task-repo-header-owner/repo'),undefined,'Failure-only repositories omit headers in both tabs at every width/zoom');
    assert.equal(find(tree,'task-repo-count-owner/repo'),undefined);
  }
  // Keep the complete header radius/gutter oracle, but give its repository
  // an actual selected-tab PR. A notice alone no longer makes a header.
  aggregate.rows=()=>[{...pr,repo:'owner/repo',key:`owner/repo#${pr.number}`}];
  {
    const {tree,geometry}=render();check(tree,geometry,'task-repo-header-owner/repo',{radius:true});
    check(tree,geometry,'task-error-owner/repo',{leading:true});
  }
  aggregate.rows=()=>[];aggregate.readNotice=()=>null;panel.enrollmentPresentation=()=>({choices:['owner/repo'],key:'fixture'});
  {
    const {tree,geometry}=render();check(tree,geometry,'git-enrollment-info',{leading:true,radius:true});
    assert.ok(!nodes(find(tree,'task-pulls-scroll')).includes(find(tree,'git-enrollment-footer')),'Enrollment remains outside scrolling');
  }
  panel.enrollmentPresentation=()=>null;panel.notices.sync=()=> 'setup';
  {
    const {tree,geometry}=render();check(tree,geometry,'git-live-ci-info',{leading:true,radius:true});
  }
}
console.log(`PASS ${feedbackComparisons} complete-panel notice/loading/empty/footer gutter comparisons against actual Spaces`);
console.log(`PASS ${pagedComparisons} mounted-scroll right-edge comparisons and stable native scroll identity across widths/zoom/Open/Closed`);
console.log(`PASS ${comparisons} full-panel left/right gutter, radius and inner-inset comparisons against actual Spaces Crew geometry, 280–480px / 75–200% including 130%, ordinary/pinned/scrolling/ghost/coordinator, Open/Closed/merged and mutation guards (synthetic, not native pixels)`);
