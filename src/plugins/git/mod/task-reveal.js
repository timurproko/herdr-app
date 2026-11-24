// Pure revealed-prefix and anchor facts. No viewport virtualization/spacers.
// Native cold 200-row builds exceed the safe budget; cap each mounted batch.
export const MAX_MOUNTED_ROWS=60;
export const MAX_MOUNTED_ITEMS=100;
export class TaskReveal {
  constructor(){this.start=0;this.limit=10;this.chunk=0;this.maxRows=MAX_MOUNTED_ROWS;this.items=[];this.starts=[0];this.offset=0;this.viewport=0;this.generation=0;this.noticeHeights=new Map();this.headerHeight=28;this.gap=2;}
  get stop(){const c=this.stopCache;if(c&&c.items===this.items&&c.start===this.start&&c.maxRows===this.maxRows)return c.end;let rows=0,end=this.items.length;const extra=this.leading?1:0;for(let i=this.start;i<this.items.length;i++){if((this.maxRows!==Infinity&&i-this.start>=MAX_MOUNTED_ITEMS-extra)||(this.items[i].row&&++rows>this.maxRows)){end=this.items[i-1]?.header?i-1:i;break;}}this.stopCache={items:this.items,start:this.start,maxRows:this.maxRows,end};return end;}
  get end(){return Math.min(this.limit,this.stop,this.items.length);}
  get length(){return Math.max(0,this.end-this.start);}
  get leading(){return this.items[this.start]&&!this.items[this.start].header?this.headerHeight+this.gap:0;}
  position(i){return (this.starts[i]??0)-(this.starts[this.start]??0)+this.leading;}
  get height(){return this.position(this.end);}
  get contentHeight(){return this.height+8+(this.canTurn?28:0);}
  get max(){return Math.max(0,this.contentHeight-this.viewport);}
  get atCap(){return this.end>=this.stop&&this.stop<this.items.length;}
  get more(){return this.end<this.items.length;}
  get canTurn(){return this.atCap||(this.start>0&&!this.more);}
  index(y){let lo=this.start,hi=this.end;while(lo<hi){const mid=(lo+hi)>>>1;if(this.position(mid+1)<=y)lo=mid+1;else hi=mid;}return lo;}
  project(sections,folded,headerHeight,gap,geometryKey){
    const items=[];this.headerHeight=headerHeight;this.gap=gap;
    for(const section of sections){
      const group=[{key:`header:${section.repo}`,repo:section.repo,header:true,height:headerHeight}];
      if(!folded.has(section.repo)){
        for(const row of section.rows)group.push({key:row.key,repo:section.repo,row,height:74});
        if(section.error){const measureKey=`${geometryKey}\0${section.repo}\0${section.error}`;group.push({key:`notice:${section.repo}`,repo:section.repo,error:section.error,measureKey,height:this.noticeHeights.get(measureKey)??24.5});}
      }
      group.forEach((item,i)=>{item.gap=i<group.length-1?gap:0;items.push(item);});
    }
    const changed=items.length!==this.items.length||items.some((item,i)=>{const old=this.items[i];return item.key!==old?.key||item.height!==old.height||item.gap!==old.gap||item.error!==old.error;});
    const anchorIndex=this.index(Math.max(0,this.offset-4)),anchor=this.items[anchorIndex],inset=this.offset-this.position(anchorIndex),tail=this.items[this.end-1]?.key,startKey=this.start?this.items[this.start]?.key:null;
    this.items=items;if(!changed)return;
    if(startKey){const at=items.findIndex(item=>item.key===startKey);this.start=at>=0?at:Math.min(this.start,Math.max(0,items.length-1));}
    const last=items.findIndex(item=>item.key===tail);if(last>=this.start)this.limit=Math.max(this.limit,last+1);
    this.starts=[0];for(const item of items)this.starts.push(this.starts.at(-1)+item.height+item.gap);
    if(anchor){const at=items.findIndex(item=>item.key===anchor.key);if(at>=this.start){this.limit=Math.max(this.limit,at+1);const target=Math.max(0,Math.min(this.max,this.position(at)+inset));if(target!==this.offset){this.correction={from:this.offset,to:target};this.offset=target;}}}
    this.offset=Math.min(this.offset,this.max);this.generation++;this.selection=null;
  }
  range(){
    const items=this.items.slice(this.start,this.end);
    if(items[0]&&!items[0].header)items.unshift({key:`header:${items[0].repo}`,repo:items[0].repo,header:true,height:this.headerHeight,gap:this.gap});
    const visible=items.filter(item=>item.row).map(item=>item.row),selection=visible.map(row=>row.key).join('\0');
    if(this.selection!==selection){this.selection=selection;this.generation++;}
    return {items,visible};
  }
  revealMore(){if(this.atCap)return false;const before=this.end;this.limit=Math.min(this.items.length,this.limit+10);if(this.end!==before){this.generation++;return true;}return false;}
  nextChunk(){this.start=this.end<this.items.length?this.end:0;this.limit=this.start+10-(this.leading?1:0);this.chunk++;this.offset=0;this.correction=null;this.generation++;this.selection=null;}
  observe(offset,viewport,preserveAnchor=false){this.viewport=Math.max(0,viewport);this.offset=Math.max(0,Math.min(this.max,preserveAnchor&&this.correction?this.offset:offset));if(!preserveAnchor)this.correction=null;}
  move(offset,viewport,preserveAnchor=false){this.observe(offset,viewport,preserveAnchor);return this.max-this.offset<=120?this.revealMore():false;}
}
