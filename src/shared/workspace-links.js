// Pure domain adapter: shared reorder owns gestures; public host commands own order.
export function linkedBlocks(all, links) {
  const present=new Map(all.map(s=>[s.id,s])), parents=new Map(), children=new Set();
  for(const link of links) {
    const parent=present.get(link.parent),child=present.get(link.child);
    if(!parent || !child || (parent.machine??null)!==(child.machine??null) || parent.id===child.id || parents.has(parent.id) || children.has(child.id)) continue;
    parents.set(parent.id,link);children.add(child.id);
  }
  return all.filter(s=>!children.has(s.id)).map(s=> {
    const link=parents.get(s.id);return {ids:link?[s.id,link.child]:[s.id],binding:link?.binding??null,machine:s.machine??null};
  });
}
export function captureSpaceBlock(all,links,id) {
  const block=linkedBlocks(all,links).find(b=>b.ids.includes(id));
  return block ? {sources:block.ids,binding:block.binding} : null;
}
export function projectLinkedRows(rows,links) {
  const map=new Map(rows.map(r=>[r.w.id,r]));
  return linkedBlocks(rows.map(r=>r.w),links).flatMap(block=>block.ids.map((id,i)=>({...map.get(id),linked:i>0,block:block.ids,binding:block.binding}))).map((r,position)=>({...r,position}));
}
export function blockTarget(all,links,source,target) {
  const blocks=linkedBlocks(all,links),from=blocks.findIndex(b=>b.ids.includes(source)),to=blocks.findIndex(b=>b.ids.includes(target));
  return from<0 || to<0 ? target : from<to ? blocks[to].ids.at(-1) : blocks[to].ids[0];
}
export function planBlockDrop(all,links,source,target,captured) {
  const blocks=linkedBlocks(all,links),from=blocks.findIndex(b=>b.ids.includes(source)),to=blocks.findIndex(b=>b.ids.includes(target));
  if(from<0 || to<0 || from===to || blocks[from].machine!==blocks[to].machine) return null;
  if(JSON.stringify(captureSpaceBlock(all,links,source))!==JSON.stringify(captured)) return null;
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
    if(!same(captureSpaceBlock(all,this.links(),p.source),p.captured)) return stop('Space relationship changed; ordering stopped');
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
