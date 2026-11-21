// One launch path for the + menu and the empty-space suggestions.
import { spaces, run, shared, setShared } from './host.js';
import { composeProfiles } from './profiles.js';
import { spaceStartFolder } from './directory.js';
export function pendingSpaceProfile(spaceId, machine) {
  return (shared('custom.profile-launches') ?? []).find(j => j.space === spaceId && j.machine === machine && j.expiresAt > Date.now() && ['queued', 'starting'].includes(j.phase));
}
export function launchSpaceProfile(profile, spaceId, machine) {
  const space = spaces().find(s => s.active && s.id === spaceId && (s.machine ?? null) === machine);
  if ((spaceId ? !space : spaces().some(s => s.active)) || profile.available !== true) return;
  // The folder inherited from the selected tab, except a crew worker's copy (its repository's
  // primary checkout, else home): a new tab never starts inside a worker's copy.
  const folder = space ? spaceStartFolder(space) : null;
  if (profile.key === 'terminal') {
    run('tab.new', { ...(folder ? { folder } : {}), ...(space ? { space: space.id } : {}), ...(profile.run ? { argv: profile.run } : {}) });
    return;
  }
  const jobs = (shared('custom.profile-launches') ?? []).filter(j => j.expiresAt > Date.now());
  if (jobs.filter(j => j.phase === 'queued' || j.phase === 'starting').length >= 20) return;
  const origin = space?.tabs.find(t => t.active), terminal = composeProfiles(machine, []).find(p => p.key === 'terminal');
  // The same profile can be launched plainly and with its role (Profiles and the role's own
  // heading list it twice); those are two different launches.
  const role = profile.role ?? null;
  if (jobs.some(j => j.space === (space?.id ?? null) && j.machine === machine && j.originTab === (origin?.id ?? null) && j.profile === profile.key && (j.role ?? null) === role && ['queued', 'starting'].includes(j.phase))) return;
  // A role launch is one at a time per machine: repeated clicks, two windows or two
  // marked profiles cannot queue a second coordinator while one is still starting.
  if (role && jobs.some(j => j.role === role && j.machine === machine && ['queued', 'starting'].includes(j.phase))) return;
  setShared('custom.profile-launches', [...jobs, {
    token: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, phase: 'queued', expiresAt: Date.now() + 60000,
    machine, space: space?.id ?? null, originTab: origin?.id ?? null, name: profile.name, profile: profile.key, role,
    argv: profile.command ? [profile.command, ...(profile.configuredArgs ?? profile.run?.slice(1) ?? [])] : profile.run,
    shell: terminal?.run ?? [], cwd: folder ?? null,
  }]);
}
