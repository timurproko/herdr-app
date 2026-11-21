// Eager native rendering of the deferred pinned PR/CI states, in a scratch home.
// No agents, network, core commands or terminal input.
import fs from 'node:fs';
import path from 'node:path';
export function checkPinnedPullStates(home,app) {
  const dir=path.join(home,'mods/custom-pinned-pr-fixture');
  fs.cpSync(path.join(home,'mods/custom-changes'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
  let checked=0;
  try {
    for(const state of ['pending','waiting','failed-running','success','failure','draft','merged','conflict','notice']) {
      const pending=['pending','failed-running'].includes(state);
      fs.writeFileSync(path.join(dir,'main.js'),`import Changes from './changes-view.js';
import {theme} from './host.js';
import {location} from './location.js';
export default class Fixture extends Changes {
 init(_p,cx){this.resetRepository();this.view=${JSON.stringify(state==='merged'?'closed':'open')};
 this.context=JSON.stringify([location().cwd,location().on]);this.root='/fixture';this.agentPull=933;
 this.pulls[this.view]=[{number:933,title:'Pinned PR: ${state}',state:${JSON.stringify(['draft','merged'].includes(state)?state:'open')},
 meta:'#933 · fixture',mergeConflict:${state==='conflict'},checks:${state==='waiting'?'null':JSON.stringify({state:state.startsWith('fail')?'failure':pending?'pending':'success',pending:pending?1:0,label:'14/16'})}}];
 ${state==='notice'?"this.notices={sync(){return 'setup';}};":''}
 this.pinMotion.measureBody({width:360,height:240},1);this.startCISweep(cx);}
 shown(){return true;}
 syncAgent(){} loadRelatedPull(){} syncWebhooks(){}
 render(cx){this.agentResolved=JSON.stringify(location());return super.render(cx);}
}
`);
      app(['check',dir],home);checked++;
    }
    return checked;
  } finally {fs.rmSync(dir,{recursive:true});}
}
