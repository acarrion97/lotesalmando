## 1. Fiscal configuration and persistence

- [x] 1.1 Extend the per-project fiscal configuration model and editor with issuer legal name, matrix address, establishment address, establishment code, and point-of-issue code; default both codes to `001`.
- [x] 1.2 Add migration `043_recibos_pago.sql` with fiscal-setting and payment-method columns, receipt snapshot table, unique payment and receipt-number constraints, atomic sequence allocation, tenant-checked security-definer transactions, and company-scoped RLS.
- [ ] 1.3 Add the receipt domain entity and repository contract, including persisted issuer/receiver/payment snapshots and lookup by payment.
- [ ] 1.4 Implement Supabase and mock receipt persistence, payment-method storage, and atomic payment-confirmation behavior; register the dependencies in the application container.

## 2. Payment issuance and retrieval

- [ ] 2.1 Implement receipt issuance and retrieval use cases with fiscal-data and receiver-identification validation, final-consumer fallback, and inclusive 15% VAT calculation.
- [ ] 2.2 Add payment-method selection to manual payment registration and make payment creation, installment state change, and receipt issuance commit or roll back together.
- [ ] 2.3 Add payment-method selection to payment-proof approval and make proof approval, payment creation, installment state change, and receipt issuance commit or roll back together.
- [ ] 2.4 Add focused tests for atomic numbering, duplicate prevention, missing fiscal configuration, final-consumer identification, and cent rounding.

## 3. Receipt PDF

- [ ] 3.1 Implement the printable receipt PDF generator using the persisted snapshot, required RIDE-like fields, payment method, stable receipt-number filename, and internal/non-SRI-authorized disclaimer.
- [ ] 3.2 Add focused PDF-generation tests or assertions for receipt number, issuer/receiver information, VAT totals, and disclaimer.

## 4. Receipt access in the application

- [ ] 4.1 Add receipt download actions to payment history and installment views, using the existing receipt and never allocating a new number on reprint.
- [ ] 4.2 Add receipt download access to the payment-proof review flow after successful approval and for already approved payments.
- [ ] 4.3 Verify unavailable receipt actions for payments without a persisted receipt and surface fiscal-configuration errors without leaving payments in a confirmed state.

## 5. Verification

- [ ] 5.1 Run focused tests, lint, TypeScript build, and migration/diff checks; resolve failures introduced by this change.
