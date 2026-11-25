# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded coordinator render work
Coordinator Open and Closed SHALL reveal ten presentation items initially and append further batches near the scroll bottom, without replacement-page controls. Rendering SHALL build only items within and near the viewport, with exact-height spacers preserving continuous scroll geometry. Revealing items SHALL preserve full counts, folds, inventory and action authority without starting GitHub inventory reads.

#### Scenario: Long Closed inventory
- **WHEN** a coordinator has one hundred eligible Closed PRs across repositories and the user scrolls through the inventory
- **THEN** every PR becomes reachable by continuous scrolling without page numbers, Previous or Show more controls
- **AND** after all one hundred PRs are revealed, each render still builds only viewport-near items, not the full revealed list
- **AND** the enrollment footer remains outside the stable scrolling viewport
- **AND** a deterministic regression retains the existing ceilings of fewer than 10,000 builder operations, 1,200 total elements and 125 elements per built PR

#### Scenario: Repeated row text and labels
- **WHEN** coordinator rows share natural-width metadata strings
- **THEN** native intrinsic widths are measured once per distinct zoom, style and string in a bounded cache, with at most one pending probe per snapshot
- **AND** current available line width still selects semantic shortening without guessed character budgets
- **AND** stale-context or prior-zoom callbacks cannot poison current measurements
- **AND** each row builds at most three label pills while full assigned label names remain available in tooltips

#### Scenario: Snapshot-safe row caching
- **WHEN** unchanged PR facts are rendered again
- **THEN** pure presentation and text measurements may be reused while interactive native elements register callbacks in the current snapshot
- **AND** native measurements are reported with their scope rather than claimed as live desktop paint or click latency

#### Scenario: Refresh or appended facts while scrolled
- **WHEN** more items are revealed or same-context PR facts and task links refresh while the user is scrolled down
- **THEN** the retained viewport keeps its position relative to surviving row identities without resetting to the top or jumping because rows outside the window unmount
- **AND** spacers include the existing 74px PR blocks, section-header and notice heights, list gaps and padding at the current zoom
- **AND** folded sections stay folded, tab counts still cover all eligible inventory, and a genuine context change cannot inherit incompatible scroll state

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
- **WHEN** a coordinator safety cycle selects eligible PRs from a partially revealed or fully revealed list
- **THEN** only rows intersecting the current viewport window are selected, excluding folded rows, overscan-only rows, off-window revealed rows and the other tab
- **AND** scrolling only updates presentation and selection; it starts no inventory reads or immediate extra safety probes
- **AND** ordinary Git retains its existing loaded-row and pinned-row safety selection

#### Scenario: Window changes during a safety request
- **WHEN** the coordinator's viewport row identities change before a safety reply completes, including a move away and back
- **THEN** the old reply is rejected by its captured window generation and cannot publish row facts or totals
- **AND** the new window remains eligible at the normal cadence with existing repository routing, stale-context and action-freshness guards

## ADDED Requirements

### Requirement: Shared Git scroll edge hints
Ordinary and coordinator Git scrolling lists SHALL use the same passive top and bottom fade behavior and geometry-derived metrics as Spaces and Agents. A fade SHALL appear only when content is hidden in that direction, disappear at its respective end and never intercept row actions or scrolling.

#### Scenario: Start, middle and end
- **WHEN** either Git list is at its start, in its middle or at its final loaded end
- **THEN** only the bottom fade appears at an overflowing start, both appear in the middle and only the top fade appears at the end
- **AND** lists that fit show neither fade
- **AND** the gradients retain the shared 40px height and native scrollbar clearance, using the Git list's background

#### Scenario: Layout and input changes
- **WHEN** content arrives, folds change, viewport size or zoom changes, or native wheel or scrollbar scrolling changes the visible range
- **THEN** edge hints follow the actual retained scroll geometry without polling, guessed cumulative wheel offsets or new GitHub reads
- **AND** neither render-time notification nor render-time focus allocation is required
