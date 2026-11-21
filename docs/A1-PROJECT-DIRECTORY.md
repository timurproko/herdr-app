# A1 project-directory provider

The [agent-context capability boundary](AGENT-CONTEXT.md) is agent-agnostic. Its
registered A1 adapter lives in
`src/integration/agent-context/providers/a1.js`; shared directory/UI code neither
identifies A1 nor parses its labels. Claude Code has a separate adapter using its
existing session-root hook, and new providers need no shared resolver/panel edits.

A1 can switch active projects without process-global chdir. Its public native
report provides `a1.cwd` alongside complete `a1.session`, `a1.runtime` and `a1.at`,
plus `a1.cwd.binding` equal to the exact `runtime/session/at` tuple joined with
slashes. The adapter validates identity/token/freshness before returning the path
to common validation. Old identity-only producers cannot refresh an orphan path
into apparent freshness. Invalid or unavailable reports retain generic fallbacks.

These labels are routing hints, never control authority or portable preferences.
There is no agent API polling, terminal input, transcript directory scraping,
native patch, automatic upgrade or agent restart. A1 source PR 969 supplies the
missing producer report; an existing immutable A1 process does not gain it from
consumer deployment. Its owner can use the supporting release/development build
when safe. Local/remote reads stay bound to the selected terminal's own machine.
