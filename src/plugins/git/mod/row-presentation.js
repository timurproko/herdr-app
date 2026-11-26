// Pure facts only. Never store native elements, render closures or event handlers.
export class RowPresentations {
  constructor(){this.rows=new WeakMap();this.styles=new Map();this.layouts=new Map();}
  get(pr,limit,ghost=false,labelsFor=value=>value.labels??[]){
    const signature=[pr.stage,pr.key,pr.number,pr.title,pr.meta,pr.login,pr.when,pr.compactWhen,pr.review,pr.labels,pr.tasks?.done,pr.tasks?.total,pr.tasks?.label,pr.checks?.state,pr.checks?.label,pr.checks?.details,pr.state,pr.createdAt,pr.closedAt,pr.mergedAt,limit];
    let entry=this.rows.get(pr);
    if(!entry||signature.some((value,i)=>value!==entry.signature[i])){
      const all=labelsFor(pr),stage=all.find(label=>label.stage);
      let labels=all.slice(0,limit);
      if(stage&&!labels.includes(stage))labels=[...labels.slice(0,Math.max(0,limit-1)),stage];
      const labelNames=(pr.labels??[]).map(label=>label.name).join('\n');
      entry={signature,labels,labelNames,labelKey:labels.map(label=>label.name).join('\0'),number:`#${pr.number}`,
        taskFraction:pr.tasks?`${pr.tasks.done}/${pr.tasks.total}`:'',review:pr.review?(pr.review==='approved'?'Approved':'Changes requested'):'',
        accessibility:`Open pull request #${pr.number} on GitHub`,ids:new Map()};
      entry.tooltip=[pr.tasks?.label,pr.checks?.label,labelNames,entry.review].filter(Boolean).join('\n');
      const timestamp=pr.state==='merged'?(pr.mergedAt??pr.closedAt):pr.state==='closed'?pr.closedAt:pr.createdAt;
      const exact=Number.isFinite(Date.parse(timestamp??''))?new Date(timestamp).toISOString():null;
      entry.timeInfo=exact&&pr.when?`${pr.when}\n${exact}`:null;
      entry.checkInfo=pr.checks?.details?.length?`${pr.checks.label}\n${pr.checks.details.join('\n')}`:null;
      entry.omittedLabels=all.length>labels.length;
      this.rows.set(pr,entry);
    }
    const prefix=ghost?'swap-':'',key=prefix+(pr.key??pr.number);
    let ids=entry.ids.get(key);
    if(!ids){ids=new Map();entry.ids.set(key,ids);}
    return {facts:entry,id:(kind,probe=false)=>{
      const key=`${kind}:${probe}`;let id=ids.get(key);
      if(id===undefined){id=`${prefix}pr-${kind}-${pr.key??pr.number}${probe?'-probe':''}`;ids.set(key,id);}return id;
    }};
  }
  layout(id,sizes,items,clipOrder){
    const signature=[sizes.available,clipOrder.join('\0'),...items.flatMap(item=>[item.kind,item.measureKey,item.compactKey,item.trailing,sizes[`${item.kind}-full`],sizes[`${item.kind}-compact`]])];
    const cached=this.layouts.get(id);if(cached&&signature.every((v,i)=>v===cached.signature[i])&&signature.length===cached.signature.length)return cached.value;
    const widths=items.map(item=>sizes[`${item.kind}-full`]),ready=Number.isFinite(sizes.available)&&widths.every(Number.isFinite),compact=new Set();
    const total=()=>{let left=0,right=false,sum=0;items.forEach((item,i)=>{if(widths[i]>0){if(item.trailing)right=true;else left++;}sum+=widths[i];});return sum+Math.max(0,left-1)*15+(left&&right?6:0);};
    if(ready){
      for(const [i,item]of items.entries()){if(total()<=sizes.available+0.01)break;if(item.compact&&Number.isFinite(sizes[`${item.kind}-compact`])){compact.add(item.kind);widths[i]=sizes[`${item.kind}-compact`];}}
      for(const kind of clipOrder){const i=items.findIndex(item=>item.kind===kind);if(i>=0&&total()>sizes.available+0.01)widths[i]=Math.max(0,widths[i]-(total()-sizes.available));}
    }
    const value={widths,ready,compact,visible:items.map((_,i)=>i).filter(i=>!ready||widths[i]>0)};
    this.layouts.set(id,{signature,value});if(this.layouts.size>512)this.layouts.delete(this.layouts.keys().next().value);return value;
  }
  labelStyle(t,color,build){
    const key=[t.background,t.raised,t.foreground,color].join('\0');
    let value=this.styles.get(key);if(!value){value=Object.freeze(build(t,color));this.styles.set(key,value);if(this.styles.size>128)this.styles.delete(this.styles.keys().next().value);}return value;
  }
}
