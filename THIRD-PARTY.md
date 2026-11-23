# Third-party notices

The project's own contributions are MIT (LICENSE). This does not relicense third-party work or grant trademark rights. `docs/ASSET-PROVENANCE.json` records all 89 SVG paths outside the separately attributed file-icon collection and the retained Herdr-derived JavaScript files.

## Original artwork with unrecorded source

**41 SVGs are kept as in the original project, source not recorded**, including the three color gradients and the Codex/Copilot/Claude provider marks. Their raw source and LF-normalized hashes are recorded. No author, upstream source, license or brand permission is inferred. The maintainer directed retaining these original bytes; this is not a new provenance finding. The earlier provisional Lucide replacements and neutral provider glyphs are not in the final tree.

## Herdr App — Apache-2.0

Copyright Herdr App contributors. Source: https://github.com/herdrdev/herdr-app

Reviewed public reference: v0.1.16, commit `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`. Full text: `LICENSES/Apache-2.0.txt`.

Retained source/evidence:

- `src/integration/native-patches/palette/ui.js`: Herdr-derived Custom palette presentation/lifecycle and routing integration; native catalog and controllers are no longer copied here.
- `src/integration/native-patches/feedback/ui.js`: Herdr-derived Custom feedback presentation, drafts, viewer and attachment integration; native pick/send controllers are retained by structural transformation.
- `tests/fixtures/native-stock/{0.1.16,0.1.17}/{palette,feedback}.js`: four byte-faithful upstream LF stock fixtures. Pinned commits, paths and SHA-256 digests are in their `provenance.json`. 0.1.17 is commit `a751b75b0418bf13950f7627d122bb934ac2c46c`.

These are prominent modification records. Former facade-adapted snapshots and full replacements were removed; generated regression previews derive from current raw fixtures and the transform. Fixtures are not runtime allowlists. No headers are inserted into raw stock. No native binaries, Rust libraries or fonts are redistributed here.

The manifest also records 37 LF-normalized exact SVG matches to Herdr v0.1.16, four settings derivatives with changed presentation attributes, and a mirrored sidebar derivative. Preserve applicable Herdr Apache and Lucide/Feather layers; presence in Herdr does not license the 41 unknown-source assets.

## Acorn — MIT

Acorn 8.15.0 (`tools/vendor/acorn/acorn.mjs`) is distributed verbatim from its npm
package, with the complete copyright/license at `tools/vendor/acorn/LICENSE`.
Source: https://github.com/acornjs/acorn. Both accompany the offline runtime parser.

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
