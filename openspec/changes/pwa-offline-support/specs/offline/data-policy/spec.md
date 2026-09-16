## Purpose

Establishes which categories of business data may be retained on a user's device for offline access, and which categories must always require a live connection.

## ADDED Requirements

### Requirement: Inventory data is eligible for offline access
Proyectos, etapas, manzanas, lotes, and the interactive map data SHALL be eligible for offline persistence and offline display.

#### Scenario: Viewing the map offline
- **WHEN** a user opens the mapa de lotes for a project they previously viewed while online
- **THEN** the map renders using the last persisted data even without connectivity

### Requirement: Financial and time-sensitive data is not persisted offline
Cartera, pagos, morosidad, and dashboard/KPI data SHALL NOT be retained for offline display. The system SHALL always require a live connection to show this data.

#### Scenario: Opening cartera without connectivity
- **WHEN** a user without connectivity navigates to cartera, pagos, or the dashboard
- **THEN** the system shows that a connection is required, rather than a stale or empty financial figure

### Requirement: Data eligibility is centrally defined and deliberate
The set of data domains eligible for offline persistence SHALL be defined in one place, and a new read data domain SHALL default to NOT offline-eligible until a deliberate decision adds it to the eligible set.

#### Scenario: Introducing a new type of read data
- **WHEN** a new capability introduces a new type of read-only data
- **THEN** that data is not persisted for offline access unless an explicit decision adds it to the eligible set
