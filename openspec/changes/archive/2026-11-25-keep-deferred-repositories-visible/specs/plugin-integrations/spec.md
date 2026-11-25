# Spec Delta

## MODIFIED Requirements

### Requirement: Selected-tab coordinator repository visibility
The coordinator Git panel SHALL render a repository section when the selected tab has an eligible PR row, a genuine scoped read notice, or admitted task PRs awaiting their first authoritative facts. Unresolved sections SHALL use standard Loading feedback, not invented rows. Eligibility SHALL precede folding and preserve history limits and saved fold state. Enrollment SHALL use full eligible inventory independently of selected-tab visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible rows in the selected tab but has an applicable PR-read notice
- **THEN** its section remains available with that notice under the existing folding behavior
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a repository section visible
- **AND** other eligible rows, unresolved admitted PRs or genuine applicable notices can still keep that section visible

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row, unresolved admitted PR or applicable read notice in a settled verified tab
- **THEN** the panel uses ordinary Git's same empty-state presentation and wording, namely `No open pull requests` or `No closed pull requests`
- **AND** no empty repository header remains, while pending loading and unverified waiting states retain their existing feedback

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes that repository in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel GitHub reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** verified admitted task links include two PRs in one repository whose first read is queued, in flight or quietly deferred while other repositories load successfully
- **THEN** its canonical repository header remains available in either tab with the existing working bulb and Loading in its unfolded body
- **AND** no error, rate-limit wording, new style or placeholder PR is introduced and healthy repositories' real rows remain visible
- **AND** folding hides Loading with the body but retains the eligible header without new reads

#### Scenario: Retry fills the existing section
- **WHEN** the existing cooldown expires while the panel remains shown, enabled and freshly verified, and its automatic retry succeeds
- **THEN** the unresolved section fills with its two authoritative eligible PR rows without requiring a new event or manual refresh
- **AND** surviving repository/header identities, fold state, revealed content and scroll anchor remain stable without a clear-to-empty frame
- **AND** final known-state filtering removes sections with no qualifying content in that tab, including confirmed missing or expired history

### Requirement: Always-visible Git tab counts
Ordinary and coordinator Git views SHALL always display Open and Closed count badges. Unknown or incomplete totals SHALL retain loading feedback, showing 0 before a complete total exists and retaining compatible last-good totals afterward. Successfully loaded subsets SHALL NOT appear as complete totals. Badge geometry SHALL remain stable; only loading or abbreviated counts SHALL have count tooltips and accessible labels SHALL retain exact known totals.

#### Scenario: Unknown and loaded totals
- **WHEN** an ordinary or coordinator Git panel first loads, then receives authoritative totals
- **THEN** both badges visibly start at 0 and change to the real counts without moving the tabs
- **AND** three-digit totals remain fully contained in the fixed badge geometry at supported zooms
- **AND** unknown totals have a loading tooltip and accessible label, while fully visible exact totals have no count-only tooltip on the tab or badge

#### Scenario: Refresh retains counts
- **WHEN** known same-repository or coordinator-home counts are refreshed, including delayed or failed reads
- **THEN** their last-known totals remain visible rather than returning to 0
- **AND** only a real context change clears incompatible counts back to the first-load presentation

#### Scenario: Symmetric tab padding across digit changes
- **WHEN** either selected or unselected Open or Closed tabs display one-, two- or three-digit counts in ordinary or coordinator views at 75–200% zoom including 130%
- **THEN** the gap from the tab's left edge to its label equals the gap from its painted count badge's right edge to the tab's right edge
- **AND** digits remain centred within the badge without moving tab or badge bounds as digit counts change

#### Scenario: Abbreviated large counts
- **WHEN** a count exceeds 999
- **THEN** its bounded badge displays 999+ and exposes the full exact total through its tooltip and accessible label
- **AND** its tab geometry remains unchanged

#### Scenario: One admitted repository remains unresolved
- **WHEN** some admitted coordinator PR identities have no authoritative state while other repositories have supplied rows
- **THEN** both totals remain marked loading rather than presenting the successfully loaded subset as complete
- **AND** before any complete total exists both badges show 0 using the existing count-loading tooltip and accessible state
- **AND** if new unread membership arrives after a complete same-scope snapshot, compatible last-good totals remain visibly marked loading until resolution
- **AND** completion counts only deduplicated eligible coordinator task PRs, never guessed states or whole-repository totals

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
- **THEN** the header is held for the next batch with at least its first row, visible notice or standard Loading body, never rendered alone
- **AND** after every reveal and state transition each rendered unfolded header has a row, visible notice or standard Loading beneath it
- **AND** settled sections with no eligible row or notice disappear after rows move tabs, expire or are authoritatively absent, while intentionally folded eligible sections keep their headers

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

#### Scenario: Unresolved section within the existing watchdog budget
- **WHEN** unresolved repositories render or recover alongside loaded rows
- **THEN** Loading is bounded by the existing presentation-item cap, preserves atomic header/body reveal and introduces no render-time measurement, notification or diagnostic IO
- **AND** the 50 ms render watchdog and existing PR-row cap remain unchanged

### Requirement: Quiet GitHub rate refusal episodes
Any Git panel GitHub read refused for primary or secondary rate limits SHALL retain last-good rows, totals, pins and paging without an error notice, banner, replacement empty state or new Stale alarm. With no prior successful data it SHALL retain standard Loading feedback. Each refusal episode SHALL emit one sanitized customization-log line, never one per attempt. Actionable non-rate failures SHALL retain their existing notices.

#### Scenario: Every read path is quiet
- **WHEN** list, count, targeted, older/pinned, history, safety, check-detail, repository-resolution, account-diagnosis or panel auxiliary reads encounter a genuine rate refusal
- **THEN** refusal alone introduces no error UI or new stale alarm, and already known rows and totals remain
- **AND** first-load unknown data stays Loading with unknown-count semantics rather than settling as an empty list or disappearing behind healthy repositories
- **AND** an unrelated existing actionable error or fleet-verification Stale state is not falsely cleared or reclassified

#### Scenario: Bounded retry and manual bypass
- **WHEN** a refusal starts or extends a cooldown
- **THEN** automatic reads wait at least fifteen minutes or the longer Retry-After duration, even with positive hourly quota
- **AND** one explicit user Refresh can attempt one read during cooldown without starting a retry loop or fan-out after another refusal
- **AND** a refused manual read remains quiet and does not emit another line in the same episode

#### Scenario: Episode recovery and strict classification
- **WHEN** retries keep failing with rate refusal, then an admitted read succeeds, and a later read is rate-refused
- **THEN** the first episode logs only once and the later episode can log once after successful recovery
- **AND** authentication, permission, network, local process, timeout and malformed-response failures are not silenced merely because they mention rate-related text or return HTTP 403 without rate-limit evidence
- **AND** logs contain no tokens, raw replies or task inventories and logging failure never blocks retry or presentation

#### Scenario: Warm refusal in either panel mode
- **WHEN** a same-context coordinator or ordinary repository with loaded facts is refused during refresh
- **THEN** its last-good rows and counts remain without replacement Loading content, paging reset or new error UI
- **AND** existing cooldown recovery remains subject to current visibility, enablement, machine and context guards

## ADDED Requirements

### Requirement: Bounded repository read diagnostics
Git SHALL retain a bounded local runtime diagnostic per routed repository with read phase, occurrence time, quiet-refusal category and retry deadline. Evidence SHALL distinguish a fresh refusal from a cooldown-skipped read and remain inspectable without UI. It SHALL contain no raw replies, credentials, task inventory or paths, grant no authority and never block reads or rendering.

#### Scenario: Refusal followed by cooldown and success
- **WHEN** a repository's first targeted or ordinary read is rate-refused, skipped during cooldown, and later succeeds
- **THEN** diagnostic facts distinguish those phases and retain the sanitized last refusal time and absolute retry deadline after recovery
- **AND** bounded eviction limits repository retention and repeated skips do not create unbounded history or repeated episode logs

#### Scenario: Isolation, privacy and rendering
- **WHEN** local and remote repositories share names or a stale read finishes after a newer attempt
- **THEN** diagnostics remain machine/repository scoped and cannot overwrite newer phase facts or change read admission, counts or UI
- **AND** no diagnostic UI, portable export, render-time persistence or render-time notification is added
