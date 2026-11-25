# Plugin integration delta

## ADDED Requirements

### Requirement: Declarative transient action inputs
Plugin cards SHALL support declared action forms with transient text and masked secret inputs through the common Settings renderer. Input values SHALL reach only the explicitly submitted action, never plugin settings, shared state, portable preferences, logs, deployment payloads or command arguments. Stored secrets SHALL NOT be returned to the form.

#### Scenario: Explicit submission only
- **WHEN** the owner types, blurs a field or presses Enter without invoking its declared submission action
- **THEN** no preference or private store is changed and no secret-bearing operation is started
- **AND** Install all and automatic checks cannot submit the form

#### Scenario: Masked input and action completion
- **WHEN** a secret field is rendered and its form is submitted
- **THEN** the value is masked, sent only to the captured action and cleared from editable form state on completion or failure
- **AND** only sanitized status or a non-secret hint can populate the resulting presentation

#### Scenario: Context retirement
- **WHEN** the card closes, its plugin is disabled, its machine changes or its form is cancelled
- **THEN** transient inputs are cleared and stale callbacks cannot submit, retarget or publish results into a later context
- **AND** an already-dispatched operation is not falsely reported as cancelled

#### Scenario: Generic declaration contract
- **WHEN** a plugin declares a transient action form
- **THEN** it uses shared kit controls without plugin-specific renderer branches
- **AND** persistence and preference import never invoke the action or restore its input values

### Requirement: Private action transport
A secret-bearing Settings action SHALL transfer its payload in memory to its worker over stdin, with bounded input and lifetime. Credentials SHALL NOT appear in transport URLs, process arguments, temporary files, shared state or diagnostic output. Any local handoff listener SHALL accept only its captured single-use session and terminate after completion, cancellation or expiry.

#### Scenario: Successful handoff
- **WHEN** a current explicit action supplies fake credential input to its worker
- **THEN** the worker receives the input on stdin and neither process inspection arguments nor rendezvous metadata contain that credential
- **AND** the result returns only declared non-secret facts

#### Scenario: Invalid or abandoned handoff
- **WHEN** a client presents the wrong session, replays a consumed session, sends an oversized payload or abandons the form
- **THEN** no private setup operation is authorized by that request
- **AND** the listener closes within its finite lifetime without retaining a credential-bearing file or replay job
