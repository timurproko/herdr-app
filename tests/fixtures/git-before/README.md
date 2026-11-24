# Frozen request-budget baseline

Exact source blobs from `386fcc4` (main after PR 55), retained so shallow/offline
CI checkouts can execute the real before controller without fetching history.
Not shipped, not an alternative implementation; only the request-budget fixture
loads these under the ordinary packaged module aliases.

| Original module | Git blob |
|---|---|
| aggregate.js | 3de82ad91ca7cfb1800e2c7bd8b294462a4889cc |
| pulls.js | d4aaa777f74cb57e1caa5d49fba0fe44710f7533 |
| webhooks.js | c2128ba34cfad7c2e6d3186d742466e85f27a697 |
