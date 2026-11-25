// Consumer only: mounted chrome owns the one authenticated relay socket.
import { shared, setShared, checking } from './host.js';
import { pluginById, pluginSetting, sidebarPanelEnabled } from './plugins.js';
import { relayURL } from './plugins/git/relay-config.js';
import { RELAY_STATE, RELAY_RETRY, relayRevision } from './plugins/git/relay-state.js';
export class GitWebhooks {
  constructor({debounce=2000}={}) { this.state='idle';this.status='';this.debounce=debounce;this.pending=new Map(); }
  stop() {this.scope=null;this.revisions=null;this.relay=null;this.active=false;this.pending.clear();this.wakeup=null;this.delivery=null;}
  hasPending(repository) {return this.pending.has(repository?.toLowerCase());}
  sync(cx,{enabled,scope,repository,repositories,catchup=true,onChange,isCurrent=()=>true,waiting=()=>false}) {
    const relay=relayURL(pluginSetting(pluginById('git'),'relay'));
    if(!relay) {this.stop();this.state='setup';this.status='Live CI: configure webhooks in Settings › Plugins › Git';return;}
    if(this.relay && this.relay!==relay)this.stop();
    const state=shared(RELAY_STATE),names=(repositories||[repository]).filter(Boolean).map(name=>name.toLowerCase());
    this.state=state?.status||'connecting';
    this.status=this.state==='connected'?'':this.state==='setup'
      ? 'Live CI: create credentials in Settings › Plugins › Git' : 'Live CI disconnected · reconnecting (manual Refresh remains available)';
    // Invariant: accepted invalidations survive pauses and scope/membership
    // changes for every retained repository. Only delivery transfers ownership
    // to the consumer's dirty/read queue; unrelated membership cannot erase it.
    for(const name of this.pending.keys())if(!names.includes(name))this.pending.delete(name);
    const revisions=new Map(names.map(name=>[name,relayRevision(state,name)]));
    const changed=names.filter(name=>this.revisions?.has(name) && this.revisions.get(name)!==revisions.get(name));
    const resumed=!this.active,changedScope=scope!==this.scope;
    this.consumer={onChange,isCurrent,relay,transportScope:state?.scope};this.scope=scope;this.relay=relay;this.revisions=revisions;
    this.active=Boolean(enabled&&!checking());
    const enqueue=names=>{for(const name of names)if(!this.pending.has(name))this.pending.set(name,{due:Date.now()+this.debounce,ready:this.debounce<=0 || Boolean(waiting(name))});};
    if(state?.ready)enqueue(changed);
    if(this.active && catchup && (resumed||changedScope))enqueue(names);
    this.arm(cx);
  }
  arm(cx) {
    if(!this.active || !this.pending.size)return;
    if([...this.pending.values()].some(entry=>entry.ready)) {
      if(this.delivery)return;
      const delivery=this.delivery={};
      cx.spawn(async view=>{
        await Promise.resolve(); // Never dispatch/notify from native render.
        if(this.delivery!==delivery)return;
        this.delivery=null;
        const consumer=this.consumer;
        if(!this.active || checking() || !sidebarPanelEnabled('changes') || !consumer.isCurrent()
            || relayURL(pluginSetting(pluginById('git'),'relay'))!==consumer.relay || shared(RELAY_STATE)?.scope!==consumer.transportScope) {this.active=false;return;}
        for(const [repository,entry]of this.pending)if(entry.ready) {
          this.pending.delete(repository);
          if(consumer.onChange({repository},view)===false) {this.pending.set(repository,entry);this.active=false;break;}
        }
        this.arm(view);
      });
      return;
    }
    const due=Math.min(...[...this.pending.values()].map(entry=>entry.due));
    if(this.wakeup && this.wakeup.due<=due)return;
    const wakeup=this.wakeup={due};
    cx.spawn(async view=>{
      await Promise.resolve();
      if(this.wakeup!==wakeup)return;
      const wake=next=>{
        if(this.wakeup!==wakeup)return;
        this.wakeup=null;
        for(const entry of this.pending.values())if(entry.due<=due)entry.ready=true;
        this.arm(next);
      };
      if(view.timer?.after)view.timer.after(Math.max(0,due-Date.now()),wake);else wake(view);
    });
  }
  retryNow() {this.stop();setShared(RELAY_RETRY,(shared(RELAY_RETRY)||0)+1);}
}
