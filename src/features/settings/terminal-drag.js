import { terminalConfig, composeTerminals, reorderTerminals } from './profiles.js';

export function cancelTerminalDrag(owner,cx){
  const changed=Boolean(owner.terminalDrag||owner.terminalDrop!=null);
  owner.terminalDrag=null;owner.terminalDrop=null;owner.terminalDragPoint=null;
  if(changed)cx?.notify();
}
export function terminalDragValid(owner){
  const drag=owner.terminalDrag;
  return Boolean(drag&&drag.machine===owner.profileMachine
    &&drag.order===JSON.stringify(terminalConfig(owner.profileMachine).order)
    &&JSON.stringify(drag.keys)===JSON.stringify(composeTerminals(owner.profileMachine,owner.profileShells).map(p=>p.key)));
}
export function startTerminalDrag(owner,terminal,event,cx){
  cx.stop_propagation();cancelTerminalDrag(owner);
  if(!event.position||owner.terminalEdit)return;
  owner.terminalDrag={key:terminal.key,machine:owner.profileMachine,start:event.position,
    keys:composeTerminals(owner.profileMachine,owner.profileShells).map(p=>p.key),
    order:JSON.stringify(terminalConfig(owner.profileMachine).order),active:false};
  owner.handle.focus();
}
export function overTerminalDrag(owner,index,event,cx){
  const drag=owner.terminalDrag;
  if(!drag||!event.position)return;
  if(!terminalDragValid(owner)){cancelTerminalDrag(owner,cx);return;}
  if(!drag.active&&Math.hypot(event.position.x-drag.start.x,event.position.y-drag.start.y)<5)return;
  drag.active=true;
  owner.terminalDrop=index+((event.local_position?.y??0)>=(event.bounds?.height??1)/2?1:0);
  cx.notify();
}
export function finishTerminalDrag(owner,cx){
  try{
    if(owner.terminalDrag?.active&&terminalDragValid(owner))
      reorderTerminals(owner.profileMachine,composeTerminals(owner.profileMachine,owner.profileShells),owner.terminalDrag.key,owner.terminalDrop);
  }catch{owner.terminalError='Could not save terminal order. Please try again.';}
  cancelTerminalDrag(owner,cx);
}
