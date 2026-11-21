# Design

## Context

This is a repository split, not a refactoring. The source has 550 tracked customization files; the destination has a shared scaffold and no app implementation. The initial broader public-readiness implementation was superseded by the maintainer's explicit reduced scope. Public history already contains the provisional glyph commits, so undo them with follow-up commits rather than rewrite pushed history.

## Goals / Non-Goals

**Goals:** preserve original behavior and source bytes except the three approved content changes and minimal root/CI adaptations; keep truthful notices and unknown-artwork records; run supported unmodified suites on hosted runners.

**Non-Goals:** no tool/test splitting, portability fixes, wider owner/machine anonymization, new test isolation framework, new runtime packaging architecture, relay hardening, private dotfiles edits or live deployment.

## Decisions

### Tracked snapshot and scaffold

Re-enumerate tracked paths with home as cwd and `yadm ls-files -- .config/herdr-app/customizations`. Compare to the local planning inventory, then copy current regular files without source history. Never open/copy the personal snapshot. Restore imported files previously genericized or refactored to the original tracked bytes. Preserve root scaffold files; merge scripts and ignores rather than replace them. Keep Node 20+, MIT and repository package identity.

Only approved content edits are:

1. Exclude `preferences/pc.json`; add a made-up example only if the unmodified tooling actually fails without it.
2. Give `tools/runtime/ssh-clipboard-smoke.ps1` an explicit remote-machine parameter before effects.
3. Neutral account labels/comment in `tests/status-reveal.test.mjs`, preserving the scenario.

Root-path exceptions are narrow: old project AGENTS guidance moves to docs while shared AGENTS/CLAUDE stay unchanged; the architecture test follows that moved document. README ownership/install paths refer to the selected Herdr home rather than checkout parent. Existing shell/yadm information remains, marked optional where external wiring is not provided. Do not rewrite the feature guide, fixture repository names, operational narratives or diagnostic tools.

### Artwork and attribution

Restore all 41 original SVGs, byte-for-byte from the tracked source (Git's existing checkout LF normalization still applies in the repository). Record their exact raw and LF-normalized hashes and the status "kept as in the original project, source not recorded". No inferred license or author is attached. All 35 provisional replacements and three neutral provider substitutions are removed from the final tree; gradients are restored by the maintainer's instruction, not represented as newly proven original artwork.

Keep provenance for the other 48 SVGs: 37 LF-normalized exact Herdr v0.1.16 matches, four geometry-preserving settings derivatives, one mirrored sidebar derivative and six additional explicitly Lucide-marked assets. Keep applicable Lucide/Feather layers where evidenced, with honest unknown download versions. Keep Material/Paseo notices unchanged.

Keep the five native-derived file records with the audit's precise version relationships and modification notes. Retained originals have the existing facade-import adaptation; do not add headers that break compatibility recognition. Root THIRD-PARTY.md, LICENSES texts and docs/ASSET-PROVENANCE.json accompany source distribution; do not refactor build/deploy solely to inject new files.

### CI subset, not rewritten suites

Keep tools/test.mjs and imported tests unchanged except the small architecture-document path adaptation and neutral labels. Add a minimal CI entrypoint that builds in this checkout, selects existing packaged/source/plugin tests and invokes each with its existing VM flags. Preserve test discovery visibility and print exclusions/reasons. Set a disposable HERDR_APP_HOME and unavailable HERDR_APP_BIN for CI child processes; no real installation is needed.

Exclude the complete directory regression because it requires installed hc schema plus the user's .bashrc. Exclude directory-loader on Ubuntu because its unmodified code requires Windows Git Bash/cygpath. Exclude the optional actual A1-candidate body because it needs a separately built external checkout. Keep the installed-host integration entrypoint and native/live feature scripts out of CI. Any other unmodified suite that actually cannot run on a runner is excluded with the concrete failure reason, not weakened or rewritten.

The existing Windows/Ubuntu Node 20 matrix runs this supported subset. Readiness, OpenSpec, Delivery workflow, read-only CI permissions and `CI required` remain. Local checks are targeted and audited first; do not run the unchanged broad unit command on the workstation because it includes installed-host reads and Windows recycling. No operational npm commands, live smoke tools or external service writes are authorized.

## Risks / Trade-offs

- Unknown artwork permission/source → explicitly retained by maintainer direction with no fabricated provenance; notices cover only what is established.
- Reduced hosted coverage → list whole-suite exclusions and exact reasons; preserve originals for optional separately authorized native/private-environment checks.
- OS/backend differences → use current CI results to distinguish unsupported unmodified tests from import/wiring defects; do not refactor around failures.
- Private snapshot omission → build and supported tests must work without it; add only a synthetic example if necessary.
- Historical validation/A1/shell claims → preserve the original information and distinguish unperformed live checks; standalone cloning does not install external wiring.

## Migration Plan

1. Restore original source/artwork and remove out-of-scope additions; retain the three content changes, truthful notices/manifest and minimal scaffold merge.
2. Make only required README/guidance/new-root path adjustments.
3. Run targeted checks, wire and exercise the hosted supported subset, record actual exclusions/failures and final-head results. Leave promotion/finalization to the bot; no native/live installation or merge.
