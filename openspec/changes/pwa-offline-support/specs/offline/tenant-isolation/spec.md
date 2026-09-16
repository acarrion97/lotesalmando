## Purpose

Ensures that data persisted on a device for offline use never becomes visible under the wrong empresa, or to a different user sharing the same device.

## ADDED Requirements

### Requirement: Persisted data is scoped to the company it belongs to
No multi-empresa data SHALL be persisted for offline access unless the persisted record is scoped by the identifier of the empresa it belongs to.

#### Scenario: Switching active company
- **WHEN** a user who belongs to multiple empresas switches their active empresa
- **THEN** persisted data belonging to the previously active empresa is not shown under the newly active empresa

### Requirement: Offline cache is purged on logout
When a user logs out, all data persisted for offline access on that device SHALL be removed.

#### Scenario: Logging out clears the device
- **WHEN** a user logs out of the application
- **THEN** a subsequent offline open of the application on that device does not show that user's previously persisted inventory data

### Requirement: Offline cache is purged on company switch
When the active empresa changes, data persisted for the prior empresa SHALL be removed or made inaccessible before or as part of persisting data for the new empresa.

#### Scenario: Company switch clears prior company's data
- **WHEN** a user switches their active empresa
- **THEN** offline-persisted data tied to the previous empresa is cleared before data for the new empresa is persisted

### Requirement: Unscoped persistence of multi-empresa data is disallowed
It SHALL NOT be possible for a multi-empresa data domain to be added to offline persistence without also being scoped by empresa identifier.

#### Scenario: Adding a new persisted multi-empresa query
- **WHEN** a new query for a multi-empresa data domain is added to offline persistence
- **THEN** its persisted identity includes the empresa identifier, and this is treated as a precondition for enabling persistence, not an optional refinement
