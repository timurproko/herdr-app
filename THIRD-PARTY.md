# Third-party notices

The project's own contributions are MIT (LICENSE). This does not relicense third-party work or grant trademark rights. `docs/ASSET-PROVENANCE.json` records all 89 SVG paths outside the separately attributed file-icon collection and the five Herdr-derived JavaScript files.

## Original artwork with unrecorded source

**41 SVGs are kept as in the original project, source not recorded**, including the three color gradients and the Codex/Copilot/Claude provider marks. Their raw source and LF-normalized hashes are recorded. No author, upstream source, license or brand permission is inferred. The maintainer directed retaining these original bytes; this is not a new provenance finding. The earlier provisional Lucide replacements and neutral provider glyphs are not in the final tree.

## Herdr App — Apache-2.0

Copyright Herdr App contributors. Source: https://github.com/herdrdev/herdr-app

Reviewed public reference: v0.1.16, commit `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`. Full text: `LICENSES/Apache-2.0.txt`.

Five files under `src/integration/native-patches/` are copied/adapted or derived work:

- `palette/original-0.1.13.js`: v0.1.13 stock palette; native `herdr` import adapted to the local facade.
- `palette/original.js`: v0.1.14 review-era stock, also matching v0.1.15/v0.1.16 after import reversal and newline normalization.
- `palette/main.js`: modified Herdr palette adding Custom UI, routing and scrolling.
- `feedback/original.js`: stock feedback matching v0.1.13–v0.1.16 after import reversal/newline normalization; initial copy version is indistinguishable.
- `feedback/main.js`: modified Herdr feedback with Custom styling, drafts and attachments.

These are prominent modification records for the retained files. Stock snapshots are not claimed raw-byte-identical: they already have facade-import adaptations. Their original project bytes are preserved for compatibility recognition; no new headers are inserted. The manifest records each relationship and source URL. No native binaries, Rust libraries or fonts are redistributed here.

Subsequent byte-faithful frame reviews supersede the historical import-adaptation
statement above for canonical originals: `palette/provenance.json` and
`feedback/provenance.json` record the exact native-import stock snapshots and
newline formats. Palette `main-0.1.17.js` and `main-0.1.18.js` are additional
Apache-2.0-derived replacements with Custom UI/routing modifications. The latter
retains native 0.1.18 manifest catalog and dispatch behavior. Its LF original is
pinned to `9a9ae13d998e6ed74c76e8eb13bdeb2e1420f50c`; its Windows CRLF original was
independently verified against installed embedded bytes. See
`docs/HERDR-0.1.18-PALETTE-REVIEW.md`. No stock headers were inserted or stripped.

The manifest also records 37 LF-normalized exact SVG matches to Herdr v0.1.16, four settings derivatives with changed presentation attributes, and a mirrored sidebar derivative. Preserve applicable Herdr Apache and Lucide/Feather layers; presence in Herdr does not license the 41 unknown-source assets.

## Lucide / Feather

Lucide: https://github.com/lucide-icons/lucide (ISC).
Feather: https://github.com/feathericons/feather (MIT).

28 original SVGs explicitly retain Lucide markers, overlapping the Herdr matches. Exact original download versions are unrecorded. `LICENSES/Herdr-Lucide.txt` reproduces the complete relevant notice from Herdr v0.1.16, including Copyright (c) 2026 Lucide Icons and Contributors, the Feather-derived icon list, and Copyright (c) 2013-present Cole Bemis with the full MIT grant. The applicable Lucide/Feather portion of Herdr's THIRD-PARTY-NOTICES is reproduced by that complete text; unrelated native library/font notices do not apply to components not distributed here.

`LICENSES/Feather-MIT.txt` additionally preserves the complete Feather v4.29.2 MIT text, Copyright (c) 2013-2023 Cole Bemis, from commit `1b002399e8758fb2bccea4d07312dc9e0f43dcb8`. This is a license-text reference, not an invented icon download version. No replacement-icon dependency or fetching step is added to the build.

## Material Icon Theme / Paseo

The separate file-icon collection retains these original notices and existing plugin packaging unchanged:

- `src/plugins/files/mod/icons/NOTICE.txt`
- `src/plugins/files/mod/icons/LICENSE-MATERIAL.txt`
- `src/plugins/files/mod/icons/LICENSE-REFERENCE.txt`

Those notices do not establish provenance for neighboring SVGs.

These notices and license texts accompany the source distribution. Preserve them, the modification records and applicable existing notices when redistributing assembled customization packages. The original build/deploy behavior is retained; this repository split does not add a new runtime notice-injection mechanism.
