## Purpose

Provide customers with a consistently numbered, printable record of each confirmed installment payment, while preserving the payment history and clearly distinguishing the record from an SRI-authorized electronic invoice.

## ADDED Requirements

### Requirement: Emit a receipt when a payment is confirmed
The system MUST issue and persist one receipt for each installment payment confirmed through manual payment registration or approval of a customer-submitted payment proof. Receipt creation and payment confirmation MUST succeed or fail together. A payment MUST NOT be confirmed if the project lacks required issuer fiscal data.

#### Scenario: Manual payment is registered
- **WHEN** an authorized user registers a payment for an unpaid installment and the project has complete issuer fiscal data
- **THEN** the system confirms the payment and persists its receipt as part of the same operation

#### Scenario: Customer payment proof is approved
- **WHEN** an authorized user approves a payment proof for an unpaid installment and the project has complete issuer fiscal data
- **THEN** the system approves the proof, confirms the payment, and persists its receipt as part of the same operation

#### Scenario: Required issuer data is missing
- **WHEN** a user attempts either payment confirmation path for a project without required issuer fiscal data
- **THEN** the operation fails without confirming the payment or approving the proof, and reports which fiscal data must be completed

#### Scenario: Installment was already paid
- **WHEN** a user tries to confirm another payment for an installment that already has a confirmed payment
- **THEN** the system rejects the duplicate operation and does not issue another receipt

### Requirement: Allocate a unique receipt number
The system MUST allocate receipt numbers atomically and persistently, formatted as `EEE-PPP-SSSSSSSSS`, where `EEE` is the configured establishment, `PPP` is the configured point of issue, and `SSSSSSSSS` is a nine-digit increasing sequence. Number allocation MUST be safe under concurrent payment confirmations and MUST not assign the same number to different payments. Each payment MUST have at most one receipt.

#### Scenario: First receipt for an establishment and point of issue
- **WHEN** the first payment receipt is issued for a configured establishment and point of issue
- **THEN** its sequence component is `000000001`

#### Scenario: Concurrent receipts
- **WHEN** multiple payments are confirmed concurrently for the same establishment and point of issue
- **THEN** each persisted receipt has a distinct sequence number

#### Scenario: Receipt is retrieved again
- **WHEN** a user requests a receipt that was already issued for a payment
- **THEN** the system returns the persisted receipt with its original number and fiscal snapshot

### Requirement: Preserve issuer, receiver, and payment details
The system MUST persist a fiscal snapshot on each receipt containing the issuer's legal name, RUC, matrix and establishment addresses, establishment and point-of-issue codes; receiver name, identification type and identifier; payment date, amount, and selected payment method; and the related installment and sale detail. The system MUST allow an authorized user to select the payment method when registering a payment or approving a customer payment proof, and MUST persist that selection with the payment. Later edits to project fiscal settings, customer data, or sale data MUST NOT change an already-issued receipt.

#### Scenario: Receiver has a registered national ID or RUC
- **WHEN** a receipt is issued for a customer with a valid ten-digit national identity number or thirteen-digit RUC
- **THEN** the receipt records the corresponding identification type and the customer's identifier

#### Scenario: Receiver has no identifier
- **WHEN** a receipt is issued for a customer whose identity field is empty
- **THEN** the receipt identifies the receiver as final consumer using the configured final-consumer identifier

#### Scenario: Fiscal settings change after issuance
- **WHEN** the issuer's project settings or receiver's details change after a receipt is issued
- **THEN** reprinting the receipt continues to show the original persisted snapshot

#### Scenario: Payment method is selected
- **WHEN** an authorized user registers a payment or approves a customer payment proof
- **THEN** the system requires a payment method selection and stores it on the payment and its receipt

### Requirement: Calculate receipt amounts from the amount collected
The system MUST treat the confirmed payment amount as including 15% VAT. It MUST calculate the taxable subtotal by dividing the payment amount by 1.15 and rounding to two decimal places, calculate VAT as the difference between the payment amount and the rounded subtotal, and ensure the displayed subtotal plus VAT equals the collected amount.

#### Scenario: Amount includes VAT
- **WHEN** a receipt is issued for a payment amount with two decimal places
- **THEN** the receipt displays the rounded subtotal, VAT at 15%, and collected total, with subtotal plus VAT equal to the total

### Requirement: Generate an internal printable payment receipt
The system MUST provide a downloadable PDF representation of each persisted receipt with the issuer's legal name and RUC, matrix and establishment addresses, receipt number, payment date, receiver identification, payment detail, subtotal, VAT, total, and selected payment method. The PDF MUST state that it is an internal payment record and is not an electronic tax document authorized by the SRI.

#### Scenario: PDF is generated for a persisted receipt
- **WHEN** an authorized user downloads a receipt
- **THEN** the system generates a printable PDF containing the persisted fiscal snapshot, payment detail, calculated amounts, and internal-record disclaimer

### Requirement: Reprint receipts from payment history
The system MUST make an already-issued receipt available from the payment history and relevant installment or payment-proof review surfaces. Downloading or reprinting MUST use the persisted receipt and MUST NOT allocate a new number.

#### Scenario: User reprints a receipt
- **WHEN** an authorized user selects the receipt action for a payment with a receipt
- **THEN** the PDF is generated using the same stored receipt number and snapshot

#### Scenario: Payment has no receipt
- **WHEN** a user views a payment history item without an associated persisted receipt
- **THEN** the receipt action is unavailable and the system does not fabricate a receipt
