# Spec Delta

## ADDED Requirements

### Requirement: Custom palette with native action continuity
The Custom palette SHALL retain native command discovery, choices, stable history identities, key labels and unmodified action branches while adding Custom presentation and activation routing. Other layouts SHALL retain native behavior. Compatibility SHALL depend on necessary structures and capabilities, not reviewed release membership.

#### Scenario: Complete Custom presentation and routing
- **WHEN** the structurally compatible palette opens in Custom
- **THEN** it has Custom search styling, native selection treatment, virtual scrolling, fixed group or result headings, scroll fade, keyboard navigation and empty-state behavior
- **AND** Usage is available while its plugin is enabled, Settings and picker/worktree/machine actions route to Custom surfaces, and rename uses Custom inline editors
- **AND** untargeted close actions use Custom last-tab policy while explicitly targeted arguments remain intact

#### Scenario: Native 0.1.17 theme choices
- **WHEN** the palette runs on compatible 0.1.17 stock
- **THEN** its theme actions come from the native dynamic theme catalog with native light/dark and active-layout filtering
- **AND** native action arguments, cloning prompts, history and key labels remain available alongside Custom additions

#### Scenario: Compatible future palette additions
- **WHEN** future stock adds a command, theme or dispatch branch without violating necessary structural or capability contracts
- **THEN** that native addition remains discoverable or executable through its original path after customization
- **AND** no new version review is required merely because that native addition exists

#### Scenario: Non-Custom layout
- **WHEN** the same patched frame opens outside Custom
- **THEN** native presentation, destinations, rename and close behavior remain unchanged and Custom-only entries are absent

### Requirement: Custom feedback within native authority
Custom feedback SHALL run inside the native feedback frame and retain native preview, attachment and sending authority, validation and error behavior. It SHALL add Custom presentation and fresh one-use drafts without automatic submission or bypassing native permissions. Native actions outside authorized presentation edits SHALL remain available.

#### Scenario: Complete Custom feedback form
- **WHEN** compatible feedback opens in Custom
- **THEN** it retains Custom focused fields and character count, compact attachment thumbnails and viewer navigation, a three-image counter, Add image action and muted drag/add helper
- **AND** JSON preview details appear only while expanded and native preview/pick/paste/drop/remove/send and error paths remain usable
- **AND** extra attachments are quietly ignored at the limit and sending or sent state cannot be modified by drops or late attachment completion

#### Scenario: Fresh draft and manual send
- **WHEN** a valid fresh unconsumed draft is available
- **THEN** it fills one feedback opening using the existing compare-before-write consumption boundary
- **AND** expired, consumed or conflicting drafts are not replayed and sending still requires the person's explicit action

#### Scenario: Sent view and other layouts
- **WHEN** native sending succeeds in Custom
- **THEN** the title becomes Feedback sent and the body shows the success icon and muted thank-you without a repeated title
- **AND** outside Custom the native form and success behavior remain unchanged

#### Scenario: Compatible future feedback action
- **WHEN** future stock adds an action or form section that can be retained without violating necessary edit contracts
- **THEN** customization preserves that native action and its callback rather than substituting an older complete form
- **AND** if a necessary edit cannot safely preserve a changed region, the patch reports that concrete incompatibility before writes instead of silently dropping the action
