# Reviewed native frame patches: 0.1.16 and 0.1.17

This is a per-version source/byte review, not any-version compatibility or live UI
validation. It uses main's existing optional registry/repair engine, not PR 23's
structural transform implementation. No installed app file was modified and no
deployment or native UI operation was performed during this review.

## Evidence and originals

Upstream is `herdrdev/herdr-app`, paths `defaults/frame/{feedback,palette}/main.js`:

- v0.1.16 → `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`.
- v0.1.17 → `a751b75b0418bf13950f7627d122bb934ac2c46c`.
- Retained v0.1.13 palette → `93b097f6e29fcb2d90a30dea2f03ce4e5dee7981`.

The tags and pinned source blobs were obtained read-only through GitHub. Exact
source and embedded-format SHA-256 digests, byte lengths and provenance are in
`src/integration/native-patches/{feedback,palette}/provenance.json`. Originals
keep native `herdr` imports and bypass Git newline conversion. Custom replacement
code still imports the facade. LF source and Windows CRLF originals are explicit
separate snapshots; runtime matching never normalizes unknown bytes into permission.
The 0.1.16 Windows palette fixture uses the pinned source with the reviewed CRLF
embedding format; no installed 0.1.16 executable comparison is claimed.

The installed Windows 0.1.17 executable was read only. Its SHA-256 is
`75527414eb23a95c9f0a15e88a17996223f12cc9b18d0b87c4726cc64e6c1ac2`.
Unique embedded main.js/mod.json delimiters yielded:

- Feedback: offset 39654943, 6497 bytes, SHA-256 `cc8a38b49fea6e0bcfccddfc74e30d92c327f4fe67574fadee3e9f451d869659`.
- Palette: offset 39661812, 15674 bytes, SHA-256 `bd625652992f7a35b776d3e42d0ca269a234014780ad658570447dd84061098f`.

Both equal their pinned 0.1.17 source with CRLF newlines. Feedback's pinned LF
source is byte-identical in 0.1.16 and 0.1.17. Its earlier rejection was caused by
facade-rewritten canonical originals/format differences, not a new native form.
The full palette release diff only adds dynamic themes/settings, replaces the
four hardcoded themes, and filters choices by light/dark and active layout.

## What the person sees after installing

Only prior palette/feedback opt-ins refresh automatically. With Custom active on
reviewed 0.1.17, the styled command palette returns with fixed headings, scroll
fades, keyboard navigation, Usage, Custom Settings/pickers, inline rename and
last-tab-aware close. It also offers native dynamic theme choices matching the
current light/dark mode, excluding other layouts' themes while retaining the
active layout's matching theme. Theme commands keep native IDs and arguments.

Feedback refreshes with compact thumbnails, **+ Add image**, muted **Drag or add
images to attach them.** guidance, expandable JSON details, and the simplified
**Feedback sent** / **Thanks for helping us improve Herdr.** success presentation.
Native sending remains unchanged. Other layouts retain native presentation and
command routing. Reviewed 0.1.16 and legacy palette coverage remain supported.

## Safety and validation limits

Unknown future stock still skips only that patch, with a clear advisory, leaving
its entrypoint/helpers/opt-in/recovery bytes intact and unrelated deploy/startup/
updates successful. Owned hashes do not certify changed native stock. Personal
helper conflicts, corrupt records and concurrent writes remain failures. Updated
records keep prior raw originals as well as the current native restore baseline.
There is no new opt-in, version permission, binary patch or deployment step.

Disposable stock fixtures exercise raw digest/build parity, both releases,
masked/reset upgrades, recovery/no-op and unknown-byte safety. The actual native
and Custom catalogs are compared across dark/light and active layouts, including
non-hardcoded themes and dispatch. Both Custom palette variants run the native-list
VM regression. Feedback retains its existing simulated attachment/send/view tests.
These are source/fixture results, not proof of real GPUI pixels or interaction;
live inspection remains for a separately authorized installation.

`CI=true npm run test:ci` passed after integration with current main: 153 supported
Windows suite entries, 3 documented exclusions. Read-only before/after SHA-256
inventories also confirmed the installed executable, both frame trees and their
opt-in records were byte-for-byte unchanged. Both live read-only inspections now
resolve to reviewed originals; no apply/repair operation was run on the live home.
