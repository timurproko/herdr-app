# Spec Delta

## ADDED Requirements

### Requirement: Shared Git pull request metadata
Git SHALL use identical PR metadata presentation in ordinary repository and coordinator views, in both Open and Closed tabs. Rows SHALL omit author-association badges, including Owner. Below the number/author byline, metadata SHALL start at the existing left edge and order present items as tasks, checks, then assigned GitHub labels. Missing items SHALL NOT leave placeholders or leading, doubled or trailing separators.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** its metadata starts with tasks, followed by checks and labels, without an Owner badge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present items appear in the specified order, starting at the metadata line's left edge
- **AND** no empty label placeholder or redundant separator is shown

### Requirement: GitHub label presentation
Each assigned PR label SHALL display its exact GitHub name, including emoji, in a small pill using its GitHub colour and readable foreground. Several labels and long names SHALL remain bounded by the panel width, with truncated or clipped names available in tooltips. Label changes SHALL NOT cause horizontal overflow or label-driven row-height jumps.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays that exact name in a pill using that colour after the checks item and a separator

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** the label area stays within the row in a single-height strip rather than expanding the panel or row height
- **AND** tooltips expose the complete assigned names, including any clipped names

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Stale replies SHALL NOT restore labels in another repository or panel context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event invalidates loaded rows
- **THEN** the corresponding existing refresh path updates their labels from authoritative PR data
- **AND** removing the final label removes its pills and separator without an empty placeholder

### Requirement: Consistent visible Git metadata separators
PR metadata separators SHALL use one visibly larger but muted dot treatment with equal spacing on both sides and vertical centring against adjacent text and icons. This treatment SHALL apply to every PR metadata separator in the Git panel, including the number/author byline and status items.

#### Scenario: Byline and status separators
- **WHEN** a PR row displays its number/author byline and multiple status metadata items
- **THEN** each dot uses the same size, muted colour, balanced spacing and vertically centred placement
- **AND** ordinary and coordinator views show the same separator treatment
