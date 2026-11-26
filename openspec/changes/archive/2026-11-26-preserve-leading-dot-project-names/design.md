# Design

## Context

See proposal.md for motivation. Crew accepts one leading dot in a project name (timurproko/crew pull request 18), but Settings strips it when deriving a name from a folder and drops listed rows that start with a dot. Delivery finalization requires this artifact.

## Goals / Non-Goals

**Goals:** Derive `.name` from a `.name` folder, list and remove leading-dot registrations by their exact names, and never register one folder twice.

**Non-Goals:** Renaming existing registrations, a name field in the Add flow, passing workflow settings on add, or any retry under an alternative name.

## Decisions

- Match Crew's rule exactly: `/^(?=.{1,40}$)(?!.*\.\.)(?!.*\.$)\.?[a-z0-9][a-z0-9.-]*$/`. The 40-character limit counts the dot.
- `projectName` normalises the basename as before, then prefixes one dot when the basename starts with `.`, cuts to 40 characters and trims trailing dots and dashes, so `..x` and `.-x` both become `.x`.
- The already-added guard uses the rows of the last Projects check for that machine, compared by folder ignoring case, slash direction and a trailing separator. It adds no request, so an older Crew still sees exactly one `project add`. Remove updates those rows and a failed list clears them.

## Risks / Trade-offs

- A folder registered from the command line after the last list is not caught until the next refresh → Crew still registers it, as before this change; the picker's ticks normally prevent the case.
- An older Crew refuses dotted names → the existing update message after one request.

## Migration Plan

None. Existing names stay valid; `xrbuild-private` keeps working and can be moved to `.xrbuild` from the command line later.
