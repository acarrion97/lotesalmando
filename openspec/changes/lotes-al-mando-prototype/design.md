# Lotes al Mando — Design Document

## Context

**Source project:** `crmlotesec` — React 19 + TypeScript + Vite + Ant Design 6 + TanStack Query 5 + Zod 4 + react-router-dom 7.

**Current state:** Clean Architecture with mock data, no real backend, flat layer structure (`components/`, `services/`, `hooks/`, etc. at root level). No authentication, no multi-empresa isolation, no brand theme. Toasts instead of real CRUD.

**Target:** Modular monolith with Supabase backend, real auth, real CRUD operations, brand theme, and multi-empresa isolation via RLS. A functional prototype covering all 6 business modules.

---

## Goals / Non-Goals

### Goals

- **Modular architecture** — `modules/<module>/{domain,application,infrastructure,presentation}`. Each module is self-contained and can evolve independently.
- **Supabase integration** — PostgreSQL for data, Supabase Auth for identity, RLS for tenant isolation, Storage for file uploads, Edge Functions for transactional operations.
- **Real CRUD operations** — Replace toast-only placeholders with actual database-backed create, read, update, delete flows.
- **Brand theme** — Azul petróleo, verde esmeralda, dorado mineral. Dark mode primary uses verde esmeralda as interactive accent.
- **Multi-empresa with RLS from day one** — Every main table carries `empresa_id`. Row Level Policies enforce that users only see data belonging to their empresa.
- **Functional prototype** — All 6 business modules operational: lotes, facturación, clientes, documentos, asesores, prospectos/pipeline.

### Non-Goals

- Microservices extraction — this is a modular monolith, not a distributed system.
- IA generativa — only rule-based alerts (Mando IA v1). No ML, no embeddings, no LLM calls.
- Mobile app — web-only for now. Responsive design, but no React Native or Capacitor.
- Multi-language — Spanish only. No i18n layer.

---

## Decisions

### 1. Module structure

```
modules/
  lotes/
    domain/        # entities, value objects, repository interfaces
    application/   # use cases, DTOs, Zod schemas
    infrastructure/# Supabase repositories, API clients
    presentation/  # pages, components, hooks
  facturacion/
    ...
  clientes/
    ...
  documentos/
    ...
  asesores/
    ...
  prospectos/
    ...
  shared/          # cross-module utilities, shared UI components
```

Each module owns its own data access, validation, and UI. Cross-module calls go through shared interfaces, never direct imports of infrastructure.

### 2. Data provider pattern

Keep the `VITE_DATA_PROVIDER` environment variable with two supported values: `supabase` and `mock`. Supabase is the default when the variable is absent, empty, or set to `supabase`; mock data is available only when `VITE_DATA_PROVIDER=mock` is explicitly configured. Any other value must fail fast with a clear configuration error instead of silently selecting a provider. The provider switch lives in `infrastructure/` — presentation code never knows which provider is active.

Seed data inserted into Supabase is initial database content, not a runtime fallback. The application must not silently substitute in-memory mock data when Supabase credentials or queries are unavailable.

### 3. Supabase as single backend

One Supabase project provides:
- **PostgreSQL** — relational data, foreign keys, constraints.
- **Auth** — email/password, session management, JWT tokens.
- **RLS** — row-level security policies on every main table.
- **Storage** — document uploads (PDFs, images).
- **Edge Functions** — complex transactions that can't be expressed as simple queries (e.g., facturación status transitions).

### 4. Multi-empresa via RLS

Every main business table includes an `empresa_id` column (UUID, FK to `empresas`). RLS policies filter rows by the authenticated user's empresa claim. This is the primary tenant isolation mechanism — application code does not need to manually filter by empresa.

```sql
-- Example policy
CREATE POLICY "empresa_isolation" ON lotes
  USING (empresa_id = auth.jwt() ->> 'empresa_id');
```

### 5. Asesores as separate entity

Asesores are not just users with a role. They are an independent domain entity with a `usuario_id` foreign key to the auth user. This allows:
- An asesor to exist before being assigned a user account.
- Multiple asesores per user (future scenario).
- Asesor-specific data (comisiones, metrics) without polluting the auth schema.

### 6. Theme architecture

A single `brand.ts` file is the source of truth for all brand colors. Ant Design theme tokens are derived from it:

```ts
// theme/brand.ts
export const brand = {
  azulPetroleo: '#1A3A4A',
  verdeEsmeralda: '#10B981',
  doradoMineral: '#D4A843',
  // ... shades, neutrals, semantic colors
};

// theme/antdTokens.ts
export const lightTokens = {
  colorPrimary: brand.azulPetroleo,
  colorSuccess: brand.verdeEsmeralda,
  // ...
};

export const darkTokens = {
  colorPrimary: brand.verdeEsmeralda, // interactive primary shifts to verde
  // ...
};
```

### 7. Dark mode primary

In dark mode, `verde esmeralda (#10B981)` becomes the interactive primary color. This is intentional: azul petróleo doesn't have enough contrast on dark backgrounds, while verde esmeralda reads clearly and carries the brand identity.

### 8. Mando IA v1

Rule-based alerts only. No machine learning, no LLM calls. Alerts are triggered by simple conditions:
- Lot status changed.
- Payment overdue.
- Prospecto inactive for N days.
- Document expiring.

These are evaluated in Edge Functions or database triggers, not by an external AI service.

### 9. Transaction pattern

Multi-step operations (e.g., creating a factura with line items and updating lot status) are handled by Supabase Edge Functions or PostgreSQL database functions. This ensures atomicity without requiring a separate transaction coordinator.

### 10. Validation

Zod schemas live in the `application/` layer of each module. They serve dual purpose:
- **Client-side:** form validation in React Hook Form or Ant Design forms.
- **Server-side:** input validation in Edge Functions before hitting the database.

Schemas are the single source of truth for data shape constraints.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Supabase vendor lock-in** | Repository pattern abstracts all data access. Swapping to another backend means replacing `infrastructure/` implementations only. |
| **RLS complexity** | Consistent `empresa_id` on all main tables. Centralized policy definitions. Automated tests verify isolation. |
| **Large refactor risk** | The explicit mock provider remains available for isolated UI development, while the default and acceptance path use Supabase. |
| **Performance with RLS** | Proper indexing on `empresa_id` columns. Query plans validated before shipping. |

---

## Migration Plan

### Phase 1 — Copy + Rename + Theme

- Fork `crmlotesec` into `lotes-al-mando`.
- Rename project, update package.json, clean up README.
- Implement brand theme (`brand.ts`, Ant Design token mapping, dark mode).
- Verify app starts with new theme.

### Phase 2 — Supabase Setup + Schema + Auth

- Create Supabase project.
- Define database schema (empresas, lotes, clientes, facturas, documentos, asesores, prospectos, pipeline).
- Configure Auth (email/password, JWT claims with `empresa_id`).
- Write RLS policies for all tables.
- Set up Storage buckets for document uploads.

### Phase 3 — Repositories (one by one, starting with empresas)

- Implement Supabase repository for `empresas` first (foundation for everything else).
- Wire up `VITE_DATA_PROVIDER=supabase` path.
- Make `supabase` the default provider when `VITE_DATA_PROVIDER` is absent, and reject unsupported provider values.
- Keep the mock provider only as an explicit `VITE_DATA_PROVIDER=mock` opt-in.
- Validate CRUD flows end-to-end.
- Repeat for lotes, clientes, facturas, documentos, asesores, prospectos.

### Phase 4 — Real CRUD Operations

- Replace toast-only handlers with actual repository calls.
- Add loading states, error handling, optimistic updates.
- Implement Zod validation on forms.
- Wire up TanStack Query mutations with invalidation.

### Phase 5 — Missing Modules (asesores, prospectos, pipeline)

- Build asesores module (domain entity, CRUD, assignment to lotes).
- Build prospectos module (lead capture, status tracking).
- Build pipeline module (kanban, stage transitions).

### Phase 6 — Dashboard + Alerts

- Dashboard with real metrics from database.
- Mando IA v1: rule-based alerts (payment overdue, inactive prospectos, etc.).
- Edge Functions for alert evaluation.

### Phase 7 — Polish + Responsive

- Responsive breakpoints for tablet/mobile web.
- Loading skeletons, empty states, error boundaries.
- Final pass on theme consistency.
- Documentation and handoff.
