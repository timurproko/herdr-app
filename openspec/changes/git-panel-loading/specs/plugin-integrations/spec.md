# Spec Delta

## REMOVED Requirements

### Requirement: Always-visible Git tab counts
**Reason**: Open and Closed now use labels only in every Git view.
**Migration**: Remove visible tab badges, badge reservations and count-only tab feedback; retain repository section counts and internal scoped count facts.

## ADDED Requirements

### Requirement: Label-only Git tabs
Ordinary and coordinator Git panels SHALL display only Open and Closed labels in their tab controls, without count bubbles, count reservations or count-only tooltips. Existing selected styling, accessible tab names and selection behavior SHALL remain. Repository section counts SHALL remain unchanged.

#### Scenario: Unknown cached and loaded totals
- **WHEN** either Git view renders with unknown, partial, cached, zero or authoritative totals, including during refresh or failure
- **THEN** the controls read only Open and Closed and reserve no badge width
- **AND** internal total uncertainty does not introduce a visual tab counter or count-only tooltip

#### Scenario: Repository counts remain
- **WHEN** loaded repository sections expand, fold, refresh or contain a selected pinned PR
- **THEN** their existing scoped counts remain, including the ordinary header's remaining-row count
- **AND** removing tab badges changes no repository eligibility, order, cursor, pin or selected tab

### Requirement: Exclusive cold Git loading presentation
Ordinary and coordinator Git panels SHALL never show repository section headers or their counts together with body Loading. Unresolved cold reads SHALL show one pulsing Loading message at the same position below Open/Closed in both views. Successful partial sections SHALL wait for coherent publication. Actionable failures SHALL remain visible without a section header while Loading remains.

#### Scenario: Ordinary identity arrives before its first page
- **WHEN** the repository identity is known but no compatible selected-tab page or published section is ready
- **THEN** only the standard pulsing Loading message represents the pending list, without a repository header or zero section count
- **AND** the header and eligible rows appear together when ready, replacing Loading

#### Scenario: Coordinator mixed pending success and failure
- **WHEN** a cold coordinator has successful sibling reads and unresolved first reads, with or without actionable repository failures
- **THEN** one pulsing Loading message remains, all repository headers/counts and successful partial rows are withheld, and applicable failures remain visible as scoped notices
- **AND** failures are not hidden by saved folds while their headers are withheld
- **AND** after first reads settle, eligible sections and applicable failure sections use their ordinary headers and Loading disappears

#### Scenario: Warm empty and nonempty results
- **WHEN** a compatible previously published list or authoritative empty result refreshes
- **THEN** that presentation remains without body Loading, and only the under-header line animates while work is active
- **AND** visible failures, pins, folds, paging and scroll behavior retain their existing policy

## MODIFIED Requirements

### Requirement: One complete-lifecycle Git loading animation
Ordinary and coordinator Git panels SHALL show one loading animation at a time: the shared pulsing dot with cold body Loading, otherwise the existing moving line immediately below the header during pending work. The line SHALL stop on completion, failure, hide, disable or scope replacement. Header activity bulbs and tooltips SHALL remain absent; other panels SHALL remain unchanged.

#### Scenario: Cold ordinary and coordinator work
- **WHEN** an enabled shown Git panel begins folder, repository, list, targeted, pagination, verification or inventory work without previously shown compatible content
- **THEN** cold body Loading uses the shared 7px pulsing dot, 6px gap and blue 12px text, with identical vertical placement and existing horizontal insets in both views
- **AND** no moving under-header line appears in a frame containing body Loading, including cold verification or quiet-deferred first reads
- **AND** actionable failures remain visible and coherent inventory publication and count uncertainty remain unchanged

#### Scenario: Warm background and manual work
- **WHEN** a shown ordinary or coordinator list performs warm return reconciliation, verification, manual, webhook or safety work
- **THEN** only the one under-header moving line animates for panel loading and the existing list remains mounted without body Loading or Stale text
- **AND** overlapping work shares the line until the last pending operation finishes, with no separate CI-only track
- **AND** Git Refresh remains disabled with its existing feedback timing but does not rotate, including on hover during a request

#### Scenario: Idle failure cooldown and retired callbacks
- **WHEN** work completes, fails, becomes dormant awaiting a future retry, or the panel is hidden, disabled or changes context
- **THEN** no obsolete callback keeps the old loading line running or clears a newer context's work
- **AND** a dormant cooldown, uncertain count or historical failure alone does not assert an active request; unresolved cold inventory may retain its pulsing Loading without a line
- **AND** no loading animation changes another panel, tab, status slot or shared activity component

### Requirement: Selected-tab coordinator repository visibility
Coordinator Git SHALL withhold cold partial successes until first reads settle, using pulsing top-left Loading below Open/Closed without repository headers/counts or the moving line. Warm return/refresh SHALL retain the list with the under-header line, no body Loading and in-place completion. Actionable notices SHALL appear immediately. Eligibility SHALL precede folding; enrollment SHALL use full eligible inventory independently of section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves internal scoped totals without tab badges

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible selected-tab rows but has an applicable actionable PR-read notice
- **THEN** its notice appears immediately; while cold body Loading remains it has no repository header/count, and after cold work settles it uses existing section folding behavior
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible
- **AND** this explicit failure exception never becomes an empty Loading-only section

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a section visible
- **AND** other eligible rows or genuine applicable notices can still keep a section visible once admitted, while unresolved work remains represented by panel Loading

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice and no unresolved work remains in a settled verified tab
- **THEN** ordinary Git's `No open pull requests` or `No closed pull requests` appears without empty repository headers
- **AND** pending or unverified work uses one standard panel Loading text indication instead of a false empty state

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes it in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** no compatible sections have previously been shown and admitted links include unread PRs in one repository while healthy siblings have supplied rows
- **THEN** only one standard top-left pulsing dot and Loading text appear as body inventory feedback, with successful sibling headers and rows withheld until all admitted first reads settle
- **AND** queued, in-flight and quietly deferred work remain unresolved; genuine applicable failures may show their scoped notice immediately below Loading without repository headers or counts
- **AND** no error or rate-limit wording, placeholder PR, per-repository Loading flash or falsely complete global total is introduced
- **AND** no under-header line appears while body Loading is shown

#### Scenario: Retry fills the existing section
- **WHEN** the existing cooldown expires while the panel remains shown, enabled and freshly verified, and its automatic retry succeeds
- **THEN** the complete eligible selected-tab success sections appear together when no unresolved first reads remain, without requiring a new event or manual refresh
- **AND** previously shown compatible section identities, folds, reveal depth and scroll anchors remain stable without clearing healthy last-good rows
- **AND** confirmed missing PRs, other-tab-only rows and expired history leave no empty section, while top-left Loading remains until unresolved work finishes

#### Scenario: Return to a previously visited coordinator
- **WHEN** the user returns to the same coordinator machine, owner, home and enable generation during the same runtime
- **THEN** the last compatible previously shown selected-tab sections, rows, counts and folds are shown immediately while current verification or membership reconciliation runs
- **AND** pending reconciliation uses only the under-header moving line, with no header bulb, body Loading or Stale label, and completion stops the line and updates the list in place
- **AND** newly loading partial success sections are withheld until first reads settle, while actionable notices appear immediately
- **AND** authoritative removals, state transitions and expiry reconcile without restoring incompatible facts or granting stale worker actions

#### Scenario: One cold repository fails while others load
- **WHEN** one admitted repository has an actionable first-read failure and other repositories have pending or deferred first reads
- **THEN** one top-left pulsing Loading indication remains and the failed repository's applicable scoped notice appears beneath it without any repository header or count
- **AND** successful partial sections remain withheld; when all remaining reads succeed, confirm absence or fail actionably, eligible successes and applicable failure sections appear and Loading disappears
- **AND** actionable failures without authoritative PR state keep internal totals uncertain rather than inventing exact totals, even after the body Loading disappears

#### Scenario: Background refresh of an already shown list
- **WHEN** the coordinator list is on screen and known PR facts refresh without new unread membership or lost verification
- **THEN** existing sections and rows remain mounted without body Loading or Stale text, and only the under-header line animates throughout pending work
- **AND** new unread membership or pending verification also uses the line only; it stops and the list updates in place when the update finishes
- **AND** new partial success sections are withheld until first reads settle, while current authoritative removals, history expiry and state transitions remain effective

### Requirement: Non-destructive same-context PR refresh presentation
Same-context refresh SHALL retain rows, pins and pagination until replacement is ready. Pending reads, verification and transient failures SHALL NOT replace known rows with empty states. Coordinator return/background updates SHALL use the under-header line, no body Loading or Stale label. Returns SHALL reuse bounded compatible runtime presentation. Different identities SHALL invalidate incompatible facts; retained context SHALL NOT authorize reads or worker actions.

#### Scenario: Delayed manual or webhook refresh
- **WHEN** a manual, webhook, reconnect or show-time refresh is pending for the displayed repository or coordinator home
- **THEN** known rows stay mounted without a temporary empty list or replacement Loading content
- **AND** replacement facts apply directly, preserving expanded webhook depth and resetting manual pagination only when the replacement page is ready

#### Scenario: Transient root or PR read failure
- **WHEN** a same-context Git-root probe or PR refresh fails without authoritative evidence of a changed or absent repository
- **THEN** last-good rows remain visible with the appropriate failure notice rather than being cleared
- **AND** later success replaces facts without a blank intermediate frame

#### Scenario: Loading and fleet verification
- **WHEN** the panel has unresolved first reads or the same coordinator home temporarily loses fresh verification
- **THEN** previously shown compatible rows remain with only the under-header moving line for pending work, no body Loading and no Stale text anywhere
- **AND** cold verification uses the ordinary top-left pulsing dot and Loading wording without the moving line or repository headers/counts, extra Verifying header, invented PRs, skeleton values or partial success sections

#### Scenario: Off and on with slow or failed first verification
- **WHEN** a verified coordinator list is switched off and back on and the first current read is slow, interrupted or fails
- **THEN** off uses ordinary Git and clears inventory; on shows standard top-left Loading for the current candidate, never Not a git repository while verification is pending or awaiting retry
- **AND** no previous inventory returns across off/on and retained presentation grants no reads or worker navigation

#### Scenario: Negative completes before toggle without a panel render
- **WHEN** authoritative absence completes without a Git render, then attachment is switched off/on and new verification is pending or fails
- **THEN** top-left Loading appears without old inventory or Stale resurrection
- **AND** only current fresh verification can populate the list

#### Scenario: Changed coordinator owner with verification pending
- **WHEN** a previous owner has a positive or negative result and a different labelled owner begins verification
- **THEN** the current candidate shows top-left Loading rather than ordinary folder Git or the previous inventory
- **AND** only a witnessed authoritative negative matching current dependency identity can suppress Loading

#### Scenario: Authoritative context or membership change
- **WHEN** a different machine, folder or coordinator home is selected, a repository is definitively absent, or authoritative PR/task membership changes
- **THEN** incompatible rows are removed or replaced rather than retained as facts for the destination
- **AND** legitimate pin navigation, task-history expiry and requested folds or tab changes remain allowed layout changes

#### Scenario: Bounded runtime return memory
- **WHEN** a previously visited coordinator is selected again within the same runtime and enable generation
- **THEN** only that exact machine, owner, home and selected-tab previously shown presentation can be restored, subject to current eligibility and fresh action verification
- **AND** the cache is bounded, starts no hidden reads, and persists no PR/task inventory to disk, portable preferences or restart state
- **AND** Git, Crew or attachment disablement and authoritative ownership loss invalidate affected cached presentations

### Requirement: Stale coordinator presentation without action authority
When strict fleet action context is unavailable, the coordinator SHALL retain its shown same-home list with only the under-header moving line for pending reconciliation, no body Loading and no Stale label. Cold context SHALL show pulsing top-left Loading below Open/Closed without repository headers/counts or the moving line. Retained context SHALL NOT authorize GitHub reads or worker navigation. Fresh verification SHALL restore operation or replace invalid context. PR/task inventory SHALL NOT persist for restart.

#### Scenario: Status unavailable beyond action freshness
- **WHEN** a status read fails or times out after strict action freshness expires while the verified pair's native spaces still exist
- **THEN** the sidebar stays attached and previously shown Git rows, counts and folds remain with the moving line while reconciliation is pending, no body Loading and no Stale label
- **AND** no new aggregate read or robot navigation uses the retained context as authorization
- **AND** Stale, the removed task heading and the generic incomplete-list notice do not appear in the header
- **AND** the line stops when work finishes or fails rather than animating solely because a retry deadline or unresolved total remains

#### Scenario: Cold restart before verification
- **WHEN** the selected coordinator is restored from durable pair identity but no task/PR facts have been verified in this runtime
- **THEN** Git shows its standard top-left Loading text and pulsing dot without repository headers/counts or the moving line, rather than switching to folder-based non-repository mode or showing partial sections
- **AND** only a fresh verified same-home status result can start task-linked GitHub reads

#### Scenario: Different selected space or confirmed home change
- **WHEN** the user selects another space or a completed read disproves or changes coordinator/home ownership
- **THEN** stale rows are not displayed or reused as facts for the unrelated destination
- **AND** ordinary folder Git and existing stale-generation guards remain intact

### Requirement: Sanitized fleet verification diagnostics
Failed, unmatched and discarded fleet verification attempts SHALL retain a bounded machine-scoped reason, timestamp and attempted generation in runtime-only diagnostics. The customization log SHALL receive a bounded deduplicated line without raw command output, credentials, reports or task inventory. Late diagnostics SHALL NOT replace newer verification facts or grant action authority. Diagnostic persistence failure SHALL NOT prevent verification or recovery.

#### Scenario: Transport and status failures
- **WHEN** verification encounters a transport rejection, command timeout, nonzero Crew status exit, malformed response or unready native membership
- **THEN** its runtime diagnostic identifies the sanitized failure category, time and attempted generation
- **AND** timeout remains distinguishable from generic status failure without logging raw stderr or stdout

#### Scenario: No matching identity and obsolete reply
- **WHEN** a completed read has no owner, mismatching membership or no eligible fleet, or a reply is rejected as obsolete
- **THEN** diagnostics distinguish authoritative absence from uncertain membership and generation, lease or identity supersession
- **AND** an older reply cannot overwrite a newer success, current failure or retry deadline

#### Scenario: Repeated failures and recovery
- **WHEN** several mod copies or repeated retries encounter the same reason for the same machine and generation
- **THEN** runtime facts retain the latest occurrence but the log emits only the first line of that unchanged reason episode
- **AND** changed reasons or a new failure episode after recovery can produce a new line within the log's fixed size bound

#### Scenario: Existing verification feedback
- **WHEN** the selected coordinator has a relevant last verification failure
- **THEN** cold top-left Loading retains sanitized reason/time in its tooltip with the shared pulsing dot, without Stale text or notifications
- **AND** warm header activity and its tooltip are absent; bounded runtime diagnostics and the local log remain available without a replacement header tooltip
- **AND** a cold unverified coordinator candidate gains no attachment, PR inventory, GitHub-read permission or worker-navigation authority from that feedback

#### Scenario: Runtime privacy and retention
- **WHEN** diagnostics are retained across mod replacement or inspected by an agent
- **THEN** their bounded runtime facts and customization log remain readable locally and excluded from portable preferences
- **AND** recovery history does not become a durable authorization record or contain raw task, transcript or authentication data

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
- **THEN** the header is held for the next batch with at least its first row or visible notice, never rendered alone or together with body Loading
- **AND** after every reveal and state transition each rendered unfolded header has a row or visible notice beneath it
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
- **THEN** the surviving row anchor, folded sections, full internal counts and fixed row geometry are retained
- **AND** accepted native anchor requests unconditionally request a subsequent layout, even when both fade flags are unchanged
- **AND** a genuine context change cannot inherit incompatible facts or scroll requests

#### Scenario: Ordinary pins and older rows
- **WHEN** ordinary Git loads another cursor page, refreshes an expanded list or resolves an older active PR
- **THEN** its existing pagination, pinned row, no-jump row geometry and pin-motion behavior remain intact
- **AND** the shared scroll hints do not replace its existing explicit load or retry control

#### Scenario: Unresolved section within the existing watchdog budget
- **WHEN** unresolved repositories render or recover alongside collected facts
- **THEN** cold Loading and immediately visible actionable notices introduce no render-time measurement, notification or diagnostic IO, and repository headers wait until Loading disappears
- **AND** the 50 ms render watchdog and existing PR-row cap remain unchanged
