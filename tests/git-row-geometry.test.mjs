import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,words,t} from './support/git-row.mjs';
// Independent host semantics: line-height numbers are font multipliers; px
// strings and numeric element sizes are absolute logical pixels.
for(const zoom of [0.75,1,1.25,1.5,2])for(const [line,font,expected] of [[20,13,260],[18,11,198],[1.5,11,16.5],['20px',13,20],['18px',11,18]]) {
  const tree=element().text_size(17).line_height(line).child(element().text_size(font).size(24).child('sample'));
  const geometry=rowGeometry(tree,100,zoom),text=geometry.textLines[0];
  assert.equal(text.lineHeight,expected*zoom);assert.equal(text.fontSize,font*zoom);
  assert.equal(geometry.get(tree.kids[0]).width,24*zoom);
}
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} != ${expected}`);
// Relative movement carries ordinary and absolute descendants without changing
// the parent's layout reservation, including the two painted task-ring paths.
for(const zoom of [1,1.3]) {
  const relative=element().size(12).relative().top(1).children([element().size(12),element().absolute().inset_0().size_full()]);
  const tree=element().flex().items_center().h(18).child(relative),geometry=rowGeometry(tree,100,zoom);
  for(const node of nodes(relative))near(geometry.get(node).y,4*zoom,'Relative positioning translates the complete icon subtree');
  near(geometry.get(tree).height,18*zoom,'Relative positioning does not resize the line');
}
function assertChecksFit(geometry,row) {
  const check=nodes(row).find(n=>/^(?:swap-)?pr-checks-/.test(n.attrs?.id?.[0]??'')&&!n.attrs.id[0].endsWith('-probe'));
  if(!check)return;
  const line=geometry.visibleTextLines.find(l=>l.ancestors.includes(check));
  assert.ok(line && /^\d+\/\d+$/.test(line.text),'A count must keep all digits');
  for(const ancestor of line.ancestors) {
    assert.equal(ancestor.attrs?.truncate,undefined,'Checks must never use an ellipsis');
    const box=geometry.get(ancestor);
    assert.ok(line.x>=box.x-1e-6 && line.x+line.naturalWidth<=box.x+box.width+1e-6,`Full count ${line.text} must fit ${ancestor.attrs?.id?.[0]??'ancestor'}`);
  }
}
function assertStatusIcons(geometry,row,zoom) {
  const prefix=row.attrs.id[0].startsWith('swap-')?'swap-':'',id=row.attrs.id[0].slice(`${prefix}pr-`.length);
  const line=geometry.get(find(row,`${prefix}pr-meta-${id}`));
  for(const kind of ['task','check']) {
    const group=find(row,`${prefix}pr-${kind==='task'?'tasks':'checks'}-${id}`);
    if(!group)continue;
    const slot=find(group,`${prefix}pr-${kind}-icon-${id}`);assert.ok(slot,`${kind} has one shared icon slot`);
    const box=geometry.get(slot);
    near(box.width,12*zoom,`${kind} slot width`);near(box.height,12*zoom,`${kind} slot height`);
    near(box.y+box.height/2,line.y+line.height/2+zoom,`${kind} icon centre is lowered one logical pixel`);
    for(const glyph of nodes(slot).filter(node=>node!==slot)) {
      const ink=geometry.get(glyph);
      near(ink.y+ink.height/2,box.y+box.height/2,`${kind} glyph/path follows its slot`);
    }
    const text=group.kids.at(-1),textBox=geometry.get(text);
    near(textBox.y,line.y,'Status text stays at its original vertical anchor');
    near(textBox.height,line.height,'Status text keeps its 18px line box');
  }
  for(const separator of find(row,`${prefix}pr-meta-${id}`).kids.filter(node=>!node.attrs.id)) {
    const box=geometry.get(separator);
    near(box.y+box.height/2,line.y+line.height/2+1.5*zoom,'Separators retain their existing optical offset');
  }
}
function assertTextFits(geometry,row) {
  const lines=geometry.visibleTextLines.filter(line=>line.ancestors.includes(row));
  assert.ok(lines.length);
  for(const line of lines) {
    const cell=[...line.ancestors].reverse().find(node=>/^(?:swap-)?pr-(?:title-line|byline|meta)-/.test(node.attrs?.id?.[0]??''));
    assert.ok(cell,`Missing containing line for ${line.text}`);
    assert.ok(line.lineHeight<=geometry.get(cell).height+1e-6,`${cell.attrs.id[0]} text line height ${line.lineHeight} exceeds cell ${geometry.get(cell).height}: ${line.text}`);
    if(line.text.trim()==='…')assert.ok(line.ancestors.some(node=>node.attrs.id?.[0]?.endsWith('-ellipsis')),'Only an explicitly styled title suffix may be a standalone ellipsis; metadata must not collapse to one');
  }
}
function assertNaturalRun(geometry,line,zoom) {
  const box=geometry.get(line),right=line.kids.find(n=>n.attrs.id?.[0]?.endsWith('-right'));
  const left=line.kids.filter(n=>n!==right),labelGroup=right?.kids[0];
  assert.equal(line.attrs.gap[0],6);assert.equal(line.attrs.flex_wrap,undefined);
  let end=box.x;
  for(const [index,node] of left.entries()) {
    const child=geometry.get(node);
    near(child.x,index?end+6*zoom:box.x,'Left flow has constant gaps, not stretched columns');
    if(!node.attrs.id)near(child.width,3*zoom,'Separator dot has constant width');
    assert.equal(node.attrs.flex_1,undefined);assert.equal(node.attrs.flex_grow,undefined);assert.equal(node.attrs.flex_basis,undefined);
    assert.equal(node.attrs.truncate,undefined,'No lone-ellipsis metadata');
    end=child.x+child.width;
  }
  assert.ok(end<=box.x+box.width+1e-6,'Run stays inside the available line');
  if(right) {
    assert.ok(right.attrs.flex_1,'Only the space before labels grows');
    assert.ok(right.attrs.justify_end && labelGroup.attrs.justify_end,'Both the label group and its clipped pills align right');
    const labels=geometry.get(labelGroup),last=geometry.get(labelGroup.kids.at(-1));
    near(labels.x+labels.width,box.x+box.width,'Label group shares the content right edge');
    near(last.x+last.width,box.x+box.width,'Actual trailing pill shares the content right edge, even when clipped');
    assert.ok(labels.x>=end+(left.length?6*zoom:0)-1e-6,'Labels cannot overlap the left run');
    assert.ok(left.every((n,i)=>n.attrs.id || (i>0 && i<left.length-1)),'No separator before labels or at a left-run boundary');
    assert.equal(right.kids.length,1,'No separator or placeholder inside the right slot');
  }
  // Independent oracle groups are not scheduled native measurement nodes.
  const probes=[...geometry.intrinsic.values()].filter(p=>p.line===line.attrs.id[0]&&!p.short);
  const hasLabels=probes.some(p=>p.kind==='labels');
  const leftCount=probes.length-Number(hasLabels);
  const needed=probes.reduce((sum,p)=>sum+p.width,0)+(Math.max(0,leftCount-1)*15+(leftCount&&hasLabels?6:0))*zoom;
  if(needed<=box.width+1e-6) {
    const groups=[...left.filter(n=>n.attrs.id),...(labelGroup?[labelGroup]:[])];
    assert.equal(groups.length,probes.length,'All fitting facts remain visible');
    for(const [index,node] of groups.entries()) {
      near(geometry.get(node).width,probes[index].width,'Fitting values use full natural widths');
      assert.equal(words(node).join(''),words(probes[index].node).join(''),'No semantic shortening while the whole line fits');
      for(const text of geometry.visibleTextLines.filter(l=>l.ancestors.includes(node))) {
        assert.ok(text.x+text.naturalWidth<=geometry.get(node).x+geometry.get(node).width+1e-6,'Fitting text is not clipped');
      }
    }
    if(!right)near(box.x+box.width-end,box.width-needed,'Without labels unused space stays at the end');
    else near(geometry.get(labelGroup).x-end-(left.length?6*zoom:0),box.width-needed,'With labels unused space lies between the left run and pills');
  }
}
const h=await rowHarness(),{panel,facts,U}=h;panel.foldedRepositories=new Set();
const now=Date.parse('2026-11-20T14:00:00Z');
const source={number:17,title:'A deliberately very long PR title that must truncate at exactly the same boundary',url:'https://github.com/owner/repo/pull/17',author:{login:'long-author-name'},createdAt:'2026-11-20T10:00:00Z',closedAt:'2026-11-20T10:00:00Z',mergedAt:'2026-11-20T10:00:00Z',state:'OPEN'};
const labels=[{name:'🤖 Review',color:'840479'},{name:'🚀 Very long label '.repeat(12),color:'ffffff'}];
const cases=[
  ['empty',{}],['tasks untouched',{body:'- [ ] one\n- [ ] two'}],['tasks partial',{body:'- [x] one\n- [ ] two'}],['tasks done',{body:'- [x] one\n- [x] two'}],
  ['large tasks',{body:Array.from({length:100},(_,i)=>`- [${i<99?'x':' '}] task`).join('\n')}],
  ...[1,10,11,99,101].flatMap(total=>['SUCCESS','FAILURE','PENDING'].map(state=>[`count ${state} ${total}`,{statusCheckRollup:Array.from({length:total},(_,i)=>({name:`check ${i}`,status:state==='PENDING'&&i>=3?'IN_PROGRESS':'COMPLETED',conclusion:state==='FAILURE'&&i===0?'FAILURE':'SUCCESS'}))}])),
  ...['NEUTRAL','SKIPPED','IN_PROGRESS','FAILURE'].map(state=>[`icon ${state}`,{body:'- [x] one\n- [ ] two',statusCheckRollup:[{name:'CI',status:state==='IN_PROGRESS'?state:'COMPLETED',conclusion:state==='IN_PROGRESS'?null:state}]}]),
  ['one label',{labels:labels.slice(0,1)}],['long labels',{labels}],['approved',{reviewDecision:'APPROVED'}],['changes requested',{reviewDecision:'CHANGES_REQUESTED'}],
  ['missing author',{author:null}],['conflict',{mergeable:'CONFLICTING'}],
  ...Array.from({length:16},(_,mask)=>[`optional mask ${mask}`,{body:mask&1?'- [x] done':'',statusCheckRollup:mask&2?[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]:[],labels:mask&4?labels:[],reviewDecision:mask&8?'APPROVED':''}]),
];
const anchors=['state-slot','title-line','title','agent-slot','byline','meta'];
const plain=box=>Object.fromEntries(Object.entries(box).map(([k,v])=>[k,Number(v.toFixed(6))]));
let comparisons=0;
for(const mode of ['ordinary','pinned','scrolling','coordinator','ghost'])for(const state of ['OPEN','CLOSED','MERGED'])for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2]){
  h.setZoom(zoom);panel.view=state==='OPEN'?'open':'closed';
  const build=(overrides,agent)=>{
    h.setAgent(agent);
    const pr=facts.pullRow({...source,state,...overrides},'owner',now);if(mode==='coordinator')Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
    const next={...pr,number:18,key:pr.key?'owner/repo#18':undefined};
    const prefix=mode==='ghost'?'swap-':'',id=pr.key??pr.number;
    const {tree,geometry}=h.settle(()=>{
      if(mode==='pinned'||mode==='scrolling'){
        panel.pulls[panel.view]=[pr,next];panel.agentPull=mode==='pinned'?17:null;return panel.renderPulls(t);
      }
      if(mode==='coordinator')return panel.repositorySection(t,{repo:'owner/repo',rows:[pr,next]},'home');
      return element().flex().flex_col().gap(U.rowGap).children([panel.pullRow(t,pr,mode==='ghost'),panel.pullRow(t,next,mode==='ghost')]);
    },width,zoom,mode==='pinned'||mode==='scrolling'?600:undefined);
    const row=find(tree,`${prefix}pr-${id}`),box=geometry.get(row);
    assertTextFits(geometry,row);assertChecksFit(geometry,row);assertStatusIcons(geometry,row,zoom);
    for(const kind of ['byline','meta'])assertNaturalRun(geometry,find(row,`${prefix}pr-${kind}-${id}`),zoom);
    const task=find(row,`${prefix}pr-tasks-${id}`);
    if(task)assert.ok([pr.tasks.label,`${pr.tasks.done}/${pr.tasks.total}`].includes(words(task).join('')),'Tasks remain full or shorten as a whole fraction');
    const time=find(row,`${prefix}pr-time-${id}`);
    if(time)assert.ok([pr.when,pr.compactWhen].includes(words(time).join('')),'Time remains full or shortens semantically');
    const snapshot=Object.fromEntries(anchors.map(kind=>{
      const node=find(row,`${prefix}pr-${kind}-${id}`);assert.ok(node,kind);return [kind,plain(geometry.get(node))];
    }));
    snapshot.row=plain(box);snapshot.next=plain(geometry.get(find(tree,`${prefix}pr-${pr.key?'owner/repo#18':18}`)));
    near(box.height,74*zoom,'Block height');near(snapshot['title-line'].height,20*zoom,'Title height');near(snapshot.byline.height,18*zoom,'Byline height');near(snapshot.meta.height,18*zoom,'Metadata height');
    near(snapshot.title.x,(box.x/zoom+32)*zoom,'Title left reservation');near(snapshot.title.width,(box.width/zoom-63)*zoom,'Empty robot keeps title boundary with 3px trailing padding');
    near(snapshot['agent-slot'].width,24*zoom,'Robot reservation');
    const labelStrip=find(row,`${prefix}pr-labels-${id}`);
    if(labelStrip) {
      const pill=geometry.get(labelStrip.kids.at(-1)),robot=geometry.get(find(row,`${prefix}pr-agent-slot-${id}`));
      near(pill.x+pill.width,robot.x+robot.width,'Pills end at the robot control outer edge, not its inset glyph');
    }
    const button=find(row,`${prefix}pr-agent-${id}`),slot=find(row,`${prefix}pr-agent-slot-${id}`);
    assert.equal(Boolean(button),agent);
    if(!agent){assert.equal(slot.kids.length,0);assert.equal(slot.attrs.on_click,undefined);assert.equal(slot.attrs.role,undefined);}
    if(button){assert.equal(geometry.get(button).height,24*zoom);assert.equal(Boolean(button.attrs.on_click),mode!=='ghost');}
    if(pr.checks){const icon=geometry.get(find(row,`${prefix}pr-check-icon-${id}`));assert.equal(icon.width,12*zoom);assert.equal(icon.height,12*zoom);}
    return snapshot;
  };
  const baseline=build({},false);
  for(const [name,overrides] of cases)for(const agent of [false,true,false]){
    assert.deepEqual(build(overrides,agent),baseline,`${mode}/${state} width=${width} zoom=${zoom} ${name} agent=${agent}`);comparisons++;
  }
}
// Every task variant paired with every checks-slot occupant, including the
// unknown-state fallback. Neutral/skipped normalize to the success checkmark.
// Cover coordinator ghosts too, independently of the broad row matrix above.
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.3,1.5,2])for(const done of [0,1,2])for(const state of ['SUCCESS','FAILURE','IN_PROGRESS','NEUTRAL','SKIPPED','unknown']) {
  h.setZoom(zoom);
  const pr=facts.pullRow({...source,body:`- [${done>0?'x':' '}] one\n- [${done>1?'x':' '}] two`,statusCheckRollup:[{name:'CI',status:state==='IN_PROGRESS'?state:'COMPLETED',conclusion:state}]},'owner',now);
  if(state==='unknown')pr.checks.state='unknown';
  if(coordinator)pr.key='owner/repo#17';
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),390,zoom);
  assertStatusIcons(geometry,tree,zoom);
  const prefix=ghost?'swap-':'',id=pr.key??17,slot=find(tree,`${prefix}pr-check-icon-${id}`),glyph=slot.kids[0];
  if(['IN_PROGRESS','unknown'].includes(state))assert.equal(glyph.attrs.asset,undefined,'Pending/unknown uses the shared dot fallback');
  else assert.equal(glyph.attrs.asset[0],`mods/custom-workspace-chrome/${state==='FAILURE'?'x':'check'}.svg`);
  // Removing either offset must fail, and restoring the old position must not
  // change any horizontal box, text anchor, separator or outer row/line box.
  for(const kind of ['task','check']) {
    const icon=find(tree,`${prefix}pr-${kind}-icon-${id}`),moving=new Set(nodes(icon));
    icon.top(0);const old=rowGeometry(tree,390,zoom);
    assert.throws(()=>assertStatusIcons(old,tree,zoom),/icon centre is lowered one logical pixel/);
    for(const node of nodes(tree)) {
      const before=old.get(node),after=geometry.get(node);
      for(const key of ['x','width','height'])near(after[key],before[key],`Nudge preserves ${key}`);
      near(after.y-before.y,moving.has(node)?zoom:0,'Only the requested icon subtree moves');
    }
    icon.top(1);
  }
}
// Screenshot-shaped content: at ~390 logical px, no forced compact forms,
// fixed checks/task budgets or stretched byline; free status space precedes labels.
const screenshot=facts.pullRow({...source,number:41,author:{login:'timurproko'},body:'- [x] one\n- [x] two',labels:[{name:'🤖 Approved',color:'1a7f37'}],statusCheckRollup:Array.from({length:11},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))},'owner',now);
for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  h.setZoom(zoom);
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,screenshot),390,zoom);
  assert.equal(words(find(tree,'pr-tasks-41')).join(''),'2 tasks done');assert.equal(words(find(tree,'pr-time-41')).join(''),'opened 4 hours ago');
  for(const kind of ['meta','byline'])assertNaturalRun(geometry,find(tree,`pr-${kind}-41`),zoom);
}
// Both lower lines use the same centred dot. Icon paint moves exactly one
// logical pixel for every task/check variant, without moving any layout box,
// text, pill, tooltip or probe. These are logical boxes, not native ink bounds.
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.3,1.5,2])
for(const done of [0,1,2])for(const state of ['success','failure','pending','unknown']) {
  h.setZoom(zoom);
  const pr={...screenshot,number:17,tasks:{done,total:2,label:done===2?'2 tasks done':done===1?'1 of 2 tasks':'2 tasks'},checks:{state,label:'11/11'}};
  if(coordinator)pr.key='owner/repo#17';
  const prefix=ghost?'swap-':'',id=pr.key??pr.number;
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),390,zoom);
  const centre=node=>{const box=geometry.get(node);return box.y+box.height/2;};
  const byline=find(tree,`${prefix}pr-byline-${id}`),meta=find(tree,`${prefix}pr-meta-${id}`);
  const dotOffsets=[byline,meta].map(line=>{
    const dots=line.kids.filter(n=>!n.attrs.id);assert.ok(dots.length);
    for(const dot of dots)near(centre(dot)-centre(line),0,'No separator optical drop');
    return centre(dots[0])-centre(line);
  });
  near(dotOffsets[0],dotOffsets[1],'Byline and status separator offsets are identical');
  const icons=['task','check'].map(kind=>find(tree,`${prefix}pr-${kind}-icon-${id}`));
  for(const icon of icons) {
    assert.deepEqual(icon.attrs.relative,[]);assert.deepEqual(icon.attrs.top,[1]);
    near(centre(icon)-centre(meta),zoom,'Every icon variant moves down exactly one logical pixel');
    near(geometry.get(icon).width,12*zoom,'Icon width is unchanged');
    near(geometry.get(icon).height,12*zoom,'Icon height is unchanged');
    delete icon.attrs.top;
  }
  const unshifted=rowGeometry(tree,390,zoom);
  for(const [node,box] of geometry)if(typeof node==='object') {
    const expected=icons.includes(node)?{...box,y:box.y-zoom}:box;
    assert.deepEqual(plain(unshifted.get(node)),plain(expected),'Icon offsets do not move neighbours or change horizontal geometry');
  }
  // Reintroducing either defect must fail the same geometric assertions.
  meta.kids.find(n=>!n.attrs.id).relative().top(1.5);
  const dropped=rowGeometry(tree,390,zoom),dot=meta.kids.find(n=>!n.attrs.id);
  assert.notEqual(dropped.get(dot).y,geometry.get(dot).y,'The old optical drop is detected');
  assert.notEqual(unshifted.get(icons[0]).y,geometry.get(icons[0]).y,'A missing icon offset is detected');
}
// Cross-row screenshot regression: different words and task/check widths,
// including missing checks, must share the actual pill edge (not just a slot).
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  h.setZoom(zoom);let edge;
  for(const name of ['🤖 Review','🤖 Rework','🤖 Approved'])for(const total of [0,1,6,11,101])for(const body of ['', '- [ ] one\n- [ ] two', '- [x] one\n- [ ] two', '- [x] one\n- [x] two']) {
    const pr=facts.pullRow({...source,labels:[{name,color:'840479'}],body,statusCheckRollup:Array.from({length:total},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))},'owner',now);
    const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr),width,zoom);
    const meta=find(tree,'pr-meta-17'),strip=find(tree,'pr-labels-17');assert.ok(strip);
    assertNaturalRun(geometry,meta,zoom);assertChecksFit(geometry,tree);
    const box=geometry.get(strip.kids[0]),robot=geometry.get(find(tree,'pr-agent-slot-17'));
    edge??=box.x+box.width;near(box.x+box.width,edge,'Pill edges are equal across changing facts and label names');
    near(edge,robot.x+robot.width,'Shared edge matches the title robot control');
    const probe=geometry.intrinsic.get('pr-meta-17-probe-labels-full');
    near(geometry.get(strip).width,probe.width,'Review/Rework/Approved retain whole words throughout the supported matrix');
    assert.equal(strip.attrs.tooltip,undefined,'A complete visible label has no repeat-only group tooltip');
  }
}
// Exact whole-line fit thresholds from independent natural probes: one pixel
// less selects compact wording before sacrificing label/author width.
h.setZoom(1);
for(const [kind,shortKind,textKind] of [['meta','tasks','tasks'],['byline','time','time']]) {
  const wide=h.settle(()=>panel.pullRow(t,screenshot),480),line=find(wide.tree,`pr-${kind}-41`);
  const probes=[...wide.geometry.intrinsic.values()].filter(p=>p.line===`pr-${kind}-41`&&!p.short);
  const leftCount=probes.length-(kind==='meta'?1:0);
  const needed=probes.reduce((sum,p)=>sum+p.width,0)+Math.max(0,leftCount-1)*15+(kind==='meta'?6:0);
  const rowInset=480-wide.geometry.get(line).width;
  const fits=h.settle(()=>panel.pullRow(t,screenshot),needed+rowInset+1);
  const narrow=h.settle(()=>panel.pullRow(t,screenshot),needed+rowInset-1);
  assert.equal(words(find(fits.tree,`pr-${textKind}-41`)).join(''),kind==='meta'?'2 tasks done':'opened 4 hours ago');
  assert.equal(words(find(narrow.tree,`pr-${textKind}-41`)).join(''),kind==='meta'?'2/2':'4h ago');
  const fullProbe=narrow.geometry.intrinsic.get(`pr-${kind}-41-probe-${shortKind}-full`);
  assert.ok(fullProbe.width>narrow.geometry.get(find(narrow.tree,`pr-${textKind}-41`)).width);
  const retainedKind=kind==='meta'?'labels':'author';
  near(narrow.geometry.get(find(narrow.tree,`pr-${retainedKind}-41`)).width,wide.geometry.get(find(wide.tree,`pr-${retainedKind}-41`)).width,'Shorten before clipping neighboring content');
}
// Secondary review-decision text loses width before label words do, after
// compaction. Only further overflow clips labels, without sacrificing checks.
{
  const pr=facts.pullRow({...source,body:'- [x] one\n- [x] two',labels:[{name:'🤖 Approved',color:'1a7f37'}],reviewDecision:'CHANGES_REQUESTED',statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]},'owner',now);
  const wide=h.settle(()=>panel.pullRow(t,pr),480),measure=kind=>wide.geometry.intrinsic.get(`pr-meta-17-probe-${kind}-full`).width;
  const compact=wide.geometry.intrinsic.get('pr-meta-17-probe-tasks-compact').width;
  const inset=480-wide.geometry.get(find(wide.tree,'pr-meta-17')).width;
  const compactNeeded=compact+measure('checks')+measure('review')+measure('labels')+36;
  const reduced=h.settle(()=>panel.pullRow(t,pr),inset+compactNeeded-1);
  assert.equal(words(find(reduced.tree,'pr-tasks-17')).join(''),'2/2');
  near(reduced.geometry.get(find(reduced.tree,'pr-labels-17')).width,measure('labels'),'Pill remains whole while review text can yield');
  near(reduced.geometry.get(find(reduced.tree,'pr-review-17')).width,measure('review')-1,'Separate review text yields first');
  const clipped=h.settle(()=>panel.pullRow(t,pr),inset+compact+measure('checks')+15+6+measure('labels')-10);
  assert.equal(find(clipped.tree,'pr-review-17'),undefined,'No empty review group or orphan separator');
  assert.ok(clipped.geometry.get(find(clipped.tree,'pr-labels-17')).width<measure('labels'));
  assertNaturalRun(clipped.geometry,find(clipped.tree,'pr-meta-17'),1);assertChecksFit(clipped.geometry,clipped.tree);
  assert.ok(find(clipped.tree,'pr-meta-17').attrs.tooltip[0].includes('Changes requested'),'Clipped values retain full tooltips');
}
// Measurement lifetime follows native IDs, not PR-data resets. Unchanged
// dimensions must not loop or notify; obsolete-context callbacks cannot publish.
{
  const current=h.settle(()=>panel.pullRow(t,screenshot),390),line=find(current.tree,'pr-meta-41');
  const callback=line.attrs.on_size_change[0],size=current.geometry.get(line),saved=panel.pullLineSizes.get('pr-meta-41');
  let notifications=0;const cx={notify(){notifications++;}};
  callback(size,cx);assert.equal(notifications,0,'Identical native sizes do not trigger rerenders');
  panel.resetRepository();assert.equal(panel.pullLineSizes.get('pr-meta-41'),saved,'Unchanged native IDs retain their measurements after facts reset');
  const context=panel.context,before=JSON.stringify(saved);panel.context='obsolete-callback-test';
  callback({width:999,height:18},cx);assert.equal(JSON.stringify(saved),before);assert.equal(notifications,0);
  panel.context=context;callback({width:NaN,height:18},cx);assert.equal(notifications,0);
  for(const zoom of [2,0.75,1]) {
    h.setZoom(zoom);const next=h.settle(()=>panel.pullRow(t,screenshot),390,zoom);
    near(panel.pullLineSizes.get('pr-meta-41').available,next.geometry.get(find(next.tree,'pr-meta-41')).width/zoom,'Native widths normalize by zoom');
  }
  const long={...screenshot,login:'a'.repeat(39)};
  const narrow=h.settle(()=>panel.pullRow(t,long),280);
  assert.equal(words(find(narrow.tree,'pr-time-41')).join(''),'4h ago');
  assertNaturalRun(narrow.geometry,find(narrow.tree,'pr-byline-41'),1);assertChecksFit(narrow.geometry,narrow.tree);
  const time=find(narrow.tree,'pr-time-41'),text=narrow.geometry.visibleTextLines.find(l=>l.ancestors.includes(time));
  assert.ok(text.x+text.naturalWidth<=narrow.geometry.get(time).x+narrow.geometry.get(time).width+1e-6,'Long authors cannot clip compact time');
}
// Count badges still reserve width independently of the natural PR runs.
for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.5,2]){
  let baseline;
  for(const count of [null,0,1,99,999,99999]){
    const tree=h.render(()=>element().flex().gap(2).children([panel.segment(t,'open','Open',count,true,()=>{}),panel.segment(t,'closed','Closed',count,false,()=>{})]));
    const boxes=rowGeometry(tree,width,zoom),snapshot=['open','closed','open-count-slot','closed-count-slot'].map(id=>plain(boxes.get(find(tree,id))));
    baseline??=snapshot;assert.deepEqual(snapshot,baseline);assert.equal(words(find(tree,'open-count-slot')).join(''),count>999?'999+':String(count??0));
    if(count==null||count<=999)for(const line of boxes.visibleTextLines.filter(l=>l.ancestors.includes(find(tree,'open-count-slot')))) {
      const badge=boxes.get(find(tree,'open-count-slot'));assert.ok(line.x+line.naturalWidth<=badge.x+badge.width-4*zoom+1e-6,'At least three digits fit inside badge padding');
    }
  }
}
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.5,2])for(const [kind,value] of [['title-line',20],['byline',18],['meta',18]]) {
  const pr={...screenshot,number:17};if(coordinator)pr.key='owner/repo#17';
  const row=panel.pullRow(t,pr,ghost),cell=find(row,`${ghost?'swap-':''}pr-${kind}-${pr.key??17}`);
  assertTextFits(rowGeometry(row,480,zoom),row);cell.line_height(value);
  for(const node of nodes(cell))if(node.attrs.line_height)node.line_height(value);
  assert.throws(()=>assertTextFits(rowGeometry(row,480,zoom),row),/text line height .* exceeds cell/);
}
// Mutations: removing the title reservation, stretching a fitting group,
// adding artificial fixed budgets or clipping the full checks count must fail.
h.setZoom(1);h.setAgent(false);
const sample=h.settle(()=>panel.pullRow(t,screenshot),390),row=sample.tree;
const mutatedGeometry=()=>{const geometry=rowGeometry(row,390);geometry.intrinsic=sample.geometry.intrinsic;return geometry;};
const title=find(row,'pr-title-41'),before=sample.geometry.get(title);find(row,'pr-title-line-41').kids.pop();
assert.notEqual(rowGeometry(row,390).get(title).width,before.width);
const meta=find(row,'pr-meta-41'),tasks=find(row,'pr-tasks-41');tasks.flex_grow(1);
assert.throws(()=>assertNaturalRun(mutatedGeometry(),meta,1),/stretched|natural widths|undefined/);
delete tasks.attrs.flex_grow;tasks.w(60);
assert.throws(()=>assertNaturalRun(mutatedGeometry(),meta,1),/natural widths/);
delete tasks.attrs.w;
const right=find(row,'pr-meta-41-right');delete right.attrs.justify_end;
assert.throws(()=>assertNaturalRun(mutatedGeometry(),meta,1),/align right|right edge/);right.justify_end();
meta.kids.splice(meta.kids.indexOf(right),0,element().size(3));
assert.throws(()=>assertNaturalRun(mutatedGeometry(),meta,1),/separator before labels/);meta.kids.splice(meta.kids.indexOf(right)-1,1);
find(row,'pr-checks-41').w(18).overflow_hidden();
assert.throws(()=>assertChecksFit(rowGeometry(row,390),row),/Full count .* must fit/);
console.log(`PASS ${comparisons} row comparisons: ordinary/pin/list/coordinator/ghost, Open/Closed/merged, 280/320/360/390/480px, 75–200% zoom including 130%, natural left runs/right-anchored pills without joining dots, priority shortening, complete checks, fixed title/vertical geometry and line-height/clipping mutations (synthetic, not GPUI pixels)`);
