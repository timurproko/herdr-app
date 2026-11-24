# Herdr 0.1.18 palette stop-gap review

This is a temporary, release-specific rebase of the existing opted-in native
palette exception, not the persistent owned palette from PR 64. Feedback, the
0.1.17 palette payload and the capability-based public host gate are unchanged.

## Exact source and installed Windows evidence

Upstream: `herdrdev/herdr-app`, pinned commit
`9a9ae13d998e6ed74c76e8eb13bdeb2e1420f50c`,
`defaults/frame/palette/main.js`. The GitHub contents API was decoded from base64:

| Original | Format | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `original-0.1.18.js` | LF | 19,238 | `f8cbfb955ab3ef4474012dbb7103a7b8c5260c9c6ccde96aea6952a4980124dc` |
| `original-0.1.18-windows.js` | CRLF | 19,670 | `885bf88b82d43324fd29031eebc1427ee32a7329530fcd7c7039ebcfa883e06a` |

Both are raw originals with native imports. The Windows original was extracted
read-only from the installed executable, not inferred solely by normalization.
Its complete uniquely delimited palette slice equals the LF source rendered with
CRLF and the installed `~/.config/herdr-app/frame/palette/main.js` byte-for-byte.

Installed `C:/Users/tprokopiev/AppData/Local/Programs/herdr-app/herdr-app.exe`
reports FileVersion and ProductVersion **0.1.18**. Executable SHA-256:
`cfea987a8ccffa77fa4e4d463f9a9f13354510eb4e907ca818b5886613e1406c`.
The unique `palette/main.js` delimiter is at byte 43,604,187; palette bytes start
at **43,604,202** and end before unique `palette/mod.json` at **43,623,872**
(zero-based, end exclusive). These assertions were repeated during implementation.

These two known formats authorize only exact matches. There is no arbitrary
newline normalization, structural matching, native version allowlist or blind
patching. Existing original selection, unknown/ambiguous-byte advisories,
ownership conflicts and current-original recovery remain in force. A capable
newer host still passes the separate public capability gate; that does not grant
permission to patch unknown palette bytes.

## Release-specific rebase

`main-0.1.18.js` combines the native 0.1.18 catalog with the retained Custom
renderer. Native additions retained: asynchronous sorted non-hidden mod-manifest
palette discovery, Mod grouping, native argument/target validation, canonical
argument IDs and deduplication, object and index/first-argument hotkey matching,
and explicit `mod.clone`/`layout.clone` source preservation. Native dynamic theme
discovery and light/dark/active-layout filtering are retained.

Custom retains live theme and selection tint, shared dialog/search/clear/empty
presentation, fixed 408px surface and 57px search header, pinned group/result-count
heading, passive bottom overflow fade, native variable-height list and scrollbar,
search/clear resets and bounded keyboard navigation. Usage follows its existing
enabled-by-default `custom.plugins.usage.enabled` preference in this new variant.

Entry IDs, Recent history and displayed shortcuts stay native. Only activation
routes Settings/picker/machine/worktree opens to Custom counterparts and
untargeted rename/close to mounted Custom Tabs handlers (including native fallback
and last-tab policies). Explicit rename/close arguments remain native and unchanged.
Other layouts keep native presentation and dispatch.

## Tests and delivery boundaries

The real-stock fixture checks raw provenance/build parity, per-original selection,
absent opt-ins, idempotence, reset/old-owned-mask upgrades, previous backups,
restore-to-current-original and byte-preserving unknown/ambiguous skips for both
0.1.17 and 0.1.18. Differential native catalog/dispatch and VM UI checks belong to
the same rebase; fixture success is not live GPUI pixel, focus or interaction proof.

No installed app/configuration writes, deployment, restart, new opt-in or terminal
interaction were performed. The person receives the patch only through their
ordinary customization **Update** after maintainer merge. Only prior opt-ins
refresh; no one must manually re-enable a patch to make a known original eligible.

Retirement stays clean: the only new production payload is in the existing palette
exception directory plus declarative package/registry entries. There are no new
installer hooks, keybindings, workers or ownership schemas. The later owned palette
must retire the exception through guarded current-original restoration, never
restore 0.1.17 stock over 0.1.18, and leave unknown/personal native bytes untouched.
