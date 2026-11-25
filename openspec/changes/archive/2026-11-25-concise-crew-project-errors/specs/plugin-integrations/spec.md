# Spec Delta

## MODIFIED Requirements

### Requirement: Crew project refusals retain authority and origin
Settings SHALL summarize failed Crew project changes with concise, actionable, sentence-case text and full stops, never usage dumps or multiline raw output. Home-ownership refusals SHALL remain about Crew's home. Rejected names SHALL NOT trigger alternative-name retries or false success. Batch changes SHALL retain successes and identify failures. Full raw output SHALL appear only in existing diagnostics or logs, if available.

#### Scenario: Older Crew rejects dotted registration
- **WHEN** Crew refuses a requested dotted project name, including a response starting with `Usage:` after an optional `crew:` prefix
- **THEN** Settings shows `Could not add {folder}. Crew did not accept the project name {name}; update the Crew tool and try again.` when the installed tool is not known to be outdated
- **AND** when that machine's Crew tool is known to be outdated, it shows `Could not add {folder}. Update the Crew tool on {machine} and try again.` instead
- **AND** the app does not retry with a dash-only name or show the project as registered

#### Scenario: Crew home owned by another terminal
- **WHEN** an add or remove fails because Crew reports that its home is read-only and owned by another terminal
- **THEN** Settings summarizes the home-ownership refusal in one sentence and directs the user to the owning session
- **AND** the selected folder is shown only as the attempted operation's target, not as the owner-locked resource

#### Scenario: Partial batch failure
- **WHEN** one folder change fails while other selected changes succeed
- **THEN** Settings retains the successes, identifies each failed operation with concise guidance and refreshes Crew's authoritative list
- **AND** no failure includes a usage block or multiline command output

#### Scenario: Missing or non-repository folder
- **WHEN** Crew reports that the attempted folder is not a git repository or is missing
- **THEN** Settings names that cause in one sentence with guidance to choose an existing git repository

#### Scenario: Registration conflict
- **WHEN** Crew reports that the name already points at another folder, is taken, or the project is already registered
- **THEN** Settings summarizes the registration conflict in one sentence with guidance to use another name or the existing registration as appropriate

#### Scenario: Failed removal
- **WHEN** Crew refuses a Remove action from a row or an unticked folder
- **THEN** Settings applies the same concise presentation rules using the removal target, without an additional raw-output wrapper
- **AND** unfinished-task and pending-working-copy refusals retain their relevant recovery guidance

#### Scenario: Unrecognized command failure
- **WHEN** a project change fails with another command or transport error
- **THEN** Settings shows `Could not add {folder}.` or the corresponding removal text, followed only by the first output line trimmed to one sentence when present
- **AND** blank output keeps only the operation failure, and usage text is never included even when it appears later in the output
