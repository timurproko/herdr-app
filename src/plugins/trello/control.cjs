'use strict';
const {validate} = require('./credentials.cjs');
const {fail} = require('./errors.cjs');
const sameBinding = (a,b) => a && b && ['id','session','principal','home'].every(k=>a[k]===b[k]);
function applyControl(store,s,control,binding) {
  validate('control',control);
  if(!sameBinding(control.binding,binding))fail('STALE');
  if(s.control && (s.control.controller!==control.controller || !sameBinding(s.control.binding,binding)))fail('CONTROL_CONFLICT');
  const denied={...(s.policy??{version:1,boards:[],allowWrites:false}),authority:'managed',allowWrites:false};
  // Marker precedes control: interruption cannot fall back to legacy enabled state.
  store.write('policy',denied,s.policy);
  store.write('control',control,s.control);
  if(control.enabled && control.access==='read-write')store.write('policy',{...denied,allowWrites:true},denied);
}
function resetControl(store,s) {
  if(s.control)store.write('control',{...s.control,access:'read-only'},s.control);
}
module.exports={applyControl,resetControl,sameBinding};
