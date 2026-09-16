## Purpose

Defines how the application's interface shell (not its business data) is delivered so the product can be installed like an app and its interface still loads when the device has no network connection.

## ADDED Requirements

### Requirement: Installable application shell
The system SHALL expose the metadata required for supporting browsers to offer installing the application to a device's home screen or app list, including a name, icon set, and theme color.

#### Scenario: User installs the app
- **WHEN** a user on a supporting browser opens the application and triggers "Add to Home Screen" / install
- **THEN** the application installs using its configured name, icon, and theme color, and subsequent launches open in a standalone window without browser chrome

### Requirement: Shell loads without network connectivity
Once a user has successfully opened the application at least once while online, the system SHALL render the application shell (interface layout, navigation, branding) the next time it is opened without network connectivity.

#### Scenario: Reopening offline after a prior online visit
- **WHEN** a user who previously opened the application while online opens it again while offline
- **THEN** the interface renders (layout, navigation, branding) instead of a browser network-error page

#### Scenario: First-ever open with no connectivity
- **WHEN** a user opens the application for the first time on a device with no network connectivity
- **THEN** the system may be unable to render the shell, since nothing has been cached yet, and this is expected behavior

### Requirement: New versions are applied under user control
The system SHALL NOT silently replace a running session's application code with a newer deployed version without informing the user first.

#### Scenario: New deployment available while app is open
- **WHEN** a new version of the application has been deployed while a user has the app open
- **THEN** the system notifies the user that an update is available and applies it only after the user confirms or reloads

### Requirement: Shell caching excludes application data
The mechanism that makes the interface shell available offline SHALL NOT be used to cache responses from the application's backend data API.

#### Scenario: Backend request while the shell is served from cache
- **WHEN** the application shell is being served from the offline shell cache
- **THEN** requests for business data (inventory, ventas, cartera, pagos, etc.) are not served from that same cache and are governed by the query-persistence capability instead
