# Spec Delta

## ADDED Requirements

### Requirement: Installation waits out transient native patch refresh locks
Installation and rollback SHALL treat a busy native patch refresh, whether the lock is held by the running App's own startup repair or was just cleared as stale, as transient and SHALL retry it within a bounded time instead of failing the update. A refresh that stays busy beyond the bound, or fails otherwise, SHALL report the step's own diagnostic rather than the child process command line. Lock ownership rules SHALL remain unchanged: a live repair's lock is never removed.

#### Scenario: Startup repair runs while Update installs
- **WHEN** Update installs new mods while the running App's mount-time native repair holds the refresh lock
- **THEN** the install step waits for that repair and completes its own refresh on the first Update

#### Scenario: Stale lock from an interrupted repair
- **WHEN** a previous repair was killed and left a lock with a dead process ID
- **THEN** the install step's first refresh clears it, retries and succeeds without a second Update

#### Scenario: Lock held beyond the bound
- **WHEN** the refresh lock stays held by a live process for the whole bound
- **THEN** the update fails with a reason naming the busy refresh lock, not a truncated command line
