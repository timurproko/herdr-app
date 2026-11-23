# Spec Delta

## MODIFIED Requirements

### Requirement: Narrow same-machine tab movement
Moving a tab SHALL retain its terminals and splits and be restricted to reviewed App/Core versions, document shapes and same-machine destinations. Unknown identity, unsupported targets or stale concurrency state SHALL fail closed. An uncertain result SHALL NOT be treated as success or queued for automatic replay. The Move to menu SHALL use consistent outline navigation chevrons and display readable, non-ellipsized refusal explanations within its bounded viewport.

#### Scenario: Supported move to another space
- **WHEN** a user explicitly moves a supported tab to another space on the same verified machine
- **THEN** the tab's running terminals and split structure are preserved
- **AND** their working directories are not changed by the move

#### Scenario: Unknown host or different machine
- **WHEN** a move targets a different machine or an unreviewed host version/document shape
- **THEN** the app refuses the document mutation with an actionable reason
- **AND** does not rebuild the host, weaken its gates or create a replay job

#### Scenario: Reviewed Core update
- **WHEN** App 0.1.16 uses a verified Core 0.1.22 and all existing compatibility and target checks pass
- **THEN** the submenu lists same-machine destination spaces and permits the explicit move
- **AND** an unreviewed routing Core still refuses remote moves even if the destination Core is reviewed

#### Scenario: Navigation chevron consistency
- **WHEN** the parent tab menu displays Move to and the submenu displays Back
- **THEN** Move to has a leading right-pointing outline chevron matching Back's left-pointing outline chevron in size, color and icon-column alignment
- **AND** Move to has no duplicate trailing text arrow, while actual destination rows retain their numbered colored badges

#### Scenario: Readable refusal
- **WHEN** preflight rejects an unreviewed App/Core version or protocol generation
- **THEN** the submenu retains Back and shows the detected and reviewed contract facts in a wrapping, inert explanation without a single-line ellipsis
- **AND** its content has sufficient layout height and remains reachable within the bounded scroll area
- **AND** Left or Escape returns to the parent menu without submitting a move
