# Proposal

## Why

Adding a folder named `.{name}` (for example `D:\Git\xrbuild\.xrbuild`) in Settings > Plugins > Crew > Projects fails with "Crew already uses the project name xrbuild" when `{name}` exists, because the page strips the leading dot when it derives the project name. Crew now accepts a name that starts with one dot followed by a lowercase letter or digit (timurproko/crew pull request 18).

## What Changes

- `PROJECT_NAME` accepts one leading dot, so listed registrations such as `.xrbuild` are no longer dropped.
- `projectName` keeps one leading dot when the folder's last segment starts with `.`, normalises the rest as today, keeps the whole name within 40 characters and validates it; naming guidance mentions the dot.
- An older Crew that refuses the name gives the existing "update the Crew tool" message after a single request, with no retry without the dot.
- Before adding, the page sends nothing when the folder is already registered under another name and shows that it is already added; Crew would otherwise register one folder twice, and a re-add drops its workflow setting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Crew project names preserve one leading dot; add a requirement that a folder registers once.

## Impact

`src/plugins/crew/plugin.js`, `src/plugins/crew/plugin.test.mjs`, `docs/PLUGIN-UI.md`. No Crew registration on any machine is changed; existing registrations such as `xrbuild-private` keep working.
