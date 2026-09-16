# PWA + Offline Support — Design Document

## Context

See [proposal.md](./proposal.md) for motivation. Relevant current state:

- Data access goes through TanStack Query 5 hooks in `src/presentation/hooks/`, backed by a repository pattern (`create-repositories.ts`) that swaps between Supabase and mock implementations via `VITE_DATA_PROVIDER`. No hook currently includes `empresaId` in its query key (verified: `useLotes`, `useEtapas`, `useManzanas`, `useProyectos` key only on the resource name).
- There is no PWA infrastructure at all today: no `manifest.json`, no service worker, no `vite-plugin-pwa`, and `vite.config.ts` is the unmodified Vite/React default.
- Multi-empresa isolation today is enforced server-side via Supabase RLS. Nothing currently enforces isolation for data that would live in browser storage.
- `AuthProvider.logout` (`src/presentation/providers/AuthProvider.tsx`) and the empresa-switching flow (`useEmpresa` / `EmpresaProvider`) are the two existing lifecycle points this design hooks into for cache invalidation.
- Implementation for this change is sequenced to start only after `lotes-al-mando-prototype` reaches a stable, merged state (per proposal.md), to avoid churn against files it's actively touching (`AppLayout.tsx`, hooks, theme).

## Goals / Non-Goals

**Goals:**
- Pick concrete mechanisms for each capability in the specs (`offline/app-shell`, `offline/query-persistence`, `offline/data-policy`, `offline/freshness`, `offline/tenant-isolation`, `offline/write-protection`, `offline/ux`) that keep the shell cache and the data cache architecturally separate.
- Make tenant-scoping structural (hard to forget) rather than a convention someone has to remember per hook.

**Non-Goals:**
- Bidirectional sync / offline write queue (explicitly excluded in proposal.md).
- Push notifications.
- Any change to how Supabase RLS or auth works — this design only adds a client-side storage layer on top of data RLS already permits the user to see.

## Decisions

### 1. Service worker generation: `vite-plugin-pwa` with `generateSW`, not `injectManifest`
Workbox's `generateSW` mode covers this change's entire shell-caching need (precache the build's JS/CSS/fonts/icons) without hand-written service worker code. `injectManifest` (custom SW logic) is not needed because this change explicitly forbids `runtimeCaching` rules for the Supabase API (`offline/app-shell` spec) — there is no runtime request-interception logic to write. Revisit only if a future change needs custom SW behavior.

### 2. Data persistence mechanism: TanStack Query's `persistQueryClient`, not raw HTTP response caching
Two options were considered:
- **(chosen) Persist the TanStack Query cache** (`@tanstack/react-query-persist-client` + a storage persister) — dehydrates/rehydrates already-parsed query results. This is transport-agnostic: it works identically whether the active repository is Supabase or mock, and it reuses the query keys the app already has.
- **(rejected) Service-worker-level caching of Supabase REST responses** — would require `runtimeCaching` rules in the SW, directly contradicting the app-shell/data separation this change is built around, and would bypass the app's own notion of a query (harder to attach freshness/tenant metadata to a raw HTTP cache entry).

### 3. Storage backend: IndexedDB via an async persister, not `localStorage`
`localStorage` is synchronous, ~5MB, and string-only — a poor fit for inventory data (lotes + map geometry) across multiple proyectos. An IndexedDB-backed async storage persister (e.g. built on `idb-keyval`) is used instead.

### 4. Selective persistence via an explicit allowlist, not "persist everything"
`persistQueryClient`'s `shouldDehydrateQuery` predicate is implemented as an allowlist check against the domains named in `offline/data-policy` (`proyectos`, `etapas`, `manzanas`, `lotes`, map data). Default is **not persisted** — a new hook must be deliberately added to the allowlist, matching the "data eligibility is centrally defined and deliberate" requirement. The allowlist lives in one module so it's reviewable in a single diff when it changes.

### 5. Tenant scoping via a shared query-key factory, not per-hook literals
Rather than trusting every hook author to remember to add `empresaId`, inventory hooks are refactored to build their keys through one shared factory (e.g. `inventoryKeys.lotes(empresaId, ...)`) that makes `empresaId` a required, typed parameter. The persister's `shouldDehydrateQuery` check can then also assert the key shape includes an empresa segment before allowing persistence, as a second line of defense — refusing to persist a key that doesn't match the expected shape, rather than assuming it's safe.

This refactor (step 1 in the migration plan below) has no user-visible effect by itself and can land independently of the rest of this change.

### 6. Cache purge hook points: `AuthProvider.logout` and the empresa-switch handler
On logout: clear the persisted store entirely (`queryClient.clear()` + removing the persister's storage) before navigation to the login screen completes. On empresa switch: clear persisted entries scoped to the previous `empresaId` (via the key factory) before queries for the new `empresaId` are allowed to populate the cache. Both are synchronous-enough operations to complete before the next screen renders.

### 7. Freshness computed from TanStack Query's existing `dataUpdatedAt`, not a custom timestamp
Every query already tracks `dataUpdatedAt`. Freshness classification is a pure function of `Date.now() - dataUpdatedAt` against two constants (`FRESHNESS_STALE_MS = 15 * 60 * 1000`, `FRESHNESS_VERY_STALE_MS = 60 * 60 * 1000`), kept in one config module so the thresholds in `offline/freshness` are adjustable in one place as real usage data comes in.

### 8. Connectivity: `navigator.onLine` plus backend confirmation, never `navigator.onLine` alone for gating writes
`navigator.onLine` (with `online`/`offline` event listeners) drives the visible connectivity indicator (`offline/ux`) and the initial client-side block on commercial/financial actions (fast, no round-trip needed for the common case). But per `offline/write-protection`, the actual authority for whether a write succeeded is the Supabase response itself — a mutation is never optimistically treated as successful before the backend confirms it, and a network error surfaces as a normal failed-mutation state rather than a special "were offline" guess.

### 9. Update flow: explicit user prompt, not silent `autoUpdate`
`vite-plugin-pwa`'s `virtual:pwa-register` hook (`useRegisterSW`) is used with `registerType: 'prompt'` (not `'autoUpdate'`), surfacing `needRefresh` as a dismissible banner/toast (reusing the existing antd `notification` pattern already used elsewhere in the app) with an action that calls `updateServiceWorker(true)`. `autoUpdate` was rejected because it can swap running application code under an open session without the user's awareness, which conflicts with the `offline/app-shell` requirement that new versions apply under user control.

## Risks / Trade-offs

- **[Risk]** A future hook is added to the inventory domain but forgets to go through the shared key factory, silently reintroducing an unscoped, cross-tenant-persistable key. → **Mitigation**: the persister's `shouldDehydrateQuery` check refuses to persist any key that doesn't match the factory's expected shape, so the failure mode is "not persisted" (safe) rather than "persisted without tenant scope" (unsafe).
- **[Risk]** IndexedDB usage grows unbounded as a device is used across many proyectos/empresas over time. → **Mitigation**: scope is limited to the allowlisted inventory domains only (per `offline/data-policy`); on hydrate, entries older than the very-stale threshold are dropped rather than shown indefinitely, bounding what accumulates.
- **[Risk]** This change's implementation window overlaps with in-progress, uncommitted work on `AppLayout.tsx` and several hooks from `lotes-al-mando-prototype`. → **Mitigation**: per proposal.md, implementation tasks for this change are sequenced to start only once that work is merged.
- **[Risk]** `generateSW`'s default precache glob could miss a newly introduced asset type (e.g. a new font format), leaving the shell incomplete offline. → **Mitigation**: default `globPatterns` cover standard Vite build output; revisit if the build pipeline's output types change.
- **[Trade-off]** Prompt-based updates (vs. `autoUpdate`) mean a user who dismisses the prompt keeps running an old build for longer. Accepted deliberately — consistent with the spec requirement that updates apply under user control, not automatically.

## Migration Plan

No data migration is involved (net-new capability, nothing to backfill). Implementation is sequenced as:

1. Introduce the tenant-aware query-key factory and refactor inventory hooks to use it. No user-visible change; verified against existing behavior before anything offline-specific is added.
2. Add the installable PWA shell (manifest, icons, `vite-plugin-pwa`, update-prompt UI) — independently verifiable (installability, shell loads offline) with no dependency on persistence yet.
3. Add query persistence for the allowlisted inventory domains, wired to the key factory from step 1.
4. Add freshness computation and its UI surfacing.
5. Add write-protection guards on commercial/financial mutation hooks.
6. Wire cache purge into `logout` and the empresa-switch handler.
7. Manual verification pass covering the scenarios in all seven specs (offline shell load, offline inventory browsing, freshness banners, blocked writes, logout/empresa-switch isolation), including a real-device airplane-mode pass, not just devtools network throttling.

**Rollback**: each step is additive and independently revertible — removing the PWA plugin/manifest disables installability and shell caching without touching persistence; disabling the persister removes offline data without touching the service worker; the query-key factory refactor (step 1) is safe to keep even if later steps are rolled back, since it has no behavior change on its own.

## Open Questions

- Whether `prospectos` data should eventually become offline-eligible (flagged as "depends on scope" during exploration) is deferred — it is excluded from `offline/data-policy` for this change and can be added later as its own follow-up without changing the specs, decisions, or tasks here.
- The exact interval/endpoint for an optional backend-reachability check (beyond `navigator.onLine`) can be tuned during implementation without changing the spec-level requirement that the backend remains the final authority for write confirmation.
