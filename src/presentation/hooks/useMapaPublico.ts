import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { MAP_OFFLINE_CACHE_TTL_MS } from "@/infrastructure/offline/offlineDataPolicy";
import { useOnlineStatus } from "./useOnlineStatus";

/** Mapa público por slug; no depende de sesión ni de empresa. */
export function useMapaPublico(slug: string) {
  const container = getContainer();
  const enLinea = useOnlineStatus();

  return useQuery({
    queryKey: ["mapa-publico", slug] as const,
    queryFn: () => container.getMapaPublico.execute(slug),
    enabled: !!slug,
    // El visitante quiere ver el estado actual de los lotes.
    staleTime: 30_000,
    gcTime: MAP_OFFLINE_CACHE_TTL_MS,
    refetchInterval: enLinea ? 60_000 : false,
  });
}
