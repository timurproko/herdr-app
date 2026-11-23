# Native frame evidence

Byte-faithful LF sources from the pinned `herdrdev/herdr-app` commits and paths in
`provenance.json`, fetched read-only through GitHub. These files are test data, not
runtime permission or executable patch payloads. The installed Windows 0.1.17
executable embeds the same sources with CRLF; tests exercise both encodings.
Feedback is identical between these releases. Palette adds dynamic theme choices.

Upstream Herdr source is Apache-2.0 licensed; see `LICENSES/Apache-2.0.txt`
and `THIRD-PARTY.md`. The project's own MIT license does not relicense it. No personal installed file or local ownership record is included.
The parser in `tools/vendor/acorn/` is Acorn 8.15.0, MIT, distributed verbatim with
its own license. It is packaged offline, not installed or fetched at runtime.
