# Tasks

## 1. Sidebar pin holds one session-only source, view and visibility across navigation, with safe legacy migration and an unpinned restart

- [x] 1.1 Add bounded source capture and the version-2 single-pin/default model in the shared panel boundary; panel-state fixtures cover qualified identity, click-time capture, idempotent pin/unpin and no render-time writes or IO.
- [x] 1.2 Reconcile the global held choice through existing yielded native layout acknowledgements, retaining explicit view/visibility controls and stale callback guards; panel-state and panel-switch fixtures cover tab/space navigation, delayed acknowledgements, close/reopen and stale popups.
- [x] 1.3 Preserve the existing pin asset, size, pressed and hover styling while replacing per-tab accessibility wording; panel-pin-ui fixtures assert appearance parity and release from a different current tab or a source-less selection.
- [x] 1.4 Migrate valid v1 state to its preserved default with no fabricated held source, preserve unknown versions and share the hold only within the running app session; focused reload/restart fixtures assert restart is unpinned and no source reaches durable or portable storage.
- [x] 1.5 Update docs/ARCHITECTURE.md with the single owner, storage shape, restart lifetime and legacy migration; documentation matches the tested v2 state and explicitly distinguishes the sidebar pin from Git's PR-row pin.

## 2. Files uses the held directory and machine across agent and space switches, including view changes and release to the current agent

- [ ] 2.1 Integrate the shared held context into Files' location adapter and packaging without changing file-viewer ownership; Files-location fixtures cover local/remote routes, shown/peek terminals and capture of an already-retained explorer behind a file viewer.
- [ ] 2.2 Keep the captured folder across cwd, agent, tab, pane and space changes and preserve normal same-folder tree reuse; focused Files fixtures assert stable source/tree context through navigation and immediate current-selection resolution after unpin.
- [ ] 2.3 Preserve captured file-read/open/recycle targets and existing current-space viewer rules without borrowing the selected machine; targeted stale-context fixtures cover unpin/recapture, source disappearance and disconnected remote sources without new UI or terminal actions.
- [ ] 2.4 Update README.md's Files/sidebar description with held-folder behavior, explicit view changes and release semantics; the examples agree with tested source capture rather than promising a frozen filesystem snapshot.

## 3. Git uses the held agent or coordinator context without changes to its render path, preserving plugin availability and stale-context guards

- [ ] 3.1 Integrate Git solely through mod/location.js and panel.json so ordinary agent association and coordinator mode use the held source; Git-location and focused coordinator fixtures cover different repositories, same-repo different agents, remote identities and release to current selection.
- [ ] 3.2 Keep the held source across manual Files/Git changes and preserve it through enabled-view fallback, hide/show and disable/re-enable; sidebar-plugins and shared-state fixtures cover all four availability combinations without erasing the pin or contaminating the default.
- [ ] 3.3 Exercise the unchanged Git consumer with held navigation, stage/robot activation, refresh and obsolete replies; focused integration fixtures assert no destination source/PR takeover or motion and preserve current live-target/provider verification without editing PR 104's render, agent-link or animation code.
- [ ] 3.4 Complete README.md and architecture behavior descriptions for held ordinary/coordinator Git, restart and source loss; targeted fixture results and the final changed-file list establish the documented boundaries without a full-suite run or live deployment.
