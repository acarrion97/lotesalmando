import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

export function useEtapasByProyecto(proyectoId: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.etapasByProyecto(empresaId, proyectoId),
    queryFn: () => container.getEtapasByProyecto.execute(proyectoId),
    enabled: !!empresaId && !!proyectoId,
  });
}
