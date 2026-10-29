import type { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { idbAsyncStorage } from "./idbStorage";
import {
  isMapQueryFresh,
  isOfflineEligibleQueryKey,
  isOfflineMapQueryKey,
  MAP_OFFLINE_CACHE_TTL_MS,
} from "./offlineDataPolicy";
import { borrarContextoAutenticacionOffline } from "./offlineAuthContext";
import { borrarSeleccionMapaOffline } from "./offlineMapSelection";

const OFFLINE_CACHE_KEY = "lotesalmando-offline-cache";
const OFFLINE_MAP_CACHE_KEY = "lotesalmando-map-offline-cache";

// Outer ceiling only — the offline/freshness capability (fresh/stale/very
// stale, based on dataUpdatedAt) governs what the UI treats as trustworthy
// well before this age is reached.
const MAX_PERSISTED_AGE_MS = 1000 * 60 * 60 * 24;

function crearPersister(clave: string, filtrarMapas = false): Persister {
  let version = 0;
  let escriturasPendientes: Promise<void> = Promise.resolve();

  return {
    persistClient: (cliente: PersistedClient) => {
      const versionDeEscritura = version;
      const escritura = escriturasPendientes.then(async () => {
        if (versionDeEscritura !== version) return;
        await idbAsyncStorage.setItem(clave, JSON.stringify(cliente));
      });
      escriturasPendientes = escritura.catch((error: unknown) => {
        console.error(`No se pudo persistir la caché offline "${clave}".`, error);
      });
      return escriturasPendientes;
    },
    restoreClient: async () => {
      await escriturasPendientes;
      const serialized = await idbAsyncStorage.getItem(clave);
      if (!serialized) return undefined;
      const persisted = JSON.parse(serialized) as PersistedClient;
      if (!filtrarMapas) return persisted;

      return {
        ...persisted,
        clientState: {
          ...persisted.clientState,
          queries: persisted.clientState.queries.filter(
          (query) =>
            isOfflineMapQueryKey(query.queryKey) &&
            isMapQueryFresh(query.state.dataUpdatedAt),
          ),
        },
      };
    },
    removeClient: () => {
      version++;
      const removal = escriturasPendientes.then(() => idbAsyncStorage.removeItem(clave));
      escriturasPendientes = removal.catch((error: unknown) => {
        console.error(`No se pudo eliminar la caché offline "${clave}".`, error);
      });
      return escriturasPendientes;
    },
  };
}

const inventoryPersister = crearPersister(OFFLINE_CACHE_KEY);
const mapPersister = crearPersister(OFFLINE_MAP_CACHE_KEY, true);

let pararPersistencia: (() => void) | null = null;
let restauracionPendiente: Promise<void> = Promise.resolve();
let limpiezaPendiente: Promise<void> | null = null;

/**
 * Persists the general offline allowlist and map data into separate buckets,
 * so map snapshots expire after one hour without shortening inventory's
 * existing 24-hour retention.
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  pararPersistencia?.();
  const [pararInventario, restaurarInventario] = persistQueryClient({
    queryClient,
    persister: inventoryPersister,
    maxAge: MAX_PERSISTED_AGE_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isOfflineEligibleQueryKey(query.queryKey),
    },
  });
  const [pararMapas, restaurarMapas] = persistQueryClient({
    queryClient,
    persister: mapPersister,
    maxAge: MAP_OFFLINE_CACHE_TTL_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isOfflineMapQueryKey(query.queryKey),
    },
  });

  pararPersistencia = () => {
    pararInventario();
    pararMapas();
  };
  restauracionPendiente = Promise.all([restaurarInventario, restaurarMapas]).then(() => undefined);
  return pararPersistencia;
}

/**
 * Wipes every offline cache and the minimal offline auth context on logout or
 * company switch, then resumes persistence for the next active session.
 */
export async function clearOfflinePersistence(queryClient: QueryClient) {
  if (limpiezaPendiente) return limpiezaPendiente;

  limpiezaPendiente = (async () => {
    pararPersistencia?.();
    pararPersistencia = null;
    try {
      await restauracionPendiente;
    } catch (error) {
      console.error("Falló la restauración de la caché antes de limpiarla.", error);
    }
    queryClient.clear();
    await Promise.all([
      inventoryPersister.removeClient(),
      mapPersister.removeClient(),
      borrarContextoAutenticacionOffline(),
      borrarSeleccionMapaOffline(),
    ]);
    setupOfflinePersistence(queryClient);
  })().finally(() => {
    limpiezaPendiente = null;
  });

  return limpiezaPendiente;
}
