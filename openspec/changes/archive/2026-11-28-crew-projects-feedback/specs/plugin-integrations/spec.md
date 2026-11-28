# Spec Delta

## MODIFIED Requirements

### Requirement: Non-actionable delivery kind explanation
The Projects description SHALL append Delivery kinds in inline accent styling with a dashed underline. Hover or keyboard focus SHALL show three readable, wrapped explanations, each with a bold kind name followed by one plain-language sentence, using the existing tooltip treatment with comfortable width and spacing. Clicking SHALL do nothing. The explanation SHALL NOT use column headers or a table.

#### Scenario: Complete explanation
- **WHEN** the person hovers or focuses Delivery kinds after Git folders crew may work in on this machine.
- **THEN** Plain says The worker codes right away; Crew opens the pull request and reviews it.
- **AND** Delivery explains that the worker plans in a draft pull request and codes after approval; Crew reviews
- **AND** Gate explains that the gate tool reviews, tests and opens the pull request
- **AND** each entry stays one short sentence, without small-fix or gate-skip detail
- **AND** each kind is understandable without column headings and long sentences wrap without overlapping or clipping
- **AND** clicking does not open a URL, menu or action, and no command or machine read is started

## ADDED Requirements

### Requirement: Slow Crew project listing feedback
Crew Projects SHALL allow up to 60 seconds for each dispatched project-list command. While a read is pending, Settings SHALL retain its existing loading feedback and same-context last-confirmed rows, without a premature error or new controls. Successful replies SHALL replace rows only in their current context. Real failures and elapsed deadlines SHALL retain the existing retry message and last-known rows.

#### Scenario: Cold listing takes twenty seconds
- **WHEN** a valid Crew project listing takes about 20 seconds on the selected machine
- **THEN** the existing pending state remains beyond 15 seconds without a read error
- **AND** the successful response displays its authoritative project list without requiring repeated refreshes

#### Scenario: Warm refresh takes twenty seconds
- **WHEN** a previously loaded Projects list is refreshed and its replacement takes about 20 seconds
- **THEN** confirmed rows remain visible with existing loading feedback until the response arrives
- **AND** the successful response replaces those rows coherently without an intermediate empty or error list

#### Scenario: Deadline or genuine refusal
- **WHEN** the project-list command reaches its 60-second execution limit or returns a genuine failure
- **THEN** the existing short retry error appears with last-confirmed rows retained
- **AND** no kind is inferred and no read or write is automatically replayed because of a timeout

#### Scenario: Context retired during a slow read
- **WHEN** the machine changes, Settings closes, the plugin is disabled or a newer refresh replaces a pending read
- **THEN** its late response cannot publish into the new context
- **AND** no controls or write authority are derived from the obsolete response
