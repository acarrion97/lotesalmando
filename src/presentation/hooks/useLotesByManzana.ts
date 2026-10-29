import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { MAP_OFFLINE_CACHE_TTL_MS } from "@/infrastructure/offline/offlineDataPolicy";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

export function useLotesByManzana(manzanaId: number, proyectoId?: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const esMapa = proyectoId !== undefined;

  return useQuery({
    queryKey: esMapa
      ? inventoryKeys.lotesByManzanaMapa(empresaId, proyectoId, manzanaId)
      : inventoryKeys.lotesByManzana(empresaId, manzanaId),
    queryFn: () => container.getLotesByManzana.execute(manzanaId),
    enabled: !!empresaId && !!manzanaId && (!esMapa || !!proyectoId),
    gcTime: esMapa ? MAP_OFFLINE_CACHE_TTL_MS : undefined,
  });
}
