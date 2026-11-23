# Spec Delta

## MODIFIED Requirements

### Requirement: Optional coordinator fleet attachment
Settings → Spaces SHALL expose **Connect fleet space to coordinator**, defaulting off and portable as a boolean. When enabled with Crew, a verified same-machine fleet SHALL appear below its coordinator with a white outlined vector chain inside a filled badge using the coordinator's numbered-badge colour, and its name aligned with ordinary space names.

#### Scenario: First use and disabled setting
- **WHEN** the preference is absent or false
- **THEN** spaces retain their existing independent numbering, Crew tags, ordering and selection behavior
- **AND** no attachment-specific discovery is started

#### Scenario: Connected fleet
- **WHEN** the preference is true, Crew is enabled and live ownership identifies one coordinator and one fleet on the same machine
- **THEN** the fleet is displayed directly below the coordinator with a white outlined vector chain/link glyph inside a filled badge in the numbered-badge slot, using the same 16px box, rounded shape and vertical centre as an ordinary numbered badge
- **AND** the badge uses the coordinator's actual numbered-badge colour rather than the fleet's own colour or the muted icon colour, and no elbow or connector lines are drawn
- **AND** the fleet name begins at the same left edge as the coordinator and ordinary space names, retaining its existing muted text style without indentation
- **AND** both expanded rows display the same Crew pill styling at the trailing tag edge, after any ahead/behind counts and worktree marker, and unrelated plugin tags remain
- **AND** a worktree marker without plugin tags retains its existing right-edge alignment with the machine chevron

#### Scenario: Compact rail attachment
- **WHEN** the verified pair is shown in the compact rail
- **THEN** the coordinator retains its numbered badge and the fleet shows the same coordinator-coloured filled chain badge in its badge slot, with the same box size and centering as a numbered badge
- **AND** no elbow or connector lines are drawn
- **AND** the fleet remains separately selectable with its existing name or directory tooltip
- **AND** the rail remains badge-only without added Crew pills

#### Scenario: Coordinator recolouring
- **WHEN** the coordinator's space colour changes while an attached pair is displayed
- **THEN** both the coordinator's numbered badge and the fleet's chain-badge fill use that same resolved colour in expanded and compact views
- **AND** the fleet's own saved colour remains unchanged and does not override the attached badge colour

#### Scenario: Independent navigation
- **WHEN** the user clicks the attached fleet rather than dragging it
- **THEN** the fleet space itself is selected without selecting the coordinator or moving its terminals
- **AND** clicking the coordinator continues to select that space itself

#### Scenario: Unverified or broken relationship
- **WHEN** no prior verified attachment exists, or completed evidence establishes an absent, ambiguous, cross-machine or changed relationship
- **THEN** the app does not attach unrelated spaces or infer a relationship from their names
- **AND** affected spaces use ordinary presentation without changing focus or sessions
- **AND** transport uncertainty during refresh is handled by bounded last-verified presentation rather than an intermediate detached frame

#### Scenario: Disable or preference round trip
- **WHEN** the user disables attachment or disables Crew
- **THEN** linked presentation is removed without closing or relocating either space or replaying an earlier order
- **AND** exporting and importing the preference preserves only its boolean, not homes, task records, terminal IDs or pair bindings

### Requirement: Aligned space worktree markers
In the expanded Spaces sidebar, plugin tags SHALL occupy the existing tag-only right edge, after any ahead/behind counts and worktree marker, on ordinary and attached fleet rows. Worktree markers on rows without tags SHALL retain their existing alignment with the machine header's fold chevron. Worktree-icon visibility and rename behavior SHALL remain unchanged.

#### Scenario: Ordinary and attached worktree rows
- **WHEN** a local or remote machine group shows ordinary worktree spaces or an attached fleet with its worktree marker enabled and no plugin tags
- **THEN** every visible worktree marker is centred on the header chevron's vertical axis with the same right inset
- **AND** the fleet's left-aligned name and chain badge do not move the marker away from that axis

#### Scenario: Worktree marker beside plugin tags
- **WHEN** a worktree space also displays a Crew tag or another plugin tag
- **THEN** the row's order is name, any ahead/behind counts, worktree marker, then plugin tags
- **AND** the final tag shares the same right edge as a tag-only row instead of being displaced by the marker
- **AND** this rule applies to ordinary and attached rows independently of whether fleet attachment is enabled

#### Scenario: Hidden marker and renaming
- **WHEN** worktree icons are switched off or a space is being renamed
- **THEN** that row shows no worktree marker, preserving the existing visibility and editing behavior
- **AND** visible plugin tags retain their trailing edge when the marker is hidden, and renaming still hides the tags

### Requirement: Independent attached-space identity and tags
Attached coordinator and fleet rows SHALL remain independently selectable native spaces with distinct tabs and terminals. Both expanded rows SHALL display the existing Crew pill with matching styling and a common trailing tag edge, after any worktree marker rather than to its left. Unrelated plugin tags SHALL remain.

#### Scenario: Attached row selection and tags
- **WHEN** a verified coordinator and fleet are attached in Spaces
- **THEN** clicking either row selects that native space without relocating tabs or terminals
- **AND** both expanded rows display their Crew pill and unrelated plugin tags remain
- **AND** when Crew is their only tag, the coordinator and fleet pills share the same right edge even if only the fleet has a worktree marker and ahead/behind counts
- **AND** the coordinator retains its coordinator tooltip and the fleet uses its worker tooltip

#### Scenario: Attachment removed
- **WHEN** the relationship is confirmed broken or attachment is disabled
- **THEN** the rows retain their separate native identities and ordinary plugin tag rules
- **AND** disabling Crew still hides Crew tags without closing or relocating either space
