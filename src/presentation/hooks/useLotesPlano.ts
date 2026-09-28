import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/** Lotes del proyecto (con o sin contorno) para dibujarlos sobre el plano. */
export function useLotesPlano(proyectoId: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.lotesPlano(empresaId, proyectoId),
    queryFn: () => container.getLotesPlano.execute(proyectoId),
    enabled: !!empresaId && !!proyectoId,
  });
}
