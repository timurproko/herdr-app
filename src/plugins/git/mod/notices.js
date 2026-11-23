// Setup readiness is global; enrollment is per repository. Neither is a socket
// connection state. Checks run once per configuration/Settings change or explicit
// Refresh, never on a timer or merely because the selected agent changed.
import {exec,checking} from './host.js';
import {pluginById,pluginSetting} from './plugins.js';
import {appHome,pluginFile} from './plugins/api.js';
import {relayURL,credentialPath,repositoryName} from './plugins/git/relay-config.js';
import {noticeState} from './plugins/git/notice-state.js';
export class GitNotices {
  constructor(){this.serial=0;this.message=null;this.members=new Map();}
  stop(){if(this.active){this.serial++;this.scope=null;}this.active=false;}
  retryNow(){this.force=(this.force??0)+1;}
  configuration(){
    const plugin=pluginById('git'),raw=pluginSetting(plugin,'relay')??'',account=pluginSetting(plugin,'githubAccount')??'',relay=relayURL(raw),state=noticeState();
    const snapshot=state?.version===1&&state.relay===raw?state:null;
    return {raw,account,relay,snapshot,scope:JSON.stringify([raw,account,snapshot?.revision??0,this.force??0])};
  }
  // Pure cached presentation, also safe inside a popup callback. Never starts a check.
  presentation(repositories){
    if(!this.active || checking() || this.configuration().scope!==this.scope)return null;
    const choices=this.setup===true && this.relay ? [...new Set(repositories.map(repo=>repositoryName(repo)?.toLowerCase()).filter(name=>name&&this.members.get(name)===false))] : [];
    return {choices,key:JSON.stringify([this.scope,this.serial,this.setup,choices])};
  }
  request(cx,mode,repository,callback){
    const serial=this.serial,relay=this.relay,account=this.account;
    cx.spawn(async cx=>{
      if(!this.active||this.serial!==serial)return;
      let result;try{
        const r=await exec('node',[pluginFile('git','setup.cjs'),mode,credentialPath(appHome()),relay,repository??'',account],{timeout:45000});
        result=JSON.parse(r.stdout);
      }catch{result=mode==='notice'?{setup:'missing'}:{};}
      if(this.serial!==serial)return;
      callback(result);if(this.active)cx.notify();
    });
  }
  sync(cx,{enabled,repository}){
    if(!enabled||checking()){this.stop();return null;}this.active=true;
    // Enrollment belongs only to the currently resolved repository. Never carry
    // its banner through another folder's root lookup or membership check.
    if(this.message==='repository')this.message=null;
    const {raw,account,relay,snapshot,scope}=this.configuration();
    if(scope!==this.scope){
      this.scope=scope;this.serial++;this.relay=relay;this.account=account;this.members=new Map();
      // Preserve the last confirmed global result while rechecking. Unknown
      // initialization is quiet; it must not briefly claim setup is missing.
      if(this.previousRelay!==raw)this.setup=undefined;
      this.previousRelay=raw;
      const forced=(this.force??0)!==(this.checkedForce??0);this.checkedForce=this.force??0;
      if(snapshot&&!forced)for(const [name,value]of Object.entries(snapshot.members??{}))if(repositoryName(name)&&typeof value==='boolean')this.members.set(name,value);
      if(relay)this.request(cx,'notice',null,result=>{
        if(result.setup==='ready')this.setup=true;
        else if(result.setup==='missing')this.setup=false;
      });
    }
    if(!relay||this.setup===false){this.message='setup';return this.message;}
    if(this.setup!==true)return this.message;
    if(this.message==='setup')this.message=null;
    const name=repositoryName(repository)?.toLowerCase();
    if(!name)return this.message=null;
    if(!this.members.has(name)){
      this.members.set(name,'pending');
      this.request(cx,'notice-repository',name,result=>{
        if(result.status==='ready')this.members.set(name,true);
        else if(result.status==='missing'&&result.fix!==null)this.members.set(name,false);
        else {this.members.set(name,'unknown');if(result.status==='missing'&&result.fix===null)this.setup=false;}
      });
    }
    // Pending/unknown enrollment stays quiet. Cached results for the same repo
    // still render synchronously, without another check or an empty frame.
    return this.message=this.members.get(name)===false?'repository':null;
  }
}
