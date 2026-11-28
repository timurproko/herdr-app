# Spec Delta

## MODIFIED Requirements

### Requirement: Durable non-secret setup names
Successful owner verification and board addition SHALL persist bounded, validated account/added-board display names beside private setup, bound to current credentials and grants. Opening Boards and pressing Check SHALL refresh added-board names by canonical board ID, even when hints exist. Saved hints SHALL remain available on failed or incomplete reads. Names SHALL NOT become authority or portable preferences.

#### Scenario: Reopen with saved setup
- **WHEN** the owner closes and reopens a configured machine's card
- **THEN** saved account and board names remain available, including Unicode names, without requiring a click to recover cached names
- **AND** ordinary account status remains local without automatic account verification, while opening Boards refreshes added-board names
- **AND** the card uses no Saved prefix or Saved board ID placeholder for named entries

#### Scenario: Legacy missing names
- **WHEN** legacy headless or version-1 setup has no display hints
- **THEN** explicit Requirements Check fetches and saves missing account/allowed-board names, and opening Boards can hydrate allowed-board names
- **AND** no name is invented and no authority is granted

#### Scenario: Credential or grant change
- **WHEN** credentials are removed/rotated or a board grant is removed
- **THEN** corresponding stale display hints are invalidated and a different account cannot inherit names or authority
- **AND** incomplete board discovery preserves unseen existing grants and their valid hints

#### Scenario: Board renamed in Trello
- **WHEN** Trello renames an already-added board and the owner opens Boards or presses Boards Check or Requirements Check
- **THEN** successful refresh updates that board's displayed and saved name using its unchanged canonical ID, even when the old hint was present
- **AND** no remove/re-add is needed, and grant IDs, order and write permissions stay unchanged
- **AND** the existing list, disclosure and Check controls remain, with no new messages, buttons or options

#### Scenario: Trello unavailable or board absent from discovery
- **WHEN** a name refresh fails or discovery omits an already-added board
- **THEN** that board keeps its last-known name and grant without an empty-list flash or fabricated replacement name
- **AND** refresh does not retry in a background loop or change private access policy

#### Scenario: Refresh superseded by machine or account changes
- **WHEN** the owner changes machines, replaces/removes the account or disables Trello before a name refresh completes
- **THEN** the obsolete response cannot publish into the replacement selection or restore retired names or authority
