// Never force, interrupt, answer dialogs or use a private agent API.
import {allowsCIState,knownCIState} from './ci-states.js';
export const readyState = allowsCIState;
export function sendArgs(address,message,state,states) {
  if(!readyState(state,states))throw Error('Agent state is not selected for CI messages.');
  return ['send','--json',...(['idle','working'].includes(state)?['--if',state]:[]),address,'--',message];
}
const refusals={
  blocked:{title:'CI message not sent: agent blocked',reason:'Core refused before typing. Retry after the agent is ready or click Refresh.'},
  status_mismatch:{title:'CI message not sent: agent state changed',reason:'Core refused before typing because readiness changed. Click Refresh to recheck the linked agent and selected states.'},
};
export function deliveryResult(result) {
  let receipt;try{receipt=JSON.parse(result?.stdout);}catch{}
  if(result?.code===0&&knownCIState(receipt?.status)&&Number.isSafeInteger(receipt.turn)&&receipt.turn>=0
      &&[true,false,null].includes(receipt.started))return {outcome:'delivered',started:receipt.started===true,
        title:receipt.started===true?'CI fix requested':'CI message delivered; start unconfirmed'};
  if(result?.code!==0&&!(result?.stdout??'').trim()) {
    let error;try{error=JSON.parse(result?.stderr)?.error;}catch{}
    if(typeof error?.kind==='string'&&Object.hasOwn(refusals,error.kind))return {outcome:'refused',...refusals[error.kind]};
  }
  return {outcome:'unknown',title:'CI message delivery unknown',
    reason:'Core did not return a valid delivery acknowledgement. Check the linked agent before retrying; this run will not be resent automatically.'};
}
