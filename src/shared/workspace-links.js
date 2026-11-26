// Pure domain adapter: shared reorder owns gestures; public host commands own order.
export function linkedBlocks(all, links) {
  const present=new Map(all.map(s=>[s.id,s])), parents=new Map(), owners=new Map();
  for(const link of links) {
    const parent=present.get(link.parent),child=present.get(link.child);
    if(!parent || !child || (parent.machine??null)!==(child.machine??null) || parent.id===child.id)continue;
    const claims=owners.get(child.id)??new Set();claims.add(parent.id);owners.set(child.id,claims);
    const members=parents.get(parent.id)??new Map(),prior=members.get(child.id);
    if(prior && prior.binding!==link.binding)claims.add(null);
    members.set(child.id,link);parents.set(parent.id,members);
  }
  const children=new Set(),blocks=new Map();
  for(const [parent,members]of parents) {
    // Flat coordinator children only; ambiguous owners/nested cycles fail closed.
    const accepted=all.filter(s=>members.has(s.id) && owners.get(s.id)?.size===1 && !parents.has(s.id) && !owners.has(parent));
    if(!accepted.length)continue;
    const records=accepted.map(s=>members.get(s.id));accepted.forEach(s=>children.add(s.id));
    blocks.set(parent,{ids:[parent,...accepted.map(s=>s.id)],binding:records.length===1?records[0].binding??null:JSON.stringify(records.map(l=>[l.child,l.binding??null]).sort((a,b)=>a[0].localeCompare(b[0]))),names:Object.fromEntries(records.filter(l=>l.name).map(l=>[l.child,l.name]))});
  }
  return all.filter(s=>!children.has(s.id)).map(s=>({...blocks.get(s.id),ids:blocks.get(s.id)?.ids??[s.id],binding:blocks.get(s.id)?.binding??null,machine:s.machine??null}));
}
// Canonicalize old order-sensitive fold keys as well as current membership.
export function spaceBlockKey(machine,ids,binding) {
  try {const records=JSON.parse(binding);if(Array.isArray(records) && records.every(r=>Array.isArray(r)&&typeof r[0]==='string'))binding=JSON.stringify(records.sort((a,b)=>a[0].localeCompare(b[0])));}catch{}
  return JSON.stringify([machine??null,[...ids].sort(),binding??null]);
}
export function captureSpaceBlock(all,links,id) {
  const block=linkedBlocks(all,links).find(b=>b.ids.includes(id));
  if(!block)return null;
  return block.ids[0]===id ? {sources:block.ids,binding:block.binding}
    : {sources:[id],parent:block.ids[0],members:[...block.ids].sort(),order:block.ids.slice(1),binding:block.binding};
}
export function projectLinkedRows(rows,links) {
  const map=new Map(rows.map(r=>[r.w.id,r]));
  return linkedBlocks(rows.map(r=>r.w),links).flatMap(block=>block.ids.map((id,i)=>{
    const row=map.get(id),name=block.names?.[id];
    return {...row,w:name && row.w.named===false?{...row.w,name}:row.w,linked:i>0,firstChild:i===1,lastChild:i===block.ids.length-1,block:block.ids,binding:block.binding};
  })).map((r,position)=>({...r,position}));
}
export function blockTarget(all,links,source,target) {
  const blocks=linkedBlocks(all,links),from=blocks.findIndex(b=>b.ids.includes(source)),to=blocks.findIndex(b=>b.ids.includes(target));
  if(from>=0 && blocks[from].ids[0]!==source) {
    const siblings=blocks[from].ids.slice(1);
    return siblings.includes(target) ? target : to<=from ? siblings[0] : siblings.at(-1);
  }
  return from<0 || to<0 ? target : from<to ? blocks[to].ids.at(-1) : blocks[to].ids[0];
}
export function planBlockDrop(all,links,source,target,captured) {
  const blocks=linkedBlocks(all,links),from=blocks.findIndex(b=>b.ids.includes(source)),to=blocks.findIndex(b=>b.ids.includes(target));
  if(from<0 || to<0 || blocks[from].machine!==blocks[to].machine) return null;
  if(JSON.stringify(captureSpaceBlock(all,links,source))!==JSON.stringify(captured)) return null;
  if(captured.parent) {
    const siblings=blocks[from].ids.slice(1),start=siblings.indexOf(source),end=siblings.indexOf(target);
    if(start<0 || end<0 || start===end)return null;
    const reordered=[...siblings];reordered.splice(end,0,...reordered.splice(start,1));
    let at=0;return all.map(s=>siblings.includes(s.id)?reordered[at++]:s.id);
  }
  if(from===to)return null;
  const moved=blocks.splice(from,1)[0];blocks.splice(to,0,moved);
  const mine=blocks.filter(b=>b.machine===moved.machine).flatMap(b=>b.ids);
  let at=0;return all.map(s=>(s.machine??null)===moved.machine ? mine[at++] : s.id);
}
export class SpaceBlockCommit {
  constructor({read,links,move,fail}) {Object.assign(this,{read,links,move,fail});}
  start(source,captured,wanted) {
    if(this.pending || !wanted) return;
    this.pending={source,captured,wanted,expected:null,before:null};this.observe();
  }
  observe(now=Date.now()) {
    const p=this.pending;if(!p) return;
    const all=this.read(),ids=all.map(s=>s.id),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const stop=message=>{this.pending=null;this.fail(message);};
    const captured=captureSpaceBlock(all,this.links(),p.source);
    // Own acknowledged permutations may change sibling order, not membership.
    // Before the first command the complete gesture snapshot must still match.
    if(!same(p.captured.parent && p.before && captured?{...captured,order:p.captured.order}:captured,p.captured)) return stop('Space relationship changed; ordering stopped');
    if(p.expected) {
      if(same(ids,p.before)) {if(now-p.at>5000)stop('Space move acknowledgement missing; ordering outcome unknown');return;}
      if(!same(ids,p.expected)) return stop('Space order changed concurrently; ordering stopped');
    }
    const index=p.wanted.findIndex((id,i)=>ids[i]!==id);
    if(index<0) {this.pending=null;return;}
    const id=p.wanted[index],from=ids.indexOf(id);
    if(from<0 || ids.length!==p.wanted.length) return stop('Space membership changed; ordering stopped');
    p.before=ids;p.expected=[...ids];p.expected.splice(from,1);p.expected.splice(index,0,id);p.at=now;
    try {this.move(id,index+1);}catch {stop('Could not reorder spaces; check their actual order');}
  }
}
