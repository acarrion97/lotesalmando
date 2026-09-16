/**
 * Single source of truth for which data domains may survive a page reload
 * without connectivity (see openspec/changes/pwa-offline-support/specs/offline/data-policy).
 *
 * A new domain is NOT offline-eligible by default — it must be added here
 * deliberately. Cartera, pagos, and dashboard/KPI data are intentionally
 * excluded: their freshness matters more than their availability.
 */
export const OFFLINE_ELIGIBLE_DOMAINS = ["proyectos", "etapas", "manzanas", "lotes"] as const;

export type OfflineEligibleDomain = (typeof OFFLINE_ELIGIBLE_DOMAINS)[number];

/**
 * Every offline-eligible query key is produced by `inventoryKeys` and has
 * the shape `[domain, empresaId, ...rest]`. Persisting a key that doesn't
 * match this shape — missing empresaId, or an unlisted domain — is refused
 * outright, so an unscoped query can never leak into IndexedDB even if a
 * future hook forgets to go through the factory (offline/tenant-isolation).
 */
export function isOfflineEligibleQueryKey(queryKey: readonly unknown[]): boolean {
  const [domain, empresaId] = queryKey;

  if (typeof domain !== "string") return false;
  if (!(OFFLINE_ELIGIBLE_DOMAINS as readonly string[]).includes(domain)) return false;

  return typeof empresaId === "number" && empresaId > 0;
}
