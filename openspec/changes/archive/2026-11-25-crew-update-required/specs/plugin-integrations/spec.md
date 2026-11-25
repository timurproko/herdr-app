# Spec Delta

## ADDED Requirements

### Requirement: Machine-scoped Crew update attention
A confirmed available Crew tool update SHALL be a non-optional unmet requirement for the selected machine. The row SHALL show `Outdated` using existing unmet-requirement styling, retain Update and the installed revision, and contribute to `N to fix` and any existing unmet-requirement indicators. Revision age alone SHALL NOT block coordinator launch or project actions.

#### Scenario: Outdated local or remote Crew
- **WHEN** the selected local or remote machine has an installed Crew revision confirmed behind the available revision
- **THEN** its Crew tool row shows Outdated and Update, with the existing non-optional unmet colour
- **AND** Requirements counts it as one to fix rather than one optional, independently of other machines
- **AND** existing plugin-card or navigation unmet-requirement indicators, if present, include it like other unmet requirements

#### Scenario: Current or unverified revision
- **WHEN** Crew is current or its update check fails or has unknown revision evidence
- **THEN** a current installation remains Ready and unknown or failed update evidence does not claim Outdated
- **AND** existing inspection errors and missing-installation states retain their existing meaning

#### Scenario: Optional tools remain optional
- **WHEN** another Crew prerequisite is genuinely optional
- **THEN** its Optional label, neutral styling and optional-only summary behaviour remain unchanged
- **AND** an outdated Crew tool still contributes to the non-optional count when both are present

#### Scenario: Actions with an old installed tool
- **WHEN** a coordinator launch or project action otherwise satisfies its existing guards but Crew is outdated
- **THEN** revision age alone does not refuse or disable that action
- **AND** existing installation, connection, ownership and capability refusals remain authoritative without a new update gate
