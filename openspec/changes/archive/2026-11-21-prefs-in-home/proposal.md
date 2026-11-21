# Proposal

## Why

Preference exports currently put private host settings into a public source checkout, even though they are ignored. Store durable snapshots in the Herdr home instead, where the maintainer's private dotfiles can version them independently of the app source.

## What Changes

- **BREAKING**: Export/import host snapshots at `<Herdr home>/preferences/<hostname>.json`, using `HERDR_APP_HOME` or `~/.config/herdr-app` just as deployment does, while retaining the existing explicit home argument.
- Move the three visual snapshot files to the same private preference directory: `layout.json`, `palette.json` and `theme.json` are portable personal snapshots, not build/deployment defaults. Remove their tracked copies after approval; keep shipped defaults in `src/appearance/` unchanged.
- Keep old checkout host snapshots untouched and unread; document manual relocation, never an automatic migration or deletion.
- Document the maintainer's exact move: `~/.config/herdr-app/customizations/preferences/pc.json` to `~/.config/herdr-app/preferences/pc.json` (or `$HERDR_APP_HOME/preferences/pc.json` for an explicitly selected alternative home).
- Update focused fixture coverage, ownership/command documentation and ignore rules. Preserve current filtering, schemas, palette conflict checks and closed-desktop import safeguards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Durable preference boundaries specify private Herdr-home snapshot storage, portable visual snapshot ownership and no automatic legacy migration.

## Impact

`tools/preferences.mjs`, the runtime preference tool and its fixtures, README, applicable development/architecture/command/testing documentation, `.gitignore`, and the three currently tracked `preferences/*.json` visual snapshots. No exporter redesign, new filtering, native changes, yadm-hook rewiring, real-home operations or automatic file moves are included. This PR initially contains planning artifacts only; implementation awaits approval.
