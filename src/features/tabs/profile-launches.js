// Profile popups are short-lived; the mounted tab bar owns their startup jobs.
import { shared, setShared, spaces, machines, exec, readTextFile, appHome, run, notify } from './host.js';

import { pluginTransform, pluginGate, pluginPrepareProfile } from './plugins.js';

// What a role gate may hand to the launch worker: the home as startup cwd, a few
// namespaced labels and a scoped environment (PATH, CREW_* and FM_* only, so the
// coordinator's shell can resolve the crew tool and carry its settings). Argv stays
// the profile's literal command; nothing else is accepted.
export const ROLE_ENV_KEY = /^(?:PATH|(?:CREW|FM)_[A-Z0-9_]{1,60})$/;
export function roleLaunch(value) {
  if (!value || typeof value !== 'object' || typeof value.cwd !== 'string' || !value.cwd.trim() || /[\0\r\n]/.test(value.cwd)) throw Error('The role did not resolve a startup folder.');
  const labels = {};
  for (const [key, text] of Object.entries(value.labels ?? {})) {
    if (!/^custom\.[a-z0-9][a-z0-9.-]{0,60}$/.test(key) || typeof text !== 'string' || text.length > 400 || /[\0\r\n]/.test(text)) throw Error(`The role produced an invalid label: ${String(key).slice(0, 40)}`);
    labels[key] = text;
  }
  const env = {};
  for (const [key, text] of Object.entries(value.env ?? {})) {
    if (!ROLE_ENV_KEY.test(key) || typeof text !== 'string' || text.length > 8192 || /[\0\r\n]/.test(text)) throw Error(`The role produced an invalid environment entry: ${String(key).slice(0, 40)}`);
    env[key] = text;
  }
  return { cwd: value.cwd.trim(), labels, env };
}

export function startProfileLaunches(owner, cx) {
  if (!cx?.spawn) return;
  owner.profileLaunches ??= new Set();
  const key = 'custom.profile-launches';
  for (const job of shared(key) ?? []) {
    if (job.phase !== 'queued' || job.expiresAt <= Date.now() || owner.profileLaunches.has(job.token)) continue;
    owner.profileLaunches.add(job.token);
    cx.spawn(async cx => {
      await cx.sleep(0);
      const state = phase => setShared(key, (shared(key) ?? []).map(j => j.token === job.token ? { ...j, phase, expiresAt: Date.now() + (phase === 'starting' ? 60000 : 1000) } : j));
      try {
        if (!(shared(key) ?? []).some(j => j.token === job.token && j.phase === 'queued')) return;
        state('starting');
        if (!machines().some(m => m.name === job.machine && m.layout === 'ready') || job.space && !spaces().some(s => s.id === job.space && (s.machine ?? null) === job.machine))
          throw Error('The target machine or space is no longer available.');
        // A role-marked profile must be prepared by its plugin gate first. Any refusal ends
        // the job here: a coordinator profile is never started as an ordinary agent.
        let role = null;
        if (job.role) {
          const gate = await pluginGate(`profile.role.${job.role}`, { machine: job.machine, space: job.space, profile: job.profile, argv: job.argv, cwd: job.cwd, token: job.token });
          if (!gate.ok) throw Error(gate.reason);
          role = roleLaunch(gate.value);
        }
        const preparations=(await pluginPrepareProfile({machine:job.machine,profile:job.profile,argv:job.argv,role:job.role??null})).filter(v=>v.launch).map(v=>v.launch);
        const source = await readTextFile(`${appHome()}/mods/custom-new-menu/profile-launch.cjs`);
        if (!source) throw Error('Profile startup is unavailable.');
        // Plugins may adjust how the agent starts (A1 colors adds its space's color).
        const argv=await pluginTransform('profile.launch',job.argv,{space:job.space,machine:job.machine,profile:job.profile,role:job.role??null});
        if(!machines().some(m=>m.name===job.machine && m.layout==='ready') || job.space && !spaces().some(s=>s.id===job.space && (s.machine??null)===job.machine))throw Error('The target machine or space is no longer available.');
        const local = id => job.machine && id?.startsWith(`${job.machine}/`) ? id.slice(job.machine.length + 1) : id;
        const result = await exec('node', ['--input-type=commonjs', '-e', source, '--', JSON.stringify({
          stage: 'launch-profile', profile: job.profile, space: local(job.space), shell: job.shell, argv, cwd: role ? role.cwd : job.cwd,
          ...(preparations.length?{preparations}:{}),
          ...(role ? { role: job.role, labels: role.labels, env: role.env } : {}),
        })], { on: job.machine, timeout: 45000 });
        const reply = result.code === 0 ? JSON.parse(result.stdout) : null;
        if (!reply?.ok) throw Error(reply?.error || 'Profile startup could not be confirmed. Check the new tab before trying again.');
        const tab = job.machine ? `${job.machine}/${reply.tab}` : reply.tab;
        const space = job.machine ? `${job.machine}/${reply.space}` : reply.space;
        let shown = false;
        for (let i = 0; i < 60; i++) {
          shown = spaces().some(s => s.id === space && s.tabs.some(t => t.id === tab));
          if (shown) break;
          await cx.sleep(100);
        }
        if (!shown) throw Error('The profile started, but its tab has not appeared yet. Do not launch it again.');
        const active = spaces().find(s => s.active), activeTab = active?.tabs.find(t => t.active)?.id;
        if (job.space ? active?.id === job.space && [job.originTab, tab].includes(activeTab) : !active || active.id === space)
          run('tab.select', { id: tab });
        state('done');
      } catch (e) {
        state('failed');
        notify({ title: job.role ? `Could not start ${job.name || 'profile'} as crew coordinator` : `Could not open ${job.name || 'profile'}`, body: e?.message || 'Profile startup failed.', level: 'error' });
      } finally { owner.profileLaunches.delete(job.token); }
    });
  }
}
