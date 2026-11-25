# Design

## Context

See proposal.md for motivation. `crewProject` currently throws the last 300 characters of stderr/stdout. Settings' `folderRefusal` adds another operation sentence and a plugin attribution. Both the folder picker and row Remove use that wrapper. The read-only reference `D:/Git/crew/crew.mjs` confirms usage, non-repository, `already points at`, home-owner, unknown-project, unfinished-task and pending-copy refusals.

## Goals / Non-Goals

**Goals:** Change produced text only, with one formatter for mapped Crew refusal explanations and focused end-to-end composition coverage.

**Non-Goals:** No changes to `pluginFixError`, machine-switch lifecycle, Crew requirement status, names, commands, retries, list authority or diagnostics storage policy. Do not add a log just for this fix.

## Decisions

- Normalize an optional `crew:` prefix before classification; match full raw output before truncation rather than applying the current tail helper. Prefer stderr when nonempty, otherwise stdout; transport exceptions use the same fallback sanitization.
- Keep Crew-specific classification in the plugin. Let generic folder-error composition accept a plugin-provided human-readable explanation without prepending a second raw-output sentence. Apply equally to picker Add, untick Remove and row Remove, without changing error storage or clearing.
- Reuse machine-scoped observed probe evidence for known-outdated wording without changing the requirement check's status contract or adding network checks during a mutation. An unknown update state uses the brief's generic name-rejection sentence; usage alone does not prove an outdated install. Local-machine wording uses `this computer`.
- Follow the brief's exact two short sentence templates for usage/fallback despite its introductory request for one sentence; other recognized causes use one actionable sentence. Preserve dotted names and paths, rather than treating their periods as sentence boundaries.
- Proposed other mappings: `Could not add {folder}: it is not a git repository; choose a git repository folder.` / `Could not add {folder}: the folder does not exist; choose an existing git repository folder.` / `Could not add {folder}: Crew already uses the project name {name}; choose a folder with a different name.` / `Could not add {folder}: it is already registered with Crew; use the existing project.` / `Could not add {folder}: another session owns the Crew home; change its projects from that session.` Remove uses the corresponding operation and target; unknown-project, unfinished-task and pending-copy refusals get concise guidance rather than task inventories.
- Unknown failures retain only the first nonempty line's first sentence, suppressing any usage suffix/block and control/newline characters. Existing diagnostics may retain full raw results, but no tooltip or section detail may expose them.

## Risks / Trade-offs

- CLI refusal wording can evolve → match the actual cmdProject phrases and retain a safe, bounded unknown fallback.
- Generic renderer changes could affect other plugins → keep current behavior as the default and test another plugin's unchanged errors.
- Separate tasks touch adjacent code → constrain the diff to text production, no `pluginFixError` or machine-switch edits and no requirement-status changes.
- Hosted suites normally skip drafts → after implementation, request the existing hosted test workflow on the exact final head if supported; report any unavailable required checks rather than claiming success or manually marking ready.
