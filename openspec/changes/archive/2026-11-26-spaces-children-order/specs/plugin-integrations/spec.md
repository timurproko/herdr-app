## ADDED Requirements

### Requirement: Coordinator repository sections follow connected children
Coordinator Git repository sections SHALL follow matching connected child-space order. Matching SHALL use verified same-home live task PR repository identity and exact same-machine native membership, never names or guessed folders. A child representing several repositories SHALL supply no unique match. Unmatched sections SHALL follow matched sections in their existing relative order. Ordering SHALL grant no read or navigation authority.

#### Scenario: Sections and sidebar initially disagree
- **WHEN** the connected sidebar children are xrbuild then myworkflows and verified task membership associates each with its canonical GitHub repository
- **THEN** their coordinator Git repository sections appear in that same order rather than alphabetical repository order
- **AND** matching uses the task PR's canonical owner/repository and exact containing native child space, even if the space is renamed or its selected terminal changes folder

#### Scenario: Child reorder and restart
- **WHEN** a user reorders connected siblings and native space order acknowledges the change
- **THEN** the shown coordinator Git sections update to that order through the existing lifecycle without a GitHub lookup, manual refresh or panel reopen
- **AND** reopening, switching Open/Closed or restarting derives the same order from current native child order once matching facts are available
- **AND** saved repository folds and the relative order of PR rows within each section remain unchanged

#### Scenario: Finished task without a child
- **WHEN** a repository has eligible finished-task PRs but no currently matching child space
- **THEN** its section appears after matched sections, retaining its prior order relative to other unmatched sections
- **AND** no section, task or PR is dropped merely because its former space is gone

#### Scenario: Combined child represents several repositories
- **WHEN** exact verified live task links place multiple distinct repositories in one connected child space
- **THEN** that child provides no unique repository-order match and those sections remain in the unmatched tail unless another child supplies an unambiguous match
- **AND** the app does not guess a repository from the child title, registered project name, directory or an unrelated terminal

#### Scenario: One repository has several matching children
- **WHEN** one canonical repository is uniquely associated with more than one connected child
- **THEN** its single deduplicated section uses the earliest such child in current sidebar order
- **AND** counts and PR identities are unchanged and tied or unmatched ranks retain their existing relative order

#### Scenario: Membership uncertainty and unrelated panel work
- **WHEN** current verification becomes unavailable or a different home, owner, machine or enable generation replaces the context
- **THEN** presentation-only ordering can retain compatible already-verified associations but cannot establish new authority or borrow another scope's matches
- **AND** existing cold/warm loading, counters, row labels, disclosure, reveal limits, cache eligibility and worker actions retain their own behavior
- **AND** section reordering changes no Crew record, native tab/terminal placement or portable preference
