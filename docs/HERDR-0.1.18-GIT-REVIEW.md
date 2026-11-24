# Herdr 0.1.18: Git error investigation

This is a read-only diagnostic comparison, not permission to deploy, rebase a
native patch, change the reviewed-version profile or mutate the running app.

## Sources and result

Compared upstream release trees:

- 0.1.17: `a751b75b0418bf13950f7627d122bb934ac2c46c`
- 0.1.18: `9a9ae13d998e6ed74c76e8eb13bdeb2e1420f50c`
- [Full comparison](https://github.com/herdrdev/herdr-app/compare/v0.1.17...v0.1.18)

The installed host capability check identifies **0.1.18**, accepts all required
APIs/commands, and emits its existing **newer than last reviewed** advisory. It
reports no missing API, command or direct-import boundary. That gate is a public
capability gate, not approval of copied native frame files, runtime performance,
or every optional document adapter. The separate tab-move source audit returned
`source-unavailable` (HTTP 403) while its synthetic fixtures passed; it grants no
new compatibility approval.

## Render, layout and data contracts

- The QuickJS sandbox deadline code, lifecycle/scheduler, view fallback and host
  notify/focus implementation are unchanged between these releases. In particular,
  the render/layout budget remains **50 ms**, versus 500 ms for events/tasks.
  Its interruption is deliberately uncatchable in JavaScript. `interrupted` is
  consistent with that guard, not proof of a new 0.1.18 render rule.
- Engine and materialization changes add editor/textarea/input blur operations,
  editor settings, text selection/highlight/raw-HTML behavior, window mouse
  callbacks and scroll geometry readback. The existing `on_size_change` callback
  registration remains; the scroll-layout recording change applies to attached
  scroll handles. No changed `line_height` parser/unit semantics were found in
  the engine/value/materialization diff. Existing numeric line heights remain
  font-relative, and the Git rows already use absolute pixel strings.
- The public `machines()` declaration/array normalization and Git's machine layout
  fields did not change. Model/mirror changes include focus and stale selected-tab
  cleanup, not a new machines collection shape. No evidence here establishes the
  detached-fleet cause; that separate task is not repaired by this Git change.
- The complete packaged coordinator fixture with two repositories, 30 mixed
  Closed rows and a section read notice does **not** reproduce the native
  interruption. It uses Node/host-shaped mocks, not native timing. Neither
  0.1.18 nor a merged customization change is established as its introducing cause.

The proven separate issue is a synchronous notice transport failure reaching
fallback `notify` during inline spawn before yielding (present since import PR
#1). Deferring request work fixes that path. Component/error diagnostics and a
best-effort surviving abort marker are documented in `TESTING.md`; they do not
claim to catch the native watchdog.

## Process execution and GitHub environment

`src/mods.rs` changes captured exec from `spawn::command` to
`spawn::detached_command`. The new helper adds `setsid()` **only on Unix**. On this
Windows machine it delegates to the same command builder, without changing PATH,
credential variables, working directory defaults or environment inheritance.
Local native exec still defaults to user home; remote execution still goes through
Core. The local call inherits the desktop environment, which need not equal the
current shell/Core environment.

Exact explicit-repository history reads reproduced unresolved crew PRs #36/#37/#38
as timurproko; crew #1–#9 and herdr-app #41/#43 succeeded. The wrapper was first on
PATH, with no explicit tokens and no GH_REPO/GH_HOST in the Core reproduction.
This identifies inaccessible recorded items, not a 0.1.18 spawning/account bug.
The already-running desktop's full environment was not extracted, so equivalence
with every inherited desktop variable is not claimed. API/GraphQL calls now route
explicitly with a nonempty per-child GH_REPO rather than relying on cwd or query
contents; token/host variables remain untouched.

## Native frame patches on this installation

The deployment log and installed ownership records are separate from the public
host capability gate:

- **Palette: skipped, inactive, not retained.** 0.1.18 changes the stock palette
  (including manifest-derived commands). The old reviewed original does not
  match, so the optional patch refuses unknown bytes. The log emits
  `Optional palette patch skipped: unsupported original/unknown target; bytes
  and opt-in unchanged`. This is not silent and is not valid 0.1.18 patch coverage.
  Restoring the custom palette needs a separately reviewed rebase; this task does
  not perform it.
- **Feedback: already current.** The stock feedback entrypoint is unchanged in
  the release comparison, and the installed patched main hash matches the owned
  record (`dccf45e47cc847e112ee93e2b073d67eaf75dadc5a42d5335c680b636c1acc85`).
  Its existing reviewed-byte patch remains installed, rather than skipped.

Neither frame owns the custom Git renderer. These facts do not establish a link
between the palette skip and the Git interruption. No installed bytes, opt-ins,
preferences, accounts, terminals or processes were changed during this review.
