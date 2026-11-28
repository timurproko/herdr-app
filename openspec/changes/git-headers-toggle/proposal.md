# Proposal

## Why

Git remembers individual repository folds, but moving between agents or spaces can still reveal expanded repositories when the person wants a consistently collapsed list. One persistent global disclosure choice makes that browsing preference available without repeatedly folding each section.

## What Changes

- Add one icon-only collapse-all/expand-all button at the far right of the existing Open/Closed strip in ordinary and coordinator Git, using the existing Herdr button treatment.
- Apply the chosen global default to all repository sections, including repositories encountered later, across agents, spaces and Open/Closed tabs on this client.
- Keep individual chevrons as persistent per-repository exceptions. A bulk toggle flips the global default and clears all exceptions, including remembered repositories not currently visible; the icon reflects the global default, not a mixed-state aggregate.
- Preserve the current saved folded-repository set on upgrade as exceptions to an expanded default until the first bulk action. Persist the new global default and exceptions across app restarts, without portable preference export.
- Keep the selected agent PR above its section visible when collapsed, with existing counts, loading, notices, pagination and reveal limits unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: extend repository folding with a persistent global default and an Open/Closed-strip bulk toggle while retaining individual disclosure and existing pin behavior.

## Impact

- Small changes to `src/plugins/git/mod/main.js` for shared folding decisions and the two tab strips; a focused Git-local fold-state helper and icon assets if needed, packaged through the existing Git panel declaration.
- Targeted regression coverage for bulk/individual interactions, legacy saved folds, restart and context restoration, pinned rows and coordinator reveal behavior.
- Update the relevant Git documentation after implementation approval.
- Coordinate with open PR #104 (`fix/git-panel-render`): incorporate its render-path fix before implementation publication if available, resolve actual overlap narrowly, and do not undo its lifecycle or render-safety changes.
- No Herdr/Core changes, new reads, polling, terminal actions, Settings options or extra messages.
