// Decode only the panel's per-child GH_REPO transport for existing host fixtures.
// The worker itself is executed and checked separately by git-repository-routing.
import assert from 'node:assert/strict';
// Compatibility adapter for pre-batching semantic fixtures. It models one
// GraphQL response from their existing per-PR data/error suppliers. These calls
// are NOT request measurements; git-request-budget uses raw transport instead.
export function legacyTargetResponses(execute) {
  return async(command,args,options)=>{
    const call=githubInvocation(command,args,options),query=call.args.find(a=>typeof a==='string'&&a.startsWith('query='));
    if(call.args[1]!=='graphql' || !query?.includes(' title '))return execute(command,args,options);
    const repo=call.options.env?.GH_REPO,numbers=[...query.matchAll(/pr(\d+):pullRequest/g)].map(m=>+m[1]);
    if(!numbers.length)return execute(command,args,options);
    const values={},errors=[];
    for(const n of numbers) {
      let r;try{r=await execute('gh',['pr','view',String(n),'--repo',repo,'--json','number,title,url,state,isDraft,author,createdAt,mergedAt,closedAt,body,statusCheckRollup,reviewDecision,headRefName,headRefOid,mergeable,labels'],options);}catch(e){r={code:1,stderr:e.message};}
      if(r.code!==0 || r.signal || r.timed_out || r.timedOut) {
        let message=r.stderr||'cannot start gh';
        if(r.timed_out||r.timedOut)message='GitHub command timed out';
        if(r.signal||r.code<0||r.code>=0x80000000)message='cannot start gh';
        errors.push({message,path:['repository',`pr${n}`]});values[`pr${n}`]=null;
      } else {
        try{values[`pr${n}`]=JSON.parse(r.stdout);}catch{errors.push({message:'invalid GitHub response',path:['repository',`pr${n}`]});}
      }
    }
    return {code:0,stdout:JSON.stringify({data:{repository:values},...(errors.length?{errors}:{})})};
  };
}
export function githubInvocation(command,args,options) {
  if(command!=='node' || args[0]!=='-e' || !args[1].includes('GH_REPO:repo'))return {command,args,options};
  assert.match(args[2],/^[\w.-]+\/[\w.-]+$/);
  assert.equal(args.length,5);
  return {command:'gh',args:JSON.parse(args[3]),options:{...options,env:{GH_REPO:args[2]}}};
}
