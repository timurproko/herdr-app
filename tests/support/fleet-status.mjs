// Self-contained fixture factory: also embedded verbatim in the disposable
// native fixture's fake Crew executable. No production status/provider mock.
export function prettyFleetStatus({bytes, count, owner = 't1', live = [{id:'task',terminal:'t2'}]}) {
 const value={home:'fixture',owner:{terminal:owner,live:true},tasks:Array.from({length:count},(_,i)=>({
  id:live[i]?.id??`closed-${i}`,state:i<live.length?'working':'closed',terminal:live[i]?.terminal??null,
  pr:null,report:'unused',standby:[{unused:true}],
 })),padding:''};
 const base=JSON.stringify(value,null,2)+'\n';
 if(bytes!==undefined) {
  if(Buffer.byteLength(base)>bytes)throw Error('Fixture exceeds requested size');
  value.padding='x'.repeat(bytes-Buffer.byteLength(base));
 }
 const text=JSON.stringify(value,null,2)+'\n';
 return {text,bytes:Buffer.byteLength(text),lines:text.split('\n').length-1,tasks:count};
}
