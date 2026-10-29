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

export const MAP_OFFLINE_CACHE_TTL_MS = 60 * 60 * 1000;

export interface OfflineAuthContext {
  userId: string;
  email: string;
  nombres: string;
  idUsuario: number;
  idEmpresa: number;
  estadoPago: string;
  tieneRoles: boolean;
  savedAt: number;
}

export interface OfflineMapSelection {
  userId: string;
  empresaId: number;
  proyectoId: number;
  etapaId: number;
  manzanaId: number;
  savedAt: number;
}

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

/**
 * Map queries use a separate, one-hour persistence bucket. Public maps are
 * scoped by slug; internal map data, company context, and map-read access are
 * scoped by empresa and project/user so they cannot cross tenant boundaries.
 */
export function isOfflineMapQueryKey(queryKey: readonly unknown[]): boolean {
  const [domain, scopeId, resourceId, detail, itemId] = queryKey;

  if (domain === "mapa-publico") {
    return queryKey.length === 2 && typeof scopeId === "string" && scopeId.length > 0;
  }

  if (domain === "empresas") {
    return queryKey.length === 2 && isPositiveInteger(scopeId);
  }

  if (domain === "permiso-mapa") {
    return queryKey.length === 3 && isPositiveInteger(scopeId) && isPositiveInteger(resourceId);
  }

  if (domain === "mapa") {
    return (
      isPositiveInteger(scopeId) &&
      isPositiveInteger(resourceId) &&
      (queryKey.length === 3 ||
        (queryKey.length === 4 && detail === "lotes") ||
        (queryKey.length === 5 && detail === "lotes-manzana" && isPositiveInteger(itemId)))
    );
  }

  return false;
}

export function isMapQueryFresh(dataUpdatedAt: number, now: number = Date.now()): boolean {
  const age = now - dataUpdatedAt;
  return Number.isFinite(dataUpdatedAt) && age >= 0 && age < MAP_OFFLINE_CACHE_TTL_MS;
}

export function isOfflineAuthContext(
  value: unknown,
  userId: string,
  now: number = Date.now(),
): value is OfflineAuthContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<OfflineAuthContext>;

  return (
    context.userId === userId &&
    typeof context.email === "string" &&
    typeof context.nombres === "string" &&
    isPositiveInteger(context.idUsuario) &&
    isPositiveInteger(context.idEmpresa) &&
    typeof context.estadoPago === "string" &&
    typeof context.tieneRoles === "boolean" &&
    typeof context.savedAt === "number" &&
    isMapQueryFresh(context.savedAt, now)
  );
}

export function isOfflineMapSelection(
  value: unknown,
  userId: string,
  empresaId: number,
  now: number = Date.now(),
): value is OfflineMapSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Partial<OfflineMapSelection>;
  const allowedKeys = ["userId", "empresaId", "proyectoId", "etapaId", "manzanaId", "savedAt"];

  return (
    Object.keys(value).every((key) => allowedKeys.includes(key)) &&
    userId.length > 0 &&
    isPositiveInteger(empresaId) &&
    selection.userId === userId &&
    isPositiveInteger(selection.empresaId) &&
    selection.empresaId === empresaId &&
    isPositiveInteger(selection.proyectoId) &&
    isPositiveInteger(selection.etapaId) &&
    isPositiveInteger(selection.manzanaId) &&
    typeof selection.savedAt === "number" &&
    isMapQueryFresh(selection.savedAt, now)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
