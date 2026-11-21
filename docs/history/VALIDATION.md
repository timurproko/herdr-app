# Validation — Herdr App 0.1.13 / 0.1.14, Windows

## Automated checks

Run `npm test`, then `powershell -File ./skin.ps1 Check` from this folder.

- 589 deferred UI render/hover cases cover priority, grouped, collapsed and
  empty states. Native stock/version baselines, layout topology, icon assets,
  shared-helper equality, readonly preview identity, private profiles and
  selected-machine guards are checked.
- All 15 private mods plus the approved palette, Feedback and confirmation
  exceptions pass native checking: 18 checks total. The checker waits for its
  own process, not an inherited stdout pipe.
- Installer tests use disposable app homes. Unchanged installs preserve the
  full mod tree, file identities/timestamps and emit no file-write events;
  Windows directory last-access notifications are not payload writes. Changed
  helpers refresh only their own entrypoint. Unchanged frame apply retains its
  helpers, entrypoint and ownership record.
- Frame tests preserve the protected Feedback sending/attachment APIs and
  native confirmation dispatch. They never send feedback or close real spaces.
  Tests cover old ownership records, added helpers, personal conflicts, unknown
  stock refusal and correct newer-stock restoration after an app update.
- Quota/auth tests use fixtures: official endpoint restrictions, secret/error
  filtering, bounded requests, refresh races/ACLs and honest missing quotas.
- Preference snapshot tests cover allowlisted per-host exports, no cache/account
  or credential publication, quiet writes, native palette sidecar compatibility,
  closed-desktop import and retention of unrelated session state.

## Inline space naming

- Spaces now use the tabs’ inline InputState/✓/× pattern in the existing 28px sidebar row. Native menu/shortcut requests are redirected before prompt input allocation; double-click goes directly to the row editor. Background/remote IDs remain exact and no space-selection or terminal command is introduced.
- `space-rename.test.mjs` covers named/automatic values, empty saves, button/Enter save, Escape/×/outside/blur/close cancellation, repeated scoped keys, late blur guards, original pane focus, collapsed-rail expansion, folded-machine visibility, request expiry, native fallback and external rename/move/remove/layout/focus invalidation. Native state creation/release/focus is forbidden in render by the harness; request tasks must yield first.
- Both tab and space editors start with a collapsed selection at the end; repeated rename preserves explicitly selected text. Named-space placeholders resolve the automatic folder through an unnamed copy, without mutating the original alias. Local and remote alias cases are covered. Custom names hide the old repo label but keep ahead/behind counts.
- Full `npm test`, tab rename compatibility/patch restore tests, and native checks passed. Disposable native wrappers render the real sidebar input/actions and the automatic-first color row without renaming a real space.

## Space icon colors

- Right-click space menus show eight circles: dashed Automatic first, followed by seven same-palette colors. The heading and separate Reset row are removed. Automatic mode stays selected after sidebar color assignment; repeated Automatic does not rebalance the color, while a solid choice exits that mode. Existing menu commands/indices and terminal-paste behavior remain unchanged; no nested overlay or new terminal command is introduced.
- `space-colors.test.mjs` covers current selection, saved colors, local/remote background-space targeting, preservation of unrelated preferences, immutable updates, automatic reset, no-op and stale-target guards, keyboard swatch/reset navigation and the existing 200px menu width.
- Full `npm test` passed (629 deferred render/hover cases). Native checks passed for the menu and a disposable wrapper eagerly rendering all eight swatches, including the dashed Automatic SVG. No real space colors were changed during tests.

## Launch permissions and editor machine lock

- Focused core/permission tests and the latest complete `npm test` pass (629 deferred render/hover cases). The earlier unrelated workspace-status assertion mismatch has been resolved; those status files were not changed for this Core UI work.
- Current read-only management probes report **Standard user** for both real cores. Remote inspection runs through administrative SSH but correctly measures the running core’s standard token, not the SSH caller. No real core or autostart preference was changed by inspection.
- Tests cover token-role checks (not just Administrators-group membership), per-machine results, in-flight machine switches, single-flight checks, bounded execution, failed/malformed responses and retry. Failure clears the old status.
- Editor tests assert dimmed/disabled machine selectors, absent dropdown handlers, preserved draft targets and disabled Refresh for both profile and terminal drafts. The live editor/dropdown interaction still needs manual verification; a native initial check is not an interaction test.
- **Core** is a separate page, with always-visible permissions/autostart, read-only status, a separate state-dependent Start/Stop row, and footer-only Apply/Discard/change/restart notices. The machine header has no variable-width notice and there is no Relaunch action. Core controls no longer occur in Terminals/editors. Tests cover draft-only option changes, explicit non-disruptive Apply, direct action submission, actual-token Stop, stopped/unknown states, per-machine isolation, no effects on open, double-click guards and durable pending receipts. Same-SID/UAC/no-headless-fallback/owned-task checks, token proof and PowerShell parsing remain covered. Stop has a concise visible warning and tooltip instead of revealing another settings form. Loading reserves all four rows with native skeletons instead of dashes and creates no guessed draft. Same-machine snapshots survive closing/reopening the overlay; actions stay disabled until verification. Tests also cover cache invalidation on failed checks and pristine cached drafts adopting fresh backend preferences without false unapplied changes. Permission menu and trigger share one width.
- `node scripts/permission-launcher.smoke.mjs --on pc2` passed **standard → administrator → standard** on a unique disposable `HC_SESSION`, including real kept terminal holders between transitions. The elevated-to-standard transition needs a separate elevated stop coordinator and Limited starter because Windows rejects a Limited client inspecting the elevated named pipe. Each new core’s token was verified. Directory regressions also use raw API calls from a deliberately System32-based client: default execs and terminals start in the user home in all three transitions, while explicit project folders (including spaces, `#` and Unicode) remain unchanged. Task actions set WorkingDirectory; workers set both PowerShell location and native cwd before any stop, and ProcessStartInfo uses the home directory. The saved sign-in task was also triggered manually in each mode and reused the existing scratch core without changing its PID. Scratch tasks, policy and session files were removed; the real core PID and holder identities were unchanged.
- The live smoke also passed **Stop → inspect while stopped over SSH → disable autostart without starting core → Start → repeated Start**. Core stayed stopped after inspection/configuration; repeated Start retained its PID. Independent autostart edits during all mode transitions preserved current core PID/state. Test management uses the production SSH identity/session guard after creating the disposable identity, independent of the remote core. Test tasks/session files were cleaned up and the real core/holder identities were unchanged.
- SSH controller tests cover offline operation, paired identity/session pinning, key-only batch authentication, known-host policy, source on stdin, safe ports/targets, custom-via rejection and conservative handling of lost acknowledgements. Stop never triggers a controller reconnect. Successful Start/Relaunch can reconnect using machine.connect without interactive login.
- Native checks passed for the installed mod and disposable Core-page wrappers covering Running/Stopped, open permissions dropdown, stable checking/refresh layout and dirty/restart notice footers. Only five settings module files and their ownership hashes were deployed; unrelated live layout/customizations were preserved.
- Desktop UAC interaction and an actual sign-out/reboot were not exercised. Persistence is a Windows sign-in task, **not guaranteed pre-sign-in SSH enforcement**. Startup tasks never stop an existing core. The UI distinguishes saved versus actual permissions. Independently attached clients can automatically restart a stopped core; the Stop tooltip states this. Interactive desktop UAC prompts and a physical reboot remain manual checks.

## Automatic frame startup repair

The private brand's non-footer instance starts a bounded local worker when Custom
mounts. It reuses the existing reversible frame patcher, honors opt-in records,
and never switches layouts, focuses panes, restarts the desktop/core or sends
terminal input. Results live under `shared("custom.frame-startup")`.

`startup-frames.test.mjs` uses a disposable app home to simulate stock entrypoint
restoration and deleted helpers, then verifies all three repairs, quiet no-change
file identities/timestamps, missing opt-ins, independent unknown-stock/personal
conflicts and worker locking. A synthetic host verifies local direct argv with
spaces, layout gating and bounded startup retries. The complete `npm test` suite
and all 18 native checks passed after installation. The live hook published
`ok: true` for all three frames and runtime status reported `errors: []`.
An actual desktop restart was not performed; terminal sessions were left running.

The follow-up replaces all runtime/installer dialog lists and target special cases
with `frame-patches/registry.json` and a shared validated generic patch engine.
Registry regressions add previously unknown IDs targeting differently named
`frame/` and `mods/` folders, exercise explicit opt-in/apply/check/restore/startup,
and run the actual installer against a disposable bundle with multiple entries.
They reject traversal, malformed IDs, duplicate targets/files and missing stock
snapshots. Existing opt-in record paths and backup formats are unchanged. The
full suite passed; after the PowerShell multi-entry fix, registry/installer
regressions and all 18 live native checks passed again.

## Current layout contracts

- Rows/tools 28px, inset tools 24px, fields 32px, controls radius 6px, dialogs
  radius 8px. Program icons 16px with a shared 13px text-metric context; status
  bulbs 7px. Monochrome program artwork stays foreground-white; branded images
  keep their colors.
- Modal section stacks add no gap. Rows own symmetric 12px insets and a 64px
  minimum. Jump's non-interactive divider before New tab is 25px including its
  1px line (12px each side). Compact menus use 8px per side. Ordinary body/footer
  insets are 16px; fixed-height confirmation uses explicit compact tokens.
- Jump uses a frozen opening snapshot and fixed list geometry. Creation commands
  and their divider are absent during search. Quiet-space counts have correct
  singular/plural wording without an upper divider or “earlier:” prefix.
  Space titles match the sidebar's 13px normal-weight active/inactive colors.
- Expanded Agent rows use session titles only in priority, grouped and pinned
  views; no folder prefix/separator. Tests preserve session-internal punctuation,
  meaningful live-title/program fallbacks, metadata and rail behavior.
- Expanded/collapsed Spaces retain identical space numbers/colors independent
  of folder names, including Unicode; expanded worktrees also keep their branch glyph.
- Profiles and Usage share a Settings header machine selector, identical to the
  Usage dialog's component. Other app-wide pages omit it. A profile draft blocks
  machine changes; serial/context guards reject stale discovery results.
- Preview fonts refine a retained readonly EditorState without rereading or
  reconstructing its buffer. Metric changes can still change wrapping/viewport.
- Shell choices are Herdr default plus verified installed shells, not duplicate
  Windows Terminal profiles. Saved argv and existing sessions remain unchanged.

## Live-directory follow-up

The core's stored cwd can remain the Git Bash launch folder. A shared resolver
uses actual non-shell foreground cwd or private Bash cwd/home labels before
falling back to native metadata. Explicit names remain intact. Last-selected
terminal memory is window-local, not persisted into synced settings. File-only
panes are excluded. + menu/worktree launches receive an explicit resolved path.

A new cross-component UI case checks stale home metadata versus D:/Git/a1 across
Spaces, Jump, pane captions, unnamed shell tabs, agent rows and the launcher.
Directory tests cover foreground versus shell metadata, local/remote homes,
Windows/UNC/Unicode paths, stale focus removal and custom names. Bash tests use
new isolated processes with a mock hc, never a real agent/core terminal or input
to a user terminal. TTY=true is modeled only in a disposable fixture copy; the
unmodified production hook is separately checked to ignore captured/non-TTY
agent tools. They test URI encoding, change-only reporting, retry,
exit-status preservation, string/array prompt hooks and non-Herdr/no-interactive
no-ops. Existing user sessions require a manual source of the narrow reporter;
synthetic checks do not prove a user session loaded it. The installed follow-up
passed 18 native checks with errors=[], preserving three existing terminal PIDs,
the focused pane and 75 protected stock/personal file hashes. Existing sessions
had no live folder labels yet; their manual reload is not claimed as completed.

### Session-marker regression and real PTY verification

The first reporter version mistakenly checked `HC_TERMINAL`; hc 0.1.19 actually
exports `HC_TERMINAL_ID`. Its mocked tests repeated the wrong assumption, so new
real shells never registered the reporter and the last-directory guard failed.
Both guards now use the documented native marker. The default directory tests
query the installed core's schema/caller description and check the real .bashrc
guard, preventing a self-consistent mock from blessing that typo again.

A subsequent real Windows Bash PTY test used a separate random `HC_SESSION`,
scratch HOME/XDG/AppData paths and no parent notifications. It copied the actual
tracked Bash startup files into that scratch home, installed the production hook,
and seeded an intentionally wrong .lastdir. A new login Bash auto-loaded the hook,
preserved the requested launch folder, then a real cd plus prompt execution
published the correct cwd/home labels through the real hc CLI. No mocks replaced
the session marker, TTY test or label transport. Directory equality accounted
for Windows short/long temp-path aliases. The owned core was stopped afterward;
the user's core and three terminal PIDs were preserved, with no app commands or
user-terminal input. Audit: local Temp/herdr-cwd-real-proof.json (not tracked).
Existing shells created before this correction still need a manual source or a
new Bash tab; this verification does not claim their hooks were remotely loaded.

## Live evidence and limits

The pre-directory 0.1.14 UI follow-up passed all tests and 18 native checks;
post-install status reported no overlays/errors. The focused pane and 75 checked
stock/personal files were retained. Subsequent source-folder migration verified
221 installed payload/settings/theme files unchanged; it did not reinstall or
restart the desktop/core.

The 0.1.14 update restored native palette, Feedback and confirmation files.
Their changed stock source was verified byte-for-byte against the executable's
embedded source before reviewed patches were reapplied. Both supported stock
snapshots remain available; unknown future versions are never auto-adopted.

Fresh checks do **not** prove live reload succeeded. Inspect runtime status
before/after installation, and do not reload open drafts or ignore existing
errors. Earlier reload storms exhausted the long-lived host. Quiet installation
avoids unnecessary reloads; it is not a claimed allocator fix. Historical safe
recovery preserved terminal PIDs by closing/reopening only the desktop, never
stopping the core or injecting terminal input.

Real pointer/drag quality, native partial-selection contrast in Feedback/hex,
clipboard key behavior and perceived alignment still need user verification.
Fixture success is not proof of actual-field selection visibility. No selection-
clear API or safe compiled update-pill styling API is exposed. Existing Bash
sessions require a user-initiated Readline reload; remote configuration is not
changed automatically. Optional Copilot billing may return 404; missing usage is
not invented and no broader permissions are requested.

Historical screenshots and the full old validation diary were archived outside
yadm during cleanup. They are not needed for installation/tests and may contain
personal terminal content. Licensed icon/layout SVG assets are retained.
