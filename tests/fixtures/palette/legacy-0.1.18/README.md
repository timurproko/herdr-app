# Legacy Custom palette openers and startup worker

Byte-faithful snapshots from this repository's merged #65 commit
`87a91b0e1863f1f1aa83c61112b514750cc53899`:

| Fixture | Source | SHA-256 |
|---|---|---|
| `chrome.js` | `src/features/workspace-chrome/main.js` | `3295bb7e41aae5d74fb183356d588cac3a83a90c2979d36ca983d01bef80f465` |
| `status.js` | `src/features/workspace-status/main.js` | `fea79bee121f0ffffbb04653f2aaa66c12d6ff417d664cd14667dc46c2b21f06` |
| `startup-frames.mjs` | `tools/runtime/startup-frames.mjs` | `b89d27a9d83a807abcd996b26059020d01b53c9c0c41b0964dc93bb0055cfd8a` |

The migration rollback fixture uses these real legacy entrypoints/worker and the
actual reviewed native 0.1.18 patch/originals. Unrelated/shared package files come
from the current build; it is not represented as a bit-faithful archive of the
entire old distribution. No native app or running session is used.
