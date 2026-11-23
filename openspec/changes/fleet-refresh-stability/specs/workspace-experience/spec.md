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
- **WHEN** no prior verified attachment exists, or completed evidence establishes an absent, ambiguous, cross-machine or changed relationship
- **THEN** the app does not attach unrelated spaces or infer a relationship from their names
- **AND** affected spaces use ordinary presentation without changing focus or sessions
- **AND** transport uncertainty during refresh is handled by bounded last-verified presentation rather than an intermediate detached frame

#### Scenario: Disable or preference round trip
- **WHEN** the user disables attachment or disables Crew
- **THEN** linked presentation is removed without closing or relocating either space or replaying an earlier order
- **AND** exporting and importing the preference preserves only its boolean, not homes, task records, terminal IDs or pair bindings

## ADDED Requirements

### Requirement: Stable verified fleet presentation during refresh
An existing verified attachment SHALL retain its expanded and compact presentation during refresh uncertainty. Git refresh, relay events, focus changes, periodic status reads and unrelated live-model changes SHALL NOT create intermediate detached frames. Failed or timed-out reads SHALL retain last-verified presentation for at most 60 seconds from successful verification, never extended by failures. Completed negative evidence and explicit disablement SHALL remove it.

#### Scenario: Successful refresh cycle
- **WHEN** an attached fleet undergoes a delayed Crew status refresh from Git or Spaces and the completed result verifies the same pair
- **THEN** every intermediate sidebar projection retains the same coordinator/fleet block, fleet elbow and Crew-tag visibility
- **AND** no intermediate frame shows the fleet's ordinary numbered badge, independent position or Crew tag

#### Scenario: Unrelated model and focus changes
- **WHEN** an unrelated pane or tab changes, selection changes, or a relevant relay event arrives while the pair remains valid
- **THEN** that change does not invalidate the verified attachment merely because the surrounding model changed
- **AND** a pending or subsequent successful same-binding refresh emits no detached sidebar projection

#### Scenario: Failed or timed-out refresh
- **WHEN** a previously verified pair's next status read fails, is malformed or times out
- **THEN** its prior verified presentation remains until a successful replacement, explicit disablement, definitive native-space removal or the 60-second verification deadline
- **AND** repeated attempts or errors never refresh the successful-verification timestamp or retain the presentation indefinitely

#### Scenario: Completed relationship change
- **WHEN** a successful completed read establishes that the fleet or coordinator is gone or ownership identifies a different valid pair
- **THEN** the prior attachment is removed or replaced atomically without a temporary unknown publication
- **AND** a late result from an older read cannot resurrect it

#### Scenario: No verified history
- **WHEN** the first read is pending, fails or produces ambiguous evidence and no verified pair has been published
- **THEN** the sidebar remains unattached rather than creating a relationship from names, role hints or an unverified snapshot
