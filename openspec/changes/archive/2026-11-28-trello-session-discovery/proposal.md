# Proposal

## Why

Herdr-started agents do not learn that the enabled Trello plugin has a CLI, and an installer-shell PATH check does not establish command discovery inside their tool shells. People should be able to ask A1, Claude Code or Codex to find a Trello card without explaining the integration or locating its executable.

## What Changes

- Publish one short, credential-free Trello skill announcement through each agent's existing user-skill discovery mechanism. Put the essential standing note in the automatically advertised description, not only in an optionally loaded skill body.
- Reconcile only owned announcement files with execution-host enablement, including removal when disabled, startup/reload recovery and a final check before a Herdr profile starts. Access wording remains conditional on current Read-write and private host gates rather than caching a claim of write authority.
- Prepare the actual target machine's agent launch environment so `herdr-trello` resolves by name in Bash, PowerShell and CMD, even when Core inherited an older PATH. Preserve existing profile arguments, Claude isolation and coordinator PATH additions.
- Keep owned POSIX and CMD launchers, but remove the owned PowerShell-script name-resolution trap so ordinary PowerShell invocation works without an execution-policy bypass. Preserve unknown or modified files and support guarded upgrade/rollback.
- Extend focused discovery/lifecycle/launcher regressions and document the first-use contract and already-running-session limits. Preserve the card/image read repairs from PR #108.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trello-agent-access`: enabled-host standing announcements, announcement lifecycle and real agent-shell command reachability rather than installer-shell-only discovery.

## Impact

- Existing skill discovery: A1 and Codex use `~/.agents/skills`; Claude Code uses `~/.claude/skills`, including the existing account-switcher config mirror.
- `src/plugins/trello/`, plugin lifecycle integration, `src/services/private-actions/trello-{controller,transport,install}.cjs`, and new narrow owned announcement helpers.
- Shared profile preparation in `src/features/tabs/profile-launches.js` and `src/services/terminals/profile-launch.cjs`; the plugin boundary remains generic and roles retain their own gates.
- `tools/trello-launchers.mjs`, build/runtime mappings and targeted deployment, remote, lifecycle and profile fixtures.
- No credentials in notes, new Trello API routes, global npm installation, native App/Core patches, terminal-input injection, production deployment or running-agent restart.
