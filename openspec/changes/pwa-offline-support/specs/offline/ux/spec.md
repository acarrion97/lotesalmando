## Purpose

Gives users continuous, unambiguous visibility into their connectivity state and the trustworthiness of the data they are viewing.

## ADDED Requirements

### Requirement: Connectivity status is always visible
The interface SHALL display the user's current connectivity status (online/offline) at all times while using the application, without requiring the user to attempt an action first to discover it.

#### Scenario: Losing connectivity mid-session
- **WHEN** a user's device loses network connectivity while using the application
- **THEN** the interface reflects the offline state without the user needing to trigger an action to find out

### Requirement: Freshness is visible alongside offline-eligible data
Wherever data persisted for offline access is displayed, the interface SHALL show its freshness classification and, when available, how long ago it was last confirmed with the backend.

#### Scenario: Viewing persisted lotes data
- **WHEN** a user views lotes data that was loaded from offline-persisted storage
- **THEN** the interface shows when that data was last refreshed and its freshness classification

### Requirement: Update availability is communicated to the user
When a newer version of the application has been deployed, the interface SHALL surface that fact and give the user a clear way to apply it.

#### Scenario: A new version is deployed
- **WHEN** a newer version of the application becomes available while a user has the app open
- **THEN** the interface shows an update notice with an action to apply it
