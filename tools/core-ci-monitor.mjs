// Explicit companion management. Not run by tests/build/deploy; never edits Core or agents.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {defaultHome} from './deploy.mjs';
import {DEFAULT_CI_STATES} from '../src/plugins/git/ci-states.js';
import {DEFAULT_CI_MESSAGE} from '../src/plugins/git/ci-message.js';
import {parseHistory} from '../src/plugins/git/ci-history.js';
const require=createRequire(import.meta.url),{dispatch}=require('../src/plugins/git/monitor-control.cjs');
const [action,...args]=process.argv.slice(2),index=args.indexOf('--on'),on=index<0||args[index+1]==='local'?null:args[index+1];
if(!['status','install','update','stop','probe'].includes(action)||args.some((a,i)=>a!=='--paused'&&!(a==='--on'&&i===index)&&!(index>=0&&i===index+1))||index>=0&&!args[index+1])throw Error('Use core-ci-monitor.mjs status|install|update|stop|probe [--on local|machine] [--paused]');
const request={action,on};
if(['install','update'].includes(action)){
  const home=defaultHome(),shared=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8')),plugin=shared['custom.plugins']?.git??{},s=plugin.settings??{};
  const text=s.ciMonitorRepositories||s.repository||Object.entries(shared['custom.git.webhook-state']?.members??{}).filter(([,v])=>v===true).map(([repo])=>repo).join(',');
  request.config={enabled:!args.includes('--paused')&&plugin.enabled!==false&&s.autoFixCI===true,states:s.ciFixStates??DEFAULT_CI_STATES,template:s.ciFixMessage??DEFAULT_CI_MESSAGE,repositories:[...new Set(text.split(/[\s,]+/).filter(Boolean).map(s=>s.toLowerCase()))]};
  const history=path.join(home,'.customizations/git-ci-fix-history.json');request.history=JSON.stringify(parseHistory(fs.existsSync(history)?fs.readFileSync(history,'utf8'):null));
}
console.log(JSON.stringify({machine:on??'local',...dispatch(request)},null,2));
