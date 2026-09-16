## Purpose

Defines how the age of offline-persisted data is classified and communicated, so a value read while offline is never mistaken for a currently guaranteed state.

## ADDED Requirements

### Requirement: Freshness classification
Persisted data SHALL be classified as fresh, stale, or very stale based on the elapsed time since it was last successfully confirmed with the backend.

#### Scenario: Recently confirmed data is fresh
- **WHEN** persisted inventory data was last confirmed with the backend less than 15 minutes ago
- **THEN** it is classified as fresh

#### Scenario: Moderately old data is stale
- **WHEN** persisted inventory data was last confirmed with the backend between 15 and 60 minutes ago
- **THEN** it is classified as stale

#### Scenario: Old data is very stale
- **WHEN** persisted inventory data was last confirmed with the backend more than 60 minutes ago
- **THEN** it is classified as very stale

### Requirement: Availability and price are never presented as guaranteed while offline
When displaying persisted lote availability or price while offline, the system SHALL present them as reflecting a past point in time, never as a live or confirmed current state.

#### Scenario: Viewing a lote's estado offline
- **WHEN** a user views a lote's estado or precio from persisted data while offline
- **THEN** the interface indicates the data reflects a past sync and does not state or imply it is the confirmed current state

### Requirement: Very stale data blocks progressing toward a commercial commitment
When persisted data relevant to a commercial action is classified as very stale, the system SHALL require a successful reconnect and data refresh before allowing the user to proceed with that action.

#### Scenario: Attempting to act on very stale data
- **WHEN** a user tries to proceed toward a commercial action (e.g. continuing to a reserva) using very-stale persisted lote data
- **THEN** the system requires a successful reconnect and refresh of that data before the action can proceed
