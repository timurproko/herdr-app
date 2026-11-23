# Spec Delta

## ADDED Requirements

### Requirement: Confirmed terminal copy feedback
The Custom workspace SHALL show standard success-toast feedback for each confirmed native terminal text copy, including repeated identical copies. Selection changes alone SHALL NOT count as copy success. Feedback SHALL NOT expose copied contents or change clipboard, terminal input, focus, or selection behavior.

#### Scenario: Mouse copy on select
- **WHEN** a mouse selection is released with copy-on-select enabled and native copying succeeds
- **THEN** one standard success toast confirms the copy
- **AND** the selection remains highlighted as native copying dictates

#### Scenario: Explicit or repeated copy
- **WHEN** an explicit native copy action successfully copies selected text, including a repeated copy without changing the selection
- **THEN** each successful copy produces confirmation even when the clipboard already contains identical text
- **AND** turning copy-on-select off does not suppress explicit-copy feedback

#### Scenario: Selection without a copy
- **WHEN** a selection changes without a successful copy, including a held drag or copy-on-select being disabled
- **THEN** no success toast is inferred from the selection or previous clipboard contents

#### Scenario: Empty or failed copy
- **WHEN** a copy action has no selected text or fails before completing the clipboard write
- **THEN** no successful-copy toast is shown

#### Scenario: Cold startup and stale delivery
- **WHEN** window context arrives after the copy-feedback controller is initialized
- **THEN** valid later copies still receive confirmation
- **AND** a stale or previously handled notification cannot be replayed against another terminal
