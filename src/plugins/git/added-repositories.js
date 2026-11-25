// Repositories connected to this relay, as Settings last confirmed them. The
// Repositories section lists these without enumerating every GitHub repository;
// only Add (an explicit request) scans the account. Public facts only — names and
// numeric ids — kept in runtime shared state, outside exported preferences.
import {shared,setShared} from '../api.js';
export const GIT_ADDED_REPOSITORIES='custom.git.added-repositories';
import {validAddedRepository as valid,addedRepositoryRow as row,confirmedAddedRepositories} from './added-repositories-model.js';
/** The saved rows for `scope` (relay|account), or null when nothing was confirmed there yet. */
export function addedRepositories(scope){
  return confirmedAddedRepositories(shared(GIT_ADDED_REPOSITORIES),scope);
}
export function saveAddedRepositories(scope,repositories){
  const unique=new Map(repositories.filter(valid).map(r=>[r.name.toLowerCase(),row(r)]));
  setShared(GIT_ADDED_REPOSITORIES,{version:1,scope,repositories:[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name))});
}
/** Apply confirmed webhook changes: `[{name, repositoryId, checked}]`. */
export function changeAddedRepositories(scope,changes){
  const rows=new Map((addedRepositories(scope)??[]).map(r=>[r.name.toLowerCase(),r]));
  // Enabling rewrites the whole webhook, so an earlier "incomplete" warning is gone.
  for(const c of changes)if(c.checked)rows.set(c.name.toLowerCase(),{name:c.name,repositoryId:c.repositoryId});else rows.delete(c.name.toLowerCase());
  saveAddedRepositories(scope,[...rows.values()]);
}
