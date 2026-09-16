/**
 * Freshness policy for offline-persisted data (see
 * openspec/changes/pwa-offline-support/specs/offline/freshness). Purely a
 * function of `dataUpdatedAt` — TanStack Query already tracks that per
 * query, so no separate timestamp bookkeeping is needed.
 */
export const FRESHNESS_STALE_MS = 15 * 60 * 1000;
export const FRESHNESS_VERY_STALE_MS = 60 * 60 * 1000;

export type Freshness = "fresh" | "stale" | "very-stale";

export function classifyFreshness(dataUpdatedAt: number | undefined, now: number = Date.now()): Freshness {
  if (!dataUpdatedAt) return "very-stale";

  const age = now - dataUpdatedAt;
  if (age < FRESHNESS_STALE_MS) return "fresh";
  if (age < FRESHNESS_VERY_STALE_MS) return "stale";
  return "very-stale";
}

export function formatDataAge(dataUpdatedAt: number | undefined, now: number = Date.now()): string {
  if (!dataUpdatedAt) return "sin sincronizar";

  const minutes = Math.floor((now - dataUpdatedAt) / 60000);
  if (minutes < 1) return "actualizado hace unos segundos";
  if (minutes < 60) return `actualizado hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `actualizado hace ${hours} h`;
}
