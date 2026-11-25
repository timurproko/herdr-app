# Stage 1: separate small 0.1.18 restoration PR

## Decision requested

Approve **stop-gap first, owned replacement second**. The rebase is small relative to the full replacement: the existing registry already selects replacements by exact original, and 0.1.18's change is a localized catalog extension (not a new renderer). It needs no installer redesign, structural matching, binary patch or new opt-in. It can therefore be delivered earlier in its **own small draft PR**, subject to actual fixture results and source/embedded-byte review. It is not persistent against future changed native palette bytes and is not the final architecture.

This file is a concrete follow-up plan, not a second implementation PR or authorization to start it. This task remains confined to its assigned folder and stops at the planning handoff. The coordinator can assign the approved stop-gap its own supported task/worktree; the durable replacement stays in this existing PR/branch. No other worker's PR is involved.

## Narrow implementation

1. Obtain exact pinned 0.1.18 `defaults/frame/palette/main.js` at `9a9ae13d998e6ed74c76e8eb13bdeb2e1420f50c` (LF 19,238 bytes; SHA-256 `f8cbfb955ab3ef4474012dbb7103a7b8c5260c9c6ccde96aea6952a4980124dc`). Add byte-faithful `original-0.1.18.js`, keeping native imports; inspect the installed 0.1.18 executable **read-only** for unique palette delimiters to verify actual Windows embedded format, digest, length and executable digest before claiming Windows coverage. Record a CRLF original separately if verified; never normalize arbitrary target bytes into permission.
2. Add `main-0.1.18.js` by retaining 0.1.18's manifest collection, `Mod` grouping, native argument checks, canonical deduplication, object/shorthand hotkey matching and explicit clone behavior, with existing Custom presentation and activation-only routing. Do not merely add the new stock hash while serving the old replacement: that would delete new native functionality.
3. Extend `src/integration/native-patches/palette/provenance.json`, registry `originals`/`mainByOriginal`, and `customization.json` mappings. Keep all 0.1.17/earlier originals and their replacement selectors. No host version allowlist change; native permission remains exact-byte provenance. Feedback untouched.
4. Extend `tests/palette-native-stock.test.mjs` and existing palette/frame VM regressions: real 0.1.18 native source as fixture, stock-vs-Custom catalog/dispatch, dark/light/layout themes, malformed/duplicate manifests, missing targets, object/index hotkeys, explicit clones, keyboard/virtual-list regressions, reset and old-owned-masks-update refresh, restore-to-current-original and unknown-byte skip without target/helper/opt-in mutation. Document source versus embedded proof and absent live UI proof in a focused 0.1.18 review note.
5. Check only the focused fixture commands/build before pushing; CI is the broad integration gate after the workflow's approval/implementation steps. No live apply, deploy, restart or opt-in. Restoration reaches the person only through their normal customization Update after maintainer merge.

## Suggested outcome checklist for that separate PR

- [ ] Reviewed 0.1.18 palette originals select a release-specific Custom replacement while retaining 0.1.17 restoration and exact-byte safety.
- [ ] The 0.1.18 Custom palette preserves native manifest commands, themes and dispatch alongside the existing Custom skin and safe routing.

Each outcome includes its tests and documentation; the separate PR needs its own matching OpenSpec tasks/metadata under the shared delivery workflow. This planning draft does not pre-tick any of them.

## Follow-on

The owned replacement stages `custom-palette`, persists and verifies the user binding, then retires this temporary native dependency safely. The stop-gap must not expand into #23's rejected fuzzy/structural approach. If obtaining trustworthy Windows evidence is blocked, report that blocker rather than applying unverified bytes.

#27 activation can independently improve future migration lead time, but requires an authorized hosted no-write probe and repository-variable activation. The exact steps and permission findings are in `design.md`; nothing was switched on by planning.
