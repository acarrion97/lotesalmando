import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

export function useLotesByManzana(manzanaId: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: inventoryKeys.lotesByManzana(empresaId, manzanaId),
    queryFn: () => container.getLotesByManzana.execute(manzanaId),
    enabled: !!empresaId && !!manzanaId,
  });
}
