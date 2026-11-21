// Raw Core report states, not Herdr's grouped sidebar attention labels.
export const CI_STATES = Object.freeze([
  ['idle','Idle'],['done','Done'],['error','Error'],['working','Working'],
].map(Object.freeze));
export const DEFAULT_CI_STATES = Object.freeze(['idle','done']);
const selectableState = state => CI_STATES.some(([value]) => value === state);
// A delivery acknowledgement can race a transition to blocked, but blocked is
// never a selectable target state and never authorizes a send.
export const knownCIState = state => state === 'blocked' || selectableState(state);
export const validCIStates = states => Array.isArray(states) && states.length <= CI_STATES.length
  && new Set(states).size === states.length && states.every(selectableState);
export const allowsCIState = (state, states = DEFAULT_CI_STATES) => validCIStates(states) && states.includes(state);
export const rawCIState = record => record?.report?.state
  ?? (typeof record?.status === 'string' ? record.status : record?.status?.state);
