// Decode only the panel's per-child GH_REPO transport for existing host fixtures.
// The worker itself is executed and checked separately by git-repository-routing.
import assert from 'node:assert/strict';
export function githubInvocation(command,args,options) {
  if(command!=='node' || args[0]!=='-e' || !args[1].includes('GH_REPO:repo'))return {command,args,options};
  assert.match(args[2],/^[\w.-]+\/[\w.-]+$/);
  assert.equal(args.length,5);
  return {command:'gh',args:JSON.parse(args[3]),options:{...options,env:{GH_REPO:args[2]}}};
}
