# Design

## Context

See proposal.md for motivation. `src/plugins/crew/plugin.js` derives folder names, filters tab-separated CLI rows and dispatches quoted `crew project` calls. Its shared `PROJECT_NAME` currently excludes dots; the existing test expects `Unity_Project.2` to become `unity-project-2`.

`src/features/settings/plugins-ui.js` owns generic list sections. `foldersAdd()` currently joins failures as `folder: refusal`, while `runListAction()` surfaces the resulting section error. `tests/crew-projects-ui.test.mjs` exercises that exact formatting and partial-batch behavior. `docs/PLUGIN-UI.md` forbids plugin-specific renderer branches, so error attribution must use declaration metadata rather than hard-coded Crew wording.

## Goals / Non-Goals

**Goals:** Keep one name policy for derivation and row filtering; preserve exact IDs for removal; keep Crew authoritative and error origins explicit across generic folder-list interactions.

**Non-Goals:** No change to Crew itself, no version negotiation, no renamed existing registrations, no retry under a different name, no install/update/deploy, no live Crew home writes during tests.

## Decisions

1. **Share the dotted policy between generation and parsing.** Extend `PROJECT_NAME` to accept only the policy in the delta spec. Retain folder-basename extraction, lowercase conversion and the 40-character cap. Replace unsupported runs with dashes, trim disallowed leading punctuation, normalize repeated dots into a single safe separator, and strip trailing dots/dashes after truncation. A wholly unusable basename remains an explicit local validation error. This preserves established dash-only behavior while allowing `agentnumberone.dev` and `Unity_Project.2` to retain their dots. Reject malformed listed names rather than silently rewriting their IDs. An alternative of replacing every dot with a dash perpetuates the reported bug; accepting arbitrary punctuation would exceed Crew's contract.

2. **Keep CLI authority unchanged.** `parseProjects()` retains valid dotted names verbatim as row IDs; add/remove still call only the installed Crew CLI on the captured machine. An older Crew's rejection is surfaced unchanged in substance; there is no probe, silent downgrade, auto-update or direct registry write. Include mocked acceptance and refusal cases, stderr/stdout fallback and home-ownership refusals.

3. **Separate failed operation context from the plugin's message.** In the shared folder-picker batch handler, replace bare `folder: refusal` output with an explicit operation followed by attribution, for example `Could not add folder “D:\\Git\\site.dev”. Crew reported: Read-only: this home is owned by terminal t9...`. Use `plugin.name` rather than a Crew ID branch; removal failures carry their own operation context too. Keep the existing error channel, bounded display and refresh path, and continue trying remaining changes. This avoids inventing an app-level diagnosis or discarding folder context. Update the shared UI documentation and renderer fixtures for both refusal sources and partial batches.

## Risks / Trade-offs

- Older Crew cannot register dotted names until its upstream support is available → Display its actual refusal; do not claim this app change upgrades Crew.
- Sanitization can collide with an existing name, as before → Leave duplicate-name decisions to Crew and display its explanation; do not overwrite registrations.
- Truncation can leave a dot at the boundary → Normalize again after the length cap and test dot-at-position-40 and all-punctuation basenames.
- Shared failure formatting affects other folder-list declarations → Use generic metadata and retain operation targets, per-item errors and batch refresh semantics; run the UI contract regression.
- Fixture checks do not prove native layout or upstream compatibility → Report that no deployment or real-home UI check occurred; any later native check requires separate authorization.

## Migration Plan

No stored-state migration is needed. Existing names are neither renamed nor rewritten. This task delivers source and fixture tests only, with deployment excluded. A later authorized installation can roll back through the normal guarded deployment workflow; no rollback is run here.
