# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Success, pending, failure and unknown checks share the offset; neutral and skipped checks retain their normalized success presentation.
- Untouched task checklists, partial-progress rings and completed task checks share the same one-logical-pixel downward offset.
- Ordinary, pinned, scrolling, coordinator and ghost rows retain horizontal geometry, text anchors, separator positions and fixed line and block heights at supported zooms including 130%.
- Fully visible row text has no repeat-only tooltip; compact or clipped items retain full values and informative timestamps, check names and agent identity remain available.
- Truncated titles and repository or panel headers expose a complete U+2026 glyph inside their fixed line boxes at 100% and 130% zoom.
- Combined byline, metadata, label-strip and whole-row hover targets do not repeat complete visible values; surviving strip tooltips expose hidden or omitted values only.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "git-row-informative-tooltips",
  "sourcePr": 61,
  "archive": "openspec/changes/archive/2026-11-24-git-row-informative-tooltips/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-git-row-informative-tooltips/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "4e2e1486c6fd01ca4c80a1879b9cbb8883e7568e",
  "acceptanceScenarios": [
    "Success, pending, failure and unknown checks share the offset; neutral and skipped checks retain their normalized success presentation.",
    "Untouched task checklists, partial-progress rings and completed task checks share the same one-logical-pixel downward offset.",
    "Ordinary, pinned, scrolling, coordinator and ghost rows retain horizontal geometry, text anchors, separator positions and fixed line and block heights at supported zooms including 130%.",
    "Fully visible row text has no repeat-only tooltip; compact or clipped items retain full values and informative timestamps, check names and agent identity remain available.",
    "Truncated titles and repository or panel headers expose a complete U+2026 glyph inside their fixed line boxes at 100% and 130% zoom.",
    "Combined byline, metadata, label-strip and whole-row hover targets do not repeat complete visible values; surviving strip tooltips expose hidden or omitted values only."
  ],
  "archiveDigest": "52b5ad35366b6bac4503aeb417e07719583f88f2fe48b684bc95da20ba177c3e",
  "specDigest": "8b8e5c8e85c6fcf97c7046decf488ff2c117a7daf4c200b0295d1d049a285325",
  "tasksDigest": "74d636225b4d450a40a32089da0199acfb3c25e68ce6d83c62a4bcc4dbad4a98",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
