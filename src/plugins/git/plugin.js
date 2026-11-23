// The stable changes stack/mod IDs preserve existing layouts and tab pins.
import {exec} from '../api.js';
import {DEFAULT_CI_MESSAGE,effectiveCIMessage,validCIMessage,CI_MESSAGE_RULES,CI_MESSAGE_LIMIT,
  DEFAULT_CONFLICT_MESSAGE,effectiveConflictMessage,validConflictMessage,CONFLICT_MESSAGE_RULES,
  DEFAULT_MERGED_MESSAGE,effectiveMergedMessage,validMergedMessage,MERGED_MESSAGE_RULES} from './ci-message.js';
import {CI_STATES,DEFAULT_CI_STATES} from './ci-states.js';
import {ensureMonitors,syncMonitors} from './monitor-actions.js';
import {syncRelay,watchUpdates,stopRelay,closeRelay} from './relay-client.js';
import {setup,cloud,cloudState,relayState,accountChoices,configureCheck,repositoryCheck,repositoryCandidates,removeRepository,requireReady,createCredentials,githubAccounts} from './actions.js';
export default {
  id:'git',name:'Git',category:'Sidebar',version:'2.2.0',icon:'mods/custom-changes/git-pull-request.svg',
  description:'View repository pull requests, agent links, checklists, and CI status.',defaultEnabled:true,
  advancedSettings:true,
  lifecycle:{'sidebar.sync':context=>{ensureMonitors(context);syncRelay(context);},'updates.watch':watchUpdates,'sidebar.close':closeRelay},
  onEnabledChange(next,cx){if(!next)stopRelay();return syncMonitors(cx);},
  onSettingChange(key,cx){if(['autoFixCI','ciFixStates','ciFixMessage','ciFixEnabled','conflictFixMessage','conflictFixEnabled','mergedMessage','mergedEnabled','ciMonitorRepositories'].includes(key))return syncMonitors(cx);},
  settings:[
    {key:'ciMonitorMachine',type:'machine',label:'Legacy monitor machine',default:null,hidden:true},
    {key:'ciMonitorRepositories',type:'text',label:'Legacy monitored repositories',default:'',hidden:true},
    {key:'autoFixCI',type:'toggle',label:'Auto-fix pull requests',default:false,
      about:'Message the linked agent when its pull request needs a fix, even when Herdr is closed.'},
    {key:'ciFixStates',type:'multiselect',label:'Send when agent is',options:CI_STATES,default:DEFAULT_CI_STATES,
      about:'Only checked states receive messages. Blocked agents are never messaged.'},
    // Each message has its own switch, drawn on its row (a longtext's `toggle`).
    {key:'ciFixEnabled',type:'toggle',label:'Send CI tests failed',default:true,hidden:true},
    {key:'conflictFixEnabled',type:'toggle',label:'Send merge conflicts',default:true,hidden:true},
    {key:'mergedEnabled',type:'toggle',label:'Send pull request merged',default:true,hidden:true},
    // The full text the agent receives, edited on a page of its own (docs/PLUGIN-UI.md).
    {key:'ciFixMessage',type:'longtext',label:'CI tests failed',default:DEFAULT_CI_MESSAGE,toggle:'ciFixEnabled',
      about:'What the linked agent is told when a pull request’s CI fails.',
      tags:[['{url}','Link to the pull request'],['{runUrl}','Link to the first failed CI run'],
        ['{head}','The commit the pull request was on when CI failed'],['{runs}','Every failed CI run, one per line']],
      maxLength:CI_MESSAGE_LIMIT,normalize:effectiveCIMessage,
      validate:value=>value.length>CI_MESSAGE_LIMIT?'Too long. Shorten the message.':!value.trim()?'Write a message.':validCIMessage(value)?null:CI_MESSAGE_RULES},
    {key:'conflictFixMessage',type:'longtext',label:'Merge conflicts',default:DEFAULT_CONFLICT_MESSAGE,toggle:'conflictFixEnabled',
      about:'What the linked agent is told when its pull request has merge conflicts, with the conflicting files.',
      tags:[['{url}','Link to the pull request'],['{base}','The branch the pull request merges into'],
        ['{head}','The commit the pull request is on'],['{files}','Every conflicting file, one per line']],
      maxLength:CI_MESSAGE_LIMIT,normalize:effectiveConflictMessage,
      validate:value=>value.length>CI_MESSAGE_LIMIT?'Too long. Shorten the message.':!value.trim()?'Write a message.':validConflictMessage(value)?null:CONFLICT_MESSAGE_RULES},
    {key:'mergedMessage',type:'longtext',label:'Pull request merged',default:DEFAULT_MERGED_MESSAGE,toggle:'mergedEnabled',
      about:'What the linked agent is told once its pull request is merged.',
      tags:[['{url}','Link to the pull request'],['{base}','The branch it was merged into'],['{branch}','The pull request’s branch']],
      maxLength:CI_MESSAGE_LIMIT,normalize:effectiveMergedMessage,
      validate:value=>value.length>CI_MESSAGE_LIMIT?'Too long. Shorten the message.':!value.trim()?'Write a message.':validMergedMessage(value)?null:MERGED_MESSAGE_RULES},
    {key:'account',type:'text',label:'Cloudflare account',default:'',hidden:true},
    {key:'githubAccount',type:'text',label:'GitHub account for repository webhooks',default:'',hidden:true},
    {key:'relay',type:'text',label:'Cloudflare relay URL',default:'',hidden:true},
    {key:'repository',type:'text',label:'Legacy repository',default:'',hidden:true},
  ],
  prerequisites:[
    {id:'node',label:'Node.js on this computer',about:'Node.js 22.12+ runs setup and CI automation.',
      async check(){try{const r=await exec('node',['--version'],{timeout:10000}),v=/^v(\d+)\.(\d+)/.exec(r.stdout);const ready=r.code===0&&v&&(Number(v[1])>22||(Number(v[1])===22&&Number(v[2])>=12));return {status:ready?'ready':'missing',detail:ready?'Node.js is available.':'Install Node.js 22.12 or newer on this computer.'};}catch{return {status:'missing',detail:'Install Node.js 22.12 or newer on this computer.'};}}},
    {id:'gh',label:'GitHub CLI login on this computer',about:'Uses this computer’s GitHub CLI login to connect repository webhooks.',
      async check(cx){const state=await githubAccounts(cx);return {status:state.status,detail:state.status==='ready'?`${state.accounts.length} GitHub account${state.accounts.length===1?'':'s'} signed in. Choose the account in Repositories.`:state.detail};}},
    {id:'cloudflare-tools',label:'Cloudflare tools',about:'Install a pinned Wrangler CLI privately for this plugin. No global installation or terminal commands are needed.',
      async check(cx){const relay=await relayState(cx);if(relay.status==='ready'&&relay.noticeVersion===2)return {status:'ready',detail:'Not needed for your existing relay.',fix:null};const state=await cloudState(cx);if(state.installed)return {status:'ready',detail:'Cloudflare tools installed.',fix:null};return {status:'missing',detail:'Press Install to prepare Cloudflare setup.'};},
      fix:{label:'Install',busyLabel:'Installing…',run:()=>cloud('install','',360000).then(requireReady)}},
    {id:'cloudflare-login',label:'Cloudflare account',about:'Login opens Cloudflare authorization in your browser. Choose an account here if you have more than one.',
      async check(cx){const relay=await relayState(cx);if(relay.status==='ready'&&relay.noticeVersion===2)return {status:'ready',detail:'Your relay is configured; no new login is needed.',fix:null};
        const state=await cloudState(cx);
        if(!state.installed)return {status:'missing',detail:'Install Cloudflare tools first.',fix:null};
        if(!state.loggedIn||!state.accounts?.length)return {status:'missing',detail:'Press Login, then authorize Cloudflare in your browser.'};
        const selected=state.accounts.find(a=>a.id===cx.setting('account'))??(state.accounts.length===1?state.accounts[0]:null);
        return {status:'ready',detail:selected?`Signed in · ${selected.name}`:'Signed in. Choose the account to use.',selection:state.accounts.length>1?accountChoices(cx,state):null,fix:null};},
      fix:{label:'Login',busyLabel:'Signing in…',manual:true,primary:true,run:()=>cloud('login','',420000).then(requireReady)}},
    {id:'credentials',label:'Local webhook credentials',about:'Configure creates these automatically if needed. Private keys stay local and are never exported with preferences.',
      check:cx=>setup('credentials',cx),fix:{label:'Create',run:createCredentials}},
    {id:'relay',label:'Automatic test updates',about:'Configure deploys your dedicated relay, uploads its private keys, verifies it, and saves the URL automatically.',
      check:configureCheck,fix:{label:'Configure',manual:true,primary:true,run:()=>{throw Error('Press Check before configuring.');}}},
    {id:'repository',label:'Repositories',section:true,about:'Repositories that get automatic test updates.',
      // A list section (docs/PLUGIN-UI.md): scoped to the GitHub account the check offers;
      // Add searches the account's repositories, only when opened.
      list:{scope:{label:'Account'},picker:{kind:'items',label:'Add repo',search:'Search repositories…'},
        candidates:repositoryCandidates,remove:removeRepository},
      check:repositoryCheck},
  ],
  sidebar:{id:'changes',name:'Git',mod:'custom-changes',icon:'mods/custom-changes/git-pull-request.svg'},
};
