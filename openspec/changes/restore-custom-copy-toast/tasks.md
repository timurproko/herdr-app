# Tasks

## 1. Custom popup restored without observer regressions

- [ ] 1.1 Restore the private Popup renderer and original font, theme colors, geometry, wording, bottom-center anchor and animation timing from 42d2325; compare the source and assert the rendered tree in the copy-toast fixture.
- [ ] 1.2 Route successful copy decisions into the custom popup while retaining #12's live eligibility, fresh baseline, selection/focus/generation guards, bounded retries, direct clipboard reads and single emission per selection; retain the existing observer fixture cases and make standard notify/process calls fail.
- [ ] 1.3 Add cancellable, guarded popup lifetime timers and source-tab suppression; cover arming/hold/fade, repeated shows, disable/close cleanup and already-queued stale animation callbacks with deterministic timers.
- [ ] 1.4 Update README.md and docs/TESTING.md to describe the custom centered terminal-font popup and preserve best-effort limitations; compare their claims to the workspace-experience delta and run `node --experimental-vm-modules tests/copy-toast.test.mjs`.

## Workflow follow-up

- Await plan approval before implementation. Keep this PR draft; no native changes, deployment, live-session operations or merge.
- Report the restored presentation, retained #12 behavior, focused test results and lack of live visual validation after implementation.
