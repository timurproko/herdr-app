# Image decisions — implementation approval and gradient hold

The audit identified **41 unresolved SVGs**, not 40 exactly. The coordinator approved the 35 R replacements in a clean separate commit and provisional neutral B replacements (`bot`, `bot-message-square`, `sparkles`). This is not a claim that the original vectors are Lucide. The three A gradients remain OUT of the branch pending the maintainer's permission and are added last; build-dependent validation stops if they are unavailable. Paths are relative to repository root.

**R — replace:** proposed default is a fresh copy of the named official Lucide SVG from one pinned release/commit, with complete ISC/Feather MIT notices and per-file source/hash records. Keep the existing filename to preserve runtime references; document any stroke, size, fill or orientation adaptation. Names below identify Lucide catalog slugs, not asserted provenance of the old file. A few are semantic equivalents rather than identical artwork.

**A — authorship hold:** retain only after an explicit maintainer statement that this is their own drawing and is licensed under this project's MIT license. These are functional color surfaces, not ordinary glyphs; replacing them with an icon would break the control. Without that statement, stop and agree a replacement plan before importing them.

**B — brand decision:** maintainers must choose a neutral licensed glyph (suggested below) or provide the actual SVG's source, applicable redistribution permission, attribution and any brand-use conditions. A product name does not establish a license. Do not publish a brand SVG while that decision is pending.

## Per-file table

| # | File | Proposal | Reason / decision needed |
|---|---|---|---|
| 1 | `src/features/workspace-chrome/more.svg` | R: `ellipsis` | Standard overflow action. |
| 2 | `src/features/workspace-chrome/spinner.svg` | R: `loader-circle` | Loading indicator; preserve animation hook. |
| 3 | `src/features/settings/arrow-down.svg` | R: `arrow-down` | Down/reorder action. |
| 4 | `src/features/settings/arrow-up.svg` | R: `arrow-up` | Up/reorder action. |
| 5 | `src/features/settings/color-hue.svg` | A: hold for authorship/MIT statement | Hue gradient surface; no matching Lucide control artwork. |
| 6 | `src/features/settings/color-sv-value.svg` | A: hold for authorship/MIT statement | Value-gradient surface; no matching Lucide control artwork. |
| 7 | `src/features/settings/color-sv.svg` | A: hold for authorship/MIT statement | Saturation/value gradient and mask; no matching Lucide control artwork. |
| 8 | `src/features/settings/grip.svg` | R: `grip-vertical` | Profile/list drag handle. |
| 9 | `src/features/settings/pencil.svg` | R: `pencil` | Edit action. |
| 10 | `src/features/settings/terminal.svg` | R: `terminal` | Terminal settings. |
| 11 | `src/plugins/git/mod/checklist.svg` | R: `list-checks` | CI/check list. |
| 12 | `src/plugins/git/mod/circle-check.svg` | R: `circle-check` | Successful check. |
| 13 | `src/plugins/git/mod/circle-play.svg` | R: `circle-play` | Workflow/run action. |
| 14 | `src/plugins/git/mod/code.svg` | R: `code` | Repository code link. |
| 15 | `src/plugins/git/mod/git-merge.svg` | R: `git-merge` | Merge state. |
| 16 | `src/plugins/git/mod/git-pull-request-closed.svg` | R: `git-pull-request-closed` | Closed pull request. |
| 17 | `src/plugins/git/mod/git-pull-request.svg` | R: `git-pull-request` | Open pull request. |
| 18 | `src/plugins/git/mod/info.svg` | R: `info` | Details/information. |
| 19 | `src/plugins/git/mod/merge-conflict.svg` | R: `git-compare-arrows` | Semantic conflict/divergence equivalent; keep conflict text/accessibility label. |
| 20 | `src/plugins/git/mod/repository.svg` | R: `folder-git-2` | Semantic repository equivalent, not a claim of exact visual matching. |
| 21 | `src/plugins/usage/mod/codex.svg` | B: maintainer decision; suggest `bot` | OpenAI-style provider mark; no verified SVG license. Neutral glyph must not imply a provider logo. |
| 22 | `src/plugins/usage/mod/copilot.svg` | B: maintainer decision; suggest `bot-message-square` | Copilot brand mark; no verified SVG license. Preserve provider text if replaced. |
| 23 | `src/features/pane/split-down.svg` | R: `rows-2` | Horizontal division / vertically stacked panes. |
| 24 | `src/features/pane/split-right.svg` | R: `columns-2` | Vertical division / side-by-side panes. |
| 25 | `src/features/pane/unzoom.svg` | R: `minimize-2` | Restore split-pane view. |
| 26 | `src/features/pane/zoom.svg` | R: `maximize-2` | Enlarge focused pane. |
| 27 | `src/appearance/layouts/custom.svg` | R: `panels-top-left` | Semantic Custom-layout marker, not a logo. |
| 28 | `src/features/menu/automatic.svg` | R: `wand-sparkles` | Automatic space-color choice. |
| 29 | `src/features/space-start/racing-flag.svg` | R: `flag-triangle-right` | Start-page marker; a neutral start flag rather than an unlicensed racing drawing. |
| 30 | `src/features/workspace-status/preview.svg` | R: `eye` | Read-screen preview action. |
| 31 | `src/plugins/files/mod/folder-filled.svg` | R: `folder`, adapted with currentColor fill | Preserve the tested empty-versus-nonempty distinction; record fill modification. |
| 32 | `src/plugins/files/mod/trash.svg` | R: `trash-2` | Recycle/delete action. |
| 33 | `src/shared/arrow-up-right.svg` | R: `arrow-up-right` | External/open direction. |
| 34 | `src/shared/claude.svg` | B: maintainer decision; suggest `sparkles` | Claude brand mark; source/redistribution permission unknown. Preserve provider text if replaced. |
| 35 | `src/shared/close.svg` | R: `x` | Close action. |
| 36 | `src/shared/copy.svg` | R: `copy` | Copy action. |
| 37 | `src/shared/cpu.svg` | R: `cpu` | Core/processor indicator. |
| 38 | `src/shared/gauge.svg` | R: `gauge` | Usage/quota indicator. |
| 39 | `src/shared/pin.svg` | R: `pin` | Pinned state/action; preserve existing pressed-state behavior. |
| 40 | `src/shared/plug.svg` | R: `plug` | Integration/plugin indicator. |
| 41 | `src/shared/server.svg` | R: `server` | Machine indicator; keep all packaged copies identical. |

**Totals:** 35 approved replacements, 3 authorship holds, 3 provisional neutral brand replacements. The maintainer may still choose to retain originals after declaring authorship; the R swap remains a clean separate commit. Approval does not supply gradient authorship or logo permissions. Do not import unresolved bytes into an early commit and delete them later: this is a public fresh-history export.

## Established assets — retain and attribute, do not silently relicense

The other **48** SVGs outside the file-icon collection have the evidence below. Implementation will record each path separately in a provenance manifest; this grouped list is the reviewed starting inventory.

- **25 exact LF-normalized Herdr v0.1.16 matches**, `src/features/workspace-chrome/`: `archive.svg`, `branch.svg`, `check.svg`, `chevron-left.svg`, `circle-check.svg`, `clock.svg`, `file-text.svg`, `files.svg`, `folder-plus.svg`, `git-branch.svg`, `git-compare.svg`, `layers.svg`, `minus.svg`, `monitor.svg`, `panel-left.svg`, `panel-right.svg`, `pin-off.svg`, `pin.svg`, `plus.svg`, `search.svg`, `sidebar.svg`, `square-pen.svg`, `square.svg`, `terminal.svg`, `x.svg`. Upstream location: `defaults/mods/workspace-chrome/<filename>`.
- **12 more exact matches**: settings `agent.svg` and `check.svg`; Git `changes.svg`; Usage `refresh.svg`; tabs `win-close.svg`, `win-max.svg`, `win-min.svg`, `win-restore.svg`; Files `file.svg`; shared `chevron-down.svg`, `chevron-right.svg`, `folder.svg`. Record exact upstream path/version from the audit comparison and recheck against the pinned public tag before assigning notices.
- **4 geometry-preserving Herdr derivatives**, settings `bell.svg`, `palette.svg`, `shield.svg`, `keyboard.svg`: presentation attributes differ; label them modified, not byte-identical.
- **1 mirrored derivative**, workspace-chrome `sidebar-right.svg`: derived from verified `sidebar.svg`; preserve the existing mirror assertion.
- **6 additional explicit Lucide-marked files**, settings `code.svg` (`code-xml`) and `puzzle.svg`; Usage `login.svg` (`log-in`); shared `chevron-up.svg`, `refresh.svg`, `settings.svg`. Exact download versions remain unrecorded; state that limit instead of inventing one.

There are 28 explicit Lucide markers across the whole 89-file inventory, overlapping the Herdr matches. Preserve complete Lucide/Feather notices as well as Herdr provenance where both apply. Existing Material Icon Theme and Paseo notices under `src/plugins/files/mod/icons/` remain unchanged and do not license neighboring artwork.
