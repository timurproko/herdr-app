// Prerequisite actions only. Public settings are saved through the registry's
// validated, compare-before-write context; credentials never cross the worker UI.
import {exec,appHome,pluginFile} from '../api.js';
import {credentialPath,repositoryName,relayURL} from './relay-config.js';
import {updateNoticeState} from './notice-state.js';
import {addedRepositories,saveAddedRepositories,changeAddedRepositories} from './added-repositories.js';
const rounds=new WeakMap();
function once(cx,key,fn){let memo=rounds.get(cx);if(!memo)rounds.set(cx,memo=new Map());if(!memo.has(key))memo.set(key,fn());return memo.get(key);}
export async function worker(script,args=[],timeout=30000){
  const r=await exec('node',[pluginFile('git',script),...args],{timeout});
  try{return JSON.parse(r.stdout);}catch{return {status:'error',detail:'Setup could not start. Check Node.js and try again.'};}
}
const file=()=>credentialPath(appHome());
export const setup=(mode,cx,repo=cx.setting('repository')??'',githubAccount=cx.setting('githubAccount')??'')=>worker('setup.cjs',[mode,file(),cx.setting('relay')??'',repo,githubAccount],mode==='repositories'?120000:mode==='set-repositories'?600000:30000);
export const cloud=(mode,account='',timeout=30000)=>worker('cloudflare.cjs',[mode,file(),account],timeout);
export const cloudState=cx=>once(cx,'cloud',()=>cloud('status'));
export const githubAccounts=cx=>once(cx,'github',()=>worker('github.cjs',['accounts']));
// The same accounts, each probed for at least one repository it can administer.
export const repositoryAccounts=cx=>once(cx,'github-repositories',()=>worker('github.cjs',['repository-accounts'],60000));
export const relayState=cx=>once(cx,'relay',()=>setup('relay',cx));
export async function requireReady(result){if(result.status!=='ready')throw Error(result.detail||'Setup did not finish.');return result;}
export async function createCredentials(cx){const result=await requireReady(await setup('create',cx));updateNoticeState(cx.setting('relay')??'');return result;}
export const accountChoices=(cx,state)=>({key:'account',options:(state.accounts??[]).map(a=>[a.id,a.name]),value:cx.setting('account')??''});
export async function configureCheck(cx){
  const relay=await relayState(cx);if(relay.status==='ready')return {...relay,configuredValue:cx.setting('relay'),fix:null};
  const state=await cloudState(cx);
  if(!state.installed)return {status:'missing',detail:'Press Install beside Cloudflare tools first.',fix:null};
  if(!state.loggedIn)return {status:'missing',detail:'Press Login beside Cloudflare account first.',fix:null};
  const storedAccount=cx.setting('account')??'',oldRelay=cx.setting('relay')??'';
  const account=state.accounts?.find(a=>a.id===storedAccount)??(state.accounts?.length===1?state.accounts[0]:null);
  if(!account)return {status:'missing',detail:'Choose the Cloudflare account above, then press Configure.',fix:null};
  return {status:'missing',detail:`Configure in ${account.name}. Cloudflare limits and charges may apply.`,fix:{
    label:'Configure',busyLabel:'Working…',manual:true,primary:true,requiresEnabled:true,
    async run(current){
      if(current.enabled?.()===false)throw Error('Enable Git before configuring.');
      if(current.setting('account')!==storedAccount||current.setting('relay')!==oldRelay)throw Error('Settings changed. Check again before configuring.');
      const r=await requireReady(await cloud('configure',account.id,600000));
      if(!relayURL(r.relay)||r.account!==account.id)throw Error('Cloudflare returned an invalid setup result. No preferences were changed.');
      if(!current.setSetting('relay',r.relay,oldRelay))throw Error('Relay configured, but your settings changed before its URL could be saved. Check again and retry Configure.');
      current.setSetting('account',account.id,storedAccount);
      updateNoticeState(r.relay);
    },
  }};
}
// The Repositories section lists the repositories already connected, from the last
// confirmed state: no GitHub enumeration, so opening Settings stays cheap. Only the
// Add repository popup scans the account (repositoryCandidates).
async function repositoryScope(cx){
  if(cx.enabled?.()===false)return {result:{status:'recommended',detail:'Enable Git to choose repositories.',fix:null,rows:[]}};
  const state=await repositoryAccounts(cx),oldGithub=cx.setting('githubAccount')??'';
  // An account with no repository it can administer (private to others, or no access)
  // has nothing to add, so it is not offered at all.
  const accounts=(state.accounts??[]).filter(a=>a.administers!==false),has=login=>accounts.some(a=>a.login.toLowerCase()===login.toLowerCase());
  const selected=[oldGithub,state.active].find(login=>login&&has(login))??accounts[0]?.login??'';
  if(state.status==='ready'&&!accounts.length)return {result:{fix:null,rows:[],status:'missing',detail:'None of your signed-in GitHub accounts can manage a repository’s webhooks.'}};
  const selection=accounts.length?{key:'githubAccount',label:'GitHub account',options:accounts.map(a=>[a.login,a.login]),value:selected}:null;
  const context={selection,fix:null,rows:[]};
  if(state.status!=='ready')return {result:{...context,status:'missing',detail:state.detail??'Sign in with GitHub CLI on this computer.'}};
  if(!selected)return {result:{...context,status:'missing',detail:'Choose a signed-in GitHub account.'}};
  if((await relayState(cx)).status!=='ready')return {result:{...context,status:'missing',detail:'Configure automatic test updates above to choose repositories.'}};
  const oldRelay=cx.setting('relay')??'';
  return {context,selected,oldRelay,oldGithub,scope:`${oldRelay}|${selected.toLowerCase()}`};
}
const unchanged=(cx,{oldRelay,oldGithub})=>cx.enabled?.()!==false&&cx.setting('relay')===oldRelay&&(cx.setting('githubAccount')??'')===oldGithub;
export async function repositoryCheck(cx){
  const s=await repositoryScope(cx);if(s.result)return s.result;
  const saved=addedRepositories(s.scope)??[];
  const rows=saved.map(r=>({id:r.name,label:r.name,repositoryId:r.repositoryId,...(r.warning?{detail:r.warning}:{})}));
  return {...s.context,status:'ready',statusLabel:`${rows.length} added`,usable:true,rows,
    // Empty: the description alone says so, without an empty-state panel.
    detail:rows.length?'Repositories that get automatic test updates from this account.':'No repositories added yet.'};
}
// Every repository this login administers, for the Add repository popup.
export async function repositoryCandidates(cx){
  const s=await repositoryScope(cx);if(s.result)throw Error(s.result.detail);
  const result=await setup('repositories',cx,'',s.selected);
  if(typeof result.account!=='string'||!Array.isArray(result.repositories)||!result.repositories.every(r=>r&&repositoryName(r.name)&&Number.isSafeInteger(r.repositoryId)&&r.repositoryId>0&&(typeof r.checked==='boolean'||r.checked===null)))throw Error(result.detail??'Could not read GitHub repositories. Try again.');
  if(result.account.toLowerCase()!==s.selected.toLowerCase())throw Error('GitHub account changed. Close and open Add repository again.');
  if(cx.isCurrent?.()!==false&&unchanged(cx,s)){
    updateNoticeState(s.oldRelay,result.repositories);
    // A repository whose webhook could not be read keeps its last confirmed state.
    const known=new Set((addedRepositories(s.scope)??[]).map(r=>r.name.toLowerCase()));
    saveAddedRepositories(s.scope,result.repositories.filter(r=>r.checked===true||(r.checked===null&&known.has(r.name.toLowerCase()))));
  }
  const items=result.repositories.filter(r=>r.checked!==true).map(r=>({id:r.name,label:r.name,repositoryId:r.repositoryId,disabled:r.checked===null,...(r.error?{detail:r.error}:{})}));
  return {items,add:(current,ids)=>changeRepositories(current,s,result.account,items,ids,true)};
}
export async function removeRepository(cx,id){
  const s=await repositoryScope(cx);if(s.result)throw Error(s.result.detail);
  const rows=(addedRepositories(s.scope)??[]).map(r=>({id:r.name,repositoryId:r.repositoryId}));
  const {errors}=await changeRepositories(cx,s,s.selected,rows,[id],false);
  if(errors[id])throw Error(`${id}: ${errors[id]}`);
}
async function changeRepositories(current,s,account,items,names,enabled){
  const allowed=new Map(items.filter(r=>!r.disabled).map(r=>[r.id,r.repositoryId]));
  if(!Array.isArray(names)||!names.length||!names.every(name=>allowed.has(name)))throw Error('Invalid repository selection.');
  const errors={};
  try{for(let offset=0;offset<names.length;offset+=50){
    if(!unchanged(current,s))throw Error('Settings changed. Open Add repository again.');
    const chunk=names.slice(offset,offset+50),ids=Object.fromEntries(chunk.map(name=>[name,allowed.get(name)]));
    const r=await requireReady(await setup('set-repositories',current,JSON.stringify({names:chunk,enabled,account,ids}),account));
    Object.assign(errors,r.errors??{});
    changeAddedRepositories(s.scope,chunk.filter(name=>!errors[name]).map(name=>({name,repositoryId:allowed.get(name),checked:enabled})));
    if(Object.keys(errors).length){for(const name of names.slice(offset+50))errors[name]='Not updated because earlier repositories failed. Try again.';break;}
  }}finally{updateNoticeState(current.setting('relay')??'');}
  return {errors};
}
