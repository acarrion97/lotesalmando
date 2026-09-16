## Purpose

Prevents commercial or financial commitments from being created or confirmed based on unverified, offline-only state.

## ADDED Requirements

### Requirement: Commercial and financial actions require verified connectivity
Actions that create or change a commercial or financial commitment (cotizar, reservar, vender, registrar pago, and equivalents) SHALL require an active, backend-verified connection before they can be submitted.

#### Scenario: Attempting to reserve while offline
- **WHEN** a user without connectivity attempts to reserve a lote
- **THEN** the system prevents the submission and informs the user that connectivity is required

### Requirement: Connectivity check is not based solely on client-reported status
The system SHALL NOT treat a commercial/financial action as safe to submit based only on the browser's self-reported connectivity status; the backend SHALL remain the final authority confirming the operation.

#### Scenario: Client reports online but the backend cannot confirm
- **WHEN** the browser reports network connectivity but the request to confirm a commercial action fails to reach or be confirmed by the backend
- **THEN** the system treats the action as not completed and informs the user, rather than assuming success

### Requirement: No offline write queue for commercial or financial actions
The system SHALL NOT accept a commercial/financial write action while offline for later automatic submission; such actions SHALL be blocked outright rather than queued for retry.

#### Scenario: Offline action is rejected, not queued
- **WHEN** a user attempts a commercial/financial write action while offline
- **THEN** the action is rejected immediately and is not stored for automatic retry once connectivity returns
