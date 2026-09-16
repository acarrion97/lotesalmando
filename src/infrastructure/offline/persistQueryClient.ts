import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { idbAsyncStorage } from "./idbStorage";
import { isOfflineEligibleQueryKey } from "./offlineDataPolicy";

const OFFLINE_CACHE_KEY = "lotesalmando-offline-cache";

// Outer ceiling only — the offline/freshness capability (fresh/stale/very
// stale, based on dataUpdatedAt) governs what the UI treats as trustworthy
// well before this age is reached.
const MAX_PERSISTED_AGE_MS = 1000 * 60 * 60 * 24;

const persister = createAsyncStoragePersister({
  storage: idbAsyncStorage,
  key: OFFLINE_CACHE_KEY,
});

/**
 * Wires the query client to IndexedDB. Only queries whose key matches the
 * offline/data-policy allowlist (via `isOfflineEligibleQueryKey`) are ever
 * written to disk — everything else (cartera, pagos, dashboard) is
 * discarded when the session ends, per design.
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  return persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_PERSISTED_AGE_MS,
    dehydrateOptions: {
      // Match the key against the allowlist AND require a successful fetch —
      // otherwise a disabled/pending query (e.g. waiting on a not-yet-selected
      // proyectoId) would get persisted as an empty placeholder.
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isOfflineEligibleQueryKey(query.queryKey),
    },
  });
}

/**
 * Wipes the entire offline cache. Called on logout and on empresa switch
 * (offline/tenant-isolation) so data never survives past the session or
 * tenant it belongs to.
 */
export async function clearOfflinePersistence(queryClient: QueryClient) {
  queryClient.clear();
  await idbAsyncStorage.removeItem(OFFLINE_CACHE_KEY);
}
