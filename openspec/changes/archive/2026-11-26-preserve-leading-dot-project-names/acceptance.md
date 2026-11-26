# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Adding D:/Git/xrbuild/.xrbuild while xrbuild is listed requests exactly project add .xrbuild, distinct from xrbuild.
- Crew registrations named with one leading dot, such as .xrbuild, are listed and removed by their exact name.
- Derived names keep one leading dot, stay within 40 characters and reject a lone dot, double dots and a dot before a dash.
- An older Crew refusing a dotted name gives the update-the-Crew-tool message after one request, with no retry.
- Adding a folder that Crew already lists under any name sends nothing and says it is already added under that name.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "preserve-leading-dot-project-names",
  "sourcePr": 82,
  "archive": "openspec/changes/archive/2026-11-26-preserve-leading-dot-project-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-preserve-leading-dot-project-names/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "d6ec6d4e03b44479da1145d2ccd8722e9efa66ed",
  "acceptanceScenarios": [
    "Adding D:/Git/xrbuild/.xrbuild while xrbuild is listed requests exactly project add .xrbuild, distinct from xrbuild.",
    "Crew registrations named with one leading dot, such as .xrbuild, are listed and removed by their exact name.",
    "Derived names keep one leading dot, stay within 40 characters and reject a lone dot, double dots and a dot before a dash.",
    "An older Crew refusing a dotted name gives the update-the-Crew-tool message after one request, with no retry.",
    "Adding a folder that Crew already lists under any name sends nothing and says it is already added under that name."
  ],
  "archiveDigest": "f234314bf25801b11cb3abf6a78bcfc1c352bf09abb9cd1c88055090f95bf1b1",
  "specDigest": "7f16289a7d3d111e28aa8fb37bfabf06c1065cc7781e68a4dedbe3530f4e9181",
  "tasksDigest": "67eb5eaa7d020c2288ea4efaa6cfb3dd543a96d082954d38cbed27ccd265a33f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
