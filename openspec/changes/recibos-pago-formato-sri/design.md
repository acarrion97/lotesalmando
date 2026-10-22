## Context

See `proposal.md` for motivation and `specs/ventas/recibos-pago/spec.md` for observable requirements.

Payments are currently confirmed through separate repository operations in `RegisterPagoUseCase` and `AprobarComprobanteUseCase`. Fiscal contract settings are stored per project, while payment, collection, contract, and company data are handled by separate repositories. The existing migration number 042 is already used by the company-logo feature, so this change uses 043.

## Goals / Non-Goals

**Goals:**
- Keep payment confirmation, proof approval where applicable, receipt persistence, and sequence allocation consistent under concurrent requests.
- Preserve a complete fiscal snapshot that remains stable when project or customer data changes.
- Reuse the existing PDF dependency and presentation patterns.

**Non-Goals:**
- XML creation, digital signing, SRI web-service authorization, or representing the internal record as an authorized tax invoice.
- Changing the existing installment state model or VAT rate specified for this receipt flow.

## Decisions

### Store project-level fiscal settings and snapshot them onto each receipt

Extend the existing per-project contract configuration with matrix address, establishment address, establishment code, and point-of-issue code. Default the establishment and point-of-issue codes to `001` for existing projects, while requiring valid addresses and issuer identity before a payment can be confirmed. Copy the resolved issuer and receiver information, payment amount/date/method, and sale/installment description into the receipt row at issuance time.

This keeps each project's legal issuer configuration distinct and makes old receipts reproducible. Using mutable company settings at print time was rejected because later edits would alter historical documents. Reusing the address-for-cashing field was rejected because it is not necessarily the legal matrix or establishment address.

### Couple confirmation and issuance in database transactions

Implement a database transaction boundary for each payment path so that payment creation, collection state change, proof approval (where applicable), and receipt insertion with its number either all commit or all roll back. The sequence must be allocated by a database-side atomic operation keyed by establishment and point of issue; a client-side read-then-increment counter is unsafe under concurrency.

Migration 008 records that table RLS was disabled after it blocked application access, including with a permissive policy. Therefore, expose mutations and receipt lookup only through narrowly scoped `SECURITY DEFINER` RPCs with a fixed `search_path`, explicit authenticated-company ownership checks, and no direct table grants to `anon` or `authenticated`. Keep RLS enabled with company-scoped policies as defense in depth; the RPC owner performs the transaction while the RPC itself verifies tenant ownership. Expose the transactional result through the payment/receipt application ports and implement equivalent behavior in the mock repositories. Keep validation and error translation in the use cases. The receipt lookup path returns the persisted snapshot and never allocates another sequence.

### Store one receipt per payment with a fiscal snapshot

Add a `recibos` table linked uniquely to the confirmed payment and scoped to the owning company. Persist the formatted number, sequence key, issuer/receiver snapshots, payment information (including the selected method), line-item description, subtotal, VAT, and total. Protect reads and writes using the tenant-checked RPC boundary and company-scoped RLS policy.

The database uniqueness constraint is the final defense against duplicate receipts. Retrying lookup or PDF generation reads the existing row; it does not create another receipt.

### Use the requested inclusive VAT calculation

Treat the payment amount as VAT-inclusive. Compute `subtotal = round(total / 1.15, 2)` and `vat = total - subtotal`, using decimal/numeric arithmetic in persistence and cent-safe rounding in the PDF model so the printed components always sum to the amount received.

For a missing customer identifier, record the final-consumer identification type and identifier in the receipt snapshot. A present but malformed identifier is a validation error rather than silently being converted to final consumer.

### Generate the PDF in the browser from persisted receipt data

Add a receipt PDF generator using the installed `jspdf` dependency. Build the printable view solely from the stored receipt snapshot; use a stable filename derived from the persisted receipt number. Add receipt download actions to payment history and the existing payment-proof review surface, and expose a receipt only when its row exists.

### Use the next unused migration number

Create `supabase/migrations/043_recibos_pago.sql`; do not rename or overwrite migration 042, which is already deployed for company logos.

## Risks / Trade-offs

- [Existing projects lack the new addresses] → Backfill or complete the required fiscal settings per project before confirming payments; transactional validation prevents paid installments without receipts.
- [Existing payment paths issue multiple writes today] → Move their state-changing operations behind a single database transaction and cover rollback and duplicate cases with focused tests.
- [Direct RLS has previously blocked app access] → Revoke direct table access and route receipt operations through tenant-checked security-definer RPCs, leaving enabled RLS policies as additional defense rather than the client access path.
- [Different database and JavaScript rounding behavior] → Define the rounding rule once in the application contract and verify boundary amounts where the third decimal is exactly five.
- [Receipt PDF is not SRI-authorized] → Print a clear disclaimer on every copy and keep XML, signing, and authorization explicitly out of scope.

## Migration Plan

1. Apply migration 043 to add project fiscal settings, receipt persistence, sequence allocation, and tenant-scoped access policies.
2. Complete the required matrix and establishment addresses for each project that will confirm payments; existing establishment and point-of-issue codes default to `001`.
3. Deploy the application update after the migration. The transactional payment paths reject confirmation until required fiscal data is present.
4. Roll back by reverting the application first. Retain persisted receipt rows and sequence state; do not reuse issued numbers. A schema rollback is not recommended after receipts have been issued.
