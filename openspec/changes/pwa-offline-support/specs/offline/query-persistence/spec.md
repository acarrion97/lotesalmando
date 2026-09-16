## Purpose

Defines how previously loaded read-only data survives page reloads and offline sessions, so users can still see the last known state of eligible data when they lack connectivity.

## ADDED Requirements

### Requirement: Read data survives reload
For query results belonging to a data domain designated offline-eligible (see `offline/data-policy`), the system SHALL retain the most recently successfully loaded result across page reloads and application restarts, independent of network availability at the time of reload.

#### Scenario: Reload after viewing inventory
- **WHEN** a user has viewed a project's lotes while online and then reloads the application while offline
- **THEN** the previously loaded lotes are shown instead of an empty state or a load error

### Requirement: Persistence is scoped to designated data only
Only query results belonging to a data domain explicitly designated offline-eligible SHALL be retained across sessions. Query results for every other domain SHALL be discarded when the session ends and SHALL NOT be available after a reload without connectivity.

#### Scenario: Non-eligible domain is not available offline
- **WHEN** a user has viewed cartera or dashboard data while online and later reopens the application offline
- **THEN** that data is not available from the prior session and the interface communicates that it requires connectivity

### Requirement: Persisted data records its own age
Every persisted read result SHALL retain the timestamp at which it was last successfully refreshed from the backend.

#### Scenario: Determining how old persisted data is
- **WHEN** persisted inventory data is displayed
- **THEN** the system can determine how long ago that data was last successfully confirmed with the backend

### Requirement: A failed refresh does not erase existing persisted data
If an attempt to refresh a query fails (e.g. due to lost connectivity), the system SHALL continue showing the last successfully persisted result rather than clearing it.

#### Scenario: Refresh fails while a persisted result exists
- **WHEN** the application attempts to refresh an offline-eligible query and the request fails
- **THEN** the previously persisted result for that query remains visible, unchanged
