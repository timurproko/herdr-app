// Space -> every A1 agent in that space. One bounded sync per machine; no daemon.
import { spaces, panes, terminals, window, shared, readTextFile, exec, spaceColor, pluginFile } from '../api.js';
import { matchAgentSessionColor, AGENT_COLOR_EPOCH_KEY } from './state.js';
import { agentColorForSpace } from './palette.js';
export { agentColorForSpace } from './palette.js';
const signature = targets => JSON.stringify(targets);
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function agentColorTargets(ss=spaces(),ps=panes(),ts=terminals(),now=Date.now(),colorOf=spaceColor) {
  const agents=new Map(ts.filter(t=>t.state==='live' && (t.report?.app ?? t.status?.app)==='a1').map(t=>[t.address,t]));
  const targets=[],seen=new Set();
  for(const space of ss) {
    const tabs=new Set((space.tabs??[]).map(t=>t.id)),color=agentColorForSpace(colorOf(space.id));
    if(!color)continue;
    for(const pane of ps) {
      if(!tabs.has(pane.tab) || seen.has(pane.terminal))continue;
      const terminal=agents.get(pane.terminal),labels=terminal?.labels??{};
      const at=Number(labels['a1.at']),session=labels['a1.session'],runtime=labels['a1.runtime'];
      if(!terminal)continue;
      if(!UUID.test(session??'') || !UUID.test(runtime??'') || typeof labels['a1.at']!=='string' || !/^\d+$/.test(labels['a1.at']) || !Number.isFinite(at) || now-at>90000 || at>now+5000)continue;
      // Explicit profile installation hints are captured at terminal birth, not
      // inferred from a display title or replaced with a different PATH install.
      const command=labels['custom.profile.a1-command']??(/^a1(?:\.exe|\.cmd|\.bat)?$/i.test(terminal.argv?.[0]?.split(/[\\/]/).at(-1)??'')?terminal.argv[0]:'a1');
      if(typeof command!=='string' || /[\0\r\n]/.test(command) || !/^a1(?:\.exe|\.cmd|\.bat)?$/i.test(command.split(/[\\/]/).at(-1)))continue;
      targets.push({space:space.id,tab:pane.tab,machine:space.machine??null,terminal:terminal.address,session,runtime,color,command});
      seen.add(pane.terminal);
    }
  }
  return targets;
}
export class AgentSpaceColors {
  constructor() {this.epoch=null;this.pending=new Set();this.checked=new Map();this.source=null;}
  refresh(cx) {
    const epoch=JSON.stringify([matchAgentSessionColor(),shared(AGENT_COLOR_EPOCH_KEY)??0]);
    if(epoch!==this.epoch) {this.epoch=epoch;this.checked.clear();}
    if(!matchAgentSessionColor() || !window()?.active)return;
    const groups=new Map();
    // Missing/stale identity is silently skipped; never guess a session or show a toast.
    const targets=agentColorTargets();
    for(const target of targets) {if(!groups.has(target.machine))groups.set(target.machine,[]);groups.get(target.machine).push(target);}
    for(const machine of this.checked.keys())if(!groups.has(machine))this.checked.delete(machine);
    for(const [machine,group] of groups) {
      const key=signature(group),previous=this.checked.get(machine);
      if(this.pending.has(machine) || (previous?.key===key && Date.now()-previous.at<5000))continue;
      this.pending.add(machine);this.checked.set(machine,{key,at:Date.now()});
      const current = () => this.epoch===epoch && matchAgentSessionColor()
        && JSON.stringify([true,shared(AGENT_COLOR_EPOCH_KEY)??0])===epoch
        && signature(agentColorTargets().filter(t=>t.machine===machine))===key;
      cx.spawn(async cx=>{
        try {
          if(!current())return;
          this.source ??= await readTextFile(pluginFile('a1-colors', 'session-color.cjs'));
          if(!this.source || !current())return;
          const request={expiresAt:Date.now()+10000,targets:group.map(t=>({terminal:t.terminal.split('/').at(-1),space:t.space.split('/').at(-1),tab:t.tab.split('/').at(-1),session:t.session,runtime:t.runtime,color:t.color,command:t.command}))};
          // The worker gets Current color and sets only differing sessions, checking
          // captured terminal/session/space bindings before each write. No replay queue.
          await exec('node',['--input-type=commonjs','-e',this.source,'--',JSON.stringify(request)],{on:machine,timeout:30000});
        } catch {} // Unavailable color control stays silent; no replay queue.
        finally {this.pending.delete(machine);cx.notify();}
      });
    }
  }
}
