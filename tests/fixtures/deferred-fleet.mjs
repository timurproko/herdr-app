// Sanitized equivalent of coord-panel-missing/report.md, not a live capture.
export function deferredFleet(now=Date.now()) {
  const pr=(repo,number,state)=>({number,state,title:repo.endsWith('herdr-app')?(number===74?'Fix monitor scope':'Handle plugin error state'):`Task ${number}`,
    url:`https://github.com/${repo}/pull/${number}`,author:{login:'fixture'},createdAt:new Date(now-3600000).toISOString(),
    ...(state==='MERGED'?{mergedAt:new Date(now-60000).toISOString()}:{}),body:'',labels:[],statusCheckRollup:[]});
  const rows=[pr('timurproko/herdr-app',74,'OPEN'),pr('timurproko/herdr-app',76,'OPEN'),
    ...[20,21].map(n=>pr('timurproko/crew',n,'OPEN')),...[10,11,12,13].map(n=>pr('timurproko/crew',n,'MERGED')),pr('timurproko/MyWorkflows',37,'MERGED')];
  const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:rows.map((row,i)=>({id:`task-${i}`,terminal:i<2?`t${i+2}`:null,state:i<2?'reported':'closed',pr:row.url}))};
  const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'a'},{id:'b'}]}];
  const all=[{pane:'cp',tab:'c',terminal:'t1'},{pane:'ap',tab:'a',terminal:'t2'},{pane:'bp',tab:'b',terminal:'t3'}];
  const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},...[2,3].map((n,i)=>({address:`t${n}`,state:'live',labels:{'crew.task':`task-${i}`,'crew.home':'home','herdr.space':'fm-crew-home'}}))];
  return {rows,status,groups,all,list};
}
