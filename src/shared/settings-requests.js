// Settings-only admission. Other panels keep their own lifecycle/read budgets.
// Herdr Core v0.1.22 exec.rs: MAX_RUNNING=16; Slot::take refuses before spawn.
const capacityMessage = text => /^16 execs are running already$/.test(String(text ?? '').trim());
export function executionCapacityRefusal(result) {
  // Only an outer RPC error is evidence that the command never started. A
  // child's stderr (including quoted lookalikes) is never replay permission.
  for (const text of [result?.stdout, result?.stderr]) {
    let reply; try { reply = JSON.parse(text); } catch { continue; }
    if (reply?.error?.kind === 'unavailable' && capacityMessage(reply.error.message)) return true;
  }
  return false;
}
const obsolete = () => Object.assign(new Error('Obsolete Settings request.'), {obsolete:true});
export function requestQueue(limit) {
  const waiting = [], active = new Set();
  const alive = ticket => ticket.current() && !ticket.done?.();
  const prune = () => {
    for (let i = waiting.length - 1; i >= 0; i--) if (!alive(waiting[i])) waiting.splice(i, 1);
    // Native view cancellation can abandon promises without finally. The Task's
    // completion witness releases ownership for subsequent admission.
    for (const ticket of active) if (ticket.done?.() || ticket.expires && ticket.expires <= Date.now()) active.delete(ticket);
  };
  return async function request(work, {current=()=>true, done, sleep, retry=false, timeout}={}) {
    let delay = 100;
    for (;;) {
      const ticket = {current, done}; waiting.push(ticket);
      try {
        for (;;) {
          prune(); if (!alive(ticket)) throw obsolete();
          if (waiting[0] === ticket && active.size < limit) {waiting.shift(); if(timeout)ticket.expires=Date.now()+timeout; active.add(ticket); break;}
          if (!sleep) throw new Error('Settings request cannot wait without a task clock.');
          await sleep(100);
        }
        if (!alive(ticket)) throw obsolete();
        const result = await work();
        if (!alive(ticket)) throw obsolete();
        if (!retry || !executionCapacityRefusal(result)) return result;
      } finally {
        active.delete(ticket); const i=waiting.indexOf(ticket);if(i>=0)waiting.splice(i,1);
      }
      // Refused before start: release the slot and rejoin the tail after capped
      // backoff. No timeout, lost acknowledgement or thrown error is replayed.
      if (!sleep) throw new Error('Settings request cannot retry without a task clock.');
      await sleep(delay); delay=Math.min(2000,delay*2);
      if (!current() || done?.()) throw obsolete();
    }
  };
}
export const settingsGroups = requestQueue(2);
export const settingsCommands = requestQueue(4);
