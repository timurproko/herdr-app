# Spec Delta

## MODIFIED Requirements

### Requirement: Optional coordinator fleet attachment
Settings → Spaces SHALL expose **Connect fleet space to coordinator**, defaulting off and portable as a boolean. When enabled with Crew, a verified same-machine fleet SHALL appear below its coordinator with a muted vector elbow replacing its numbered badge. Only the attached fleet SHALL omit its Crew tag; the coordinator SHALL retain its Crew tag. Both rows SHALL remain independently selectable. Native spaces, tabs and terminals SHALL remain distinct.

#### Scenario: First use and disabled setting
- **WHEN** the preference is absent or false
- **THEN** spaces retain their existing independent numbering, Crew tags, ordering and selection behavior
- **AND** no attachment-specific discovery is started

#### Scenario: Connected fleet
- **WHEN** the preference is true, Crew is enabled and live ownership identifies one coordinator and one fleet on the same machine
- **THEN** the fleet is displayed directly below the coordinator with a thin muted elbow line descending from beneath the coordinator's numbered badge and turning right toward the inset muted fleet name
- **AND** the elbow is a vector line in the badge position, not a chain/link glyph or text character
- **AND** the coordinator retains its Crew tag, only the attached fleet omits its Crew tag, and unrelated plugin tags remain
- **AND** the existing fleet worktree icon remains at the row's right edge when enabled

#### Scenario: Compact rail attachment
- **WHEN** the verified pair is shown in the compact rail
- **THEN** the coordinator retains its numbered badge and the fleet shows the same thin muted vector elbow motif in its badge slot
- **AND** the fleet remains separately selectable with its existing name or directory tooltip and no chain/link glyph

#### Scenario: Independent navigation
- **WHEN** the user clicks the attached fleet rather than dragging it
- **THEN** the fleet space itself is selected without selecting the coordinator or moving its terminals
- **AND** clicking the coordinator continues to select that space itself

#### Scenario: Unverified or broken relationship
- **WHEN** ownership is absent, stale, ambiguous, cross-machine, or no longer matches current terminal membership
- **THEN** the app does not attach unrelated spaces or infer a relationship from their names
- **AND** affected spaces use ordinary presentation without changing focus or sessions

#### Scenario: Disable or preference round trip
- **WHEN** the user disables attachment or disables Crew
- **THEN** linked presentation is removed without closing or relocating either space or replaying an earlier order
- **AND** exporting and importing the preference preserves only its boolean, not homes, task records, terminal IDs or pair bindings

## ADDED Requirements

### Requirement: Aligned space worktree markers
In the expanded Spaces sidebar, visible Git worktree markers SHALL occupy the same right-edge vertical axis as the machine header's fold chevron, for ordinary spaces and attached fleet rows. Any adjacent Crew or other plugin tag SHALL appear to the marker's left without shifting that axis. Worktree-icon visibility and rename behavior SHALL remain unchanged.

#### Scenario: Ordinary and attached worktree rows
- **WHEN** a local or remote machine group shows ordinary worktree spaces or an attached fleet with its worktree marker enabled
- **THEN** every visible worktree marker is centred on the header chevron's vertical axis with the same right inset
- **AND** the fleet's child inset does not move the marker away from that axis

#### Scenario: Worktree marker beside plugin tags
- **WHEN** a worktree space also displays a Crew tag or another plugin tag
- **THEN** the tag appears to the left of the trailing worktree marker
- **AND** the marker retains the same centre line as rows without tags and the machine header chevron

#### Scenario: Hidden marker and renaming
- **WHEN** worktree icons are switched off or a space is being renamed
- **THEN** that row shows no worktree marker, preserving the existing visibility and editing behavior
