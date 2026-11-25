# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded coordinator render work
Coordinator Open and Closed SHALL reveal ten presentation items initially and append ten near the bottom while keeping every revealed unfolded row of the selected mounted batch present. There SHALL be no viewport spacers or replacement-page footer. Pure row/measurement caches SHALL keep native render work within measured budgets; if 200 mounted rows exceed about 35ms, a measured safe cap SHALL use only one quiet end Show more row. Revealing SHALL start no GitHub inventory read.

#### Scenario: Native scrolling without a JavaScript event
- **WHEN** a native scrollbar drag, track click or keyboard action moves through the revealed content without a JavaScript callback
- **THEN** the viewport shows real mounted rows, never an empty virtual spacer
- **AND** totals still cover the complete inventory and enrollment stays outside the scroller

#### Scenario: Incremental reveal and fitting content
- **WHEN** the list nears its bottom on a received wheel, pointer-over-list or size event, or a post-batch layout check finds that it does not yet overflow
- **THEN** another ten known presentation items are revealed until content overflows, the inventory ends or the measured safe cap is reached
- **AND** dragging to the bottom without an observable event reveals the next batch on the next received event, not through a claimed scrollbar observer

#### Scenario: Atomic section reveal
- **WHEN** a reveal or safe-cap boundary would end with an unfolded repository header
- **THEN** the header is held for the next batch with at least its first row or visible notice, never rendered alone
- **AND** after every reveal and state transition each rendered unfolded header has a row or visible notice beneath it
- **AND** sections with no eligible row or notice in the selected tab disappear after rows move tabs, expire or are authoritatively absent, while intentionally folded eligible sections keep their headers

#### Scenario: Long Closed inventory
- **WHEN** complete coordinator render builds are measured for 30, 60, 100 and 200 mounted PRs
- **THEN** measurements report actual built counts, cold/warm scope and any chosen cap, targeting below 20ms at 100 rows
- **AND** deterministic regressions bound per-row and mounted-tree operations/elements instead of asserting the obsolete viewport-window ceiling

#### Scenario: Measured safe mounted batch
- **WHEN** 200 mounted PR rows exceed the measured safe native build budget
- **THEN** each mounted batch is capped at 60 PRs and 100 presentation items, with one quiet end Show more control and no page counter or Previous control
- **AND** the control advances the batch, cycling the final batch back to the first so earlier rows remain reachable
- **AND** excess arrivals at a full row cap wait for a free slot or explicit batch cycle instead of evicting already revealed PRs

#### Scenario: Repeated row text and labels
- **WHEN** coordinator rows share natural-width metadata strings
- **THEN** native intrinsic widths are measured once per distinct zoom, style and string in a bounded cache, with at most one pending probe per snapshot
- **AND** current available line width still selects semantic shortening without guessed character budgets
- **AND** stale-context or prior-zoom callbacks cannot poison current measurements
- **AND** each row builds at most three label pills while full assigned label names remain available in tooltips

#### Scenario: Snapshot-safe row caching
- **WHEN** unchanged PR facts are rendered again
- **THEN** pure facts, strings, styles and text measurements may be reused while native elements and callbacks register in the current snapshot
- **AND** native build timings are not claimed as live desktop paint or input latency

#### Scenario: Refresh or appended facts while scrolled
- **WHEN** known rows arrive or same-context facts refresh
- **THEN** the surviving row anchor, folded sections, full counts and fixed row geometry are retained
- **AND** accepted native anchor requests unconditionally request a subsequent layout, even when both fade flags are unchanged
- **AND** a genuine context change cannot inherit incompatible facts or scroll requests

#### Scenario: Ordinary pins and older rows
- **WHEN** ordinary Git loads another cursor page, refreshes an expanded list or resolves an older active PR
- **THEN** its existing pagination, pinned row, no-jump row geometry and pin-motion behavior remain intact
- **AND** the shared scroll hints do not replace its existing explicit load or retry control

### Requirement: Pending checks fallback without live coverage
Shown Open/Draft PRs and uncovered pending/unknown checks SHALL refresh state and checks through coalesced repository jobs on the existing queue: every 45 seconds unenrolled or 120 seconds enrolled, independent of relay connectivity. Failures SHALL retain values and back off exponentially; rate limits SHALL delay retries at least 15 minutes. Hidden, disabled, offline or superseded contexts SHALL stop reads.

#### Scenario: Pending checks settle
- **WHEN** an unenrolled shown Open/Draft PR has pending checks and its fallback read returns settled checks
- **THEN** the count updates in place and the fallback continues reading that shown open PR's state and checks at its normal cadence
- **AND** a confirmed empty rollup is settled rather than unknown but does not stop an open row's state refresh

#### Scenario: Failure and visibility
- **WHEN** a fallback read fails or the panel is hidden, disabled or its machine goes offline
- **THEN** its last displayed value remains and failures back off before another eligible read
- **AND** hidden, disabled or offline contexts start no fallback reads and late replies cannot overwrite a new context

#### Scenario: Thin unchanged-row cycle
- **WHEN** shown PR heads and overall check summaries remain unchanged during a safety cycle
- **THEN** one bounded repository probe reads state, draft/completion/head facts and the rollup summary without requesting individual check contexts
- **AND** full check contexts are fetched only for changed heads or summaries, under the same single-flight lease

#### Scenario: Secondary rate limit
- **WHEN** GitHub refuses a safety read with a secondary limit despite positive hourly quota
- **THEN** last-good facts remain and no immediate retry occurs
- **AND** the next attempt waits at least 15 minutes or a longer Retry-After value

#### Scenario: Settled open PR changes state
- **WHEN** a shown unenrolled PR with settled checks is merged, closed or converted to draft after its last successful refresh
- **THEN** the next successful fallback cycle reads its current state alongside checks and reconciles its row and totals
- **AND** settlement alone cannot leave it indefinitely in Open after closure

#### Scenario: Coordinator viewport selection
- **WHEN** a coordinator safety cycle selects eligible PRs
- **THEN** every revealed PR in an unfolded section of the selected tab is eligible, including rows below or above the visible viewport
- **AND** unrevealed rows, folded sections and the other tab remain excluded
- **AND** scroll input itself starts no inventory read or immediate extra probe, while ordinary safety selection stays unchanged

#### Scenario: Window changes during a safety request
- **WHEN** reveal, fold, tab, context or relevant inventory changes supersede a held safety selection, including changing away and back
- **THEN** its reply is rejected by the captured selection generation
- **AND** moving only the native viewport within an unchanged revealed selection does not invalidate that selection or change its normal cadence

### Requirement: Shared Git scroll edge hints
Ordinary and coordinator Git lists SHALL reuse Spaces/Agents passive fade rendering and a pure scroll-metrics projection. At render, fades SHALL use the native scroll handle's actual offset, viewport and content. Fades SHALL disappear at their respective ends and never intercept input. Host-consumed scrollbar movement MAY delay their repaint until another event/render; this limitation SHALL be stated, not hidden by a guessed scroll observer.

#### Scenario: Start, middle and end
- **WHEN** a render samples either native list at its start, middle or final end
- **THEN** only the bottom fade appears at an overflowing start, both appear in the middle and only the top fade appears at the end
- **AND** fitting content shows neither fade and gradients retain the shared 40px height, scrollbar clearance and list background

#### Scenario: Layout and input changes
- **WHEN** scrollbar dragging or a track click changes the retained handle without invalidating JavaScript
- **THEN** mounted content stays visible and the next render/event samples its real position
- **AND** documented fade/reveal latency explicitly acknowledges the missing notification path without introducing polling

#### Scenario: Accepted anchor correction
- **WHEN** a same-height refresh queues a native anchor correction while the viewport remains in the middle or reaches an end
- **THEN** it requests a repaint unconditionally after queuing the correction and rejects obsolete requests
- **AND** geometry and fade flags remain coherent through the shared atomic projection without render-time notifications or focus allocation
