## MODIFIED Requirements

### Requirement: One complete-lifecycle Git loading animation
Ordinary and coordinator Git SHALL show one loading animation at a time: a cold Loading dot or a stationary full-width 1px accent line immediately below the header for warm work. The line SHALL ease from zero opacity without a full-line first frame, breathe from zero on a 2400ms ease-in-out cycle, and ease back to zero on completion. The cold dot SHALL retain its nonzero breathing minimum. Reduced motion SHALL stay static. Other panels SHALL remain unchanged.

#### Scenario: Cold ordinary and coordinator work
- **WHEN** enabled shown Git begins work without compatible previously shown content
- **THEN** cold Loading retains its 7px dot, 6px gap, blue 12px text and placement, with the shared Git breathing rhythm and no moving line or repository headers
- **AND** actionable failures, coherent inventory publication and count uncertainty remain unchanged

#### Scenario: Warm background and manual work
- **WHEN** shown Git performs warm return, verification, manual, webhook or safety work
- **THEN** one full-width thin accent line eases in from transparent and breathes by opacity only without positional motion, stepping or a sudden full-line first frame, while the existing list remains mounted without body Loading or Stale text
- **AND** overlapping work retains the same animation lifecycle until the last pending operation finishes and Refresh stays static with its existing disabled feedback
- **AND** routine rerenders do not restart the line at full opacity or reset its phase

#### Scenario: Idle failure cooldown and retired callbacks
- **WHEN** work completes or fails
- **THEN** the warm line eases smoothly to zero before its presentation retires, without changing list geometry or asserting additional active work
- **AND** hide, disable or context retirement removes obsolete feedback immediately; obsolete work cannot retain or clear a newer context's loading feedback
- **AND** dormant cooldowns and uncertain totals do not assert active warm work; unresolved cold inventory may retain Loading

#### Scenario: Work resumes during exit
- **WHEN** new eligible same-context work starts while the line is fading out
- **THEN** the line resumes smoothly without a full-opacity flash or a stale cleanup removing current activity

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested
- **THEN** Git uses a static dim line or dot with the same geometry and work admission conditions, without an animation loop or animated entrance or exit
- **AND** other panels' loading feedback is unchanged

## ADDED Requirements

### Requirement: Routine Git refresh completes without interrupted-render fallback
Routine same-context refreshes in ordinary and coordinator Git SHALL preserve the displayed list until a coherent replacement is available and SHALL NOT trigger the host's interrupted-render fallback. Genuine unexpected render failures SHALL retain existing diagnostics; suppressing the banner, increasing the host deadline or replacing rows with placeholders SHALL NOT constitute a fix.

#### Scenario: Repeated background refresh of a loaded list
- **WHEN** manual, local-context, webhook, verification or checks updates repeatedly refresh a shown same-context list
- **THEN** loaded rows, pins, folds, pagination and scroll remain stable until authoritative changes publish in place, without a blank frame, replacement Loading or interrupted-render banner
- **AND** existing row geometry, measured render budgets, reveal limits and stale-reply rejection remain intact

#### Scenario: Actual render failure remains diagnosable
- **WHEN** an unexpected row exception or native render abort occurs outside the corrected routine-refresh path
- **THEN** existing component diagnostics, fixed-height row fallback where applicable and bounded once-only recovery remain available without claiming an unobserved cause
