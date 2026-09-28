import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/** Plano (imagen) del proyecto; `null` si el proyecto todavía no tiene uno. */
export function useMapaByProyecto(proyectoId: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.mapaByProyecto(empresaId, proyectoId),
    queryFn: () => container.getMapaByProyecto.execute(proyectoId),
    enabled: !!empresaId && !!proyectoId,
  });
}
