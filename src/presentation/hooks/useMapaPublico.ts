import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/** Mapa público por slug; no depende de sesión ni de empresa. */
export function useMapaPublico(slug: string) {
  const container = getContainer();

  return useQuery({
    queryKey: ["mapa-publico", slug] as const,
    queryFn: () => container.getMapaPublico.execute(slug),
    enabled: !!slug,
    // El visitante quiere ver el estado actual de los lotes.
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
