# Spec Delta

## ADDED Requirements

### Requirement: Actionable remote-read rejection details
A remote-read HTTP rejection SHALL expose its numeric HTTP status and a short safe reason through versioned JSON errors, retaining existing error codes. Reasons SHALL use fixed HTTP phrases and recognized Trello rejection categories, never arbitrary provider text, credentials or authenticated URLs. Unknown reasons SHALL fall back to the HTTP phrase rather than invent a token-scope diagnosis.

#### Scenario: Bad request versus denied access
- **WHEN** Trello rejects a card or attachment read with HTTP 400, 401, 403 or 404
- **THEN** the error includes the actual status and a short safe reason while preserving REMOTE, AUTH, FORBIDDEN or NOT_FOUND respectively
- **AND** a recognized invalid-parameter reason distinguishes a bad request from authentication or permission refusal without claiming a definitive scope cause from status alone

#### Scenario: Hostile or unknown rejection text
- **WHEN** a rejection body or status text contains secrets, authenticated URLs, control characters, private paths or an unrecognized explanation
- **THEN** the error exposes only the numeric status, a fixed HTTP phrase and any independently recognized safe rejection category
- **AND** neither raw provider text nor secret-bearing fragments appear in output or diagnostics

#### Scenario: Rate refusal details
- **WHEN** a remote read returns HTTP 429
- **THEN** the error retains RATE_LIMIT and the persisted retryAt behavior while including safe HTTP status and reason
- **AND** parsing the refusal never dispatches a retry

### Requirement: Bounded card and attachment read failure
Card and attachment remote reads SHALL honor the existing 20-second request and 60-second command budgets through dispatch, response/error consumption and cancellation. Private-store verification SHALL remain fail-closed and SHALL NOT permit a remote data command to exceed its command budget through repeated blocking checks. Timed-out reads SHALL stop follow-ups, publish no successful path and perform no retry.

#### Scenario: Stalled remote response
- **WHEN** dispatch, headers, a JSON/error body, an image stream or cancellation stalls
- **THEN** the command returns a structured failure within the remaining request and command budgets, aborts pending remote work and starts no follow-up request
- **AND** a failed image read leaves no owned partial output or successful local path

#### Scenario: Slow local permission checks
- **WHEN** repeated private-store or permission checks consume the remaining data-command budget
- **THEN** the command refuses before another network request or output publication rather than waiting beyond the budget
- **AND** it neither skips ACL verification nor reuses obsolete authority to meet the deadline

#### Scenario: Read-only card and image access
- **WHEN** an allowed card and uploaded image are readable with the configured read-only token
- **THEN** card detail, attachment listing and image retrieval use accepted Trello queries and return structured card facts and a protected local image path
- **AND** no wider token scope, board grant, credential copy or write permission is requested as an assumed repair
