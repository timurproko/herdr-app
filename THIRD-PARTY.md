# Third-party notices

The project's own contributions are MIT (see LICENSE). This does not relicense upstream work or grant trademark rights. `docs/ASSET-PROVENANCE.json` identifies each of the 89 SVG paths outside the separately attributed file-icon collection and each of the five Herdr-derived JavaScript files. SHA-256 values normalize checkout CRLF to LF. Three color-gradient paths are recorded as **held-absent**: their bytes are not distributed, and the complete app cannot build until their permission is resolved.

## Herdr App — Apache-2.0

Copyright Herdr App contributors. Source: https://github.com/herdrdev/herdr-app

Reviewed public reference: v0.1.16, commit `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`. Full license: `LICENSES/Apache-2.0.txt`.

Five files under `src/integration/native-patches/` are copied/adapted or derived work:

- `palette/original-0.1.13.js`: v0.1.13 stock palette with native `herdr` import adapted to the local facade.
- `palette/original.js`: stock palette from the v0.1.14 review era; also matches v0.1.15/v0.1.16 after reversing the facade import and normalizing newlines.
- `palette/main.js`: modified palette, adding Custom UI, routing and scrolling.
- `feedback/original.js`: stock feedback matching v0.1.13–v0.1.16 after import reversal/newline normalization; initial copy version is not distinguishable.
- `feedback/main.js`: modified feedback UI with Custom styling, drafts and attachments.

The retained originals are not claimed raw-byte-identical: their facade imports were adapted. Their existing bytes are preserved for compatibility recognition; this prominent modification record accompanies the snapshots in distribution. The two customized main files also carry modification comments. No native Herdr/Core binaries, Rust libraries, fonts or installers are distributed here.

The manifest records 37 LF-normalized exact SVG matches to Herdr v0.1.16, four settings SVG derivatives with changed presentation attributes, and one mirrored sidebar derivative. These retain Herdr attribution and Apache-2.0 coverage; where Lucide/Feather applies, those notices remain applicable as well. Herdr's relevant upstream icon notice is reproduced in full in `LICENSES/Herdr-Lucide.txt`; unrelated native library/font notices are not applied to code/assets not distributed here.

## Lucide and Feather

Lucide: https://github.com/lucide-icons/lucide (ISC); Feather: https://github.com/feathericons/feather (MIT).

The 35 approved replacement glyphs and three provisional neutral provider glyphs come from **Lucide 0.468.0**, commit `f12b0de177fbc2a6795e99be065887e72b237123`. The exact per-file URL, modifications and hash are in the manifest. Runtime filenames differ from catalog slugs; folder-filled additionally uses currentColor fill. The neutral bot/bot-message-square/sparkles glyphs are not OpenAI, Copilot or Claude logos. Text labels retain provider identity without asserting logo permission.

The imported tree also has explicitly Lucide-marked icons; their original download versions are unrecorded, not invented. The bundled texts cover these and Lucide/Feather layers in Herdr-derived assets:

- `LICENSES/Lucide-ISC.txt`: unmodified notice from the pinned Lucide release (Cole Bemis 2013–2022 / Lucide Contributors 2022).
- `LICENSES/Feather-MIT.txt`: complete Feather MIT text, Cole Bemis 2013–2023, from v4.29.2 commit `1b002399e8758fb2bccea4d07312dc9e0f43dcb8`.
- `LICENSES/Herdr-Lucide.txt`: complete upstream Herdr v0.1.16 icon notice, including Lucide Icons and Contributors 2026, its Feather-derived icon list and Cole Bemis 2013–present MIT grant.

## File icons

The separate Material Icon Theme/Paseo adaptation collection retains these original files without alteration, also copied by plugin packaging:

- `src/plugins/files/mod/icons/NOTICE.txt`
- `src/plugins/files/mod/icons/LICENSE-MATERIAL.txt`
- `src/plugins/files/mod/icons/LICENSE-REFERENCE.txt`

Those notices do not establish provenance for neighboring SVGs. Other referenced project names and dependency URLs remain functional identifiers or truthful attribution, not the runtime brand of this project.

## Distribution

Each generated feature mod includes `NOTICE.txt` and the applicable complete license texts. The generated `licenses/` directory contains the same general notice, texts and per-file provenance, installed under `.customizations/runtime/licenses/` for native patches, layout/shared artwork and standalone workers. Installation preserves the normal ownership/conflict boundaries for those paths. Pending gradients are never silently removed from the build manifest to claim a complete distribution.
