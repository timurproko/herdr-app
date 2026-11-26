# Proposal

## Why

Agents cannot inspect screenshots attached to permitted Trello cards, and the current Settings card makes successful account setup look unfinished. This cumulative follow-up adds bounded attachment reads and addresses all nine annotated Settings states without weakening machine-local authority.

## What Changes

- Part A: expose attachment metadata and card-detail attachment counts/IDs; add read-only `attachments list` and `attachments get --out` with optional preview width, protected local output, a 20 MiB binary limit, image-only defaults and explicit other-type opt-in.
- Send download/preview credentials only in an OAuth Authorization header to exact approved Trello HTTPS hosts; never fetch external link attachments or follow redirects. Add no attachment upload/delete operations.
- Part B: use Add, Save and Saving; show one saved-account name row with Ready and hover Remove; treat a valid account with zero boards as ready; improve the description while keeping the API key/token link; reuse the existing lightweight tab treatment and omit empty-list dividers.
- Replace repeated unsupported-machine errors and misleading fix counts with one actionable explanation. Recommend retaining the elevated-login refusal and the existing safe direct-SSH setup path, not adding credential import in this change; options and rationale are in design.md.
- Cover behavior with fake-provider/server and UI fixtures, updated offline help and owner docs, and before/after disposable native screenshots at implementation handoff.

## Capabilities

### New Capabilities

None; attachment reads belong to the existing Trello access boundary.

### Modified Capabilities

- `trello-agent-access`: bounded attachment metadata/downloads, credential destination rules, account readiness/copy, picker presentation and unsupported-host guidance.

## Impact

Primary implementation areas are `src/plugins/trello/`, `src/features/settings/plugins-ui.js`, `src/ui/settings-kit.js`, the Trello fixtures, and Trello/plugin UI documentation. Shared UI additions remain generic and opt-in where needed. No native changes, real-account test traffic, deployment, SSH reconfiguration or live credential transfer is authorized by this plan.

## Collision check and delivery shape

Checked open PRs and recent Trello/Settings branches before planning. Open PRs are #86 (update recovery), #87 (Git review-flow chips), and #88 (connected Spaces/Git polish); none edits Trello or the plugin renderer/Settings kit. Do not edit `src/services/updates/`, `tools/deploy-all.mjs` or `src/plugins/git/`. Shared README/testing documentation and the broad plugin-integrations spec are concurrent hotspots; use only the Trello spec and narrowly scoped documentation edits.

The pc2-era Trello branches `feature/trello-plugin`, `feature/trello-settings-setup`, and `feature/trello-card-improvements` correspond to merged PRs #80, #81 and #83. Their PR bodies, branch tips and affected paths were inspected. Current base `5b62e79` already includes #83, with no Trello/renderer/kit content difference from its branch tip. Preserve its strict SSH identity binding, global Access receipts, private names and protected-store fixes rather than reimplementing them. Recheck collisions before implementation because later work can arrive.

Deliver **one PR**, not two: this task is cumulative and the shared delivery workflow uses one task/one PR. Keep A (metadata, then downloads/help) and B (card polish, then machine guidance) as four separately ticked outcomes. Two PRs would separate release risk but add duplicate planning/handoff and are not recommended here.

The requested Bugs card was read through the installed plugin. Its description, comments and checklists are empty; no additional text requirements were found. The current CLI cannot expose its attachments, so the nine supplied local screenshots are the inspected visual source. Do not publish personal board/card identifiers or unredacted supplied screenshots in this public repository.
