// Public selection model shared by plugin and explicit Node management tooling.
// A notice cache or legacy preference is never an authorization fallback.
const valid=r=>r&&typeof r.name==='string'&&r.name.length<=200&&Number.isSafeInteger(r.repositoryId)&&r.repositoryId>0;
export const addedRepositoryRow=r=>({name:r.name,repositoryId:r.repositoryId,...(typeof r.warning==='string'?{warning:r.warning.slice(0,300)}:{})});
export const validAddedRepository=valid;
export function addedRepositoryScope(relay,account){
  return typeof relay==='string'&&relay.length>0&&relay.length<=2048&&typeof account==='string'&&/^[a-z0-9][a-z0-9-]{0,38}$/i.test(account)
    ?`${relay}|${account.toLowerCase()}`:null;
}
export function confirmedAddedRepositories(record,scope){
  if(!scope||record?.version!==1||record.scope!==scope||!Array.isArray(record.repositories))return null;
  return record.repositories.filter(valid).map(addedRepositoryRow);
}
export function selectedMonitorRepositories(relay,account,read){
  const scope=addedRepositoryScope(relay,account);
  return [...new Set((scope?read(scope)??[]:[]).map(r=>r.name.toLowerCase()))].sort();
}
