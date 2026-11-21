# Agent-agnostic active project directories

Shared UI consumes **capabilities**, not agent names or private APIs. The directory
resolver asks `agentProjectDirectory({terminal,pane})` for one normalized active
project and ranks it above foreground-process, shell, focus, pane and terminal
fallbacks. Files/Git/Spaces and existing directory consumers share this boundary.
The Git repository UI contains no new agent-specific directory logic.

## Provider boundary

`src/integration/agent-context/context.js` owns the passive synchronous registry.
Providers implement `id`, `matches(context)` and optional
`projectDirectory(context)`, returning an absolute path or no value. Common
validation bounds paths to 4096 UTF-8 bytes, rejects controls/invalid Unicode and
normalizes slash/trailing-root spelling. Timestamps expire at 90 seconds with five
seconds of future tolerance. The exact terminal/machine context is never replaced
with focused or globally current identities. Providers do no IO or writes.

A missing/unsupported/throwing provider, malformed path or more than one matching
provider yields no capability. Existing generic directory fallbacks then apply.
An agent without an adapter can still use those foreground/shell/terminal paths.
Herdr exposes terminal cwd but not a reliable distinction between every OSC 7
report and process/shell fallback; it is not treated as proof of an internal
project switch. Never infer project roots from arbitrary transcript text.

## Available providers

- `providers/a1.js` reads the public native endpoint-ready `a1.*` project report,
  validating complete UUIDs and the exact runtime/session/timestamp publication
  token. A1 needed the producer addition because its effective project can change
  without process-global chdir. It adds no new RPC or companion requirement.
- `providers/claude-code.js` reads the existing companion's
  `custom.claude.session`, `.cwd` and `.at`. That hook already uses the session-root
  API rather than a shell tool's transient cwd. No Claude producer change, account
  access, session restart or private config discovery is needed. Without that
  reporting hook, Claude safely uses generic directory fallbacks.

These are optional protocol **adapters**, independent of optional color/rename
plugin switches. The resolver does not branch on either agent or inspect their
labels. Existing session-PR footer parsing and optional session control are other
capabilities; they are not directory protocol code and are not redesigned here.

## Adding another agent

Add a pure adapter under `src/integration/agent-context/providers/` and register it
in `providers.js`. Prefer an existing documented/native signal or hook/API. Add
producer support only if the agent cannot otherwise expose its active project.
No directory resolver or Git repository UI edit is needed. Never add an ambient
current-agent selector, stored identity, polling loop or terminal input.

`tools/build.mjs` packages this whole canonical tree under
`integration/agent-context/` in every mod and the runtime lib. Each generated file
retains its canonical source ownership. A scoped deployment must include
`--source src/integration/agent-context/`, plus changed shared consumers/facades;
it does not deploy unrelated plugin/layout changes.

`tests/agent-context.test.mjs` covers both existing adapters and registration of a
synthetic future agent without editing UI. Packaged directory/Git fixtures cover
priority, expiry, machine routing and stale in-flight results for both agents.
Architectural checks prohibit agent names in the generic registry, shared shell
facade and directory resolver. Disposable checks are not live-agent acceptance;
existing immutable A1 versions still require owner-managed producer rollout.
