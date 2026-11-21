import { profileConfig, reorderProfiles } from './profiles.js';

export function cancelProfileDrag(owner, cx) {
  const changed = Boolean(owner.profileDrag || owner.profileDrop != null);
  owner.profileDrag = null;
  owner.profileDrop = null;
  owner.profileDragPoint = null;
  if (changed) cx?.notify();
}
export function startProfileDrag(owner, profile, e, cx) {
  cx.stop_propagation();
  cancelProfileDrag(owner);
  if (owner.profileLoading || owner.profileDelete || owner.profileEdit || !e.position) return;
  owner.profileDrag = {
    key: profile.key, machine: owner.profileMachine, start: e.position,
    keys: owner.profileItems.map(p => p.key), order: JSON.stringify(profileConfig(owner.profileMachine).order), active: false,
  };
}
export function overProfileDrag(owner, index, e, cx) {
  const drag = owner.profileDrag;
  if (!drag || !e.position || drag.machine !== owner.profileMachine) return;
  if (!drag.active && Math.hypot(e.position.x-drag.start.x, e.position.y-drag.start.y) < 5) return;
  drag.active = true;
  owner.profileDrop = index + ((e.local_position?.y ?? 0) >= (e.bounds?.height ?? 1)/2 ? 1 : 0);
  cx.notify();
}
export function finishProfileDrag(owner, cx) {
  const drag = owner.profileDrag;
  try {
    if (drag?.active && drag.machine === owner.profileMachine && !owner.profileLoading
        && drag.order === JSON.stringify(profileConfig(owner.profileMachine).order)
        && JSON.stringify(drag.keys) === JSON.stringify(owner.profileItems.map(p=>p.key))) {
      owner.profileItems = reorderProfiles(owner.profileMachine, owner.profileItems, drag.key, owner.profileDrop);
    }
  } catch { owner.profileError = 'Could not save profile order. Please try again.'; }
  cancelProfileDrag(owner, cx);
}
