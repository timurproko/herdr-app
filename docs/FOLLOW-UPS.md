# Known limits and follow-ups

## Import hold

`src/features/settings/color-hue.svg`, `color-sv-value.svg` and `color-sv.svg` are
absent pending the maintainer's explicit original-authorship/MIT statement (or a
separately approved replacement). The build still requires them and must fail;
source import, documentation and CI preparation are not a complete runnable app.
The 35 Lucide replacements are a separate commit; provider marks provisionally
use neutral Lucide glyphs. ASSET-PROVENANCE.json is the per-file ledger.

## Deliberately later work

- Relocate private preference snapshots to the Herdr home. Current export/import location semantics are retained; host-specific snapshots are ignored, and public visuals remain here.
- Harden the webhook relay: pending unauthenticated sockets share the connection cap, request/body resource limits need tightening, token comparisons are not a constant-time proof, and unsigned delivery-ID/in-memory deduplication is not durable anti-replay protection. No live relay was probed or changed in this import.
- Remove the old customizations subtree from private dotfiles after independent installation is established. This repository does not edit that source.
- Set up a second/remote workstation independently, including its own credentials and optional companion/shell integration.

## Compatibility and reproducibility

General facade: reviewed App 0.1.13–0.1.16. Tab moves separately gate App
0.1.15/0.1.16 and Core 0.1.19/0.1.21 plus document shape/identity. Unknown versions
fail closed. No passing fixture grants permission to weaken those gates.

A1 protocol 1 is the source's integration contract, but a matching released minimum
has not been established for this export. Treat it as optional/pending rather than
ready on arbitrary installations. Do not restart immutable sessions or repair
labels to upgrade them. The account-switcher/helper and private profile wiring
are external optional prerequisites, not supplied here.

Crew can install npm dependencies at latest and follow its source main branch;
that operational setup is mutable, not a fully pinned release set. Explicit setup
can download/install tools, authenticate services or provision background workers.
Auto-fix stays off by default. Usage may read/refresh provider credential stores.

## Validation limits

Historical docs retain reviewed version evidence and prior observations, not new
standalone guarantees. In particular GIT-CORE-MONITOR.md records a historical
unrelated theme-selection integration assertion: it has not been revalidated or
claimed fixed. Native rendering, screenshots, interaction tests, live clipboard,
permissions/core actions, SSH and provider/relay operations were not run for this
import. See TESTING.md for exact host-free inclusion and opt-in exclusions.
