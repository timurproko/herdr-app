import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,t} from './support/git-row.mjs';
import {spacesGeometryHarness} from './support/spaces-geometry.mjs';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
const right=b=>b.x+b.width,centre=b=>b.x+b.width/2;
// Independent negative-margin oracle: a trailing pill extends beyond its row's
// padding, but never beyond the list's inset. The full Spaces tree below uses it.
{
  const root=element().flex().px(8).child(element().flex_1()).child(element().w(30).h(18).flex_none().mr(-5));
  near(right(rowGeometry(root,100).get(root.kids[1])),97,'Negative trailing margin extends the painted box by 5px');
}
const spaces=await spacesGeometryHarness(),h=await rowHarness(),{panel,facts}=h;
const no=()=>{};
for(const method of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback'])panel[method]=no;
panel.pullsDue=()=>false;panel.agentLinks.refresh=no;
panel.notices={sync:()=>null};panel.enrollmentPicker={stop:no,render:()=>null};panel.enrollmentPresentation=()=>null;
panel.foldedRepositories=new Set();
const raw={number:17,title:'Long title '.repeat(20),url:'https://github.com/owner/repo/pull/17',author:{login:'owner'},createdAt:'2026-11-20T10:00:00Z',labels:[{name:'🤖 Review',color:'840479'}]};
const now=Date.parse('2026-11-20T14:00:00Z');
let comparisons=0;
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  h.setZoom(zoom);
  const spaceTree=spaces.render(),spaceBoxes=rowGeometry(spaceTree,width,zoom,600);
  const crewEdges=['coordinator','fleet'].map(id=>right(spaceBoxes.get(find(spaceTree,`space-tag-${id}-crew-0`))));
  near(crewEdges[0],crewEdges[1],'Actual coordinator and fleet Crew pills align');
  const expected=crewEdges[0];near(width*zoom-expected,11*zoom,'Actual Spaces list + row - trailing margin is 11px');
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
      near(right(robot),expected,'Robot slot right edge equals actual Spaces Crew edge');
      near(right(pill),expected,'Actual label pill right edge equals actual Spaces Crew edge');
      near(robot.width,24*zoom,'Robot reservation remains 24px');near(geometry.get(block).height,74*zoom,'PR vertical geometry stays fixed');
      near(geometry.get(find(block,`${prefix}pr-title-${id}`)).x,geometry.get(block).x+32*zoom,'Left inset is unchanged');
      for(const [kind,height,offset] of [['title-line',20,6],['byline',18,29],['meta',18,50]]) {
        const line=geometry.get(find(block,`${prefix}pr-${kind}-${id}`));
        near(line.height,height*zoom,'Line height is unchanged');near(line.y,geometry.get(block).y+offset*zoom,'Line vertical anchor is unchanged');
      }
      const button=find(block,`${prefix}pr-agent-${id}`);
      assert.equal(Boolean(button),agent);
      if(button) {
        const box=geometry.get(button);near(box.width,24*zoom,'Robot hit width');near(box.height,24*zoom,'Robot hit height');
        near(right(box),expected,'Robot hit target uses the reserved edge');assert.equal(Boolean(button.attrs.on_click),mode!=='ghost');
        assert.equal(button.attrs.tooltip,undefined,'Robot remains without a tooltip');
        const glyph=nodes(button).find(node=>node.attrs.asset?.[0]==='icons/agent.svg');
        near(centre(geometry.get(glyph)),centre(robot),'Robot glyph is centred in its reserved column');
        near(geometry.get(glyph).width,16*zoom,'Robot glyph retains its existing size');
      } else {assert.equal(slot.kids.length,0);assert.equal(slot.attrs.on_click,undefined);}
      comparisons++;
    }
    if(mode==='coordinator') {
      const header=find(tree,'task-repo-header-owner/repo'),slot=header.kids.at(-1),glyph=slot.kids[0],box=geometry.get(slot);
      near(right(box),expected,'Header chevron slot right edge equals robot and pill edges');
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
        near(right(foldedBoxes.get(foldedHeader.kids.at(-1))),expected,'Expanded and folded chevron slots share the same edge');
      }
    }
    // Mutations must fail at complete-panel level even when all row-local
    // equalities still hold: old padding, old header slot and an extra border.
    if(mode==='coordinator' && agent && state==='OPEN') {
      const row=find(tree,'pr-owner/repo#17'),header=find(tree,'task-repo-header-owner/repo');
      row.pr(8);assert.notEqual(right(rowGeometry(tree,width,zoom,600).get(find(row,'pr-agent-slot-owner/repo#17'))),expected);row.pr(6);
      header.pr(4);header.kids.at(-1).size(16);
      assert.notEqual(right(rowGeometry(tree,width,zoom,600).get(header.kids.at(-1))),expected);
      header.pr(6);header.kids.at(-1).size(24);
      find(tree,'task-pulls-scroll').border_1();
      assert.notEqual(right(rowGeometry(tree,width,zoom,600).get(find(row,'pr-agent-slot-owner/repo#17'))),expected);
    }
  }
}
// Exercise main's windowed scroll renderer and warm distinct-string widths.
const {measureTask,scrollTask,taskWindow,taskContent}=await import('./support/git-scroll.mjs');
let pagedComparisons=0;
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2])for(const view of ['open','closed']) {
  h.setZoom(zoom);h.setAgent(true);panel.view=view;panel.pinMotion=null;panel.taskWindows?.clear();panel.foldedRepositories.clear();
  const rows=Array.from({length:25},(_,i)=>Object.assign(facts.pullRow({...raw,number:i+1,state:view==='open'?'OPEN':'MERGED'},'owner',now),
    {key:`owner/repo#${i+1}`,repo:'owner/repo'}));
  Object.assign(panel.aggregate,{rows:()=>rows,counts:()=>({open:25,closed:25}),entries:new Map(rows.map(pr=>[pr.key,{pr,link:{repo:pr.repo}}]))});
  panel.syncAggregate=()=>true;
  const spaceTree=spaces.render(),expected=right(rowGeometry(spaceTree,width,zoom,600).get(find(spaceTree,'space-tag-coordinator-crew-0')));
  const seen=new Set();let offset=0;
  while(true) {
    const {tree,geometry}=h.settle(()=>panel.render(h.cx),width,zoom,600);
    const viewport=find(tree,`task-pulls-list-home-${view}`);
    assert.ok(viewport,'Continuous scrolling retains one native scroll identity');assert.equal(taskContent(tree).attrs.p[0],4);
    assert.equal(find(tree,'task-pulls-pages'),undefined);
    const header=find(tree,'task-repo-header-owner/repo');if(header)near(right(geometry.get(header.kids.at(-1))),expected,'Header slot shares the Spaces edge');
    const visible=nodes(viewport).filter(node=>/^pr-owner\/repo#\d+$/.test(node.attrs.id?.[0]??''));
    assert.ok(visible.length<=10,'Alignment must preserve main\'s bounded page size');
    for(const row of visible) {
      const id=row.attrs.id[0].slice(3);seen.add(id);
      near(right(geometry.get(find(row,`pr-agent-slot-${id}`))),expected,'Paged robot slot shares the Spaces edge');
      near(right(geometry.get(find(row,`pr-labels-${id}`).kids.at(-1))),expected,'Paged actual pill shares the Spaces edge');
      near(geometry.get(row).height,74*zoom,'Paged rows preserve their vertical geometry');pagedComparisons++;
    }
    measureTask(panel,tree,h.cx,400,width,zoom);
    const w=taskWindow(panel);if(w.limit>=w.items.length && w.offset>=w.max)break;
    offset+=250;scrollTask(panel,tree,h.cx,offset,400,zoom);
  }
  assert.deepEqual([...seen].sort(),rows.map(pr=>pr.key).sort(),'Every PR remains reachable with unchanged alignment');
}
console.log(`PASS ${pagedComparisons} windowed-scroll right-edge comparisons and stable native scroll identity across widths/zoom/Open/Closed`);
console.log(`PASS ${comparisons} full-panel right-edge comparisons against actual Spaces Crew geometry, 280–480px / 75–200% including 130%, ordinary/pinned/scrolling/ghost/coordinator, Open/Closed/merged and mutation guards (synthetic, not native pixels)`);
