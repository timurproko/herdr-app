# Validation — Custom architecture and source ownership

Host checked: Herdr App 0.1.14, Windows.
Canonical project: `~/.config/herdr-app/customizations/`.

## Cross-space tab moves — App 0.1.15 / Core 0.1.19 and 0.1.21

- `npm test`: passed, including 80 synthetic move-adapter assertions and the new
  menu/controller fixtures (preservation, version/identity/deadline gates, bounded
  CAS conflicts, unknown outcomes, metadata repair, child isolation, remote
  qualification/routing and pinned-session changes). UI fixtures also cover no
  automatic follow, final-tab source retention and no loading text/item tooltips.
  Menu preflight begins on parent-open; the destination snapshot appears before it
  finishes. Regression checks cover single-highlight keyboard/pointer modes,
  mode-specific row IDs, the Spaces icon, the divider below Back, and the
  non-interactive **Available spaces** header beneath that divider (included in
  the popup's explicit height budget).
- `npm run check:host-api`: passed. Private document compatibility is separately
  gated in `integration/herdr/documents/tab-move-v1.cjs`, not certified by this audit.
- `npm run test:native`: 17 private mods, two existing frame fixtures, six existing
  Claude fixtures and **six deferred tab-move menu states** passed in a disposable
  app home, with process APIs denied in those tab-move UI fixtures.
- Guarded deployment, ownership report, doctor and installed native checks passed.
- Remote-workstation Core 0.1.19 schema was reviewed for document CAS compatibility.
  A live read-only scoped probe verified its hello, document and terminal-get
  routing without installing anything or changing remote documents/labels.
- A read-only probe through the installed GPUI mod's actual `exec` → Node → Core
  route returned `ready`. `tools/preview-tab-move.mjs` visually checked the live
  destination badges/names in both dialog and popup modes; mutation submission was
  replaced with a rejecting stub. Screenshots: `.work/tab-move-menu.png` and
  `.work/tab-move-popup.png`. Temporary mods/receipts were removed afterward.
- The scroll list has an explicit row/divider height budget: an auto-height popup
  must not collapse an overflow container's zero min-content height. The UI fixture
  guards this, and the popup screenshot confirms visible rows.
- Full `npm run test:integration` remains blocked by an existing deferred fixture:
  its `gpui-base` mock does not export `ScrollHandle`, already imported by Spaces.
  That unrelated mock/selector baseline was not rewritten for this feature.
- **Not claimed:** a live tab move, live label mutation, real terminal restart /
  cwd preservation, or a disposable two-running-client concurrency test. No live
  document writes or terminal input were used to validate this implementation.
  The remaining concurrency limitations are documented in `TAB-MOVE-ADR.md`.

## Executed successfully (architecture audit history)

- `npm test`: preserved feature regressions plus host-facade, architecture, ownership-report, temporary-mod, deployment and rollback fixtures.
- `npm run test:integration`: reviewed stock-file isolation and 629 deferred render/hover scenarios.
- `npm run check:host-api`: 0 missing APIs, 0 missing commands, 0 direct Herdr imports outside the facade for 0.1.14.
- `npm run test:native`: 15 private mods and 2 retained frame-patch fixtures, in a disposable app home.
- Architecture-audit deployment: 16 facade payload updates; only palette/feedback frame opt-ins refreshed. No built-in mod patches.
- `npm run doctor`: 347 owned files and both retained frame opt-ins healthy, with no conflicts.
- `npm run report:ownership`: 15 Custom mods, 21 Herdr-catalogued mods, no unknown/recovery/legacy live mod folders. Catalog membership alone does not verify stock bytes.
- Live temporary inspector tested through the shared facade: 10 panes, local/remote-workstation layouts ready, no legacy mod references.
- `npm run preferences:export`: safe per-host snapshots at the new nested source location.
- External Bash revision-dispatch and PowerShell logical-directory fixtures passed.
- Native `herdr-app status`: Custom active, zoom 1.3, no reported UI/file errors.
- Personal terminal padding remains 7px; layout preferences are separate from generated layout source.
- yadm recognizes new source; generated dist, runtime manifest and shared state are ignored.
- Former sibling project directory is absent; no junction or duplicate source tree retained.

## Herdr 0.1.15 compatibility review

- Reviewed the installed Windows executable with SHA-256
  `ec5284289742710f3c247b4e8f4148c906671cdac9da33a00e8ffbe02846ae1b`.
  The baseline recorder verified all nine changed stock entrypoints as exact
  embedded source bytes; unchanged files retain their 0.1.14 hashes. Personal
  settings and keys were not adopted. The hashes and provenance are under
  `upstream/baselines/0.1.15*`.
- Compared the regenerated `herdr.d.ts` with the 0.1.14 source declaration:
  only comments changed (failed known-agent checks and parent-address mapping),
  not function signatures. The existing facade needs no aliases.
- Reviewed the changed stock UI: ref-only Git reads, agent ordering/title fixes,
  tab scrolling, pane-header position, diff tab expansion, agent-check failure
  text, picker keyboard navigation, machine-login guidance and worktree focus/
  explicit local-machine routing. These do not require native changes for the
  requested Custom refresh UI. Private clones do not automatically inherit all
  upstream behavior changes.
- The installed SDK supports native `spin(900)` motion and disabled controls
  used by refresh. Refresh no longer installs header overlays or size callbacks.
  Native initial checks passed for 15 private mods and two existing frame
  fixtures. This does not certify deferred states or future host versions.

## Refresh controls and PR-only Git

- Refresh hover tooltips are removed from the shared control (Settings,
  Files/Git, pane reload and Usage), including Usage sidebar recovery actions.
  Accessibility labels and non-refresh tooltips are preserved. Unit recheck,
  254 scoped deferred cases, host API and native checks passed; installed
  Settings/Files/Git helpers and Usage source match the candidate. The broader
  Git deferred fixture still references the retired `pulls-list` selector and
  is separate from these tooltip checks. Deployment was already current;
  doctor and live status reported no issues.

- Files no longer registers a folder watcher or 10-second refresh timer. It
  reads on opening/reopening, selected agent/tab/folder changes, and explicit
  Refresh; folder expansion remains lazy. Hidden panels start no scans, stale
  reads cannot continue into Git scans, and reopening invalidates pending reads.
  Same-folder agent switches refresh while preserving expanded folders.
  `files-refresh-policy.test.mjs` covers these triggers and 100 unrelated
  rerenders without IO, plus manual feedback, remote routing and stale replies.
  Unit, focused deferred (266 cases), host API and native checks passed.
  Installed Files sources match canonical source; doctor/status were healthy.
  Latest guarded deployment backup: `1794389302707-23688`.

- Core, Profiles and Terminals now restart the same 600ms minimum from their
  refresh controllers, covering initial entry, cached re-entry, machine changes
  and the Profiles-to-Terminals shortcut. Old timer handles are cancelled and
  token checks prevent stale expiry. Real results still update immediately.
  `settings-refresh.test.mjs` covers cached/rapid re-entry and machine isolation;
  unit, focused deferred (266 cases), host API and native checks passed.
  Deployment backup: `1794388507781-16656`; doctor and live status were healthy.

- Manual refresh feedback now has a 600ms visual minimum. One owner-scoped
  one-shot timer releases the clicked icon; results/errors are still applied
  immediately, and requests lasting longer than 600ms receive no extra delay.
  Fixtures cover quick/slow/error results, duplicate clicks, stale timers and
  machine/folder/section isolation, including Usage sidebar recovery. Unit,
  focused deferred (266 cases), host API and native checks passed. Guarded
  deployment confirmed current source bytes were already installed; doctor
  and live status reported no issues. Live perceived timing remains a manual
  check; no real quota requests or terminal input were forced.

- `npm test` passed for disabled rotating refresh controls, scoped provider
  rotation, duplicate-request guards, quiet Files watcher/poll refreshes, file
  reload completion races, Git's non-repository disable/re-enable guard, retired
  Changes-selection fallback and render-phase notification safety. Moving header
  lines and their geometry callbacks were removed.
- Focused deferred integration passed 266 cases across Files, Git, Usage, Settings
  and pane headers. Full integration currently stops on the unchanged Jump
  viewport assertion (expects 320px; `picker/main.js` uses 320 + 8px inset).
  That unrelated expectation was not relaxed.
- `npm run check:host-api`, disposable `npm run test:native` (15 mods + two
  existing frame fixtures), guarded deployment, `doctor` and installed
  `check:native` passed on 0.1.15. Latest deployment backup:
  `1794387060660-11324` (prior header-line deployment: `1794386472961-3044`).
- Inspected a live screenshot: Git shows only Open and Closed, resolves the
  active remote repository, and renders without the transient render-phase
  notification error found and repaired during validation. The app retained
  its sessions; no terminal/core restart or input injection was used.
- Inspected the deployed live Git panel with no header progress line or UI
  errors. Busy-state rotation/settling and non-repository disabling are covered
  by fixtures; a person should still inspect the live click timing. No real
  quota refresh was forced by the tests.

## Boundaries / remaining manual checks

No native Herdr/core build, binary replacement, desktop restart, core restart,
terminal shutdown, or terminal-input injection was performed. Native eager checks
and mocked interactions do not prove every live interaction or all future upstream
versions. Unknown native patch originals still fail safely. Shell selection now uses native
`tab.new` without core-document writes. The separated profile worker's read-only
space guard is still outside the public API facade's checks. See
`ARCHITECTURE-AUDIT.md` for remaining risks.

Existing shells which loaded the interim sibling source path need a one-time
narrow folder-reporter reload at an idle prompt, or a new shell. The command is in
the project README. New shells already use the nested path. Old namespace bridges,
label aliases and completed migration tooling have since been retired. These
historical validation results do not certify the later cleanup; rerun the checks.

Changes are not committed. Unrelated staged/user changes were not reset or staged.
