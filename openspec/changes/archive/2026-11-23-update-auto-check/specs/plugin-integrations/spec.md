# Spec Delta

## ADDED Requirements

### Requirement: Shared desktop webhook invalidation stream
Enabled Git with configured relay credentials SHALL provide one authenticated desktop relay subscription per mounted non-footer chrome owner, shared by Git and Custom update consumers rather than separate subscriptions per mod. Public bounded runtime invalidations SHALL exclude credentials and webhook bodies. Panel visibility or folder changes SHALL NOT disconnect the shared subscription.

#### Scenario: Git hidden while Custom is mounted
- **WHEN** the Git panel is hidden or the selected context is not a Git repository while Git remains enabled and configured
- **THEN** authenticated push hints remain available to Custom's update checker
- **AND** hidden Git performs no new PR, CI or agent-link reads

#### Scenario: Panel opens and consumes shared notices
- **WHEN** Git is shown for a repository and relevant notices or a successful reconnection arrive
- **THEN** it refreshes its loaded pages through its existing single-flight invalidation path
- **AND** it does not create an additional WebSocket, lose expanded pagination or apply another repository's results

#### Scenario: Plugin disabled or eager checks
- **WHEN** Git is disabled, chrome is unmounted or eager native checking is active
- **THEN** the subscription is stopped or not started and obsolete callbacks cannot publish new invalidations
- **AND** no relay or GitHub setup operation is attempted automatically

#### Scenario: Public signals across sandboxes
- **WHEN** an authenticated relay event is exposed to consumers
- **THEN** it contains only bounded public repository/event counters and connection-generation information
- **AND** source features consume namespaced shared state rather than importing a plugin's files

### Requirement: Repository enrollment remains an explicit webhook action
Relay enrollment SHALL require the maintainer's explicit repository action with a GitHub account authorized to administer that repository. Enrollment SHALL configure that repository's webhook for the existing relay URL and secret, including push events. Publishing or installing Custom SHALL NOT enroll repositories or deploy relay resources.

#### Scenario: Maintainer adds the customization repository
- **WHEN** the maintainer selects timurproko/herdr-app in Git's Add repo picker and confirms Add
- **THEN** the existing action creates or updates only that repository's matching relay webhook using the locally held secret
- **AND** merely searching, selecting without confirmation or closing the picker does not create the webhook
