// One native WebSocket while the panel is shown; no worker, daemon or GitHub poll.
import { WebSocket } from 'websocket';
import { appHome, readTextFile, checking } from './host.js';
import { pluginById, pluginSetting } from './plugins.js';
import { relayURL, credentials, credentialPath, EVENTS } from './plugins/git/relay-config.js';
export class GitWebhooks {
  constructor() { this.serial=0;this.retry=0;this.status='';this.state='idle'; }
  stop() {
    this.serial++;this.scope=null;this.started=false;
    const socket=this.socket;this.socket=null;
    if(socket)Promise.resolve(socket.close()).catch(()=>{});
  }
  sync(cx, {enabled,scope,onChange}) {
    const relay=relayURL(pluginSetting(pluginById('git'),'relay'));
    const next=enabled && relay && !checking() ? JSON.stringify([scope,relay]) : null;
    if(next!==this.scope){this.stop();this.scope=next;this.retry=0;this.blocked=false;}
    if(!enabled || checking())return;
    if(!relay){this.state='setup';this.status='Live CI: configure webhooks in Settings › Plugins › Git';return;}
    if(!next || this.started || this.blocked)return;
    this.started=true;const serial=this.serial;
    const current=()=>this.serial===serial && this.scope===next;
    cx.spawn(async cx=>{
      let socket;
      try {
        const keys=credentials(await readTextFile(credentialPath(appHome())));
        if(!current())return;
        if(!keys){this.state='setup';this.status='Live CI: create credentials in Settings › Plugins › Git';this.blocked=true;return;}
        this.state='connecting';this.status='Live CI: connecting';cx.notify();
        socket=await WebSocket.connect(relay.replace(/^https:/,'wss:')+'/events');
        if(!current()){await socket.close();return;}
        this.socket=socket;
        await socket.write(JSON.stringify({type:'authenticate',token:keys.token}));
        let ready=false;const seen=new Set();
        cx.timer.after(10000,()=>{if(current() && !ready)Promise.resolve(socket.close()).catch(()=>{});});
        while(current()) {
          const text=await socket.read();if(!current())return;
          if(typeof text!=='string' || text.length>4096)throw Error('Invalid relay message');
          const message=JSON.parse(text);
          if(!ready){
            if(message.type!=='ready' || message.protocol!==1)throw Error('Relay authentication failed');
            ready=true;this.retry=0;this.state='connected';this.status='';onChange(null,cx);cx.notify();continue;
          }
          if(message.type!=='github' || !EVENTS.includes(message.event) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(message.repository ?? '') || !/^[A-Za-z0-9-]{1,100}$/.test(message.delivery ?? ''))continue;
          if(seen.has(message.delivery))continue;
          seen.add(message.delivery);if(seen.size>2048)seen.delete(seen.values().next().value);
          onChange(message,cx);
        }
      } catch {
        if(current()){this.state='disconnected';this.status='Live CI disconnected · reconnecting (manual Refresh remains available)';}
      } finally {
        if(socket)await Promise.resolve(socket.close()).catch(()=>{});
        if(current()){
          this.socket=null;
          if(!this.blocked){
            // Transport recovery only; never a timer-driven GitHub check.
            const delay=Math.min(60000,1000*2**Math.min(this.retry++,6));
            cx.timer.after(delay,cx=>{if(current()){this.started=false;cx.notify();}});
          }
          cx.notify();
        }
      }
    });
  }
  retryNow() { this.stop();this.blocked=false; }
}
