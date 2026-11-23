# Spec Delta

## MODIFIED Requirements

### Requirement: Accurate update cadence explanation
The Settings Updates explanation SHALL use exactly: “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.” It SHALL NOT mention Custom's check cadence or the Git relay. Detailed cadence documentation and actual update behavior SHALL remain unchanged.

#### Scenario: Reading the Updates explanation
- **WHEN** a person opens Settings Updates
- **THEN** the paragraph beneath the three rows reads exactly “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.”
- **AND** it contains no Custom check cadence or relay explanation
- **AND** herdr-core's role running terminals and their continuity through its updates remains explained
