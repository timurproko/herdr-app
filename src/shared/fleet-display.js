// Every persistent fleet-display mutation uses the same evidence boundary.
import { shared, setShared } from './host.js';
export const FLEET_DISPLAY_KEY = 'custom.fleet.display';
export const fleetDisplayChangeAllowed = ({disabled=false,ready=false,missing=false,verified=false}={}, record=null) =>
  disabled===true || ready===true && (verified===true || record===null && missing===true);
export function updateFleetDisplay(machine, record, evidence={}) {
  if(!fleetDisplayChangeAllowed(evidence,record))return false;
  const raw=shared(FLEET_DISPLAY_KEY);
  let next=null;
  if(evidence.disabled!==true) {
    // Unknown/corrupt containers are read-only, not a reason to discard history.
    if(raw!=null && (raw.version!==1 || !raw.entries || typeof raw.entries!=='object' || Array.isArray(raw.entries) || Object.keys(raw.entries).length>256))return false;
    if(record!==null && (!record || typeof record!=='object' || record.machine!==machine))return false;
    const entries={...raw?.entries}, key=JSON.stringify(machine);
    if(record!==null) {
      if(!Object.hasOwn(entries,key) && Object.keys(entries).length>=256)return false;
      entries[key]=record;
    } else delete entries[key];
    next={version:1,entries};
  }
  if(JSON.stringify(raw)!==JSON.stringify(next))setShared(FLEET_DISPLAY_KEY,next);
  return true;
}
